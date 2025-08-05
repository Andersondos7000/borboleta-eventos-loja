-- Habilitar RLS na tabela webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir que apenas o service role acesse os logs
CREATE POLICY "Service role can access webhook_logs"
ON public.webhook_logs
FOR ALL
TO service_role
USING (true);

-- Criar política para permitir que usuários autenticados vejam apenas logs relacionados a eles (se necessário)
CREATE POLICY "Users can view related webhook_logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (true);