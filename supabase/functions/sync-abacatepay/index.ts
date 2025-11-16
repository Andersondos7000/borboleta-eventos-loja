import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AbacatePayCharge {
  id: string;
  url: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  devMode: boolean;
  methods: string[];
  frequency: string;
  nextBilling: string | null;
  metadata?: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerDocument?: string;
    [key: string]: any;
  };
  products?: Array<{
    name?: string;
    externalId?: string;
    quantity?: number;
    price?: number;
  }>;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  expiredAt?: string;
  cancelledAt?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { debug = false, limit = null } = await req.json().catch(() => ({}))
    
    console.log('🚀 Iniciando sincronização automática da AbacatePay...')
    if (debug) console.log('🐛 Modo debug ativado')
    if (limit) console.log(`📊 Limitando a ${limit} registros para debug`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // AbacatePay API configuration
    const abacatePayApiKey = Deno.env.get('ABACATEPAY_API_KEY')!
    
    if (!abacatePayApiKey) {
      throw new Error('ABACATEPAY_API_KEY não configurada')
    }

    // Fetch all charges from AbacatePay
    console.log('📡 Buscando cobranças da AbacatePay...')
    let url = 'https://api.abacatepay.com/v1/billing/list'
    if (limit) url += `?limit=${limit}`
    
    const abacateResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacatePayApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!abacateResponse.ok) {
      throw new Error(`Erro na API AbacatePay: ${abacateResponse.status}`)
    }

    const abacateData = await abacateResponse.json()
    const charges: AbacatePayCharge[] = abacateData.data || []
    console.log(`📊 Encontradas ${charges.length} cobranças na AbacatePay`)
    
    if (debug && charges.length > 0) {
      console.log('🔍 Primeira cobrança (debug):', JSON.stringify(charges[0], null, 2))
    }

    // Get existing orders from Supabase
    const { data: existingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('payment_id')
      .not('payment_id', 'is', null)

    if (fetchError) {
      throw new Error(`Erro ao buscar pedidos existentes: ${fetchError.message}`)
    }

    const existingPaymentIds = new Set(existingOrders?.map(order => order.payment_id) || [])
    console.log(`💾 Encontrados ${existingPaymentIds.size} pedidos já sincronizados`)

    // Filter charges that need to be synchronized
    const chargesToSync = charges.filter(charge => !existingPaymentIds.has(charge.id))
    console.log(`🔄 ${chargesToSync.length} cobranças precisam ser sincronizadas`)

    let syncedCount = 0
    let updatedCount = 0
    let errors = 0

    // Sync each missing charge
    for (const charge of chargesToSync) {
      try {
        // Map AbacatePay status to our status
        let orderStatus = 'pending'
        let paidAt = null
        let expiredAt = null
        let cancelledAt = null

        switch (charge.status) {
          case 'PAID':
            orderStatus = 'paid'
            paidAt = charge.paidAt || charge.updatedAt
            break
          case 'EXPIRED':
            orderStatus = 'expired'
            expiredAt = charge.expiredAt || charge.updatedAt
            break
          case 'CANCELLED':
            orderStatus = 'cancelled'
            cancelledAt = charge.cancelledAt || charge.updatedAt
            break
          default:
            orderStatus = 'pending'
        }

        // Handle customer data - Support both old and new AbacatePay formats
        let customerId, customerName, customerEmail, customerPhone, customerDocument;
        
        if (charge.customer && charge.customer.id) {
          // New format: customer object exists
          customerId = charge.customer.id;
          customerName = charge.customer.metadata?.name || 'Cliente AbacatePay';
          customerEmail = charge.customer.metadata?.email || null;
          customerPhone = charge.customer.metadata?.cellphone || null;
          customerDocument = charge.customer.metadata?.taxId || null;
        } else {
          // Old format: no customer object, generate ID from charge
          customerId = `abacate_${charge.id}`;
          customerName = charge.metadata?.customerName || charge.metadata?.name || 'Cliente AbacatePay';
          customerEmail = charge.metadata?.customerEmail || charge.metadata?.email || null;
          customerPhone = charge.metadata?.customerPhone || charge.metadata?.cellphone || null;
          customerDocument = charge.metadata?.customerDocument || charge.metadata?.taxId || null;
        }

        if (debug) {
          console.log(`🔍 Processando cobrança ${charge.id}:`)
          console.log(`   - Customer ID: ${customerId}`)
          console.log(`   - Customer Name: ${customerName}`)
          console.log(`   - Customer Email: ${customerEmail}`)
          console.log(`   - Has customer object: ${!!charge.customer}`)
          console.log(`   - Metadata:`, JSON.stringify(charge.metadata, null, 2))
        }

        // Create or update customer using external_id for AbacatePay ID
        if (debug) {
          console.log(`🔍 Tentando upsert do cliente:`)
          console.log(`   - external_id: "${customerId}" (tipo: ${typeof customerId})`)
          console.log(`   - full_name: "${customerName}"`)
          console.log(`   - email: "${customerEmail}"`)
        }

        const customerData = {
          external_id: customerId, // Store AbacatePay ID here
          full_name: customerName,
          email: customerEmail,
          phone: customerPhone,
          document: customerDocument,
          document_type: 'cpf',
          status: 'active',
          customer_type: 'individual',
          country: 'BR'
        }

        if (debug) {
          console.log(`🔍 Dados do cliente para upsert:`, JSON.stringify(customerData, null, 2))
        }

        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .upsert(customerData, { ignoreDuplicates: false })
          .select()
          .single()

        if (customerError) {
          console.error(`❌ Erro ao criar/atualizar cliente ${customerId}:`, customerError)
          if (debug) console.error('🔍 Dados da cobrança:', JSON.stringify(charge, null, 2))
          errors++
          continue
        }

        // Validate and sanitize amount - ensure it's never null/undefined
        const validAmount = charge.amount && typeof charge.amount === 'number' && charge.amount > 0 
          ? charge.amount 
          : 0; // Default to 0 if invalid

        if (debug && validAmount === 0) {
          console.log(`⚠️ Cobrança ${charge.id} tem amount inválido: ${charge.amount}, usando 0`)
        }

        // Create order with proper mapping
        const orderData = {
          external_id: charge.id, // Store AbacatePay charge ID here
          customer_id: customer?.id, // Use the UUID generated by Supabase
          total_amount: validAmount, // Use validated amount
          status: orderStatus,
          payment_id: charge.id,
          payment_method: charge.methods?.join(',') || 'pix',
          payment_status: orderStatus === 'paid' ? 'paid' : 'pending',
          customer_data: {
            name: customerName,
            email: customerEmail || '',
            phone: customerPhone || '',
            document: customerDocument || ''
          },
          items: charge.products?.map(product => ({
            name: product.name || product.externalId || 'Produto',
            price: validAmount > 0 ? Math.round(validAmount / (charge.products?.length || 1)) : 0, // Use validated amount
            quantity: product.quantity || 1
          })) || [{
            name: 'Produto AbacatePay',
            price: validAmount, // Use validated amount
            quantity: 1
          }],
          created_at: charge.createdAt,
          updated_at: charge.updatedAt
        }

        if (debug) {
          console.log('🔍 Dados do pedido a ser inserido:', JSON.stringify(orderData, null, 2))
        }

        const { error: orderError } = await supabase
          .from('orders')
          .upsert(orderData, { ignoreDuplicates: false })

        if (orderError) {
          console.error(`❌ Erro ao criar pedido para cobrança ${charge.id}:`, orderError)
          if (debug) {
            console.error('🔍 Detalhes do erro:', JSON.stringify(orderError, null, 2))
            console.error('🔍 Dados que causaram erro:', JSON.stringify(orderData, null, 2))
          }
          errors++
        } else {
          syncedCount++
          console.log(`✅ Sincronizada cobrança ${charge.id} - Status: ${orderStatus}`)
        }

      } catch (error) {
        console.error(`❌ Erro ao processar cobrança ${charge.id}:`, error)
        if (debug) {
          console.error('🔍 Dados da cobrança com erro:', JSON.stringify(charge, null, 2))
          console.error('🔍 Stack trace:', error.stack)
        }
        errors++
      }
    }

    // Update existing orders status if needed
    console.log('🔄 Verificando atualizações de status...')
    
    for (const charge of charges.filter(c => existingPaymentIds.has(c.id))) {
      try {
        let orderStatus = 'pending'
        let paidAt = null
        let expiredAt = null
        let cancelledAt = null

        switch (charge.status) {
          case 'PAID':
            orderStatus = 'paid'
            paidAt = charge.paidAt || charge.updatedAt
            break
          case 'EXPIRED':
            orderStatus = 'expired'
            expiredAt = charge.expiredAt || charge.updatedAt
            break
          case 'CANCELLED':
            orderStatus = 'cancelled'
            cancelledAt = charge.cancelledAt || charge.updatedAt
            break
          default:
            orderStatus = 'pending'
        }

        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: orderStatus,
            paid_at: paidAt,
            expired_at: expiredAt,
            cancelled_at: cancelledAt,
            updated_at: charge.updatedAt
          })
          .eq('payment_id', charge.id)

        if (updateError) {
          console.error(`❌ Erro ao atualizar pedido ${charge.id}:`, updateError)
          errors++
        } else {
          updatedCount++
        }

      } catch (error) {
        console.error(`❌ Erro ao atualizar cobrança ${charge.id}:`, error)
        errors++
      }
    }

    const result = {
      success: true,
      message: 'Sincronização automática concluída',
      stats: {
        total_charges: charges.length,
        already_synced: existingPaymentIds.size,
        new_synced: syncedCount,
        updated: updatedCount,
        errors: errors
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
    console.error('❌ Erro na sincronização automática:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})