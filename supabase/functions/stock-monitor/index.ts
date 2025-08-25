import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface StockMonitorRequest {
  action: 'check' | 'reserve' | 'release' | 'update' | 'alert';
  productId?: string;
  sizeId?: string;
  quantity?: number;
  reservationId?: string;
  userId?: string;
  alertThreshold?: number;
}

interface StockResponse {
  success: boolean;
  data?: any;
  alerts?: StockAlert[];
  reservationId?: string;
  message?: string;
}

interface StockAlert {
  id: string;
  productId: string;
  sizeId: string;
  currentStock: number;
  threshold: number;
  alertType: 'low_stock' | 'out_of_stock' | 'critical';
  createdAt: string;
}

interface StockReservation {
  id: string;
  productId: string;
  sizeId: string;
  quantity: number;
  userId: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'confirmed' | 'cancelled';
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { action, productId, sizeId, quantity, reservationId, userId, alertThreshold }: StockMonitorRequest = await req.json();

    let response: StockResponse;

    switch (action) {
      case 'check':
        response = await checkStock(supabase, productId, sizeId);
        break;
      case 'reserve':
        response = await reserveStock(supabase, productId!, sizeId!, quantity!, userId!);
        break;
      case 'release':
        response = await releaseReservation(supabase, reservationId!);
        break;
      case 'update':
        response = await updateStock(supabase, productId!, sizeId!, quantity!);
        break;
      case 'alert':
        response = await checkStockAlerts(supabase, alertThreshold);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Stock monitor error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Verificar estoque disponível
async function checkStock(supabase: any, productId?: string, sizeId?: string): Promise<StockResponse> {
  try {
    let query = supabase
      .from('product_stock')
      .select(`
        *,
        products:product_id(name, sku),
        product_sizes:size_id(size, color)
      `);

    if (productId) {
      query = query.eq('product_id', productId);
    }
    if (sizeId) {
      query = query.eq('size_id', sizeId);
    }

    const { data: stockData, error } = await query;

    if (error) {
      throw error;
    }

    // Calcular estoque disponível (descontando reservas ativas)
    const stockWithAvailable = await Promise.all(
      stockData.map(async (stock: any) => {
        const { data: reservations } = await supabase
          .from('stock_reservations')
          .select('quantity')
          .eq('product_id', stock.product_id)
          .eq('size_id', stock.size_id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString());

        const reservedQuantity = reservations?.reduce((sum: number, res: any) => sum + res.quantity, 0) || 0;
        const availableQuantity = Math.max(0, stock.quantity - reservedQuantity);

        return {
          ...stock,
          reserved_quantity: reservedQuantity,
          available_quantity: availableQuantity
        };
      })
    );

    return {
      success: true,
      data: stockWithAvailable,
      message: `Found ${stockWithAvailable.length} stock entries`
    };

  } catch (error) {
    console.error('Error checking stock:', error);
    return {
      success: false,
      message: 'Failed to check stock'
    };
  }
}

// Reservar estoque
async function reserveStock(supabase: any, productId: string, sizeId: string, quantity: number, userId: string): Promise<StockResponse> {
  try {
    // Verificar estoque disponível
    const { data: stockData, error: stockError } = await supabase
      .from('product_stock')
      .select('quantity')
      .eq('product_id', productId)
      .eq('size_id', sizeId)
      .single();

    if (stockError || !stockData) {
      return {
        success: false,
        message: 'Product stock not found'
      };
    }

    // Verificar reservas ativas
    const { data: activeReservations } = await supabase
      .from('stock_reservations')
      .select('quantity')
      .eq('product_id', productId)
      .eq('size_id', sizeId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    const reservedQuantity = activeReservations?.reduce((sum: number, res: any) => sum + res.quantity, 0) || 0;
    const availableQuantity = stockData.quantity - reservedQuantity;

    if (availableQuantity < quantity) {
      return {
        success: false,
        message: `Insufficient stock. Available: ${availableQuantity}, Requested: ${quantity}`
      };
    }

    // Criar reserva (válida por 15 minutos)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const reservationId = crypto.randomUUID();

    const { error: reservationError } = await supabase
      .from('stock_reservations')
      .insert({
        id: reservationId,
        product_id: productId,
        size_id: sizeId,
        quantity,
        user_id: userId,
        expires_at: expiresAt,
        status: 'active',
        created_at: new Date().toISOString()
      });

    if (reservationError) {
      throw reservationError;
    }

    // Registrar evento
    await supabase
      .from('stock_events')
      .insert({
        product_id: productId,
        size_id: sizeId,
        event_type: 'reserved',
        quantity,
        user_id: userId,
        reservation_id: reservationId,
        created_at: new Date().toISOString()
      });

    return {
      success: true,
      reservationId,
      message: `Reserved ${quantity} units until ${new Date(expiresAt).toLocaleString()}`
    };

  } catch (error) {
    console.error('Error reserving stock:', error);
    return {
      success: false,
      message: 'Failed to reserve stock'
    };
  }
}

// Liberar reserva
async function releaseReservation(supabase: any, reservationId: string): Promise<StockResponse> {
  try {
    // Buscar reserva
    const { data: reservation, error: fetchError } = await supabase
      .from('stock_reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (fetchError || !reservation) {
      return {
        success: false,
        message: 'Reservation not found'
      };
    }

    // Atualizar status da reserva
    const { error: updateError } = await supabase
      .from('stock_reservations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId);

    if (updateError) {
      throw updateError;
    }

    // Registrar evento
    await supabase
      .from('stock_events')
      .insert({
        product_id: reservation.product_id,
        size_id: reservation.size_id,
        event_type: 'released',
        quantity: reservation.quantity,
        user_id: reservation.user_id,
        reservation_id: reservationId,
        created_at: new Date().toISOString()
      });

    return {
      success: true,
      message: `Released reservation for ${reservation.quantity} units`
    };

  } catch (error) {
    console.error('Error releasing reservation:', error);
    return {
      success: false,
      message: 'Failed to release reservation'
    };
  }
}

// Atualizar estoque
async function updateStock(supabase: any, productId: string, sizeId: string, quantity: number): Promise<StockResponse> {
  try {
    // Atualizar estoque
    const { data, error } = await supabase
      .from('product_stock')
      .update({ 
        quantity,
        updated_at: new Date().toISOString()
      })
      .eq('product_id', productId)
      .eq('size_id', sizeId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Registrar evento
    await supabase
      .from('stock_events')
      .insert({
        product_id: productId,
        size_id: sizeId,
        event_type: 'updated',
        quantity,
        created_at: new Date().toISOString()
      });

    // Verificar se precisa gerar alertas
    const alerts = await generateStockAlerts(supabase, productId, sizeId, quantity);

    return {
      success: true,
      data,
      alerts,
      message: `Stock updated to ${quantity} units`
    };

  } catch (error) {
    console.error('Error updating stock:', error);
    return {
      success: false,
      message: 'Failed to update stock'
    };
  }
}

// Verificar alertas de estoque
async function checkStockAlerts(supabase: any, threshold?: number): Promise<StockResponse> {
  try {
    const defaultThreshold = threshold || 10;
    
    const { data: lowStockItems, error } = await supabase
      .from('product_stock')
      .select(`
        *,
        products:product_id(name, sku),
        product_sizes:size_id(size, color)
      `)
      .lte('quantity', defaultThreshold);

    if (error) {
      throw error;
    }

    const alerts: StockAlert[] = lowStockItems.map((item: any) => ({
      id: crypto.randomUUID(),
      productId: item.product_id,
      sizeId: item.size_id,
      currentStock: item.quantity,
      threshold: defaultThreshold,
      alertType: item.quantity === 0 ? 'out_of_stock' : 
                 item.quantity <= 5 ? 'critical' : 'low_stock',
      createdAt: new Date().toISOString()
    }));

    // Salvar alertas no banco
    if (alerts.length > 0) {
      await supabase
        .from('stock_alerts')
        .insert(alerts.map(alert => ({
          id: alert.id,
          product_id: alert.productId,
          size_id: alert.sizeId,
          current_stock: alert.currentStock,
          threshold: alert.threshold,
          alert_type: alert.alertType,
          created_at: alert.createdAt,
          status: 'active'
        })));
    }

    return {
      success: true,
      alerts,
      message: `Found ${alerts.length} stock alerts`
    };

  } catch (error) {
    console.error('Error checking stock alerts:', error);
    return {
      success: false,
      message: 'Failed to check stock alerts'
    };
  }
}

// Gerar alertas de estoque
async function generateStockAlerts(supabase: any, productId: string, sizeId: string, currentStock: number): Promise<StockAlert[]> {
  const alerts: StockAlert[] = [];
  
  // Buscar configurações de alerta para o produto
  const { data: alertConfig } = await supabase
    .from('product_alert_config')
    .select('low_stock_threshold, critical_threshold')
    .eq('product_id', productId)
    .single();

  const lowThreshold = alertConfig?.low_stock_threshold || 10;
  const criticalThreshold = alertConfig?.critical_threshold || 5;

  if (currentStock === 0) {
    alerts.push({
      id: crypto.randomUUID(),
      productId,
      sizeId,
      currentStock,
      threshold: 0,
      alertType: 'out_of_stock',
      createdAt: new Date().toISOString()
    });
  } else if (currentStock <= criticalThreshold) {
    alerts.push({
      id: crypto.randomUUID(),
      productId,
      sizeId,
      currentStock,
      threshold: criticalThreshold,
      alertType: 'critical',
      createdAt: new Date().toISOString()
    });
  } else if (currentStock <= lowThreshold) {
    alerts.push({
      id: crypto.randomUUID(),
      productId,
      sizeId,
      currentStock,
      threshold: lowThreshold,
      alertType: 'low_stock',
      createdAt: new Date().toISOString()
    });
  }

  return alerts;
}