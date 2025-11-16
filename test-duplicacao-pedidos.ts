/**
 * Script de Teste: Detecção de Duplicação de Pedidos
 * 
 * Este script simula múltiplas tentativas de criar o mesmo pedido
 * para verificar se há duplicação no sistema.
 */

import { createClient } from '@supabase/supabase-js';

// Configuração - Substitua pelas suas credenciais
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/criar-cobranca-optimized`;

// Dados de teste
const TEST_ORDER_DATA = {
  customer: {
    name: 'Teste Duplicação',
    email: `teste.duplicacao.${Date.now()}@teste.com`,
    phone: '11999999999',
    document: '12345678901' // CPF de teste
  },
  amount: 90000, // R$ 900,00 em centavos
  description: 'Teste de duplicação de pedidos',
  items: [
    {
      nome: 'Ingresso Teste',
      quantidade: 10,
      preco: 9000 // R$ 90,00 em centavos
    }
  ]
};

interface TestResult {
  attempt: number;
  success: boolean;
  external_id?: string;
  payment_id?: string;
  order_id?: string;
  error?: string;
  timestamp: string;
}

/**
 * Função para criar um pedido
 */
async function createOrder(attemptNumber: number): Promise<TestResult> {
  const timestamp = new Date().toISOString();
  
  try {
    // Gerar external_id único para este teste
    const externalId = `teste_duplicacao_${Date.now()}_${attemptNumber}`;
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'x-idempotency-key': `test_key_${Date.now()}_${attemptNumber}`,
      },
      body: JSON.stringify({
        ...TEST_ORDER_DATA,
        external_id: externalId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        attempt: attemptNumber,
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
        timestamp
      };
    }

    const result = await response.json();
    
    return {
      attempt: attemptNumber,
      success: true,
      external_id: result.data?.external_id || externalId,
      payment_id: result.data?.pix?.id || result.data?.id,
      order_id: result.data?.id,
      timestamp
    };
  } catch (error: any) {
    return {
      attempt: attemptNumber,
      success: false,
      error: error.message,
      timestamp
    };
  }
}

/**
 * Função para verificar duplicatas no banco
 */
async function checkDuplicates(externalId: string, paymentId: string): Promise<any[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Verificar por external_id
  const { data: ordersByExternalId, error: error1 } = await supabase
    .from('orders')
    .select('*')
    .eq('external_id', externalId);

  // Verificar por payment_id
  const { data: ordersByPaymentId, error: error2 } = await supabase
    .from('orders')
    .select('*')
    .eq('payment_id', paymentId);

  if (error1 || error2) {
    console.error('Erro ao verificar duplicatas:', error1 || error2);
    return [];
  }

  // Combinar resultados e remover duplicatas
  const allOrders = [...(ordersByExternalId || []), ...(ordersByPaymentId || [])];
  const uniqueOrders = allOrders.filter((order, index, self) => 
    index === self.findIndex((o) => o.id === order.id)
  );

  return uniqueOrders;
}

/**
 * Teste 1: Criar múltiplos pedidos com o mesmo external_id
 */
async function testSameExternalId() {
  console.log('\n🧪 TESTE 1: Criar múltiplos pedidos com o mesmo external_id');
  console.log('=' .repeat(60));
  
  const externalId = `teste_same_external_${Date.now()}`;
  const results: TestResult[] = [];
  
  // Tentar criar 3 pedidos com o mesmo external_id
  for (let i = 1; i <= 3; i++) {
    console.log(`\n📝 Tentativa ${i}/3...`);
    const result = await createOrder(i);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Pedido criado: ${result.external_id}`);
    } else {
      console.log(`❌ Erro: ${result.error}`);
    }
    
    // Pequeno delay entre tentativas
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Verificar duplicatas
  if (results[0].external_id) {
    const duplicates = await checkDuplicates(results[0].external_id, results[0].payment_id || '');
    console.log(`\n🔍 Duplicatas encontradas: ${duplicates.length}`);
    if (duplicates.length > 1) {
      console.log('❌ PROBLEMA: Múltiplos pedidos com o mesmo external_id!');
      duplicates.forEach((order, index) => {
        console.log(`  ${index + 1}. ID: ${order.id}, External ID: ${order.external_id}, Payment ID: ${order.payment_id}`);
      });
    } else {
      console.log('✅ OK: Apenas um pedido com este external_id');
    }
  }
  
  return results;
}

/**
 * Teste 2: Criar pedidos simultâneos (condição de corrida)
 */
async function testConcurrentOrders() {
  console.log('\n🧪 TESTE 2: Criar pedidos simultâneos (condição de corrida)');
  console.log('=' .repeat(60));
  
  const externalId = `teste_concurrent_${Date.now()}`;
  const promises: Promise<TestResult>[] = [];
  
  // Criar 5 pedidos simultaneamente
  for (let i = 1; i <= 5; i++) {
    promises.push(createOrder(i));
  }
  
  console.log('\n🚀 Criando 5 pedidos simultaneamente...');
  const results = await Promise.all(promises);
  
  const successResults = results.filter(r => r.success);
  console.log(`\n✅ Pedidos criados com sucesso: ${successResults.length}/5`);
  
  // Verificar duplicatas
  if (successResults.length > 0) {
    const firstResult = successResults[0];
    const duplicates = await checkDuplicates(
      firstResult.external_id || externalId,
      firstResult.payment_id || ''
    );
    
    console.log(`\n🔍 Pedidos únicos encontrados: ${duplicates.length}`);
    if (duplicates.length > 1) {
      console.log('❌ PROBLEMA: Múltiplos pedidos criados simultaneamente!');
      duplicates.forEach((order, index) => {
        console.log(`  ${index + 1}. ID: ${order.id}, External ID: ${order.external_id}, Payment ID: ${order.payment_id}`);
      });
    } else {
      console.log('✅ OK: Apenas um pedido criado (idempotência funcionando)');
    }
  }
  
  return results;
}

/**
 * Teste 3: Criar pedidos com o mesmo payment_id (do AbacatePay)
 */
async function testSamePaymentId() {
  console.log('\n🧪 TESTE 3: Verificar se payment_id é único');
  console.log('=' .repeat(60));
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Buscar pedidos com o mesmo payment_id
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, external_id, payment_id, customer_email, total_amount, created_at')
    .not('payment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('❌ Erro ao buscar pedidos:', error);
    return;
  }
  
  // Agrupar por payment_id
  const paymentIdGroups: { [key: string]: any[] } = {};
  orders?.forEach(order => {
    if (order.payment_id) {
      if (!paymentIdGroups[order.payment_id]) {
        paymentIdGroups[order.payment_id] = [];
      }
      paymentIdGroups[order.payment_id].push(order);
    }
  });
  
  // Encontrar duplicatas
  const duplicates = Object.entries(paymentIdGroups).filter(([_, orders]) => orders.length > 1);
  
  console.log(`\n🔍 Pedidos analisados: ${orders?.length || 0}`);
  console.log(`🔍 Payment IDs únicos: ${Object.keys(paymentIdGroups).length}`);
  console.log(`🔍 Duplicatas encontradas: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\n❌ PROBLEMA: Encontrados pedidos duplicados com o mesmo payment_id:');
    duplicates.forEach(([paymentId, orders]) => {
      console.log(`\n  Payment ID: ${paymentId}`);
      orders.forEach((order, index) => {
        console.log(`    ${index + 1}. Order ID: ${order.id}, External ID: ${order.external_id}, Cliente: ${order.customer_email}`);
      });
    });
  } else {
    console.log('\n✅ OK: Nenhuma duplicata encontrada por payment_id');
  }
  
  return duplicates;
}

/**
 * Teste 4: Verificar constraints do banco
 */
async function testDatabaseConstraints() {
  console.log('\n🧪 TESTE 4: Verificar constraints do banco de dados');
  console.log('=' .repeat(60));
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Tentar inserir pedido duplicado diretamente no banco
  const testOrder = {
    external_id: `teste_constraint_${Date.now()}`,
    payment_id: `teste_payment_${Date.now()}`,
    customer_email: 'teste@teste.com',
    customer_name: 'Teste',
    total_amount: 10000,
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'pix'
  };
  
  // Inserir primeiro pedido
  const { data: firstOrder, error: error1 } = await supabase
    .from('orders')
    .insert([testOrder])
    .select()
    .single();
  
  if (error1) {
    console.log(`❌ Erro ao inserir primeiro pedido: ${error1.message}`);
    return;
  }
  
  console.log(`✅ Primeiro pedido inserido: ${firstOrder.id}`);
  
  // Tentar inserir pedido duplicado com o mesmo external_id
  const { error: error2 } = await supabase
    .from('orders')
    .insert([{ ...testOrder, id: undefined }])
    .select();
  
  if (error2) {
    if (error2.code === '23505') {
      console.log('✅ Constraint UNIQUE funcionando para external_id!');
    } else {
      console.log(`❌ Erro inesperado: ${error2.message} (código: ${error2.code})`);
    }
  } else {
    console.log('❌ PROBLEMA: Pedido duplicado foi inserido (constraint não funciona)');
  }
  
  // Tentar inserir pedido duplicado com o mesmo payment_id
  const { error: error3 } = await supabase
    .from('orders')
    .insert([{
      ...testOrder,
      external_id: `teste_constraint_${Date.now()}_2`,
      id: undefined
    }])
    .select();
  
  if (error3) {
    if (error3.code === '23505') {
      console.log('✅ Constraint UNIQUE funcionando para payment_id!');
    } else {
      console.log(`❌ Erro inesperado: ${error3.message} (código: ${error3.code})`);
    }
  } else {
    console.log('❌ PROBLEMA: Pedido duplicado foi inserido com mesmo payment_id (constraint não funciona)');
  }
  
  // Limpar pedidos de teste
  if (firstOrder) {
    await supabase.from('orders').delete().eq('id', firstOrder.id);
    console.log('🧹 Pedidos de teste removidos');
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando testes de duplicação de pedidos...');
  console.log('=' .repeat(60));
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas');
    console.error('   Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  try {
    // Executar testes
    await testDatabaseConstraints();
    await testSamePaymentId();
    // await testSameExternalId(); // Descomente para testar criação de pedidos
    // await testConcurrentOrders(); // Descomente para testar condições de corrida
    
    console.log('\n✅ Testes concluídos!');
  } catch (error: any) {
    console.error('\n❌ Erro durante os testes:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  main();
}

export { testSameExternalId, testConcurrentOrders, testSamePaymentId, testDatabaseConstraints };

