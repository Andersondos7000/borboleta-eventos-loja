import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, getAllHeaders } from '../_shared/cors.ts'

interface ProductSyncRequest {
  action: 'sync' | 'update_stock' | 'reserve_stock' | 'release_stock' | 'bulk_update'
  product_id?: string
  products?: any[]
  stock_data?: {
    product_id: string
    size_id?: string
    quantity: number
    operation?: 'add' | 'subtract' | 'set'
  }[]
  filters?: {
    category_id?: string
    price_range?: { min: number; max: number }
    availability?: boolean
  }
}

interface ProductSyncResponse {
  success: boolean
  data?: any
  error?: string
  sync_token?: string
  conflicts?: any[]
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
    const body: ProductSyncRequest = await req.json()
    const { action, product_id, products, stock_data, filters } = body

    let result: ProductSyncResponse = { success: false }

    switch (action) {
      case 'sync':
        result = await syncProducts(supabase, filters, user.id)
        break

      case 'update_stock':
        if (!stock_data) {
          throw new Error('Stock data required for update_stock action')
        }
        result = await updateStock(supabase, stock_data, user.id)
        break

      case 'reserve_stock':
        if (!stock_data) {
          throw new Error('Stock data required for reserve_stock action')
        }
        result = await reserveStock(supabase, stock_data, user.id)
        break

      case 'release_stock':
        if (!stock_data) {
          throw new Error('Stock data required for release_stock action')
        }
        result = await releaseStock(supabase, stock_data, user.id)
        break

      case 'bulk_update':
        if (!products) {
          throw new Error('Products array required for bulk_update action')
        }
        result = await bulkUpdateProducts(supabase, products, user.id)
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: getAllHeaders() }
    )

  } catch (error) {
    console.error('Product sync error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: getAllHeaders() }
    )
  }
})

// Sincronizar produtos com filtros
async function syncProducts(
  supabase: any,
  filters?: any,
  userId?: string
): Promise<ProductSyncResponse> {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        categories(*),
        product_stock(*)
      `)

    // Aplicar filtros
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    if (filters?.price_range) {
      query = query
        .gte('price', filters.price_range.min)
        .lte('price', filters.price_range.max)
    }

    if (filters?.availability !== undefined) {
      if (filters.availability) {
        query = query.gt('product_stock.quantity', 0)
      } else {
        query = query.eq('product_stock.quantity', 0)
      }
    }

    const { data: products, error } = await query

    if (error) throw error

    // Gerar token de sincronização
    const sync_token = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      success: true,
      data: products,
      sync_token
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Atualizar estoque
async function updateStock(
  supabase: any,
  stock_data: any[],
  userId: string
): Promise<ProductSyncResponse> {
  try {
    const updates = []
    const conflicts = []

    for (const item of stock_data) {
      const { product_id, size_id, quantity, operation = 'set' } = item

      // Buscar estoque atual
      let query = supabase
        .from('product_stock')
        .select('*')
        .eq('product_id', product_id)

      if (size_id) {
        query = query.eq('size_id', size_id)
      }

      const { data: currentStock, error: fetchError } = await query.single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      let newQuantity = quantity

      if (currentStock && operation !== 'set') {
        switch (operation) {
          case 'add':
            newQuantity = currentStock.quantity + quantity
            break
          case 'subtract':
            newQuantity = Math.max(0, currentStock.quantity - quantity)
            break
        }
      }

      // Verificar se há conflitos (estoque insuficiente)
      if (operation === 'subtract' && currentStock && currentStock.quantity < quantity) {
        conflicts.push({
          product_id,
          size_id,
          requested: quantity,
          available: currentStock.quantity,
          reason: 'insufficient_stock'
        })
        continue
      }

      // Preparar update/insert
      const stockUpdate = {
        product_id,
        size_id,
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
        updated_by: userId
      }

      if (currentStock) {
        // Update existing
        const { error: updateError } = await supabase
          .from('product_stock')
          .update(stockUpdate)
          .eq('id', currentStock.id)

        if (updateError) throw updateError
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('product_stock')
          .insert(stockUpdate)

        if (insertError) throw insertError
      }

      updates.push(stockUpdate)
    }

    return {
      success: true,
      data: { updates, conflicts },
      conflicts: conflicts.length > 0 ? conflicts : undefined
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Reservar estoque
async function reserveStock(
  supabase: any,
  stock_data: any[],
  userId: string
): Promise<ProductSyncResponse> {
  try {
    const reservations = []
    const conflicts = []

    for (const item of stock_data) {
      const { product_id, size_id, quantity } = item

      // Verificar disponibilidade
      let query = supabase
        .from('product_stock')
        .select('*')
        .eq('product_id', product_id)

      if (size_id) {
        query = query.eq('size_id', size_id)
      }

      const { data: stock, error } = await query.single()

      if (error) {
        conflicts.push({
          product_id,
          size_id,
          reason: 'stock_not_found'
        })
        continue
      }

      if (stock.quantity < quantity) {
        conflicts.push({
          product_id,
          size_id,
          requested: quantity,
          available: stock.quantity,
          reason: 'insufficient_stock'
        })
        continue
      }

      // Criar reserva
      const reservation = {
        product_id,
        size_id,
        quantity,
        reserved_by: userId,
        reserved_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutos
      }

      const { data: reservationData, error: reserveError } = await supabase
        .from('stock_reservations')
        .insert(reservation)
        .select()
        .single()

      if (reserveError) throw reserveError

      // Atualizar estoque disponível
      const { error: updateError } = await supabase
        .from('product_stock')
        .update({
          quantity: stock.quantity - quantity,
          reserved_quantity: (stock.reserved_quantity || 0) + quantity
        })
        .eq('id', stock.id)

      if (updateError) throw updateError

      reservations.push(reservationData)
    }

    return {
      success: true,
      data: { reservations, conflicts },
      conflicts: conflicts.length > 0 ? conflicts : undefined
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Liberar estoque reservado
async function releaseStock(
  supabase: any,
  stock_data: any[],
  userId: string
): Promise<ProductSyncResponse> {
  try {
    const releases = []

    for (const item of stock_data) {
      const { product_id, size_id, quantity } = item

      // Buscar reservas do usuário
      let query = supabase
        .from('stock_reservations')
        .select('*')
        .eq('product_id', product_id)
        .eq('reserved_by', userId)
        .eq('status', 'active')

      if (size_id) {
        query = query.eq('size_id', size_id)
      }

      const { data: reservations, error } = await query

      if (error) throw error

      let remainingToRelease = quantity

      for (const reservation of reservations) {
        if (remainingToRelease <= 0) break

        const releaseQuantity = Math.min(remainingToRelease, reservation.quantity)

        // Marcar reserva como liberada
        const { error: updateReservationError } = await supabase
          .from('stock_reservations')
          .update({
            status: 'released',
            released_at: new Date().toISOString()
          })
          .eq('id', reservation.id)

        if (updateReservationError) throw updateReservationError

        // Restaurar estoque
        const { data: stock, error: stockError } = await supabase
          .from('product_stock')
          .select('*')
          .eq('product_id', product_id)
          .eq('size_id', size_id || null)
          .single()

        if (stockError) throw stockError

        const { error: updateStockError } = await supabase
          .from('product_stock')
          .update({
            quantity: stock.quantity + releaseQuantity,
            reserved_quantity: Math.max(0, (stock.reserved_quantity || 0) - releaseQuantity)
          })
          .eq('id', stock.id)

        if (updateStockError) throw updateStockError

        releases.push({
          reservation_id: reservation.id,
          product_id,
          size_id,
          quantity: releaseQuantity
        })

        remainingToRelease -= releaseQuantity
      }
    }

    return {
      success: true,
      data: { releases }
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Atualização em lote de produtos
async function bulkUpdateProducts(
  supabase: any,
  products: any[],
  userId: string
): Promise<ProductSyncResponse> {
  try {
    const updates = []
    const conflicts = []

    for (const product of products) {
      const { id, ...updateData } = product

      // Verificar se o produto existe
      const { data: existingProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        conflicts.push({
          product_id: id,
          reason: 'product_not_found'
        })
        continue
      }

      // Atualizar produto
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        conflicts.push({
          product_id: id,
          reason: 'update_failed',
          error: updateError.message
        })
        continue
      }

      updates.push(updatedProduct)
    }

    return {
      success: true,
      data: { updates, conflicts },
      conflicts: conflicts.length > 0 ? conflicts : undefined
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}