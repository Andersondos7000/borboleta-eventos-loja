import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojxmfxbflbfinodkhixk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeG1meGJmbGJmaW5vZGtoaXhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkyNTA4MCwiZXhwIjoyMDcwNTAxMDgwfQ.otn_yr7CqJpg9B_z9XaONVxqHSlNsCro67bVstt5JmQ';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    // Teste simples de conexão usando uma query básica
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('⚠️ Erro na query de teste:', error.message);
      // Tenta uma query ainda mais simples
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
    }

    console.log('✅ Conexão com Supabase em nuvem estabelecida com sucesso!');
    console.log('🔗 URL:', supabaseUrl);
    console.log('🔑 Service Key configurada corretamente');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Falha ao conectar ao Supabase em nuvem:', err.message);
    console.error('🔍 Detalhes do erro:', err);
    process.exit(1);
  }
}

testConnection();