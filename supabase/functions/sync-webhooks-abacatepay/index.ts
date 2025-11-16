import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AbacatePayCharge {
  id: string;
  url?: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | string;
  devMode?: boolean;
  methods?: string[];
  frequency?: string;
  nextBilling?: string | null;
  customer?: {
    id?: string;
    name?: string;
    email?: string;
    metadata?: {
      name?: string;
      email?: string;
      cellphone?: string;
      taxId?: string;
      zipCode?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  pixQrCode?: {
    id?: string;
    qrCode?: string;
    status?: string;
    [key: string]: any;
  };
  qrCode?: string;
  pixKey?: string;
  products?: Array<{
    name?: string;
    externalId?: string;
    quantity?: number;
    price?: number;
    [key: string]: any;
  }>;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  paidAt?: string;
  paid_at?: string;
  expiresAt?: string;
  expires_at?: string;
  cancelledAt?: string;
  cancelled_at?: string;
  [key: string]: any; // Permitir campos adicionais
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Iniciando sincronização de webhooks do AbacatePay...')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // AbacatePay API configuration
    const abacatePayApiKey = Deno.env.get('ABACATEPAY_API_KEY')
    if (!abacatePayApiKey) {
      throw new Error('ABACATEPAY_API_KEY não configurada')
    }

    // Fetch all charges from AbacatePay
    console.log('📡 Buscando cobranças da AbacatePay...')
    const abacateResponse = await fetch('https://api.abacatepay.com/v1/billing/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacatePayApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!abacateResponse.ok) {
      const errorText = await abacateResponse.text()
      console.error('❌ Erro na API AbacatePay:', abacateResponse.status, errorText)
      throw new Error(`AbacatePay API error: ${abacateResponse.status} - ${errorText}`)
    }

    const abacateData = await abacateResponse.json()
    console.log('📋 Resposta da API AbacatePay:', JSON.stringify(abacateData, null, 2))
    
    // A API do AbacatePay pode retornar dados em diferentes formatos
    // Tentar data.data, data, ou array direto
    let charges: AbacatePayCharge[] = []
    if (Array.isArray(abacateData.data)) {
      charges = abacateData.data
    } else if (Array.isArray(abacateData)) {
      charges = abacateData
    } else if (abacateData.data?.data && Array.isArray(abacateData.data.data)) {
      charges = abacateData.data.data
    } else if (abacateData.data && typeof abacateData.data === 'object') {
      // Se data não é array, pode ser um objeto com array dentro
      charges = Object.values(abacateData.data).filter(Array.isArray)[0] || []
    }
    
    console.log(`📊 Encontradas ${charges.length} cobranças na AbacatePay`)

    // Get existing webhooks from Supabase
    const { data: existingWebhooks, error: fetchError } = await supabase
      .from('webhooks')
      .select('payload')
      .eq('source', 'abacatepay')

    if (fetchError) {
      console.error('❌ Erro ao buscar webhooks existentes:', fetchError)
      throw new Error(`Erro ao buscar webhooks: ${fetchError.message}`)
    }

    // Extract PIX IDs from existing webhooks
    const existingWebhookPixIds = new Set<string>()
    existingWebhooks?.forEach(webhook => {
      try {
        const payload = typeof webhook.payload === 'string' 
          ? JSON.parse(webhook.payload) 
          : webhook.payload
        const pixId = payload?.data?.pixQrCode?.id || payload?.data?.payment?.id
        if (pixId) {
          existingWebhookPixIds.add(pixId)
        }
      } catch (e) {
        console.warn('⚠️ Erro ao processar webhook existente:', e)
      }
    })

    // ✅ CORREÇÃO: Buscar pedidos existentes para usar seus dados, mas NÃO adicionar aos existingPixIds
    // Apenas webhooks existentes devem ser considerados para evitar criar webhooks duplicados
    // Pedidos sem webhooks devem ter webhooks criados
    const { data: existingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('payment_id, customer_email, customer_name, total_amount, created_at, payment_status, updated_at')
      .not('payment_id', 'is', null)

    const orderMap = new Map<string, any>()
    if (!ordersError && existingOrders) {
      existingOrders.forEach(order => {
        if (order.payment_id) {
          orderMap.set(order.payment_id, order)
          console.log(`📋 PIX ID encontrado em pedido: ${order.payment_id}`)
        }
      })
    }

    // ✅ CORREÇÃO: Usar apenas webhooks existentes para verificar duplicatas
    // Pedidos sem webhooks devem ter webhooks criados pela sincronização
    // Isso permite criar webhooks para pedidos que existem mas não têm webhooks (como pix_char_kxSq0RnQGgxXP43qTXZAkkHc)
    const existingPixIds = existingWebhookPixIds

    console.log(`💾 Encontrados ${existingPixIds.size} PIX IDs com webhooks existentes`)
    console.log(`📋 Encontrados ${orderMap.size} pedidos com payment_id`)

    // Filter charges that need webhooks created
    // ✅ CORREÇÃO: A API do AbacatePay pode retornar diferentes formatos de ID
    // Verificar charge.id, charge.pixQrCode?.id, ou outros campos que possam conter o PIX ID
    const chargesToSync = charges.filter(charge => {
      // ✅ CORREÇÃO: Determinar o PIX ID correto para esta cobrança
      // Se charge.id começa com 'pix_char_', é o PIX ID
      // Caso contrário, pode ser um billing ID e precisamos verificar outros campos
      let pixId = charge.id
      
      if (!pixId?.startsWith('pix_char_')) {
        // Tentar encontrar o PIX ID em outros campos
        pixId = charge.pixQrCode?.id || (charge as any).pixId || (charge as any).pix_qr_code_id || pixId
        
        // Se ainda não encontrou um PIX ID válido com prefixo, usar charge.id mesmo
        // Mas verificar se existe nos pedidos/webhooks usando charge.id diretamente
        if (!pixId?.startsWith('pix_char_')) {
          // Se charge.id não tem prefixo, pode ser que precise do prefixo ou não
          // Verificar se charge.id (sem prefixo) existe nos existingPixIds
          // E também verificar se pix_char_ + charge.id existe
          const hasWithoutPrefix = existingPixIds.has(charge.id)
          const hasWithPrefix = existingPixIds.has(`pix_char_${charge.id}`)
          
          if (hasWithoutPrefix || hasWithPrefix) {
            console.log(`⏭️ Cobrança ${charge.id} já tem webhook ou pedido relacionado`)
            return false
          }
          
          // Se não encontrou, usar charge.id como está (será usado para criar webhook)
          pixId = charge.id
        }
      }
      
      // Verificar se este PIX ID já existe
      const needsSync = !existingPixIds.has(pixId)
      
      if (!needsSync) {
        console.log(`⏭️ Cobrança ${charge.id} (pixId: ${pixId}) já tem webhook ou pedido relacionado`)
      } else {
        console.log(`✅ Cobrança ${charge.id} (pixId: ${pixId}) precisa de webhook criado`)
      }
      
      return needsSync
    })

    console.log(`🔄 ${chargesToSync.length} cobranças precisam de webhooks criados (de ${charges.length} total)`)
    
    // ✅ DEBUG: Listar IDs das cobranças que precisam ser sincronizadas
    if (chargesToSync.length > 0) {
      console.log('📋 IDs das cobranças a sincronizar:', chargesToSync.map(c => c.id).join(', '))
    }

    let createdCount = 0
    let errors = 0
    const errorsDetails: Array<{ chargeId: string; error: string }> = []

    // ✅ CORREÇÃO: Criar mapa de pedidos por payment_id para referência rápida
    const { data: allOrders, error: allOrdersError } = await supabase
      .from('orders')
      .select('payment_id, customer_email, customer_name, total_amount, created_at, payment_status')
      .not('payment_id', 'is', null)
    
    const ordersByPaymentId = new Map<string, any>()
    if (!allOrdersError && allOrders) {
      allOrders.forEach(order => {
        if (order.payment_id) {
          ordersByPaymentId.set(order.payment_id, order)
        }
      })
    }
    
    // Create webhooks for each charge
    for (const charge of chargesToSync) {
      try {
        // Determine event type based on status
        let eventType = 'billing.created'
        if (charge.status === 'PAID' || charge.status === 'paid') {
          eventType = 'billing.paid'
        } else if (charge.status === 'EXPIRED' || charge.status === 'expired') {
          eventType = 'billing.expired'
        } else if (charge.status === 'CANCELLED' || charge.status === 'cancelled') {
          eventType = 'billing.cancelled'
        }
        
        // ✅ CORREÇÃO: Determinar o PIX ID correto
        // 1. Primeiro, verificar se charge.id ou charge.pixQrCode.id existe no orderMap (pedidos)
        // 2. Se existir, usar o payment_id do pedido (que é o PIX ID correto)
        // 3. Se não existir, usar charge.id ou charge.pixQrCode.id
        let pixId = charge.id
        let matchingOrder = null
        
        // Verificar se este charge.id corresponde a algum pedido
        if (orderMap.has(charge.id)) {
          matchingOrder = orderMap.get(charge.id)
          pixId = charge.id // Já é o payment_id correto
          console.log(`🔗 Cobrança ${charge.id} corresponde ao pedido existente`)
        } else if (charge.pixQrCode?.id && orderMap.has(charge.pixQrCode.id)) {
          matchingOrder = orderMap.get(charge.pixQrCode.id)
          pixId = charge.pixQrCode.id
          console.log(`🔗 Cobrança ${charge.id} (pixQrCode.id: ${charge.pixQrCode.id}) corresponde ao pedido existente`)
        } else {
          // Tentar encontrar pedido por email e valor (fallback)
          const chargeEmail = charge.customer?.metadata?.email || charge.customer?.email
          const chargeAmountReais = (charge.amount || 0) / 100
          
          if (chargeEmail && chargeAmountReais > 0) {
            matchingOrder = Array.from(ordersByPaymentId.values()).find(order => {
              const orderEmail = order.customer_email
              const orderAmount = parseFloat(order.total_amount || '0')
              return orderEmail === chargeEmail && Math.abs(orderAmount - chargeAmountReais) < 1
            })
            
            if (matchingOrder && matchingOrder.payment_id) {
              pixId = matchingOrder.payment_id
              console.log(`🔗 Cobrança ${charge.id} corresponde ao pedido ${matchingOrder.payment_id} (por email/valor)`)
            }
          }
          
          // Se não encontrou pedido, usar charge.id ou charge.pixQrCode.id
          if (!matchingOrder) {
            if (!pixId?.startsWith('pix_char_')) {
              pixId = charge.pixQrCode?.id || (charge as any).pixId || (charge as any).pix_qr_code_id || pixId
              if (!pixId?.startsWith('pix_char_')) {
                pixId = charge.id
              }
            }
          }
        }
        
        // ✅ IMPORTANTE: Verificar se já existe webhook com este PIX ID
        // Se existir, pular esta cobrança (independente de ter pedido ou não)
        if (existingPixIds.has(pixId)) {
          console.log(`⏭️ Webhook já existe para PIX ID ${pixId}, pulando cobrança ${charge.id}`)
          continue
        }
        
        // ✅ Se encontrou pedido mas não tem webhook, criar o webhook (esta é a correção principal!)
        if (matchingOrder) {
          console.log(`✅ Pedido encontrado para PIX ID ${pixId}, mas sem webhook - criando webhook...`)
        }

        // Build webhook payload in the format expected by the system
        // This format matches what the AbacatePay webhook sends
        // A API do AbacatePay retorna cobranças com estrutura diferente do webhook
        // Precisamos adaptar para o formato esperado pelo sistema
        
        // ✅ CORREÇÃO: Extrair dados do cliente - priorizar dados do pedido se encontrado
        let customerId = `cust_${pixId}`
        let customerName = 'Cliente'
        let customerEmail: string | null = null
        let customerCellphone: string | null = null
        let customerTaxId: string | null = null
        let customerZipCode: string | null = null
        
        // Se encontrou pedido correspondente, usar dados do pedido (mais confiáveis)
        if (matchingOrder) {
          customerName = matchingOrder.customer_name || 'Cliente'
          customerEmail = matchingOrder.customer_email || null
          customerId = `cust_${pixId}`
          console.log(`📋 Usando dados do pedido: ${customerName} (${customerEmail})`)
        } else if (charge.customer) {
          // Usar dados da cobrança
          customerId = charge.customer.id || customerId
          if (charge.customer.metadata) {
            customerName = charge.customer.metadata.name || customerName
            customerEmail = charge.customer.metadata.email || null
            customerCellphone = charge.customer.metadata.cellphone || null
            customerTaxId = charge.customer.metadata.taxId || null
            customerZipCode = charge.customer.metadata.zipCode || null
          } else {
            // Tentar campos diretos no customer
            customerName = charge.customer.name || customerName
            customerEmail = charge.customer.email || null
          }
        }
        
        console.log(`🔍 Criando webhook para PIX ID: ${pixId} (charge.id: ${charge.id}, matchingOrder: ${!!matchingOrder})`)
        
        // Determinar método de pagamento
        const paymentMethod = charge.methods?.includes('PIX') ? 'PIX' : (charge.methods?.[0] || 'PIX')
        
        // Calcular taxa (se não disponível, estimar)
        const fee = Math.round(charge.amount * 0.0089) // 0.89% é uma taxa típica do PIX
        
        const webhookPayload = {
          event: eventType,
          data: {
            pixQrCode: {
              id: pixId, // ✅ CORREÇÃO: Usar o PIX ID correto (do pedido ou da cobrança)
              status: charge.status,
              amount: charge.amount, // Amount in cents
              kind: paymentMethod,
              customer: {
                id: customerId,
                metadata: {
                  name: customerName,
                  email: customerEmail,
                  cellphone: customerCellphone,
                  taxId: customerTaxId,
                  zipCode: customerZipCode
                }
              },
              qrCode: charge.pixQrCode?.qrCode || charge.qrCode || charge.url || null,
              expiresAt: charge.expiresAt || null
            },
            payment: {
              id: pixId, // ✅ CORREÇÃO: Usar o mesmo PIX ID
              amount: charge.amount, // Amount in cents
              fee: fee,
              method: paymentMethod,
              status: charge.status,
              customer: {
                id: customerId,
                metadata: {
                  name: customerName,
                  email: customerEmail,
                  cellphone: customerCellphone,
                  taxId: customerTaxId,
                  zipCode: customerZipCode
                }
              }
            }
          },
          devMode: charge.devMode || false
        }

        // Create webhook record
        // ✅ CORREÇÃO: Usar data do pedido se disponível, senão usar data da cobrança
        const chargeCreatedAt = matchingOrder?.created_at 
          ? new Date(matchingOrder.created_at).toISOString()
          : (charge.createdAt || charge.created_at || new Date().toISOString())
        const chargeUpdatedAt = charge.updatedAt || charge.updated_at || chargeCreatedAt
        const chargePaidAt = matchingOrder?.paid_at 
          ? new Date(matchingOrder.paid_at).toISOString()
          : (charge.paidAt || charge.paid_at || null)
        const chargeExpiresAt = charge.expiresAt || charge.expires_at || null
        
        // ✅ CORREÇÃO: Usar payment_status do pedido se disponível
        const isProcessed = matchingOrder?.payment_status === 'paid' 
          || charge.status === 'PAID' 
          || charge.status === 'paid'
        
        const webhookRecord = {
          source: 'abacatepay',
          event_type: eventType,
          payload: webhookPayload,
          processed: isProcessed, // Mark as processed if already paid
          processed_at: isProcessed
            ? (chargePaidAt || chargeUpdatedAt || new Date().toISOString()) 
            : null,
          created_at: chargeCreatedAt
        }
        
        console.log(`💾 Criando webhook record: PIX ID=${pixId}, processed=${isProcessed}, eventType=${eventType}`)

        const { error: insertError } = await supabase
          .from('webhooks')
          .insert(webhookRecord)

        if (insertError) {
          console.error(`❌ Erro ao criar webhook para cobrança ${charge.id}:`, insertError)
          errors++
          errorsDetails.push({
            chargeId: charge.id,
            error: insertError.message
          })
        } else {
          createdCount++
          console.log(`✅ Webhook criado para cobrança ${charge.id} - Status: ${charge.status}`)
        }

      } catch (error) {
        console.error(`❌ Erro ao processar cobrança ${charge.id}:`, error)
        errors++
        errorsDetails.push({
          chargeId: charge.id,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }

    const result = {
      success: true,
      message: 'Sincronização de webhooks concluída',
      stats: {
        total_charges: charges.length,
        existing_webhooks: existingPixIds.size,
        new_webhooks_created: createdCount,
        errors: errors,
        errors_details: errorsDetails.length > 0 ? errorsDetails : undefined
      },
      timestamp: new Date().toISOString()
    }

    console.log('✅ Sincronização concluída:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erro na sincronização de webhooks:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

