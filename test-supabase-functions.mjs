#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pxcvoiffnandpdyotped.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3ZvaWZmbmFuZHBkeW90cGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTI0OTEsImV4cCI6MjA0ODk4ODQ5MX0.sOOVF9R3vHOB4FJ_f0pVHGQXgVWYJ9rNEuKZpMx7SYo';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testando Edge Functions na aplicação real...\n');

// Teste da Edge Function diretamente via Supabase
console.log('1. Testando Edge Function create-abacate-payment via Supabase client...');

const testData = {
  items: [
    {
      name: "Ingresso VIP Conferência Mulheres",
      price: 25000,
      quantity: 1
    }
  ],
  customer: {
    name: "Teste Supabase Client",
    email: "teste@supabaseclient.com", 
    phone: "11999999999",
    cpf: "12345678901"
  }
};

try {
  const { data, error } = await supabase.functions.invoke('create-abacate-payment', {
    body: testData
  });

  if (error) {
    console.log('   ❌ Erro na Edge Function:');
    console.log(`   Código: ${error.status || 'N/A'}`);
    console.log(`   Mensagem: ${error.message || 'N/A'}`);
    console.log(`   Detalhes: ${JSON.stringify(error, null, 2)}`);
  } else {
    console.log('   ✅ Edge Function - SUCESSO');
    console.log(`   📧 Email: ${data?.order?.customer_email || 'N/A'}`);
    console.log(`   💰 Valor: R$ ${data?.order?.total_amount ? (data.order.total_amount / 100).toFixed(2) : 'N/A'}`);
    console.log(`   🔗 PIX QR Code: ${data?.pix_qr_code ? 'Gerado' : 'Não gerado'}`);
    console.log(`   📱 PIX Copy/Paste: ${data?.pix_copy_paste ? 'Disponível' : 'Não disponível'}`);
    
    if (data?.order?.id) {
      console.log(`   📝 Order ID: ${data.order.id}`);
    }
  }
} catch (err) {
  console.log('   ❌ Erro na requisição:');
  console.log(`   ${err.message}`);
}

console.log('\n🏁 Teste de Edge Functions concluído!');
