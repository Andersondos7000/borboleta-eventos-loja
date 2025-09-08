#!/usr/bin/env node
/**
 * Gerador automático de scripts SQL para migração de schema
 * Reduz tempo de preparação de 2-4h para 30min
 */

import fs from 'fs';
import path from 'path';

// Configurações da migração
const MIGRATION_CONFIG = {
  sourceSchema: 'ojxmfxbflbfinodkhixk',
  targetSchema: 'ojxmfxbflbfinodkhixk',
  batchSize: 1000,
  timestamp: new Date().toISOString().replace(/[:.]/g, '-')
};

// Definições das migrações por tabela
const MIGRATIONS = {
  cart_items: {
    addColumns: [
      'ticket_id uuid REFERENCES tickets(id)',
      'unit_price numeric(10,2) NOT NULL DEFAULT 0',
      'total_price numeric(10,2) NOT NULL DEFAULT 0'
    ],
    updateConstraints: [
      'ALTER TABLE cart_items ALTER COLUMN user_id SET NOT NULL',
      'ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0)'
    ],
    dataUpdates: [
      `UPDATE cart_items SET 
         unit_price = p.price,
         total_price = quantity * p.price
       FROM products p 
       WHERE cart_items.product_id = p.id`
    ]
  },
  
  customers: {
    addColumns: [
      'user_id uuid REFERENCES auth.users(id)',
      'document_type varchar(10) DEFAULT \'cpf\'',
      'birth_date date',
      'street varchar(255)',
      'number varchar(20)',
      'complement varchar(100)',
      'neighborhood varchar(100)',
      'city varchar(100)',
      'state varchar(2)',
      'zip_code varchar(10)',
      'country varchar(2) DEFAULT \'BR\'',
      'status varchar(20) DEFAULT \'active\' CHECK (status IN (\'active\', \'inactive\', \'suspended\'))',
      'customer_type varchar(20) DEFAULT \'individual\' CHECK (customer_type IN (\'individual\', \'business\'))',
      'notes text',
      'tags jsonb DEFAULT \'[]\'::\:jsonb',
      'created_at timestamptz DEFAULT now()',
      'updated_at timestamptz DEFAULT now()',
      'last_sync_at timestamptz',
      'external_id varchar(100)'
    ],
    updateConstraints: [
      'ALTER TABLE customers ALTER COLUMN email SET NOT NULL',
      'ALTER TABLE customers ADD CONSTRAINT customers_email_valid CHECK (email ~* \'\\A[\\w+\\-.]+@[a-z\\d\\-]+(\\.[a-z\\d\\-]+)*\\.[a-z]+\\z\')',
      'CREATE UNIQUE INDEX customers_user_id_unique ON customers(user_id) WHERE user_id IS NOT NULL'
    ],
    dataUpdates: [
      `UPDATE customers SET 
         status = 'active',
         customer_type = 'individual',
         country = 'BR'
       WHERE status IS NULL`
    ]
  },
  
  orders: {
    addColumns: [
      'user_id uuid REFERENCES auth.users(id)',
      'order_number varchar(50) UNIQUE NOT NULL DEFAULT generate_order_number()',
      'payment_status varchar(20) DEFAULT \'pending\' CHECK (payment_status IN (\'pending\', \'processing\', \'paid\', \'failed\', \'refunded\'))',
      'subtotal_amount numeric(10,2) NOT NULL DEFAULT 0',
      'tax_amount numeric(10,2) NOT NULL DEFAULT 0',
      'shipping_amount numeric(10,2) NOT NULL DEFAULT 0',
      'discount_amount numeric(10,2) NOT NULL DEFAULT 0',
      'currency varchar(3) DEFAULT \'BRL\'',
      'notes text',
      'billing_street varchar(255)',
      'billing_number varchar(20)',
      'billing_complement varchar(100)',
      'billing_neighborhood varchar(100)',
      'billing_city varchar(100)',
      'billing_state varchar(2)',
      'billing_zip_code varchar(10)',
      'billing_country varchar(2) DEFAULT \'BR\'',
      'shipping_street varchar(255)',
      'shipping_number varchar(20)',
      'shipping_complement varchar(100)',
      'shipping_neighborhood varchar(100)',
      'shipping_city varchar(100)',
      'shipping_state varchar(2)',
      'shipping_zip_code varchar(10)',
      'shipping_country varchar(2) DEFAULT \'BR\'',
      'confirmed_at timestamptz',
      'shipped_at timestamptz',
      'delivered_at timestamptz',
      'cancelled_at timestamptz',
      'updated_at timestamptz DEFAULT now()',
      'last_sync_at timestamptz',
      'external_id varchar(100)'
    ],
    updateConstraints: [
      'ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL',
      'ALTER TABLE orders ADD CONSTRAINT orders_status_valid CHECK (status IN (\'pending\', \'confirmed\', \'processing\', \'shipped\', \'delivered\', \'cancelled\', \'refunded\'))',
      'ALTER TABLE orders ADD CONSTRAINT orders_total_calculation CHECK (total_amount = subtotal_amount + tax_amount + shipping_amount - discount_amount)'
    ],
    dataUpdates: [
      `UPDATE orders SET 
         subtotal_amount = total_amount,
         currency = 'BRL',
         payment_status = CASE 
           WHEN status = 'delivered' THEN 'paid'
           WHEN status = 'cancelled' THEN 'failed'
           ELSE 'pending'
         END
       WHERE subtotal_amount IS NULL`
    ]
  },
  
  order_items: {
    addColumns: [
      'ticket_id uuid REFERENCES tickets(id)',
      'size varchar(10)',
      'total_price numeric(10,2) NOT NULL DEFAULT 0',
      'discount_amount numeric(10,2) NOT NULL DEFAULT 0',
      'tax_amount numeric(10,2) NOT NULL DEFAULT 0'
    ],
    updateConstraints: [
      'ALTER TABLE order_items ALTER COLUMN order_id SET NOT NULL',
      'ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)',
      'ALTER TABLE order_items ADD CONSTRAINT order_items_price_positive CHECK (price >= 0)'
    ],
    dataUpdates: [
      `UPDATE order_items SET 
         total_price = quantity * price
       WHERE total_price = 0`
    ]
  },
  
  tickets: {
    addColumns: [
      'category varchar(50)',
      'event_date timestamptz',
      'event_location varchar(255)',
      'max_quantity integer DEFAULT 0',
      'available_quantity integer DEFAULT 0',
      'is_active boolean DEFAULT true',
      'created_at timestamptz DEFAULT now()',
      'updated_at timestamptz DEFAULT now()'
    ],
    updateConstraints: [
      'ALTER TABLE tickets ADD CONSTRAINT tickets_quantity_valid CHECK (available_quantity <= max_quantity)',
      'ALTER TABLE tickets ADD CONSTRAINT tickets_price_positive CHECK (price >= 0)'
    ],
    dataUpdates: [
      `UPDATE tickets SET 
         max_quantity = 100,
         available_quantity = 100,
         is_active = true
       WHERE max_quantity IS NULL`
    ]
  },
  
  profiles: {
    addColumns: [],
    updateConstraints: [
      'ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username)',
      'ALTER TABLE profiles ADD CONSTRAINT profiles_username_length CHECK (length(username) >= 3)'
    ],
    dataUpdates: []
  },
  
  rls_performance_metrics: {
    addColumns: [
      'policy_name varchar(100)'
    ],
    updateConstraints: [],
    dataUpdates: [
      `UPDATE rls_performance_metrics SET 
         policy_name = 'unknown'
       WHERE policy_name IS NULL`
    ]
  }
};

// Funções auxiliares
function generateOrderNumber() {
  return `
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS varchar(50) AS $$
BEGIN
    RETURN 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || 
           lpad(nextval('order_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
`;
}

function generateMigrationSQL() {
  let sql = `-- Migração automática de schema\n-- Gerado em: ${new Date().toISOString()}\n-- Origem: ${MIGRATION_CONFIG.sourceSchema}\n-- Destino: ${MIGRATION_CONFIG.targetSchema}\n\n`;
  
  // Adicionar funções auxiliares
  sql += generateOrderNumber();
  sql += '\n\n';
  
  // Processar cada tabela
  for (const [tableName, migration] of Object.entries(MIGRATIONS)) {
    sql += `-- ========================================\n`;
    sql += `-- Migração da tabela: ${tableName}\n`;
    sql += `-- ========================================\n\n`;
    
    // Adicionar colunas
    if (migration.addColumns.length > 0) {
      sql += `-- Adicionando colunas\n`;
      for (const column of migration.addColumns) {
        sql += `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${column};\n`;
      }
      sql += '\n';
    }
    
    // Atualizar constraints
    if (migration.updateConstraints.length > 0) {
      sql += `-- Atualizando constraints\n`;
      for (const constraint of migration.updateConstraints) {
        sql += `${constraint};\n`;
      }
      sql += '\n';
    }
    
    // Atualizar dados
    if (migration.dataUpdates.length > 0) {
      sql += `-- Atualizando dados\n`;
      for (const update of migration.dataUpdates) {
        sql += `${update};\n`;
      }
      sql += '\n';
    }
    
    sql += '\n';
  }
  
  // Adicionar validações finais
  sql += `-- ========================================\n`;
  sql += `-- Validações finais\n`;
  sql += `-- ========================================\n\n`;
  
  sql += `-- Atualizar estatísticas\n`;
  sql += `ANALYZE;\n\n`;
  
  sql += `-- Log de conclusão\n`;
  sql += `INSERT INTO migration_log (version, executed_at, status) \n`;
  sql += `VALUES ('${MIGRATION_CONFIG.timestamp}', now(), 'completed');\n`;
  
  return sql;
}

function createMigrationLogTable() {
  return `
-- Tabela de log de migrações
CREATE TABLE IF NOT EXISTS migration_log (
    id serial PRIMARY KEY,
    version varchar(100) NOT NULL,
    executed_at timestamptz DEFAULT now(),
    status varchar(20) DEFAULT 'pending',
    notes text
);
`;
}

function main() {
  console.log('🚀 Gerando scripts de migração...');
  
  // Criar diretório de saída se não existir
  const outputDir = path.join(__dirname, '..', 'migrations');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Gerar SQL de migração
  const migrationSQL = createMigrationLogTable() + '\n' + generateMigrationSQL();
  
  // Salvar arquivo
  const filename = `migration_${MIGRATION_CONFIG.timestamp}.sql`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, migrationSQL);
  
  // Criar link simbólico para o arquivo mais recente
  const latestPath = path.join(outputDir, 'latest_migration.sql');
  if (fs.existsSync(latestPath)) {
    fs.unlinkSync(latestPath);
  }
  fs.symlinkSync(filename, latestPath);
  
  console.log(`✅ Migration SQL gerado: ${filepath}`);
  console.log(`📊 Estatísticas:`);
  console.log(`   - Tabelas: ${Object.keys(MIGRATIONS).length}`);
  console.log(`   - Colunas adicionadas: ${Object.values(MIGRATIONS).reduce((acc, m) => acc + m.addColumns.length, 0)}`);
  console.log(`   - Constraints: ${Object.values(MIGRATIONS).reduce((acc, m) => acc + m.updateConstraints.length, 0)}`);
  console.log(`   - Updates de dados: ${Object.values(MIGRATIONS).reduce((acc, m) => acc + m.dataUpdates.length, 0)}`);
  
  return filepath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateMigrationSQL, MIGRATIONS, MIGRATION_CONFIG };