
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

// Define the cart item types
export type CartProduct = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image: string;
  images: string[];
  category: string;
  size?: string; // Optional size property
  quantity: number;
  unit_price: number;
  total_price: number;
  metadata: Record<string, any>;
};

export type CartTicket = {
  id: string;
  ticket_id: string;
  event_id: string;
  event_name: string;
  event_title: string;
  event_date: string;
  ticket_price: number;
  price: number; // Alias for ticket_price for consistency with CartProduct
  name: string; // Alias for event_name for consistency with CartProduct
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type CartItem = CartProduct | CartTicket;

// Helper function to check if item is a product
export const isCartProduct = (item: CartItem): item is CartProduct => {
  return 'product_id' in item && 'category' in item;
};

// Helper function to check if item is a ticket
export const isCartTicket = (item: CartItem): item is CartTicket => {
  return 'ticket_id' in item && 'event_id' in item;
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
  user_id: string;
  product_id?: string;
  ticket_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  metadata?: Record<string, any>;
  products?: {
    id: string;
    name: string;
    price: number;
    images?: string[];
    category: string;
  };
  tickets?: {
    id: string;
    event_id: string;
    events?: {
      id: string;
      title: string;
      name: string;
      start_date: string;
      ticket_price: number;
    };
  };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Calculate subtotal, shipping, and total
  const subtotal = items.reduce((sum, item) => {
    if (isCartProduct(item)) {
      return sum + item.total_price;
    } else if (isCartTicket(item)) {
      return sum + item.total_price;
    }
    return sum;
  }, 0);
  const shipping = subtotal > 200 ? 0 : 18.90;
  const total = subtotal + shipping;
  
  // Get user session and cart items
  useEffect(() => {
    const fetchCartItems = async () => {
      setIsLoading(true);
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          // User is logged in, fetch items from DB with proper joins
          const { data, error } = await supabase
            .from('cart_items')
            .select(`
              *,
              products (
                id,
                name,
                price,
                images,
                category
              ),
              tickets (
                id,
                event_id,
                events (
                  id,
                  title,
                  start_date,
                  ticket_price
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
              const imageUrl = Array.isArray(product.images) && product.images.length > 0 
                ? product.images[0] 
                : '/placeholder-image.jpg';
              
              const cartProduct: CartProduct = {
                id: item.id,
                product_id: item.product_id!,
                name: product.name,
                price: Number(product.price),
                image: imageUrl,
                images: product.images || [],
                category: product.category,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                metadata: item.metadata || {},
              };
              
              cartItems.push(cartProduct);
            } 
            // Check if this item has tickets data with events
            else if (item.tickets && item.tickets.events) {
              const ticket = item.tickets;
              const event = ticket.events;
              
              const cartTicket: CartTicket = {
                id: item.id,
                ticket_id: item.ticket_id!,
                event_id: ticket.event_id,
                event_name: event.name,
                event_title: event.title,
                event_date: event.start_date,
                ticket_price: event.ticket_price,
                price: event.ticket_price, // Same as ticket_price for consistency
                name: event.title, // Alias for event_title for consistency
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
              };
              
              cartItems.push(cartTicket);
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
        // User is logged in, use Edge Function
        const requestBody = {
          product_id: isCartProduct(item) ? item.product_id : null,
          ticket_id: isCartTicket(item) ? item.ticket_id : null,
          quantity: item.quantity,
          metadata: isCartProduct(item) ? item.metadata : null,
          unit_price: isCartProduct(item) ? item.unit_price : (isCartTicket(item) ? item.ticket_price : item.price)
        };
        
        console.log('Sending to Edge Function:', requestBody);
        console.log('Item details:', item);
        
        const { data, error } = await supabase.functions.invoke('add-to-cart', {
          body: requestBody
        });
        
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        
        // Update local state with the DB-assigned ID
        setItems(prev => [...prev, { ...item, id: data.data.id }]);
      } else {
        // User is not logged in, use local storage
        setItems(prev => [...prev, { ...item, id: crypto.randomUUID() }]);
      }
      
      const itemName = isCartProduct(item) ? item.name : item.event_title;
      toast({
        title: "Adicionado ao carrinho",
        description: `${itemName} foi adicionado ao seu carrinho.`
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
        const item = items.find(i => i.id === itemId);
        if (item && isCartProduct(item)) {
          const updatedMetadata = { ...item.metadata, size };
          const { error } = await supabase
            .from('cart_items')
            .update({ metadata: updatedMetadata })
            .eq('id', itemId);
            
          if (error) throw error;
        }
      }
      
      // Update local state
      setItems(prev => 
        prev.map(item => 
          item.id === itemId && isCartProduct(item)
            ? { ...item, metadata: { ...item.metadata, size } } 
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
