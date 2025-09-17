-- Migration: Setup Brevo Email Integration
-- Cria tabela de logs de email e configura trigger para usar Brevo

-- 1. Criar tabela para logs de emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('signup_confirmation', 'password_reset', 'email_change', 'magic_link')),
  provider TEXT NOT NULL DEFAULT 'brevo',
  message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS - usuários só veem seus próprios logs
CREATE POLICY "Users can view their own email logs" ON email_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all email logs" ON email_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 5. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Trigger para updated_at
CREATE TRIGGER update_email_logs_updated_at
    BEFORE UPDATE ON email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Função para chamar a Edge Function quando usuário se cadastra
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  request_id UUID;
BEGIN
  -- Só processar se for um novo usuário (INSERT) e não confirmado ainda
  IF TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NULL THEN
    -- Fazer chamada HTTP para a Edge Function
    SELECT
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/brevo-email-confirmation',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'record', to_jsonb(NEW),
          'type', 'INSERT',
          'table', 'auth.users'
        )
      ) INTO request_id;
    
    -- Log da tentativa
    INSERT INTO email_logs (user_id, email, type, status)
    VALUES (NEW.id, NEW.email, 'signup_confirmation', 'pending');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Criar trigger na tabela auth.users
-- Nota: Este trigger será criado na próxima migração após configurar as variáveis

-- 9. Função para reenviar email de confirmação manualmente
CREATE OR REPLACE FUNCTION resend_confirmation_email(user_email TEXT)
RETURNS JSON AS $$
DECLARE
  user_record RECORD;
  request_id UUID;
  result JSON;
BEGIN
  -- Buscar usuário pelo email
  SELECT * INTO user_record 
  FROM auth.users 
  WHERE email = user_email 
  AND email_confirmed_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não encontrado ou já confirmado'
    );
  END IF;
  
  -- Chamar Edge Function
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/brevo-email-confirmation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'record', to_jsonb(user_record),
        'type', 'RESEND',
        'table', 'auth.users'
      )
    ) INTO request_id;
  
  -- Log da tentativa
  INSERT INTO email_logs (user_id, email, type, status)
  VALUES (user_record.id, user_record.email, 'signup_confirmation', 'pending');
  
  RETURN json_build_object(
    'success', true,
    'message', 'Email de confirmação reenviado',
    'request_id', request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Função para estatísticas de emails
CREATE OR REPLACE FUNCTION get_email_stats(days_back INTEGER DEFAULT 7)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_sent', COUNT(*),
    'successful', COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')),
    'failed', COUNT(*) FILTER (WHERE status IN ('failed', 'bounced')),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'by_type', json_object_agg(type, type_count),
    'period_days', days_back
  ) INTO stats
  FROM (
    SELECT 
      type,
      COUNT(*) as type_count
    FROM email_logs 
    WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY type
  ) type_stats,
  email_logs
  WHERE email_logs.created_at >= NOW() - INTERVAL '1 day' * days_back;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Comentários para documentação
COMMENT ON TABLE email_logs IS 'Log de todos os emails enviados via Brevo';
COMMENT ON FUNCTION handle_new_user_signup() IS 'Trigger function que chama Edge Function para enviar email via Brevo';
COMMENT ON FUNCTION resend_confirmation_email(TEXT) IS 'Função para reenviar email de confirmação manualmente';
COMMENT ON FUNCTION get_email_stats(INTEGER) IS 'Estatísticas de emails enviados nos últimos N dias';

-- 12. Grants para funções
GRANT EXECUTE ON FUNCTION resend_confirmation_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_stats(INTEGER) TO authenticated;

-- Fim da migration