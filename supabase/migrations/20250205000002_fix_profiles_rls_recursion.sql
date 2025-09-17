-- Corrigir recursão infinita nas políticas RLS da tabela profiles
-- O problema é que as políticas de admin fazem SELECT na própria tabela profiles
-- causando recursão infinita

-- 1. Remover políticas problemáticas
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 2. Remover função existente se houver conflito
DROP FUNCTION IF EXISTS public.is_admin_user();
DROP FUNCTION IF EXISTS public.is_admin_user(UUID);

-- 3. Criar função auxiliar para verificar se usuário é admin
-- Esta função usa uma abordagem que não causa recursão
CREATE FUNCTION public.is_admin_user(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário tem role de admin ou organizer
  -- Usando uma consulta direta sem RLS
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = user_id 
    AND role IN ('admin', 'organizer')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 4. Criar políticas RLS corrigidas usando a função auxiliar
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    -- Usuários podem ver seu próprio perfil OU são admin
    auth.uid() = id OR public.is_admin_user()
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    -- Usuários podem atualizar seu próprio perfil OU são admin
    auth.uid() = id OR public.is_admin_user()
  );

-- 5. Garantir que a função tenha as permissões corretas (comentado temporariamente)
-- GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
-- Nota: Os GRANTs serão aplicados após a função ser criada com sucesso

-- 6. Comentários para documentação
COMMENT ON FUNCTION public.is_admin_user(UUID) IS 'Função auxiliar para verificar se um usuário é admin sem causar recursão nas políticas RLS';
COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 'Permite que usuários vejam seu próprio perfil e admins vejam todos os perfis';
COMMENT ON POLICY "Admins can update all profiles" ON public.profiles IS 'Permite que usuários atualizem seu próprio perfil e admins atualizem qualquer perfil';