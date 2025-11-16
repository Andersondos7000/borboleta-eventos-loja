import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Iniciando criação da tabela pix_payments...')

    // SQL para criar a tabela
    const createTableSQL = `
      -- Criar tabela pix_payments
      CREATE TABLE IF NOT EXISTS public.pix_payments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          pix_id TEXT NOT NULL UNIQUE,
          amount INTEGER NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'PENDING',
          br_code TEXT NOT NULL,
          qr_code_base64 TEXT,
          customer_name TEXT,
          customer_email TEXT,
          customer_cellphone TEXT,
          customer_tax_id TEXT,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT pix_payments_status_check CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED'))
      );

      -- Criar índices
      CREATE INDEX IF NOT EXISTS idx_pix_payments_pix_id ON public.pix_payments(pix_id);
      CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON public.pix_payments(status);
      CREATE INDEX IF NOT EXISTS idx_pix_payments_created_at ON public.pix_payments(created_at);

      -- Habilitar RLS
      ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

      -- Criar políticas RLS
      DROP POLICY IF EXISTS "Allow all operations on pix_payments" ON public.pix_payments;
      CREATE POLICY "Allow all operations on pix_payments" ON public.pix_payments
          FOR ALL USING (true) WITH CHECK (true);

      -- Criar função para atualizar updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Criar trigger
      DROP TRIGGER IF EXISTS update_pix_payments_updated_at ON public.pix_payments;
      CREATE TRIGGER update_pix_payments_updated_at 
          BEFORE UPDATE ON public.pix_payments 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `

    // Executar SQL usando uma query raw
    const { data, error } = await supabaseClient.rpc('exec_sql', {
      sql: createTableSQL
    })

    if (error) {
      console.error('❌ Erro ao executar SQL:', error)
      
      // Se não temos a função exec_sql, vamos tentar uma abordagem diferente
      // Vamos executar cada comando separadamente usando o client
      console.log('🔄 Tentando abordagem alternativa...')
      
      // Primeiro, vamos tentar criar a tabela usando uma query simples
      const { error: createError } = await supabaseClient
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'pix_payments')
        .single()

      if (createError && createError.code === 'PGRST116') {
        // Tabela não existe, vamos tentar criar usando uma abordagem diferente
        console.log('📋 Tabela não existe, criando via SQL direto...')
        
        // Vamos retornar instruções para criar manualmente
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Tabela precisa ser criada manualmente',
            instructions: 'Execute o arquivo create-table-manual.sql no Dashboard do Supabase',
            sql: createTableSQL
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }
    }

    // Testar se a tabela foi criada fazendo uma consulta
    const { data: testData, error: testError } = await supabaseClient
      .from('pix_payments')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('❌ Erro ao testar tabela:', testError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erro ao verificar tabela criada',
          details: testError
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('✅ Tabela pix_payments criada e funcionando!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tabela pix_payments criada com sucesso!',
        table_exists: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})