# Comparação de Esquemas de Banco de Dados

## Análise Comparativa: ojxmfxbflbfinodkhixk vs fdswhhckvweghcavgdvb

### 1. Tabela `cart_items`

#### fdswhhckvweghcavgdvb (Esquema Mais Completo)
```sql
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid,
  ticket_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  size text,
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  total_price numeric DEFAULT ((quantity)::numeric * unit_price),
  -- Foreign Keys
  CONSTRAINT cart_items_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id),
  CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
```

#### ojxmfxbflbfinodkhixk (Esquema Simplificado)
```sql
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  product_id uuid,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  size text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Foreign Keys
  CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
```

#### Diferenças Identificadas:

**Campos Ausentes em ojxmfxbflbfinodkhixk:**
- `ticket_id` - Referência para ingressos
- `unit_price` - Preço unitário do item
- `total_price` - Preço total calculado

**Diferenças de Constraints:**
- `user_id` é NOT NULL em fdswhhckvweghcavgdvb, mas permite NULL em ojxmfxbflbfinodkhixk
- `quantity` tem DEFAULT 1 em ojxmfxbflbfinodkhixk
- Falta foreign key para `ticket_id` em ojxmfxbflbfinodkhixk

**Impacto:**
- ❌ **CRÍTICO**: Sem `unit_price` e `total_price`, não é possível calcular valores do carrinho
- ❌ **CRÍTICO**: Sem `ticket_id`, não é possível adicionar ingressos ao carrinho
- ⚠️ **MÉDIO**: `user_id` nullable pode causar problemas de integridade

---

## Plano de Migração: ojxmfxbflbfinodkhixk → fdswhhckvweghcavgdvb

### Fase 1: Preparação e Backup

```sql
-- Backup de todas as tabelas do projeto ojxmfxbflbfinodkhixk
CREATE SCHEMA backup_ojxmfxbflbfinodkhixk;

-- Backup das tabelas existentes
CREATE TABLE backup_ojxmfxbflbfinodkhixk.cart_items AS SELECT * FROM public.cart_items;
CREATE TABLE backup_ojxmfxbflbfinodkhixk.customers AS SELECT * FROM public.customers;
CREATE TABLE backup_ojxmfxbflbfinodkhixk.orders AS SELECT * FROM public.orders;
CREATE TABLE backup_ojxmfxbflbfinodkhixk.order_items AS SELECT * FROM public.order_items;
CREATE TABLE backup_ojxmfxbflbfinodkhixk.tickets AS SELECT * FROM public.tickets;
```

### Fase 2: Migração de Dados

#### 2.1 Atualização da tabela `cart_items`

```sql
-- Adicionar campos ausentes
ALTER TABLE public.cart_items 
  ADD COLUMN ticket_id uuid,
  ADD COLUMN unit_price numeric CHECK (unit_price >= 0::numeric),
  ADD COLUMN total_price numeric;

-- Atualizar user_id para NOT NULL
UPDATE public.cart_items SET user_id = gen_random_uuid() WHERE user_id IS NULL;
ALTER TABLE public.cart_items ALTER COLUMN user_id SET NOT NULL;

-- Adicionar foreign key para tickets
ALTER TABLE public.cart_items 
  ADD CONSTRAINT cart_items_ticket_id_fkey 
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);

-- Calcular preços baseado em produtos existentes
UPDATE public.cart_items 
SET 
  unit_price = COALESCE(p.price, 0),
  total_price = quantity * COALESCE(p.price, 0)
FROM public.products p 
WHERE cart_items.product_id = p.id;

-- Para itens sem produto, definir preço padrão
UPDATE public.cart_items 
SET 
  unit_price = 0,
  total_price = 0
WHERE unit_price IS NULL;

ALTER TABLE public.cart_items 
  ALTER COLUMN unit_price SET NOT NULL,
  ALTER COLUMN total_price SET DEFAULT ((quantity)::numeric * unit_price);
```

#### 2.2 Atualização da tabela `customers`

```sql
-- Adicionar campos ausentes
ALTER TABLE public.customers 
  ADD COLUMN user_id uuid,
  ADD COLUMN document_type character varying CHECK (document_type::text = ANY (ARRAY['cpf'::character varying, 'cnpj'::character varying]::text[])),
  ADD COLUMN document_number character varying,
  ADD COLUMN birth_date date,
  ADD COLUMN address_street character varying,
  ADD COLUMN address_number character varying,
  ADD COLUMN address_complement character varying,
  ADD COLUMN address_neighborhood character varying,
  ADD COLUMN address_city character varying,
  ADD COLUMN address_state character varying,
  ADD COLUMN address_zipcode character varying,
  ADD COLUMN address_country character varying DEFAULT 'Brasil',
  ADD COLUMN status character varying DEFAULT 'active' CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'blocked'::character varying]::text[])),
  ADD COLUMN customer_type character varying DEFAULT 'individual' CHECK (customer_type::text = ANY (ARRAY['individual'::character varying, 'business'::character varying]::text[])),
  ADD COLUMN notes text,
  ADD COLUMN tags text[],
  ADD COLUMN created_by uuid,
  ADD COLUMN updated_by uuid,
  ADD COLUMN version integer DEFAULT 1,
  ADD COLUMN last_sync_at timestamp with time zone DEFAULT now(),
  ADD COLUMN sync_status character varying DEFAULT 'synced' CHECK (sync_status::text = ANY (ARRAY['synced'::character varying, 'pending'::character varying, 'conflict'::character varying]::text[]));

-- Migrar dados do campo cpf para document_number
UPDATE public.customers 
SET 
  document_type = 'cpf',
  document_number = cpf
WHERE cpf IS NOT NULL;

-- Migrar dados do campo address (jsonb) para campos estruturados
UPDATE public.customers 
SET 
  address_street = address->>'street',
  address_number = address->>'number',
  address_complement = address->>'complement',
  address_neighborhood = address->>'neighborhood',
  address_city = address->>'city',
  address_state = address->>'state',
  address_zipcode = address->>'zipcode',
  address_country = COALESCE(address->>'country', 'Brasil')
WHERE address IS NOT NULL;

-- Tornar email obrigatório e único
DELETE FROM public.customers WHERE email IS NULL OR email = '';
ALTER TABLE public.customers 
  ALTER COLUMN email SET NOT NULL,
  ADD CONSTRAINT customers_email_unique UNIQUE (email);

-- Remover campos antigos
ALTER TABLE public.customers 
  DROP COLUMN cpf,
  DROP COLUMN address;

-- Adicionar foreign keys
ALTER TABLE public.customers 
  ADD CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  ADD CONSTRAINT customers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
```

#### 2.3 Atualização da tabela `orders`

```sql
-- Adicionar campos ausentes
ALTER TABLE public.orders 
  ADD COLUMN user_id uuid,
  ADD COLUMN order_number character varying UNIQUE,
  ADD COLUMN payment_status character varying DEFAULT 'pending' CHECK (payment_status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying, 'partially_refunded'::character varying]::text[])),
  ADD COLUMN payment_provider character varying DEFAULT 'abacatepay',
  ADD COLUMN payment_data jsonb,
  ADD COLUMN subtotal numeric DEFAULT 0 CHECK (subtotal >= 0::numeric),
  ADD COLUMN discount_amount numeric DEFAULT 0 CHECK (discount_amount >= 0::numeric),
  ADD COLUMN tax_amount numeric DEFAULT 0 CHECK (tax_amount >= 0::numeric),
  ADD COLUMN shipping_amount numeric DEFAULT 0 CHECK (shipping_amount >= 0::numeric),
  ADD COLUMN total_amount numeric CHECK (total_amount >= 0::numeric),
  ADD COLUMN currency character varying DEFAULT 'BRL',
  ADD COLUMN notes text,
  ADD COLUMN shipping_address jsonb,
  ADD COLUMN billing_address jsonb,
  ADD COLUMN confirmed_at timestamp with time zone,
  ADD COLUMN shipped_at timestamp with time zone,
  ADD COLUMN delivered_at timestamp with time zone,
  ADD COLUMN cancelled_at timestamp with time zone,
  ADD COLUMN created_by uuid,
  ADD COLUMN updated_by uuid,
  ADD COLUMN version integer DEFAULT 1,
  ADD COLUMN last_sync_at timestamp with time zone DEFAULT now(),
  ADD COLUMN sync_status character varying DEFAULT 'synced' CHECK (sync_status::text = ANY (ARRAY['synced'::character varying, 'pending'::character varying, 'conflict'::character varying]::text[]));

-- Migrar campo total para total_amount e calcular subtotal
UPDATE public.orders 
SET 
  total_amount = total,
  subtotal = total;

-- Gerar order_number único para pedidos existentes
UPDATE public.orders 
SET order_number = 'ORD-' || EXTRACT(YEAR FROM created_at) || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 6, '0');

-- Tornar customer_id obrigatório
DELETE FROM public.orders WHERE customer_id IS NULL;
ALTER TABLE public.orders ALTER COLUMN customer_id SET NOT NULL;

-- Adicionar constraints para status
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'processing'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying, 'refunded'::character varying]::text[]));

-- Adicionar constraints para payment_method
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method::text = ANY (ARRAY['pix'::character varying, 'credit_card'::character varying, 'debit_card'::character varying, 'bank_slip'::character varying, 'cash'::character varying]::text[]));

-- Tornar total_amount obrigatório
ALTER TABLE public.orders 
  ALTER COLUMN total_amount SET NOT NULL,
  ALTER COLUMN subtotal SET NOT NULL;

-- Remover campo total antigo
ALTER TABLE public.orders DROP COLUMN total;

-- Adicionar foreign keys
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  ADD CONSTRAINT orders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
```

#### 2.4 Atualização da tabela `order_items`

```sql
-- Adicionar campos ausentes
ALTER TABLE public.order_items 
  ADD COLUMN ticket_id uuid,
  ADD COLUMN size text,
  ADD COLUMN unit_price numeric CHECK (unit_price >= 0::numeric),
  ADD COLUMN total_price numeric CHECK (total_price >= 0::numeric),
  ADD COLUMN discount_amount numeric DEFAULT 0 CHECK (discount_amount >= 0::numeric),
  ADD COLUMN tax_amount numeric DEFAULT 0 CHECK (tax_amount >= 0::numeric);

-- Migrar campo price para unit_price e calcular total_price
UPDATE public.order_items 
SET 
  unit_price = price,
  total_price = quantity * price;

-- Tornar order_id obrigatório
DELETE FROM public.order_items WHERE order_id IS NULL;
ALTER TABLE public.order_items ALTER COLUMN order_id SET NOT NULL;

-- Adicionar constraints
ALTER TABLE public.order_items 
  ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
  ALTER COLUMN unit_price SET NOT NULL,
  ALTER COLUMN total_price SET NOT NULL;

-- Remover campo price antigo
ALTER TABLE public.order_items DROP COLUMN price;

-- Adicionar foreign key para tickets
ALTER TABLE public.order_items 
  ADD CONSTRAINT order_items_ticket_id_fkey 
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);
```

#### 2.5 Atualização da tabela `tickets`

```sql
-- Renomear campo title para name
ALTER TABLE public.tickets RENAME COLUMN title TO name;

-- Renomear campo quantity para max_quantity
ALTER TABLE public.tickets RENAME COLUMN quantity TO max_quantity;

-- Adicionar campos ausentes
ALTER TABLE public.tickets 
  ADD COLUMN category character varying,
  ADD COLUMN event_date timestamp with time zone,
  ADD COLUMN event_location character varying,
  ADD COLUMN available_quantity integer DEFAULT 0 CHECK (available_quantity >= 0),
  ADD COLUMN is_active boolean DEFAULT true,
  ADD COLUMN metadata jsonb,
  ADD COLUMN created_by uuid,
  ADD COLUMN updated_by uuid;

-- Inicializar available_quantity com max_quantity
UPDATE public.tickets 
SET available_quantity = COALESCE(max_quantity, 0);

-- Adicionar constraints
ALTER TABLE public.tickets 
  ADD CONSTRAINT tickets_price_check CHECK (price >= 0::numeric),
  ADD CONSTRAINT tickets_max_quantity_check CHECK (max_quantity > 0);

-- Adicionar foreign keys
ALTER TABLE public.tickets 
  ADD CONSTRAINT tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  ADD CONSTRAINT tickets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
```

### Fase 3: Validação e Testes

```sql
-- Verificar integridade dos dados migrados
SELECT 'cart_items' as tabela, COUNT(*) as total FROM public.cart_items
UNION ALL
SELECT 'customers', COUNT(*) FROM public.customers
UNION ALL
SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM public.order_items
UNION ALL
SELECT 'tickets', COUNT(*) FROM public.tickets;

-- Verificar foreign keys
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('cart_items', 'customers', 'orders', 'order_items', 'tickets')
ORDER BY tc.table_name, kcu.column_name;
```

### Fase 4: Limpeza

```sql
-- Após validação bem-sucedida, remover schema de backup
-- DROP SCHEMA backup_ojxmfxbflbfinodkhixk CASCADE;
```

### Considerações Importantes

1. **Backup Obrigatório**: Execute backup completo antes da migração
2. **Ambiente de Teste**: Teste a migração em ambiente de desenvolvimento primeiro
3. **Downtime**: Planeje janela de manutenção para a migração
4. **Rollback**: Mantenha plano de rollback usando os backups
5. **Validação**: Execute testes completos após a migração
6. **Performance**: Monitore performance após as mudanças estruturais

### Impacto Estimado

- **Tempo de Migração**: 30-60 minutos (dependendo do volume de dados)
- **Downtime**: 15-30 minutos
- **Risco**: Médio (devido à quantidade de mudanças estruturais)
- **Benefícios**: Sistema mais robusto, melhor integridade de dados, funcionalidades avançadas

### 3. Tabela `orders`

#### fdswhhckvweghcavgdvb (Esquema Avançado)
```sql
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  user_id uuid,
  order_number character varying UNIQUE,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'processing'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying, 'refunded'::character varying]::text[])),
  payment_status character varying DEFAULT 'pending'::character varying CHECK (payment_status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying, 'partially_refunded'::character varying]::text[])),
  payment_method character varying CHECK (payment_method::text = ANY (ARRAY['pix'::character varying, 'credit_card'::character varying, 'debit_card'::character varying, 'bank_slip'::character varying, 'cash'::character varying]::text[])),
  payment_provider character varying DEFAULT 'abacatepay'::character varying,
  payment_id character varying,
  payment_data jsonb,
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0::numeric),
  discount_amount numeric DEFAULT 0 CHECK (discount_amount >= 0::numeric),
  tax_amount numeric DEFAULT 0 CHECK (tax_amount >= 0::numeric),
  shipping_amount numeric DEFAULT 0 CHECK (shipping_amount >= 0::numeric),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0::numeric),
  currency character varying DEFAULT 'BRL'::character varying,
  notes text,
  shipping_address jsonb,
  billing_address jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  version integer DEFAULT 1,
  last_sync_at timestamp with time zone DEFAULT now(),
  sync_status character varying DEFAULT 'synced'::character varying CHECK (sync_status::text = ANY (ARRAY['synced'::character varying, 'pending'::character varying, 'conflict'::character varying]::text[])),
  -- Foreign Keys
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT orders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
```

#### ojxmfxbflbfinodkhixk (Esquema Básico)
```sql
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  total numeric NOT NULL,
  status text DEFAULT 'pending'::text,
  payment_method text,
  payment_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Foreign Keys
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
```

#### Diferenças Identificadas:

**Campos Ausentes em ojxmfxbflbfinodkhixk:**
- `user_id` - Ligação com usuário autenticado
- `order_number` - Número único do pedido
- `payment_status` - Status separado do pagamento
- `payment_provider` e `payment_data` - Dados do provedor de pagamento
- Campos financeiros detalhados (`subtotal`, `discount_amount`, `tax_amount`, `shipping_amount`)
- `currency` - Moeda da transação
- `notes` - Observações do pedido
- `shipping_address` e `billing_address` - Endereços estruturados
- Timestamps de workflow (`confirmed_at`, `shipped_at`, `delivered_at`, `cancelled_at`)
- Campos de auditoria (`created_by`, `updated_by`, `version`)
- Campos de sincronização (`last_sync_at`, `sync_status`)

**Diferenças de Estrutura:**
- `customer_id` é NOT NULL em fdswhhckvweghcavgdvb, mas permite NULL em ojxmfxbflbfinodkhixk
- `status` tem constraints específicos em fdswhhckvweghcavgdvb vs text livre em ojxmfxbflbfinodkhixk
- `total` vs `total_amount` com campos financeiros detalhados
- Sem constraints de validação em ojxmfxbflbfinodkhixk

**Impacto:**
- ❌ **CRÍTICO**: Sem `payment_status` separado, não é possível distinguir status do pedido vs pagamento
- ❌ **CRÍTICO**: Sem campos financeiros detalhados, não é possível calcular impostos, descontos, frete
- ❌ **CRÍTICO**: Sem `order_number`, não há identificação única para o cliente
- ⚠️ **ALTO**: Falta de timestamps de workflow impede rastreamento
- ⚠️ **ALTO**: Sem endereços estruturados, problemas com entrega

### 4. Tabela `order_items`

#### fdswhhckvweghcavgdvb (Esquema Completo)
```sql
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid,
  ticket_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  size text,
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  total_price numeric NOT NULL CHECK (total_price >= 0::numeric),
  discount_amount numeric DEFAULT 0 CHECK (discount_amount >= 0::numeric),
  tax_amount numeric DEFAULT 0 CHECK (tax_amount >= 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Foreign Keys
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT order_items_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id)
);
```

#### ojxmfxbflbfinodkhixk (Esquema Básico)
```sql
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  product_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Foreign Keys
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
```

#### Diferenças Identificadas:

**Campos Ausentes em ojxmfxbflbfinodkhixk:**
- `ticket_id` - Referência para ingressos
- `size` - Tamanho do produto
- `unit_price` vs `price` - Preço unitário estruturado
- `total_price` - Preço total do item
- `discount_amount` - Desconto aplicado
- `tax_amount` - Impostos do item

**Diferenças de Estrutura:**
- `order_id` é NOT NULL em fdswhhckvweghcavgdvb, mas permite NULL em ojxmfxbflbfinodkhixk
- `quantity` tem DEFAULT 1 em ojxmfxbflbfinodkhixk
- Sem constraints de validação em ojxmfxbflbfinodkhixk
- Falta foreign key para `ticket_id` em ojxmfxbflbfinodkhixk

**Impacto:**
- ❌ **CRÍTICO**: Sem `ticket_id`, não é possível vender ingressos
- ❌ **CRÍTICO**: Sem `total_price`, `discount_amount` e `tax_amount`, cálculos financeiros incorretos
- ⚠️ **MÉDIO**: Sem `size`, não é possível especificar tamanhos de produtos
- ⚠️ **MÉDIO**: `order_id` nullable pode causar problemas de integridade

---

### 5. Tabela `tickets`

#### fdswhhckvweghcavgdvb (Esquema Completo)
```sql
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  category character varying,
  event_date timestamp with time zone,
  event_location character varying,
  max_quantity integer CHECK (max_quantity > 0),
  available_quantity integer DEFAULT 0 CHECK (available_quantity >= 0),
  is_active boolean DEFAULT true,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  -- Foreign Keys
  CONSTRAINT tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT tickets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
```

#### ojxmfxbflbfinodkhixk (Esquema Básico)
```sql
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price numeric NOT NULL,
  quantity integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### Diferenças Identificadas:

**Campos Ausentes em ojxmfxbflbfinodkhixk:**
- `category` - Categoria do ingresso
- `event_date` e `event_location` - Dados do evento
- `max_quantity` vs `quantity` - Controle de estoque
- `available_quantity` - Quantidade disponível
- `is_active` - Status ativo/inativo
- `metadata` - Dados adicionais
- Campos de auditoria (`created_by`, `updated_by`)

**Diferenças de Nomenclatura:**
- `name` vs `title` - Nome do ingresso
- `max_quantity` vs `quantity` - Semântica diferente

**Diferenças de Estrutura:**
- Sem constraints de validação em ojxmfxbflbfinodkhixk
- Sem foreign keys de auditoria

**Impacto:**
- ❌ **CRÍTICO**: Sem `event_date` e `event_location`, não é possível gerenciar eventos
- ❌ **CRÍTICO**: Sem `available_quantity` e `max_quantity`, controle de estoque inadequado
- ⚠️ **ALTO**: Sem `is_active`, não é possível desativar ingressos
- ⚠️ **MÉDIO**: Sem `category`, organização limitada

---

### 2. Tabela `customers`

#### fdswhhckvweghcavgdvb (Esquema Completo)
```sql
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  phone character varying,
  document_type character varying CHECK (document_type::text = ANY (ARRAY['cpf'::character varying, 'cnpj'::character varying]::text[])),
  document_number character varying,
  birth_date date,
  address_street character varying,
  address_number character varying,
  address_complement character varying,
  address_neighborhood character varying,
  address_city character varying,
  address_state character varying,
  address_zipcode character varying,
  address_country character varying DEFAULT 'Brasil'::character varying,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'blocked'::character varying]::text[])),
  customer_type character varying DEFAULT 'individual'::character varying CHECK (customer_type::text = ANY (ARRAY['individual'::character varying, 'business'::character varying]::text[])),
  notes text,
  tags ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  version integer DEFAULT 1,
  last_sync_at timestamp with time zone DEFAULT now(),
  sync_status character varying DEFAULT 'synced'::character varying CHECK (sync_status::text = ANY (ARRAY['synced'::character varying, 'pending'::character varying, 'conflict'::character varying]::text[])),
  -- Foreign Keys
  CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT customers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
```

#### ojxmfxbflbfinodkhixk (Esquema Básico)
```sql
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  cpf text,
  address jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### Diferenças Identificadas:

**Campos Ausentes em ojxmfxbflbfinodkhixk:**
- `user_id` - Ligação com usuário autenticado
- `document_type` e `document_number` - Tipos de documento estruturados
- `birth_date` - Data de nascimento
- Campos de endereço estruturados (street, number, complement, etc.)
- `status` - Status do cliente
- `customer_type` - Tipo de cliente (individual/business)
- `notes` e `tags` - Metadados
- Campos de auditoria (`created_by`, `updated_by`, `version`)
- Campos de sincronização (`last_sync_at`, `sync_status`)

**Diferenças de Estrutura:**
- `email` é UNIQUE e NOT NULL em fdswhhckvweghcavgdvb, mas permite NULL em ojxmfxbflbfinodkhixk
- `address` é JSONB em ojxmfxbflbfinodkhixk vs campos estruturados em fdswhhckvweghcavgdvb
- `cpf` é campo direto em ojxmfxbflbfinodkhixk vs `document_type`/`document_number` em fdswhhckvweghcavgdvb

**Impacto:**
- ❌ **CRÍTICO**: Sem `user_id`, não há ligação com usuários autenticados
- ❌ **CRÍTICO**: `email` nullable pode causar problemas de identificação
- ⚠️ **ALTO**: Falta de campos de auditoria e sincronização
- ⚠️ **MÉDIO**: Endereço em JSONB vs estruturado pode afetar consultas

---