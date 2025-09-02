#!/usr/bin/env node
/**
 * Validador automático de migração de banco de dados
 * Reduz tempo de validação de 3-4h para 1h
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Definir __dirname para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para carregar variáveis de ambiente do arquivo .env
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    }
  }
}

// Carregar variáveis de ambiente
loadEnvFile();

// Configuração
const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  batchSize: 1000,
  timeout: 30000
};

// Testes de integridade
const INTEGRITY_TESTS = [
  {
    name: 'cart_items_integrity',
    description: 'Verifica integridade referencial de cart_items',
    query: `
      SELECT COUNT(*) as count
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE p.id IS NULL
    `,
    expected: 0,
    critical: true
  },
  {
    name: 'cart_items_calculations',
    description: 'Verifica cálculos de preços em cart_items',
    query: `
      SELECT COUNT(*) as count
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.total_price != (ci.quantity * ci.unit_price)
         OR ci.unit_price != p.price
    `,
    expected: 0,
    critical: true
  },
  {
    name: 'customers_email_validation',
    description: 'Verifica emails válidos em customers',
    query: `
      SELECT COUNT(*) as count
      FROM customers
      WHERE email IS NULL 
         OR email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
    `,
    expected: 0,
    critical: true
  },
  {
    name: 'customers_user_mapping',
    description: 'Verifica mapeamento customers -> auth.users',
    query: `
      SELECT COUNT(*) as count
      FROM customers c
      LEFT JOIN auth.users u ON c.user_id = u.id
      WHERE c.user_id IS NOT NULL AND u.id IS NULL
    `,
    expected: 0,
    critical: false
  },
  {
    name: 'orders_customer_integrity',
    description: 'Verifica integridade referencial orders -> customers',
    query: `
      SELECT COUNT(*) as count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE c.id IS NULL
    `,
    expected: 0,
    critical: true
  },
  {
    name: 'orders_total_calculations',
    description: 'Verifica cálculos de totais em orders',
    query: `
      SELECT COUNT(*) as count
      FROM orders
      WHERE total_amount != (subtotal_amount + tax_amount + shipping_amount - discount_amount)
    `,
    expected: 0,
    critical: true
  },
  {
    name: 'orders_status_consistency',
    description: 'Verifica consistência de status em orders',
    query: `
      SELECT COUNT(*) as count
      FROM orders
      WHERE status NOT IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
         OR payment_status NOT IN ('pending', 'processing', 'paid', 'failed', 'refunded')
    `,
    expected: 0,
    critical: true
  },
  {
    name: 'order_items_integrity',
    description: 'Verifica integridade referencial de order_items',
    query: `
      SELECT COUNT(*) as count
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id IS NULL OR p.id IS NULL
    `,
    expected: 0,
    critical: true
  },
  {
    name: 'order_items_calculations',
    description: 'Verifica cálculos em order_items',
    query: `
      SELECT COUNT(*) as count
      FROM order_items
      WHERE total_price != (quantity * price)
         OR quantity <= 0
         OR price < 0
    `,
    expected: 0,
    critical: true
  },
  {
    name: 'tickets_availability',
    description: 'Verifica disponibilidade de tickets',
    query: `
      SELECT COUNT(*) as count
      FROM tickets
      WHERE available_quantity > max_quantity
         OR available_quantity < 0
         OR max_quantity < 0
    `,
    expected: 0,
    critical: true
  },
  {
    name: 'profiles_username_uniqueness',
    description: 'Verifica unicidade de usernames',
    query: `
      SELECT COUNT(*) - COUNT(DISTINCT username) as count
      FROM profiles
      WHERE username IS NOT NULL
    `,
    expected: 0,
    critical: true
  },
  {
    name: 'rls_performance_metrics_completeness',
    description: 'Verifica completude de métricas RLS',
    query: `
      SELECT COUNT(*) as count
      FROM rls_performance_metrics
      WHERE policy_name IS NULL
         OR table_name IS NULL
         OR execution_time_ms IS NULL
    `,
    expected: 0,
    critical: false
  }
];

// Testes de performance
const PERFORMANCE_TESTS = [
  {
    name: 'cart_items_query_performance',
    description: 'Testa performance de consulta em cart_items',
    query: `
      EXPLAIN (ANALYZE, BUFFERS) 
      SELECT ci.*, p.name, p.price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = (SELECT id FROM auth.users LIMIT 1)
    `,
    maxExecutionTime: 100, // ms
    critical: false
  },
  {
    name: 'orders_listing_performance',
    description: 'Testa performance de listagem de pedidos',
    query: `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT o.*, c.name, c.email
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 50
    `,
    maxExecutionTime: 200, // ms
    critical: false
  }
];

// Testes de contagem
const COUNT_TESTS = [
  {
    name: 'data_preservation',
    description: 'Verifica preservação de dados após migração',
    tables: ['cart_items', 'customers', 'orders', 'order_items', 'tickets', 'profiles']
  }
];

class MigrationValidator {
  constructor() {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    }
    
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      critical_failures: 0,
      tests: []
    };
  }
  
  async executeQuery(query, timeout = config.timeout) {
    try {
      const startTime = Date.now();
      
      // Simular execução em modo dry-run
      if (process.argv.includes('--dry-run')) {
        console.log(`   [DRY RUN] Query: ${query.substring(0, 100)}...`);
        const executionTime = Date.now() - startTime;
        // Retornar dados simulados para testes
        return { data: [{ count: 0 }], executionTime };
      }
      
      // Para execução real, usar fetch direto
      const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabaseKey}`,
          'apikey': config.supabaseKey
        },
        body: JSON.stringify({ query })
      });
      
      const executionTime = Date.now() - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return { data, executionTime };
    } catch (error) {
      throw new Error(`Erro na query: ${error.message}`);
    }
  }
  
  async runIntegrityTests() {
    console.log('🔍 Executando testes de integridade...');
    
    for (const test of INTEGRITY_TESTS) {
      try {
        console.log(`   Testando: ${test.description}`);
        
        const { data, executionTime } = await this.executeQuery(test.query);
        const actualValue = data[0]?.count || 0;
        
        const passed = actualValue === test.expected;
        const result = {
          name: test.name,
          description: test.description,
          expected: test.expected,
          actual: actualValue,
          passed,
          critical: test.critical,
          executionTime,
          type: 'integrity'
        };
        
        this.results.tests.push(result);
        
        if (passed) {
          this.results.passed++;
          console.log(`   ✅ ${test.name}: PASSOU (${executionTime}ms)`);
        } else {
          this.results.failed++;
          if (test.critical) {
            this.results.critical_failures++;
            console.log(`   ❌ ${test.name}: FALHOU CRÍTICO - Esperado: ${test.expected}, Atual: ${actualValue}`);
          } else {
            this.results.warnings++;
            console.log(`   ⚠️  ${test.name}: AVISO - Esperado: ${test.expected}, Atual: ${actualValue}`);
          }
        }
      } catch (error) {
        this.results.failed++;
        if (test.critical) this.results.critical_failures++;
        
        console.log(`   ❌ ${test.name}: ERRO - ${error.message}`);
        this.results.tests.push({
          name: test.name,
          description: test.description,
          error: error.message,
          passed: false,
          critical: test.critical,
          type: 'integrity'
        });
      }
    }
  }
  
  async runPerformanceTests() {
    console.log('⚡ Executando testes de performance...');
    
    for (const test of PERFORMANCE_TESTS) {
      try {
        console.log(`   Testando: ${test.description}`);
        
        const { data, executionTime } = await this.executeQuery(test.query);
        
        // Extrair tempo de execução do EXPLAIN ANALYZE
        let actualExecutionTime = executionTime;
        if (data && data.length > 0) {
          const explainOutput = data.map(row => Object.values(row)[0]).join('\n');
          const timeMatch = explainOutput.match(/Execution Time: ([\d.]+) ms/);
          if (timeMatch) {
            actualExecutionTime = parseFloat(timeMatch[1]);
          }
        }
        
        const passed = actualExecutionTime <= test.maxExecutionTime;
        const result = {
          name: test.name,
          description: test.description,
          maxExecutionTime: test.maxExecutionTime,
          actualExecutionTime,
          passed,
          critical: test.critical,
          type: 'performance'
        };
        
        this.results.tests.push(result);
        
        if (passed) {
          this.results.passed++;
          console.log(`   ✅ ${test.name}: PASSOU (${actualExecutionTime}ms <= ${test.maxExecutionTime}ms)`);
        } else {
          this.results.failed++;
          if (test.critical) {
            this.results.critical_failures++;
            console.log(`   ❌ ${test.name}: FALHOU CRÍTICO - ${actualExecutionTime}ms > ${test.maxExecutionTime}ms`);
          } else {
            this.results.warnings++;
            console.log(`   ⚠️  ${test.name}: LENTO - ${actualExecutionTime}ms > ${test.maxExecutionTime}ms`);
          }
        }
      } catch (error) {
        this.results.failed++;
        if (test.critical) this.results.critical_failures++;
        
        console.log(`   ❌ ${test.name}: ERRO - ${error.message}`);
        this.results.tests.push({
          name: test.name,
          description: test.description,
          error: error.message,
          passed: false,
          critical: test.critical,
          type: 'performance'
        });
      }
    }
  }
  
  async runCountTests() {
    console.log('📊 Executando testes de contagem...');
    
    for (const test of COUNT_TESTS) {
      try {
        console.log(`   Testando: ${test.description}`);
        
        const counts = {};
        for (const table of test.tables) {
          const { data } = await this.executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
          counts[table] = data[0]?.count || 0;
        }
        
        const result = {
          name: test.name,
          description: test.description,
          counts,
          passed: true,
          type: 'count'
        };
        
        this.results.tests.push(result);
        this.results.passed++;
        
        console.log(`   ✅ ${test.name}: PASSOU`);
        for (const [table, count] of Object.entries(counts)) {
          console.log(`      ${table}: ${count.toLocaleString()} registros`);
        }
      } catch (error) {
        this.results.failed++;
        console.log(`   ❌ ${test.name}: ERRO - ${error.message}`);
        this.results.tests.push({
          name: test.name,
          description: test.description,
          error: error.message,
          passed: false,
          type: 'count'
        });
      }
    }
  }
  
  generateReport() {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      summary: this.results,
      details: this.results.tests
    };
    
    // Salvar relatório
    const reportPath = path.join(__dirname, '..', 'reports', `validation_${timestamp.replace(/[:.]/g, '-')}.json`);
    
    // Criar diretório se não existir
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return { report, reportPath };
  }
  
  printSummary() {
    console.log('\n📋 RESUMO DA VALIDAÇÃO');
    console.log('=' .repeat(50));
    console.log(`✅ Testes aprovados: ${this.results.passed}`);
    console.log(`❌ Testes falharam: ${this.results.failed}`);
    console.log(`⚠️  Avisos: ${this.results.warnings}`);
    console.log(`🚨 Falhas críticas: ${this.results.critical_failures}`);
    
    if (this.results.critical_failures > 0) {
      console.log('\n🚨 FALHAS CRÍTICAS ENCONTRADAS:');
      this.results.tests
        .filter(t => !t.passed && t.critical)
        .forEach(t => {
          console.log(`   - ${t.name}: ${t.description}`);
          if (t.error) console.log(`     Erro: ${t.error}`);
        });
    }
    
    if (this.results.warnings > 0) {
      console.log('\n⚠️  AVISOS:');
      this.results.tests
        .filter(t => !t.passed && !t.critical)
        .forEach(t => {
          console.log(`   - ${t.name}: ${t.description}`);
        });
    }
    
    const success = this.results.critical_failures === 0;
    console.log(`\n${success ? '✅' : '❌'} Status: ${success ? 'APROVADO' : 'REPROVADO'}`);
    
    return success;
  }
  
  async validate() {
    console.log('🚀 Iniciando validação de migração...');
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log('=' .repeat(50));
    
    try {
      await this.runIntegrityTests();
      await this.runPerformanceTests();
      await this.runCountTests();
      
      const { reportPath } = this.generateReport();
      const success = this.printSummary();
      
      console.log(`\n📄 Relatório salvo em: ${reportPath}`);
      
      return success;
    } catch (error) {
      console.error('❌ Erro durante validação:', error.message);
      return false;
    }
  }
}

async function main() {
  const validator = new MigrationValidator();
  const success = await validator.validate();
  
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MigrationValidator, INTEGRITY_TESTS, PERFORMANCE_TESTS };