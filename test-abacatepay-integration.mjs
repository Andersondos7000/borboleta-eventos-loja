#!/usr/bin/env node

// Teste integrado: Criação de pagamento PIX + verificação de status
console.log('🔍 Teste integrado AbacatePay: pagamento + status + webhook (simulado)\n');

const API_KEY = process.env.ABACATE_PAY_API_KEY || process.env.VITE_ABACATE_PAY_TOKEN || 'abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n';
const ENDPOINT = 'https://api.abacatepay.com/v1/billing/create';
const CHECK_ENDPOINT = 'https://api.abacatepay.com/v1/pixQrCode/check';

async function createPixPayment() {
  const payload = {
    frequency: 'ONE_TIME',
    methods: ['PIX'],
    products: [
      {
        externalId: `test-${Date.now()}`,
        name: 'Produto Teste',
        quantity: 1,
        price: 1500 // R$ 15,00 em centavos
      }
    ],
    customer: {
      name: 'Daniel Lima',
      email: 'daniel_lima@abacatepay.com',
      cellphone: '1140028922',
      taxId: '33883708852'
    },
    returnUrl: 'http://localhost:3000/pagamento/cancelado',
    completionUrl: 'http://localhost:3000/pagamento/sucesso'
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log('📋 Resposta pagamento:', data);
  return data;
}

async function checkPaymentStatus(paymentId) {
  const res = await fetch(`${CHECK_ENDPOINT}?id=${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  console.log('📋 Status do pagamento:', data);
  return data;
}

async function simulateWebhook(paymentId) {
  // Simulação de recebimento de webhook
  console.log(`🔔 Simulando recebimento de webhook para pagamento ${paymentId}`);
  // Aqui você pode chamar localmente seu endpoint de webhook, se desejar
}

(async () => {
  try {
    const payment = await createPixPayment();
    if (payment && payment.id) {
      await checkPaymentStatus(payment.id);
      await simulateWebhook(payment.id);
    } else {
      console.log('❌ Falha ao criar pagamento PIX.');
    }
  } catch (err) {
    console.error('❌ Erro no teste integrado:', err);
  }
})();
