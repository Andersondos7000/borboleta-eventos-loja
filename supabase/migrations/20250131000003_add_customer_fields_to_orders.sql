-- Adicionar campos de cliente e endereço à tabela orders
-- Data: 31/01/2025
-- Motivo: Corrigir erro PGRST204 no checkout

-- Adicionar campos de cliente
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_document TEXT;

-- Adicionar campos de pagamento
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pix';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Adicionar campos de endereço (shipping_address como JSONB)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Adicionar campos de itens (como JSONB para flexibilidade)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB;

-- Adicionar campos de participantes e notas
ALTER TABLE orders ADD COLUMN IF NOT EXISTS participants JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Adicionar constraints para validação
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
    CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'boleto'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
    CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded'));

-- Comentários para documentação
COMMENT ON COLUMN orders.customer_name IS 'Nome completo do cliente';
COMMENT ON COLUMN orders.customer_email IS 'Email do cliente';
COMMENT ON COLUMN orders.customer_phone IS 'Telefone do cliente';
COMMENT ON COLUMN orders.customer_document IS 'CPF/CNPJ do cliente';
COMMENT ON COLUMN orders.payment_method IS 'Método de pagamento escolhido';
COMMENT ON COLUMN orders.payment_status IS 'Status do pagamento';
COMMENT ON COLUMN orders.shipping_address IS 'Endereço de entrega em formato JSON';
COMMENT ON COLUMN orders.items IS 'Itens do pedido em formato JSON';
COMMENT ON COLUMN orders.participants IS 'Lista de participantes em formato JSON';
COMMENT ON COLUMN orders.additional_notes IS 'Observações adicionais do pedido';