// Script para testar o endpoint de webhook manualmente
const https = require('https');

const webhookUrl = 'https://ojxmfxbflbfinodkhixk.supabase.co/functions/v1/webhook-abacatepay';

const testPayload = {
  event: 'billing.paid',
  data: {
    pixQrCode: {
      id: `pix_char_test_${Date.now()}`,
      status: 'PAID',
      amount: 10000,
      external_reference: `test-order-${Date.now()}`,
      customer: {
        metadata: {
          name: 'Teste Webhook',
          email: 'teste@example.com',
          cellphone: '11999999999',
          taxId: '12345678901'
        }
      }
    },
    payment: {
      amount: 10000,
      fee: 80,
      method: 'PIX'
    }
  },
  devMode: true
};

const data = JSON.stringify(testPayload);

console.log('====================================================');
console.log('🧪 TESTE DE WEBHOOK - ENDPOINT ABACATEPAY');
console.log('====================================================');
console.log('');
console.log('📡 Enviando webhook de teste...');
console.log('URL:', webhookUrl);
console.log('Payload:', JSON.stringify(testPayload, null, 2));
console.log('');

const url = new URL(webhookUrl);
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('');
    console.log('📥 Resposta do servidor:');
    try {
      const parsed = JSON.parse(responseData);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(responseData);
    }
    
    console.log('');
    console.log('====================================================');
    console.log('📊 Próximos passos:');
    console.log('====================================================');
    console.log('1. Verifique os logs do Supabase:');
    console.log('   npx supabase functions logs webhook-abacatepay --project-ref ojxmfxbflbfinodkhixk');
    console.log('2. Verifique o dashboard: http://localhost:8082/admin/webhooks');
    console.log('3. Verifique os webhooks no banco de dados');
    console.log('');
    
    if (res.statusCode === 200) {
      console.log('✅ Webhook enviado com sucesso!');
    } else {
      console.log(`⚠️ Webhook retornou status ${res.statusCode}`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro ao enviar webhook:');
  console.error(error);
});

req.write(data);
req.end();

