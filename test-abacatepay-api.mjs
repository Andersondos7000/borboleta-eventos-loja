#!/usr/bin/env node

import https from 'https';

console.log('🧪 Testando API AbacatePay diretamente...\n');

const apiKey = 'abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n';

const requestData = {
  frequency: "ONE_TIME",
  methods: ["PIX"],
  products: [
    {
      externalId: "INGRESSO-VIP-CONFERENCIA",
      name: "Ingresso VIP - Conferência de Mulheres",
      quantity: 1,
      price: 25000
    }
  ],
  returnUrl: "http://localhost:3005/payment/return",
  completionUrl: "http://localhost:3005/payment/success",
  customer: {
    name: "Teste API Direta",
    email: "teste@apidireta.com",
    cellphone: "+5511999999999",
    taxId: "12345678901"
  }
};

const postData = JSON.stringify(requestData);

const options = {
  hostname: 'api.abacatepay.com',
  port: 443,
  path: '/billing',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'AbacatePay-NodeJS-Test/1.0'
  }
};

console.log('1. Fazendo requisição direta para API AbacatePay...');
console.log(`   Endpoint: https://${options.hostname}${options.path}`);
console.log(`   API Key: ${apiKey.substring(0, 10)}...`);

const req = https.request(options, (res) => {
  console.log(`   Status Code: ${res.statusCode}`);
  console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(responseData);
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('   ✅ API AbacatePay - SUCESSO');
        console.log(`   📝 Bill ID: ${response.id || 'N/A'}`);
        console.log(`   🔗 Payment URL: ${response.url || 'N/A'}`);
        console.log(`   💰 Valor: R$ ${response.amount ? (response.amount / 100).toFixed(2) : 'N/A'}`);
        console.log(`   🎯 Status: ${response.status || 'N/A'}`);
        console.log(`   🧪 Dev Mode: ${response.devMode || 'N/A'}`);
      } else {
        console.log('   ❌ API AbacatePay - ERRO');
        console.log(`   Erro: ${response.error || response.message || 'Erro desconhecido'}`);
        console.log(`   Detalhes: ${JSON.stringify(response, null, 2)}`);
      }
    } catch (e) {
      console.log('   ❌ Erro ao processar resposta:');
      console.log(`   Raw response: ${responseData}`);
      console.log(`   Parse error: ${e.message}`);
    }
    
    console.log('\n🏁 Teste da API AbacatePay concluído!');
  });
});

req.on('error', (e) => {
  console.log(`   ❌ Erro de conexão: ${e.message}`);
  console.log('\n🏁 Teste da API AbacatePay concluído com erro de conexão!');
});

req.write(postData);
req.end();
