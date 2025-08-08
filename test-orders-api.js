// Teste simples para verificar se a tabela orders está funcionando
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pxcvoiffnandpdyotped.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('VITE_SUPABASE_ANON_KEY não encontrada');
  console.log('Variáveis disponíveis:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOrdersTable() {
  try {
    console.log('Testando conexão com a tabela orders...');
    
    // Teste 1: Verificar se a tabela existe (tentativa de select)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Erro ao acessar tabela orders:', error.message);
      return false;
    }
    
    console.log('✅ Tabela orders acessível');
    console.log('Registros encontrados:', data?.length || 0);
    
    return true;
  } catch (err) {
    console.error('Erro no teste:', err.message);
    return false;
  }
}

// Executar teste
testOrdersTable().then(success => {
  if (success) {
    console.log('🎉 Teste concluído com sucesso!');
  } else {
    console.log('❌ Teste falhou');
    process.exit(1);
  }
});