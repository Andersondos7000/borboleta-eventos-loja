-- Migração para aprimorar políticas de segurança RLS
-- Garantir que usuários proprietários só acessem seus próprios dados
-- Administradores têm acesso completo a todas as informações

-- ========================================
-- 1. TABELA CUSTOMERS - Melhorar políticas
-- ========================================

-- Remover políticas existentes se houver conflitos
DROP POLICY IF EXISTS "Users can view own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
DROP POLICY IF EXISTS "Users can update own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON customers;
DROP POLICY IF EXISTS "Admins can manage all customers" ON customers;

-- Política: Usuários veem apenas seus próprios dados de cliente
CREATE POLICY "Users can view own customer data" ON customers
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Política: Usuários podem inserir apenas seus próprios dados
CREATE POLICY "Users can insert own customer data" ON customers
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Política: Usuários podem atualizar apenas seus próprios dados
CREATE POLICY "Users can update own customer data" ON customers
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- Política: Usuários podem excluir apenas seus próprios dados
CREATE POLICY "Users can delete own customer data" ON customers
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- Política: Administradores têm acesso completo
CREATE POLICY "Admins have full access to customers" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizador')
    )
  );

-- ========================================
-- 2. TABELA ORDERS - Melhorar políticas
-- ========================================

-- Remover políticas existentes se houver conflitos
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "orders_customer_policy" ON orders;
DROP POLICY IF EXISTS "orders_admin_policy" ON orders;

-- Política: Usuários veem apenas seus próprios pedidos
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Política: Usuários podem criar apenas seus próprios pedidos
CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Política: Usuários podem atualizar apenas seus próprios pedidos
CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- Política: Administradores têm acesso completo aos pedidos
CREATE POLICY "Admins have full access to orders" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizador')
    )
  );

-- ========================================
-- 3. TABELA ORDER_ITEMS - Melhorar políticas
-- ========================================

-- Remover políticas existentes se houver conflitos
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "order_items_policy" ON order_items;

-- Política: Usuários veem apenas itens de seus próprios pedidos
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Política: Usuários podem inserir itens apenas em seus próprios pedidos
CREATE POLICY "Users can insert own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar itens apenas de seus próprios pedidos
CREATE POLICY "Users can update own order items" ON order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Política: Administradores têm acesso completo aos itens de pedidos
CREATE POLICY "Admins have full access to order items" ON order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizador')
    )
  );

-- ========================================
-- 4. TABELA CART_ITEMS - Melhorar políticas
-- ========================================

-- Remover políticas existentes se houver conflitos
DROP POLICY IF EXISTS "cart_items_policy" ON cart_items;
DROP POLICY IF EXISTS "Users can manage own cart items" ON cart_items;

-- Política: Usuários gerenciam apenas seus próprios itens do carrinho
CREATE POLICY "Users can manage own cart items" ON cart_items
  FOR ALL USING (
    auth.uid() = user_id
  );

-- Política: Administradores têm acesso completo aos carrinhos
CREATE POLICY "Admins have full access to cart items" ON cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizador')
    )
  );

-- ========================================
-- 5. TABELA TICKETS - Melhorar políticas
-- ========================================

-- Garantir que RLS está habilitado
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver conflitos
DROP POLICY IF EXISTS "tickets_select_policy" ON tickets;
DROP POLICY IF EXISTS "tickets_admin_policy" ON tickets;

-- Política: Todos podem ver tickets ativos (para compra)
CREATE POLICY "Public can view active tickets" ON tickets
  FOR SELECT USING (
    is_active = true
  );

-- Política: Administradores têm acesso completo aos tickets
CREATE POLICY "Admins have full access to tickets" ON tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizador')
    )
  );

-- ========================================
-- 6. TABELA EVENTS - Melhorar políticas
-- ========================================

-- Remover políticas existentes se houver conflitos
DROP POLICY IF EXISTS "events_select_policy" ON events;
DROP POLICY IF EXISTS "events_admin_policy" ON events;

-- Política: Todos podem ver eventos ativos
CREATE POLICY "Public can view active events" ON events
  FOR SELECT USING (
    is_active = true
  );

-- Política: Administradores têm acesso completo aos eventos
CREATE POLICY "Admins have full access to events" ON events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizador')
    )
  );

-- ========================================
-- 7. FUNÇÃO PARA VERIFICAR SE USUÁRIO É ADMIN
-- ========================================

-- Criar função helper para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'organizador')
  );
END;
$$;

-- ========================================
-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ========================================

COMMENT ON FUNCTION public.is_admin() IS 'Função helper para verificar se o usuário atual é administrador ou organizador';

COMMENT ON POLICY "Users can view own customer data" ON customers IS 'Usuários podem ver apenas seus próprios dados de cliente';
COMMENT ON POLICY "Admins have full access to customers" ON customers IS 'Administradores têm acesso completo a todos os dados de clientes';

COMMENT ON POLICY "Users can view own orders" ON orders IS 'Usuários podem ver apenas seus próprios pedidos';
COMMENT ON POLICY "Admins have full access to orders" ON orders IS 'Administradores têm acesso completo a todos os pedidos';

COMMENT ON POLICY "Users can view own order items" ON order_items IS 'Usuários podem ver apenas itens de seus próprios pedidos';
COMMENT ON POLICY "Admins have full access to order items" ON order_items IS 'Administradores têm acesso completo a todos os itens de pedidos';

COMMENT ON POLICY "Users can manage own cart items" ON cart_items IS 'Usuários podem gerenciar apenas seus próprios itens do carrinho';
COMMENT ON POLICY "Admins have full access to cart items" ON cart_items IS 'Administradores têm acesso completo a todos os carrinhos';

-- ========================================
-- 9. VERIFICAÇÃO DE INTEGRIDADE
-- ========================================

-- Verificar se todas as tabelas críticas têm RLS habilitado
DO $$
DECLARE
    table_name text;
    tables_to_check text[] := ARRAY['customers', 'orders', 'order_items', 'cart_items', 'tickets', 'events', 'profiles'];
BEGIN
    FOREACH table_name IN ARRAY tables_to_check
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = table_name
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN
            RAISE NOTICE 'ATENÇÃO: RLS não está habilitado na tabela %', table_name;
        ELSE
            RAISE NOTICE 'OK: RLS habilitado na tabela %', table_name;
        END IF;
    END LOOP;
END
$$;

-- Log da migração
INSERT INTO public.migration_log (migration_name, description, executed_at)
VALUES (
    '20250131000000_enhance_rls_security_policies',
    'Aprimoramento das políticas RLS para garantir segurança: usuários proprietários acessam apenas seus dados, administradores têm acesso completo',
    NOW()
) ON CONFLICT (migration_name) DO NOTHING;

-- Mensagem de conclusão
RAISE NOTICE 'Migração concluída: Políticas RLS aprimoradas para segurança máxima';
RAISE NOTICE 'Usuários proprietários: acesso apenas aos próprios dados';
RAISE NOTICE 'Administradores: acesso completo a todas as informações';