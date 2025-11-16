/**
 * Configuração de Alertas Automáticos
 * 
 * Este script configura alertas automáticos para detecção de duplicatas
 * e pode ser executado via cron job ou task scheduler
 */

import 'dotenv/config';
import { runMonitoring, MONITORING_CONFIG } from './monitor-duplicatas.js';
import fs from 'fs';
import path from 'path';

// Configurações de alerta
const ALERT_CONFIG = {
  // Email de notificação (configurar com seu provedor de email)
  EMAIL_ENABLED: false,
  EMAIL_TO: process.env.ALERT_EMAIL || 'admin@exemplo.com',
  
  // Webhook para Slack/Discord (opcional)
  WEBHOOK_ENABLED: false,
  WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL,
  
  // Log de alertas
  ALERT_LOG_FILE: './monitoring/alerts.log',
  
  // Configurações de frequência
  SCHEDULE: {
    DAILY: '0 9 * * *',      // Todo dia às 9h
    HOURLY: '0 * * * *',     // A cada hora
    EVERY_6H: '0 */6 * * *'  // A cada 6 horas
  }
};

/**
 * Registra alerta no log
 */
function logAlert(alert) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${alert.severity} - ${alert.type}: ${alert.message}\n`;
  
  fs.appendFileSync(ALERT_CONFIG.ALERT_LOG_FILE, logEntry);
}

/**
 * Envia notificação por email (implementação básica)
 */
async function sendEmailAlert(alerts) {
  if (!ALERT_CONFIG.EMAIL_ENABLED) {
    console.log('📧 Email não configurado - pulando notificação');
    return;
  }
  
  // Aqui você implementaria a integração com seu provedor de email
  // Exemplos: SendGrid, Nodemailer, AWS SES, etc.
  console.log(`📧 Enviaria email para ${ALERT_CONFIG.EMAIL_TO} com ${alerts.length} alertas`);
}

/**
 * Envia notificação via webhook
 */
async function sendWebhookAlert(alerts) {
  if (!ALERT_CONFIG.WEBHOOK_ENABLED || !ALERT_CONFIG.WEBHOOK_URL) {
    console.log('🔗 Webhook não configurado - pulando notificação');
    return;
  }
  
  try {
    const payload = {
      text: `🚨 Alertas de Duplicatas Detectados`,
      attachments: alerts.map(alert => ({
        color: alert.severity === 'HIGH' ? 'danger' : 'warning',
        fields: [
          {
            title: alert.type,
            value: alert.message,
            short: false
          }
        ]
      }))
    };
    
    const response = await fetch(ALERT_CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log('✅ Webhook enviado com sucesso');
    } else {
      console.error('❌ Erro ao enviar webhook:', response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', error.message);
  }
}

/**
 * Processa alertas e envia notificações
 */
async function processAlerts(report) {
  if (!report.alerts || report.alerts.length === 0) {
    console.log('✅ Nenhum alerta para processar');
    return;
  }
  
  console.log(`🚨 Processando ${report.alerts.length} alertas...`);
  
  // Registrar alertas no log
  report.alerts.forEach(alert => {
    logAlert(alert);
    console.log(`📝 Alerta registrado: ${alert.type} - ${alert.severity}`);
  });
  
  // Filtrar apenas alertas de alta severidade para notificações
  const highSeverityAlerts = report.alerts.filter(alert => alert.severity === 'HIGH');
  
  if (highSeverityAlerts.length > 0) {
    console.log(`🔴 ${highSeverityAlerts.length} alertas de alta severidade - enviando notificações`);
    
    // Enviar notificações
    await sendEmailAlert(highSeverityAlerts);
    await sendWebhookAlert(highSeverityAlerts);
  } else {
    console.log('🟡 Apenas alertas de baixa/média severidade - sem notificações');
  }
}

/**
 * Executa monitoramento com alertas
 */
async function runMonitoringWithAlerts() {
  console.log('🚀 Executando Monitoramento com Alertas');
  console.log('='.repeat(50));
  
  try {
    // Garantir que o diretório de logs existe
    const logDir = path.dirname(ALERT_CONFIG.ALERT_LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Executar monitoramento
    const startTime = Date.now();
    
    // Capturar saída do monitoramento
    const originalLog = console.log;
    let monitoringOutput = '';
    
    console.log = (...args) => {
      monitoringOutput += args.join(' ') + '\n';
      originalLog(...args);
    };
    
    await runMonitoring();
    
    console.log = originalLog;
    
    // Ler o relatório mais recente
    const reportsDir = MONITORING_CONFIG.REPORTS_DIR;
    const reportFiles = fs.readdirSync(reportsDir)
      .filter(file => file.startsWith('duplicates-report-'))
      .sort()
      .reverse();
    
    if (reportFiles.length === 0) {
      throw new Error('Nenhum relatório encontrado');
    }
    
    const latestReportPath = path.join(reportsDir, reportFiles[0]);
    const report = JSON.parse(fs.readFileSync(latestReportPath, 'utf8'));
    
    // Processar alertas
    await processAlerts(report);
    
    const duration = Date.now() - startTime;
    console.log(`\n⏱️ Monitoramento concluído em ${duration}ms`);
    console.log('✅ Sistema de alertas executado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no sistema de alertas:', error.message);
    
    // Registrar erro crítico
    const criticalAlert = {
      severity: 'CRITICAL',
      type: 'MONITORING_FAILURE',
      message: `Falha no sistema de monitoramento: ${error.message}`
    };
    
    logAlert(criticalAlert);
    process.exit(1);
  }
}

/**
 * Gera script de agendamento para Windows (Task Scheduler)
 */
function generateWindowsScheduler() {
  const scriptPath = path.resolve('./monitoring/setup-alerts.js');
  const nodePath = process.execPath;
  
  const taskXml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>2024-01-01T00:00:00</Date>
    <Author>Sistema Anti-Duplicação</Author>
    <Description>Monitoramento automático de duplicatas no sistema de pagamentos</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2024-01-01T09:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>"${nodePath}"</Command>
      <Arguments>"${scriptPath}"</Arguments>
      <WorkingDirectory>${path.dirname(scriptPath)}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>`;

  const taskFile = './monitoring/duplicates-monitor-task.xml';
  fs.writeFileSync(taskFile, taskXml);
  
  console.log(`📅 Arquivo de tarefa do Windows criado: ${taskFile}`);
  console.log('Para instalar, execute como administrador:');
  console.log(`schtasks /create /tn "Monitoramento Duplicatas" /xml "${path.resolve(taskFile)}"`);
}

/**
 * Gera script de agendamento para sistemas Unix (cron)
 */
function generateCronScript() {
  const scriptPath = path.resolve('./monitoring/setup-alerts.js');
  const nodePath = process.execPath;
  
  const cronEntry = `# Monitoramento de duplicatas - Todo dia às 9h
0 9 * * * cd ${path.dirname(scriptPath)} && "${nodePath}" "${scriptPath}" >> ./monitoring/cron.log 2>&1`;

  const cronFile = './monitoring/crontab-entry.txt';
  fs.writeFileSync(cronFile, cronEntry);
  
  console.log(`📅 Entrada do cron criada: ${cronFile}`);
  console.log('Para instalar, execute:');
  console.log(`crontab -e`);
  console.log('E adicione a linha do arquivo acima');
}

/**
 * Configura agendamento automático
 */
function setupScheduling() {
  console.log('📅 Configurando Agendamento Automático');
  console.log('='.repeat(40));
  
  // Detectar sistema operacional
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    generateWindowsScheduler();
  } else {
    generateCronScript();
  }
  
  console.log('\n✅ Scripts de agendamento gerados!');
  console.log('📝 Configure as variáveis de ambiente para notificações:');
  console.log('   - ALERT_EMAIL: email para receber alertas');
  console.log('   - ALERT_WEBHOOK_URL: URL do webhook (Slack/Discord)');
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--setup')) {
  setupScheduling();
} else if (args.includes('--test')) {
  console.log('🧪 Executando teste do sistema de alertas...');
  runMonitoringWithAlerts().catch(console.error);
} else {
  // Execução normal
  runMonitoringWithAlerts().catch(console.error);
}

export { runMonitoringWithAlerts, processAlerts, ALERT_CONFIG };