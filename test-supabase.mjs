#!/usr/bin/env node

// Teste rápido de conectividade Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pxcvoiffnandpdyotped.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3ZvaWZmbmFuZHBkeW90cGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4ODE3MTIsImV4cCI6MjA2MTQ1NzcxMn0.nP5x007Tb89eGe4wpZFdayQ_gQ_mQzDeW_NKf4ugHM8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  console.log('🔍 Testando conectividade com Supabase...\n');

  try {
    // Teste 1: Verificar conexão básica
    console.log('1. Testando conexão básica...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('products')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.log('❌ Erro na conexão:', connectionError.message);
      return false;
    }
    console.log('✅ Conexão estabelecida com sucesso\n');

    // Teste 2: Verificar tabelas
    console.log('2. Verificando tabelas...');
    const tables = ['products', 'events', 'orders', 'cart_items'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${table}: Acessível`);
        }
      } catch (err) {
        console.log(`❌ Tabela ${table}: Erro inesperado`);
      }
    }
    console.log();

    // Teste 3: Verificar dados de produtos
    console.log('3. Verificando dados de produtos...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .limit(3);

    if (productsError) {
      console.log('❌ Erro ao buscar produtos:', productsError.message);
    } else if (!products || products.length === 0) {
      console.log('⚠️ Nenhum produto encontrado na base de dados');
    } else {
      console.log(`✅ ${products.length} produtos encontrados:`);
      products.forEach(p => console.log(`   - ${p.name} (R$ ${p.price})`));
    }
    console.log();

    // Teste 4: Verificar dados de eventos
    console.log('4. Verificando dados de eventos...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, date')
      .limit(3);

    if (eventsError) {
      console.log('❌ Erro ao buscar eventos:', eventsError.message);
    } else if (!events || events.length === 0) {
      console.log('⚠️ Nenhum evento encontrado na base de dados');
    } else {
      console.log(`✅ ${events.length} eventos encontrados:`);
      events.forEach(e => console.log(`   - ${e.name} (${e.date})`));
    }
    console.log();

    // Teste 5: Verificar autenticação
    console.log('5. Verificando sistema de autenticação...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.log('❌ Erro na autenticação:', authError.message);
    } else {
      if (session) {
        console.log(`✅ Usuário autenticado: ${session.user.email}`);
      } else {
        console.log('✅ Sistema de autenticação funcionando (sem usuário logado)');
      }
    }

    console.log('\n🎉 Teste de integração Supabase concluído!');
    console.log('📋 Acesse /admin/database na aplicação para testes mais detalhados.');
    
    return true;

  } catch (error) {
    console.log('❌ Erro geral:', error);
    return false;
  }
}

// Executar teste
testSupabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
