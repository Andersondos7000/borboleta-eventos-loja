import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Interfaces
interface Customer {
  name: string
  cellphone: string
  email: string
  taxId: string // CPF
}

interface OrderItem {
  title: string
  quantity: number
  unit_price: number
  product_id?: string
  size?: string
  event_id?: string
  ticket_type?: string
}

interface CreatePixQrCodeRequest {
  amount: number // Valor em centavos
  expiresIn: number // Tempo de expiração em segundos
  description?: string
  customer: Customer
  items?: OrderItem[] // ✅ NOVO: Adicionar items para salvar no pedido
}

interface AbacatePayPixResponse {
  data: {
    id: string // pix_char_123456
    amount: number
    status: string // PENDING, PAID, EXPIRED
    devMode: boolean
    brCode: string // Código copia-e-cola
    brCodeBase64: string // QR Code em base64
    platformFee: number
    createdAt: string
    updatedAt: string
    expiresAt: string
  }
  error: any
}

// Função principal para criar PIX QR Code
async function createPixQrCode(data: CreatePixQrCodeRequest): Promise<AbacatePayPixResponse> {
  const abacatePayApiKey = Deno.env.get('ABACATEPAY_API_KEY')
  
  if (!abacatePayApiKey) {
    throw new Error('ABACATEPAY_API_KEY não configurada')
  }

  // Sanitização e validação leve conforme documentação:
  // - amount em centavos (número)
  // - expiresIn em segundos (padrão 3600)
  // - customer é opcional; se qualquer campo for informado, todos name, cellphone, email, taxId devem estar presentes
  const toDigits = (v?: string) => (v ? v.replace(/\D+/g, '') : '')
  const hasText = (v?: string) => !!(v && v.trim().length > 0)

  const sanitizedCustomer = {
    name: data.customer?.name?.trim() || '',
    cellphone: toDigits(data.customer?.cellphone),
    email: data.customer?.email?.trim() || '',
    taxId: toDigits(data.customer?.taxId)
  }

  const includeCustomer =
    hasText(sanitizedCustomer.name) &&
    hasText(sanitizedCustomer.email) &&
    hasText(sanitizedCustomer.cellphone) &&
    hasText(sanitizedCustomer.taxId)

  const payload: Record<string, unknown> = {
    amount: typeof data.amount === 'number' ? data.amount : Number(data.amount),
    expiresIn: typeof data.expiresIn === 'number' ? data.expiresIn : 3600,
    description: data.description || 'Pagamento PIX'
  }

  if (includeCustomer) {
    payload.customer = sanitizedCustomer
  }

  console.log('📤 Enviando para AbacatePay pixQrCode/create:', JSON.stringify(payload, null, 2))

  const response = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${abacatePayApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const responseData = await response.json()
  
  console.log('📥 Resposta da AbacatePay:', JSON.stringify(responseData, null, 2))

  if (!response.ok) {
    console.error('❌ Erro da AbacatePay:', response.status, responseData)
    throw new Error(`Erro da AbacatePay: ${response.status} - ${JSON.stringify(responseData)}`)
  }

  return responseData
}

// Validação de CPF
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '')
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cpf.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cpf.charAt(10))) return false

  return true
}

// Validação dos dados de entrada
function validatePixQrCodeData(data: any): string[] {
  const errors: string[] = []

  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push('amount deve ser um número positivo')
  }

  if (!data.expiresIn || typeof data.expiresIn !== 'number' || data.expiresIn <= 0) {
    errors.push('expiresIn deve ser um número positivo (segundos)')
  }

  if (!data.customer) {
    errors.push('customer é obrigatório')
  } else {
    if (!data.customer.name || typeof data.customer.name !== 'string') {
      errors.push('customer.name é obrigatório')
    }

    if (!data.customer.email || typeof data.customer.email !== 'string') {
      errors.push('customer.email é obrigatório')
    }

    if (!data.customer.cellphone || typeof data.customer.cellphone !== 'string') {
      errors.push('customer.cellphone é obrigatório')
    }

    if (!data.customer.taxId || typeof data.customer.taxId !== 'string') {
      errors.push('customer.taxId (CPF) é obrigatório')
    } else if (!isValidCPF(data.customer.taxId)) {
      errors.push('customer.taxId deve ser um CPF válido')
    }
  }

  return errors
}

// ✅ NOVO: Criar pedido no banco ANTES de criar o PIX
async function createOrderInDatabase(
  pixData: AbacatePayPixResponse['data'],
  requestData: CreatePixQrCodeRequest,
  supabaseClient: any
) {
  try {
    console.log('💾 Criando pedido no banco antes de gerar PIX...')
    
    // ✅ VALIDAR ESTOQUE ANTES DE CRIAR PEDIDO
    if (requestData.items && requestData.items.length > 0) {
      const productsToValidate = requestData.items.filter(item => item.product_id);
      
      if (productsToValidate.length > 0) {
        console.log('🔍 Validando estoque dos produtos...');
        
        for (const item of productsToValidate) {
          const { data: product, error: productError } = await supabaseClient
            .from('products')
            .select('id, name, stock_quantity')
            .eq('id', item.product_id)
            .single();
          
          if (productError || !product) {
            throw new Error(`Produto ${item.product_id} não encontrado`);
          }
          
          const availableStock = product.stock_quantity || 0;
          const requestedQuantity = item.quantity || 1;
          
          if (availableStock < requestedQuantity) {
            throw new Error(
              `Estoque insuficiente para ${product.name}. ` +
              `Disponível: ${availableStock}, Solicitado: ${requestedQuantity}`
            );
          }
          
          console.log(`✅ Estoque OK: ${product.name} (${availableStock} disponível, ${requestedQuantity} solicitado)`);
        }
      }
    }
    
    // Buscar user_id pelo email do cliente
    let userId = null
    if (requestData.customer.email) {
      try {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', requestData.customer.email)
          .maybeSingle()
        
        if (profile) {
          userId = profile.id
          console.log(`✅ User ID encontrado: ${userId}`)
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar user_id:', error)
      }
    }
    
    // Criar pedido
    const orderData = {
      user_id: userId,
      customer_name: requestData.customer.name,
      customer_email: requestData.customer.email,
      customer_phone: requestData.customer.cellphone,
      customer_document: requestData.customer.taxId,
      total_amount: requestData.amount,
      payment_id: pixData.id, // pix_char_*
      payment_method: 'pix',
      payment_status: 'pending',
      status: 'pending',
      items: requestData.items || [],
      customer_data: {
        name: requestData.customer.name,
        email: requestData.customer.email,
        phone: requestData.customer.cellphone,
        document: requestData.customer.taxId,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    const { data: order, error } = await supabaseClient
      .from('orders')
      .insert(orderData)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Erro ao criar pedido:', error)
      throw error
    }
    
    console.log(`✅ Pedido criado com sucesso: ${order.id}`)
    console.log(`✅ Correlação: Order ID ${order.id} -> PIX ID ${pixData.id}`)
    
    // ✅ NOVO: Criar order_items se houver items
    if (requestData.items && requestData.items.length > 0) {
      const orderItems = requestData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id || null,
        event_id: item.event_id || null,
        ticket_type: item.ticket_type || null,
        name: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        size: item.size || null,
        created_at: new Date().toISOString(),
      }))
      
      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(orderItems)
      
      if (itemsError) {
        console.error('❌ Erro ao criar order_items:', itemsError)
        // Não falhar - order_items podem ser criados depois pelo webhook
      } else {
        console.log(`✅ ${orderItems.length} order_items criados`)
      }
    }
    
    return order
  } catch (error) {
    console.error('❌ Erro ao criar pedido:', error)
    throw error
  }
}

// Salvar PIX no banco de dados
async function savePixToDatabase(pixData: AbacatePayPixResponse['data'], requestData: CreatePixQrCodeRequest) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Variáveis do Supabase não configuradas, pulando salvamento no banco')
    return
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/pix_payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Prefer': 'resolution=merge-duplicates' // Upsert em caso de conflito
      },
      body: JSON.stringify({
        pix_id: pixData.id,
        amount: pixData.amount,
        status: pixData.status,
        br_code: pixData.brCode,
        qr_code_base64: pixData.brCodeBase64,
        customer_name: requestData.customer.name,
        customer_email: requestData.customer.email,
        customer_cellphone: requestData.customer.cellphone,
        customer_tax_id: requestData.customer.taxId,
        description: requestData.description,
        expires_at: pixData.expiresAt,
        created_at: pixData.createdAt,
        updated_at: new Date().toISOString(),
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Erro ao salvar PIX no banco:', errorData)
    } else {
      console.log('✅ PIX salvo no banco com sucesso')
    }
  } catch (error) {
    console.error('❌ Erro ao salvar PIX no banco:', error)
  }
}

async function findExistingPixPayment(requestData: CreatePixQrCodeRequest) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) return null
  try {
    const nowIso = new Date().toISOString()
    const url = `${supabaseUrl}/rest/v1/pix_payments?select=*&customer_email=eq.${encodeURIComponent(requestData.customer.email)}&amount=eq.${requestData.amount}&status=eq.PENDING&expires_at=gt.${encodeURIComponent(nowIso)}&limit=1`
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Accept': 'application/json'
      }
    })
    if (!res.ok) return null
    const rows = await res.json()
    if (Array.isArray(rows) && rows.length > 0) {
      const r = rows[0]
      return {
        data: {
          id: r.pix_id,
          amount: r.amount,
          status: r.status,
          devMode: !!r.dev_mode,
          brCode: r.br_code,
          brCodeBase64: r.qr_code_base64,
          platformFee: 0,
          createdAt: r.created_at,
          updatedAt: r.updated_at || r.created_at,
          expiresAt: r.expires_at,
        },
        error: null
      } as AbacatePayPixResponse
    }
  } catch (_) {
    return null
  }
  return null
}

// Handler principal
serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`🚀 ${req.method} ${req.url}`)

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const requestData = await req.json()
    console.log('📥 Dados recebidos:', JSON.stringify(requestData, null, 2))

    // Validação
    const validationErrors = validatePixQrCodeData(requestData)
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Dados inválidos', 
          details: validationErrors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ CORREÇÃO: Verificar se já existe PIX pendente para evitar duplicação
    const existing = await findExistingPixPayment(requestData)
    
    let pixResponse: AbacatePayPixResponse
    let order = null
    
    if (existing) {
      console.log('✅ PIX existente encontrado - reutilizando')
      pixResponse = existing
      
      // Buscar pedido existente para retornar
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data } = await supabase
          .from('orders')
          .select('id')
          .eq('payment_id', existing.data.id)
          .maybeSingle()
        order = data
      }
    } else {
      // Criar novo PIX
      pixResponse = await createPixQrCode(requestData)
      
      // ✅ CORREÇÃO PRINCIPAL: Criar pedido no banco ANTES de retornar o PIX
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        order = await createOrderInDatabase(pixResponse.data, requestData, supabase)
      }
      
      // Salvar PIX no banco
      await savePixToDatabase(pixResponse.data, requestData)
    }

    // Resposta de sucesso com order_id para correlação
    return new Response(
      JSON.stringify({
        data: {
          id: pixResponse.data.id,
          amount: pixResponse.data.amount,
          status: pixResponse.data.status,
          brCode: pixResponse.data.brCode,
          brCodeBase64: pixResponse.data.brCodeBase64,
          expiresAt: pixResponse.data.expiresAt,
          devMode: pixResponse.data.devMode,
          order_id: order?.id || null // ✅ NOVO: Retornar order_id para o frontend
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erro na função:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
