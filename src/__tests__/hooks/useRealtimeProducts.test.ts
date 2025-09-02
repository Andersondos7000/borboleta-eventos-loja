import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeProducts } from '../../hooks/realtime/useRealtimeProducts';
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
        ilike: jest.fn(() => ({
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

describe('useRealtimeProducts', () => {
  const mockProductsData = [
    {
      id: 'product-1',
      name: 'Camiseta Conferência 2024',
      description: 'Camiseta oficial da VII Conferência',
      price: 75.00,
      category_id: 'cat-1',
      is_active: true,
      featured: true,
      images: ['image1.jpg', 'image2.jpg'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      categories: {
        id: 'cat-1',
        name: 'Vestuário',
        slug: 'vestuario'
      },
      product_sizes: [
        {
          id: 'size-1',
          product_id: 'product-1',
          size: 'P',
          display_order: 1
        },
        {
          id: 'size-2',
          product_id: 'product-1',
          size: 'M',
          display_order: 2
        },
        {
          id: 'size-3',
          product_id: 'product-1',
          size: 'G',
          display_order: 3
        }
      ],
      product_sizes: [
        {
          id: 'size-1',
          product_id: 'product-1',
          size: 'P',
          stock_quantity: 50,
          display_order: 1
        },
        {
          id: 'size-2',
          product_id: 'product-1',
          size: 'M',
          stock_quantity: 100,
          display_order: 2
        },
        {
          id: 'size-3',
          product_id: 'product-1',
          size: 'G',
          stock_quantity: 75,
          display_order: 3
        }
      ]
    },
    {
      id: 'product-2',
      name: 'Caneca Borboleta Eventos',
      description: 'Caneca personalizada com logo',
      price: 25.00,
      category_id: 'cat-2',
      is_active: true,
      featured: false,
      images: ['caneca1.jpg'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      categories: {
        id: 'cat-2',
        name: 'Acessórios',
        slug: 'acessorios'
      },
      product_sizes: [
        {
          id: 'size-4',
          product_id: 'product-2',
          size: 'Único',
          display_order: 1
        }
      ],
      product_sizes: [
        {
          id: 'size-4',
          product_id: 'product-2',
          size: 'Único',
          stock_quantity: 200,
          display_order: 1
        }
      ]
    },
    {
      id: 'product-3',
      name: 'Produto Inativo',
      description: 'Produto desativado',
      price: 50.00,
      category_id: 'cat-1',
      is_active: false,
      featured: false,
      images: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      categories: {
        id: 'cat-1',
        name: 'Vestuário',
        slug: 'vestuario'
      },
      product_sizes: [],
      product_sizes: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRealtimeSync.mockReturnValue({
      data: mockProductsData,
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
    it('deve inicializar com dados de produtos', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      expect(result.current.products).toEqual(mockProductsData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isConnected).toBe(true);
    });

    it('deve filtrar apenas produtos ativos por padrão', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'products',
          filter: 'is_active.eq.true'
        })
      );
    });

    it('deve incluir produtos inativos quando solicitado', () => {
      const { result } = renderHook(() => useRealtimeProducts({ includeInactive: true }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: undefined
        })
      );
    });

    it('deve filtrar por categoria específica', () => {
      const { result } = renderHook(() => useRealtimeProducts({ categoryId: 'cat-1' }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'is_active.eq.true,category_id.eq.cat-1'
        })
      );
    });

    it('deve filtrar apenas produtos em destaque', () => {
      const { result } = renderHook(() => useRealtimeProducts({ featuredOnly: true }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'is_active.eq.true,featured.eq.true'
        })
      );
    });
  });

  describe('Funções de Consulta', () => {
    it('deve retornar produto por ID', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const product = result.current.getProductById('product-1');
      expect(product).not.toBeNull();
      expect(product?.id).toBe('product-1');
      expect(product?.name).toBe('Camiseta Conferência 2024');
    });

    it('deve retornar produtos por categoria', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const categoryProducts = result.current.getProductsByCategory('cat-1');
      expect(categoryProducts).toHaveLength(1);
      expect(categoryProducts[0].category_id).toBe('cat-1');
    });

    it('deve retornar produtos em destaque', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const featuredProducts = result.current.getFeaturedProducts();
      expect(featuredProducts).toHaveLength(1);
      expect(featuredProducts[0].featured).toBe(true);
    });

    it('deve buscar produtos por termo', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const searchResults = result.current.searchProducts('Camiseta');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toContain('Camiseta');
    });

    it('deve buscar produtos por múltiplos termos', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const searchResults = result.current.searchProducts('Conferência 2024');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toContain('Conferência');
      expect(searchResults[0].name).toContain('2024');
    });

    it('deve retornar produtos com estoque disponível', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const availableProducts = result.current.getAvailableProducts();
      expect(availableProducts).toHaveLength(2); // product-1 e product-2 têm estoque
    });

    it('deve verificar se produto tem estoque', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      expect(result.current.hasStock('product-1')).toBe(true);
      expect(result.current.hasStock('product-2')).toBe(true);
      expect(result.current.hasStock('product-3')).toBe(false);
    });

    it('deve retornar estoque total do produto', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      expect(result.current.getTotalStock('product-1')).toBe(205); // 45 + 90 + 70
      expect(result.current.getTotalStock('product-2')).toBe(180);
      expect(result.current.getTotalStock('product-3')).toBe(0);
    });
  });

  describe('Filtros e Ordenação', () => {
    it('deve filtrar produtos por faixa de preço', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const filteredProducts = result.current.filterByPriceRange(20, 50);
      expect(filteredProducts).toHaveLength(1);
      expect(filteredProducts[0].price).toBe(25.00);
    });

    it('deve ordenar produtos por preço crescente', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const sortedProducts = result.current.sortProducts('price', 'asc');
      expect(sortedProducts[0].price).toBe(25.00);
      expect(sortedProducts[1].price).toBe(75.00);
    });

    it('deve ordenar produtos por preço decrescente', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const sortedProducts = result.current.sortProducts('price', 'desc');
      expect(sortedProducts[0].price).toBe(75.00);
      expect(sortedProducts[1].price).toBe(25.00);
    });

    it('deve ordenar produtos por nome', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const sortedProducts = result.current.sortProducts('name', 'asc');
      expect(sortedProducts[0].name).toBe('Camiseta Conferência 2024');
      expect(sortedProducts[1].name).toBe('Caneca Borboleta Eventos');
    });

    it('deve ordenar produtos por data de criação', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const sortedProducts = result.current.sortProducts('created_at', 'desc');
      expect(sortedProducts).toHaveLength(2); // Apenas produtos ativos
    });
  });

  describe('Operações de Produtos', () => {
    it('deve atualizar produto com sucesso', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeProducts());

      const success = await result.current.updateProduct('product-1', {
        name: 'Novo Nome',
        price: 80.00
      });
      expect(success).toBe(true);
    });

    it('deve ativar/desativar produto com sucesso', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeProducts());

      const success = await result.current.toggleProductStatus('product-1');
      expect(success).toBe(true);
    });

    it('deve marcar/desmarcar produto como destaque', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeProducts());

      const success = await result.current.toggleFeatured('product-2');
      expect(success).toBe(true);
    });

    it('deve atualizar preço do produto', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeProducts());

      const success = await result.current.updatePrice('product-1', 85.00);
      expect(success).toBe(true);
    });
  });

  describe('Métricas e Estatísticas', () => {
    it('deve calcular métricas de produtos', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const metrics = result.current.getProductMetrics();
      expect(metrics.totalProducts).toBe(2); // Apenas ativos
      expect(metrics.featuredProducts).toBe(1);
      expect(metrics.averagePrice).toBe(50.00); // (75 + 25) / 2
      expect(metrics.totalStockValue).toBe(9000.00); // (205 * 75) + (180 * 25)
    });

    it('deve retornar produtos mais populares', () => {
      const { result } = renderHook(() => useRealtimeProducts());

      const popularProducts = result.current.getPopularProducts(5);
      expect(popularProducts).toHaveLength(2);
    });

    it('deve retornar produtos com estoque baixo', () => {
      // Mock com produto de estoque baixo
      const lowStockData = [
        {
          ...mockProductsData[0],
          product_sizes: [
            {
              id: 'stock-1',
              product_id: 'product-1',
              size_id: 'size-1',
              quantity: 5,
              available_quantity: 3
            }
          ]
        }
      ];

      mockUseRealtimeSync.mockReturnValue({
        data: lowStockData,
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

      const { result } = renderHook(() => useRealtimeProducts());

      const lowStockProducts = result.current.getLowStockProducts(10);
      expect(lowStockProducts).toHaveLength(1);
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

      const { result } = renderHook(() => useRealtimeProducts());

      expect(result.current.error).toEqual(new Error('Erro de conexão'));
      expect(result.current.isConnected).toBe(false);
    });

    it('deve lidar com erro ao atualizar produto', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ 
        error: { message: 'Erro no banco' } 
      });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeProducts());

      const success = await result.current.updateProduct('product-1', { name: 'Novo Nome' });
      expect(success).toBe(false);
    });
  });

  describe('Updates Otimistas', () => {
    it('deve aplicar update otimista ao atualizar produto', async () => {
      const mockOptimisticUpdate = jest.fn();
      mockUseRealtimeSync.mockReturnValue({
        data: mockProductsData,
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

      const { result } = renderHook(() => useRealtimeProducts());

      await result.current.updateProduct('product-1', { name: 'Novo Nome' });

      expect(mockOptimisticUpdate).toHaveBeenCalled();
    });

    it('deve fazer rollback em caso de erro', async () => {
      const mockRollback = jest.fn();
      mockUseRealtimeSync.mockReturnValue({
        data: mockProductsData,
        loading: false,
        error: null,
        refetch: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        isConnected: true,
        connectionStatus: 'connected',
        optimisticUpdate: jest.fn(),
        rollbackOptimistic: mockRollback
      });

      const mockUpdate = jest.fn().mockResolvedValue({ 
        error: { message: 'Erro no servidor' } 
      });
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn(() => ({
          eq: mockUpdate
        }))
      });

      const { result } = renderHook(() => useRealtimeProducts());

      await result.current.updateProduct('product-1', { name: 'Novo Nome' });

      expect(mockRollback).toHaveBeenCalled();
    });
  });

  describe('Paginação e Performance', () => {
    it('deve suportar paginação', () => {
      const { result } = renderHook(() => 
        useRealtimeProducts({ page: 1, limit: 10 })
      );

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0
        })
      );
    });

    it('deve calcular offset corretamente para páginas', () => {
      const { result } = renderHook(() => 
        useRealtimeProducts({ page: 3, limit: 20 })
      );

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 40 // (3-1) * 20
        })
      );
    });
  });

  describe('Notificações em Tempo Real', () => {
    it('deve processar callback de novo produto', () => {
      const onProductAdded = jest.fn();
      const { result } = renderHook(() => useRealtimeProducts({ onProductAdded }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          onInsert: expect.any(Function)
        })
      );
    });

    it('deve processar callback de atualização de produto', () => {
      const { result } = renderHook(() => useRealtimeProducts({ isActive: true }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          onUpdate: expect.any(Function)
        })
      );
    });

    it('deve processar callback de remoção de produto', () => {
      const onProductRemoved = jest.fn();
      const { result } = renderHook(() => useRealtimeProducts({ onProductRemoved }));

      expect(mockUseRealtimeSync).toHaveBeenCalledWith(
        expect.objectContaining({
          onDelete: expect.any(Function)
        })
      );
    });
  });
});