import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PerformanceMetric {
  table_name: string
  policy_name: string
  query_duration_ms: number
  query_type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  user_id?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    if (req.method === 'POST') {
      // Registrar métrica de performance
      const metric: PerformanceMetric = await req.json()
      
      const { error } = await supabaseClient
        .from('rls_performance_metrics')
        .insert(metric)
      
      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Metric recorded' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (req.method === 'GET') {
      // Obter estatísticas de performance
      const url = new URL(req.url)
      const table_name = url.searchParams.get('table')
      const hours = parseInt(url.searchParams.get('hours') || '24')
      
      let query = supabaseClient
        .from('rls_performance_metrics')
        .select('*')
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
      
      if (table_name) {
        query = query.eq('table_name', table_name)
      }
      
      const { data: metrics, error } = await query
      
      if (error) {
        throw error
      }

      // Calcular estatísticas
      const stats = {
        total_queries: metrics?.length || 0,
        avg_duration_ms: metrics?.length ? 
          metrics.reduce((sum, m) => sum + Number(m.query_duration_ms), 0) / metrics.length : 0,
        max_duration_ms: metrics?.length ? 
          Math.max(...metrics.map(m => Number(m.query_duration_ms))) : 0,
        min_duration_ms: metrics?.length ? 
          Math.min(...metrics.map(m => Number(m.query_duration_ms))) : 0,
        by_table: {} as Record<string, any>,
        by_query_type: {} as Record<string, any>
      }

      // Agrupar por tabela
      metrics?.forEach(metric => {
        const table = metric.table_name
        if (!stats.by_table[table]) {
          stats.by_table[table] = {
            count: 0,
            avg_duration: 0,
            total_duration: 0
          }
        }
        stats.by_table[table].count++
        stats.by_table[table].total_duration += Number(metric.query_duration_ms)
        stats.by_table[table].avg_duration = stats.by_table[table].total_duration / stats.by_table[table].count
      })

      // Agrupar por tipo de query
      metrics?.forEach(metric => {
        const type = metric.query_type
        if (!stats.by_query_type[type]) {
          stats.by_query_type[type] = {
            count: 0,
            avg_duration: 0,
            total_duration: 0
          }
        }
        stats.by_query_type[type].count++
        stats.by_query_type[type].total_duration += Number(metric.query_duration_ms)
        stats.by_query_type[type].avg_duration = stats.by_query_type[type].total_duration / stats.by_query_type[type].count
      })

      return new Response(
        JSON.stringify({ stats, recent_metrics: metrics?.slice(0, 50) }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})