const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  console.log('🔍 Verificando estado do banco de dados...');
  
  try {
    // Verificar tabelas existentes
    console.log('\n📋 Verificando tabelas:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('❌ Erro ao buscar tabelas:', tablesError);
    } else {
      console.log('✅ Tabelas encontradas:', tables.map(t => t.table_name));
    }
    
    // Verificar produtos
    console.log('\n🛍️ Verificando produtos:');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(5);
    
    if (productsError) {
      console.error('❌ Erro ao buscar produtos:', productsError);
    } else {
      console.log('✅ Produtos encontrados:', products?.length || 0);
      if (products && products.length > 0) {
        console.log('📦 Primeiro produto:', {
          id: products[0].id,
          name: products[0].name,
          image_url: products[0].image_url,
          price: products[0].price
        });
      }
    }
    
    // Verificar eventos
    console.log('\n🎫 Verificando eventos:');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(5);
    
    if (eventsError) {
      console.error('❌ Erro ao buscar eventos:', eventsError);
    } else {
      console.log('✅ Eventos encontrados:', events?.length || 0);
      if (events && events.length > 0) {
        console.log('🎪 Primeiro evento:', {
          id: events[0].id,
          name: events[0].name,
          price: events[0].price
        });
      }
    }
    
    // Verificar carrinho de compras
    console.log('\n🛒 Verificando tabela cart_items:');
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('*')
      .limit(5);
    
    if (cartError) {
      console.error('❌ Erro ao buscar itens do carrinho:', cartError);
    } else {
      console.log('✅ Itens do carrinho encontrados:', cartItems?.length || 0);
    }
    
    // Verificar pedidos
    console.log('\n📦 Verificando tabela orders:');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(5);
    
    if (ordersError) {
      console.error('❌ Erro ao buscar pedidos:', ordersError);
    } else {
      console.log('✅ Pedidos encontrados:', orders?.length || 0);
    }
    
    // Verificar profiles
    console.log('\n👤 Verificando tabela profiles:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Erro ao buscar perfis:', profilesError);
    } else {
      console.log('✅ Perfis encontrados:', profiles?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugDatabase();