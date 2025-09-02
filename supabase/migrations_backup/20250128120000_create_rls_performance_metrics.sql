-- Migration: Create RLS Performance Metrics table
-- Description: Tabela para monitoramento de performance das políticas RLS
-- Author: Builder with MCP
-- Date: 2025-01-28

-- Criar tabela para métricas de performance RLS
CREATE TABLE IF NOT EXISTS public.rls_performance_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  policy_name text NOT NULL,
  query_duration_ms numeric NOT NULL CHECK (query_duration_ms >= 0),
  query_type text NOT NULL CHECK (query_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query_plan jsonb,
  row_count integer,
  cache_hit boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rls_performance_metrics_pkey PRIMARY KEY (id)
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_rls_performance_metrics_table_name 
  ON public.rls_performance_metrics(table_name);

CREATE INDEX IF NOT EXISTS idx_rls_performance_metrics_policy_name 
  ON public.rls_performance_metrics(policy_name);

CREATE INDEX IF NOT EXISTS idx_rls_performance_metrics_user_id 
  ON public.rls_performance_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_rls_performance_metrics_created_at 
  ON public.rls_performance_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rls_performance_metrics_duration 
  ON public.rls_performance_metrics(query_duration_ms DESC);

-- Criar política RLS para a tabela
ALTER TABLE public.rls_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Política para admins verem todas as métricas
CREATE POLICY "Admins can view all metrics" ON public.rls_performance_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Política para usuários verem apenas suas próprias métricas
CREATE POLICY "Users can view own metrics" ON public.rls_performance_metrics
  FOR SELECT
  USING (user_id = auth.uid());

-- Política para inserção de métricas (sistema)
CREATE POLICY "System can insert metrics" ON public.rls_performance_metrics
  FOR INSERT
  WITH CHECK (true);

-- Função para limpeza automática de métricas antigas (30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_rls_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rls_performance_metrics 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE public.rls_performance_metrics IS 'Tabela para monitoramento de performance das políticas RLS';
COMMENT ON COLUMN public.rls_performance_metrics.table_name IS 'Nome da tabela onde a política RLS foi aplicada';
COMMENT ON COLUMN public.rls_performance_metrics.policy_name IS 'Nome da política RLS executada';
COMMENT ON COLUMN public.rls_performance_metrics.query_duration_ms IS 'Duração da query em milissegundos';
COMMENT ON COLUMN public.rls_performance_metrics.query_type IS 'Tipo de operação SQL (SELECT, INSERT, UPDATE, DELETE)';
COMMENT ON COLUMN public.rls_performance_metrics.user_id IS 'ID do usuário que executou a query';
COMMENT ON COLUMN public.rls_performance_metrics.query_plan IS 'Plano de execução da query (opcional)';
COMMENT ON COLUMN public.rls_performance_metrics.row_count IS 'Número de linhas afetadas/retornadas';
COMMENT ON COLUMN public.rls_performance_metrics.cache_hit IS 'Indica se a query foi servida do cache';