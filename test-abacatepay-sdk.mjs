#!/usr/bin/env node

// Importação e verificação do SDK
const pkg = await import('abacatepay-nodejs-sdk');
console.log('🔍 Analisando SDK da AbacatePay...');
console.log('Estrutura do pacote:', Object.keys(pkg));

let AbacatePaySdk;
if (pkg.default && pkg.default.default) {
  AbacatePaySdk = pkg.default.default;
} else if (typeof pkg.default === 'function') {
  AbacatePaySdk = pkg.default;
} else {
  console.log('❌ Não foi possível encontrar a exportação correta');
  console.log('Estrutura completa:', JSON.stringify(pkg, null, 2));
  process.exit(1);
}

console.log('✅ SDK encontrado:', typeof AbacatePaySdk);
console.log('\n🧪 Testando SDK oficial da AbacatePay...\n');

// Inicializar o SDK com a API key de desenvolvimento
const apiKey = 'abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n'; // Key de desenvolvimento do .env

let abacate;
try {
  abacate = AbacatePaySdk(apiKey);
} catch (e1) {
  try {
    abacate = new AbacatePaySdk(apiKey);
  } catch (e2) {
    console.log('❌ Erro ao inicializar SDK:');
    console.log('   Function call:', e1.message);
    console.log('   Constructor:', e2.message);
    process.exit(1);
  }
}

console.log('1. Testando criação de pagamento PIX via SDK oficial...');

async function testAbacatePaySDK() {
  try {
    const billing = await abacate.billing.create({
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        {
          externalId: "INGRESSO-VIP-CONFERENCIA",
          name: "Ingresso VIP - Conferência de Mulheres Queren Hapuque",
          quantity: 1,
          price: 25000 // R$ 250.00 em centavos
        }
      ],
      returnUrl: "http://localhost:3005/payment/return",
      completionUrl: "http://localhost:3005/payment/success",
      customer: {
        name: "Teste SDK AbacatePay",
        email: "teste@sdkabacatepay.com",
        cellphone: "+5511999999999",
        taxId: "12345678901"
      }
    });

    console.log('   ✅ SDK AbacatePay - SUCESSO');
    console.log('   📋 Resposta completa:', JSON.stringify(billing, null, 2));
    console.log(`   📝 Bill ID: ${billing?.id || 'N/A'}`);
    console.log(`   🔗 Payment URL: ${billing?.url || 'N/A'}`);
    console.log(`   💰 Valor: R$ ${billing?.amount ? (billing.amount / 100).toFixed(2) : 'N/A'}`);
    console.log(`   📧 Customer: ${billing?.customer?.metadata?.email || billing?.customer?.email || 'N/A'}`);
    console.log(`   🎯 Status: ${billing?.status || 'N/A'}`);
    console.log(`   🧪 Dev Mode: ${billing?.devMode || 'N/A'}`);
    console.log(`   📅 Created: ${billing?.createdAt || 'N/A'}`);

    return billing;

  } catch (error) {
    console.log('   ❌ SDK AbacatePay - ERRO');
    console.log(`   Tipo: ${error.name || 'Erro desconhecido'}`);
    console.log(`   Mensagem: ${error.message || 'N/A'}`);
    console.log(`   Status: ${error.status || 'N/A'}`);
    
    if (error.response) {
      console.log(`   Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    throw error;
  }
}

// Executar teste
try {
  await testAbacatePaySDK();
  console.log('\n🏁 Teste do SDK AbacatePay concluído com SUCESSO!');
} catch (error) {
  console.log('\n🏁 Teste do SDK AbacatePay concluído com ERRO!');
}
