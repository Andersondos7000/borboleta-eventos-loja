/**
 * Script de teste para simular múltiplas requisições simultâneas de criação de pedido
 * Este teste verifica se o sistema previne duplicatas corretamente
 */

const SUPABASE_URL = 'https://ojxmfxbflbfinodkhixk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeG1meGJmbGJmaW5vZGtoaXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjUwODAsImV4cCI6MjA3MDUwMTA4MH0.CNziCYvVGA3EUXSJfigtSGuYYiOn7wGE9FfBxlLsE-o';

// Dados do pedido de teste (mesmos dados para todas as requisições)
const orderData = {
  customer: {
    name: 'Teste Duplicação',
    email: `teste.duplicacao.${Date.now()}@test.com`, // Email único para este teste
    document: '33883708852', // CPF válido para teste
    phone: '11999999999'
  },
  amount: 10000, // R$ 100,00 em centavos
  description: 'Teste de duplicação de pedidos',
  items: [
    {
      nome: 'Produto Teste',
      quantidade: 1,
      preco: 10000
    }
  ]
  // Não incluir external_id aqui - será gerado automaticamente pelo frontend
};

// Gerar idempotency key baseada nos dados (igual ao frontend)
function generateIdempotencyKey(data: typeof orderData): string {
  const sortedItems = [...data.items].sort((a, b) => {
    const nomeA = (a.nome || '').toLowerCase();
    const nomeB = (b.nome || '').toLowerCase();
    return nomeA.localeCompare(nomeB);
  });

  const keyData = {
    email: data.customer.email.toLowerCase().trim(),
    amount: data.amount,
    items: sortedItems.map(item => {
      const nome = (item.nome || '').toLowerCase().trim();
      const quantidade = item.quantidade || 0;
      const preco = Math.round(item.preco || 0);
      return `${nome}:${quantidade}:${preco}`;
    }).join('|')
  };

  const keyString = JSON.stringify(keyData);
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    const char = keyString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `payment_${Math.abs(hash).toString(36)}`;
}

// Gerar external_id baseado na idempotency key
function generateExternalId(idempotencyKey: string): string {
  return `pedido_${idempotencyKey.replace('payment_', '')}`;
}

async function criarPedido(idempotencyKey: string, externalId: string, requestNumber: number): Promise<any> {
  const startTime = Date.now();
  console.log(`[Requisição ${requestNumber}] Iniciando criação de pedido...`);
  console.log(`[Requisição ${requestNumber}] Idempotency Key: ${idempotencyKey}`);
  console.log(`[Requisição ${requestNumber}] External ID: ${externalId}`);

  try {
    // Não incluir external_id no body - a função deve gerar baseado nos dados
    const response = await fetch(`${SUPABASE_URL}/functions/v1/criar-cobranca-optimized`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(orderData) // Não incluir external_id - será gerado pela função
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    const responseData = await response.json();

    console.log(`[Requisição ${requestNumber}] Status: ${response.status}`);
    console.log(`[Requisição ${requestNumber}] Duração: ${duration}ms`);
    console.log(`[Requisição ${requestNumber}] Resposta:`, JSON.stringify(responseData, null, 2));

    return {
      requestNumber,
      status: response.status,
      duration,
      data: responseData,
      idempotencyKey,
      externalId
    };
  } catch (error: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error(`[Requisição ${requestNumber}] Erro:`, error.message);
    return {
      requestNumber,
      status: 'error',
      duration,
      error: error.message,
      idempotencyKey,
      externalId
    };
  }
}

async function executarTeste() {
  console.log('🧪 Iniciando teste de duplicação de pedidos...\n');
  console.log('📋 Dados do pedido:');
  console.log(JSON.stringify(orderData, null, 2));
  console.log('\n');

  // Gerar idempotency key e external_id (mesmos para todas as requisições)
  // IMPORTANTE: A função backend também deve gerar o mesmo external_id baseado nos dados
  const idempotencyKey = generateIdempotencyKey(orderData);
  const externalId = generateExternalId(idempotencyKey);

  console.log('🔑 Idempotency Key:', idempotencyKey);
  console.log('🆔 External ID (esperado):', externalId);
  console.log('⚠️  NOTA: O backend deve gerar o mesmo external_id baseado nos dados do pedido');
  console.log('\n');

  // Fazer 5 requisições simultâneas
  const NUM_REQUESTS = 5;
  console.log(`🚀 Enviando ${NUM_REQUESTS} requisições simultâneas...\n`);

  const requests = Array.from({ length: NUM_REQUESTS }, (_, i) => 
    criarPedido(idempotencyKey, externalId, i + 1)
  );

  const results = await Promise.all(requests);

  console.log('\n📊 Resultados do teste:');
  console.log('='.repeat(80));

  const successCount = results.filter(r => r.status === 200).length;
  const errorCount = results.filter(r => r.status !== 200).length;
  const uniqueOrderIds = new Set(results.map(r => r.data?.order?.id).filter(Boolean));
  const uniquePaymentIds = new Set(results.map(r => r.data?.payment_id).filter(Boolean));

  console.log(`✅ Requisições bem-sucedidas: ${successCount}/${NUM_REQUESTS}`);
  console.log(`❌ Requisições com erro: ${errorCount}/${NUM_REQUESTS}`);
  console.log(`🆔 IDs de pedidos únicos: ${uniqueOrderIds.size}`);
  console.log(`💳 IDs de pagamento únicos: ${uniquePaymentIds.size}`);

  console.log('\n📝 Detalhes das requisições:');
  results.forEach(result => {
    console.log(`\n[Requisição ${result.requestNumber}]:`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Duração: ${result.duration}ms`);
    if (result.data?.order?.id) {
      console.log(`  Order ID: ${result.data.order.id}`);
    }
    if (result.data?.payment_id) {
      console.log(`  Payment ID: ${result.data.payment_id}`);
    }
    if (result.error) {
      console.log(`  Erro: ${result.error}`);
    }
  });

  // Análise
  console.log('\n🔍 Análise:');
  if (uniqueOrderIds.size === 1) {
    console.log('✅ SUCESSO: Apenas um pedido foi criado (sem duplicatas)');
  } else if (uniqueOrderIds.size > 1) {
    console.log(`⚠️  ATENÇÃO: ${uniqueOrderIds.size} pedidos diferentes foram criados (possível duplicação)`);
  } else {
    console.log('❌ ERRO: Nenhum pedido foi criado');
  }

  if (uniquePaymentIds.size === 1) {
    console.log('✅ SUCESSO: Apenas um payment_id foi criado (sem duplicatas)');
  } else if (uniquePaymentIds.size > 1) {
    console.log(`⚠️  ATENÇÃO: ${uniquePaymentIds.size} payment_ids diferentes foram criados (possível duplicação)`);
  } else {
    console.log('❌ ERRO: Nenhum payment_id foi criado');
  }

  // Verificar se todas as requisições retornaram o mesmo pedido
  const orderIds = results.map(r => r.data?.order?.id).filter(Boolean);
  const allSame = orderIds.length > 0 && orderIds.every(id => id === orderIds[0]);
  
  if (allSame) {
    console.log('✅ SUCESSO: Todas as requisições retornaram o mesmo pedido (idempotência funcionando)');
  } else {
    console.log('⚠️  ATENÇÃO: Requisições retornaram pedidos diferentes');
  }
}

// Executar teste
executarTeste().catch(console.error);

