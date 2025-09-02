-- Migração da tabela: order_items
-- Gerado em: 2025-08-30T04:00:19.287Z

-- Adicionando colunas
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES tickets(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size varchar(10);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2) NOT NULL DEFAULT 0;

-- Atualizando constraints
ALTER TABLE order_items ALTER COLUMN order_id SET NOT NULL;
ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE order_items ADD CONSTRAINT order_items_price_positive CHECK (price >= 0);

-- Atualizando dados
UPDATE order_items SET 
         total_price = quantity * price
       WHERE total_price = 0;

