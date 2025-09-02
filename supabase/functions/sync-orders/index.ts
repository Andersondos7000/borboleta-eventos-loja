import { serve } from 'std/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { corsHeaders, handleCors, getAllHeaders } from '../_shared/cors.ts'

interface OrderSyncRequest {
  action: 'sync' | 'create' | 'update_status' | 'cancel' | 'process_payment' | 'get_analytics'
  order_id?: string
  order_data?: any
  status?: string
  payment_data?: any
  filters?: {
    status?: string
    date_range?: { start: string; end: string }
    user_id?: string
  }
  analytics_period?: 'day' | 'week' | 'month' | 'year'
}

interface OrderSyncResponse {
  success: boolean
  data?: any
  error?: string
  sync_token?: string
  analytics?: any
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: getAllHeaders() }
      )
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: getAllHeaders() }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: getAllHeaders() }
      )
    }

    // Parse request body
    const body: OrderSyncRequest = await req.json()
    const { action, order_id, order_data, status, payment_data, filters, analytics_period } = body

    let result: OrderSyncResponse = { success: false }

    switch (action) {
      case 'sync':
        result = await syncOrders(supabase, filters, user.id)
        break

      case 'create':
        if (!order_data) {
          throw new Error('Order data required for create action')
        }
        result = await createOrder(supabase, order_data, user.id)
        break

      case 'update_status':
        if (!order_id || !status) {
          throw new Error('Order ID and status required for update_status action')
        }
        result = await updateOrderStatus(supabase, order_id, status, user.id)
        break

      case 'cancel':
        if (!order_id) {
          throw new Error('Order ID required for cancel action')
        }
        result = await cancelOrder(supabase, order_id, user.id)
        break

      case 'process_payment':
        if (!order_id || !payment_data) {
          throw new Error('Order ID and payment data required for process_payment action')
        }
        result = await processPayment(supabase, order_id, payment_data, user.id)
        break

      case 'get_analytics':
        result = await getOrderAnalytics(supabase, analytics_period || 'month', user.id)
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: getAllHeaders() }
    )

  } catch (error) {
    console.error('Order sync error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: getAllHeaders() }
    )
  }
})

// Sincronizar pedidos com filtros
async function syncOrders(
  supabase: any,
  filters?: any,
  userId?: string
): Promise<OrderSyncResponse> {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        profiles(*),
        order_items(
          *,
          products(*),
          tickets(*)
        )
      `)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    } else {
      // Se não for admin, mostrar apenas pedidos do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!profile || profile.role !== 'admin') {
        query = query.eq('user_id', userId)
      }
    }

    if (filters?.date_range) {
      query = query
        .gte('created_at', filters.date_range.start)
        .lte('created_at', filters.date_range.end)
    }

    const { data: orders, error } = await query

    if (error) throw error

    // Gerar token de sincronização
    const sync_token = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      success: true,
      data: orders,
      sync_token
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Criar novo pedido
async function createOrder(
  supabase: any,
  order_data: any,
  userId: string
): Promise<OrderSyncResponse> {
  try {
    const { items, ...orderInfo } = order_data

    // Validar itens do pedido
    if (!items || items.length === 0) {
      throw new Error('Order must have at least one item')
    }

    // Verificar disponibilidade de estoque/ingressos
    for (const item of items) {
      if (item.product_id) {
        // Verificar estoque do produto
        const { data: stock, error: stockError } = await supabase
          .from('product_stock')
          .select('quantity')
          .eq('product_id', item.product_id)
          .eq('size_id', item.size_id || null)
          .single()

        if (stockError || !stock || stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.product_id}`)
        }
      }

      if (item.ticket_id) {
        // Verificar disponibilidade de ingressos
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .select('available_quantity')
          .eq('id', item.ticket_id)
          .single()

        if (ticketError || !ticket || ticket.available_quantity < item.quantity) {
          throw new Error(`Insufficient tickets available for ${item.ticket_id}`)
        }
      }
    }

    // Calcular total do pedido
    let total = 0
    for (const item of items) {
      if (item.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('price')
          .eq('id', item.product_id)
          .single()
        total += product.price * item.quantity
      }

      if (item.ticket_id) {
        const { data: ticket } = await supabase
          .from('tickets')
          .select('price')
          .eq('id', item.ticket_id)
          .single()
        total += ticket.price * item.quantity
      }
    }

    // Criar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_status: 'pending',
        total_amount: total,
        payment_status: 'pending',
        customer_data: orderInfo.customer_data || {},
        billing_data: orderInfo.billing_data,
        shipping_data: orderInfo.shipping_data,
        payment_method: orderInfo.payment_method,
        payment_id: orderInfo.payment_id,
        notes: orderInfo.notes
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Criar itens do pedido
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id || null,
      ticket_id: item.ticket_id || null,
      size_id: item.size_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // Reservar estoque/ingressos
    for (const item of items) {
      if (item.product_id) {
        await supabase.rpc('reserve_product_stock', {
          p_product_id: item.product_id,
          p_size_id: item.size_id,
          p_quantity: item.quantity,
          p_order_id: order.id
        })
      }

      if (item.ticket_id) {
        await supabase.rpc('reserve_tickets', {
          p_ticket_id: item.ticket_id,
          p_quantity: item.quantity,
          p_order_id: order.id
        })
      }
    }

    return {
      success: true,
      data: order
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Atualizar status do pedido
async function updateOrderStatus(
  supabase: any,
  orderId: string,
  newStatus: string,
  userId: string
): Promise<OrderSyncResponse> {
  try {
    // Verificar se o pedido existe e se o usuário tem permissão
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, profiles!inner(role)')
      .eq('id', orderId)
      .single()

    if (fetchError) throw new Error('Order not found')

    // Verificar permissões
    const isOwner = order.user_id === userId
    const isAdmin = order.profiles?.role === 'admin'

    if (!isOwner && !isAdmin) {
      throw new Error('Insufficient permissions')
    }

    // Validar transições de status
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': []
    }

    if (!validTransitions[order.order_status]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${order.order_status} to ${newStatus}`)
    }

    // Atualizar status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        order_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) throw updateError

    // Ações específicas por status
    if (newStatus === 'cancelled') {
      // Liberar estoque/ingressos reservados
      await supabase.rpc('release_order_reservations', {
        p_order_id: orderId
      })
    }

    if (newStatus === 'delivered') {
      // Confirmar consumo de estoque/ingressos
      await supabase.rpc('confirm_order_consumption', {
        p_order_id: orderId
      })
    }

    return {
      success: true,
      data: updatedOrder
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Cancelar pedido
async function cancelOrder(
  supabase: any,
  orderId: string,
  userId: string
): Promise<OrderSyncResponse> {
  try {
    return await updateOrderStatus(supabase, orderId, 'cancelled', userId)
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Processar pagamento
async function processPayment(
  supabase: any,
  orderId: string,
  paymentData: any,
  userId: string
): Promise<OrderSyncResponse> {
  try {
    // Verificar se o pedido existe
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single()

    if (fetchError) throw new Error('Order not found')

    if (order.payment_status === 'paid') {
      throw new Error('Order already paid')
    }

    // Simular processamento de pagamento
    // Em produção, integrar com gateway de pagamento real
    const paymentResult = await simulatePaymentProcessing(paymentData)

    if (!paymentResult.success) {
      throw new Error(paymentResult.error || 'Payment failed')
    }

    // Atualizar status de pagamento
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_method: paymentData.method,
        payment_transaction_id: paymentResult.transaction_id,
        paid_at: new Date().toISOString(),
        status: order.status === 'pending' ? 'confirmed' : order.status
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) throw updateError

    return {
      success: true,
      data: {
        order: updatedOrder,
        payment: paymentResult
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Obter analytics de pedidos
async function getOrderAnalytics(
  supabase: any,
  period: string,
  userId: string
): Promise<OrderSyncResponse> {
  try {
    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'admin') {
      throw new Error('Admin access required')
    }

    // Calcular período
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Buscar dados de analytics
    const { data: analytics, error } = await supabase.rpc('get_order_analytics', {
      p_start_date: startDate.toISOString(),
      p_end_date: now.toISOString()
    })

    if (error) throw error

    return {
      success: true,
      analytics: analytics
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Simular processamento de pagamento
async function simulatePaymentProcessing(paymentData: any) {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Simular falha ocasional (5% de chance)
  if (Math.random() < 0.05) {
    return {
      success: false,
      error: 'Payment gateway timeout'
    }
  }

  return {
    success: true,
    transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    amount: paymentData.amount,
    method: paymentData.method,
    processed_at: new Date().toISOString()
  }
}