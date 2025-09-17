import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.rpc('now');
    
    if (error) throw error;

    console.log('✅ Conexão com Supabase em nuvem estabelecida com sucesso!');
    console.log('⏰ Hora no banco:', data);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Falha ao conectar ao Supabase em nuvem:', err.message);
    process.exit(1);
  }
}

testConnection();