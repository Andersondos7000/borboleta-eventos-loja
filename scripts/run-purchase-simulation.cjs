/**
 * Script de Execução - Simulação de Compras via MCP Playwright
 * Integra com o ecossistema MCP para executar testes automatizados
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
  mcpPlaywrightEnabled: process.env.MCP_PLAYWRIGHT_ENABLED === 'true',
  testScript: path.join(__dirname, '../tests/e2e/purchase-simulation.cjs'),
  logFile: path.join(__dirname, '../logs/purchase-simulation.log'),
  maxRetries: 3,
  retryDelay: 5000
};

class MCPPurchaseRunner {
  constructor() {
    this.attempts = 0;
    this.results = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    
    console.log(logMessage);
    
    // Salvar em arquivo de log
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
  }

  async checkMCPStatus() {
    this.log('🔍 Verificando status do MCP Playwright...');
    
    if (!CONFIG.mcpPlaywrightEnabled) {
      this.log('⚠️  MCP_PLAYWRIGHT_ENABLED não está definido como true', 'warn');
      return false;
    }
    
    try {
      // Verificar se o processo MCP está rodando
      const { exec } = require('child_process');
      
      return new Promise((resolve) => {
        exec('docker exec queren-app-1 ps aux | grep playwright', (error, stdout) => {
          if (error || !stdout.includes('playwright')) {
            this.log('❌ MCP Playwright não está rodando', 'error');
            resolve(false);
          } else {
            this.log('✅ MCP Playwright está ativo');
            resolve(true);
          }
        });
      });
    } catch (error) {
      this.log(`❌ Erro ao verificar MCP: ${error.message}`, 'error');
      return false;
    }
  }

  async runSimulation() {
    this.attempts++;
    this.log(`🚀 Iniciando simulação de compras (tentativa ${this.attempts}/${CONFIG.maxRetries})...`);
    
    return new Promise((resolve) => {
      // Executar o script de simulação dentro do container MCP
      const command = 'docker';
      const args = [
        'exec', '-i', 'queren-app-1',
        'bash', '-c',
        `cd /app && node tests/e2e/purchase-simulation.cjs`
      ];
      
      this.log(`📋 Comando: ${command} ${args.join(' ')}`);
      
      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        this.log(`[STDOUT] ${output.trim()}`);
      });
      
      process.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        this.log(`[STDERR] ${output.trim()}`, 'error');
      });
      
      process.on('close', (code) => {
        const result = {
          attempt: this.attempts,
          exitCode: code,
          stdout,
          stderr,
          timestamp: new Date().toISOString(),
          success: code === 0
        };
        
        this.results.push(result);
        
        if (code === 0) {
          this.log('✅ Simulação concluída com sucesso!');
        } else {
          this.log(`❌ Simulação falhou com código de saída: ${code}`, 'error');
        }
        
        resolve(result);
      });
      
      process.on('error', (error) => {
        this.log(`💥 Erro ao executar simulação: ${error.message}`, 'error');
        resolve({
          attempt: this.attempts,
          exitCode: -1,
          stdout: '',
          stderr: error.message,
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message
        });
      });
    });
  }

  async runWithRetries() {
    this.log('🎯 Iniciando execução com retry automático...');
    
    // Verificar MCP primeiro
    const mcpReady = await this.checkMCPStatus();
    if (!mcpReady) {
      this.log('🔧 MCP Playwright não está pronto. Verifique a configuração.', 'warn');
    }
    
    let lastResult = null;
    
    for (let i = 0; i < CONFIG.maxRetries; i++) {
      lastResult = await this.runSimulation();
      
      if (lastResult.success) {
        this.log('🎉 Simulação bem-sucedida!');
        break;
      }
      
      if (i < CONFIG.maxRetries - 1) {
        this.log(`⏳ Aguardando ${CONFIG.retryDelay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      }
    }
    
    return lastResult;
  }

  async generateSummaryReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalDuration: `${totalDuration}ms`,
      totalAttempts: this.attempts,
      maxRetries: CONFIG.maxRetries,
      mcpEnabled: CONFIG.mcpPlaywrightEnabled,
      results: this.results,
      finalSuccess: this.results.some(r => r.success),
      errors: this.results.filter(r => !r.success).map(r => ({
        attempt: r.attempt,
        error: r.stderr || r.error,
        exitCode: r.exitCode
      }))
    };
    
    // Salvar relatório
    const reportFile = path.join(__dirname, '../reports', `mcp-purchase-simulation-${Date.now()}.json`);
    const reportDir = path.dirname(reportFile);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2));
    
    // Log do resumo
    this.log('\n📊 RESUMO FINAL DA SIMULAÇÃO:');
    this.log('================================');
    this.log(`⏱️  Duração total: ${totalDuration}ms`);
    this.log(`🔄 Tentativas realizadas: ${this.attempts}/${CONFIG.maxRetries}`);
    this.log(`🎯 Sucesso final: ${summary.finalSuccess ? 'SIM' : 'NÃO'}`);
    this.log(`🔧 MCP Playwright: ${CONFIG.mcpPlaywrightEnabled ? 'HABILITADO' : 'DESABILITADO'}`);
    
    if (summary.errors.length > 0) {
      this.log('\n❌ ERROS ENCONTRADOS:');
      summary.errors.forEach((error, index) => {
        this.log(`${index + 1}. Tentativa ${error.attempt}: ${error.error}`);
      });
    }
    
    this.log(`\n📄 Relatório completo salvo em: ${reportFile}`);
    
    return summary;
  }

  async run() {
    try {
      this.log('🚀 Iniciando MCP Purchase Runner...');
      
      const result = await this.runWithRetries();
      const summary = await this.generateSummaryReport();
      
      return {
        success: summary.finalSuccess,
        summary,
        lastResult: result
      };
    } catch (error) {
      this.log(`💥 Erro crítico no runner: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Função de análise de falhas
function analyzePurchaseFailures(results) {
  const failures = results.filter(r => !r.success);
  
  if (failures.length === 0) {
    return { hasFailures: false, analysis: 'Nenhuma falha detectada.' };
  }
  
  const analysis = {
    hasFailures: true,
    totalFailures: failures.length,
    commonErrors: {},
    recommendations: []
  };
  
  // Analisar erros comuns
  failures.forEach(failure => {
    const errorText = failure.stderr || failure.error || 'Erro desconhecido';
    
    // Categorizar erros
    if (errorText.includes('timeout') || errorText.includes('TIMEOUT')) {
      analysis.commonErrors.timeout = (analysis.commonErrors.timeout || 0) + 1;
    }
    if (errorText.includes('network') || errorText.includes('NETWORK')) {
      analysis.commonErrors.network = (analysis.commonErrors.network || 0) + 1;
    }
    if (errorText.includes('element') || errorText.includes('selector')) {
      analysis.commonErrors.selector = (analysis.commonErrors.selector || 0) + 1;
    }
    if (errorText.includes('validation') || errorText.includes('invalid')) {
      analysis.commonErrors.validation = (analysis.commonErrors.validation || 0) + 1;
    }
  });
  
  // Gerar recomendações
  if (analysis.commonErrors.timeout) {
    analysis.recommendations.push('Aumentar timeouts ou verificar performance da aplicação');
  }
  if (analysis.commonErrors.network) {
    analysis.recommendations.push('Verificar conectividade e APIs externas (Supabase, AbacatePay)');
  }
  if (analysis.commonErrors.selector) {
    analysis.recommendations.push('Atualizar seletores CSS ou verificar mudanças na UI');
  }
  if (analysis.commonErrors.validation) {
    analysis.recommendations.push('Revisar validações de formulário e dados de teste');
  }
  
  return analysis;
}

// Executar se chamado diretamente
if (require.main === module) {
  (async () => {
    const runner = new MCPPurchaseRunner();
    
    try {
      const result = await runner.run();
      
      // Análise de falhas
      const failureAnalysis = analyzePurchaseFailures(runner.results);
      
      if (failureAnalysis.hasFailures) {
        console.log('\n🔍 ANÁLISE DE FALHAS:');
        console.log('====================');
        console.log(`Total de falhas: ${failureAnalysis.totalFailures}`);
        console.log('Erros comuns:', failureAnalysis.commonErrors);
        console.log('Recomendações:');
        failureAnalysis.recommendations.forEach((rec, i) => {
          console.log(`${i + 1}. ${rec}`);
        });
      }
      
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('💥 Falha crítica:', error);
      process.exit(1);
    }
  })();
}

module.exports = { MCPPurchaseRunner, analyzePurchaseFailures };