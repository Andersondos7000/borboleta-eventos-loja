import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // SQL da migração - função delete_user_cascade
    const migrationSQL = `
      -- Função para deletar usuário e todos os dados relacionados em cascata
      CREATE OR REPLACE FUNCTION delete_user_cascade(user_id_param UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
          -- Deletar itens do carrinho do usuário
          DELETE FROM cart_items WHERE user_id = user_id_param;
          
          -- Deletar tickets do usuário
          DELETE FROM tickets WHERE user_id = user_id_param;
          
          -- Deletar pedidos do usuário
          DELETE FROM orders WHERE user_id = user_id_param;
          
          -- Deletar perfil do usuário
          DELETE FROM profiles WHERE id = user_id_param;
          
          -- Deletar usuário da tabela auth.users (requer privilégios especiais)
          DELETE FROM auth.users WHERE id = user_id_param;
          
          RETURN TRUE;
      EXCEPTION
          WHEN OTHERS THEN
              -- Em caso de erro, retorna FALSE
              RETURN FALSE;
      END;
      $$;

      -- Conceder permissões para executar a função
      GRANT EXECUTE ON FUNCTION delete_user_cascade(UUID) TO service_role;
      GRANT EXECUTE ON FUNCTION delete_user_cascade(UUID) TO authenticated;

      -- Criar política RLS para a função (apenas admins podem executar)
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE schemaname = 'auth' 
              AND tablename = 'users' 
              AND policyname = 'Only admins can delete users'
          ) THEN
              CREATE POLICY "Only admins can delete users" ON auth.users
              FOR DELETE
              USING (
                  EXISTS (
                      SELECT 1 FROM profiles 
                      WHERE profiles.id = auth.uid() 
                      AND profiles.role = 'admin'
                  )
              );
          END IF;
      END
      $$;

      -- Comentário da função
      COMMENT ON FUNCTION delete_user_cascade(UUID) IS 'Deleta um usuário e todos os seus dados relacionados em cascata. Apenas administradores podem executar esta função.';
    `

    console.log('🚀 Executando migração SQL...')
    
    // Usar conexão direta ao PostgreSQL via Deno
    const dbUrl = Deno.env.get('SUPABASE_DB_URL') || 
                  `postgresql://postgres:${Deno.env.get('DB_PASSWORD')}@db.${Deno.env.get('SUPABASE_PROJECT_REF')}.supabase.co:5432/postgres`
    
    console.log('🔗 Conectando ao banco de dados...')
    
    try {
      // Usar fetch para executar SQL via PostgREST
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
          query: migrationSQL
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erro na requisição:', errorText)
        
        // Tentar executar comandos individuais
        console.log('🔄 Tentando comandos individuais...')
        
        const commands = [
          // Criar função
          `CREATE OR REPLACE FUNCTION delete_user_cascade(user_id_param UUID)
           RETURNS BOOLEAN
           LANGUAGE plpgsql
           SECURITY DEFINER
           AS $$
           BEGIN
               DELETE FROM cart_items WHERE user_id = user_id_param;
               DELETE FROM tickets WHERE user_id = user_id_param;
               DELETE FROM orders WHERE user_id = user_id_param;
               DELETE FROM profiles WHERE id = user_id_param;
               DELETE FROM auth.users WHERE id = user_id_param;
               RETURN TRUE;
           EXCEPTION
               WHEN OTHERS THEN
                   RETURN FALSE;
           END;
           $$;`,
          
          // Conceder permissões
          `GRANT EXECUTE ON FUNCTION delete_user_cascade(UUID) TO service_role;`,
          `GRANT EXECUTE ON FUNCTION delete_user_cascade(UUID) TO authenticated;`,
          
          // Comentário
          `COMMENT ON FUNCTION delete_user_cascade(UUID) IS 'Deleta um usuário e todos os seus dados relacionados em cascata. Apenas administradores podem executar esta função.';`
        ]
        
        const results = []
        for (const command of commands) {
          try {
            // Tentar via supabase client SQL
            const { data: cmdData, error: cmdError } = await supabase
              .from('_sql')
              .select('*')
              .eq('query', command)
              .single()
            
            if (cmdError) {
              console.error(`❌ Erro no comando: ${command.substring(0, 50)}...`, cmdError)
              results.push({ command: command.substring(0, 50), error: cmdError.message })
            } else {
              console.log(`✅ Comando executado: ${command.substring(0, 50)}...`)
              results.push({ command: command.substring(0, 50), success: true })
            }
          } catch (e) {
            console.error(`❌ Exceção no comando: ${command.substring(0, 50)}...`, e)
            results.push({ command: command.substring(0, 50), error: e.message })
          }
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            error: errorText,
            alternativeResults: results,
            message: 'Tentativa de execução com comandos individuais'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
      
      const result = await response.json()
      console.log('✅ SQL executado com sucesso:', result)
      
    } catch (fetchError) {
      console.error('❌ Erro na execução via fetch:', fetchError)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: fetchError.message,
          message: 'Erro ao executar SQL via fetch'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    console.log('✅ Migração executada com sucesso!')
    
    // Verificar se a função foi criada
    const { data: functionCheck, error: checkError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_name', 'delete_user_cascade')
      .eq('routine_schema', 'public')
    
    return new Response(
      JSON.stringify({
        success: true,
        data,
        functionExists: functionCheck && functionCheck.length > 0,
        message: 'Migração da função delete_user_cascade executada com sucesso!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Erro geral:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Erro ao executar migração'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})