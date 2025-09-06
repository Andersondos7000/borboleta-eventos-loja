-- Criação das tabelas para sistema de pedidos
-- Data: 31/01/2025
-- Autor: Sistema

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  ticket_id UUID REFERENCES tickets(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  size TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_ticket_id ON order_items(ticket_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Política para orders: usuários podem ver apenas seus próprios pedidos
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para order_items: usuários podem ver itens de seus próprios pedidos
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own order items" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own order items" ON order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Comentários para documentação
COMMENT ON TABLE orders IS 'Tabela de pedidos do sistema';
COMMENT ON COLUMN orders.id IS 'ID único do pedido';
COMMENT ON COLUMN orders.user_id IS 'ID do usuário que fez o pedido';
COMMENT ON COLUMN orders.total_amount IS 'Valor total do pedido em reais';
COMMENT ON COLUMN orders.status IS 'Status do pedido: pending, confirmed, awaiting_payment, paid, cancelled';
COMMENT ON COLUMN orders.payment_id IS 'ID do pagamento no gateway';

COMMENT ON TABLE order_items IS 'Itens dos pedidos';
COMMENT ON COLUMN order_items.order_id IS 'ID do pedido ao qual o item pertence';
COMMENT ON COLUMN order_items.product_id IS 'ID do produto (opcional)';
COMMENT ON COLUMN order_items.ticket_id IS 'ID do ingresso (opcional)';
COMMENT ON COLUMN order_items.quantity IS 'Quantidade do item';
COMMENT ON COLUMN order_items.price IS 'Preço unitário do item em reais';
COMMENT ON COLUMN order_items.size IS 'Tamanho do produto (quando aplicável)';