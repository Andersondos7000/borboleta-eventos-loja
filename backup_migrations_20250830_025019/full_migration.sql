-- Migração automática de schema
-- Gerado em: 2025-08-30T04:00:19.245Z
-- Origem: ojxmfxbflbfinodkhixk
-- Destino: ojxmfxbflbfinodkhixk


CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS varchar(50) AS $$
BEGIN
    RETURN 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || 
           lpad(nextval('order_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;


-- ========================================
-- Migração da tabela: cart_items
-- ========================================

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


-- ========================================
-- Migração da tabela: customers
-- ========================================

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


-- ========================================
-- Migração da tabela: orders
-- ========================================

-- Adicionando colunas
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number varchar(50) UNIQUE NOT NULL DEFAULT generate_order_number();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status varchar(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_amount numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_amount numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'BRL';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_street varchar(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_number varchar(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_complement varchar(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_neighborhood varchar(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_city varchar(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_state varchar(2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_zip_code varchar(10);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_country varchar(2) DEFAULT 'BR';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_street varchar(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_number varchar(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_complement varchar(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_neighborhood varchar(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city varchar(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state varchar(2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zip_code varchar(10);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_country varchar(2) DEFAULT 'BR';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_id varchar(100);

-- Atualizando constraints
ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_status_valid CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'));
ALTER TABLE orders ADD CONSTRAINT orders_total_calculation CHECK (total_amount = subtotal_amount + tax_amount + shipping_amount - discount_amount);

-- Atualizando dados
UPDATE orders SET 
         subtotal_amount = total_amount,
         currency = 'BRL',
         payment_status = CASE 
           WHEN status = 'delivered' THEN 'paid'
           WHEN status = 'cancelled' THEN 'failed'
           ELSE 'pending'
         END
       WHERE subtotal_amount IS NULL;


-- ========================================
-- Migração da tabela: order_items
-- ========================================

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


-- ========================================
-- Migração da tabela: tickets
-- ========================================

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


-- ========================================
-- Migração da tabela: profiles
-- ========================================

-- Atualizando constraints
ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
ALTER TABLE profiles ADD CONSTRAINT profiles_username_length CHECK (length(username) >= 3);


-- ========================================
-- Migração da tabela: rls_performance_metrics
-- ========================================

-- Adicionando colunas
ALTER TABLE rls_performance_metrics ADD COLUMN IF NOT EXISTS policy_name varchar(100);

-- Atualizando dados
UPDATE rls_performance_metrics SET 
         policy_name = 'unknown'
       WHERE policy_name IS NULL;


-- ========================================
-- Validações finais
-- ========================================

-- Atualizar estatísticas
ANALYZE;

-- Log de conclusão
INSERT INTO migration_log (version, executed_at, status) 
VALUES ('2025-08-30T04-00-18-307Z', now(), 'completed');
