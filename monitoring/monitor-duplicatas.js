/**
 * Script de Monitoramento de Duplicatas
 * 
 * Este script monitora a base de dados em busca de possíveis duplicatas
 * e gera relatórios para análise preventiva
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuração
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey || !supabaseUrl) {
  console.error('❌ Configurações do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configurações de monitoramento
const MONITORING_CONFIG = {
  // Período de análise (em horas)
  ANALYSIS_PERIOD_HOURS: 24,
  
  // Limite de tempo para considerar duplicata (em minutos)
  DUPLICATE_THRESHOLD_MINUTES: 5,
  
  // Diretório para salvar relatórios
  REPORTS_DIR: './monitoring/reports',
  
  // Limites de alerta
  ALERT_THRESHOLDS: {
    SUSPICIOUS_DUPLICATES: 5,    // Mais de 5 possíveis duplicatas
    HIGH_FREQUENCY_USER: 10,     // Mais de 10 pedidos do mesmo usuário
    RAPID_SUCCESSION: 3          // Mais de 3 pedidos em menos de 1 minuto
  }
};

/**
 * Cria o diretório de relatórios se não existir
 */
function ensureReportsDirectory() {
  if (!fs.existsSync(MONITORING_CONFIG.REPORTS_DIR)) {
    fs.mkdirSync(MONITORING_CONFIG.REPORTS_DIR, { recursive: true });
  }
}

/**
 * Busca pedidos suspeitos de duplicação
 */
async function findSuspiciousDuplicates() {
  console.log('🔍 Analisando pedidos suspeitos...');
  
  const hoursAgo = new Date();
  hoursAgo.setHours(hoursAgo.getHours() - MONITORING_CONFIG.ANALYSIS_PERIOD_HOURS);
  
  try {
    // Buscar pedidos recentes
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', hoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`📊 Analisando ${orders.length} pedidos das últimas ${MONITORING_CONFIG.ANALYSIS_PERIOD_HOURS} horas`);

    // Agrupar por email e valor para detectar possíveis duplicatas
    const groupedOrders = {};
    
    orders.forEach(order => {
      const customerEmail = order.customer_data?.email || 'sem-email';
      const amount = order.total_amount;
      const key = `${customerEmail}-${amount}`;
      
      if (!groupedOrders[key]) {
        groupedOrders[key] = [];
      }
      
      groupedOrders[key].push(order);
    });

    // Identificar grupos com múltiplos pedidos
    const suspiciousGroups = Object.entries(groupedOrders)
      .filter(([key, orders]) => orders.length > 1)
      .map(([key, orders]) => {
        const [email, amount] = key.split('-');
        return {
          email,
          amount: parseFloat(amount),
          count: orders.length,
          orders: orders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
          timeSpan: calculateTimeSpan(orders)
        };
      });

    return {
      totalOrders: orders.length,
      suspiciousGroups,
      analysisTime: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Erro ao buscar pedidos:', error.message);
    return null;
  }
}

/**
 * Calcula o intervalo de tempo entre pedidos
 */
function calculateTimeSpan(orders) {
  if (orders.length < 2) return 0;
  
  const first = new Date(orders[0].created_at);
  const last = new Date(orders[orders.length - 1].created_at);
  
  return Math.abs(last - first) / (1000 * 60); // em minutos
}

/**
 * Analisa padrões de comportamento suspeito
 */
async function analyzeUserBehavior() {
  console.log('👤 Analisando comportamento de usuários...');
  
  const hoursAgo = new Date();
  hoursAgo.setHours(hoursAgo.getHours() - MONITORING_CONFIG.ANALYSIS_PERIOD_HOURS);
  
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('customer_data, created_at, total_amount, payment_status')
      .gte('created_at', hoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Agrupar por email
    const userActivity = {};
    
    orders.forEach(order => {
      const email = order.customer_data?.email || 'sem-email';
      
      if (!userActivity[email]) {
        userActivity[email] = {
          email,
          orders: [],
          totalAmount: 0,
          rapidSuccessionCount: 0
        };
      }
      
      userActivity[email].orders.push(order);
      userActivity[email].totalAmount += order.total_amount || 0;
    });

    // Analisar cada usuário
    const suspiciousUsers = [];
    
    Object.values(userActivity).forEach(user => {
      // Ordenar pedidos por data
      user.orders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      // Detectar pedidos em sucessão rápida
      let rapidCount = 0;
      for (let i = 1; i < user.orders.length; i++) {
        const timeDiff = (new Date(user.orders[i].created_at) - new Date(user.orders[i-1].created_at)) / (1000 * 60);
        if (timeDiff < 1) { // Menos de 1 minuto
          rapidCount++;
        }
      }
      
      user.rapidSuccessionCount = rapidCount;
      
      // Marcar como suspeito se exceder limites
      if (user.orders.length > MONITORING_CONFIG.ALERT_THRESHOLDS.HIGH_FREQUENCY_USER ||
          user.rapidSuccessionCount > MONITORING_CONFIG.ALERT_THRESHOLDS.RAPID_SUCCESSION) {
        suspiciousUsers.push(user);
      }
    });

    return {
      totalUsers: Object.keys(userActivity).length,
      suspiciousUsers,
      analysisTime: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Erro ao analisar comportamento:', error.message);
    return null;
  }
}

/**
 * Gera relatório de monitoramento
 */
function generateReport(duplicatesAnalysis, behaviorAnalysis) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(MONITORING_CONFIG.REPORTS_DIR, `duplicates-report-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    period: `${MONITORING_CONFIG.ANALYSIS_PERIOD_HOURS} horas`,
    summary: {
      totalOrders: duplicatesAnalysis?.totalOrders || 0,
      suspiciousDuplicates: duplicatesAnalysis?.suspiciousGroups?.length || 0,
      totalUsers: behaviorAnalysis?.totalUsers || 0,
      suspiciousUsers: behaviorAnalysis?.suspiciousUsers?.length || 0
    },
    alerts: generateAlerts(duplicatesAnalysis, behaviorAnalysis),
    details: {
      duplicatesAnalysis,
      behaviorAnalysis
    }
  };
  
  // Salvar relatório
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return { report, reportPath };
}

/**
 * Gera alertas baseados na análise
 */
function generateAlerts(duplicatesAnalysis, behaviorAnalysis) {
  const alerts = [];
  
  // Alertas de duplicatas
  if (duplicatesAnalysis?.suspiciousGroups?.length > MONITORING_CONFIG.ALERT_THRESHOLDS.SUSPICIOUS_DUPLICATES) {
    alerts.push({
      type: 'HIGH_DUPLICATE_COUNT',
      severity: 'HIGH',
      message: `${duplicatesAnalysis.suspiciousGroups.length} grupos de possíveis duplicatas detectados`,
      threshold: MONITORING_CONFIG.ALERT_THRESHOLDS.SUSPICIOUS_DUPLICATES
    });
  }
  
  // Alertas de comportamento
  if (behaviorAnalysis?.suspiciousUsers?.length > 0) {
    alerts.push({
      type: 'SUSPICIOUS_USER_BEHAVIOR',
      severity: 'MEDIUM',
      message: `${behaviorAnalysis.suspiciousUsers.length} usuários com comportamento suspeito`,
      users: behaviorAnalysis.suspiciousUsers.map(u => u.email)
    });
  }
  
  // Alertas de sucessão rápida
  const rapidSuccessionUsers = behaviorAnalysis?.suspiciousUsers?.filter(u => 
    u.rapidSuccessionCount > MONITORING_CONFIG.ALERT_THRESHOLDS.RAPID_SUCCESSION
  ) || [];
  
  if (rapidSuccessionUsers.length > 0) {
    alerts.push({
      type: 'RAPID_SUCCESSION_ORDERS',
      severity: 'HIGH',
      message: `${rapidSuccessionUsers.length} usuários fizeram pedidos em sucessão muito rápida`,
      users: rapidSuccessionUsers.map(u => ({ email: u.email, count: u.rapidSuccessionCount }))
    });
  }
  
  return alerts;
}

/**
 * Exibe relatório no console
 */
function displayReport(report) {
  console.log('\n📊 RELATÓRIO DE MONITORAMENTO DE DUPLICATAS');
  console.log('='.repeat(50));
  console.log(`🕐 Período analisado: ${report.period}`);
  console.log(`📅 Gerado em: ${new Date(report.timestamp).toLocaleString('pt-BR')}`);
  
  console.log('\n📈 RESUMO:');
  console.log(`  📦 Total de pedidos: ${report.summary.totalOrders}`);
  console.log(`  🔍 Possíveis duplicatas: ${report.summary.suspiciousDuplicates}`);
  console.log(`  👥 Total de usuários: ${report.summary.totalUsers}`);
  console.log(`  ⚠️ Usuários suspeitos: ${report.summary.suspiciousUsers}`);
  
  if (report.alerts.length > 0) {
    console.log('\n🚨 ALERTAS:');
    report.alerts.forEach((alert, index) => {
      const severityIcon = alert.severity === 'HIGH' ? '🔴' : alert.severity === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`  ${severityIcon} ${alert.type}: ${alert.message}`);
    });
  } else {
    console.log('\n✅ Nenhum alerta gerado - sistema funcionando normalmente');
  }
  
  if (report.details.duplicatesAnalysis?.suspiciousGroups?.length > 0) {
    console.log('\n🔍 GRUPOS SUSPEITOS:');
    report.details.duplicatesAnalysis.suspiciousGroups.forEach((group, index) => {
      console.log(`  ${index + 1}. ${group.email} - R$ ${group.amount.toFixed(2)} (${group.count} pedidos em ${group.timeSpan.toFixed(1)} min)`);
    });
  }
}

/**
 * Função principal de monitoramento
 */
async function runMonitoring() {
  console.log('🚀 Iniciando Monitoramento de Duplicatas');
  console.log(`📊 Analisando últimas ${MONITORING_CONFIG.ANALYSIS_PERIOD_HOURS} horas\n`);
  
  try {
    // Garantir que o diretório existe
    ensureReportsDirectory();
    
    // Executar análises
    const duplicatesAnalysis = await findSuspiciousDuplicates();
    const behaviorAnalysis = await analyzeUserBehavior();
    
    if (!duplicatesAnalysis || !behaviorAnalysis) {
      console.error('❌ Falha na análise - abortando');
      return;
    }
    
    // Gerar relatório
    const { report, reportPath } = generateReport(duplicatesAnalysis, behaviorAnalysis);
    
    // Exibir resultados
    displayReport(report);
    
    console.log(`\n💾 Relatório salvo em: ${reportPath}`);
    console.log('✅ Monitoramento concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o monitoramento:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMonitoring().catch(console.error);
}

export { runMonitoring, MONITORING_CONFIG };