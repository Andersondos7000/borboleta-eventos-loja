
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

// Define the cart item types
export type CartProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: 'camiseta' | 'vestido';
  size: string;
  quantity: number;
  productId: string;
};

export type CartTicket = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  ticketId: string;
};

export type CartItem = CartProduct | CartTicket;

// Helper function to check if item is a product
export const isCartProduct = (item: CartItem): item is CartProduct => {
  return 'category' in item && 'size' in item;
};

// Helper function to check if item is a ticket
export const isCartTicket = (item: CartItem): item is CartTicket => {
  return !('category' in item) && !('size' in item);
};

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addToCart: (item: CartItem) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  updateSize: (itemId: string, size: string) => Promise<void>;
  clearCart: () => Promise<void>;
  subtotal: number;
  shipping: number;
  total: number;
}

// Define the structure of the data returned from Supabase
interface CartItemFromSupabase {
  id: string;
  quantity: number;
  size: string | null;
  products?: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    category: string;
  };
  tickets?: {
    id: string;
    events?: {
      name: string;
      price: number;
    };
  };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Calculate subtotal, shipping, and total
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 200 ? 0 : 18.90;
  const total = subtotal + shipping;
  
  // Get user session and cart items
  useEffect(() => {
    const fetchCartItems = async () => {
      setIsLoading(true);
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          // User is logged in, fetch items from DB
          const { data, error } = await supabase
            .from('cart_items')
            .select(`
              id,
              quantity,
              size,
              products (
                id,
                name,
                price,
                image_url,
                category
              ),
              tickets (
                id,
                events (
                  name,
                  price
                )
              )
            `)
            .eq('user_id', sessionData.session.user.id);
            
          if (error) throw error;
          
          if (!data) {
            setItems([]);
            setIsLoading(false);
            return;
          }
          
          // Transform data into CartItems
          const cartItems: CartItem[] = [];
          
          // Type assertion after verifying the structure
          const typedData = data as unknown as CartItemFromSupabase[];
          
          for (const item of typedData) {
            // Check if this item has products data
            if (item.products) {
              const product = item.products;
              
              cartItems.push({
                id: item.id,
                name: product.name,
                price: product.price,
                image: product.image_url,
                category: product.category as 'camiseta' | 'vestido',
                size: item.size || '',
                quantity: item.quantity,
                productId: product.id
              } as CartProduct);
            } 
            // Check if this item has tickets data with events
            else if (item.tickets && item.tickets.events) {
              const ticket = item.tickets;
              const event = ticket.events;
              
              cartItems.push({
                id: item.id,
                name: event.name,
                price: event.price,
                quantity: item.quantity,
                ticketId: ticket.id
              } as CartTicket);
            }
          }
          
          setItems(cartItems);
        } else {
          // User is not logged in, use local storage for now
          const savedCart = localStorage.getItem('cart');
          if (savedCart) {
            setItems(JSON.parse(savedCart));
          }
        }
      } catch (error) {
        console.error('Error fetching cart:', error);
        toast({
          title: "Erro ao carregar carrinho",
          description: "Não foi possível carregar os itens do seu carrinho.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCartItems();
    
    // Listen for auth state changes
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchCartItems();
      } else if (event === 'SIGNED_OUT') {
        setItems([]);
        localStorage.removeItem('cart');
      }
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, [toast]);
  
  // Save cart to local storage when items change
  useEffect(() => {
    if (!isLoading) {
      console.log('[DEBUG] Salvando itens no localStorage:', items);
      localStorage.setItem('cart', JSON.stringify(items));
      console.log('[DEBUG] Itens salvos no localStorage');
    }
  }, [items, isLoading]);
  
  // Add item to cart
  const addToCart = async (item: CartItem) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        // User is logged in, save to DB
        const { error, data } = await supabase
          .from('cart_items')
          .insert({
            user_id: sessionData.session.user.id,
            product_id: isCartProduct(item) ? item.productId : null,
            ticket_id: isCartTicket(item) ? item.ticketId : null,
            quantity: item.quantity,
            size: isCartProduct(item) ? item.size : null,
            price: item.price
          })
          .select('id')
          .single();
          
        if (error) throw error;
        
        // Update local state with the DB-assigned ID
        setItems(prev => [...prev, { ...item, id: data.id }]);
      } else {
        // User is not logged in, use local storage
        setItems(prev => [...prev, { ...item, id: crypto.randomUUID() }]);
      }
      
      toast({
        title: "Adicionado ao carrinho",
        description: `${item.name} foi adicionado ao seu carrinho.`
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Erro ao adicionar ao carrinho",
        description: "Não foi possível adicionar o item ao carrinho.",
        variant: "destructive"
      });
    }
  };
  
  // Remove item from cart
  const removeFromCart = async (itemId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        // User is logged in, delete from DB
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);
          
        if (error) throw error;
      }
      
      // Update local state
      setItems(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: "Item removido",
        description: "O item foi removido do seu carrinho."
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Erro ao remover item",
        description: "Não foi possível remover o item do carrinho.",
        variant: "destructive"
      });
    }
  };
  
  // Update item quantity
  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        // User is logged in, update in DB
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('id', itemId);
          
        if (error) throw error;
      }
      
      // Update local state
      setItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, quantity } 
            : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Erro ao atualizar quantidade",
        description: "Não foi possível atualizar a quantidade do item.",
        variant: "destructive"
      });
    }
  };
  
  // Update item size (for products only)
  const updateSize = async (itemId: string, size: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        // User is logged in, update in DB
        const { error } = await supabase
          .from('cart_items')
          .update({ size })
          .eq('id', itemId);
          
        if (error) throw error;
      }
      
      // Update local state
      setItems(prev => 
        prev.map(item => 
          item.id === itemId && isCartProduct(item)
            ? { ...item, size } 
            : item
        )
      );
    } catch (error) {
      console.error('Error updating size:', error);
      toast({
        title: "Erro ao atualizar tamanho",
        description: "Não foi possível atualizar o tamanho do produto.",
        variant: "destructive"
      });
    }
  };
  
  // Clear the cart
  const clearCart = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        // User is logged in, delete all items from DB
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', sessionData.session.user.id);
          
        if (error) throw error;
      }
      
      // Update local state
      setItems([]);
      localStorage.removeItem('cart');
      
      toast({
        title: "Carrinho limpo",
        description: "Todos os itens foram removidos do seu carrinho."
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Erro ao limpar carrinho",
        description: "Não foi possível limpar o carrinho.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <CartContext.Provider value={{
      items,
      isLoading,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateSize,
      clearCart,
      subtotal,
      shipping,
      total
    }}>
      {children}
    </CartContext.Provider>
  );
};

// Hook for using the cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
