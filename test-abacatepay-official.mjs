#!/usr/bin/env node

// Testando diferentes formas de importação
console.log('🔍 Analisando SDK da AbacatePay...\n');

let AbacatePay;
try {
  // Tentar importação direta
  const pkg = await import('abacatepay-nodejs-sdk');
  console.log('Estrutura do pacote:', Object.keys(pkg));
  
  if (pkg.default && typeof pkg.default === 'function') {
    AbacatePay = pkg.default;
  } else if (pkg.default && pkg.default.default && typeof pkg.default.default === 'function') {
    AbacatePay = pkg.default.default;
  } else {
    console.log('❌ Não foi possível encontrar função construtora');
    console.log('Default type:', typeof pkg.default);
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Erro na importação:', error.message);
  process.exit(1);
}

console.log('✅ SDK importado com sucesso!');
console.log('🧪 Testando SDK oficial da AbacatePay...\n');

// Inicializar o cliente com a API key de desenvolvimento
const apiKey = 'abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n';

let abacate;
try {
  abacate = AbacatePay(apiKey);
  console.log('✅ Cliente inicializado com sucesso!');
} catch (error) {
  console.log('❌ Erro ao inicializar cliente:', error.message);
  process.exit(1);
}

console.log('1. Testando criação de pagamento PIX via SDK oficial...');

// Implementação exata da documentação oficial
async function createPixPayment() {
  try {
    const billing = await abacate.billing.create({
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        {
          externalId: "INGRESSO-VIP-CONFERENCIA",
          name: "Ingresso VIP - Conferência de Mulheres",
          quantity: 1,
          price: 25000 // Amount in cents (R$ 250.00)
        }
      ],
      returnUrl: "http://localhost:3005/payment/return",
      completionUrl: "http://localhost:3005/payment/success",
      customer: {
        name: 'Teste Conferência Mulheres',
        email: 'teste@conferenciamulheres.com',
        cellphone: '+5511999999999',
        taxId: '12345678901'
      }
    });

    console.log('   ✅ SDK AbacatePay - SUCESSO');
    console.log('   📋 Resposta completa:', JSON.stringify(billing, null, 2));
    
    if (billing && typeof billing === 'object') {
      console.log(`   📝 Bill ID: ${billing.id || 'N/A'}`);
      console.log(`   🔗 Payment URL: ${billing.url || 'N/A'}`);
      console.log(`   💰 Valor: R$ ${billing.amount ? (billing.amount / 100).toFixed(2) : 'N/A'}`);
      console.log(`   🎯 Status: ${billing.status || 'N/A'}`);
      console.log(`   🧪 Dev Mode: ${billing.devMode ? 'true' : 'false'}`);
      console.log(`   📅 Created: ${billing.createdAt || 'N/A'}`);
      console.log(`   📧 Customer Email: ${billing.customer?.metadata?.email || billing.customer?.email || 'N/A'}`);
    }

    return billing;

  } catch (error) {
    console.log('   ❌ SDK AbacatePay - ERRO');
    console.log(`   Nome: ${error.name || 'Erro desconhecido'}`);
    console.log(`   Mensagem: ${error.message || 'N/A'}`);
    console.log(`   Status: ${error.status || error.statusCode || 'N/A'}`);
    
    if (error.response) {
      console.log(`   Response Status: ${error.response.status || 'N/A'}`);
      console.log(`   Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    if (error.data) {
      console.log(`   Error Data: ${JSON.stringify(error.data, null, 2)}`);
    }
    
    throw error;
  }
}

// Executar teste
try {
  await createPixPayment();
  console.log('\n🏁 Teste do SDK AbacatePay concluído com SUCESSO!');
} catch (error) {
  console.log('\n🏁 Teste do SDK AbacatePay concluído com ERRO!');
  console.log(`Final error: ${error.message}`);
}
