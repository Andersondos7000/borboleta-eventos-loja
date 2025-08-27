-- Migration: Create realtime latency monitoring tables
-- Description: Tabelas para monitoramento de latência de sincronização em tempo real
-- Author: Builder with MCP
-- Date: 2024-01-01

-- Tabela principal para métricas de latência
CREATE TABLE IF NOT EXISTS realtime_latency_metrics (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'SUBSCRIBE')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    latency_ms NUMERIC(10,3) NOT NULL CHECK (latency_ms >= 0),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela para alertas de latência
CREATE TABLE IF NOT EXISTS realtime_latency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_id TEXT NOT NULL REFERENCES realtime_latency_metrics(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('HIGH_LATENCY', 'CRITICAL_LATENCY', 'TIMEOUT', 'ERROR_RATE')),
    table_name TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    latency_ms NUMERIC(10,3) NOT NULL,
    threshold_ms NUMERIC(10,3) NOT NULL,
    message TEXT NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela para configurações de monitoramento por usuário
CREATE TABLE IF NOT EXISTS realtime_latency_config (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    batch_size INTEGER NOT NULL DEFAULT 20 CHECK (batch_size > 0 AND batch_size <= 100),
    flush_interval_ms INTEGER NOT NULL DEFAULT 10000 CHECK (flush_interval_ms >= 1000),
    retention_period_hours INTEGER NOT NULL DEFAULT 168 CHECK (retention_period_hours > 0), -- 7 dias
    alert_threshold_ms NUMERIC(10,3) NOT NULL DEFAULT 1000 CHECK (alert_threshold_ms > 0),
    critical_threshold_ms NUMERIC(10,3) NOT NULL DEFAULT 5000 CHECK (critical_threshold_ms > alert_threshold_ms),
    enable_supabase_mcp BOOLEAN NOT NULL DEFAULT true,
    enable_email_alerts BOOLEAN NOT NULL DEFAULT false,
    email_alert_frequency TEXT NOT NULL DEFAULT 'IMMEDIATE' CHECK (email_alert_frequency IN ('IMMEDIATE', 'HOURLY', 'DAILY', 'DISABLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_realtime_latency_metrics_user_timestamp 
    ON realtime_latency_metrics(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_realtime_latency_metrics_table_operation 
    ON realtime_latency_metrics(table_name, operation_type);

CREATE INDEX IF NOT EXISTS idx_realtime_latency_metrics_latency 
    ON realtime_latency_metrics(latency_ms DESC) WHERE latency_ms > 1000;

CREATE INDEX IF NOT EXISTS idx_realtime_latency_metrics_success 
    ON realtime_latency_metrics(success, timestamp DESC) WHERE success = false;

CREATE INDEX IF NOT EXISTS idx_realtime_latency_alerts_user_type 
    ON realtime_latency_alerts(user_id, alert_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_realtime_latency_alerts_acknowledged 
    ON realtime_latency_alerts(acknowledged, created_at DESC) WHERE acknowledged = false;

-- Trigger para atualizar updated_at na tabela de configurações
CREATE OR REPLACE FUNCTION update_realtime_latency_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_realtime_latency_config_updated_at
    BEFORE UPDATE ON realtime_latency_config
    FOR EACH ROW
    EXECUTE FUNCTION update_realtime_latency_config_updated_at();

-- Função para limpeza automática de métricas antigas
CREATE OR REPLACE FUNCTION cleanup_old_latency_metrics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Deletar métricas mais antigas que o período de retenção configurado por usuário
    WITH user_configs AS (
        SELECT user_id, retention_period_hours
        FROM realtime_latency_config
        WHERE enabled = true
    ),
    old_metrics AS (
        DELETE FROM realtime_latency_metrics m
        USING user_configs c
        WHERE m.user_id = c.user_id
        AND m.timestamp < NOW() - (c.retention_period_hours || ' hours')::INTERVAL
        RETURNING m.id
    )
    SELECT COUNT(*) INTO deleted_count FROM old_metrics;
    
    -- Deletar alertas órfãos (cujas métricas foram deletadas)
    DELETE FROM realtime_latency_alerts a
    WHERE NOT EXISTS (
        SELECT 1 FROM realtime_latency_metrics m 
        WHERE m.id = a.metric_id
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular estatísticas agregadas
CREATE OR REPLACE FUNCTION get_latency_stats(
    p_user_id UUID,
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    avg_latency NUMERIC,
    min_latency NUMERIC,
    max_latency NUMERIC,
    p95_latency NUMERIC,
    p99_latency NUMERIC,
    total_operations BIGINT,
    success_rate NUMERIC,
    table_stats JSONB,
    operation_stats JSONB
) AS $$
DECLARE
    cutoff_time TIMESTAMPTZ;
BEGIN
    cutoff_time := NOW() - (p_hours || ' hours')::INTERVAL;
    
    RETURN QUERY
    WITH metrics AS (
        SELECT 
            latency_ms,
            success,
            table_name,
            operation_type
        FROM realtime_latency_metrics
        WHERE user_id = p_user_id
        AND timestamp >= cutoff_time
    ),
    percentiles AS (
        SELECT 
            percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
            percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99
        FROM metrics
    ),
    table_aggregates AS (
        SELECT jsonb_object_agg(
            table_name,
            jsonb_build_object(
                'avgLatency', ROUND(AVG(latency_ms), 3),
                'operations', COUNT(*),
                'successRate', ROUND(AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END), 4)
            )
        ) as table_stats
        FROM metrics
        GROUP BY table_name
    ),
    operation_aggregates AS (
        SELECT jsonb_object_agg(
            operation_type,
            jsonb_build_object(
                'avgLatency', ROUND(AVG(latency_ms), 3),
                'operations', COUNT(*),
                'successRate', ROUND(AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END), 4)
            )
        ) as operation_stats
        FROM metrics
        GROUP BY operation_type
    )
    SELECT 
        ROUND(AVG(m.latency_ms), 3) as avg_latency,
        MIN(m.latency_ms) as min_latency,
        MAX(m.latency_ms) as max_latency,
        ROUND(p.p95, 3) as p95_latency,
        ROUND(p.p99, 3) as p99_latency,
        COUNT(*) as total_operations,
        ROUND(AVG(CASE WHEN m.success THEN 1.0 ELSE 0.0 END), 4) as success_rate,
        COALESCE(ta.table_stats, '{}'::jsonb) as table_stats,
        COALESCE(oa.operation_stats, '{}'::jsonb) as operation_stats
    FROM metrics m
    CROSS JOIN percentiles p
    CROSS JOIN table_aggregates ta
    CROSS JOIN operation_aggregates oa;
END;
$$ LANGUAGE plpgsql;

-- Função para detectar anomalias de latência
CREATE OR REPLACE FUNCTION detect_latency_anomalies(
    p_user_id UUID,
    p_table_name TEXT DEFAULT NULL,
    p_operation_type TEXT DEFAULT NULL,
    p_hours INTEGER DEFAULT 1
)
RETURNS TABLE (
    metric_id TEXT,
    table_name TEXT,
    operation_type TEXT,
    latency_ms NUMERIC,
    z_score NUMERIC,
    is_anomaly BOOLEAN,
    timestamp TIMESTAMPTZ
) AS $$
DECLARE
    cutoff_time TIMESTAMPTZ;
BEGIN
    cutoff_time := NOW() - (p_hours || ' hours')::INTERVAL;
    
    RETURN QUERY
    WITH recent_metrics AS (
        SELECT 
            id,
            table_name as tbl,
            operation_type as op,
            latency_ms,
            timestamp
        FROM realtime_latency_metrics
        WHERE user_id = p_user_id
        AND timestamp >= cutoff_time
        AND (p_table_name IS NULL OR table_name = p_table_name)
        AND (p_operation_type IS NULL OR operation_type = p_operation_type)
    ),
    stats AS (
        SELECT 
            AVG(latency_ms) as mean_latency,
            STDDEV(latency_ms) as stddev_latency
        FROM recent_metrics
    )
    SELECT 
        rm.id,
        rm.tbl,
        rm.op,
        rm.latency_ms,
        CASE 
            WHEN s.stddev_latency > 0 THEN 
                ROUND((rm.latency_ms - s.mean_latency) / s.stddev_latency, 3)
            ELSE 0
        END as z_score,
        CASE 
            WHEN s.stddev_latency > 0 AND 
                 ABS((rm.latency_ms - s.mean_latency) / s.stddev_latency) > 2.5 
            THEN true
            ELSE false
        END as is_anomaly,
        rm.timestamp
    FROM recent_metrics rm
    CROSS JOIN stats s
    ORDER BY rm.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) Policies
ALTER TABLE realtime_latency_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_latency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_latency_config ENABLE ROW LEVEL SECURITY;

-- Políticas para realtime_latency_metrics
CREATE POLICY "Users can view their own latency metrics" 
    ON realtime_latency_metrics FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own latency metrics" 
    ON realtime_latency_metrics FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own latency metrics" 
    ON realtime_latency_metrics FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own latency metrics" 
    ON realtime_latency_metrics FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para realtime_latency_alerts
CREATE POLICY "Users can view their own latency alerts" 
    ON realtime_latency_alerts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own latency alerts" 
    ON realtime_latency_alerts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own latency alerts" 
    ON realtime_latency_alerts FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own latency alerts" 
    ON realtime_latency_alerts FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para realtime_latency_config
CREATE POLICY "Users can view their own latency config" 
    ON realtime_latency_config FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own latency config" 
    ON realtime_latency_config FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own latency config" 
    ON realtime_latency_config FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own latency config" 
    ON realtime_latency_config FOR DELETE 
    USING (auth.uid() = user_id);

-- Configuração padrão para novos usuários
CREATE OR REPLACE FUNCTION create_default_latency_config()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO realtime_latency_config (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar configuração padrão quando um novo usuário é criado
CREATE TRIGGER trigger_create_default_latency_config
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_latency_config();

-- Comentários para documentação
COMMENT ON TABLE realtime_latency_metrics IS 'Métricas de latência para operações de sincronização em tempo real';
COMMENT ON TABLE realtime_latency_alerts IS 'Alertas gerados quando a latência excede os limites configurados';
COMMENT ON TABLE realtime_latency_config IS 'Configurações de monitoramento de latência por usuário';

COMMENT ON FUNCTION cleanup_old_latency_metrics() IS 'Remove métricas antigas baseado no período de retenção configurado';
COMMENT ON FUNCTION get_latency_stats(UUID, INTEGER) IS 'Calcula estatísticas agregadas de latência para um usuário';
COMMENT ON FUNCTION detect_latency_anomalies(UUID, TEXT, TEXT, INTEGER) IS 'Detecta anomalias de latência usando análise estatística (Z-score)';

-- Criar job para limpeza automática (executar diariamente às 2:00 AM)
-- Nota: Requer extensão pg_cron
-- SELECT cron.schedule('cleanup-latency-metrics', '0 2 * * *', 'SELECT cleanup_old_latency_metrics();');

-- Inserir configuração padrão para usuários existentes
INSERT INTO realtime_latency_config (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;