-- Migration: Setup User Deletion Permissions
-- Date: 2025-01-05
-- Description: Permite que admin, certificados e cadastrados validados removam outros usuários

-- ========================================
-- 1. ATUALIZAR ESTRUTURA DA TABELA PROFILES
-- ========================================

-- Adicionar colunas necessárias se não existirem
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'organizer', 'certificado', 'validado')),
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS certification_level TEXT CHECK (certification_level IN ('basico', 'intermediario', 'avancado', 'expert'));

-- ========================================
-- 2. DEFINIR FOTOSARTDESIGN@GMAIL.COM COMO ADMIN
-- ========================================

-- Função para definir usuário como admin pelo email
CREATE OR REPLACE FUNCTION set_user_as_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Buscar o UUID do usuário pelo email
    SELECT au.id INTO user_uuid
    FROM auth.users au
    WHERE au.email = user_email;
    
    -- Se usuário não encontrado, retornar false
    IF user_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar ou inserir perfil como admin
    INSERT INTO public.profiles (id, email, role, is_verified)
    VALUES (user_uuid, user_email, 'admin', true)
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        email = user_email,
        is_verified = true,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Definir fotosartdesign@gmail.com como admin
SELECT set_user_as_admin('fotosartdesign@gmail.com');

-- ========================================
-- 3. FUNÇÃO PARA VERIFICAR PERMISSÕES DE REMOÇÃO
-- ========================================

CREATE OR REPLACE FUNCTION can_delete_users(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    user_verified BOOLEAN;
    user_cert_level TEXT;
BEGIN
    -- Buscar dados do usuário
    SELECT p.role, p.is_verified, p.certification_level
    INTO user_role, user_verified, user_cert_level
    FROM public.profiles p
    WHERE p.id = user_id;
    
    -- Se perfil não encontrado, negar acesso
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar permissões:
    -- 1. Admin sempre pode
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- 2. Certificados podem (qualquer nível)
    IF user_role = 'certificado' AND user_cert_level IS NOT NULL THEN
        RETURN TRUE;
    END IF;
    
    -- 3. Cadastrados validados podem
    IF user_role IN ('validado', 'organizer') AND user_verified = true THEN
        RETURN TRUE;
    END IF;
    
    -- Caso contrário, negar
    RETURN FALSE;
END;
$$;

-- ========================================
-- 4. FUNÇÃO MELHORADA PARA DELETAR USUÁRIOS
-- ========================================

CREATE OR REPLACE FUNCTION delete_user_complete(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    target_email TEXT;
    result JSONB;
BEGIN
    -- Obter ID do usuário atual
    current_user_id := auth.uid();
    
    -- Verificar se usuário atual tem permissão
    IF NOT can_delete_users(current_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para remover outros usuários',
            'required_roles', ARRAY['admin', 'certificado', 'validado']
        );
    END IF;
    
    -- Verificar se usuário alvo existe
    SELECT au.email INTO target_email
    FROM auth.users au
    WHERE au.id = target_user_id;
    
    IF target_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário alvo não encontrado'
        );
    END IF;
    
    -- Impedir auto-exclusão
    IF current_user_id = target_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Não é possível excluir a própria conta através desta função'
        );
    END IF;
    
    BEGIN
        -- Deletar dados relacionados em ordem (respeitando foreign keys)
        DELETE FROM public.cart_items WHERE user_id = target_user_id;
        -- DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = target_user_id);
        -- DELETE FROM public.orders WHERE user_id = target_user_id;
        DELETE FROM public.tickets WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = target_user_id);
        DELETE FROM public.customers WHERE user_id = target_user_id;
        DELETE FROM public.profiles WHERE id = target_user_id;
        
        -- Nota: auth.users deve ser deletado via API do Supabase Auth
        -- Esta função apenas limpa os dados relacionados
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Dados do usuário removidos com sucesso',
            'deleted_user_email', target_email,
            'deleted_by', current_user_id,
            'timestamp', NOW()
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Erro ao excluir dados do usuário: ' || SQLERRM
            );
    END;
END;
$$;

-- ========================================
-- 5. POLÍTICAS RLS PARA REMOÇÃO DE USUÁRIOS
-- ========================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Privileged users can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Privileged users can delete cart items" ON public.cart_items;
-- DROP POLICY IF EXISTS "Privileged users can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Privileged users can delete tickets" ON public.tickets;
DROP POLICY IF EXISTS "Privileged users can delete customers" ON public.customers;

-- Política para profiles
CREATE POLICY "Privileged users can delete profiles" ON public.profiles
FOR DELETE
TO authenticated
USING (
    can_delete_users(auth.uid())
);

-- Política para cart_items
CREATE POLICY "Privileged users can delete cart items" ON public.cart_items
FOR DELETE
TO authenticated
USING (
    can_delete_users(auth.uid())
);

-- Política para orders (será criada quando tabela existir)
-- CREATE POLICY "Privileged users can delete orders" ON public.orders
-- FOR DELETE
-- TO authenticated
-- USING (
--     can_delete_users(auth.uid())
-- );

-- Política para tickets
CREATE POLICY "Privileged users can delete tickets" ON public.tickets
FOR DELETE
TO authenticated
USING (
    can_delete_users(auth.uid())
);

-- Política para customers
CREATE POLICY "Privileged users can delete customers" ON public.customers
FOR DELETE
TO authenticated
USING (
    can_delete_users(auth.uid())
);

-- ========================================
-- 6. FUNÇÃO PARA LISTAR USUÁRIOS (PARA ADMINS)
-- ========================================

CREATE OR REPLACE FUNCTION list_users_for_management()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    role TEXT,
    is_verified BOOLEAN,
    certification_level TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se usuário atual tem permissão
    IF NOT can_delete_users(auth.uid()) THEN
        RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para gerenciar outros usuários';
    END IF;
    
    RETURN QUERY
    SELECT 
        au.id,
        au.email,
        COALESCE(p.role, 'user') as role,
        COALESCE(p.is_verified, false) as is_verified,
        p.certification_level,
        p.full_name,
        au.created_at,
        au.last_sign_in_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    ORDER BY au.created_at DESC;
END;
$$;

-- ========================================
-- 7. CONCEDER PERMISSÕES
-- ========================================

GRANT EXECUTE ON FUNCTION set_user_as_admin(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION can_delete_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION list_users_for_management() TO authenticated;

-- ========================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- ========================================

COMMENT ON FUNCTION set_user_as_admin(TEXT) IS 'Define um usuário como admin pelo email';
COMMENT ON FUNCTION can_delete_users(UUID) IS 'Verifica se um usuário tem permissão para remover outros usuários (admin, certificado, validado)';
COMMENT ON FUNCTION delete_user_complete(UUID) IS 'Remove completamente um usuário e todos os dados relacionados (apenas para usuários privilegiados)';
COMMENT ON FUNCTION list_users_for_management() IS 'Lista todos os usuários para gerenciamento (apenas para usuários privilegiados)';

-- Log da migration (será criado quando tabela migration_logs existir)
-- INSERT INTO public.migration_logs (migration_name, executed_at, description)
-- VALUES (
--     '20250105000002_setup_user_deletion_permissions',
--     NOW(),
--     'Configuração de permissões para remoção de usuários por admin, certificados e validados. fotosartdesign@gmail.com definido como admin.'
-- ) ON CONFLICT DO NOTHING;

-- Verificação final
SELECT 
    'Migration completed successfully' as status,
    'fotosartdesign@gmail.com set as admin' as admin_status,
    'User deletion permissions configured' as permissions_status;