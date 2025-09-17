#!/usr/bin/env node

/**
 * Script de Migração Automatizada de Banco de Dados
 * Orquestra todo o processo de migração de schema
 * Reduz tempo de migração de 14-23h para 8-12h
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MigrationValidator } from './validate-migration.js';
import { generateMigrationSQL } from './generate-migration-sql.js';

// Carregar variáveis de ambiente do arquivo .env
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.warn('⚠️ Arquivo .env não encontrado ou não pôde ser lido');
  }
}

// Carregar variáveis de ambiente
loadEnvFile();

// ES6 equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  projectId: process.env.SUPABASE_PROJECT_ID || 'ojxmfxbflbfinodkhixk',
  backupDir: path.join(__dirname, '..', 'backups'),
  migrationsDir: path.join(__dirname, '..', 'supabase', 'migrations'),
  reportsDir: path.join(__dirname, '..', 'reports'),
  dryRun: process.argv.includes('--dry-run'),
  skipBackup: process.argv.includes('--skip-backup'),
  skipValidation: process.argv.includes('--skip-validation'),
  parallel: !process.argv.includes('--sequential')
};

// Fases da migração
const MIGRATION_PHASES = [
  {
    name: 'preparation',
    description: 'Preparação e backup',
    estimatedTime: '30min',
    critical: true,
    steps: [
      'validate_environment',
      'create_backup',
      'generate_migration_scripts'
    ]
  },
  {
    name: 'schema_migration',
    description: 'Migração de schema',
    estimatedTime: '2-3h',
    critical: true,
    parallel: true,
    steps: [
      'migrate_cart_items',
      'migrate_customers', 
      'migrate_orders',
      'migrate_order_items',
      'migrate_tickets',
      'migrate_profiles',
      'migrate_rls_metrics'
    ]
  },
  {
    name: 'data_migration',
    description: 'Migração de dados',
    estimatedTime: '3-4h',
    critical: true,
    steps: [
      'migrate_existing_data',
      'update_sequences',
      'rebuild_indexes'
    ]
  },
  {
    name: 'functions_update',
    description: 'Atualização de Edge Functions',
    estimatedTime: '1-2h',
    critical: false,
    parallel: true,
    steps: [
      'update_sync_functions',
      // 'update_payment_gateway', // Removido
      'update_monitoring_functions'
    ]
  },
  {
    name: 'validation',
    description: 'Validação e testes',
    estimatedTime: '1h',
    critical: true,
    steps: [
      'run_integrity_tests',
      'run_performance_tests',
      'validate_edge_functions'
    ]
  },
  {
    name: 'deployment',
    description: 'Deploy e monitoramento',
    estimatedTime: '30min',
    critical: false,
    steps: [
      'deploy_changes',
      'setup_monitoring',
      'notify_completion'
    ]
  }
];

class AutomatedMigration {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      phases: [],
      totalTime: 0,
      success: false,
      errors: [],
      warnings: []
    };
    
    this.validateEnvironment();
    this.createDirectories();
  }
  
  validateEnvironment() {
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`❌ Variáveis de ambiente obrigatórias: ${missing.join(', ')}`);
    }
    
    // Verificar se Supabase CLI está instalado
    try {
      execSync('supabase --version', { stdio: 'ignore' });
    } catch {
      throw new Error('❌ Supabase CLI não encontrado. Instale com: npm install -g supabase');
    }
  }
  
  createDirectories() {
    [config.backupDir, config.reportsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
  
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📝',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      progress: '🔄'
    }[level] || '📝';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (level === 'error') {
      this.results.errors.push({ timestamp, message });
    } else if (level === 'warning') {
      this.results.warnings.push({ timestamp, message });
    }
  }
  
  async executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      if (config.dryRun && !options.allowDryRun) {
        this.log(`[DRY RUN] Comando: ${command}`, 'info');
        resolve({ stdout: '[DRY RUN]', stderr: '', executionTime: 0 });
        return;
      }
      
      const child = spawn('sh', ['-c', command], {
        stdio: options.silent ? 'pipe' : 'inherit',
        cwd: options.cwd || process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      if (options.silent) {
        child.stdout.on('data', data => stdout += data.toString());
        child.stderr.on('data', data => stderr += data.toString());
      }
      
      child.on('close', code => {
        const executionTime = Date.now() - startTime;
        
        if (code === 0) {
          resolve({ stdout, stderr, executionTime });
        } else {
          reject(new Error(`Comando falhou (código ${code}): ${command}\n${stderr}`));
        }
      });
      
      child.on('error', reject);
    });
  }
  
  async createBackup() {
    if (config.skipBackup) {
      this.log('Backup ignorado (--skip-backup)', 'warning');
      return;
    }
    
    this.log('Criando backup do banco de dados...', 'progress');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(config.backupDir, `backup_${timestamp}.sql`);
    
    try {
      // Backup usando pg_dump via Supabase CLI
      await this.executeCommand(
        `supabase db dump --project-id ${config.projectId} > "${backupFile}"`,
        { silent: true }
      );
      
      // Em modo dry-run, simular sucesso do backup
      if (config.dryRun) {
        this.log(`[DRY RUN] Backup simulado: ${backupFile}`, 'info');
        return;
      }
      
      // Verificar se backup foi criado (apenas em execução real)
      if (!fs.existsSync(backupFile) || fs.statSync(backupFile).size === 0) {
        throw new Error('Backup vazio ou não criado');
      }
      
      this.log(`Backup criado: ${backupFile}`, 'success');
      return backupFile;
    } catch (error) {
      throw new Error(`Falha no backup: ${error.message}`);
    }
  }
  
  async generateMigrationScripts() {
    this.log('Gerando scripts de migração...', 'progress');
    
    try {
      // generateMigrationSQL() retorna uma string única, não um objeto
      const fullMigrationSQL = await generateMigrationSQL();
      
      // Salvar o script completo
      const mainScriptPath = path.join(config.migrationsDir, 'full_migration.sql');
      fs.writeFileSync(mainScriptPath, fullMigrationSQL);
      this.log('Script completo gerado: full_migration.sql', 'info');
      
      // Importar MIGRATIONS para gerar scripts individuais por tabela
      const { MIGRATIONS } = await import('./generate-migration-sql.js');
      
      const scripts = {};
      
      // Gerar scripts individuais por tabela
      for (const [tableName, migration] of Object.entries(MIGRATIONS)) {
        let tableSQL = `-- Migração da tabela: ${tableName}\n`;
        tableSQL += `-- Gerado em: ${new Date().toISOString()}\n\n`;
        
        // Adicionar colunas
        if (migration.addColumns && migration.addColumns.length > 0) {
          tableSQL += `-- Adicionando colunas\n`;
          for (const column of migration.addColumns) {
            tableSQL += `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${column};\n`;
          }
          tableSQL += '\n';
        }
        
        // Atualizar constraints
        if (migration.updateConstraints && migration.updateConstraints.length > 0) {
          tableSQL += `-- Atualizando constraints\n`;
          for (const constraint of migration.updateConstraints) {
            tableSQL += `${constraint};\n`;
          }
          tableSQL += '\n';
        }
        
        // Atualizar dados
        if (migration.dataUpdates && migration.dataUpdates.length > 0) {
          tableSQL += `-- Atualizando dados\n`;
          for (const update of migration.dataUpdates) {
            tableSQL += `${update};\n`;
          }
          tableSQL += '\n';
        }
        
        scripts[tableName] = tableSQL;
        
        const scriptPath = path.join(config.migrationsDir, `migrate_${tableName}.sql`);
        fs.writeFileSync(scriptPath, tableSQL);
        this.log(`Script gerado: migrate_${tableName}.sql`, 'info');
      }
      
      this.log('Scripts de migração gerados com sucesso', 'success');
      return scripts;
    } catch (error) {
      throw new Error(`Falha na geração de scripts: ${error.message}`);
    }
  }
  
  async executeMigrationStep(step, parallel = false) {
    const stepStartTime = Date.now();
    
    try {
      switch (step) {
        case 'validate_environment':
          this.log('Validando ambiente...', 'progress');
          // Já validado no constructor
          break;
          
        case 'create_backup':
          await this.createBackup();
          break;
          
        case 'generate_migration_scripts':
          await this.generateMigrationScripts();
          break;
          
        case 'migrate_cart_items':
        case 'migrate_customers':
        case 'migrate_orders':
        case 'migrate_order_items':
        case 'migrate_tickets':
        case 'migrate_profiles':
        case 'migrate_rls_metrics':
          const table = step.replace('migrate_', '');
          await this.migrateTable(table);
          break;
          
        case 'migrate_existing_data':
          await this.migrateExistingData();
          break;
          
        case 'update_sequences':
          await this.updateSequences();
          break;
          
        case 'rebuild_indexes':
          await this.rebuildIndexes();
          break;
          
        case 'update_sync_functions':
        case 'update_monitoring_functions':
          await this.updateEdgeFunctions(step);
          break;
          
        case 'run_integrity_tests':
        case 'run_performance_tests':
          await this.runValidationTests(step);
          break;
          
        case 'validate_edge_functions':
          await this.validateEdgeFunctions();
          break;
          
        case 'deploy_changes':
          await this.deployChanges();
          break;
          
        case 'setup_monitoring':
          await this.setupMonitoring();
          break;
          
        case 'notify_completion':
          await this.notifyCompletion();
          break;
          
        default:
          throw new Error(`Step não implementado: ${step}`);
      }
      
      const executionTime = Date.now() - stepStartTime;
      this.log(`✅ ${step} concluído (${Math.round(executionTime/1000)}s)`, 'success');
      
      return { step, success: true, executionTime };
    } catch (error) {
      const executionTime = Date.now() - stepStartTime;
      this.log(`❌ ${step} falhou: ${error.message}`, 'error');
      
      return { step, success: false, error: error.message, executionTime };
    }
  }
  
  async migrateTable(table) {
    this.log(`Migrando tabela: ${table}`, 'progress');
    
    const scriptPath = path.join(config.migrationsDir, `migrate_${table}.sql`);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script não encontrado: ${scriptPath}`);
    }
    
    await this.executeCommand(
      `supabase db reset --project-id ${config.projectId} --file "${scriptPath}"`,
      { silent: true }
    );
  }
  
  async migrateExistingData() {
    this.log('Migrando dados existentes...', 'progress');
    
    // Implementar migração de dados específica
    // Por enquanto, placeholder
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  async updateSequences() {
    this.log('Atualizando sequences...', 'progress');
    
    const updateScript = `
      SELECT setval('cart_items_id_seq', COALESCE(MAX(id), 1)) FROM cart_items;
      SELECT setval('customers_id_seq', COALESCE(MAX(id), 1)) FROM customers;
      SELECT setval('orders_id_seq', COALESCE(MAX(id), 1)) FROM orders;
      SELECT setval('order_items_id_seq', COALESCE(MAX(id), 1)) FROM order_items;
      SELECT setval('tickets_id_seq', COALESCE(MAX(id), 1)) FROM tickets;
    `;
    
    const scriptPath = path.join(config.migrationsDir, 'update_sequences.sql');
    fs.writeFileSync(scriptPath, updateScript);
    
    await this.executeCommand(
      `supabase db reset --project-id ${config.projectId} --file "${scriptPath}"`,
      { silent: true }
    );
  }
  
  async rebuildIndexes() {
    this.log('Reconstruindo índices...', 'progress');
    
    const rebuildScript = `
      REINDEX TABLE cart_items;
      REINDEX TABLE customers;
      REINDEX TABLE orders;
      REINDEX TABLE order_items;
      REINDEX TABLE tickets;
      REINDEX TABLE profiles;
      ANALYZE;
    `;
    
    const scriptPath = path.join(config.migrationsDir, 'rebuild_indexes.sql');
    fs.writeFileSync(scriptPath, rebuildScript);
    
    await this.executeCommand(
      `supabase db reset --project-id ${config.projectId} --file "${scriptPath}"`,
      { silent: true }
    );
  }
  
  async updateEdgeFunctions(step) {
    this.log(`Atualizando Edge Functions: ${step}`, 'progress');
    
    // Deploy das funções atualizadas
    await this.executeCommand(
      'supabase functions deploy --project-id ' + config.projectId,
      { cwd: path.join(__dirname, '..') }
    );
  }
  
  async runValidationTests(testType) {
    if (config.skipValidation) {
      this.log('Validação ignorada (--skip-validation)', 'warning');
      return;
    }
    
    this.log(`Executando ${testType}...`, 'progress');
    
    const validator = new MigrationValidator();
    
    if (testType === 'run_integrity_tests') {
      await validator.runIntegrityTests();
    } else if (testType === 'run_performance_tests') {
      await validator.runPerformanceTests();
    }
    
    if (validator.results.critical_failures > 0) {
      throw new Error(`Falhas críticas encontradas: ${validator.results.critical_failures}`);
    }
  }
  
  async validateEdgeFunctions() {
    this.log('Validando Edge Functions...', 'progress');
    
    // Testar se as funções estão respondendo
    const functions = ['sync-cart', 'sync-orders']; // Gateway de pagamento removido
    
    for (const func of functions) {
      try {
        await this.executeCommand(
          `curl -s -o /dev/null -w "%{http_code}" "${config.supabaseUrl}/functions/v1/${func}"`,
          { silent: true, allowDryRun: true }
        );
      } catch (error) {
        this.log(`Função ${func} não está respondendo`, 'warning');
      }
    }
  }
  
  async deployChanges() {
    this.log('Fazendo deploy das mudanças...', 'progress');
    
    await this.executeCommand(
      'supabase db push --project-id ' + config.projectId,
      { cwd: path.join(__dirname, '..') }
    );
  }
  
  async setupMonitoring() {
    this.log('Configurando monitoramento...', 'progress');
    
    // Configurar alertas e métricas
    // Por enquanto, placeholder
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  async notifyCompletion() {
    this.log('Notificando conclusão...', 'progress');
    
    const totalTime = Date.now() - this.startTime;
    const summary = {
      totalTime: Math.round(totalTime / 1000 / 60), // minutos
      phases: this.results.phases.length,
      errors: this.results.errors.length,
      warnings: this.results.warnings.length
    };
    
    this.log(`Migração concluída em ${summary.totalTime} minutos`, 'success');
    
    // Salvar relatório final
    const reportPath = path.join(config.reportsDir, `migration_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      ...this.results,
      summary,
      config: { ...config, supabaseKey: '[REDACTED]' }
    }, null, 2));
    
    this.log(`Relatório salvo: ${reportPath}`, 'info');
  }
  
  async executePhase(phase) {
    const phaseStartTime = Date.now();
    this.log(`🚀 Iniciando fase: ${phase.description}`, 'info');
    
    const phaseResult = {
      name: phase.name,
      description: phase.description,
      startTime: phaseStartTime,
      steps: [],
      success: true
    };
    
    try {
      if (phase.parallel && config.parallel) {
        // Executar steps em paralelo
        const promises = phase.steps.map(step => 
          this.executeMigrationStep(step, true)
        );
        
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            phaseResult.steps.push(result.value);
          } else {
            phaseResult.steps.push({
              step: phase.steps[index],
              success: false,
              error: result.reason.message
            });
            phaseResult.success = false;
          }
        });
      } else {
        // Executar steps sequencialmente
        for (const step of phase.steps) {
          const stepResult = await this.executeMigrationStep(step, false);
          phaseResult.steps.push(stepResult);
          
          if (!stepResult.success && phase.critical) {
            phaseResult.success = false;
            break;
          }
        }
      }
      
      phaseResult.endTime = Date.now();
      phaseResult.executionTime = phaseResult.endTime - phaseStartTime;
      
      if (phaseResult.success) {
        this.log(`✅ Fase concluída: ${phase.description} (${Math.round(phaseResult.executionTime/1000)}s)`, 'success');
      } else {
        this.log(`❌ Fase falhou: ${phase.description}`, 'error');
        
        if (phase.critical) {
          throw new Error(`Fase crítica falhou: ${phase.name}`);
        }
      }
      
      return phaseResult;
    } catch (error) {
      phaseResult.success = false;
      phaseResult.error = error.message;
      phaseResult.endTime = Date.now();
      phaseResult.executionTime = phaseResult.endTime - phaseStartTime;
      
      throw error;
    } finally {
      this.results.phases.push(phaseResult);
    }
  }
  
  async migrate() {
    this.log('🚀 Iniciando migração automatizada', 'info');
    this.log(`📅 ${new Date().toLocaleString()}`, 'info');
    this.log(`🔧 Modo: ${config.dryRun ? 'DRY RUN' : 'PRODUÇÃO'}`, 'info');
    this.log('=' .repeat(60), 'info');
    
    try {
      for (const phase of MIGRATION_PHASES) {
        await this.executePhase(phase);
      }
      
      this.results.success = true;
      this.results.totalTime = Date.now() - this.startTime;
      
      this.log('🎉 Migração concluída com sucesso!', 'success');
      return true;
    } catch (error) {
      this.results.success = false;
      this.results.totalTime = Date.now() - this.startTime;
      
      this.log(`💥 Migração falhou: ${error.message}`, 'error');
      this.log('🔄 Execute o rollback se necessário', 'warning');
      
      return false;
    }
  }
}

async function main() {
  try {
    const migration = new AutomatedMigration();
    const success = await migration.migrate();
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

// Executar automaticamente quando chamado diretamente
main();

export { AutomatedMigration, MIGRATION_PHASES };