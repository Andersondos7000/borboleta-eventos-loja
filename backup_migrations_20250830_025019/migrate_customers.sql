-- Migração da tabela: customers
-- Gerado em: 2025-08-30T04:00:19.252Z

-- Adicionando colunas
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS document_type varchar(10) DEFAULT 'cpf';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street varchar(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS number varchar(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS complement varchar(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS neighborhood varchar(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city varchar(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state varchar(2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS zip_code varchar(10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country varchar(2) DEFAULT 'BR';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type varchar(20) DEFAULT 'individual' CHECK (customer_type IN ('individual', 'business'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]':::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS external_id varchar(100);

-- Atualizando constraints
ALTER TABLE customers ALTER COLUMN email SET NOT NULL;
ALTER TABLE customers ADD CONSTRAINT customers_email_valid CHECK (email ~* '\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z');
CREATE UNIQUE INDEX customers_user_id_unique ON customers(user_id) WHERE user_id IS NOT NULL;

-- Atualizando dados
UPDATE customers SET 
         status = 'active',
         customer_type = 'individual',
         country = 'BR'
       WHERE status IS NULL;

