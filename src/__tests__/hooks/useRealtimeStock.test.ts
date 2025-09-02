import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeStock } from '../../hooks/realtime/useRealtimeStock';
import { supabase } from '../../lib/supabase';

// Mock do Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            limit: jest.fn()
          }))
        })),
        filter: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn()
          }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn()
        })),
        limit: jest.fn()
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn()
      })),
      unsubscribe: jest.fn()
    }))
  }
}));

// Mock do useRealtimeSync
jest.mock('../../hooks/realtime/useRealtimeSync', () => ({
  useRealtimeSync: jest.fn()
}));

import { useRealtimeSync } from '../../hooks/realtime/useRealtimeSync';

const mockUseRealtimeSync = useRealtimeSync as jest.MockedFunction<typeof useRealtimeSync>;

describe('useRealtimeStock', () => {
  const mockStockData = [
    {
      id: 'stock-1',
      product_id: 'product-1',
      size_id: 'size-1',
      quantity: 100,
      reserved_quantity: 10,
      available_quantity: 90,
      low_stock_threshold: 20,
      updated_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      products: {
        id: 'product-1',
        name: 'Camiseta Teste',
        price: 50,
        category_id: 'cat-1'
      },
      product_sizes: {
        id: 'size-1',
        size: 'M',
        display_order: 1
      }
    },
    {
      id: 'stock-2',
      product_id: 'product-1',
      size_id: 'size-2',
      quantity: 15,
      reserved_quantity: 5,
      available_quantity: 10,
      low_stock_threshold: 20,
      updated_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      products: {
        id: 'product-1',
        name: 'Camiseta Teste',
        price: 50,
        category_id: 'cat-1'
      },
      product_sizes: {
        id: 'size-2',
        size: 'G',
        display_order: 2
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRealtimeSync.mockReturnValue({
      data: mockStockData,
      loading: false,
      error: null,
      refetch: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      isConnected: true,
      connectionStatus: 'connected',
      optimisticUpdate: jest.fn(),
      rollbackOptimistic: jest.fn(),
      metrics: {
        totalUpdates: 0,
        lastUpdate: null,
        reconnectCount: 0
      }
    });
  });

  describe('Inicialização', () => {
    it('deve inicializar com dados de estoque', () => {
      const { result } = renderHook(() => useRealtimeStock());

      expect(result.current.stock).toEqual(mockStockData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isConnected).toBe(true);
    });

    it('deve filtrar por produto específico', () => {
      const { result } = renderHook(() => useRealtimeStock({ productId: 'product-1' }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'product_sizes',
          filter: 'product_id.eq.product-1'
        })
      );
    });

    it('deve filtrar apenas estoque baixo', () => {
      const { result } = renderHook(() => useRealtimeStock({ lowStockOnly: true }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'quantity.lte.low_stock_threshold'
        })
      );
    });
  });

  describe('Métricas de Estoque', () => {
    it('deve calcular métricas corretamente', () => {
      const { result } = renderHook(() => useRealtimeStock());

      expect(result.current.metrics.totalProducts).toBe(2);
      expect(result.current.metrics.lowStockItems).toBe(1); // stock-2 tem 10 disponível, threshold 20
      expect(result.current.metrics.outOfStockItems).toBe(0);
      expect(result.current.metrics.totalReserved).toBe(15);
    });

    it('deve detectar alertas de estoque baixo', () => {
      const { result } = renderHook(() => useRealtimeStock());

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].alert_type).toBe('low_stock');
      expect(result.current.alerts[0].product_id).toBe('product-1');
      expect(result.current.alerts[0].size_id).toBe('size-2');
    });
  });

  describe('Funções de Consulta', () => {
    it('deve retornar estoque por produto', () => {
      const { result } = renderHook(() => useRealtimeStock());

      const productStock = result.current.getStockByProduct('product-1');
      expect(productStock).toHaveLength(2);
      expect(productStock[0].product_id).toBe('product-1');
    });

    it('deve retornar estoque por tamanho específico', () => {
      const { result } = renderHook(() => useRealtimeStock());

      const sizeStock = result.current.getStockBySize('product-1', 'size-1');
      expect(sizeStock).not.toBeNull();
      expect(sizeStock?.available_quantity).toBe(90);
    });

    it('deve verificar disponibilidade do produto', () => {
      const { result } = renderHook(() => useRealtimeStock());

      expect(result.current.isProductAvailable('product-1', 'size-1', 50)).toBe(true);
      expect(result.current.isProductAvailable('product-1', 'size-1', 100)).toBe(false);
      expect(result.current.isProductAvailable('product-1', 'size-2', 15)).toBe(false);
    });

    it('deve retornar quantidade disponível', () => {
      const { result } = renderHook(() => useRealtimeStock());

      expect(result.current.getAvailableQuantity('product-1', 'size-1')).toBe(90);
      expect(result.current.getAvailableQuantity('product-1', 'size-2')).toBe(10);
      expect(result.current.getAvailableQuantity('product-inexistente', 'size-1')).toBe(0);
    });
  });

  describe('Operações de Estoque', () => {
    it('deve reservar estoque com sucesso', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeStock());

      const success = await result.current.reserveStock('product-1', 'size-1', 10);
      expect(success).toBe(true);
    });

    it('deve falhar ao reservar estoque insuficiente', async () => {
      const { result } = renderHook(() => useRealtimeStock());

      const success = await result.current.reserveStock('product-1', 'size-2', 15);
      expect(success).toBe(false);
    });

    it('deve liberar reserva com sucesso', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeStock());

      const success = await result.current.releaseReservation('product-1', 'size-1', 5);
      expect(success).toBe(true);
    });

    it('deve atualizar estoque com sucesso', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeStock());

      const success = await result.current.updateStock('product-1', 'size-1', 150);
      expect(success).toBe(true);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com erros de conexão', () => {
      mockUseRealtimeSync.mockReturnValue({
        data: [],
        loading: false,
        error: new Error('Erro de conexão'),
        refetch: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        isConnected: false,
        connectionStatus: 'disconnected',
        optimisticUpdate: jest.fn(),
        rollbackOptimistic: jest.fn()
      });

      const { result } = renderHook(() => useRealtimeStock());

      expect(result.current.error).toEqual(new Error('Erro de conexão'));
      expect(result.current.isConnected).toBe(false);
    });

    it('deve lidar com erro ao atualizar estoque', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ 
        error: { message: 'Erro no banco' } 
      });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeStock());

      const success = await result.current.updateStock('product-1', 'size-1', 150);
      expect(success).toBe(false);
    });
  });

  describe('Updates Otimistas', () => {
    it('deve aplicar update otimista ao reservar estoque', async () => {
      const mockOptimisticUpdate = jest.fn();
      mockUseRealtimeSync.mockReturnValue({
        data: mockStockData,
        loading: false,
        error: null,
        refetch: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        isConnected: true,
        connectionStatus: 'connected',
        optimisticUpdate: mockOptimisticUpdate,
        rollbackOptimistic: jest.fn()
      });

      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeStock());

      await result.current.reserveStock('product-1', 'size-1', 10);

      expect(mockOptimisticUpdate).toHaveBeenCalled();
    });

    it('deve fazer rollback em caso de erro', async () => {
      const mockRollback = jest.fn();
      mockUseRealtimeSync.mockReturnValue({
        data: mockStockData,
        loading: false,
        error: null,
        refetch: mockRefetch,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
        isConnected: true,
        connectionStatus: 'connected',
        optimisticUpdate: mockOptimisticUpdate,
        rollbackOptimistic: mockRollback,
        metrics: {
          totalUpdates: 0,
          lastUpdate: null,
          reconnectCount: 0
        }
      });

      const mockUpdate = jest.fn().mockResolvedValue({ 
        error: { message: 'Erro no servidor' } 
      });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeStock());

      await result.current.reserveStock('product-1', 'size-1', 10);

      expect(mockRollback).toHaveBeenCalled();
    });
  });
});