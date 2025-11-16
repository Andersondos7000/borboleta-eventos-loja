/**
 * Script para diagnosticar por que um webhook não chegou
 * PIX ID: pix_char_kxSq0RnQGgxXP43qTXZAkkHc
 */

import { createClient } from '@supabase/supabase-js';

const PIX_ID = 'pix_char_kxSq0RnQGgxXP43qTXZAkkHc';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticarWebhook() {
  console.log('🔍 ========================================');
  console.log('🔍 DIAGNÓSTICO DE WEBHOOK NÃO RECEBIDO');
  console.log('🔍 ========================================');
  console.log(`📋 PIX ID: ${PIX_ID}`);
  console.log('');

  // 1. Verificar se existe webhook no banco de dados
  console.log('1️⃣ Verificando webhooks na tabela "webhooks"...');
  const { data: webhooks, error: webhooksError } = await supabase
    .from('webhooks')
    .select('*')
    .eq('source', 'abacatepay')
    .order('created_at', { ascending: false })
    .limit(100);

  if (webhooksError) {
    console.error('❌ Erro ao buscar webhooks:', webhooksError);
  } else {
    console.log(`✅ Encontrados ${webhooks?.length || 0} webhooks no banco`);
    
    // Procurar pelo PIX ID nos payloads
    const webhookEncontrado = webhooks?.find(webhook => {
      try {
        const payload = typeof webhook.payload === 'string' 
          ? JSON.parse(webhook.payload) 
          : webhook.payload;
        
        const pixId = payload?.data?.pixQrCode?.id || 
                     payload?.data?.payment?.id || 
                     payload?.data?.id ||
                     payload?.id;
        
        return pixId === PIX_ID;
      } catch (e) {
        return false;
      }
    });

    if (webhookEncontrado) {
      console.log('✅ WEBHOOK ENCONTRADO no banco de dados!');
      console.log('   ID:', webhookEncontrado.id);
      console.log('   Status:', webhookEncontrado.processed ? 'Processado' : 'Pendente');
      console.log('   Criado em:', webhookEncontrado.created_at);
      console.log('   Erro:', webhookEncontrado.error_message || 'Nenhum');
    } else {
      console.log('❌ WEBHOOK NÃO ENCONTRADO no banco de dados');
      
      // Listar últimos 10 webhooks para referência
      console.log('\n📋 Últimos 10 webhooks recebidos:');
      webhooks?.slice(0, 10).forEach((wh, idx) => {
        try {
          const payload = typeof wh.payload === 'string' 
            ? JSON.parse(wh.payload) 
            : wh.payload;
          const pixId = payload?.data?.pixQrCode?.id || 
                       payload?.data?.payment?.id || 
                       payload?.data?.id ||
                       payload?.id ||
                       'N/A';
          console.log(`   ${idx + 1}. PIX ID: ${pixId} | Status: ${wh.processed ? 'Processado' : 'Pendente'} | Criado: ${wh.created_at}`);
        } catch (e) {
          console.log(`   ${idx + 1}. Erro ao processar payload`);
        }
      });
    }
  }

  console.log('');

  // 2. Verificar se existe pedido com este payment_id
  console.log('2️⃣ Verificando pedidos na tabela "orders"...');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .or(`payment_id.eq.${PIX_ID},abacatepay_id.eq.${PIX_ID}`)
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('❌ Erro ao buscar pedidos:', ordersError);
  } else {
    if (orders && orders.length > 0) {
      console.log(`✅ Encontrados ${orders.length} pedido(s) com este PIX ID`);
      orders.forEach((order, idx) => {
        console.log(`   Pedido ${idx + 1}:`);
        console.log(`     ID: ${order.id}`);
        console.log(`     Status: ${order.status}`);
        console.log(`     Payment Status: ${order.payment_status}`);
        console.log(`     Valor: R$ ${order.total_amount}`);
        console.log(`     Cliente: ${order.customer_email}`);
        console.log(`     Criado em: ${order.created_at}`);
      });
    } else {
      console.log('❌ NENHUM PEDIDO encontrado com este PIX ID');
    }
  }

  console.log('');

  // 3. Verificar na API do AbacatePay
  console.log('3️⃣ Verificando na API do AbacatePay...');
  const abacateApiKey = process.env.ABACATEPAY_API_KEY || '';
  
  if (!abacateApiKey) {
    console.log('⚠️ ABACATEPAY_API_KEY não configurada - não é possível consultar a API');
  } else {
    try {
      // Consultar cobrança pelo PIX ID
      const checkUrl = `https://api.abacatepay.com/v1/pixQrCode/check?id=${encodeURIComponent(PIX_ID)}`;
      console.log(`   URL: ${checkUrl}`);
      
      const response = await fetch(checkUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${abacateApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const responseText = await response.text();
      console.log(`   Status HTTP: ${response.status}`);
      
      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('✅ COBRANÇA ENCONTRADA na API do AbacatePay!');
        console.log('   Status:', data.data?.status || data.status);
        console.log('   Dados completos:', JSON.stringify(data, null, 2));
      } else {
        console.log('❌ COBRANÇA NÃO ENCONTRADA na API do AbacatePay');
        console.log('   Resposta:', responseText);
      }
    } catch (error: any) {
      console.error('❌ Erro ao consultar API do AbacatePay:', error.message);
    }
  }

  console.log('');

  // 4. Verificar logs da Edge Function (se disponível)
  console.log('4️⃣ Verificando últimos webhooks recebidos (ordem cronológica)...');
  const { data: recentWebhooks, error: recentError } = await supabase
    .from('webhooks')
    .select('*')
    .eq('source', 'abacatepay')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!recentError && recentWebhooks) {
    console.log(`📋 Últimos 20 webhooks recebidos:`);
    recentWebhooks.forEach((wh, idx) => {
      try {
        const payload = typeof wh.payload === 'string' 
          ? JSON.parse(wh.payload) 
          : wh.payload;
        const pixId = payload?.data?.pixQrCode?.id || 
                     payload?.data?.payment?.id || 
                     payload?.data?.id ||
                     payload?.id ||
                     'N/A';
        const event = payload?.event || wh.event_type || 'unknown';
        const status = payload?.data?.pixQrCode?.status || 
                      payload?.data?.payment?.status || 
                      'unknown';
        
        console.log(`   ${idx + 1}. PIX: ${pixId} | Evento: ${event} | Status: ${status} | Processado: ${wh.processed ? 'Sim' : 'Não'} | Criado: ${new Date(wh.created_at).toLocaleString('pt-BR')}`);
      } catch (e) {
        console.log(`   ${idx + 1}. Erro ao processar webhook ${wh.id}`);
      }
    });
  }

  console.log('');
  console.log('🔍 ========================================');
  console.log('🔍 FIM DO DIAGNÓSTICO');
  console.log('🔍 ========================================');
}

// Executar diagnóstico
diagnosticarWebhook().catch(console.error);










