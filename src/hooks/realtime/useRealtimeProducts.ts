import { useCallback, useMemo } from 'react';
import { useRealtimeSync } from './useRealtimeSync';
import { supabase } from '../../lib/supabase';

// Tipos para produtos
interface ProductSize {
  id: string;
  product_id: string;
  size: string;
  created_at: string;
}

interface ProductStock {
  id: string;
  product_id: string;
  size: string;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  size?: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG'; // tamanho do produto
  // Dados relacionados (joins)
  categories?: Category;
  product_sizes?: ProductStock[]; // Usando ProductStock que agora representa product_sizes
}

interface ProductFilters {
  categoryId?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  inStock?: boolean;
}

interface UseRealtimeProductsReturn {
  products: Product[];
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
  refetch: () => void;
  getProductById: (id: string) => Product | undefined;
  getProductStock: (productId: string, sizeId?: string) => number;
  isProductAvailable: (productId: string, sizeId: string, quantity?: number) => boolean;
  getAvailableSizes: (productId: string) => ProductSize[];
}

/**
 * Hook para sincronização em tempo real de produtos
 * Inclui controle de estoque e disponibilidade
 */
export function useRealtimeProducts(filters?: ProductFilters): UseRealtimeProductsReturn {
  // Construir filtro baseado nos parâmetros
  const filter = useMemo(() => {
    const conditions: string[] = [];
    
    if (filters?.categoryId) {
      conditions.push(`category_id=eq.${filters.categoryId}`);
    }
    
    if (filters?.isActive !== undefined) {
      conditions.push(`is_active=eq.${filters.isActive}`);
    }
    
    if (filters?.minPrice !== undefined) {
      conditions.push(`price=gte.${filters.minPrice}`);
    }
    
    if (filters?.maxPrice !== undefined) {
      conditions.push(`price=lte.${filters.maxPrice}`);
    }
    
    return conditions.length > 0 ? conditions.join(',') : undefined;
  }, [filters]);

  // Hook de sincronização com joins completos
  const {
    data: products,
    loading,
    error,
    isConnected,
    refetch
  } = useRealtimeSync<Product>({
    table: 'products',
    filter,
    select: `
      *,
      categories:category_id (
        id,
        name,
        description
      ),
      product_sizes (
        id,
        product_id,
        size
      ),
      product_sizes (
        id,
        product_id,
        product_size_id,
        quantity,
        reserved_quantity
      )
    `,
    orderBy: 'created_at:desc',
    enableOptimistic: false, // Produtos não precisam de optimistic updates
    onUpdate: (updatedProduct) => {
      console.log('Produto atualizado:', updatedProduct.name);
    },
    onError: (error) => {
      console.error('Erro no produtos realtime:', error);
    }
  });

  // Filtrar produtos por busca textual (client-side)
  const filteredProducts = useMemo(() => {
    if (!filters?.search) return products;
    
    const searchTerm = filters.search.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm) ||
      product.categories?.name.toLowerCase().includes(searchTerm)
    );
  }, [products, filters?.search]);

  // Filtrar produtos em estoque (client-side)
  const finalProducts = useMemo(() => {
    if (!filters?.inStock) return filteredProducts;
    
    return filteredProducts.filter(product => {
      const totalStock = product.product_sizes?.reduce((sum, size) => {
        return sum + size.stock_quantity;
      }, 0) || 0;
      return totalStock > 0;
    });
  }, [filteredProducts, filters?.inStock]);

  // Buscar produto por ID
  const getProductById = useCallback((id: string): Product | undefined => {
    return finalProducts.find(product => product.id === id);
  }, [finalProducts]);

  // Obter estoque disponível de um produto
  const getProductStock = useCallback((productId: string, sizeId?: string): number => {
    const product = getProductById(productId);
    if (!product?.product_sizes) return 0;

    const stockItems = sizeId 
      ? product.product_sizes.filter(size => size.id === sizeId)
      : product.product_sizes;

    return stockItems.reduce((sum, size) => {
      return sum + size.stock_quantity;
    }, 0);
  }, [getProductById]);

  // Verificar se produto está disponível
  const isProductAvailable = useCallback((productId: string, sizeId: string, quantity: number = 1): boolean => {
    const product = getProductById(productId);
    if (!product || !product.is_active) return false;

    const availableStock = getProductStock(productId, sizeId);
    return availableStock >= quantity;
  }, [getProductById, getProductStock]);

  // Obter tamanhos disponíveis de um produto
  const getAvailableSizes = useCallback((productId: string): ProductStock[] => {
    const product = getProductById(productId);
    if (!product?.product_sizes) return [];

    // Filtrar apenas tamanhos com estoque disponível
    return product.product_sizes.filter(size => {
      return size.stock_quantity > 0;
    });
  }, [getProductById]);

  return {
    products: finalProducts,
    loading,
    error,
    isConnected,
    refetch,
    getProductById,
    getProductStock,
    isProductAvailable,
    getAvailableSizes
  };
}

/**
 * Hook específico para controle de estoque em tempo real
 * Usado para atualizações administrativas
 */
export function useRealtimeStock(productId?: string) {
  const filter = useMemo(() => {
    return productId ? `product_id=eq.${productId}` : undefined;
  }, [productId]);

  const {
    data: stockItems,
    loading,
    error,
    isConnected,
    refetch
  } = useRealtimeSync<ProductStock>({
    table: 'product_sizes',
    filter,
    select: `
      *,
      products:product_id (
        id,
        name
      )
    `,
    orderBy: 'updated_at:desc',
    enableOptimistic: true,
    onUpdate: (updatedStock) => {
      console.log('Estoque atualizado:', updatedStock);
    }
  });

  // Atualizar estoque
  const updateStock = useCallback(async (stockId: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from('product_sizes')
        .update({ 
          stock_quantity: quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', stockId);

      if (error) {
        throw new Error(`Erro ao atualizar estoque: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      throw error;
    }
  }, []);

  // Reservar estoque (para carrinho/pedidos) - reduz stock_quantity
  const reserveStock = useCallback(async (stockId: string, quantity: number) => {
    try {
      const stockItem = stockItems.find(item => item.id === stockId);
      if (!stockItem) {
        throw new Error('Item de estoque não encontrado');
      }

      if (stockItem.stock_quantity < quantity) {
        throw new Error('Estoque insuficiente para reserva');
      }

      const newQuantity = stockItem.stock_quantity - quantity;

      const { error } = await supabase
        .from('product_sizes')
        .update({ 
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', stockId);

      if (error) {
        throw new Error(`Erro ao reservar estoque: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao reservar estoque:', error);
      throw error;
    }
  }, [stockItems]);

  // Liberar estoque reservado - aumenta stock_quantity
  const releaseStock = useCallback(async (stockId: string, quantity: number) => {
    try {
      const stockItem = stockItems.find(item => item.id === stockId);
      if (!stockItem) {
        throw new Error('Item de estoque não encontrado');
      }

      const newQuantity = stockItem.stock_quantity + quantity;

      const { error } = await supabase
        .from('product_sizes')
        .update({ 
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', stockId);

      if (error) {
        throw new Error(`Erro ao liberar estoque: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao liberar estoque:', error);
      throw error;
    }
  }, [stockItems]);

  return {
    stockItems,
    loading,
    error,
    isConnected,
    refetch,
    updateStock,
    reserveStock,
    releaseStock
  };
}

/**
 * Hook para categorias em tempo real
 */
export function useRealtimeCategories() {
  const {
    data: categories,
    loading,
    error,
    isConnected,
    refetch
  } = useRealtimeSync<Category>({
    table: 'categories',
    orderBy: 'name:asc',
    enableOptimistic: false
  });

  return {
    categories,
    loading,
    error,
    isConnected,
    refetch
  };
}