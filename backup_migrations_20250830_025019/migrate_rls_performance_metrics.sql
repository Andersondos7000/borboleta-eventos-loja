-- Migração da tabela: rls_performance_metrics
-- Gerado em: 2025-08-30T04:00:19.296Z

-- Adicionando colunas
ALTER TABLE rls_performance_metrics ADD COLUMN IF NOT EXISTS policy_name varchar(100);

-- Atualizando dados
UPDATE rls_performance_metrics SET 
         policy_name = 'unknown'
       WHERE policy_name IS NULL;

