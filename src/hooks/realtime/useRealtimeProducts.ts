import { useCallback, useMemo } from 'react';
import { useRealtimeSync } from './useRealtimeSync';
import { supabase } from '../../lib/supabase';

// Tipos para produtos
type ProductSize = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG';

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
  in_stock: boolean;
  sizes: ProductSize[]; // array de tamanhos disponíveis
  created_at: string;
  updated_at: string;

  // Dados relacionados (joins)
  categories?: Category;
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
  getProductStock: (productId: string) => boolean;
  isProductAvailable: (productId: string, size: ProductSize) => boolean;
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
      return product.in_stock;
    });
  }, [filteredProducts, filters?.inStock]);

  // Buscar produto por ID
  const getProductById = useCallback((id: string): Product | undefined => {
    return finalProducts.find(product => product.id === id);
  }, [finalProducts]);

  // Verificar se produto tem estoque
  const getProductStock = useCallback((productId: string): boolean => {
    const product = getProductById(productId);
    return product?.in_stock || false;
  }, [getProductById]);

  // Verificar se produto está disponível em um tamanho específico
  const isProductAvailable = useCallback((productId: string, size: ProductSize): boolean => {
    const product = getProductById(productId);
    if (!product || !product.is_active || !product.in_stock) return false;

    return product.sizes.includes(size);
  }, [getProductById]);

  // Obter tamanhos disponíveis de um produto
  const getAvailableSizes = useCallback((productId: string): ProductSize[] => {
    const product = getProductById(productId);
    if (!product?.sizes || !product.in_stock) return [];

    return product.sizes;
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
  // DEPRECATED: product_sizes table removed - using products.sizes array instead
  } = useRealtimeSync<ProductStock>({
    table: 'products', // Changed from product_sizes to products
    filter: productId ? `id.eq.${productId}` : undefined,
    select: `
      id,
      name,
      sizes,
      in_stock
    `,
    orderBy: 'updated_at:desc',
    enableOptimistic: true,
    onUpdate: (updatedProduct) => {
      console.log('Produto atualizado:', updatedProduct);
    }
  });

  // DEPRECATED: product_sizes table removed - simplified stock update
  const updateStock = useCallback(async (productId: string, inStock: boolean) => {
    try {
      const { error } = await supabase
        .from('products') // Changed from product_sizes to products
        .update({ 
          in_stock: inStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) {
        throw new Error(`Erro ao atualizar estoque: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      throw error;
    }
  }, []);

  // DEPRECATED: product_sizes table removed - simplified stock reservation
  const reserveStock = useCallback(async (productId: string, quantity: number) => {
    try {
      console.warn('DEPRECATED: reserveStock - funcionalidade limitada sem tabela product_sizes');
      
      // Simplified: just mark as out of stock if needed
      const { error } = await supabase
        .from('products') // Changed from product_sizes to products
        .update({ 
          in_stock: false, // Simplified logic
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) {
        throw new Error(`Erro ao reservar estoque: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao reservar estoque:', error);
      throw error;
    }
  }, [stockItems]);

  // DEPRECATED: product_sizes table removed - simplified stock release
  const releaseStock = useCallback(async (productId: string, quantity: number) => {
    try {
      console.warn('DEPRECATED: releaseStock - funcionalidade limitada sem tabela product_sizes');
      
      // Simplified: just mark as in stock
      const { error } = await supabase
        .from('products') // Changed from product_sizes to products
        .update({ 
          in_stock: true, // Simplified logic
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

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