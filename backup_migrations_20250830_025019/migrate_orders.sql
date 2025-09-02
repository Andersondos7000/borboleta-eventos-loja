-- Migração da tabela: orders
-- Gerado em: 2025-08-30T04:00:19.283Z

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

