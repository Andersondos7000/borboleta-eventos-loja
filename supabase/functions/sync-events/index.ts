import { serve } from 'std/http/server.ts'
import { createClient } from 'supabase'
import { corsHeaders, handleCors, getAllHeaders } from '../_shared/cors.ts'

interface EventSyncRequest {
  action: 'sync' | 'create' | 'update' | 'cancel' | 'buy_ticket' | 'use_ticket' | 'get_analytics'
  event_id?: string
  event_data?: any
  ticket_data?: {
    event_id: string
    ticket_type: string
    quantity: number
    user_id?: string
  }
  ticket_id?: string
  filters?: {
    status?: string
    date_range?: { start: string; end: string }
    category?: string
  }
  analytics_period?: 'day' | 'week' | 'month' | 'year'
}

interface EventSyncResponse {
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
    const body: EventSyncRequest = await req.json()
    const { action, event_id, event_data, ticket_data, ticket_id, filters, analytics_period } = body

    let result: EventSyncResponse = { success: false }

    switch (action) {
      case 'sync':
        result = await syncEvents(supabase, filters, user.id)
        break

      case 'create':
        if (!event_data) {
          throw new Error('Event data required for create action')
        }
        result = await createEvent(supabase, event_data, user.id)
        break

      case 'update':
        if (!event_id || !event_data) {
          throw new Error('Event ID and data required for update action')
        }
        result = await updateEvent(supabase, event_id, event_data, user.id)
        break

      case 'cancel':
        if (!event_id) {
          throw new Error('Event ID required for cancel action')
        }
        result = await cancelEvent(supabase, event_id, user.id)
        break

      case 'buy_ticket':
        if (!ticket_data) {
          throw new Error('Ticket data required for buy_ticket action')
        }
        result = await buyTicket(supabase, ticket_data, user.id)
        break

      case 'use_ticket':
        if (!ticket_id) {
          throw new Error('Ticket ID required for use_ticket action')
        }
        result = await useTicket(supabase, ticket_id, user.id)
        break

      case 'get_analytics':
        result = await getEventAnalytics(supabase, analytics_period || 'month', user.id)
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: getAllHeaders() }
    )

  } catch (error) {
    console.error('Event sync error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: getAllHeaders() }
    )
  }
})

// Sincronizar eventos com filtros
async function syncEvents(
  supabase: any,
  filters?: any,
  userId?: string
): Promise<EventSyncResponse> {
  try {
    let query = supabase
      .from('events')
      .select(`
        *,
        tickets(
          id,
          type,
          price,
          total_quantity,
          available_quantity,
          sold_quantity
        )
      `)
      .order('start_date', { ascending: true })

    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.date_range) {
      query = query
        .gte('start_date', filters.date_range.start)
        .lte('end_date', filters.date_range.end)
    }

    const { data: events, error } = await query

    if (error) throw error

    // Calcular disponibilidade e estatísticas para cada evento
    const eventsWithStats = events.map((event: any) => {
      const totalTickets = event.tickets.reduce((sum: number, ticket: any) => sum + ticket.total_quantity, 0)
      const availableTickets = event.tickets.reduce((sum: number, ticket: any) => sum + ticket.available_quantity, 0)
      const soldTickets = event.tickets.reduce((sum: number, ticket: any) => sum + ticket.sold_quantity, 0)
      
      return {
        ...event,
        stats: {
          total_capacity: totalTickets,
          available_capacity: availableTickets,
          sold_tickets: soldTickets,
          occupancy_rate: totalTickets > 0 ? (soldTickets / totalTickets) * 100 : 0,
          is_sold_out: availableTickets === 0,
          is_almost_sold_out: availableTickets > 0 && availableTickets <= totalTickets * 0.1
        }
      }
    })

    // Gerar token de sincronização
    const sync_token = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    return {
      success: true,
      data: eventsWithStats,
      sync_token
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Criar novo evento
async function createEvent(
  supabase: any,
  event_data: any,
  userId: string
): Promise<EventSyncResponse> {
  try {
    // Verificar se o usuário tem permissão para criar eventos
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || !['admin', 'organizer'].includes(profile.role)) {
      throw new Error('Insufficient permissions to create events')
    }

    const { tickets, ...eventInfo } = event_data

    // Validar dados do evento
    if (!eventInfo.title || !eventInfo.start_date || !eventInfo.end_date) {
      throw new Error('Title, start_date, and end_date are required')
    }

    if (new Date(eventInfo.start_date) >= new Date(eventInfo.end_date)) {
      throw new Error('Start date must be before end date')
    }

    if (new Date(eventInfo.start_date) <= new Date()) {
      throw new Error('Start date must be in the future')
    }

    // Criar evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        ...eventInfo,
        status: 'active',
        created_by: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (eventError) throw eventError

    // Criar ingressos se fornecidos
    if (tickets && tickets.length > 0) {
      const ticketInserts = tickets.map((ticket: any) => ({
        event_id: event.id,
        type: ticket.type,
        price: ticket.price,
        total_quantity: ticket.quantity,
        available_quantity: ticket.quantity,
        sold_quantity: 0,
        description: ticket.description || null,
        sale_start_date: ticket.sale_start_date || event.created_at,
        sale_end_date: ticket.sale_end_date || event.start_date
      }))

      const { error: ticketsError } = await supabase
        .from('tickets')
        .insert(ticketInserts)

      if (ticketsError) throw ticketsError
    }

    // Buscar evento completo com ingressos
    const { data: completeEvent, error: fetchError } = await supabase
      .from('events')
      .select(`
        *,
        tickets(*)
      `)
      .eq('id', event.id)
      .single()

    if (fetchError) throw fetchError

    return {
      success: true,
      data: completeEvent
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Atualizar evento
async function updateEvent(
  supabase: any,
  eventId: string,
  eventData: any,
  userId: string
): Promise<EventSyncResponse> {
  try {
    // Verificar se o evento existe e se o usuário tem permissão
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('*, profiles!inner(role)')
      .eq('id', eventId)
      .single()

    if (fetchError) throw new Error('Event not found')

    const isCreator = event.created_by === userId
    const isAdmin = event.profiles?.role === 'admin'

    if (!isCreator && !isAdmin) {
      throw new Error('Insufficient permissions')
    }

    // Não permitir alterações em eventos que já começaram
    if (new Date(event.start_date) <= new Date()) {
      throw new Error('Cannot update events that have already started')
    }

    // Atualizar evento
    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update({
        ...eventData,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', eventId)
      .select(`
        *,
        tickets(*)
      `)
      .single()

    if (updateError) throw updateError

    return {
      success: true,
      data: updatedEvent
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Cancelar evento
async function cancelEvent(
  supabase: any,
  eventId: string,
  userId: string
): Promise<EventSyncResponse> {
  try {
    // Verificar permissões
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('*, profiles!inner(role)')
      .eq('id', eventId)
      .single()

    if (fetchError) throw new Error('Event not found')

    const isCreator = event.created_by === userId
    const isAdmin = event.profiles?.role === 'admin'

    if (!isCreator && !isAdmin) {
      throw new Error('Insufficient permissions')
    }

    // Cancelar evento
    const { data: cancelledEvent, error: updateError } = await supabase
      .from('events')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId
      })
      .eq('id', eventId)
      .select()
      .single()

    if (updateError) throw updateError

    // Processar reembolsos automáticos
    await supabase.rpc('process_event_refunds', {
      p_event_id: eventId
    })

    return {
      success: true,
      data: cancelledEvent
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Comprar ingresso
async function buyTicket(
  supabase: any,
  ticketData: any,
  userId: string
): Promise<EventSyncResponse> {
  try {
    const { event_id, ticket_type, quantity } = ticketData

    // Buscar informações do ingresso
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        events(
          id,
          title,
          start_date,
          status
        )
      `)
      .eq('event_id', event_id)
      .eq('type', ticket_type)
      .single()

    if (ticketError) throw new Error('Ticket type not found')

    // Verificar se o evento está ativo
    if (ticket.events.status !== 'active') {
      throw new Error('Event is not available for ticket sales')
    }

    // Verificar se ainda está no período de vendas
    const now = new Date()
    if (ticket.sale_start_date && new Date(ticket.sale_start_date) > now) {
      throw new Error('Ticket sales have not started yet')
    }

    if (ticket.sale_end_date && new Date(ticket.sale_end_date) < now) {
      throw new Error('Ticket sales have ended')
    }

    // Verificar disponibilidade
    if (ticket.available_quantity < quantity) {
      throw new Error(`Only ${ticket.available_quantity} tickets available`)
    }

    // Calcular total
    const totalAmount = ticket.price * quantity

    // Criar pedido de ingresso
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'pending',
        order_type: 'ticket'
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Criar item do pedido
    const { error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        ticket_id: ticket.id,
        quantity: quantity,
        unit_price: ticket.price,
        total_price: totalAmount
      })

    if (itemError) throw itemError

    // Reservar ingressos temporariamente
    const { error: reserveError } = await supabase
      .from('tickets')
      .update({
        available_quantity: ticket.available_quantity - quantity,
        reserved_quantity: (ticket.reserved_quantity || 0) + quantity
      })
      .eq('id', ticket.id)

    if (reserveError) throw reserveError

    return {
      success: true,
      data: {
        order_id: order.id,
        ticket_info: ticket,
        quantity: quantity,
        total_amount: totalAmount,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutos para pagamento
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Usar ingresso (check-in)
async function useTicket(
  supabase: any,
  ticketId: string,
  userId: string
): Promise<EventSyncResponse> {
  try {
    // Buscar ingresso do usuário
    const { data: userTicket, error: fetchError } = await supabase
      .from('user_tickets')
      .select(`
        *,
        tickets(
          *,
          events(*)
        ),
        orders(*)
      `)
      .eq('id', ticketId)
      .eq('user_id', userId)
      .single()

    if (fetchError) throw new Error('Ticket not found')

    // Verificar se o ingresso já foi usado
    if (userTicket.used_at) {
      throw new Error('Ticket already used')
    }

    // Verificar se o pedido foi pago
    if (userTicket.orders.payment_status !== 'paid') {
      throw new Error('Ticket not paid')
    }

    // Verificar se o evento já começou
    const eventStartDate = new Date(userTicket.tickets.events.start_date)
    const now = new Date()
    
    if (eventStartDate > now) {
      throw new Error('Event has not started yet')
    }

    // Verificar se o evento ainda está acontecendo
    const eventEndDate = new Date(userTicket.tickets.events.end_date)
    if (eventEndDate < now) {
      throw new Error('Event has already ended')
    }

    // Marcar ingresso como usado
    const { data: usedTicket, error: useError } = await supabase
      .from('user_tickets')
      .update({
        used_at: new Date().toISOString(),
        used_by: userId
      })
      .eq('id', ticketId)
      .select(`
        *,
        tickets(
          *,
          events(*)
        )
      `)
      .single()

    if (useError) throw useError

    return {
      success: true,
      data: {
        ticket: usedTicket,
        message: 'Ticket successfully validated',
        event_info: usedTicket.tickets.events
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Obter analytics de eventos
async function getEventAnalytics(
  supabase: any,
  period: string,
  userId: string
): Promise<EventSyncResponse> {
  try {
    // Verificar se é admin ou organizador
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || !['admin', 'organizer'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
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
    const { data: analytics, error } = await supabase.rpc('get_event_analytics', {
      p_start_date: startDate.toISOString(),
      p_end_date: now.toISOString(),
      p_user_id: profile.role === 'organizer' ? userId : null
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