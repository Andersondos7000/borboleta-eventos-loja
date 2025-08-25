import { useCallback, useEffect, useState } from 'react';
import { useRealtimeSync, RealtimeSyncOptions } from './useRealtimeSync';
import { supabase } from '../../lib/supabase';

// Tipos para estoque
export interface ProductStock {
  id: string;
  product_id: string;
  size_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  updated_at: string;
  created_at: string;
  // Dados relacionados via join
  products?: {
    id: string;
    name: string;
    price: number;
    category_id: string;
  };
  product_sizes?: {
    id: string;
    size: string;
    display_order: number;
  };
}

export interface StockAlert {
  id: string;
  product_id: string;
  size_id: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'reserved_exceeded';
  threshold_value: number;
  current_value: number;
  created_at: string;
  resolved_at?: string;
}

export interface StockMetrics {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalReserved: number;
  lastStockUpdate: Date | null;
}

interface UseRealtimeStockOptions extends Omit<RealtimeSyncOptions<ProductStock>, 'table'> {
  productId?: string;
  sizeId?: string;
  lowStockOnly?: boolean;
  includeProductData?: boolean;
}

interface UseRealtimeStockReturn {
  stock: ProductStock[];
  loading: boolean;
  error: Error | null;
  metrics: StockMetrics;
  alerts: StockAlert[];
  
  // Funções de consulta
  getStockByProduct: (productId: string) => ProductStock[];
  getStockBySize: (productId: string, sizeId: string) => ProductStock | null;
  isProductAvailable: (productId: string, sizeId: string, quantity?: number) => boolean;
  getAvailableQuantity: (productId: string, sizeId: string) => number;
  
  // Funções de atualização
  reserveStock: (productId: string, sizeId: string, quantity: number) => Promise<boolean>;
  releaseReservation: (productId: string, sizeId: string, quantity: number) => Promise<boolean>;
  updateStock: (productId: string, sizeId: string, newQuantity: number) => Promise<boolean>;
  
  // Controles de sincronização
  refetch: () => void;
  subscribe: () => void;
  unsubscribe: () => void;
  isConnected: boolean;
  connectionStatus: string;
}

/**
 * Hook para monitoramento de estoque em tempo real
 * Implementa funcionalidades avançadas de controle de estoque com alertas automáticos
 */
export function useRealtimeStock(options: UseRealtimeStockOptions = {}): UseRealtimeStockReturn {
  const {
    productId,
    sizeId,
    lowStockOnly = false,
    includeProductData = true,
    ...syncOptions
  } = options;

  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [metrics, setMetrics] = useState<StockMetrics>({
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalReserved: 0,
    lastStockUpdate: null
  });

  // Construir filtros dinâmicos
  const buildFilter = useCallback(() => {
    const filters: string[] = [];
    
    if (productId) {
      filters.push(`product_id.eq.${productId}`);
    }
    
    if (sizeId) {
      filters.push(`size_id.eq.${sizeId}`);
    }
    
    if (lowStockOnly) {
      filters.push('quantity.lte.low_stock_threshold');
    }
    
    return filters.length > 0 ? filters.join(',') : undefined;
  }, [productId, sizeId, lowStockOnly]);

  // Construir select com joins opcionais
  const buildSelect = useCallback(() => {
    let select = `
      id,
      product_id,
      size_id,
      quantity,
      reserved_quantity,
      available_quantity,
      low_stock_threshold,
      updated_at,
      created_at
    `;
    
    if (includeProductData) {
      select += `,
        products:product_id (
          id,
          name,
          price,
          category_id
        ),
        product_sizes:size_id (
          id,
          size,
          display_order
        )
      `;
    }
    
    return select;
  }, [includeProductData]);

  // Configuração do hook de sincronização
  const realtimeOptions: RealtimeSyncOptions<ProductStock> = {
    table: 'product_stock',
    filter: buildFilter(),
    select: buildSelect(),
    orderBy: 'updated_at desc',
    enableOptimistic: true,
    enableRetry: true,
    maxRetries: 5,
    retryDelay: 2000,
    onUpdate: (updatedStock) => {
      // Verificar alertas de estoque baixo
      checkStockAlerts(updatedStock);
      
      // Atualizar métricas
      updateMetrics();
    },
    onError: (error) => {
      console.error('[useRealtimeStock] Erro na sincronização:', error);
    },
    ...syncOptions
  };

  const {
    data: stock,
    loading,
    error,
    refetch,
    subscribe,
    unsubscribe,
    isConnected,
    connectionStatus,
    optimisticUpdate
  } = useRealtimeSync<ProductStock>(realtimeOptions);

  // Função para verificar alertas de estoque
  const checkStockAlerts = useCallback((stockItem: ProductStock) => {
    const newAlerts: StockAlert[] = [];
    
    // Alerta de estoque baixo
    if (stockItem.available_quantity <= stockItem.low_stock_threshold && stockItem.available_quantity > 0) {
      newAlerts.push({
        id: `low_stock_${stockItem.id}_${Date.now()}`,
        product_id: stockItem.product_id,
        size_id: stockItem.size_id,
        alert_type: 'low_stock',
        threshold_value: stockItem.low_stock_threshold,
        current_value: stockItem.available_quantity,
        created_at: new Date().toISOString()
      });
    }
    
    // Alerta de estoque esgotado
    if (stockItem.available_quantity <= 0) {
      newAlerts.push({
        id: `out_of_stock_${stockItem.id}_${Date.now()}`,
        product_id: stockItem.product_id,
        size_id: stockItem.size_id,
        alert_type: 'out_of_stock',
        threshold_value: 0,
        current_value: stockItem.available_quantity,
        created_at: new Date().toISOString()
      });
    }
    
    // Alerta de reserva excedida
    if (stockItem.reserved_quantity > stockItem.quantity) {
      newAlerts.push({
        id: `reserved_exceeded_${stockItem.id}_${Date.now()}`,
        product_id: stockItem.product_id,
        size_id: stockItem.size_id,
        alert_type: 'reserved_exceeded',
        threshold_value: stockItem.quantity,
        current_value: stockItem.reserved_quantity,
        created_at: new Date().toISOString()
      });
    }
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
    }
  }, []);

  // Função para atualizar métricas
  const updateMetrics = useCallback(() => {
    if (!stock.length) return;
    
    const metrics: StockMetrics = {
      totalProducts: stock.length,
      lowStockItems: stock.filter(item => 
        item.available_quantity <= item.low_stock_threshold && item.available_quantity > 0
      ).length,
      outOfStockItems: stock.filter(item => item.available_quantity <= 0).length,
      totalReserved: stock.reduce((sum, item) => sum + item.reserved_quantity, 0),
      lastStockUpdate: new Date()
    };
    
    setMetrics(metrics);
  }, [stock]);

  // Atualizar métricas quando stock muda
  useEffect(() => {
    updateMetrics();
  }, [updateMetrics]);

  // Funções de consulta
  const getStockByProduct = useCallback((productId: string): ProductStock[] => {
    return stock.filter(item => item.product_id === productId);
  }, [stock]);

  const getStockBySize = useCallback((productId: string, sizeId: string): ProductStock | null => {
    return stock.find(item => 
      item.product_id === productId && item.size_id === sizeId
    ) || null;
  }, [stock]);

  const isProductAvailable = useCallback((productId: string, sizeId: string, quantity: number = 1): boolean => {
    const stockItem = getStockBySize(productId, sizeId);
    return stockItem ? stockItem.available_quantity >= quantity : false;
  }, [getStockBySize]);

  const getAvailableQuantity = useCallback((productId: string, sizeId: string): number => {
    const stockItem = getStockBySize(productId, sizeId);
    return stockItem ? stockItem.available_quantity : 0;
  }, [getStockBySize]);

  // Funções de atualização de estoque
  const reserveStock = useCallback(async (productId: string, sizeId: string, quantity: number): Promise<boolean> => {
    try {
      const stockItem = getStockBySize(productId, sizeId);
      if (!stockItem || stockItem.available_quantity < quantity) {
        return false;
      }

      // Criar ID otimista único
      const optimisticId = `optimistic_reserve_${Date.now()}_${Math.random()}`;
      
      // Optimistic update
      const optimisticItem = {
        ...stockItem,
        reserved_quantity: stockItem.reserved_quantity + quantity,
        available_quantity: stockItem.available_quantity - quantity,
        updated_at: new Date().toISOString()
      };
      
      optimisticUpdate(optimisticItem, 'update', optimisticId);

      // Rollback automático após 5 segundos se não confirmado
      const rollbackTimer = setTimeout(() => {
        rollbackOptimistic(optimisticId);
      }, 5000);

      try {
        // Atualização no banco
        const { error } = await supabase
          .from('product_stock')
          .update({
            reserved_quantity: stockItem.reserved_quantity + quantity,
            available_quantity: stockItem.available_quantity - quantity
          })
          .eq('id', stockItem.id);

        clearTimeout(rollbackTimer);

        if (error) {
          console.error('Erro ao reservar estoque:', error);
          rollbackOptimistic(optimisticId);
          return false;
        }

        return true;
      } catch (dbError) {
        clearTimeout(rollbackTimer);
        rollbackOptimistic(optimisticId);
        throw dbError;
      }
    } catch (error) {
      console.error('Erro ao reservar estoque:', error);
      return false;
    }
  }, [getStockBySize, optimisticUpdate, rollbackOptimistic]);

  const releaseReservation = useCallback(async (productId: string, sizeId: string, quantity: number): Promise<boolean> => {
    try {
      const stockItem = getStockBySize(productId, sizeId);
      if (!stockItem || stockItem.reserved_quantity < quantity) {
        return false;
      }

      // Criar ID otimista único
      const optimisticId = `optimistic_release_${Date.now()}_${Math.random()}`;
      
      // Optimistic update
      const optimisticItem = {
        ...stockItem,
        reserved_quantity: Math.max(0, stockItem.reserved_quantity - quantity),
        available_quantity: stockItem.available_quantity + quantity,
        updated_at: new Date().toISOString()
      };
      
      optimisticUpdate(optimisticItem, 'update', optimisticId);

      // Rollback automático após 5 segundos se não confirmado
      const rollbackTimer = setTimeout(() => {
        rollbackOptimistic(optimisticId);
      }, 5000);

      try {
        // Atualização no banco
        const { error } = await supabase
          .from('product_stock')
          .update({
            reserved_quantity: Math.max(0, stockItem.reserved_quantity - quantity),
            available_quantity: stockItem.available_quantity + quantity
          })
          .eq('id', stockItem.id);

        clearTimeout(rollbackTimer);

        if (error) {
          console.error('Erro ao liberar reserva:', error);
          rollbackOptimistic(optimisticId);
          return false;
        }

        return true;
      } catch (dbError) {
        clearTimeout(rollbackTimer);
        rollbackOptimistic(optimisticId);
        throw dbError;
      }
    } catch (error) {
      console.error('Erro ao liberar reserva:', error);
      return false;
    }
  }, [getStockBySize, optimisticUpdate, rollbackOptimistic]);

  const updateStock = useCallback(async (productId: string, sizeId: string, newQuantity: number): Promise<boolean> => {
    try {
      const stockItem = getStockBySize(productId, sizeId);
      if (!stockItem) {
        return false;
      }

      // Criar ID otimista único
      const optimisticId = `optimistic_update_${Date.now()}_${Math.random()}`;
      
      // Calcular nova quantidade disponível
      const newAvailableQuantity = Math.max(0, newQuantity - stockItem.reserved_quantity);

      // Optimistic update
      const optimisticItem = {
        ...stockItem,
        quantity: newQuantity,
        available_quantity: newAvailableQuantity,
        updated_at: new Date().toISOString()
      };
      
      optimisticUpdate(optimisticItem, 'update', optimisticId);

      // Rollback automático após 5 segundos se não confirmado
      const rollbackTimer = setTimeout(() => {
        rollbackOptimistic(optimisticId);
      }, 5000);

      try {
        // Atualização no banco
        const { error } = await supabase
          .from('product_stock')
          .update({
            quantity: newQuantity,
            available_quantity: newAvailableQuantity
          })
          .eq('id', stockItem.id);

        clearTimeout(rollbackTimer);

        if (error) {
          console.error('Erro ao atualizar estoque:', error);
          rollbackOptimistic(optimisticId);
          return false;
        }

        return true;
      } catch (dbError) {
        clearTimeout(rollbackTimer);
        rollbackOptimistic(optimisticId);
        throw dbError;
      }
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      return false;
    }
  }, [getStockBySize, optimisticUpdate, rollbackOptimistic]);

  return {
    stock,
    loading,
    error,
    metrics,
    alerts,
    
    // Funções de consulta
    getStockByProduct,
    getStockBySize,
    isProductAvailable,
    getAvailableQuantity,
    
    // Funções de atualização
    reserveStock,
    releaseReservation,
    updateStock,
    
    // Controles de sincronização
    refetch,
    subscribe,
    unsubscribe,
    isConnected,
    connectionStatus
  };
}

export default useRealtimeStock;