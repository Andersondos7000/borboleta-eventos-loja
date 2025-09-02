-- Migração da tabela: tickets
-- Gerado em: 2025-08-30T04:00:19.290Z

-- Adicionando colunas
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category varchar(50);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS event_date timestamptz;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS event_location varchar(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS max_quantity integer DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS available_quantity integer DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Atualizando constraints
ALTER TABLE tickets ADD CONSTRAINT tickets_quantity_valid CHECK (available_quantity <= max_quantity);
ALTER TABLE tickets ADD CONSTRAINT tickets_price_positive CHECK (price >= 0);

-- Atualizando dados
UPDATE tickets SET 
         max_quantity = 100,
         available_quantity = 100,
         is_active = true
       WHERE max_quantity IS NULL;

