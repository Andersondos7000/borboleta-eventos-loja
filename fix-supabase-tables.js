import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ Não definida');
  console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ Não definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTablesExistence() {
  console.log('🔍 Verificando quais tabelas existem no projeto...');
  
  const tablesToCheck = ['products', 'events', 'tickets', 'cart_items', 'profiles', 'orders'];
  const existingTables = [];
  const missingTables = [];
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          missingTables.push(table);
          console.log(`❌ ${table}: Tabela não existe`);
        } else {
          console.log(`⚠️ ${table}: ${error.message}`);
        }
      } else {
        existingTables.push(table);
        console.log(`✅ ${table}: Existe (${data?.length || 0} registros encontrados)`);
      }
    } catch (err) {
      missingTables.push(table);
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  console.log('\n📊 Resumo:');
  console.log('✅ Tabelas existentes:', existingTables);
  console.log('❌ Tabelas faltantes:', missingTables);
  
  return { existingTables, missingTables };
}

async function testTablesAccess() {
  console.log('\n🧪 Testando acesso às tabelas...');
  
  const tablesToTest = ['products', 'events', 'tickets', 'cart_items', 'profiles', 'orders'];
  
  for (const table of tablesToTest) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Acesso OK (${data?.length || 0} registros encontrados)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
}

async function main() {
  try {
    const { existingTables, missingTables } = await checkTablesExistence();
    
    if (missingTables.length > 0) {
      console.log('\n🔧 Para corrigir as tabelas faltantes, você precisa:');
      console.log('1. Acessar o dashboard do Supabase: https://supabase.com/dashboard/project/pxcvoiffnandpdyotped');
      console.log('2. Ir para SQL Editor');
      console.log('3. Executar o script check-missing-tables.sql');
      console.log('\nOu usar o Supabase CLI para aplicar as migrações locais.');
    }
    
    await testTablesAccess();
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

main();