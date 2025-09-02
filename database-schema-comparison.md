# Comparação de Esquemas de Banco de Dados

## Projeto Origem: ojxmfxbflbfinodkhixk
## Projeto Destino: fdswhhckvweghcavgdvb

## Resumo Executivo

Este documento apresenta uma análise detalhada das diferenças entre os esquemas de banco de dados `fdswhhckvweghcavgdvb` e `ojxmfxbflbfinodkhixk`. O esquema `fdswhhckvweghcavgdvb` é significativamente mais robusto e completo, adequado para um sistema de e-commerce/eventos em produção, enquanto `ojxmfxbflbfinodkhixk` apresenta uma estrutura mais simplificada.

## 1. Tabela `cart_items`

### fdswhhckvweghcavgdvb (Completo)
```sql
CREATE TABLE cart_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
    quantity integer NOT NULL,
    unit_price numeric(10,2),
    total_price numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT cart_items_product_or_ticket CHECK (((product_id IS NOT NULL) OR (ticket_id IS NOT NULL)))
);
```

### ojxmfxbflbfinodkhixk (Simplificado)
```sql
CREATE TABLE cart_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);
```

### Diferenças Críticas
- **Campos ausentes em ojxmfxbflbfinodkhixk**: `ticket_id`, `unit_price`, `total_price`
- **Constraints diferentes**: `user_id` é nullable em ojxmfxbflbfinodkhixk, `product_id` é NOT NULL
- **Impacto**: Crítico - não suporta ingressos no carrinho e não calcula valores

## 2. Tabela `customers`

### fdswhhckvweghcavgdvb (Completo)
```sql
CREATE TABLE customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    document text,
    document_type text DEFAULT 'cpf'::text,
    birth_date date,
    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    address_zipcode text,
    address_country text DEFAULT 'BR'::text,
    status text DEFAULT 'active'::text,
    customer_type text DEFAULT 'individual'::text,
    notes text,
    tags text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_sync_at timestamp with time zone,
    external_id text,
    CONSTRAINT customers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'blocked'::text])))
);
```

### ojxmfxbflbfinodkhixk (Básico)
```sql
CREATE TABLE customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    document text,
    address jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
```

### Diferenças Críticas
- **Campos ausentes em ojxmfxbflbfinodkhixk**: `user_id`, `document_type`, `birth_date`, campos de endereço estruturados, `status`, `customer_type`, `notes`, `tags`, campos de auditoria e sincronização
- **Diferenças estruturais**: `email` é nullable, `address` é JSONB em vez de campos estruturados
- **Impacto**: Crítico - não há ligação com usuários autenticados, problemas de identificação

## 3. Tabela `orders`

### fdswhhckvweghcavgdvb (Completo)
```sql
CREATE TABLE orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL NOT NULL,
    order_number text UNIQUE NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_status text DEFAULT 'pending'::text,
    total_amount numeric(10,2) NOT NULL,
    subtotal_amount numeric(10,2),
    tax_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    shipping_amount numeric(10,2) DEFAULT 0,
    currency text DEFAULT 'BRL'::text,
    notes text,
    shipping_address_street text,
    shipping_address_number text,
    shipping_address_complement text,
    shipping_address_neighborhood text,
    shipping_address_city text,
    shipping_address_state text,
    shipping_address_zipcode text,
    shipping_address_country text DEFAULT 'BR'::text,
    billing_address_street text,
    billing_address_number text,
    billing_address_complement text,
    billing_address_neighborhood text,
    billing_address_city text,
    billing_address_state text,
    billing_address_zipcode text,
    billing_address_country text DEFAULT 'BR'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    confirmed_at timestamp with time zone,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    last_sync_at timestamp with time zone,
    external_id text,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text])))
);
```

### ojxmfxbflbfinodkhixk (Simplificado)
```sql
CREATE TABLE orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
    status text DEFAULT 'pending'::text,
    total_amount numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])))
);
```

### Diferenças Críticas
- **Campos ausentes em ojxmfxbflbfinodkhixk**: `user_id`, `order_number`, `payment_status` separado, campos financeiros detalhados, `currency`, `notes`, endereços estruturados, timestamps de workflow, campos de auditoria e sincronização
- **Constraints diferentes**: `customer_id` com CASCADE em vez de SET NULL
- **Impacto**: Crítico - não suporta workflow completo de pedidos nem rastreamento financeiro detalhado

## 4. Tabela `order_items`

### fdswhhckvweghcavgdvb (Completo)
```sql
CREATE TABLE order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
    size text,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_product_or_ticket CHECK (((product_id IS NOT NULL) OR (ticket_id IS NOT NULL)))
);
```

### ojxmfxbflbfinodkhixk (Simplificado)
```sql
CREATE TABLE order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);
```

### Diferenças Críticas
- **Campos ausentes em ojxmfxbflbfinodkhixk**: `ticket_id`, `size`, `total_price`, `discount_amount`, `tax_amount`
- **Constraints diferentes**: `order_id` é nullable, sem validação de produto ou ticket
- **Impacto**: Crítico - não suporta venda de ingressos nem cálculos financeiros detalhados

## 5. Tabela `tickets`

### fdswhhckvweghcavgdvb (Completo)
```sql
CREATE TABLE tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    category text,
    event_date timestamp with time zone,
    event_location text,
    max_quantity integer,
    available_quantity integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
```

### ojxmfxbflbfinodkhixk (Básico)
```sql
CREATE TABLE tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
```

### Diferenças Críticas
- **Campos ausentes em ojxmfxbflbfinodkhixk**: `category`, `event_date`, `event_location`, `max_quantity`, `available_quantity`, `is_active`
- **Impacto**: Crítico - sem esses campos não é possível gerenciar eventos adequadamente nem controlar estoque de ingressos
- **Funcionalidades perdidas**: Categorização de ingressos, controle de datas de eventos, gestão de localização, controle de quantidade disponível

## 6. Tabela `profiles`

### fdswhhckvweghcavgdvb (Completo)
```sql
CREATE TABLE profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    updated_at timestamp with time zone,
    username text UNIQUE,
    full_name text,
    avatar_url text,
    website text,
    CONSTRAINT username_length CHECK ((char_length(username) >= 3))
);
```

### ojxmfxbflbfinodkhixk (Básico)
```sql
CREATE TABLE profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    updated_at timestamp with time zone,
    username text,
    full_name text,
    avatar_url text,
    website text
);
```

### Diferenças
- **Constraints ausentes em ojxmfxbflbfinodkhixk**: `UNIQUE` no username, `username_length CHECK`
- **Impacto**: Médio - pode permitir usernames duplicados e muito curtos
- **Funcionalidades perdidas**: Validação de unicidade e tamanho mínimo de username

## 7. Tabela `rls_performance_metrics`

### fdswhhckvweghcavgdvb (Completo)
```sql
CREATE TABLE rls_performance_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    operation text NOT NULL,
    execution_time_ms numeric(10,3) NOT NULL,
    row_count integer,
    user_id uuid,
    policy_name text,
    created_at timestamp with time zone DEFAULT now()
);
```

### ojxmfxbflbfinodkhixk (Básico)
```sql
CREATE TABLE rls_performance_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    operation text NOT NULL,
    execution_time_ms numeric(10,3) NOT NULL,
    row_count integer,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);
```

### Diferenças
- **Campos ausentes em ojxmfxbflbfinodkhixk**: `policy_name`
- **Impacto**: Baixo - reduz granularidade do monitoramento de performance
- **Funcionalidades perdidas**: Identificação específica de qual política RLS está causando impacto na performance

## Resumo de Impactos

### Críticos (Impedem funcionalidade principal)
1. **cart_items**: Sem suporte a ingressos e cálculo de valores
2. **customers**: Sem ligação com usuários autenticados
3. **orders**: Workflow de pedidos incompleto
4. **order_items**: Sem suporte a ingressos e cálculos financeiros
5. **tickets**: Gerenciamento de eventos impossível

### Médios (Reduzem funcionalidade)
1. **profiles**: Validações de username ausentes

### Baixos (Impacto mínimo)
1. **rls_performance_metrics**: Monitoramento menos granular

## Plano de Migração: ojxmfxbflbfinodkhixk → fdswhhckvweghcavgdvb

### Fase 1: Preparação (2-4 horas)

#### 1.1 Backup Completo
```sql
-- Backup de todas as tabelas do projeto ojxmfxbflbfinodkhixk
pg_dump --host=aws-1-sa-east-1.pooler.supabase.com \
        --port=6543 \
        --username=postgres.ojxmfxbflbfinodkhixk \
        --dbname=postgres \
        --file=backup_ojxmfxbflbfinodkhixk_$(date +%Y%m%d_%H%M%S).sql
```

#### 1.2 Análise de Dados Existentes
```sql
-- Verificar volume de dados em cada tabela
SELECT 
    schemaname,
    tablename,
    n_tup_ins as total_rows,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables 
ORDER BY n_tup_ins DESC;
```

### Fase 2: Migração de Schema (4-6 horas)

#### 2.1 Atualização da Tabela `cart_items`
```sql
-- Adicionar campos ausentes
ALTER TABLE cart_items 
ADD COLUMN ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
ADD COLUMN unit_price numeric(10,2),
ADD COLUMN total_price numeric(10,2);

-- Atualizar constraints
ALTER TABLE cart_items 
ALTER COLUMN user_id SET NOT NULL;

-- Adicionar constraint de produto ou ticket
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_product_or_ticket 
CHECK (((product_id IS NOT NULL) OR (ticket_id IS NOT NULL)));
```

#### 2.2 Atualização da Tabela `customers`
```sql
-- Adicionar campos ausentes
ALTER TABLE customers 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN document_type text DEFAULT 'cpf'::text,
ADD COLUMN birth_date date,
ADD COLUMN address_street text,
ADD COLUMN address_number text,
ADD COLUMN address_complement text,
ADD COLUMN address_neighborhood text,
ADD COLUMN address_city text,
ADD COLUMN address_state text,
ADD COLUMN address_zipcode text,
ADD COLUMN address_country text DEFAULT 'BR'::text,
ADD COLUMN status text DEFAULT 'active'::text,
ADD COLUMN customer_type text DEFAULT 'individual'::text,
ADD COLUMN notes text,
ADD COLUMN tags text[],
ADD COLUMN last_sync_at timestamp with time zone,
ADD COLUMN external_id text;

-- Migrar dados do campo address JSONB para campos estruturados
UPDATE customers 
SET 
    address_street = address->>'street',
    address_number = address->>'number',
    address_complement = address->>'complement',
    address_neighborhood = address->>'neighborhood',
    address_city = address->>'city',
    address_state = address->>'state',
    address_zipcode = address->>'zipcode',
    address_country = COALESCE(address->>'country', 'BR')
WHERE address IS NOT NULL;

-- Remover campo address JSONB após migração
ALTER TABLE customers DROP COLUMN address;

-- Adicionar constraints
ALTER TABLE customers 
ALTER COLUMN email SET NOT NULL,
ADD CONSTRAINT customers_status_check 
CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'blocked'::text])));
```

#### 2.3 Atualização da Tabela `orders`
```sql
-- Adicionar campos ausentes
ALTER TABLE orders 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN order_number text UNIQUE,
ADD COLUMN payment_status text DEFAULT 'pending'::text,
ADD COLUMN subtotal_amount numeric(10,2),
ADD COLUMN tax_amount numeric(10,2) DEFAULT 0,
ADD COLUMN discount_amount numeric(10,2) DEFAULT 0,
ADD COLUMN shipping_amount numeric(10,2) DEFAULT 0,
ADD COLUMN currency text DEFAULT 'BRL'::text,
ADD COLUMN notes text,
ADD COLUMN shipping_address_street text,
ADD COLUMN shipping_address_number text,
ADD COLUMN shipping_address_complement text,
ADD COLUMN shipping_address_neighborhood text,
ADD COLUMN shipping_address_city text,
ADD COLUMN shipping_address_state text,
ADD COLUMN shipping_address_zipcode text,
ADD COLUMN shipping_address_country text DEFAULT 'BR'::text,
ADD COLUMN billing_address_street text,
ADD COLUMN billing_address_number text,
ADD COLUMN billing_address_complement text,
ADD COLUMN billing_address_neighborhood text,
ADD COLUMN billing_address_city text,
ADD COLUMN billing_address_state text,
ADD COLUMN billing_address_zipcode text,
ADD COLUMN billing_address_country text DEFAULT 'BR'::text,
ADD COLUMN confirmed_at timestamp with time zone,
ADD COLUMN shipped_at timestamp with time zone,
ADD COLUMN delivered_at timestamp with time zone,
ADD COLUMN cancelled_at timestamp with time zone,
ADD COLUMN last_sync_at timestamp with time zone,
ADD COLUMN external_id text;

-- Gerar order_number para pedidos existentes
UPDATE orders 
SET order_number = 'ORD-' || EXTRACT(YEAR FROM created_at) || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 6, '0')
WHERE order_number IS NULL;

-- Atualizar constraints
ALTER TABLE orders 
ALTER COLUMN customer_id SET NOT NULL,
ALTER COLUMN order_number SET NOT NULL,
DROP CONSTRAINT IF EXISTS orders_status_check,
ADD CONSTRAINT orders_status_check 
CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text])));
```

#### 2.4 Atualização da Tabela `order_items`
```sql
-- Adicionar campos ausentes
ALTER TABLE order_items 
ADD COLUMN ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
ADD COLUMN size text,
ADD COLUMN total_price numeric(10,2),
ADD COLUMN discount_amount numeric(10,2) DEFAULT 0,
ADD COLUMN tax_amount numeric(10,2) DEFAULT 0;

-- Calcular total_price para itens existentes
UPDATE order_items 
SET total_price = quantity * unit_price
WHERE total_price IS NULL;

-- Atualizar constraints
ALTER TABLE order_items 
ALTER COLUMN order_id SET NOT NULL,
ALTER COLUMN total_price SET NOT NULL,
ADD CONSTRAINT order_items_product_or_ticket 
CHECK (((product_id IS NOT NULL) OR (ticket_id IS NOT NULL)));
```

#### 2.5 Atualização da Tabela `tickets`
```sql
-- Adicionar campos ausentes
ALTER TABLE tickets 
ADD COLUMN category text,
ADD COLUMN event_date timestamp with time zone,
ADD COLUMN event_location text,
ADD COLUMN max_quantity integer,
ADD COLUMN available_quantity integer DEFAULT 0,
ADD COLUMN is_active boolean DEFAULT true;
```

#### 2.6 Atualização da Tabela `profiles`
```sql
-- Adicionar constraints ausentes
ALTER TABLE profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username),
ADD CONSTRAINT username_length CHECK ((char_length(username) >= 3));
```

#### 2.7 Atualização da Tabela `rls_performance_metrics`
```sql
-- Adicionar campo ausente
ALTER TABLE rls_performance_metrics 
ADD COLUMN policy_name text;
```

### Fase 3: Migração de Dados (2-4 horas)

#### 3.1 Migração de Dados do Carrinho
```sql
-- Calcular preços para itens do carrinho existentes
UPDATE cart_items 
SET 
    unit_price = p.price,
    total_price = quantity * p.price
FROM products p 
WHERE cart_items.product_id = p.id 
AND cart_items.unit_price IS NULL;
```

#### 3.2 Associação de Clientes com Usuários
```sql
-- Tentar associar clientes existentes com usuários pelo email
UPDATE customers 
SET user_id = au.id
FROM auth.users au 
WHERE customers.email = au.email 
AND customers.user_id IS NULL;
```

### Fase 4: Atualização de Edge Functions (2-3 horas)

#### 4.1 Funções que Precisam de Atualização
- `sync-cart`: Atualizar para incluir campos de preço
- `sync-orders`: Atualizar para novos campos de status e endereço
- `abacatepay-manager`: Atualizar para novos campos de pagamento

#### 4.2 Funções Compatíveis (sem alteração)
- `sync-products`
- `realtime-latency-monitor`
- `rls-performance-monitor`
- `conflict-resolver`
- `stock-monitor`

### Fase 5: Testes e Validação (3-4 horas)

#### 5.1 Testes de Integridade
```sql
-- Verificar integridade referencial
SELECT 
    conname,
    conrelid::regclass,
    confrelid::regclass
FROM pg_constraint 
WHERE contype = 'f' 
AND connamespace = 'public'::regnamespace;

-- Verificar dados órfãos
SELECT 'cart_items' as tabela, COUNT(*) as orfaos
FROM cart_items ci
LEFT JOIN products p ON ci.product_id = p.id
LEFT JOIN tickets t ON ci.ticket_id = t.id
WHERE p.id IS NULL AND t.id IS NULL;
```

#### 5.2 Testes Funcionais
- Criar novo item no carrinho
- Processar pedido completo
- Testar webhooks do AbacatePay
- Validar sincronização em tempo real

### Fase 6: Deploy e Monitoramento (1-2 horas)

#### 6.1 Deploy das Edge Functions
```bash
# Deploy das funções atualizadas
supabase functions deploy sync-cart
supabase functions deploy sync-orders
supabase functions deploy abacatepay-manager
```

#### 6.2 Monitoramento Pós-Migração
- Monitorar logs de erro por 24h
- Verificar performance das consultas
- Validar funcionamento dos webhooks

## Rollback Plan

### Em Caso de Problemas Críticos
```sql
-- Restaurar backup completo
psql --host=aws-1-sa-east-1.pooler.supabase.com \
     --port=6543 \
     --username=postgres.ojxmfxbflbfinodkhixk \
     --dbname=postgres \
     --file=backup_ojxmfxbflbfinodkhixk_YYYYMMDD_HHMMSS.sql
```

## Cronograma Estimado

| Fase | Duração | Responsável | Dependências |
|------|---------|-------------|-------------|
| Preparação | 2-4h | DevOps | - |
| Migração Schema | 4-6h | Backend Dev | Backup completo |
| Migração Dados | 2-4h | Backend Dev | Schema atualizado |
| Edge Functions | 2-3h | Full Stack Dev | Dados migrados |
| Testes | 3-4h | QA Team | Functions deployadas |
| Deploy | 1-2h | DevOps | Testes aprovados |

**Total Estimado Original: 14-23 horas**
**Total Otimizado: 8-12 horas** ⚡

## 🚀 Estratégias de Otimização

### 1. Paralelização de Tarefas (Redução: 40%)

#### Execução Simultânea
```bash
# Terminal 1: Migração de Schema
psql -f migration_schema.sql

# Terminal 2: Preparação de Edge Functions
cd supabase/functions && npm run build:all

# Terminal 3: Preparação de Testes
npm run test:prepare
```

#### Divisão por Domínios
- **Equipe A**: Tabelas de produtos (`products`, `product_sizes`)
- **Equipe B**: Tabelas de pedidos (`orders`, `order_items`, `cart_items`)
- **Equipe C**: Tabelas de usuários (`customers`, `profiles`)
- **Equipe D**: Tabelas auxiliares (`tickets`, `rls_performance_metrics`)

### 2. Automação com Scripts (Redução: 30%)

#### Script de Migração Automatizada
```bash
#!/bin/bash
# migrate-optimized.sh

set -e

echo "🚀 Iniciando migração otimizada..."

# Fase 1: Backup (paralelo)
echo "📦 Criando backup..."
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql &
BACKUP_PID=$!

# Fase 2: Preparação (enquanto backup roda)
echo "⚙️ Preparando scripts..."
node scripts/generate-migration-sql.js
node scripts/validate-migration.js

# Aguardar backup
wait $BACKUP_PID
echo "✅ Backup concluído"

# Fase 3: Migração de schema (batch)
echo "🔄 Executando migração..."
psql $DATABASE_URL -f generated_migration.sql

# Fase 4: Deploy functions (paralelo)
echo "🚀 Deployando functions..."
supabase functions deploy --parallel

echo "✅ Migração concluída!"
```

#### Gerador de SQL Automático
```javascript
// scripts/generate-migration-sql.js
const fs = require('fs');

const migrations = {
  cart_items: `
    ALTER TABLE cart_items 
    ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES tickets(id),
    ADD COLUMN IF NOT EXISTS unit_price numeric(10,2),
    ADD COLUMN IF NOT EXISTS total_price numeric(10,2);
  `,
  // ... outras tabelas
};

const fullMigration = Object.values(migrations).join('\n\n');
fs.writeFileSync('generated_migration.sql', fullMigration);
console.log('✅ Migration SQL gerado');
```

### 3. Migração Incremental (Redução: 25%)

#### Blue-Green Deployment
```sql
-- Criar tabelas temporárias com novo schema
CREATE TABLE cart_items_new AS SELECT * FROM cart_items;

-- Adicionar campos novos
ALTER TABLE cart_items_new ADD COLUMN ticket_id uuid;
-- ... outros campos

-- Migrar dados em lotes pequenos
DO $$
DECLARE
    batch_size INTEGER := 1000;
    offset_val INTEGER := 0;
BEGIN
    LOOP
        UPDATE cart_items_new 
        SET unit_price = p.price,
            total_price = quantity * p.price
        FROM products p 
        WHERE cart_items_new.product_id = p.id
        AND cart_items_new.id IN (
            SELECT id FROM cart_items_new 
            WHERE unit_price IS NULL
            LIMIT batch_size OFFSET offset_val
        );
        
        IF NOT FOUND THEN EXIT; END IF;
        offset_val := offset_val + batch_size;
        
        -- Commit a cada lote
        COMMIT;
    END LOOP;
END $$;

-- Trocar tabelas atomicamente
BEGIN;
    ALTER TABLE cart_items RENAME TO cart_items_old;
    ALTER TABLE cart_items_new RENAME TO cart_items;
COMMIT;
```

### 4. Validação Automatizada (Redução: 50%)

#### Testes de Integridade Automáticos
```javascript
// scripts/validate-migration.js
const { createClient } = require('@supabase/supabase-js');

const tests = [
  {
    name: 'cart_items_integrity',
    query: `
      SELECT COUNT(*) as orphans 
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      LEFT JOIN tickets t ON ci.ticket_id = t.id
      WHERE p.id IS NULL AND t.id IS NULL
    `,
    expected: 0
  },
  {
    name: 'orders_totals',
    query: `
      SELECT COUNT(*) as invalid_totals
      FROM orders 
      WHERE total_amount != (subtotal_amount + tax_amount + shipping_amount - discount_amount)
    `,
    expected: 0
  }
];

async function runValidation() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  for (const test of tests) {
    const { data, error } = await supabase.rpc('execute_sql', { query: test.query });
    
    if (error || data[0][Object.keys(data[0])[0]] !== test.expected) {
      throw new Error(`❌ Teste ${test.name} falhou`);
    }
    
    console.log(`✅ ${test.name} passou`);
  }
}

runValidation().catch(console.error);
```

### 5. Cronograma Otimizado

| Fase | Duração Original | Duração Otimizada | Otimização |
|------|------------------|-------------------|------------|
| Preparação | 2-4h | 1-2h | Automação |
| Schema | 4-6h | 2-3h | Paralelização + Scripts |
| Dados | 2-4h | 1-2h | Migração incremental |
| Functions | 2-3h | 1h | Deploy paralelo |
| Testes | 3-4h | 2h | Automação |
| Deploy | 1-2h | 1h | Pipeline CI/CD |

### 6. Pipeline CI/CD para Migração

```yaml
# .github/workflows/migration.yml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate migration scripts
        run: node scripts/generate-migration-sql.js
        
      - name: Validate migration
        run: node scripts/validate-migration.js
        
      - name: Create backup
        run: |
          pg_dump ${{ secrets.DATABASE_URL }} > backup_$(date +%Y%m%d_%H%M%S).sql
          aws s3 cp backup_*.sql s3://backups-bucket/
        
      - name: Run migration
        run: psql ${{ secrets.DATABASE_URL }} -f generated_migration.sql
        
      - name: Deploy functions
        run: supabase functions deploy --parallel
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Notify team
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Migration ${{ job.status }} for ${{ github.event.inputs.environment }}'
```

### 7. Monitoramento em Tempo Real

```javascript
// scripts/migration-monitor.js
const { createClient } = require('@supabase/supabase-js');

class MigrationMonitor {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    this.metrics = {
      startTime: Date.now(),
      tablesProcessed: 0,
      recordsMigrated: 0,
      errors: []
    };
  }
  
  async trackProgress(tableName, recordCount) {
    this.metrics.tablesProcessed++;
    this.metrics.recordsMigrated += recordCount;
    
    const elapsed = (Date.now() - this.metrics.startTime) / 1000;
    const rate = this.metrics.recordsMigrated / elapsed;
    
    console.log(`📊 ${tableName}: ${recordCount} registros | Taxa: ${rate.toFixed(0)} reg/s`);
  }
  
  async checkHealth() {
    const { data, error } = await this.supabase
      .from('pg_stat_activity')
      .select('count')
      .eq('state', 'active');
      
    if (error) {
      this.metrics.errors.push(error);
      console.error('❌ Erro no health check:', error);
    }
    
    return !error;
  }
}
```

### 8. Rollback Rápido

```sql
-- Rollback em menos de 5 minutos
CREATE OR REPLACE FUNCTION quick_rollback()
RETURNS void AS $$
BEGIN
    -- Renomear tabelas de volta
    ALTER TABLE cart_items RENAME TO cart_items_new;
    ALTER TABLE cart_items_old RENAME TO cart_items;
    
    -- Repetir para todas as tabelas
    -- ...
    
    RAISE NOTICE 'Rollback concluído em %', clock_timestamp();
END;
$$ LANGUAGE plpgsql;
```

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|----------|
| Perda de dados | Baixa | Alto | Backup completo + testes |
| Downtime prolongado | Média | Alto | Migração em horário de baixo tráfego |
| Incompatibilidade de Edge Functions | Média | Médio | Testes em ambiente de staging |
| Performance degradada | Baixa | Médio | Monitoramento ativo |

## Checklist de Validação

### Pré-Migração
- [ ] Backup completo realizado
- [ ] Ambiente de staging testado
- [ ] Equipe notificada
- [ ] Plano de rollback validado

### Pós-Migração
- [ ] Todas as tabelas migradas
- [ ] Constraints aplicadas
- [ ] Edge Functions deployadas
- [ ] Testes funcionais aprovados
- [ ] Monitoramento ativo
- [ ] Documentação atualizada