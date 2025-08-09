-- Habilitar RLS na tabela webhook_logs (apenas se a tabela existir)
DO $$
BEGIN
    -- Verificar se a tabela webhook_logs existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_logs') THEN
        
        -- Habilitar RLS na tabela webhook_logs
        ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
        
        -- Criar política para permitir que apenas o service role acesse os logs
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_logs' AND policyname = 'Service role can access webhook_logs') THEN
            CREATE POLICY "Service role can access webhook_logs"
            ON public.webhook_logs
            FOR ALL
            TO service_role
            USING (true);
        END IF;
        
        -- Criar política para permitir que usuários autenticados vejam apenas logs relacionados a eles
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_logs' AND policyname = 'Users can view related webhook_logs') THEN
            CREATE POLICY "Users can view related webhook_logs"
            ON public.webhook_logs
            FOR SELECT
            TO authenticated
            USING (true);
        END IF;
        
    END IF;
END $$;