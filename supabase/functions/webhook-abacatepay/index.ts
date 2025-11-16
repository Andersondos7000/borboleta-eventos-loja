import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

/**
 * ✅ Função auxiliar para criar order_items de roupas para um pedido pago
 * @param supabaseService Cliente Supabase com service role
 * @param orderId ID do pedido
 */
async function criarOrderItemsRoupasParaPedido(supabaseService: any, orderId: string): Promise<void> {
  try {
    console.log(`👕 Verificando order_items de roupas para pedido ${orderId}...`);
    
    // 1. Buscar dados do pedido
    const { data: orderData, error: orderError } = await supabaseService
      .from('orders')
      .select('id, items, payment_data, customer_data')
      .eq('id', orderId)
      .single();
    
    if (orderError || !orderData) {
      console.log(`ℹ️ Pedido ${orderId} não encontrado ou erro ao buscar: ${orderError?.message || 'Não encontrado'}`);
      return;
    }
    
    // 2. Verificar se order_items já existem
    const { data: existingOrderItems, error: itemsError } = await supabaseService
      .from('order_items')
      .select('id, product_id')
      .eq('order_id', orderId);
    
    if (itemsError) {
      console.error(`❌ Erro ao verificar order_items: ${itemsError.message}`);
      return;
    }
    
    // Verificar se já existem order_items com product_id (roupas)
    const hasClothingItems = existingOrderItems?.some(item => item.product_id !== null) || false;
    
    if (hasClothingItems) {
      console.log(`✅ Pedido ${orderId} já tem order_items de roupas`);
      return;
    }
    
    // 3. Extrair itens do pedido
    let items: any[] = [];
    
    // Tentar do campo items (JSON)
    if (orderData.items) {
      const itemsData = typeof orderData.items === 'string' 
        ? JSON.parse(orderData.items) 
        : orderData.items;
      
      if (Array.isArray(itemsData)) {
        items = itemsData;
      } else if (itemsData.items && Array.isArray(itemsData.items)) {
        items = itemsData.items;
      }
    }
    
    // Tentar do payment_data (JSON)
    if (items.length === 0 && orderData.payment_data) {
      const paymentData = typeof orderData.payment_data === 'string' 
        ? JSON.parse(orderData.payment_data) 
        : orderData.payment_data;
      
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
    
    // Tentar do customer_data (JSON) - algumas vezes os itens podem estar aqui
    if (items.length === 0 && orderData.customer_data) {
      const customerData = typeof orderData.customer_data === 'string'
        ? JSON.parse(orderData.customer_data)
        : orderData.customer_data;
      
      if (customerData.items && Array.isArray(customerData.items)) {
        items = customerData.items;
      }
    }
    
    // Se ainda não encontrou itens, tentar buscar da AbacatePay usando payment_id
    if (items.length === 0 && orderData.payment_id) {
      console.log(`🔍 Tentando buscar dados da cobrança da AbacatePay...`);
      try {
        const abacatepayApiKey = Deno.env.get("ABACATEPAY_API_KEY") || "";
        if (abacatepayApiKey) {
          const chargeResponse = await fetch(`https://api.abacatepay.com/v1/billings/${orderData.payment_id}`, {
            headers: {
              "Authorization": `Bearer ${abacatepayApiKey}`,
              "Content-Type": "application/json"
            }
          });
          
          if (chargeResponse.ok) {
            const chargeData = await chargeResponse.json();
            if (chargeData.products && Array.isArray(chargeData.products)) {
              items = chargeData.products.map((p: any) => ({
                nome: p.name || p.nome,
                quantidade: p.quantity || p.quantidade,
                preco: p.price || p.preco || p.unit_price,
                product_id: p.product_id || p.externalId, // AbacatePay pode usar externalId
                size: p.size
              }));
              console.log(`✅ ${items.length} itens recuperados da AbacatePay`);
            }
          }
        }
      } catch (apiError) {
        console.warn(`⚠️ Erro ao buscar dados da AbacatePay: ${apiError.message}`);
      }
    }
    
    if (items.length === 0) {
      console.log(`ℹ️ Pedido ${orderId} não contém itens para processar`);
      return;
    }
    
    console.log(`📦 Encontrados ${items.length} itens no pedido`);
    
    // 4. Buscar produtos existentes
    const { data: products, error: productsError } = await supabaseService
      .from('products')
      .select('id, name, category');
    
    if (productsError) {
      console.error(`❌ Erro ao buscar produtos: ${productsError.message}`);
      return;
    }
    
    // 5. Criar order_items apenas para produtos de roupas (com product_id)
    const orderItemsToCreate = [];
    
    for (const item of items) {
      const nome = item.nome || item.name || item.title || '';
      const quantidade = item.quantidade || item.quantity || 1;
      const preco = item.preco || item.price || item.unit_price || 0;
      const size = item.size || null;
      let productId = item.product_id || null;
      
      // Se não tem product_id, tentar encontrar por nome
      if (!productId && nome) {
        const matchingProduct = products?.find(p => 
          p.name.toLowerCase().trim() === nome.toLowerCase().trim()
        );
        
        if (matchingProduct) {
          productId = matchingProduct.id;
          console.log(`  ✅ Produto mapeado: ${nome} -> ${productId}`);
        }
      }
      
      // Apenas criar order_item se tiver product_id (é uma roupa)
      if (productId) {
        // Verificar se a categoria é de roupa
        const product = products?.find(p => p.id === productId);
        const isClothing = product && (
          product.category === 'camiseta' || 
          product.category === 'vestido' ||
          product.category === 'clothing'
        );
        
        if (isClothing) {
          orderItemsToCreate.push({
            order_id: orderId,
            product_id: productId,
            quantity: quantidade,
            price: preco,
            unit_price: preco,
            total_price: preco * quantidade,
            size: size,
            ticket_id: null,
            name: nome,
            created_at: new Date().toISOString()
          });
          
          console.log(`  👕 Order item de roupa preparado: ${nome} (${productId})`);
        }
      }
    }
    
    if (orderItemsToCreate.length === 0) {
      console.log(`ℹ️ Nenhum order_item de roupa para criar no pedido ${orderId}`);
      return;
    }
    
    // 6. Inserir order_items
    const { data: insertedItems, error: insertError } = await supabaseService
      .from('order_items')
      .insert(orderItemsToCreate)
      .select();
    
    if (insertError) {
      console.error(`❌ Erro ao criar order_items de roupas: ${insertError.message}`);
      return;
    }
    
    console.log(`✅ ${insertedItems?.length || 0} order_items de roupas criados para pedido ${orderId}!`);
    
  } catch (error: any) {
    console.error(`❌ Erro ao criar order_items de roupas para pedido ${orderId}:`, error);
    // Não lançar erro - não é crítico para o webhook
  }
}

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
      .select('id, user_id, customer_email, customer_data')
      .eq('id', orderId)
      .single();
    
    if (orderError || !orderData) {
      throw new Error(`Erro ao buscar pedido: ${orderError?.message || 'Pedido não encontrado'}`);
    }
    
    // 2. Buscar user_id se não tiver
    let userId = orderData.user_id;
    if (!userId && orderData.customer_email) {
      try {
        const { data: profile } = await supabaseService
          .from('profiles')
          .select('id')
          .eq('email', orderData.customer_email)
          .maybeSingle();
        
        if (profile) {
          userId = profile.id;
          console.log(`✅ User ID encontrado pelo email: ${userId}`);
          
          // Atualizar pedido com user_id
          await supabaseService
            .from('orders')
            .update({ user_id: userId })
            .eq('id', orderId);
        }
      } catch (userSearchError: any) {
        console.warn(`⚠️ Erro ao buscar user_id: ${userSearchError?.message || 'Erro desconhecido'}`);
      }
    }
    
    // 3. Buscar order_items do pedido
    const { data: orderItems, error: orderItemsError } = await supabaseService
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (orderItemsError) {
      throw new Error(`Erro ao buscar order_items: ${orderItemsError.message}`);
    }
    
    if (!orderItems || orderItems.length === 0) {
      console.log(`ℹ️ Pedido ${orderId} não contém order_items`);
      return;
    }
    
    console.log(`📦 Encontrados ${orderItems.length} order_items no pedido`);
    
    // 4. Filtrar itens que são tickets (têm event_id)
    const itensTicket = orderItems.filter(item => item.event_id);
    
    if (itensTicket.length === 0) {
      console.log(`ℹ️ Pedido ${orderId} não contém tickets, apenas produtos físicos`);
      return;
    }
    
    console.log(`📋 Encontrados ${itensTicket.length} tipos de ticket no pedido`);
    
    // 5. Verificar se tickets já existem (idempotência)
    const { data: existingTickets } = await supabaseService
      .from('tickets')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);
    
    if (existingTickets && existingTickets.length > 0) {
      console.log(`✅ Tickets já existem para pedido ${orderId}`);
      return;
    }
    
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
    
    const { data, error } = await supabaseService.rpc('create_tickets_atomic', {
      p_order_id: orderId,
      p_items: items,
      p_customer_data: customerData
    });
    
    if (error) {
      console.error('❌ Erro na função SQL:', error);
      throw new Error(`Erro na função create_tickets_atomic: ${error.message}`);
    }
    
    // Verificar resultado
    if (!data || data.length === 0) {
      throw new Error('Função SQL não retornou dados');
    }
    
    const sqlResult = data[0];
    
    if (!sqlResult.success) {
      console.error('❌ Função SQL retornou erro:', sqlResult.error_message);
      throw new Error(sqlResult.error_message || 'Erro desconhecido na criação de tickets');
    }
    
    console.log(`✅ ${sqlResult.tickets_created} tickets criados atomicamente para pedido ${orderId}!`);
    console.log(`🎫 Assentos alocados: ${sqlResult.seat_numbers?.join(', ') || 'N/A'}`);
    
  } catch (error: any) {
    console.error(`❌ Erro ao criar tickets para pedido ${orderId}:`, error);
    throw error;
  }
}

async function enqueueEmail(
  supabaseService: any,
  params: { to: string; type: string; subject: string; payload: any; idempotencyKey: string }
): Promise<void> {
  await supabaseService
    .from('emails_outbox')
    .upsert(
      {
        to_email: params.to,
        type: params.type,
        subject: params.subject,
        payload_json: params.payload,
        status: 'pending',
        idempotency_key: params.idempotencyKey,
        created_at: new Date().toISOString()
      },
      { onConflict: 'idempotency_key' }
    );
}

// Upsert idempotente de registros de cobrança e PIX
// ✅ REMOVIDO: billingId - usar apenas pixId (pix_char_*)
async function upsertChargeAndPixRecords(
  supabaseService: any,
  params: {
    orderId: string;
    pixId?: string | null;
    payment?: any;
    pixQrCode?: any;
    customer?: any;
  }
): Promise<void> {
  try {
    const amountCents = params.payment?.amount ?? params.pixQrCode?.amount ?? null;
    const amountReais = typeof amountCents === 'number' ? amountCents / 100 : null;
    const expiresAt = params.pixQrCode?.expiresAt ?? null;

    const customerMeta = params.customer?.metadata ?? params.customer ?? {};
    const customerName = customerMeta.name ?? null;
    const customerEmail = customerMeta.email ?? null;
    const customerPhone = customerMeta.cellphone ?? null;
    const customerCpf = customerMeta.taxId ?? null;

    // Upsert em pix_payments (conflito por pix_id)
    if (params.pixId && amountCents !== null && params.pixQrCode?.brCode) {
      const pixStatusRaw = (params.payment?.status ?? params.pixQrCode?.status ?? 'PAID').toString().toUpperCase();
      const pixPayload: any = {
        pix_id: params.pixId, // pix_char_*
        amount: amountCents,
        status: pixStatusRaw,
        description: params.payment?.description ?? null,
        br_code: params.pixQrCode?.brCode,
        qr_code_base64: params.pixQrCode?.brCodeBase64 ?? null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_cellphone: customerPhone,
        customer_tax_id: customerCpf,
        expires_at: expiresAt,
      };

      await supabaseService
        .from('pix_payments')
        .upsert(pixPayload, { onConflict: 'pix_id' });
    }

    // Upsert em abacatepay_charges (idempotência por charge_id = pix_id)
    // ✅ REMOVIDO: billing_id - usar apenas charge_id (pix_char_*)
    const chargeId = params.pixId; // Sempre será pix_char_*
    if (chargeId && chargeId.startsWith('pix_char_')) {
      const chargePayload: any = {
        order_id: params.orderId,
        charge_id: chargeId, // pix_char_*
        amount: amountReais,
        status: 'paid',
        customer_name: customerName,
        customer_email: customerEmail,
        expires_at: expiresAt,
      };

      // Tentar localizar por charge_id (pix_char_*)
      const { data: existingByCharge } = await supabaseService
        .from('abacatepay_charges')
        .select('id')
        .eq('charge_id', chargeId)
        .limit(1);

      if (existingByCharge && existingByCharge.length > 0) {
        await supabaseService
          .from('abacatepay_charges')
          .update(chargePayload)
          .eq('id', existingByCharge[0].id);
      } else {
        await supabaseService
          .from('abacatepay_charges')
          .insert(chargePayload);
      }
    }
  } catch (err) {
    console.warn('⚠️ Falha ao upsert charge/pix records:', (err as any)?.message ?? err);
  }
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.url}`);
  // ✅ CORREÇÃO: Logging detalhado ANTES de qualquer processamento
  const url = new URL(req.url);
  const headers = Object.fromEntries(req.headers.entries());
  const queryParams = Object.fromEntries(url.searchParams.entries());
  
  console.log("🔍 ========================================");
  console.log("🔍 WEBHOOK RECEBIDO - INFORMAÇÕES COMPLETAS");
  console.log("🔍 ========================================");
  console.log("📅 Timestamp:", new Date().toISOString());
  console.log("🌐 URL:", req.url);
  console.log("📋 Método:", req.method);
  console.log("🔑 Query Parameters:", JSON.stringify(queryParams, null, 2));
  console.log("📨 Headers:", JSON.stringify(headers, null, 2));
  console.log("📦 Content-Type:", headers['content-type']);
  console.log("📦 User-Agent:", headers['user-agent']);
  console.log("📦 Origin:", headers['origin']);
  console.log("📦 X-Forwarded-For:", headers['x-forwarded-for']);
  console.log("📦 Authorization:", headers['authorization'] ? "Presente" : "Ausente");
  console.log("📦 X-Webhook-Signature:", headers['x-webhook-signature'] ? "Presente" : "Ausente");
  console.log("📦 Abacate-Signature:", headers['abacate-signature'] ? "Presente" : "Ausente");
  console.log("📦 X-Abacate-Signature:", headers['x-abacate-signature'] ? "Presente" : "Ausente");
  console.log("🔍 ========================================");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("✅ OPTIONS request - retornando CORS headers");
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // ✅ CORREÇÃO: Aceitar apenas POST
  if (req.method !== "POST") {
    console.log(`❌ Método ${req.method} não permitido - apenas POST`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Method not allowed",
        allowed_methods: ["POST", "OPTIONS"]
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405
      }
    );
  }

  // ✅ VALIDAÇÃO: Verificar webhookSecret (obrigatório desde Nov/2025)
  const expectedSecret = Deno.env.get("WEBHOOK_SECRET");
  const receivedSecret = queryParams.webhookSecret;
  
  console.log("🔐 Validando webhookSecret...");
  console.log("🔐 Secret esperado:", expectedSecret ? "Configurado" : "NÃO CONFIGURADO");
  console.log("🔐 Secret recebido:", receivedSecret ? "Presente" : "Ausente");
  
  if (expectedSecret && receivedSecret !== expectedSecret) {
    console.error("❌ webhookSecret inválido ou ausente");
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Unauthorized - Invalid webhook secret"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401
      }
    );
  }
  
  console.log("✅ webhookSecret validado com sucesso");

  let savedWebhook = null;
  
  try {
    // ✅ CORREÇÃO: Ler o body como texto primeiro para validação de signature (se necessário)
    const bodyText = await req.text();
    console.log("📥 Body recebido (tamanho:", bodyText.length, "chars)");
    console.log("📥 Body recebido (primeiros 1000 chars):", bodyText.substring(0, 1000));
    
    if (!bodyText || bodyText.trim().length === 0) {
      console.error("❌ Body vazio");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Empty payload"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }
    
    let webhookData;
    try {
      webhookData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("❌ Erro ao parsear JSON do webhook:", parseError);
      console.error("❌ Body que causou erro:", bodyText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid JSON payload",
          details: parseError.message 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }
    
    console.log("✅ Webhook data parseado:", JSON.stringify(webhookData, null, 2));

    // ================================
    // Filtro de evento: somente PIX
    // ================================
    // ✅ CORREÇÃO: Extrair apenas UMA VEZ o pix_id (pix_char_*) do webhook
    const pixId: string | null = webhookData?.data?.pixQrCode?.id || webhookData?.data?.id || null;
    const pixKind: string | undefined = webhookData?.data?.pixQrCode?.kind;
    const isPixChar = typeof pixId === 'string' && pixId.startsWith('pix_char_');

    // Se for evento billing.* mas não for PIX, apenas registrar e concluir sem atualizar pedidos
    if ((webhookData?.event?.startsWith('billing.')) && pixKind && pixKind !== 'PIX') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'webhook-abacatepay',
        message: 'Evento não-PIX ignorado',
        event: webhookData.event,
        pixKind: pixKind,
        pixId
      }));
      // Marcar como processado e retornar
      if (savedWebhook) {
        await supabaseService
          .from("webhooks")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("id", savedWebhook.id);
      }
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook não-PIX salvo e ignorado' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Se não possuir pixId com prefixo esperado, não atualizar pedidos
    if ((webhookData?.event?.startsWith('billing.')) && (!isPixChar)) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'webhook-abacatepay',
        message: 'Webhook sem pix_char_* ignorado',
        event: webhookData.event,
        pixKind: pixKind,
        pixId
      }));
      if (savedWebhook) {
        await supabaseService
          .from("webhooks")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("id", savedWebhook.id);
      }
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook sem pix_char_* salvo e ignorado' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    if (!pixId || !pixId.startsWith('pix_char_')) {
      console.warn("⚠️ Webhook não contém pix_id válido (pix_char_*).", { pixId });
    }

    // Log estruturado de correlação
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'webhook-abacatepay',
      message: 'Processando webhook com pix_id',
      event: webhookData.event,
      pixId: pixId,
      externalReference: webhookData?.data?.pixQrCode?.external_reference || webhookData?.external_reference || null
    }));

    // Create Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Save webhook data to webhooks table for dashboard visibility (SALVAR TODOS, mesmo testes)
    const webhookRecord = {
      source: "abacatepay",
      event_type: webhookData.event || "unknown",
      payload: webhookData,
      processed: false
    };

    const { data: savedWebhookData, error: webhookError } = await supabaseService
      .from("webhooks")
      .insert(webhookRecord)
      .select()
      .single();

    if (webhookError) {
      console.error("❌ Error saving webhook to database:", webhookError);
      console.error("❌ Error details:", JSON.stringify(webhookError, null, 2));
      console.error("❌ Webhook record attempted:", JSON.stringify(webhookRecord, null, 2));
      // Continue processing even if webhook save fails, but log the error
    } else {
      console.log("✅ Webhook saved to database:", savedWebhookData?.id);
      savedWebhook = savedWebhookData;
    }

    // IGNORAR processamento de webhooks de teste/health check (mas salvar na tabela)
    if (webhookData?.test === true || Object.keys(webhookData).length === 0) {
      console.log("Webhook de teste detectado - ignorando processamento, mas salvo na tabela");
      return new Response(
        JSON.stringify({ success: true, message: "Test webhook saved but processing ignored", webhook_id: savedWebhookData?.id }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          },
          status: 200
        }
      );
    }

    // Extract payment information from AbacatePay webhook structure
    let external_reference, status;
    
    // Handle different AbacatePay webhook structures
    if (webhookData.data && webhookData.data.pixQrCode) {
      // Structure: { event: "billing.paid", data: { pixQrCode: { ... } } }
      external_reference = webhookData.data.pixQrCode.external_reference || webhookData.data.pixQrCode.id;
      status = webhookData.data.pixQrCode.status;
    } else if (webhookData.external_reference) {
      // Direct structure: { external_reference: "...", status: "..." }
      external_reference = webhookData.external_reference;
      status = webhookData.status;
    } else {
      // For webhooks without external_reference, use pixQrCode ID or generate one
      external_reference = webhookData.data?.pixQrCode?.id || `webhook_${Date.now()}`;
      status = webhookData.data?.pixQrCode?.status || webhookData.status || "unknown";
      console.log(`No external_reference found, using: ${external_reference}`);
    }

    // Guarda de idempotência: se já existe pedido pago para este pixId, não reprocessar
    if (isPixChar && webhookData.event === 'billing.paid') {
      try {
        const { data: existingPaidOrders } = await supabaseService
          .from('orders')
          .select('id, payment_id, payment_status')
          .eq('payment_id', pixId)
          .eq('payment_status', 'paid')
          .limit(1);
        if (existingPaidOrders && existingPaidOrders.length > 0) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            service: 'webhook-abacatepay',
            message: 'Webhook duplicado ignorado (pedido já pago)',
            pixId,
            orderId: existingPaidOrders[0].id
          }));
          if (savedWebhook) {
            await supabaseService
              .from('webhooks')
              .update({ processed: true, processed_at: new Date().toISOString() })
              .eq('id', savedWebhook.id);
          }
          return new Response(
            JSON.stringify({ success: true, message: 'Webhook duplicado ignorado (pedido já pago)' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      } catch (idempErr) {
        console.warn('⚠️ Erro na verificação de idempotência:', idempErr?.message || idempErr);
      }
    }

    // Update order status based on payment status (normalize to lowercase for comparison)
    const normalizedStatus = (status || '').toString().toLowerCase();
    let orderStatus = "pending";
    switch (normalizedStatus) {
      case "paid":
        orderStatus = "paid";
        break;
      case "failed":
      case "cancelled":
        orderStatus = "cancelled";
        break;
      case "pending":
        orderStatus = "awaiting_payment";
        break;
    }

    // Process payment based on webhook event
    console.log(`Processing payment for ${external_reference} with status: ${orderStatus}`);
    
    let orderUpdateResult = null;
    let orderUpdateError = null;
    
    // Check if external_reference looks like a UUID (basic validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Extract pixQrCode ID for payment matching
    const pixQrCodeId = webhookData.data?.pixQrCode?.id;
    
    if (uuidRegex.test(external_reference)) {
      // External reference is a UUID - update existing order
      // ✅ CORREÇÃO: Buscar pedido primeiro para verificar se tem user_id
      const { data: existingOrderData, error: fetchError } = await supabaseService
        .from("orders")
        .select("id, user_id, customer_email")
        .eq("id", external_reference)
        .maybeSingle();
      
      if (!fetchError && existingOrderData) {
        // ✅ CORREÇÃO: Se o pedido não tem user_id, tentar buscar pelo email
        let userId = existingOrderData.user_id;
        if (!userId && existingOrderData.customer_email) {
          try {
            const { data: profile } = await supabaseService
              .from("profiles")
              .select("id")
              .eq("email", existingOrderData.customer_email)
              .maybeSingle();
            
            if (profile) {
              userId = profile.id;
              console.log(`✅ User ID encontrado pelo email do pedido: ${userId}`);
            }
          } catch (userSearchError) {
            console.warn(`⚠️ Erro ao buscar user_id: ${userSearchError.message}`);
          }
        }
        
        // Preparar dados de atualização
        // ✅ REMOVIDO: billing_id - usar apenas payment_id (pix_char_*)
        const updateData: any = {
          status: orderStatus,
          payment_status: orderStatus === "paid" ? "paid" : orderStatus,
          updated_at: new Date().toISOString()
        };
        
        // Atualizar payment_id se o pix_id estiver disponível e for diferente
        if (pixQrCodeId && pixQrCodeId.startsWith('pix_char_')) {
          updateData.payment_id = pixQrCodeId;
        }
        
        // ✅ CORREÇÃO: Atualizar user_id se encontrado e se o pedido não tinha
        if (userId && !existingOrderData.user_id) {
          updateData.user_id = userId;
          console.log(`✅ Atualizando pedido com user_id: ${userId}`);
        }
        
        const { data, error } = await supabaseService
          .from("orders")
          .update(updateData)
        .eq("id", external_reference)
        .select();

      orderUpdateResult = data;
      orderUpdateError = error;

      if (error) {
        console.error("Error updating order:", error);
      } else if (!data || data.length === 0) {
        console.log(`No order found with ID: ${external_reference} - trying to find by payment_id`);
        // Try to find by payment_id as fallback
        if (pixQrCodeId) {
          const { data: orderByPaymentId, error: errorByPaymentId } = await supabaseService
            .from("orders")
            .update({
              status: orderStatus,
              payment_status: orderStatus === "paid" ? "paid" : orderStatus,
              payment_id: pixQrCodeId,
              updated_at: new Date().toISOString()
            })
            .eq("payment_id", pixQrCodeId)
            .or(`abacatepay_id.eq.${pixQrCodeId}`)
            .select();
          
          if (orderByPaymentId && orderByPaymentId.length > 0) {
            console.log(`✅ Found order by payment_id/abacatepay_id: ${orderByPaymentId[0].id}`);
            orderUpdateResult = orderByPaymentId;
            
            // ✅ CORREÇÃO: Criar order_items de roupas quando pedido é atualizado para paid
            if (orderStatus === "paid" && webhookData.event === "billing.paid") {
              console.log(`✅ Pedido ${orderByPaymentId[0].id} atualizado para 'paid'. Criando order_items de roupas...`);
              try {
                await criarOrderItemsRoupasParaPedido(supabaseService, orderByPaymentId[0].id);
              } catch (clothingError) {
                console.error(`⚠️ Erro ao criar order_items de roupas para pedido ${orderByPaymentId[0].id}:`, clothingError);
              }

              // Upsert idempotente de registros da cobrança e PIX
              try {
                await upsertChargeAndPixRecords(supabaseService, {
                  orderId: orderByPaymentId[0].id,
                  pixId: pixQrCodeId, // pix_char_*
                  payment: webhookData.data?.payment,
                  pixQrCode: webhookData.data?.pixQrCode,
                  customer: webhookData.data?.pixQrCode?.customer
                });
              } catch (upsertError) {
                console.warn(`⚠️ Falha ao upsert charge/pix para pedido ${orderByPaymentId[0].id}:`, upsertError);
              }
            }
          }
        }
        } else {
          console.log(`Order ${external_reference} successfully updated to status: ${orderStatus}`);
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            service: 'webhook-abacatepay',
            message: 'Pedido atualizado com correlação',
            orderId: external_reference,
            status: orderStatus,
            pixId: pixQrCodeId
          }));
          
          // ✅ CORREÇÃO: Criar order_items de roupas quando pedido é atualizado para paid
          if (orderStatus === "paid" && webhookData.event === "billing.paid" && data && data.length > 0) {
              console.log(`✅ Pedido ${data[0].id} atualizado para 'paid'. Criando order_items de roupas...`);
          try {
            await criarOrderItemsRoupasParaPedido(supabaseService, data[0].id);
          } catch (clothingError) {
            console.error(`⚠️ Erro ao criar order_items de roupas para pedido ${data[0].id}:`, clothingError);
          }

          // Upsert idempotente de registros da cobrança e PIX
          try {
            await upsertChargeAndPixRecords(supabaseService, {
              orderId: data[0].id,
              pixId: pixQrCodeId, // pix_char_*
              payment: webhookData.data?.payment,
              pixQrCode: webhookData.data?.pixQrCode,
              customer: webhookData.data?.pixQrCode?.customer
            });
          } catch (upsertError) {
            console.warn(`⚠️ Falha ao upsert charge/pix para pedido ${data[0].id}:`, upsertError);
          }

          try {
            const to = data[0].customer_email || null;
            if (to) {
              const orderId = data[0].id;
              await enqueueEmail(supabaseService, {
                to,
                type: 'payment_receipt',
                subject: 'Confirmação de Pagamento',
                payload: { order_id: orderId },
                idempotencyKey: `${orderId}-payment_receipt`
              });
              await enqueueEmail(supabaseService, {
                to,
                type: 'ticket_delivery',
                subject: 'Seus Ingressos',
                payload: { order_id: orderId },
                idempotencyKey: `${orderId}-ticket_delivery`
              });
            }
          } catch (queueErr) {
            console.warn('⚠️ Falha ao enfileirar e-mails para pedido pago:', queueErr?.message || queueErr);
          }
          }
        }
      } else {
        // Pedido não encontrado - tentar buscar por payment_id
        console.log(`No order found with ID: ${external_reference} - trying to find by payment_id`);
        if (pixQrCodeId) {
          const { data: orderByPaymentId, error: errorByPaymentId } = await supabaseService
            .from("orders")
            .update({
              status: orderStatus,
              payment_status: orderStatus === "paid" ? "paid" : orderStatus,
              payment_id: pixQrCodeId,
              updated_at: new Date().toISOString()
            })
            .eq("payment_id", pixQrCodeId)
            .or(`abacatepay_id.eq.${pixQrCodeId}`)
            .select();
          
          if (orderByPaymentId && orderByPaymentId.length > 0 && orderByPaymentId[0]) {
            console.log(`✅ Found order by payment_id/abacatepay_id: ${orderByPaymentId[0].id}`);
            orderUpdateResult = orderByPaymentId;
            
            // ✅ CORREÇÃO: Criar order_items de roupas quando pedido é atualizado para paid
            if (orderStatus === "paid" && webhookData.event === "billing.paid") {
              console.log(`✅ Pedido ${orderByPaymentId[0].id} atualizado para 'paid'. Criando order_items de roupas...`);
              try {
                await criarOrderItemsRoupasParaPedido(supabaseService, orderByPaymentId[0].id);
              } catch (clothingError) {
                console.error(`⚠️ Erro ao criar order_items de roupas para pedido ${orderByPaymentId[0].id}:`, clothingError);
              }
            }
          }
        }
      }
    } else {
      // External reference is NOT a UUID - try to find existing order by external_id, payment_id, or abacatepay_id
      console.log(`External reference ${external_reference} is not a UUID - checking for existing order`);
      
      let existingOrder = null;
      
      // ✅ CORREÇÃO: Tentar buscar por external_id primeiro (pode ser "pedido_xxx")
      if (external_reference) {
        const { data: orderByExternalId, error: findError1 } = await supabaseService
          .from("orders")
          .select("*")
          .eq("external_id", external_reference)
          .limit(1)
          .maybeSingle();
        
        if (!findError1 && orderByExternalId) {
          existingOrder = orderByExternalId;
          console.log(`✅ Found existing order ${existingOrder.id} by external_id: ${external_reference}`);
        }
      }
      
      // Try to find existing order by payment_id or abacatepay_id
      if (!existingOrder && pixQrCodeId) {
        const { data: foundOrders, error: findError } = await supabaseService
          .from("orders")
          .select("*")
          .or(`payment_id.eq.${pixQrCodeId},abacatepay_id.eq.${pixQrCodeId}`)
          .limit(1);
        
        if (!findError && foundOrders && foundOrders.length > 0) {
          existingOrder = foundOrders[0];
          console.log(`✅ Found existing order ${existingOrder.id} by payment_id/abacatepay_id: ${pixQrCodeId}`);
        }
      }
      
      // ✅ CORREÇÃO: Se encontrou pedido, atualizar e criar order_items
      if (existingOrder) {
        // ✅ CORREÇÃO: Se o pedido não tem user_id, tentar buscar pelo email
        let userId = existingOrder.user_id || null;
        if (!userId && existingOrder.customer_email) {
          try {
            const { data: profile } = await supabaseService
              .from("profiles")
              .select("id")
              .eq("email", existingOrder.customer_email)
              .maybeSingle();
            
            if (profile) {
              userId = profile.id;
              console.log(`✅ User ID encontrado pelo email do pedido: ${userId}`);
            }
          } catch (userSearchError: any) {
            console.warn(`⚠️ Erro ao buscar user_id: ${userSearchError?.message || 'Erro desconhecido'}`);
          }
        }
        
        // Update existing order
        const updateData: any = {
          status: orderStatus,
          payment_status: orderStatus === "paid" ? "paid" : orderStatus,
          updated_at: new Date().toISOString()
        };
        
        // ✅ CORREÇÃO: Atualizar payment_id se fornecido e se não existir
        if (pixQrCodeId && !existingOrder.payment_id) {
          updateData.payment_id = pixQrCodeId;
          console.log(`✅ Atualizando payment_id: ${pixQrCodeId}`);
        }
        
        // ✅ CORREÇÃO: Atualizar user_id se encontrado e se o pedido não tinha
        if (userId && !existingOrder.user_id) {
          updateData.user_id = userId;
          console.log(`✅ Atualizando pedido com user_id: ${userId}`);
        }
        
        const { data: updatedOrder, error: updateError } = await supabaseService
          .from("orders")
          .update(updateData)
          .eq("id", existingOrder.id)
          .select();
        
        if (updateError) {
          console.error("Error updating existing order:", updateError);
          orderUpdateError = updateError;
        } else if (updatedOrder && updatedOrder.length > 0) {
          console.log(`✅ Order ${existingOrder.id} successfully updated to status: ${orderStatus}`);
          orderUpdateResult = updatedOrder;
          
          // ✅ CORREÇÃO: Se pedido está pago, criar tickets e order_items de roupas automaticamente
          if (orderStatus === "paid" && webhookData.event === "billing.paid") {
            console.log(`✅ Pedido ${existingOrder.id} atualizado para 'paid'. Criando tickets e order_items...`);
            try {
              // Criar tickets para ingressos
              await criarTicketsParaPedido(supabaseService, existingOrder.id);
            } catch (ticketError) {
              console.error(`⚠️ Erro ao criar tickets para pedido ${existingOrder.id}:`, ticketError);
              // Não falhar o webhook por causa de erro na criação de tickets
            }
            
            try {
              // Criar order_items para roupas
              await criarOrderItemsRoupasParaPedido(supabaseService, existingOrder.id);
            } catch (clothingError) {
              console.error(`⚠️ Erro ao criar order_items de roupas para pedido ${existingOrder.id}:`, clothingError);
              // Não falhar o webhook por causa de erro na criação de order_items
            }

            // Upsert idempotente de registros da cobrança e PIX
            try {
              await upsertChargeAndPixRecords(supabaseService, {
                orderId: existingOrder.id,
                pixId: pixQrCodeId, // pix_char_*
                payment: webhookData.data?.payment,
                pixQrCode: webhookData.data?.pixQrCode,
                customer: webhookData.data?.pixQrCode?.customer
              });
            } catch (upsertError) {
              console.warn(`⚠️ Falha ao upsert charge/pix para pedido ${existingOrder.id}:`, upsertError);
            }

            try {
              const to = existingOrder.customer_email || null;
              if (to) {
                const orderId = existingOrder.id;
                await enqueueEmail(supabaseService, {
                  to,
                  type: 'payment_receipt',
                  subject: 'Confirmação de Pagamento',
                  payload: { order_id: orderId },
                  idempotencyKey: `${orderId}-payment_receipt`
                });
                await enqueueEmail(supabaseService, {
                  to,
                  type: 'ticket_delivery',
                  subject: 'Seus Ingressos',
                  payload: { order_id: orderId },
                  idempotencyKey: `${orderId}-ticket_delivery`
                });
              }
            } catch (queueErr) {
              console.warn('⚠️ Falha ao enfileirar e-mails para pedido pago:', queueErr?.message || queueErr);
            }
          }
        }
      }
      
      // If no existing order found, this is a direct AbacatePay payment - CREATE new order
      if (!existingOrder) {
        console.log(`No existing order found - creating new order for direct AbacatePay payment`);
      
      // Only process PAID payments
      if (status?.toUpperCase() === "PAID" && webhookData.event === "billing.paid") {
        try {
          // Extract payment data from webhook
          const pixQrCode = webhookData.data?.pixQrCode;
          const payment = webhookData.data?.payment;
          const customer = pixQrCode?.customer;
          const customerMetadata = customer?.metadata;
          
          if (!pixQrCode || !payment || !customerMetadata) {
            console.error("Missing required payment data in webhook:", { pixQrCode: !!pixQrCode, payment: !!payment, customerMetadata: !!customerMetadata });
            throw new Error("Webhook payload missing required payment data");
          }
          
          // Calculate ticket quantity based on amount (R$ 90.00 per ticket)
          const TICKET_PRICE = 9000; // R$ 90.00 em centavos
          const totalAmountInCents = payment.amount || 0; // Valor já vem em centavos do AbacatePay
          const ticketQuantity = Math.floor(totalAmountInCents / TICKET_PRICE);
          
          console.log(`Payment amount: R$ ${(totalAmountInCents / 100).toFixed(2)}, Tickets to create: ${ticketQuantity}`);
          
          if (ticketQuantity <= 0) {
            console.error("Invalid ticket quantity:", ticketQuantity);
            throw new Error(`Invalid ticket quantity calculated: ${ticketQuantity}`);
          }
          
          // ✅ CORREÇÃO: Buscar user_id pelo email do cliente
          let userId = null;
          const customerEmail = customerMetadata.email || "unknown@email.com";
          
          if (customerEmail && customerEmail !== "unknown@email.com") {
            try {
              // Buscar usuário pelo email na tabela auth.users (através de profiles)
              const { data: profile, error: profileError } = await supabaseService
                .from("profiles")
                .select("id, email")
                .eq("email", customerEmail)
                .maybeSingle();
              
              if (!profileError && profile) {
                userId = profile.id;
                console.log(`✅ User ID encontrado pelo email: ${userId}`);
              } else {
                // Tentar buscar em auth.users diretamente (requer service role)
                console.log(`⚠️ Perfil não encontrado para email: ${customerEmail}`);
              }
            } catch (userSearchError) {
              console.warn(`⚠️ Erro ao buscar user_id pelo email: ${userSearchError.message}`);
              // Continuar sem user_id - não é crítico
            }
          }
          
          // Create order
          const newOrder = {
            user_id: userId, // ✅ CORREÇÃO: Incluir user_id se encontrado
            customer_email: customerEmail,
            customer_name: customerMetadata.name || "Unknown",
            customer_phone: customerMetadata.cellphone || "",
            customer_document: customerMetadata.taxId || "",
            total_amount: totalAmount,
            payment_id: pixQrCode.id,
            payment_method: "pix",
            payment_status: "paid",
            status: "paid",
            // ✅ REMOVIDO: billing_id - usar apenas payment_id (pix_char_*)
          };
          
          const { data: createdOrder, error: orderError } = await supabaseService
            .from("orders")
            .insert(newOrder)
            .select()
            .single();
          
          if (orderError) {
            console.error("Error creating order:", orderError);
            throw orderError;
          }
          
          console.log("Order created successfully:", createdOrder.id);
          orderUpdateResult = createdOrder ? [createdOrder] : null;

          // Log estruturado de criação com correlação
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            service: 'webhook-abacatepay',
            message: 'Pedido criado via webhook',
            orderId: createdOrder.id,
            status: 'paid',
            pixId: pixQrCode.id, // pix_char_*
            customerEmail: customerEmail
          }));
          
          // ✅ SIMPLIFICADO: Criar order_items para que o trigger possa criar os tickets
          // O trigger criará os tickets automaticamente quando detectar o pedido como "paid"
          const orderItem = {
            order_id: createdOrder.id,
            event_id: '8a5cf4e8-1b2f-4d2f-9ef0-4bc08e655ceb', // Queren Hapuque VIII event ID
            ticket_type: ticketQuantity > 1 ? 'batch' : 'individual',
            name: `Ingresso - Queren Hapuque VIII Conferência de Mulheres`,
            quantity: ticketQuantity,
            unit_price: TICKET_PRICE,
            price: TICKET_PRICE * ticketQuantity
          };
          
          const { data: createdOrderItem, error: orderItemError } = await supabaseService
            .from("order_items")
            .insert(orderItem)
            .select();
          
          if (orderItemError) {
            console.error("Error creating order_item:", orderItemError);
            throw orderItemError;
          }
          
          console.log(`✅ Order item created successfully. Criando tickets...`);
          
          // ✅ CORREÇÃO: Criar tickets automaticamente após criar order_item
          try {
            await criarTicketsParaPedido(supabaseService, createdOrder.id);
          } catch (ticketError) {
            console.error(`⚠️ Erro ao criar tickets para pedido ${createdOrder.id}:`, ticketError);
            // Não falhar o webhook por causa de erro na criação de tickets
          }
          
          // ✅ CORREÇÃO: Criar order_items de roupas se houver produtos no webhook
          try {
            await criarOrderItemsRoupasParaPedido(supabaseService, createdOrder.id);
          } catch (clothingError) {
            console.error(`⚠️ Erro ao criar order_items de roupas para pedido ${createdOrder.id}:`, clothingError);
            // Não falhar o webhook por causa de erro na criação de order_items
          }
          
          // Upsert idempotente de registros da cobrança e PIX
          try {
            await upsertChargeAndPixRecords(supabaseService, {
              orderId: createdOrder.id,
              pixId: pixQrCode.id, // pix_char_*
              payment: payment,
              pixQrCode: pixQrCode,
              customer: pixQrCode?.customer
            });
          } catch (upsertError) {
            console.warn(`⚠️ Falha ao upsert charge/pix para pedido ${createdOrder.id}:`, upsertError);
          }

          try {
            const to = customerEmail || null;
            if (to) {
              const orderId = createdOrder.id;
              await enqueueEmail(supabaseService, {
                to,
                type: 'payment_receipt',
                subject: 'Confirmação de Pagamento',
                payload: { order_id: orderId },
                idempotencyKey: `${orderId}-payment_receipt`
              });
              await enqueueEmail(supabaseService, {
                to,
                type: 'ticket_delivery',
                subject: 'Seus Ingressos',
                payload: { order_id: orderId },
                idempotencyKey: `${orderId}-ticket_delivery`
              });
            }
          } catch (queueErr) {
            console.warn('⚠️ Falha ao enfileirar e-mails para pedido pago:', queueErr?.message || queueErr);
          }

        } catch (createError) {
          console.error("Error creating order and tickets for direct payment:", createError);
          orderUpdateError = createError;
          // Don't throw - we want to continue and mark webhook as processed with error
        }
      } else {
        console.log(`Skipping order creation - payment status is ${status}, event is ${webhookData.event}`);
      }
      }
    }

    // Mark webhook as processed
    if (savedWebhook) {
      await supabaseService
        .from("webhooks")
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString() 
        })
        .eq("id", savedWebhook.id);
    }

    console.log("Webhook processed successfully");
    
    // Notificar Edge Function de realtime sobre nova mudança
    try {
      const notificationResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/realtime-notifications/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
        },
        body: JSON.stringify({
          type: "webhook_processed",
          webhookId: savedWebhook?.id,
          orderId: orderUpdateResult?.[0]?.id,
          source: "abacatepay",
          status: status
        })
      });
      
      if (notificationResponse.ok) {
        console.log("Realtime notification sent successfully");
      } else {
        console.log("Failed to send realtime notification:", await notificationResponse.text());
      }
    } catch (notifyError) {
      console.log("Error sending realtime notification:", notifyError.message);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        updated_order: orderUpdateResult?.[0] || null,
        webhook_id: savedWebhook?.id,
        message: `Webhook processed. External reference: ${external_reference}, Status: ${orderStatus}`
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error processing Abacate webhook:", error);
    
    // Mark webhook as failed if it was saved
    if (savedWebhook) {
      try {
        // Create Supabase service client for error handling
        const supabaseService = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          {
            auth: {
              persistSession: false
            }
          }
        );
        
        await supabaseService
          .from("webhooks")
          .update({ 
            processed: false,
            error_message: error.message,
            processed_at: new Date().toISOString()
          })
          .eq("id", savedWebhook.id);
      } catch (updateError) {
        console.error("Error updating webhook status:", updateError);
      }
    }
    
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 500
      }
    );
  }
});