#!/usr/bin/env node

import https from 'https';

const SUPABASE_URL = 'https://pxcvoiffnandpdyotped.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3ZvaWZmbmFuZHBkeW90cGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTI0OTEsImV4cCI6MjA0ODk4ODQ5MX0.sOOVF9R3vHOB4FJ_f0pVHGQXgVWYJ9rNEuKZpMx7SYo';

console.log('🧪 Testando Edge Functions do Supabase...\n');

// Teste 1: Edge Function de Pagamento
console.log('1. Testando Edge Function create-abacate-payment...');

const testPaymentData = {
  items: [
    {
      name: "Ingresso VIP Conferência Mulheres",
      price: 25000, // R$ 250.00 em centavos
      quantity: 1
    }
  ],
  customer: {
    name: "Teste Edge Function",
    email: "teste@edgefunction.com",
    phone: "11999999999",
    cpf: "12345678901"
  }
};

const postData = JSON.stringify(testPaymentData);

const options = {
  hostname: 'pxcvoiffnandpdyotped.supabase.co',
  port: 443,
  path: '/functions/v1/create-abacate-payment',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`   Status Code: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(responseData);
      
      if (res.statusCode === 200) {
        console.log('   ✅ Edge Function - SUCESSO');
        console.log(`   📧 Email: ${response.order?.customer_email || 'N/A'}`);
        console.log(`   💰 Valor: R$ ${(response.order?.total_amount / 100).toFixed(2) || 'N/A'}`);
        console.log(`   🔗 PIX QR Code: ${response.pix_qr_code ? 'Gerado' : 'Não gerado'}`);
        console.log(`   📱 PIX Copy/Paste: ${response.pix_copy_paste ? 'Disponível' : 'Não disponível'}`);
        
        if (response.order?.id) {
          console.log(`   📝 Order ID: ${response.order.id}`);
        }
      } else {
        console.log('   ❌ Edge Function - ERRO');
        console.log(`   Erro: ${response.error || 'Erro desconhecido'}`);
        console.log(`   Detalhes: ${JSON.stringify(response, null, 2)}`);
      }
    } catch (e) {
      console.log('   ❌ Erro ao processar resposta:');
      console.log(`   Raw response: ${responseData}`);
      console.log(`   Parse error: ${e.message}`);
    }
    
    console.log('\n🏁 Teste de Edge Functions concluído!');
  });
});

req.on('error', (e) => {
  console.log(`   ❌ Erro de conexão: ${e.message}`);
  console.log('\n🏁 Teste de Edge Functions concluído com erro de conexão!');
});

req.write(postData);
req.end();
