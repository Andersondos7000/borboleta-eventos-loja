/**
 * Script para corrigir order_items faltantes para pedidos de roupas
 * 
 * Este script:
 * 1. Busca pedidos associados a um customer_id específico
 * 2. Verifica se os pedidos têm order_items com product_id
 * 3. Se não tiverem, recria os order_items baseado nos dados do pedido
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

/**
 * Busca pedidos por customer_id (external_id do customer)
 */
async function buscarPedidosPorCustomer(customerExternalId: string) {
  console.log(`🔍 Buscando pedidos para customer: ${customerExternalId}`);
  
  // Primeiro, buscar o customer pelo external_id
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, external_id, email')
    .eq('external_id', customerExternalId)
    .maybeSingle();
  
  if (customerError) {
    console.error('❌ Erro ao buscar customer:', customerError);
    return [];
  }
  
  if (!customer) {
    console.log(`⚠️ Customer não encontrado: ${customerExternalId}`);
    // Tentar buscar pedidos pelo email se o customer tiver email
    return [];
  }
  
  console.log(`✅ Customer encontrado: ${customer.id} (${customer.email || 'sem email'})`);
  
  // Buscar pedidos pelo customer_id ou pelo email
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .or(`customer_id.eq.${customer.id},customer_email.eq.${customer.email || ''}`)
    .order('created_at', { ascending: false });
  
  if (ordersError) {
    console.error('❌ Erro ao buscar pedidos:', ordersError);
    return [];
  }
  
  console.log(`✅ Encontrados ${orders?.length || 0} pedidos`);
  return orders || [];
}

/**
 * Verifica se um pedido tem order_items com product_id
 */
async function verificarOrderItems(orderId: string) {
  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select('id, product_id, ticket_id, name, quantity, price')
    .eq('order_id', orderId);
  
  if (error) {
    console.error(`❌ Erro ao verificar order_items do pedido ${orderId}:`, error);
    return { hasItems: false, items: [], hasProductId: false };
  }
  
  const hasProductId = orderItems?.some(item => item.product_id !== null) || false;
  
  return {
    hasItems: (orderItems?.length || 0) > 0,
    items: orderItems || [],
    hasProductId
  };
}

/**
 * Recria order_items baseado nos dados do pedido
 */
async function recriarOrderItems(order: any) {
  console.log(`📦 Recriando order_items para pedido ${order.id}`);
  
  // Tentar extrair itens de diferentes fontes
  let items: any[] = [];
  
  // 1. Tentar do campo items (JSON)
  if (order.items && typeof order.items === 'object') {
    if (Array.isArray(order.items)) {
      items = order.items;
    } else if (order.items.items && Array.isArray(order.items.items)) {
      items = order.items.items;
    }
  }
  
  // 2. Tentar do payment_data (JSON)
  if (items.length === 0 && order.payment_data) {
    const paymentData = typeof order.payment_data === 'string' 
      ? JSON.parse(order.payment_data) 
      : order.payment_data;
    
    if (paymentData.items && Array.isArray(paymentData.items)) {
      items = paymentData.items;
    } else if (paymentData.products && Array.isArray(paymentData.products)) {
      items = paymentData.products.map((p: any) => ({
        nome: p.name || p.nome,
        quantidade: p.quantity || p.quantidade,
        preco: p.price || p.preco || p.unit_price,
        product_id: p.product_id,
        size: p.size
      }));
    }
  }
  
  // 3. Tentar do customer_data (JSON)
  if (items.length === 0 && order.customer_data) {
    const customerData = typeof order.customer_data === 'string'
      ? JSON.parse(order.customer_data)
      : order.customer_data;
    
    if (customerData.items && Array.isArray(customerData.items)) {
      items = customerData.items;
    }
  }
  
  if (items.length === 0) {
    console.warn(`⚠️ Não foi possível extrair itens do pedido ${order.id}`);
    console.log('   Dados disponíveis:', {
      hasItems: !!order.items,
      hasPaymentData: !!order.payment_data,
      hasCustomerData: !!order.customer_data
    });
    return { success: false, message: 'Não foi possível extrair itens do pedido' };
  }
  
  console.log(`📋 Itens extraídos: ${items.length}`);
  
  // Buscar produtos existentes para mapear product_id
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, category');
  
  if (productsError) {
    console.error('❌ Erro ao buscar produtos:', productsError);
    return { success: false, message: 'Erro ao buscar produtos' };
  }
  
  // Criar order_items
  const orderItems = await Promise.all(items.map(async (item: any, index: number) => {
    const nome = item.nome || item.name || item.title || '';
    const quantidade = item.quantidade || item.quantity || 1;
    const preco = item.preco || item.price || item.unit_price || 0;
    const size = item.size || null;
    
    // Tentar encontrar product_id
    let productId = item.product_id || null;
    
    if (!productId && nome) {
      // Buscar produto por nome (case-insensitive)
      const matchingProduct = products?.find(p => 
        p.name.toLowerCase().trim() === nome.toLowerCase().trim()
      );
      
      if (matchingProduct) {
        productId = matchingProduct.id;
        console.log(`  ✅ Produto mapeado: ${nome} -> ${productId}`);
      } else {
        // Verificar se o nome contém palavras-chave de roupas
        const nomeLower = nome.toLowerCase();
        const isClothing = nomeLower.includes('camiseta') || 
                          nomeLower.includes('camisa') || 
                          nomeLower.includes('blusa') || 
                          nomeLower.includes('vestido') ||
                          nomeLower.includes('roupa');
        
        if (isClothing) {
          console.warn(`  ⚠️ Produto de roupa não encontrado: ${nome}`);
          // Não criar order_item sem product_id para roupas
          return null;
        }
      }
    }
    
    // Se não tem product_id e não é roupa, pode ser ingresso (não processar aqui)
    if (!productId) {
      console.warn(`  ⚠️ Item sem product_id: ${nome}`);
      return null;
    }
    
    return {
      order_id: order.id,
      product_id: productId,
      quantity: quantidade,
      price: preco,
      unit_price: preco,
      total_price: preco * quantidade,
      size: size,
      ticket_id: null,
      name: nome,
      created_at: new Date().toISOString()
    };
  }));
  
  // Filtrar nulls
  const validOrderItems = orderItems.filter(item => item !== null) as any[];
  
  if (validOrderItems.length === 0) {
    console.warn(`⚠️ Nenhum order_item válido criado para pedido ${order.id}`);
    return { success: false, message: 'Nenhum order_item válido' };
  }
  
  console.log(`✅ Criando ${validOrderItems.length} order_items...`);
  
  // Inserir order_items
  const { data: insertedItems, error: insertError } = await supabase
    .from('order_items')
    .insert(validOrderItems)
    .select();
  
  if (insertError) {
    console.error('❌ Erro ao criar order_items:', insertError);
    return { success: false, message: insertError.message };
  }
  
  console.log(`✅ ${insertedItems?.length || 0} order_items criados com sucesso!`);
  
  return { success: true, items: insertedItems };
}

/**
 * Função principal
 */
async function corrigirOrderItemsRoupas(customerExternalId: string) {
  console.log('🚀 Iniciando correção de order_items para roupas...\n');
  
  // Buscar pedidos
  const orders = await buscarPedidosPorCustomer(customerExternalId);
  
  if (orders.length === 0) {
    console.log('⚠️ Nenhum pedido encontrado');
    return;
  }
  
  // Verificar cada pedido
  let corrigidos = 0;
  let comProblemas = 0;
  
  for (const order of orders) {
    console.log(`\n📦 Verificando pedido ${order.id}...`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Payment Status: ${order.payment_status}`);
    console.log(`   Total: R$ ${order.total_amount || order.total || 0}`);
    
    const { hasItems, items, hasProductId } = await verificarOrderItems(order.id);
    
    console.log(`   Order Items: ${items.length}`);
    console.log(`   Tem product_id: ${hasProductId}`);
    
    if (!hasItems || !hasProductId) {
      console.log(`   ⚠️ Pedido precisa de correção`);
      comProblemas++;
      
      // Recriar order_items
      const result = await recriarOrderItems(order);
      
      if (result.success) {
        corrigidos++;
        console.log(`   ✅ Pedido corrigido com sucesso!`);
      } else {
        console.log(`   ❌ Erro ao corrigir pedido: ${result.message}`);
      }
    } else {
      console.log(`   ✅ Pedido está correto`);
    }
  }
  
  console.log(`\n📊 Resumo:`);
  console.log(`   Total de pedidos: ${orders.length}`);
  console.log(`   Pedidos com problemas: ${comProblemas}`);
  console.log(`   Pedidos corrigidos: ${corrigidos}`);
}

// Executar se chamado diretamente
if (require.main === module) {
  const customerExternalId = process.argv[2] || 'cust_bnNnB52Z5FJxtjmDQLbe5tEZ';
  
  corrigirOrderItemsRoupas(customerExternalId)
    .then(() => {
      console.log('\n✅ Processo concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro:', error);
      process.exit(1);
    });
}

export { corrigirOrderItemsRoupas };



