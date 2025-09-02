-- Migração da tabela: cart_items
-- Gerado em: 2025-08-30T04:00:19.249Z

-- Adicionando colunas
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES tickets(id);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS unit_price numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS total_price numeric(10,2) NOT NULL DEFAULT 0;

-- Atualizando constraints
ALTER TABLE cart_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0);

-- Atualizando dados
UPDATE cart_items SET 
         unit_price = p.price,
         total_price = quantity * p.price
       FROM products p 
       WHERE cart_items.product_id = p.id;

