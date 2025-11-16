import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

/**
 * ✅ Função auxiliar para criar tickets para um pedido pago
 * @param supabaseService Cliente Supabase com service role
 * @param orderId ID do pedido
 */
async function criarTicketsParaPedido(supabaseService: any, orderId: string): Promise<void> {
  try {
    console.log(`🎫 Iniciando criação de tickets para pedido ${orderId}...`);
    
    // 1. Buscar dados do pedido
    const { data: orderData, error: orderError } = await supabaseService
      .from('orders')
      .select('id, user_id, customer_email, customer_data, payment_status, status')
      .eq('id', orderId)
      .single();
    
    if (orderError || !orderData) {
      console.error(`❌ Erro ao buscar pedido ${orderId}:`, orderError);
      throw new Error(`Pedido não encontrado: ${orderId}`);
    }
    
    // 2. Verificar se o pedido está pago
    if (orderData.status !== 'paid' && orderData.payment_status !== 'paid') {
      console.log(`⚠️ Pedido ${orderId} não está pago. Status: ${orderData.status}, Payment Status: ${orderData.payment_status}`);
      return;
    }
    
    // 3. Buscar user_id se não existir
    let userId = orderData.user_id;
    if (!userId && orderData.customer_email) {
      try {
        const { data: profile } = await supabaseService
          .from("profiles")
          .select("id")
          .eq("email", orderData.customer_email)
          .maybeSingle();
        
        if (profile) {
          userId = profile.id;
          // Atualizar pedido com user_id
          await supabaseService
            .from("orders")
            .update({ user_id: userId })
            .eq("id", orderId);
          console.log(`✅ User ID encontrado e atualizado: ${userId}`);
        }
      } catch (userSearchError) {
        console.warn(`⚠️ Erro ao buscar user_id: ${userSearchError.message}`);
      }
    }
    
    // 4. Buscar order_items com event_id e ticket_type
    const { data: orderItems, error: itemsError } = await supabaseService
      .from('order_items')
      .select('id, order_id, event_id, ticket_type, quantity, unit_price, price, name')
      .eq('order_id', orderId)
      .not('event_id', 'is', null);
    
    if (itemsError) {
      console.error(`❌ Erro ao buscar order_items:`, itemsError);
      throw itemsError;
    }
    
    if (!orderItems || orderItems.length === 0) {
      console.log(`⚠️ Nenhum order_item encontrado para o pedido ${orderId} com event_id`);
      return;
    }
    
    // 5. Filtrar apenas itens de ingresso (com event_id)
    const itensTicket = orderItems.filter(item => item.event_id);
    
    if (itensTicket.length === 0) {
      console.log(`⚠️ Nenhum item de ingresso encontrado para o pedido ${orderId}`);
      return;
    }
    
    console.log(`📦 Itens de ingresso encontrados: ${itensTicket.length}`);
    
    // 6. Preparar dados para a função SQL create_tickets_atomic
    const items = [];
    
    for (const item of itensTicket) {
      const quantidade = item.quantity || 1;
      const precoUnitario = item.unit_price || item.price || 0;
      const ticketType = item.ticket_type || item.name || 'Ingresso Padrão';
      const eventId = item.event_id;
      
      // Criar um item para cada quantidade (tickets individuais)
      for (let i = 0; i < quantidade; i++) {
        items.push({
          event_id: eventId,
          ticket_type: ticketType,
          price: precoUnitario
        });
      }
    }
    
    console.log(`📊 Total de tickets individuais a criar: ${items.length}`);
    
    // 7. Preparar dados do cliente
    const customerData = {
      email: orderData.customer_email || orderData.customer_data?.email,
      user_id: userId
    };
    
    // 8. Chamar função SQL create_tickets_atomic
    console.log(`🔄 Chamando create_tickets_atomic...`);
    const { data: ticketResult, error: ticketError } = await supabaseService.rpc(
      'create_tickets_atomic',
      {
        p_order_id: orderId,
        p_items: items,
        p_customer_data: customerData
      }
    );
    
    if (ticketError) {
      console.error(`❌ Erro ao criar tickets:`, ticketError);
      throw ticketError;
    }
    
    if (ticketResult && ticketResult.length > 0) {
      const result = ticketResult[0];
      if (result.success) {
        console.log(`✅ Tickets criados com sucesso: ${result.tickets_created}`);
        console.log(`✅ Seat numbers: ${result.seat_numbers?.join(', ') || 'N/A'}`);
      } else {
        console.error(`❌ Erro ao criar tickets: ${result.error_message}`);
        throw new Error(result.error_message || 'Erro ao criar tickets');
      }
    } else {
      console.error(`❌ Resultado inesperado ao criar tickets:`, ticketResult);
      throw new Error('Resultado inesperado ao criar tickets');
    }
    
  } catch (error) {
    console.error(`❌ Erro na função criarTicketsParaPedido:`, error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }
    
    // Criar cliente Supabase com service role
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse do body da requisição
    const { id: paymentId } = await req.json();
    
    if (!paymentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID do pagamento é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`🧪 Simulando pagamento para ID: ${paymentId}`);

    // Obter API key da AbacatePay
    const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY") || Deno.env.get("ABACATE_PAY_API_KEY");
    
    if (!abacatePayApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key da AbacatePay não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Chamar API da AbacatePay para simular pagamento (dispara webhook)
    console.log(`🔄 Chamando API da AbacatePay para simular pagamento...`);
    const simulateResponse = await fetch(
      `https://api.abacatepay.com/v1/pixQrCode/simulate-payment?id=${paymentId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${abacatePayApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ metadata: {} })
      }
    );

    if (!simulateResponse.ok) {
      const errorData = await simulateResponse.json().catch(() => ({}));
      console.error('❌ Erro ao simular pagamento na AbacatePay:', errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao simular pagamento: ${simulateResponse.status} - ${JSON.stringify(errorData)}` 
        }),
        { status: simulateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const simulateResult = await simulateResponse.json();
    console.log('✅ Pagamento simulado com sucesso na AbacatePay:', simulateResult);

    // 2. Buscar pedido pelo payment_id
    const { data: orders, error: orderError } = await supabaseService
      .from('orders')
      .select('id, payment_id, status, payment_status, customer_email, customer_data, user_id, total_amount')
      .eq('payment_id', paymentId)
      .limit(1);

    if (orderError) {
      console.error('❌ Erro ao buscar pedido:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!orders || orders.length === 0) {
      console.warn('⚠️ Pedido não encontrado localmente, mas pagamento foi simulado na AbacatePay');
      // Retornar sucesso mesmo sem encontrar pedido, pois o webhook vai processar
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pagamento simulado na AbacatePay. Webhook será processado automaticamente.',
          data: simulateResult
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const order = orders[0];
    const orderId = order.id;

    console.log(`✅ Pedido encontrado: ${orderId}`);
    console.log(`⏳ Aguardando webhook da AbacatePay processar o pagamento...`);
    console.log(`💡 O webhook atualizará o status do pedido e criará os tickets automaticamente.`);

    // 3. Retornar resposta de sucesso
    // O webhook da AbacatePay vai processar o pagamento e atualizar o pedido automaticamente
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pagamento simulado com sucesso. O webhook da AbacatePay processará o pagamento automaticamente.',
        data: {
          id: paymentId,
          order_id: orderId,
          abacatepay_response: simulateResult,
          note: 'O webhook atualizará o status do pedido e criará os tickets em breve.'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Erro na função simular-pagamento-pix:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno ao simular pagamento'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

