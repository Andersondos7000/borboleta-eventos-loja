import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.log('Certifique-se de que VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQLScript() {
  try {
    console.log('🚀 Executando script SQL no Supabase...');
    
    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'create-all-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir o SQL em comandos individuais (separados por ';')
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Encontrados ${sqlCommands.length} comandos SQL para executar`);
    
    // Executar cada comando
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command.trim()) {
        console.log(`⏳ Executando comando ${i + 1}/${sqlCommands.length}...`);
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: command
          });
          
          if (error) {
            console.error(`❌ Erro no comando ${i + 1}:`, error.message);
            // Continuar com os próximos comandos mesmo se um falhar
          } else {
            console.log(`✅ Comando ${i + 1} executado com sucesso`);
          }
        } catch (err) {
          console.error(`❌ Erro ao executar comando ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('\n🎉 Script SQL executado!');
    console.log('\n🧪 Testando acesso às tabelas...');
    
    // Testar acesso às tabelas
    const tables = ['products', 'events', 'tickets', 'cart_items', 'profiles', 'orders'];
    const results = [];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
          results.push({ table, status: 'error', message: error.message });
        } else {
          console.log(`✅ ${table}: Tabela acessível`);
          results.push({ table, status: 'success' });
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
        results.push({ table, status: 'error', message: err.message });
      }
    }
    
    // Resumo
    const successTables = results.filter(r => r.status === 'success');
    const errorTables = results.filter(r => r.status === 'error');
    
    console.log('\n📊 Resumo:');
    console.log(`✅ Tabelas funcionando: [${successTables.map(t => t.table).join(', ')}]`);
    console.log(`❌ Tabelas com problema: [${errorTables.map(t => t.table).join(', ')}]`);
    
    if (errorTables.length === 0) {
      console.log('\n🎉 Todas as tabelas foram criadas e estão funcionando!');
      console.log('Agora você pode reiniciar a aplicação e os erros devem estar resolvidos.');
    } else {
      console.log('\n⚠️  Ainda há tabelas com problemas.');
      console.log('Verifique os erros acima e execute o script novamente se necessário.');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    process.exit(1);
  }
}

// Executar o script
executeSQLScript();