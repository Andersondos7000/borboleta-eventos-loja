import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Tipos para métricas de latência
interface LatencyMetric {
  id: string;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'SUBSCRIBE';
  startTime: number;
  endTime: number;
  latency: number;
  success: boolean;
  error?: string;
  userId?: string;
  timestamp: Date;
}

interface LatencyStats {
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p95Latency: number;
  p99Latency: number;
  totalOperations: number;
  successRate: number;
  byTable: Record<string, {
    avgLatency: number;
    operations: number;
    successRate: number;
  }>;
  byOperation: Record<string, {
    avgLatency: number;
    operations: number;
    successRate: number;
  }>;
  recentMetrics: LatencyMetric[];
}

interface LatencyMonitorRequest {
  action?: 'store' | 'get_stats' | 'get_alerts';
  metrics?: LatencyMetric[];
  hours?: number;
  threshold?: number;
}

interface LatencyMonitorResponse {
  success: boolean;
  data?: any;
  stats?: LatencyStats;
  alerts?: any[];
  error?: string;
  processed?: number;
}

/**
 * Edge Function para monitoramento de latência de sincronização em tempo real
 * Processa e armazena métricas de performance do sistema realtime
 */
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Inicializar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: LatencyMonitorRequest = await req.json();
    const { action = 'store', metrics, hours = 24, threshold = 1000 } = body;

    let response: LatencyMonitorResponse;

    switch (action) {
      case 'store':
        response = await storeMetrics(supabaseClient, metrics || [], user.id);
        break;
        
      case 'get_stats':
        response = await getLatencyStats(supabaseClient, user.id, hours);
        break;
        
      case 'get_alerts':
        response = await getLatencyAlerts(supabaseClient, user.id, threshold);
        break;
        
      default:
        response = {
          success: false,
          error: 'Invalid action. Use: store, get_stats, or get_alerts'
        };
    }

    return new Response(
      JSON.stringify(response),
      {
        status: response.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[RealtimeLatencyMonitor] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Armazena métricas de latência no banco de dados
 */
async function storeMetrics(
  supabase: any,
  metrics: LatencyMetric[],
  userId: string
): Promise<LatencyMonitorResponse> {
  try {
    if (!metrics || metrics.length === 0) {
      return {
        success: true,
        processed: 0,
        data: 'No metrics to process'
      };
    }

    // Preparar dados para inserção
    const metricsData = metrics.map(metric => ({
      id: metric.id,
      user_id: userId,
      table_name: metric.table,
      operation_type: metric.operation,
      start_time: new Date(metric.startTime),
      end_time: new Date(metric.endTime),
      latency_ms: metric.latency,
      success: metric.success,
      error_message: metric.error,
      timestamp: new Date(metric.timestamp),
      created_at: new Date()
    }));

    // Inserir métricas na tabela realtime_latency_metrics
    const { data, error } = await supabase
      .from('realtime_latency_metrics')
      .insert(metricsData)
      .select();

    if (error) {
      throw error;
    }

    // Calcular estatísticas em tempo real
    const stats = await calculateRealtimeStats(supabase, userId);

    // Verificar alertas de latência alta
    const alerts = await checkLatencyAlerts(supabase, metrics, userId);

    // Log para monitoramento
    console.log(`[RealtimeLatencyMonitor] Stored ${metrics.length} metrics for user ${userId}`);
    
    if (alerts.length > 0) {
      console.warn(`[RealtimeLatencyMonitor] ${alerts.length} latency alerts triggered`);
    }

    return {
      success: true,
      processed: metrics.length,
      data: data,
      stats: stats,
      alerts: alerts
    };

  } catch (error) {
    console.error('[RealtimeLatencyMonitor] Error storing metrics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store metrics'
    };
  }
}

/**
 * Obtém estatísticas de latência para um período específico
 */
async function getLatencyStats(
  supabase: any,
  userId: string,
  hours: number
): Promise<LatencyMonitorResponse> {
  try {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    // Buscar métricas do período
    const { data: metrics, error } = await supabase
      .from('realtime_latency_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', cutoffTime.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      throw error;
    }

    if (!metrics || metrics.length === 0) {
      return {
        success: true,
        stats: {
          avgLatency: 0,
          minLatency: 0,
          maxLatency: 0,
          p95Latency: 0,
          p99Latency: 0,
          totalOperations: 0,
          successRate: 0,
          byTable: {},
          byOperation: {},
          recentMetrics: []
        }
      };
    }

    // Calcular estatísticas
    const latencies = metrics.map(m => m.latency_ms).sort((a, b) => a - b);
    const successfulOps = metrics.filter(m => m.success).length;
    
    // Percentis
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);
    
    // Agrupar por tabela
    const byTable: Record<string, { avgLatency: number; operations: number; successRate: number }> = {};
    metrics.forEach(metric => {
      if (!byTable[metric.table_name]) {
        byTable[metric.table_name] = { avgLatency: 0, operations: 0, successRate: 0 };
      }
      byTable[metric.table_name].operations++;
      byTable[metric.table_name].avgLatency += metric.latency_ms;
    });
    
    Object.keys(byTable).forEach(table => {
      const tableMetrics = metrics.filter(m => m.table_name === table);
      byTable[table].avgLatency = byTable[table].avgLatency / byTable[table].operations;
      byTable[table].successRate = tableMetrics.filter(m => m.success).length / tableMetrics.length;
    });
    
    // Agrupar por operação
    const byOperation: Record<string, { avgLatency: number; operations: number; successRate: number }> = {};
    metrics.forEach(metric => {
      if (!byOperation[metric.operation_type]) {
        byOperation[metric.operation_type] = { avgLatency: 0, operations: 0, successRate: 0 };
      }
      byOperation[metric.operation_type].operations++;
      byOperation[metric.operation_type].avgLatency += metric.latency_ms;
    });
    
    Object.keys(byOperation).forEach(operation => {
      const opMetrics = metrics.filter(m => m.operation_type === operation);
      byOperation[operation].avgLatency = byOperation[operation].avgLatency / byOperation[operation].operations;
      byOperation[operation].successRate = opMetrics.filter(m => m.success).length / opMetrics.length;
    });

    const stats: LatencyStats = {
      avgLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      p95Latency: latencies[p95Index] || 0,
      p99Latency: latencies[p99Index] || 0,
      totalOperations: metrics.length,
      successRate: successfulOps / metrics.length,
      byTable,
      byOperation,
      recentMetrics: metrics.slice(0, 20).map(m => ({
        id: m.id,
        table: m.table_name,
        operation: m.operation_type,
        startTime: new Date(m.start_time).getTime(),
        endTime: new Date(m.end_time).getTime(),
        latency: m.latency_ms,
        success: m.success,
        error: m.error_message,
        userId: m.user_id,
        timestamp: new Date(m.timestamp)
      }))
    };

    return {
      success: true,
      stats
    };

  } catch (error) {
    console.error('[RealtimeLatencyMonitor] Error getting stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats'
    };
  }
}

/**
 * Obtém alertas de latência alta
 */
async function getLatencyAlerts(
  supabase: any,
  userId: string,
  threshold: number
): Promise<LatencyMonitorResponse> {
  try {
    const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // Últimas 24h

    const { data: alerts, error } = await supabase
      .from('realtime_latency_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', cutoffTime.toISOString())
      .gte('latency_ms', threshold)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return {
      success: true,
      alerts: alerts || []
    };

  } catch (error) {
    console.error('[RealtimeLatencyMonitor] Error getting alerts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get alerts'
    };
  }
}

/**
 * Calcula estatísticas em tempo real após inserção
 */
async function calculateRealtimeStats(supabase: any, userId: string): Promise<LatencyStats | null> {
  try {
    // Buscar métricas da última hora para cálculo rápido
    const cutoffTime = new Date(Date.now() - (60 * 60 * 1000));
    
    const { data: recentMetrics, error } = await supabase
      .from('realtime_latency_metrics')
      .select('latency_ms, success, table_name, operation_type')
      .eq('user_id', userId)
      .gte('timestamp', cutoffTime.toISOString());

    if (error || !recentMetrics || recentMetrics.length === 0) {
      return null;
    }

    const latencies = recentMetrics.map(m => m.latency_ms).sort((a, b) => a - b);
    const successfulOps = recentMetrics.filter(m => m.success).length;
    
    return {
      avgLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      p95Latency: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99Latency: latencies[Math.floor(latencies.length * 0.99)] || 0,
      totalOperations: recentMetrics.length,
      successRate: successfulOps / recentMetrics.length,
      byTable: {},
      byOperation: {},
      recentMetrics: []
    };

  } catch (error) {
    console.error('[RealtimeLatencyMonitor] Error calculating realtime stats:', error);
    return null;
  }
}

/**
 * Verifica alertas de latência alta nas métricas recebidas
 */
async function checkLatencyAlerts(
  supabase: any,
  metrics: LatencyMetric[],
  userId: string
): Promise<any[]> {
  const alerts: any[] = [];
  const ALERT_THRESHOLD = 1000; // 1 segundo
  const CRITICAL_THRESHOLD = 5000; // 5 segundos

  try {
    for (const metric of metrics) {
      if (metric.latency > CRITICAL_THRESHOLD) {
        alerts.push({
          type: 'CRITICAL_LATENCY',
          metric,
          threshold: CRITICAL_THRESHOLD,
          message: `Latência crítica detectada: ${metric.latency.toFixed(2)}ms em ${metric.operation} na tabela ${metric.table}`
        });
      } else if (metric.latency > ALERT_THRESHOLD) {
        alerts.push({
          type: 'HIGH_LATENCY',
          metric,
          threshold: ALERT_THRESHOLD,
          message: `Alta latência detectada: ${metric.latency.toFixed(2)}ms em ${metric.operation} na tabela ${metric.table}`
        });
      }
    }

    // Armazenar alertas se houver
    if (alerts.length > 0) {
      const alertsData = alerts.map(alert => ({
        user_id: userId,
        alert_type: alert.type,
        metric_id: alert.metric.id,
        table_name: alert.metric.table,
        operation_type: alert.metric.operation,
        latency_ms: alert.metric.latency,
        threshold_ms: alert.threshold,
        message: alert.message,
        created_at: new Date()
      }));

      await supabase
        .from('realtime_latency_alerts')
        .insert(alertsData);
    }

  } catch (error) {
    console.error('[RealtimeLatencyMonitor] Error checking alerts:', error);
  }

  return alerts;
}