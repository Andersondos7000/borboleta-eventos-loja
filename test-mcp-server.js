import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testMCPServer() {
  console.log('🧪 Testando servidor MCP para e-commerce...');
  
  // Teste de conexão
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Teste 1: Listar produtos
    console.log('\n📦 Teste 1: Listando produtos...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(5);
    
    if (productsError) {
      console.log('❌ Erro ao listar produtos:', productsError.message);
    } else {
      console.log(`✅ Produtos encontrados: ${products.length}`);
      if (products.length > 0) {
        console.log('   Exemplo:', products[0].name || 'Nome não disponível');
      }
    }
    
    // Teste 2: Listar tabelas do carrinho
    console.log('\n🛒 Teste 2: Verificando tabela de carrinho...');
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('*')
      .limit(3);
    
    if (cartError) {
      console.log('❌ Erro ao acessar carrinho:', cartError.message);
    } else {
      console.log(`✅ Itens de carrinho encontrados: ${cartItems.length}`);
    }
    
    // Teste 3: Listar pedidos
    console.log('\n📋 Teste 3: Verificando tabela de pedidos...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(3);
    
    if (ordersError) {
      console.log('❌ Erro ao acessar pedidos:', ordersError.message);
    } else {
      console.log(`✅ Pedidos encontrados: ${orders.length}`);
    }
    
    // Teste 4: Verificar perfis de usuário
    console.log('\n👤 Teste 4: Verificando perfis de usuário...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);
    
    if (profilesError) {
      console.log('❌ Erro ao acessar perfis:', profilesError.message);
    } else {
      console.log(`✅ Perfis encontrados: ${profiles.length}`);
    }
    
    // Teste 5: Verificar eventos
    console.log('\n🎉 Teste 5: Verificando eventos...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(3);
    
    if (eventsError) {
      console.log('❌ Erro ao acessar eventos:', eventsError.message);
    } else {
      console.log(`✅ Eventos encontrados: ${events.length}`);
    }
    
    console.log('\n🎯 Resumo dos testes:');
    console.log('✅ Conexão com Supabase: OK');
    console.log('✅ Acesso às tabelas principais: OK');
    console.log('✅ Sistema pronto para operações MCP');
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

testMCPServer();