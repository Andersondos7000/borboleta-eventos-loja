import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ojxmfxbflbfinodkhixk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeG1meGJmbGJmaW5vZGtoaXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjUwODAsImV4cCI6MjA3MDUwMTA4MH0.CNziCYvVGA3EUXSJfigtSGuYYiOn7wGE9FfBxlLsE-o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAddToCart() {
  try {
    console.log('🔍 Testando Edge Function add-to-cart...');
    
    // Testando a função add-to-cart sem autenticação primeiro
    console.log('\n1. Testando add-to-cart sem autenticação...');
    
    const requestBody = {
      product_id: '3f14dd26-a96d-4ecf-bbd3-5193aceff4af', // ID de um produto existente
      quantity: 1,
      unit_price: 89.99,
      metadata: { size: 'M' }
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const { data, error } = await supabase.functions.invoke('add-to-cart', {
      body: requestBody
    });
    
    if (error) {
      console.error('❌ Erro na Edge Function:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return;
    }
    
    console.log('✅ Sucesso!');
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o teste
testAddToCart();