
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { CartItem, CartProduct, CartTicket, isCartProduct, isCartTicket } from '@/lib/cart-utils';
import { CartContext, CartContextType } from './cart-context';


// Define the structure of the data returned from Supabase
interface CartItemFromSupabase {
  id: string;
  user_id: string;
  product_id?: string;
  ticket_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  size?: string;
  created_at: string;
  products?: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    category?: string;
  };
  tickets?: {
    id: string;
    event_id: string;
    ticket_type: string;
    unit_price: number;
    status: string;
    events?: {
      id: string;
      title: string;
      cover_image?: string;
    };
  };
}



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
  // Frete removido - sempre gratuito
  const shipping = 0;
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
                image_url,
                category
              ),
              tickets (
                id,
                ticket_type,
                price,
                unit_price,
                status,
                events (
                  id,
                  name
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
              const imageUrl = product.image_url || '/placeholder-image.jpg';
              
              const cartProduct: CartProduct = {
                id: item.id,
                product_id: item.product_id!,
                name: product.name,
                price: Number(product.price) || 0,
                image: imageUrl,
                images: product.image_url ? [product.image_url] : [],
                category: product.category,
                quantity: item.quantity || 1,
                unit_price: Number(item.unit_price) || 0,
                total_price: Number(item.total_price) || (Number(item.unit_price) * item.quantity),
                metadata: {},
              };
              
              cartItems.push(cartProduct);
            } 
            // Check if this item has tickets data
            else if (item.tickets) {
              const ticket = item.tickets;
              const event = ticket.events;
              
              const cartTicket: CartTicket = {
                id: item.id,
                ticket_id: item.ticket_id!,
                name: event?.title || ticket.ticket_type || 'Ingresso',
                price: Number(ticket.price) || Number(ticket.unit_price) || 0,
                quantity: item.quantity || 1,
                unit_price: Number(item.unit_price) || 0,
                total_price: Number(item.total_price) || (Number(item.unit_price) * item.quantity),
                ticket_type: ticket.ticket_type || 'standard',
                status: ticket.status || 'active',
                image: '/ingressos.webp',
                event_title: event?.title || 'Evento',
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
        // Only show error if it's not an auth-related issue
        const isAuthError = error && typeof error === 'object' && 'message' in error && 
          (error.message?.includes('Invalid Refresh Token') || error.message?.includes('JWT'));
        
        if (!isAuthError) {
          console.error('Error fetching cart:', error);
          toast({
            title: "Erro ao carregar carrinho",
            description: "Não foi possível carregar os itens do seu carrinho.",
            variant: "destructive"
          });
        } else {
          console.log('Auth token expired, user will be signed out automatically');
        }
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
          unit_price: isCartProduct(item) ? item.unit_price : (isCartTicket(item) ? item.price : 0)
        };
        
        console.log('Sending to Edge Function:', requestBody);
        console.log('Item details:', item);
        
        const { data, error } = await supabase.functions.invoke('add-to-cart', {
          body: requestBody
        });
        
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        
        // Update local state with the DB-assigned ID
        const newItem = { ...item, id: data.data.id };
        console.log('✅ Item added to cart (logged user):', newItem);
        setItems(prev => [...prev, newItem]);
      } else {
        // User is not logged in, use local storage
        const tempId = crypto.randomUUID();
        const newItem = { ...item, id: tempId };
        console.log('✅ Item added to cart (guest user):', newItem);
        setItems(prev => [...prev, newItem]);
      }
      
      const itemName = isCartProduct(item) ? item.name : item.name;
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
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    console.log('🔄 updateQuantity chamada:', { itemId, newQuantity });
    
    if (newQuantity <= 0) {
      console.log('⚠️ Quantidade <= 0, removendo item');
      await removeFromCart(itemId);
      return;
    }

    try {
      // Find the current item to get the correct unit price
       const currentItem = items.find(item => item.id === itemId);
       if (!currentItem) {
         console.error('❌ Item não encontrado:', itemId);
         return;
       }
       
       const unitPrice = currentItem.unit_price || currentItem.price || 0;
       const newTotalPrice = newQuantity * unitPrice;
       
       console.log('💰 Calculando preço:', { unitPrice, newQuantity, newTotalPrice });
       
       const { error } = await supabase
         .from('cart_items')
         .update({ 
           quantity: newQuantity,
           total_price: newTotalPrice
         })
         .eq('id', itemId);

      if (error) {
        console.error('❌ Error updating quantity:', error);
        toast({
          title: "Erro ao atualizar quantidade",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Quantidade atualizada no banco de dados');

      // Update local state immediately for better UX
       setItems(prevItems => {
         const updatedItems = prevItems.map(item => {
           if (item.id === itemId) {
             const itemUnitPrice = item.unit_price || item.price || 0;
             const updatedItem = { 
               ...item, 
               quantity: newQuantity, 
               total_price: itemUnitPrice * newQuantity 
             };
             console.log('📊 Item atualizado:', updatedItem);
             return updatedItem;
           }
           return item;
         });
         console.log('📋 Estado atualizado:', updatedItems);
         console.log('💵 Novo subtotal calculado:', updatedItems.reduce((sum, item) => sum + item.total_price, 0));
         return updatedItems;
       });

      toast({
        title: "Quantidade atualizada",
        description: "Item atualizado com sucesso."
      });
    } catch (error) {
      console.error('❌ Error updating quantity:', error);
      toast({
        title: "Erro ao atualizar quantidade",
        description: "Tente novamente em alguns instantes.",
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

// Re-export CartContext for other components
export { CartContext };
