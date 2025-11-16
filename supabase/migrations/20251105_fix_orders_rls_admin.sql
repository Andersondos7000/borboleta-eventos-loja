-- Migração: 20251105_fix_orders_rls_admin.sql
-- Objetivo: Permitir que administradores (is_admin) executem operações FOR ALL na tabela orders e order_items
-- Contexto: Usuários relatam que exclusões de pedidos não efetivam apesar de mensagem de sucesso.

-- Garantir que a função is_admin exista
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'email' IN (
        'admin@boboleta.com',
        'suporte@boboleta.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS se ainda não estiver habilitado
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;

-- Conceder políticas administrativas para orders e order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_admin_policy'
  ) THEN
    CREATE POLICY "orders_admin_policy" ON orders
      FOR ALL USING (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'order_items_admin_policy'
  ) THEN
    CREATE POLICY "order_items_admin_policy" ON order_items
      FOR ALL USING (is_admin());
  END IF;
END $$;

COMMENT ON POLICY "orders_admin_policy" ON orders IS 'Permite operações administrativas (ALL) para usuários is_admin()';
COMMENT ON POLICY "order_items_admin_policy" ON order_items IS 'Permite operações administrativas (ALL) para usuários is_admin()';

-- Log opcional
CREATE TABLE IF NOT EXISTS migration_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name text NOT NULL,
    description text,
    executed_at timestamptz DEFAULT now()
);

INSERT INTO migration_log (migration_name, description, executed_at)
VALUES (
  '20251105_fix_orders_rls_admin',
  'Adiciona políticas administrativas FOR ALL em orders e order_items para permitir DELETE por admin.',
  NOW()
);