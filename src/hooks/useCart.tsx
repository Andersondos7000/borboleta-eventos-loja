
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  size: string;
  quantity: number;
  category: 'camiseta' | 'vestido';
  order_item_id?: string;
}

export interface EventTicket {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [orderId, setOrderId] = useState<string | null>(null);

  const eventTicket = {
    id: 'ticket-1',
    name: 'Ingresso Conferência',
    price: 83,
    quantity: 1
  };
  
  const [hasTicket, setHasTicket] = useState(false);

  useEffect(() => {
    fetchCartItems();
  }, [user]);

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        const tempCartItems = JSON.parse(localStorage.getItem('tempCart') || '[]');
        setCartItems(tempCartItems);
        setLoading(false);
        return;
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'Pendente')
        .maybeSingle();

      if (orderError) throw orderError;

      if (!order) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      setOrderId(order.id);

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          size,
          price,
          products:product_id (
            id,
            name,
            image,
            category
          )
        `)
        .eq('order_id', order.id)
        .is('ticket_id', null);

      if (itemsError) throw itemsError;

      const { data: ticketItems, error: ticketsError } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          price,
          tickets:ticket_id (
            id,
            type,
            price
          )
        `)
        .eq('order_id', order.id)
        .not('ticket_id', 'is', null);

      if (ticketsError) throw ticketsError;

      const formattedItems = items?.map(item => {
        let imageUrl = item.products?.image || '';
        
        if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          imageUrl = `/placeholder.svg`;
        }
        
        return {
          id: item.products?.id || '',
          name: item.products?.name || '',
          image: imageUrl,
          price: item.price || 0,
          size: item.size || '',
          quantity: item.quantity || 1,
          category: (item.products?.category as 'camiseta' | 'vestido') || 'camiseta',
          order_item_id: item.id
        };
      }) || [];

      setCartItems(formattedItems);

      if (ticketItems && ticketItems.length > 0) {
        const ticketItem = ticketItems[0];
        eventTicket.quantity = ticketItem.quantity;
        eventTicket.price = ticketItem.price;
        setHasTicket(true);
      } else {
        setHasTicket(false);
      }

    } catch (error: any) {
      console.error('Error fetching cart:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar carrinho",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id: string, order_item_id?: string) => {
    try {
      if (!user) {
        const tempCartItems = JSON.parse(localStorage.getItem('tempCart') || '[]');
        const updatedItems = tempCartItems.filter((item: any) => item.productId !== id);
        localStorage.setItem('tempCart', JSON.stringify(updatedItems));
        setCartItems(updatedItems);
        return;
      }

      if (!order_item_id || !orderId) return;

      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', order_item_id);

      if (error) throw error;

      setCartItems(cartItems.filter(item => item.order_item_id !== order_item_id));

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('price, quantity')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const newTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ total: newTotal })
        .eq('id', orderId);

      if (updateOrderError) throw updateOrderError;

      toast({
        title: "Item removido",
        description: "Item removido do carrinho com sucesso"
      });
    } catch (error: any) {
      console.error('Error removing item:', error);
      toast({
        variant: "destructive",
        title: "Erro ao remover item",
        description: error.message
      });
    }
  };

  const updateQuantity = async (id: string, newQuantity: number, order_item_id?: string) => {
    if (newQuantity < 1) return;

    try {
      if (!user) {
        const tempCartItems = JSON.parse(localStorage.getItem('tempCart') || '[]');
        const updatedItems = tempCartItems.map((item: any) => 
          item.productId === id ? {...item, quantity: newQuantity} : item
        );
        localStorage.setItem('tempCart', JSON.stringify(updatedItems));
        setCartItems(updatedItems);
        return;
      }

      if (!order_item_id || !orderId) return;

      const { error } = await supabase
        .from('order_items')
        .update({ quantity: newQuantity })
        .eq('id', order_item_id);

      if (error) throw error;

      setCartItems(cartItems.map(item => 
        item.order_item_id === order_item_id ? {...item, quantity: newQuantity} : item
      ));

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('price, quantity')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const newTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ total: newTotal })
        .eq('id', orderId);

      if (updateOrderError) throw updateOrderError;
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar quantidade",
        description: error.message
      });
    }
  };

  const updateSize = async (id: string, newSize: string, order_item_id?: string) => {
    try {
      if (!user) {
        const tempCartItems = JSON.parse(localStorage.getItem('tempCart') || '[]');
        const updatedItems = tempCartItems.map((item: any) => 
          item.productId === id ? {...item, size: newSize} : item
        );
        localStorage.setItem('tempCart', JSON.stringify(updatedItems));
        setCartItems(updatedItems);
        return;
      }

      if (!order_item_id || !orderId) return;

      const { error } = await supabase
        .from('order_items')
        .update({ size: newSize })
        .eq('id', order_item_id);

      if (error) throw error;

      setCartItems(cartItems.map(item => 
        item.order_item_id === order_item_id ? {...item, size: newSize} : item
      ));

      toast({
        title: "Tamanho atualizado",
        description: "Tamanho atualizado com sucesso"
      });
    } catch (error: any) {
      console.error('Error updating size:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar tamanho",
        description: error.message
      });
    }
  };

  const removeTicket = async () => {
    try {
      if (!user || !orderId) {
        setHasTicket(false);
        return;
      }

      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)
        .not('ticket_id', 'is', null);

      if (error) throw error;

      setHasTicket(false);

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('price, quantity')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const newTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ total: newTotal })
        .eq('id', orderId);

      if (updateOrderError) throw updateOrderError;

      toast({
        title: "Ingresso removido",
        description: "Ingresso removido do carrinho com sucesso"
      });
    } catch (error: any) {
      console.error('Error removing ticket:', error);
      toast({
        variant: "destructive",
        title: "Erro ao remover ingresso",
        description: error.message
      });
    }
  };

  const updateTicketQuantity = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      eventTicket.quantity = newQuantity;

      if (!user || !orderId) {
        setHasTicket(true);
        return;
      }

      const { data: ticketItem, error: ticketError } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', orderId)
        .not('ticket_id', 'is', null)
        .maybeSingle();

      if (ticketError) throw ticketError;

      if (ticketItem) {
        const { error } = await supabase
          .from('order_items')
          .update({ quantity: newQuantity })
          .eq('id', ticketItem.id);

        if (error) throw error;
      } else {
        const { data: ticket, error: ticketDataError } = await supabase
          .from('tickets')
          .select('id')
          .eq('type', 'Individual')
          .single();

        if (ticketDataError) throw ticketDataError;

        const { error } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId,
            ticket_id: ticket.id,
            quantity: newQuantity,
            price: eventTicket.price,
          });

        if (error) throw error;
      }

      setHasTicket(true);

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('price, quantity')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const newTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ total: newTotal })
        .eq('id', orderId);

      if (updateOrderError) throw updateOrderError;
    } catch (error: any) {
      console.error('Error updating ticket quantity:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar ingresso",
        description: error.message
      });
    }
  };

  const calculateTotals = () => {
    const subtotalProducts = cartItems.reduce(
      (total, item) => total + item.price * item.quantity, 0
    );
    
    const subtotalTickets = hasTicket ? eventTicket.price * eventTicket.quantity : 0;
    const subtotal = subtotalProducts + subtotalTickets;
    
    const shipping = subtotal > 200 ? 0 : 18.90;
    const total = subtotal + shipping;
    
    return {
      subtotalProducts,
      subtotalTickets,
      subtotal,
      shipping,
      total
    };
  };

  return {
    cartItems,
    loading,
    hasTicket,
    eventTicket,
    removeItem,
    updateQuantity,
    updateSize,
    removeTicket,
    updateTicketQuantity,
    calculateTotals
  };
};
