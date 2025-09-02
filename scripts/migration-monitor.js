#!/usr/bin/env node

/**
 * Monitor de Migração em Tempo Real
 * 
 * Este script monitora o progresso da migração de banco de dados em tempo real,
 * fornecendo métricas de performance e alertas automáticos.
 * 
 * Uso:
 *   node scripts/migration-monitor.js --migration-id <id> [--interval 5000]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuração
const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  monitorInterval: parseInt(process.argv.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 5000,
  migrationId: process.argv.find(arg => arg.startsWith('--migration-id='))?.split('=')[1],
  alertThresholds: {
    queryTime: 30000, // 30 segundos
    errorRate: 0.05,  // 5%
    memoryUsage: 0.8  // 80%
  }
};

// Cliente Supabase
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

// Estado do monitor
const monitorState = {
  startTime: Date.now(),
  metrics: {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    avgQueryTime: 0,
    maxQueryTime: 0,
    minQueryTime: Infinity
  },
  tables: {
    cart_items: { status: 'pending', progress: 0, errors: [] },
    customers: { status: 'pending', progress: 0, errors: [] },
    orders: { status: 'pending', progress: 0, errors: [] },
    order_items: { status: 'pending', progress: 0, errors: [] },
    tickets: { status: 'pending', progress: 0, errors: [] },
    profiles: { status: 'pending', progress: 0, errors: [] },
    rls_performance_metrics: { status: 'pending', progress: 0, errors: [] }
  },
  alerts: []
};

/**
 * Classe principal do monitor
 */
class MigrationMonitor {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.logFile = path.join(__dirname, '..', 'logs', `migration-monitor-${config.migrationId || Date.now()}.log`);
    
    // Criar diretório de logs se não existir
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Inicia o monitoramento
   */
  async start() {
    console.log('🔍 Iniciando monitor de migração...');
    console.log(`📊 Intervalo: ${config.monitorInterval}ms`);
    console.log(`📝 Log: ${this.logFile}`);
    console.log('━'.repeat(60));

    this.isRunning = true;
    this.logEvent('MONITOR_START', 'Monitor de migração iniciado');

    // Verificar conectividade inicial
    await this.checkConnectivity();

    // Iniciar loop de monitoramento
    this.intervalId = setInterval(() => {
      this.monitorCycle();
    }, config.monitorInterval);

    // Handlers para encerramento gracioso
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    // Primeira execução imediata
    await this.monitorCycle();
  }

  /**
   * Para o monitoramento
   */
  stop() {
    console.log('\n🛑 Parando monitor...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.logEvent('MONITOR_STOP', 'Monitor de migração parado');
    this.generateFinalReport();
    process.exit(0);
  }

  /**
   * Ciclo de monitoramento
   */
  async monitorCycle() {
    try {
      const startTime = performance.now();

      // Coletar métricas
      await Promise.all([
        this.checkTableStatus(),
        this.checkPerformanceMetrics(),
        this.checkSystemHealth(),
        this.checkMigrationProgress()
      ]);

      const cycleTime = performance.now() - startTime;
      this.updateMetrics('monitor_cycle', cycleTime, true);

      // Exibir status
      this.displayStatus();

      // Verificar alertas
      this.checkAlerts();

    } catch (error) {
      console.error('❌ Erro no ciclo de monitoramento:', error.message);
      this.logEvent('MONITOR_ERROR', error.message, { error: error.stack });
    }
  }

  /**
   * Verifica conectividade com o banco
   */
  async checkConnectivity() {
    try {
      const startTime = performance.now();
      const { data, error } = await supabase.rpc('execute_sql', {
        query: 'SELECT 1 as test'
      });

      const queryTime = performance.now() - startTime;
      
      if (error) {
        throw new Error(`Falha na conectividade: ${error.message}`);
      }

      this.updateMetrics('connectivity_check', queryTime, true);
      console.log('✅ Conectividade verificada');
      
    } catch (error) {
      console.error('❌ Falha na conectividade:', error.message);
      this.addAlert('CONNECTIVITY_FAILED', error.message, 'critical');
      throw error;
    }
  }

  /**
   * Verifica status das tabelas
   */
  async checkTableStatus() {
    for (const tableName of Object.keys(monitorState.tables)) {
      try {
        const startTime = performance.now();
        
        // Verificar se tabela existe
        const { data: tableExists, error: tableError } = await supabase.rpc('execute_sql', {
          query: `
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_name = '${tableName}'
            ) as exists
          `
        });

        const queryTime = performance.now() - startTime;
        this.updateMetrics(`table_check_${tableName}`, queryTime, !tableError);

        if (tableError) {
          monitorState.tables[tableName].status = 'error';
          monitorState.tables[tableName].errors.push(tableError.message);
          continue;
        }

        const exists = tableExists[0]?.exists;
        
        if (exists) {
          // Verificar contagem de registros
          const { data: countData, error: countError } = await supabase.rpc('execute_sql', {
            query: `SELECT COUNT(*) as count FROM ${tableName}`
          });

          if (!countError) {
            const count = countData[0]?.count || 0;
            monitorState.tables[tableName].status = count > 0 ? 'completed' : 'empty';
            monitorState.tables[tableName].progress = 100;
          }
        } else {
          monitorState.tables[tableName].status = 'missing';
          monitorState.tables[tableName].progress = 0;
        }

      } catch (error) {
        monitorState.tables[tableName].status = 'error';
        monitorState.tables[tableName].errors.push(error.message);
      }
    }
  }

  /**
   * Verifica métricas de performance
   */
  async checkPerformanceMetrics() {
    try {
      const startTime = performance.now();
      
      // Query de teste de performance
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes
          FROM pg_stat_user_tables 
          WHERE schemaname = 'public'
          ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
          LIMIT 10
        `
      });

      const queryTime = performance.now() - startTime;
      this.updateMetrics('performance_check', queryTime, !error);

      if (error) {
        this.addAlert('PERFORMANCE_CHECK_FAILED', error.message, 'warning');
        return;
      }

      // Verificar se há atividade suspeita
      const highActivity = data.filter(table => 
        (table.inserts + table.updates + table.deletes) > 10000
      );

      if (highActivity.length > 0) {
        this.addAlert('HIGH_DB_ACTIVITY', 
          `Atividade alta detectada: ${highActivity.map(t => t.tablename).join(', ')}`, 
          'info'
        );
      }

    } catch (error) {
      this.addAlert('PERFORMANCE_CHECK_ERROR', error.message, 'warning');
    }
  }

  /**
   * Verifica saúde do sistema
   */
  async checkSystemHealth() {
    try {
      // Verificar uso de memória do processo
      const memUsage = process.memoryUsage();
      const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

      if (memUsagePercent > config.alertThresholds.memoryUsage) {
        this.addAlert('HIGH_MEMORY_USAGE', 
          `Uso de memória alto: ${(memUsagePercent * 100).toFixed(1)}%`, 
          'warning'
        );
      }

      // Verificar conexões ativas
      const { data: connections, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT count(*) as active_connections
          FROM pg_stat_activity 
          WHERE state = 'active'
        `
      });

      if (!error) {
        const activeConnections = connections[0]?.active_connections || 0;
        
        if (activeConnections > 50) {
          this.addAlert('HIGH_CONNECTION_COUNT', 
            `Muitas conexões ativas: ${activeConnections}`, 
            'warning'
          );
        }
      }

    } catch (error) {
      this.addAlert('SYSTEM_HEALTH_CHECK_ERROR', error.message, 'warning');
    }
  }

  /**
   * Verifica progresso da migração
   */
  async checkMigrationProgress() {
    try {
      // Verificar logs de migração se existirem
      const { data: migrationLogs, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT * FROM migration_log 
          WHERE migration_id = '${config.migrationId}'
          ORDER BY created_at DESC
          LIMIT 10
        `
      }).catch(() => ({ data: null, error: 'Tabela migration_log não existe' }));

      if (!error && migrationLogs) {
        const latestLog = migrationLogs[0];
        if (latestLog) {
          console.log(`📋 Último log: ${latestLog.message} (${latestLog.created_at})`);
        }
      }

    } catch (error) {
      // Ignorar erros de progresso - tabela pode não existir ainda
    }
  }

  /**
   * Atualiza métricas
   */
  updateMetrics(operation, queryTime, success) {
    monitorState.metrics.totalQueries++;
    
    if (success) {
      monitorState.metrics.successfulQueries++;
    } else {
      monitorState.metrics.failedQueries++;
    }

    // Atualizar tempos de query
    if (queryTime > monitorState.metrics.maxQueryTime) {
      monitorState.metrics.maxQueryTime = queryTime;
    }
    
    if (queryTime < monitorState.metrics.minQueryTime) {
      monitorState.metrics.minQueryTime = queryTime;
    }

    // Calcular média móvel
    const totalTime = (monitorState.metrics.avgQueryTime * (monitorState.metrics.totalQueries - 1)) + queryTime;
    monitorState.metrics.avgQueryTime = totalTime / monitorState.metrics.totalQueries;

    // Verificar threshold de tempo
    if (queryTime > config.alertThresholds.queryTime) {
      this.addAlert('SLOW_QUERY', 
        `Query lenta detectada: ${operation} (${queryTime.toFixed(2)}ms)`, 
        'warning'
      );
    }
  }

  /**
   * Adiciona alerta
   */
  addAlert(type, message, severity = 'info') {
    const alert = {
      type,
      message,
      severity,
      timestamp: new Date().toISOString()
    };

    monitorState.alerts.push(alert);
    this.logEvent('ALERT', message, { type, severity });

    // Manter apenas os últimos 50 alertas
    if (monitorState.alerts.length > 50) {
      monitorState.alerts = monitorState.alerts.slice(-50);
    }
  }

  /**
   * Verifica e exibe alertas
   */
  checkAlerts() {
    const recentAlerts = monitorState.alerts.filter(alert => 
      Date.now() - new Date(alert.timestamp).getTime() < 60000 // Últimos 60 segundos
    );

    if (recentAlerts.length > 0) {
      console.log('\n🚨 Alertas Recentes:');
      recentAlerts.forEach(alert => {
        const icon = {
          critical: '🔴',
          warning: '🟡',
          info: '🔵'
        }[alert.severity] || '⚪';
        
        console.log(`${icon} ${alert.message}`);
      });
    }
  }

  /**
   * Exibe status atual
   */
  displayStatus() {
    const runtime = Math.floor((Date.now() - monitorState.startTime) / 1000);
    const errorRate = monitorState.metrics.totalQueries > 0 
      ? (monitorState.metrics.failedQueries / monitorState.metrics.totalQueries) * 100 
      : 0;

    // Limpar tela (opcional)
    // console.clear();

    console.log('\n📊 Status da Migração');
    console.log('━'.repeat(60));
    console.log(`⏱️  Runtime: ${runtime}s`);
    console.log(`📈 Queries: ${monitorState.metrics.totalQueries} (${monitorState.metrics.successfulQueries} ✅, ${monitorState.metrics.failedQueries} ❌)`);
    console.log(`📊 Taxa de erro: ${errorRate.toFixed(2)}%`);
    console.log(`⚡ Tempo médio: ${monitorState.metrics.avgQueryTime.toFixed(2)}ms`);
    console.log(`🐌 Tempo máximo: ${monitorState.metrics.maxQueryTime.toFixed(2)}ms`);

    console.log('\n📋 Status das Tabelas:');
    Object.entries(monitorState.tables).forEach(([table, status]) => {
      const icon = {
        pending: '⏳',
        completed: '✅',
        error: '❌',
        missing: '❓',
        empty: '📭'
      }[status.status] || '❓';
      
      console.log(`${icon} ${table.padEnd(25)} ${status.status.toUpperCase()}`);
      
      if (status.errors.length > 0) {
        console.log(`    └─ Erros: ${status.errors.slice(-1)[0]}`);
      }
    });

    // Verificar se migração está completa
    const completedTables = Object.values(monitorState.tables).filter(t => t.status === 'completed').length;
    const totalTables = Object.keys(monitorState.tables).length;
    const progress = (completedTables / totalTables) * 100;

    console.log(`\n🎯 Progresso Geral: ${progress.toFixed(1)}% (${completedTables}/${totalTables} tabelas)`);
    
    if (progress === 100) {
      console.log('\n🎉 MIGRAÇÃO CONCLUÍDA! 🎉');
      setTimeout(() => this.stop(), 5000); // Para automaticamente após 5 segundos
    }
  }

  /**
   * Registra evento no log
   */
  logEvent(type, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      metadata,
      migrationId: config.migrationId
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('❌ Erro ao escrever log:', error.message);
    }
  }

  /**
   * Gera relatório final
   */
  generateFinalReport() {
    const runtime = Math.floor((Date.now() - monitorState.startTime) / 1000);
    const reportPath = path.join(__dirname, '..', 'reports', `migration-report-${config.migrationId || Date.now()}.json`);
    
    const report = {
      migrationId: config.migrationId,
      startTime: new Date(monitorState.startTime).toISOString(),
      endTime: new Date().toISOString(),
      runtime: runtime,
      metrics: monitorState.metrics,
      tables: monitorState.tables,
      alerts: monitorState.alerts,
      summary: {
        totalTables: Object.keys(monitorState.tables).length,
        completedTables: Object.values(monitorState.tables).filter(t => t.status === 'completed').length,
        errorTables: Object.values(monitorState.tables).filter(t => t.status === 'error').length,
        totalAlerts: monitorState.alerts.length,
        criticalAlerts: monitorState.alerts.filter(a => a.severity === 'critical').length
      }
    };

    // Criar diretório de relatórios se não existir
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Relatório final salvo: ${reportPath}`);
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error.message);
    }
  }
}

// Validar argumentos
if (!config.supabaseUrl || !config.supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

if (!config.migrationId) {
  console.warn('⚠️  Migration ID não fornecido. Usando timestamp atual.');
  config.migrationId = Date.now().toString();
}

// Iniciar monitor
const monitor = new MigrationMonitor();
monitor.start().catch(error => {
  console.error('❌ Erro fatal no monitor:', error.message);
  process.exit(1);
});

// Exportar para testes
module.exports = { MigrationMonitor, monitorState };