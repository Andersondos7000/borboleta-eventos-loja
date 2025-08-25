import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Tipos para sincronização do carrinho
interface CartSyncRequest {
  action: 'sync' | 'merge' | 'backup' | 'restore';
  userId: string;
  cartData?: CartItem[];
  deviceId?: string;
  lastSync?: string;
}

interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  product_size_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

interface SyncResponse {
  success: boolean;
  data?: CartItem[];
  conflicts?: CartConflict[];
  lastSync: string;
  message?: string;
}

interface CartConflict {
  item: CartItem;
  conflict_type: 'quantity_mismatch' | 'item_deleted' | 'item_added';
  server_version: CartItem;
  client_version: CartItem;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verificar usuário autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse do body da requisição
    const { action, userId, cartData, deviceId, lastSync }: CartSyncRequest = await req.json()

    // Verificar se usuário pode acessar este carrinho
    if (user.id !== userId) {
      throw new Error('Access denied')
    }

    let response: SyncResponse

    switch (action) {
      case 'sync':
        response = await syncCart(supabaseClient, userId, cartData || [], lastSync)
        break
      
      case 'merge':
        response = await mergeCart(supabaseClient, userId, cartData || [], deviceId)
        break
      
      case 'backup':
        response = await backupCart(supabaseClient, userId, cartData || [])
        break
      
      case 'restore':
        response = await restoreCart(supabaseClient, userId, lastSync)
        break
      
      default:
        throw new Error('Invalid action')
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Cart sync error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message,
        lastSync: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400,
      },
    )
  }
})

/**
 * Sincroniza carrinho com resolução de conflitos
 */
async function syncCart(
  supabase: any,
  userId: string,
  clientCart: CartItem[],
  lastSync?: string
): Promise<SyncResponse> {
  try {
    // Buscar carrinho atual no servidor
    const { data: serverCart, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const now = new Date().toISOString()
    const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0)
    const conflicts: CartConflict[] = []
    const mergedCart: CartItem[] = []

    // Criar mapa para facilitar comparações
    const serverMap = new Map(serverCart.map((item: CartItem) => [item.id, item]))
    const clientMap = new Map(clientCart.map(item => [item.id, item]))

    // Processar itens do servidor
    for (const serverItem of serverCart) {
      const clientItem = clientMap.get(serverItem.id)
      const serverUpdateDate = new Date(serverItem.updated_at)

      if (!clientItem) {
        // Item existe apenas no servidor
        if (serverUpdateDate > lastSyncDate) {
          // Item foi adicionado no servidor após último sync
          mergedCart.push(serverItem)
        }
      } else {
        // Item existe em ambos - verificar conflitos
        const clientUpdateDate = new Date(clientItem.updated_at)
        
        if (serverUpdateDate > lastSyncDate && clientUpdateDate > lastSyncDate) {
          // Conflito: ambos foram modificados
          if (serverItem.quantity !== clientItem.quantity) {
            conflicts.push({
              item: serverItem,
              conflict_type: 'quantity_mismatch',
              server_version: serverItem,
              client_version: clientItem
            })
            
            // Resolver conflito: usar maior quantidade
            mergedCart.push({
              ...serverItem,
              quantity: Math.max(serverItem.quantity, clientItem.quantity),
              updated_at: now
            })
          } else {
            mergedCart.push(serverItem)
          }
        } else if (serverUpdateDate > clientUpdateDate) {
          // Servidor mais recente
          mergedCart.push(serverItem)
        } else {
          // Cliente mais recente
          mergedCart.push(clientItem)
        }
      }
    }

    // Processar itens que existem apenas no cliente
    for (const clientItem of clientCart) {
      if (!serverMap.has(clientItem.id)) {
        const clientUpdateDate = new Date(clientItem.updated_at)
        
        if (clientUpdateDate > lastSyncDate) {
          // Item foi adicionado no cliente após último sync
          mergedCart.push(clientItem)
        }
      }
    }

    // Atualizar carrinho no servidor se necessário
    if (mergedCart.length !== serverCart.length || 
        mergedCart.some(item => {
          const serverItem = serverMap.get(item.id)
          return !serverItem || 
                 serverItem.quantity !== item.quantity ||
                 serverItem.updated_at !== item.updated_at
        })) {
      
      // Deletar itens atuais
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)

      // Inserir itens mesclados
      if (mergedCart.length > 0) {
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert(mergedCart.map(item => ({
            ...item,
            updated_at: now
          })))

        if (insertError) {
          throw new Error(`Insert error: ${insertError.message}`)
        }
      }
    }

    return {
      success: true,
      data: mergedCart,
      conflicts,
      lastSync: now,
      message: conflicts.length > 0 ? `Sincronizado com ${conflicts.length} conflitos resolvidos` : 'Sincronizado com sucesso'
    }
  } catch (error) {
    console.error('Sync cart error:', error)
    throw error
  }
}

/**
 * Mescla carrinho de múltiplos dispositivos
 */
async function mergeCart(
  supabase: any,
  userId: string,
  newItems: CartItem[],
  deviceId?: string
): Promise<SyncResponse> {
  try {
    const now = new Date().toISOString()
    
    // Buscar carrinho atual
    const { data: existingCart, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const existingMap = new Map(
      existingCart.map((item: CartItem) => 
        [`${item.product_id}-${item.product_size_id}`, item]
      )
    )

    const itemsToInsert: CartItem[] = []
    const itemsToUpdate: { id: string; quantity: number }[] = []

    // Processar novos itens
    for (const newItem of newItems) {
      const key = `${newItem.product_id}-${newItem.product_size_id}`
      const existingItem = existingMap.get(key)

      if (existingItem) {
        // Item já existe - somar quantidades
        const newQuantity = existingItem.quantity + newItem.quantity
        itemsToUpdate.push({
          id: existingItem.id,
          quantity: newQuantity
        })
      } else {
        // Novo item
        itemsToInsert.push({
          ...newItem,
          user_id: userId,
          created_at: now,
          updated_at: now
        })
      }
    }

    // Executar atualizações
    if (itemsToUpdate.length > 0) {
      for (const update of itemsToUpdate) {
        await supabase
          .from('cart_items')
          .update({ 
            quantity: update.quantity,
            updated_at: now
          })
          .eq('id', update.id)
      }
    }

    // Executar inserções
    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert(itemsToInsert)

      if (insertError) {
        throw new Error(`Insert error: ${insertError.message}`)
      }
    }

    // Buscar carrinho atualizado
    const { data: updatedCart } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return {
      success: true,
      data: updatedCart || [],
      lastSync: now,
      message: `Mesclado ${itemsToInsert.length} novos itens e ${itemsToUpdate.length} atualizações`
    }
  } catch (error) {
    console.error('Merge cart error:', error)
    throw error
  }
}

/**
 * Faz backup do carrinho
 */
async function backupCart(
  supabase: any,
  userId: string,
  cartData: CartItem[]
): Promise<SyncResponse> {
  try {
    const now = new Date().toISOString()
    
    // Salvar backup na tabela de backups (se existir)
    // Por enquanto, apenas confirmar que os dados estão salvos
    const { error } = await supabase
      .from('cart_items')
      .upsert(
        cartData.map(item => ({
          ...item,
          user_id: userId,
          updated_at: now
        })),
        { onConflict: 'id' }
      )

    if (error) {
      throw new Error(`Backup error: ${error.message}`)
    }

    return {
      success: true,
      data: cartData,
      lastSync: now,
      message: `Backup de ${cartData.length} itens realizado com sucesso`
    }
  } catch (error) {
    console.error('Backup cart error:', error)
    throw error
  }
}

/**
 * Restaura carrinho do backup
 */
async function restoreCart(
  supabase: any,
  userId: string,
  backupDate?: string
): Promise<SyncResponse> {
  try {
    // Buscar carrinho mais recente ou de data específica
    let query = supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)

    if (backupDate) {
      query = query.lte('updated_at', backupDate)
    }

    const { data: cartData, error } = await query
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Restore error: ${error.message}`)
    }

    return {
      success: true,
      data: cartData || [],
      lastSync: new Date().toISOString(),
      message: `Restaurado ${cartData?.length || 0} itens do carrinho`
    }
  } catch (error) {
    console.error('Restore cart error:', error)
    throw error
  }
}