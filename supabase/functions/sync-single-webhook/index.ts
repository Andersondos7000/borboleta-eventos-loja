import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obter PIX ID do body ou query string
    let pixId: string | null = null
    if (req.method === 'GET') {
      const url = new URL(req.url)
      pixId = url.searchParams.get('pixId') || url.searchParams.get('pix_id') || url.searchParams.get('id')
    } else if (req.method === 'POST') {
      const body = await req.json()
      pixId = body.pixId || body.pix_id || body.id || null
    }

    if (!pixId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'PIX ID é obrigatório. Use ?pixId=... ou body { pixId: ... }' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log(`🔍 Sincronizando webhook para PIX ID: ${pixId}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // AbacatePay API configuration
    const abacatePayApiKey = Deno.env.get('ABACATEPAY_API_KEY')
    if (!abacatePayApiKey) {
      throw new Error('ABACATEPAY_API_KEY não configurada')
    }

    // 1. Verificar se webhook já existe
    console.log('1️⃣ Verificando se webhook já existe...')
    const { data: existingWebhooks } = await supabase
      .from('webhooks')
      .select('id, payload')
      .eq('source', 'abacatepay')
      .limit(1000)

    const existingPixIds = new Set<string>()
    existingWebhooks?.forEach(webhook => {
      try {
        const payload = typeof webhook.payload === 'string' 
          ? JSON.parse(webhook.payload) 
          : webhook.payload
        const existingPixId = payload?.data?.pixQrCode?.id || payload?.data?.payment?.id
        if (existingPixId) {
          existingPixIds.add(existingPixId)
        }
      } catch (e) {
        // Ignore
      }
    })

    if (existingPixIds.has(pixId)) {
      console.log(`✅ Webhook já existe para PIX ID: ${pixId}`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook já existe',
          pixId 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // 2. Buscar cobrança na API do AbacatePay
    console.log('2️⃣ Buscando cobrança na API do AbacatePay...')
    
    // Tentar primeiro com /pixQrCode/check
    const checkUrl = `https://api.abacatepay.com/v1/pixQrCode/check?id=${encodeURIComponent(pixId)}`
    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacatePayApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!checkResponse.ok) {
      // Tentar buscar na lista de cobranças
      console.log('⚠️ Não encontrado em /pixQrCode/check, tentando /billing/list...')
      
      const listResponse = await fetch('https://api.abacatepay.com/v1/billing/list', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${abacatePayApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!listResponse.ok) {
        throw new Error(`Erro ao buscar cobranças: ${listResponse.status}`)
      }

      const listData = await listResponse.json()
      let charges = []
      if (Array.isArray(listData.data)) {
        charges = listData.data
      } else if (Array.isArray(listData)) {
        charges = listData
      }

      // Procurar a cobrança específica
      const charge = charges.find((c: any) => 
        c.id === pixId || 
        c.pixQrCode?.id === pixId || 
        (c as any).pixId === pixId
      )

      if (!charge) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Cobrança não encontrada na API do AbacatePay para PIX ID: ${pixId}` 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        )
      }

      // 3. Buscar pedido correspondente
      console.log('3️⃣ Buscando pedido correspondente...')
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .or(`payment_id.eq.${pixId},abacatepay_id.eq.${pixId}`)
        .maybeSingle()

      // 4. Criar webhook payload
      console.log('4️⃣ Criando webhook payload...')
      
      const customer = charge.customer || {}
      const customerMetadata = customer.metadata || {}
      
      const eventType = charge.status === 'PAID' || charge.status === 'paid' 
        ? 'billing.paid' 
        : 'billing.created'

      const webhookPayload = {
        event: eventType,
        data: {
          pixQrCode: {
            id: pixId,
            status: charge.status,
            amount: charge.amount,
            kind: charge.methods?.includes('PIX') ? 'PIX' : (charge.methods?.[0] || 'PIX'),
            customer: {
              id: customer.id || `cust_${pixId}`,
              metadata: {
                name: order?.customer_name || customerMetadata.name || customer.name || 'Cliente',
                email: order?.customer_email || customerMetadata.email || customer.email || '',
                cellphone: order?.customer_phone || customerMetadata.cellphone || '',
                taxId: order?.customer_document || customerMetadata.taxId || '',
                zipCode: customerMetadata.zipCode || ''
              }
            },
            qrCode: charge.pixQrCode?.qrCode || charge.qrCode || charge.url || null,
            expiresAt: charge.expiresAt || charge.expires_at || null
          },
          payment: {
            id: pixId,
            amount: charge.amount,
            fee: Math.round(charge.amount * 0.0089), // 0.89% estimado
            method: charge.methods?.includes('PIX') ? 'PIX' : (charge.methods?.[0] || 'PIX'),
            status: charge.status,
            customer: {
              id: customer.id || `cust_${pixId}`,
              metadata: {
                name: order?.customer_name || customerMetadata.name || customer.name || 'Cliente',
                email: order?.customer_email || customerMetadata.email || customer.email || '',
                cellphone: order?.customer_phone || customerMetadata.cellphone || '',
                taxId: order?.customer_document || customerMetadata.taxId || '',
                zipCode: customerMetadata.zipCode || ''
              }
            }
          }
        },
        devMode: charge.devMode || false
      }

      // 5. Criar webhook record
      console.log('5️⃣ Criando webhook record...')
      const isProcessed = order?.payment_status === 'paid' || 
                         charge.status === 'PAID' || 
                         charge.status === 'paid'

      const webhookRecord = {
        source: 'abacatepay',
        event_type: eventType,
        payload: webhookPayload,
        processed: isProcessed,
        processed_at: isProcessed 
          ? (order?.updated_at || charge.paidAt || charge.paid_at || new Date().toISOString())
          : null,
        created_at: order?.created_at || charge.createdAt || charge.created_at || new Date().toISOString()
      }

      const { data: createdWebhook, error: insertError } = await supabase
        .from('webhooks')
        .insert(webhookRecord)
        .select()
        .single()

      if (insertError) {
        console.error('❌ Erro ao criar webhook:', insertError)
        throw insertError
      }

      console.log(`✅ Webhook criado com sucesso: ${createdWebhook.id}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook criado com sucesso',
          webhook: {
            id: createdWebhook.id,
            pixId,
            processed: isProcessed,
            eventType
          },
          order: order ? {
            id: order.id,
            status: order.status,
            payment_status: order.payment_status
          } : null
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Se chegou aqui, o check foi bem-sucedido mas não temos dados completos
    // Tentar buscar na lista de cobranças mesmo assim
    const checkData = await checkResponse.json()
    console.log('✅ Cobrança encontrada na API:', checkData)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Cobrança encontrada mas dados incompletos. Use a sincronização completa.',
        pixId,
        status: checkData.data?.status || checkData.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Erro ao sincronizar webhook:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})














