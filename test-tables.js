import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTables() {
  console.log('🧪 Testando acesso às tabelas após criação...\n');
  
  const tables = ['products', 'events', 'tickets', 'cart_items', 'profiles', 'orders'];
  const results = {
    existing: [],
    missing: []
  };

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        results.missing.push(table);
      } else {
        console.log(`✅ ${table}: Tabela existe e acessível`);
        results.existing.push(table);
      }
    } catch (err) {
      console.log(`❌ ${table}: Erro inesperado - ${err.message}`);
      results.missing.push(table);
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`✅ Tabelas funcionando: [${results.existing.join(', ')}]`);
  console.log(`❌ Tabelas com problema: [${results.missing.join(', ')}]`);
  
  if (results.missing.length === 0) {
    console.log('\n🎉 Todas as tabelas estão funcionando corretamente!');
    console.log('Os erros 400/404 do Supabase devem estar resolvidos.');
  } else {
    console.log('\n⚠️  Ainda há tabelas com problemas.');
    console.log('Certifique-se de que o script SQL foi executado corretamente no dashboard do Supabase.');
  }
}

// Executar teste
testTables().catch(console.error);