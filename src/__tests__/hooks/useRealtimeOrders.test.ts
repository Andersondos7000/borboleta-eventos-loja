import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeOrders } from '../../hooks/realtime/useRealtimeOrders';
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

describe('useRealtimeOrders', () => {
  const mockOrdersData = [
    {
      id: 'order-1',
      user_id: 'user-1',
      status: 'pending',
      total_amount: 150.00,
      payment_status: 'pending',
      payment_method: 'credit_card',
      shipping_address: {
        street: 'Rua Teste, 123',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '01234-567'
      },
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      order_items: [
        {
          id: 'item-1',
          product_id: 'product-1',
          size_id: 'size-1',
          quantity: 2,
          price: 50.00,
          total_price: 100.00,
          products: {
            id: 'product-1',
            name: 'Camiseta Teste',
            price: 50.00
          },
          product_sizes: {
            id: 'size-1',
            size: 'M'
          }
        },
        {
          id: 'item-2',
          product_id: 'product-2',
          size_id: 'size-2',
          quantity: 1,
          price: 50.00,
          total_price: 50.00,
          products: {
            id: 'product-2',
            name: 'Calça Teste',
            price: 50.00
          },
          product_sizes: {
            id: 'size-2',
            size: 'G'
          }
        }
      ]
    },
    {
      id: 'order-2',
      user_id: 'user-2',
      status: 'confirmed',
      total_amount: 75.00,
      payment_status: 'paid',
      payment_method: 'pix',
      shipping_address: {
        street: 'Av. Principal, 456',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zip_code: '20000-000'
      },
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-01T11:00:00Z',
      order_items: [
        {
          id: 'item-3',
          product_id: 'product-1',
          size_id: 'size-1',
          quantity: 1,
          price: 75.00,
          total_price: 75.00,
          products: {
            id: 'product-1',
            name: 'Camiseta Premium',
            price: 75.00
          },
          product_sizes: {
            id: 'size-1',
            size: 'M'
          }
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRealtimeSync.mockReturnValue({
      data: mockOrdersData,
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
    it('deve inicializar com dados de pedidos', () => {
      const { result } = renderHook(() => useRealtimeOrders());

      expect(result.current.orders).toEqual(mockOrdersData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isConnected).toBe(true);
    });

    it('deve filtrar por usuário específico', () => {
      const { result } = renderHook(() => useRealtimeOrders({ userId: 'user-1' }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'orders',
          filter: 'user_id.eq.user-1'
        })
      );
    });

    it('deve filtrar por status específico', () => {
      const { result } = renderHook(() => useRealtimeOrders({ status: 'pending' }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'status.eq.pending'
        })
      );
    });

    it('deve filtrar por período de datas', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      const { result } = renderHook(() => 
        useRealtimeOrders({ dateRange: { start: startDate, end: endDate } })
      );

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `created_at.gte.${startDate},created_at.lte.${endDate}`
        })
      );
    });
  });

  describe('Funcionalidades Básicas', () => {
    it('deve retornar lista de pedidos', () => {
      const { result } = renderHook(() => useRealtimeOrders());

      expect(Array.isArray(result.current.orders)).toBe(true);
      expect(result.current.orders.length).toBeGreaterThan(0);
    });

    it('deve ter estado de loading', () => {
      const { result } = renderHook(() => useRealtimeOrders());

      expect(typeof result.current.loading).toBe('boolean');
    });

    it('deve ter estado de conexão', () => {
      const { result } = renderHook(() => useRealtimeOrders());

      expect(typeof result.current.isConnected).toBe('boolean');
    });
  });

  describe('Funções de Consulta', () => {
    it('deve retornar pedido por ID', () => {
      const { result } = renderHook(() => useRealtimeOrders());

      const order = result.current.getOrderById('order-1');
      expect(order).not.toBeNull();
      expect(order?.id).toBe('order-1');
      expect(order?.status).toBe('pending');
    });

    it('deve retornar pedidos por usuário', () => {
      const { result } = renderHook(() => useRealtimeOrders());

      const userOrders = result.current.getOrdersByUser('user-1');
      expect(userOrders).toHaveLength(1);
      expect(userOrders[0].user_id).toBe('user-1');
    });

    it('deve retornar pedidos recentes', () => {
      const { result } = renderHook(() => useRealtimeOrders());

      const recentOrders = result.current.getRecentOrders(1);
      expect(recentOrders).toHaveLength(1);
      expect(recentOrders[0].id).toBe('order-1'); // Mais recente
    });

    it('deve buscar pedidos por termo', () => {
      const { result } = renderHook(() => useRealtimeOrders());

      const searchResults = result.current.searchOrders('order-1');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('order-1');
    });
  });

  describe('Operações de Pedidos', () => {
    it('deve atualizar status do pedido com sucesso', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeOrders());

      const success = await result.current.updateOrderStatus('order-1', 'confirmed');
      expect(success).toBe(true);
    });

    it('deve atualizar status de pagamento com sucesso', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeOrders());

      const success = await result.current.updatePaymentStatus('order-1', 'paid');
      expect(success).toBe(true);
    });

    it('deve cancelar pedido com sucesso', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeOrders());

      const success = await result.current.cancelOrder('order-1', 'Cancelado pelo cliente');
      expect(success).toBe(true);
    });

    it('deve adicionar nota ao pedido com sucesso', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeOrders());

      const success = await result.current.addOrderNote('order-1', 'Entrega urgente');
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
        rollbackOptimistic: jest.fn(),
        metrics: {
          totalUpdates: 0,
          lastUpdate: null,
          reconnectCount: 0
        }
      });

      const { result } = renderHook(() => useRealtimeOrders());

      expect(result.current.error).toEqual(new Error('Erro de conexão'));
      expect(result.current.isConnected).toBe(false);
    });

    it('deve lidar com erro ao atualizar pedido', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ 
        error: { message: 'Erro no banco' } 
      });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeOrders());

      const success = await result.current.updateOrderStatus('order-1', 'confirmed');
      expect(success).toBe(false);
    });
  });

  describe('Updates Otimistas', () => {
    it('deve aplicar update otimista ao atualizar status', async () => {
      const mockOptimisticUpdate = jest.fn();
      mockUseRealtimeSync.mockReturnValue({
        data: mockOrdersData,
        loading: false,
        error: null,
        refetch: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        isConnected: true,
        connectionStatus: 'connected',
        optimisticUpdate: mockOptimisticUpdate,
        rollbackOptimistic: jest.fn(),
        metrics: {
          totalUpdates: 0,
          lastUpdate: null,
          reconnectCount: 0
        }
      });

      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeOrders());

      await result.current.updateOrderStatus('order-1', 'confirmed');

      expect(mockOptimisticUpdate).toHaveBeenCalled();
    });

    it('deve fazer rollback em caso de erro', async () => {
      const mockRollback = jest.fn();
      mockUseRealtimeSync.mockReturnValue({
        data: mockOrdersData,
        loading: false,
        error: null,
        refetch: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        isConnected: true,
        connectionStatus: 'connected',
        optimisticUpdate: jest.fn(),
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

      const { result } = renderHook(() => useRealtimeOrders());

      await result.current.updateOrderStatus('order-1', 'confirmed');

      expect(mockRollback).toHaveBeenCalled();
    });
  });

  describe('Notificações em Tempo Real', () => {
    it('deve processar callback de novo pedido', () => {
      const onNewOrder = jest.fn();
      const { result } = renderHook(() => useRealtimeOrders({ onNewOrder }));

      // Simular novo pedido via realtime
      const newOrder = {
        id: 'order-3',
        user_id: 'user-3',
        status: 'pending',
        total_amount: 100.00,
        created_at: new Date().toISOString()
      };

      // Verificar se o callback seria chamado
      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          onInsert: expect.any(Function)
        })
      );
    });

    it('deve processar callback de atualização de pedido', () => {
      const onOrderUpdate = jest.fn();
      const { result } = renderHook(() => useRealtimeOrders({ onOrderUpdate }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          onUpdate: expect.any(Function)
        })
      );
    });
  });
});