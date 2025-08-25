import { useCallback, useMemo } from 'react';
import { useRealtimeSync } from './useRealtimeSync';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Tipos para o carrinho
interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  product_size_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Dados relacionados (joins)
  products?: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
  };
  product_sizes?: {
    id: string;
    size: string;
  };
}

interface CartSummary {
  totalItems: number;
  totalValue: number;
  items: CartItem[];
}

interface UseRealtimeCartReturn {
  cartItems: CartItem[];
  cartSummary: CartSummary;
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
  addToCart: (productId: string, sizeId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refetch: () => void;
}

/**
 * Hook para sincronização em tempo real do carrinho de compras
 * Implementa optimistic updates e resolução de conflitos
 */
export function useRealtimeCart(): UseRealtimeCartReturn {
  const { user } = useAuth();
  
  // Configurar filtro para o usuário atual
  const filter = useMemo(() => {
    return user ? `user_id=eq.${user.id}` : null;
  }, [user?.id]);

  // Hook de sincronização com joins para dados relacionados
  const {
    data: cartItems,
    loading,
    error,
    isConnected,
    refetch
  } = useRealtimeSync<CartItem>({
    table: 'cart_items',
    filter: filter || undefined,
    select: `
      *,
      products:product_id (
        id,
        name,
        price,
        image_url
      ),
      product_sizes:product_size_id (
        id,
        size
      )
    `,
    orderBy: 'created_at:desc',
    enableOptimistic: true,
    onUpdate: (updatedItem) => {
      console.log('Carrinho atualizado:', updatedItem);
    },
    onError: (error) => {
      console.error('Erro no carrinho realtime:', error);
    }
  });

  // Calcular resumo do carrinho
  const cartSummary = useMemo((): CartSummary => {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = cartItems.reduce((sum, item) => {
      const price = item.products?.price || 0;
      return sum + (price * item.quantity);
    }, 0);

    return {
      totalItems,
      totalValue,
      items: cartItems
    };
  }, [cartItems]);

  // Adicionar item ao carrinho com optimistic update
  const addToCart = useCallback(async (productId: string, sizeId: string, quantity: number = 1) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const optimisticId = `temp_${Date.now()}_${Math.random()}`;
    const now = new Date().toISOString();
    
    try {
      // Verificar se item já existe no carrinho
      const existingItem = cartItems.find(
        item => item.product_id === productId && item.product_size_id === sizeId
      );

      if (existingItem) {
        // Atualizar quantidade do item existente
        await updateQuantity(existingItem.id, existingItem.quantity + quantity);
      } else {
        // Buscar dados do produto para otimização
        let productData = null;
        try {
          const { data: product } = await supabase
            .from('products')
            .select('id, name, price, image_url')
            .eq('id', productId)
            .single();
          productData = product;
        } catch (err) {
          console.warn('Erro ao buscar detalhes do produto:', err);
        }

        // Criar item otimista
        const optimisticItem: CartItem = {
          id: optimisticId,
          user_id: user.id,
          product_id: productId,
          product_size_id: sizeId,
          quantity,
          created_at: now,
          updated_at: now,
          ...(productData && { products: productData })
        };

        // Aplicar atualização otimista
        optimisticUpdate(optimisticItem, 'insert');

        // Inserir no servidor
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            product_size_id: sizeId,
            quantity
          });

        if (error) {
          // Rollback em caso de erro
          rollbackOptimistic(optimisticId);
          throw new Error(`Erro ao adicionar ao carrinho: ${error.message}`);
        }

        // Timeout para rollback automático se não houver confirmação
        setTimeout(() => {
          rollbackOptimistic(optimisticId);
        }, 5000);
      }
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      throw error;
    }
  }, [user, cartItems, updateQuantity, optimisticUpdate, rollbackOptimistic]);

  // Atualizar quantidade com validação e atualizações otimistas
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    if (quantity < 0) {
      throw new Error('Quantidade não pode ser negativa');
    }

    if (quantity === 0) {
      // Se quantidade é 0, remover item
      await removeFromCart(itemId);
      return;
    }

    // Encontrar item atual para atualização otimista
    const currentItem = cartItems.find(item => item.id === itemId);
    if (!currentItem) {
      throw new Error('Item não encontrado no carrinho');
    }

    // Criar versão otimista do item
    const optimisticItem: CartItem = {
      ...currentItem,
      quantity,
      updated_at: new Date().toISOString()
    };

    try {
      // Aplicar atualização otimista
      optimisticUpdate(optimisticItem, 'update');

      const { error } = await supabase
        .from('cart_items')
        .update({ 
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('user_id', user.id); // Segurança adicional

      if (error) {
        // Rollback em caso de erro
        rollbackOptimistic(itemId);
        throw new Error(`Erro ao atualizar quantidade: ${error.message}`);
      }

      // Timeout para rollback automático se não houver confirmação
      setTimeout(() => {
        rollbackOptimistic(itemId);
      }, 5000);
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      throw error;
    }
  }, [user, cartItems, removeFromCart, optimisticUpdate, rollbackOptimistic]);

  // Remover item do carrinho
  const removeFromCart = useCallback(async (itemId: string) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Encontrar item para backup antes da remoção
    const itemToRemove = cartItems.find(item => item.id === itemId);
    if (!itemToRemove) {
      throw new Error('Item não encontrado no carrinho');
    }

    try {
      // Aplicar remoção otimista
      optimisticUpdate(itemToRemove, 'delete');

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) {
        // Rollback: restaurar item removido
        optimisticUpdate(itemToRemove, 'insert');
        throw new Error(`Erro ao remover item: ${error.message}`);
      }

      // Timeout para rollback automático se não houver confirmação
      setTimeout(() => {
        rollbackOptimistic(itemId);
      }, 5000);
    } catch (error) {
      console.error('Erro ao remover item do carrinho:', error);
      throw error;
    }
  }, [user, cartItems, optimisticUpdate, rollbackOptimistic]);

  // Limpar carrinho completamente
  const clearCart = useCallback(async () => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Backup dos itens atuais para rollback
    const itemsBackup = [...cartItems];
    
    try {
      // Aplicar limpeza otimista
      itemsBackup.forEach(item => {
        optimisticUpdate(item, 'delete');
      });

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        // Rollback: restaurar todos os itens
        itemsBackup.forEach(item => {
          optimisticUpdate(item, 'insert');
        });
        throw new Error(`Erro ao limpar carrinho: ${error.message}`);
      }

      // Timeout para rollback automático se não houver confirmação
      setTimeout(() => {
        itemsBackup.forEach(item => {
          rollbackOptimistic(item.id);
        });
      }, 5000);
    } catch (error) {
      console.error('Erro ao limpar carrinho:', error);
      throw error;
    }
  }, [user, cartItems, optimisticUpdate, rollbackOptimistic]);

  return {
    cartItems,
    cartSummary,
    loading,
    error,
    isConnected,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refetch
  };
}

// Hook para sincronização entre múltiplas abas/dispositivos
export function useCartSync() {
  const { cartItems, isConnected } = useRealtimeCart();
  
  // Sincronizar com localStorage para persistência offline
  const syncWithLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cart_backup', JSON.stringify(cartItems));
      } catch (error) {
        console.warn('Erro ao sincronizar carrinho com localStorage:', error);
      }
    }
  }, [cartItems]);

  // Recuperar do localStorage quando offline
  const restoreFromLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined' && !isConnected) {
      try {
        const backup = localStorage.getItem('cart_backup');
        return backup ? JSON.parse(backup) : [];
      } catch (error) {
        console.warn('Erro ao recuperar carrinho do localStorage:', error);
        return [];
      }
    }
    return cartItems;
  }, [cartItems, isConnected]);

  return {
    syncWithLocalStorage,
    restoreFromLocalStorage,
    isOnline: isConnected
  };
}