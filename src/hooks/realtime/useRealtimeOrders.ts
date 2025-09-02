import { useCallback, useMemo } from 'react';
import { useRealtimeSync } from './useRealtimeSync';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../useAuth';

// Tipos para pedidos
interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_size_id: string;
  quantity: number;
  price: number;
  total_price: number;
  created_at: string;
  // Dados relacionados
  products?: {
    id: string;
    name: string;
    image_url?: string;
  };
  product_sizes?: {
    id: string;
    size: string;
  };
}

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address: string;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  created_at: string;
  updated_at: string;
  // Dados relacionados
  order_items?: OrderItem[];
  profiles?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: Order['payment_status'];
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

interface UseRealtimeOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
  refetch: () => void;
  getOrderById: (id: string) => Order | undefined;
  getOrdersByStatus: (status: OrderStatus) => Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  createOrder: (orderData: Partial<Order>, items: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[]) => Promise<string>;
}

/**
 * Hook para sincronização em tempo real de pedidos
 * Suporta filtros e atualizações de status
 */
export function useRealtimeOrders(filters?: OrderFilters): UseRealtimeOrdersReturn {
  const { user } = useAuth();
  
  // Construir filtro baseado nos parâmetros
  const filter = useMemo(() => {
    const conditions: string[] = [];
    
    // Se não é admin, filtrar apenas pedidos do usuário
    if (!filters?.userId && user) {
      conditions.push(`user_id=eq.${user.id}`);
    } else if (filters?.userId) {
      conditions.push(`user_id=eq.${filters.userId}`);
    }
    
    if (filters?.status) {
      conditions.push(`status=eq.${filters.status}`);
    }
    
    if (filters?.paymentStatus) {
      conditions.push(`payment_status=eq.${filters.paymentStatus}`);
    }
    
    if (filters?.dateFrom) {
      conditions.push(`created_at=gte.${filters.dateFrom}`);
    }
    
    if (filters?.dateTo) {
      conditions.push(`created_at=lte.${filters.dateTo}`);
    }
    
    return conditions.length > 0 ? conditions.join(',') : undefined;
  }, [filters, user?.id]);

  // Hook de sincronização com joins completos
  const {
    data: orders,
    loading,
    error,
    isConnected,
    refetch
  } = useRealtimeSync<Order>({
    table: 'orders',
    filter,
    select: `
      *,
      profiles:user_id (
        id,
        full_name,
        email
      ),
      order_items (
        id,
        order_id,
        product_id,
        product_size_id,
        quantity,
        price,
        total_price,
        created_at,
        products:product_id (
          id,
          name,
          image_url
        ),
        product_sizes:product_size_id (
          id,
          size
        )
      )
    `,
    orderBy: 'created_at:desc',
    enableOptimistic: true,
    onUpdate: (updatedOrder) => {
      console.log('Pedido atualizado:', updatedOrder.id, updatedOrder.status);
      
      // Notificar mudanças importantes
      if (updatedOrder.status === 'shipped') {
        console.log('Pedido enviado:', updatedOrder.id);
      } else if (updatedOrder.status === 'delivered') {
        console.log('Pedido entregue:', updatedOrder.id);
      }
    },
    onError: (error) => {
      console.error('Erro no pedidos realtime:', error);
    }
  });

  // Buscar pedido por ID
  const getOrderById = useCallback((id: string): Order | undefined => {
    return orders.find(order => order.id === id);
  }, [orders]);

  // Filtrar pedidos por status
  const getOrdersByStatus = useCallback((status: OrderStatus): Order[] => {
    return orders.filter(order => order.status === status);
  }, [orders]);

  // Atualizar status do pedido com atualizações otimistas
  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, notes?: string) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Buscar pedido atual
      const currentOrder = getOrderById(orderId);
      if (!currentOrder) {
        throw new Error('Pedido não encontrado');
      }

      // Criar versão otimista
      const optimisticId = `optimistic_${Date.now()}_${Math.random()}`;
      const optimisticOrder: Order = {
        ...currentOrder,
        id: optimisticId,
        status,
        updated_at: new Date().toISOString(),
        notes: notes || currentOrder.notes
      };

      // Aplicar atualização otimista
      const { getActions } = useRealtimeSync<Order>({
        table: 'orders',
        enableOptimistic: true
      });
      applyOptimisticUpdate(optimisticOrder);

      // Preparar dados para atualização
      const updateData: Partial<Order> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (notes) {
        updateData.notes = notes;
      }

      // Rollback automático após 5 segundos se não confirmado
      const rollbackTimer = setTimeout(() => {
        rollbackOptimisticUpdate(optimisticId);
        console.warn('Rollback automático: atualização de status não confirmada');
      }, 5000);

      // Executar atualização no servidor
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        clearTimeout(rollbackTimer);
        rollbackOptimisticUpdate(optimisticId);
        throw new Error(`Erro ao atualizar status do pedido: ${error.message}`);
      }

      // Limpar timer se sucesso
      clearTimeout(rollbackTimer);
      console.log(`Status do pedido ${orderId} alterado para: ${status}`);
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      throw error;
    }
  }, [user, getOrderById]);

  // Cancelar pedido
  const cancelOrder = useCallback(async (orderId: string, reason?: string) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const order = getOrderById(orderId);
      if (!order) {
        throw new Error('Pedido não encontrado');
      }

      // Verificar se pedido pode ser cancelado
      if (['shipped', 'delivered'].includes(order.status)) {
        throw new Error('Pedido não pode ser cancelado neste status');
      }

      const notes = reason ? `Cancelado: ${reason}` : 'Pedido cancelado pelo usuário';
      
      await updateOrderStatus(orderId, 'cancelled', notes);

      // TODO: Implementar liberação de estoque reservado
      console.log('Pedido cancelado, estoque deve ser liberado');
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      throw error;
    }
  }, [user, getOrderById, updateOrderStatus]);

  // Criar novo pedido com atualizações otimistas
  const createOrder = useCallback(async (
    orderData: Partial<Order>, 
    items: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[]
  ): Promise<string> => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    if (!items.length) {
      throw new Error('Pedido deve conter pelo menos um item');
    }

    try {
      // Calcular total do pedido
      const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
      
      // Criar ID otimista
      const optimisticId = `optimistic_${Date.now()}_${Math.random()}`;
      const now = new Date().toISOString();
      
      // Criar pedido otimista
      const optimisticOrder: Order = {
        id: optimisticId,
        user_id: user.id,
        status: 'pending',
        total_amount: totalAmount,
        payment_status: 'pending',
        created_at: now,
        updated_at: now,
        shipping_address: '',
        payment_method: '',
        ...orderData,
        order_items: items.map((item, index) => ({
          id: `optimistic_item_${index}`,
          order_id: optimisticId,
          created_at: now,
          ...item
        }))
      };

      // Aplicar atualização otimista
      const { applyOptimisticUpdate, rollbackOptimisticUpdate } = useRealtimeSync.getActions();
      applyOptimisticUpdate(optimisticOrder);

      // Rollback automático após 5 segundos se não confirmado
      const rollbackTimer = setTimeout(() => {
        rollbackOptimisticUpdate(optimisticId);
        console.warn('Rollback automático: criação de pedido não confirmada');
      }, 5000);

      // Criar pedido no servidor
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          status: 'pending',
          total_amount: totalAmount,
          payment_status: 'pending',
          ...orderData
        })
        .select('id')
        .single();

      if (orderError || !order) {
        clearTimeout(rollbackTimer);
        rollbackOptimisticUpdate(optimisticId);
        throw new Error(`Erro ao criar pedido: ${orderError?.message}`);
      }

      // Criar itens do pedido
      const orderItems = items.map(item => ({
        ...item,
        order_id: order.id
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        clearTimeout(rollbackTimer);
        rollbackOptimisticUpdate(optimisticId);
        // Rollback: deletar pedido se falhou ao criar itens
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`Erro ao criar itens do pedido: ${itemsError.message}`);
      }

      // Limpar timer se sucesso
      clearTimeout(rollbackTimer);
      console.log('Pedido criado com sucesso:', order.id);
      return order.id;
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      throw error;
    }
  }, [user]);

  return {
    orders,
    loading,
    error,
    isConnected,
    refetch,
    getOrderById,
    getOrdersByStatus,
    updateOrderStatus,
    cancelOrder,
    createOrder
  };
}

/**
 * Hook para dashboard administrativo de pedidos
 * Inclui estatísticas e métricas em tempo real
 */
export function useOrdersDashboard() {
  const { orders, loading, error, isConnected } = useRealtimeOrders();

  // Estatísticas dos pedidos
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const shipped = orders.filter(o => o.status === 'shipped').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    
    const totalRevenue = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + o.total_amount, 0);
    
    const pendingRevenue = orders
      .filter(o => o.payment_status === 'pending')
      .reduce((sum, o) => sum + o.total_amount, 0);

    return {
      total,
      pending,
      processing,
      shipped,
      delivered,
      cancelled,
      totalRevenue,
      pendingRevenue
    };
  }, [orders]);

  // Pedidos recentes (últimas 24h)
  const recentOrders = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return orders.filter(order => 
      new Date(order.created_at) > yesterday
    );
  }, [orders]);

  // Pedidos que precisam de atenção
  const alertOrders = useMemo(() => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    return orders.filter(order => 
      order.status === 'pending' && new Date(order.created_at) < twoDaysAgo
    );
  }, [orders]);

  return {
    orders,
    stats,
    recentOrders,
    alertOrders,
    loading,
    error,
    isConnected
  };
}

/**
 * Hook para rastreamento de pedido específico
 * Usado na página de acompanhamento do cliente
 */
export function useOrderTracking(orderId: string) {
  const filter = useMemo(() => `id=eq.${orderId}`, [orderId]);
  
  const {
    data: orders,
    loading,
    error,
    isConnected
  } = useRealtimeSync<Order>({
    table: 'orders',
    filter,
    select: `
      *,
      order_items (
        *,
        products:product_id (
          id,
          name,
          image_url
        ),
        product_sizes:product_size_id (
          id,
          size
        )
      )
    `,
    enableOptimistic: false,
    onUpdate: (updatedOrder) => {
      // Notificar cliente sobre mudanças no pedido
      console.log('Status do seu pedido foi atualizado:', updatedOrder.status);
    }
  });

  const order = orders[0];

  // Timeline do pedido
  const timeline = useMemo(() => {
    if (!order) return [];
    
    const steps = [
      { status: 'pending', label: 'Pedido Recebido', completed: true },
      { status: 'confirmed', label: 'Pedido Confirmado', completed: false },
      { status: 'processing', label: 'Preparando Pedido', completed: false },
      { status: 'shipped', label: 'Pedido Enviado', completed: false },
      { status: 'delivered', label: 'Pedido Entregue', completed: false }
    ];

    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);
    
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex && order.status !== 'cancelled',
      current: step.status === order.status
    }));
  }, [order]);

  return {
    order,
    timeline,
    loading,
    error,
    isConnected
  };
}