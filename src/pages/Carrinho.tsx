import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  size: string;
  quantity: number;
  category: 'camiseta' | 'vestido';
  order_item_id?: string;
}

const sizes = {
  camiseta: ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EXGG'],
  vestido: ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EXGG']
};

const Carrinho = () => {
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

  const subtotalProducts = cartItems.reduce(
    (total, item) => total + item.price * item.quantity, 0
  );
  
  const subtotalTickets = hasTicket ? eventTicket.price * eventTicket.quantity : 0;
  const subtotal = subtotalProducts + subtotalTickets;
  
  const shipping = subtotal > 200 ? 0 : 18.90;
  const total = subtotal + shipping;

  const formatCurrency = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl">Carregando seu carrinho...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <h1 className="font-display text-3xl font-bold mb-8">Seu Carrinho</h1>
          
          {cartItems.length === 0 && !hasTicket ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <h2 className="text-xl font-medium mb-4">Seu carrinho está vazio</h2>
              <p className="text-gray-600 mb-6">
                Parece que você ainda não adicionou nenhum item ao seu carrinho.
              </p>
              <div className="flex flex-col md:flex-row justify-center gap-4">
                <Button asChild className="bg-butterfly-orange hover:bg-butterfly-orange/90">
                  <Link to="/loja">Explorar Loja</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/evento">Ver Ingressos</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {cartItems.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-bold">Produtos</h2>
                    </div>
                    
                    {cartItems.map((item) => (
                      <div key={item.id} className="p-6 border-b border-gray-100">
                        <div className="flex items-center">
                          <div className="w-24 h-24 rounded-md overflow-hidden flex-shrink-0 mr-4 bg-gray-100">
                            <img 
                              src={item.image || '/placeholder.svg'} 
                              alt={item.name} 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = "/placeholder.svg";
                              }}
                            />
                          </div>
                          
                          <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="font-medium text-lg">{item.name}</h3>
                              
                              <div className="flex flex-wrap items-center gap-4 mt-2">
                                <Select
                                  value={item.size}
                                  onValueChange={(value) => updateSize(item.id, value, item.order_item_id)}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue placeholder="Tamanho" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sizes[item.category]?.map((size) => (
                                      <SelectItem key={size} value={size}>
                                        {size}
                                      </SelectItem>
                                    )) || []}
                                  </SelectContent>
                                </Select>
                                
                                <div className="flex items-center">
                                  <span className="mr-2 text-sm">Qtd:</span>
                                  <div className="flex border border-gray-300 rounded-md">
                                    <button 
                                      onClick={() => updateQuantity(item.id, item.quantity - 1, item.order_item_id)} 
                                      className="px-2 py-1 border-r border-gray-300"
                                    >
                                      -
                                    </button>
                                    <span className="px-4 py-1">{item.quantity}</span>
                                    <button 
                                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.order_item_id)} 
                                      className="px-2 py-1 border-l border-gray-300"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-4 md:mt-0">
                              <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                              <button onClick={() => removeItem(item.id, item.order_item_id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {hasTicket && (
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-bold">Ingressos</h2>
                    </div>
                    
                    <div className="p-6 flex flex-wrap justify-between items-center">
                      <div>
                        <h3 className="font-medium text-lg">{eventTicket.name}</h3>
                        <p className="text-gray-500">12 e 13 de Abril de 2025</p>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-4 md:mt-0">
                        <div className="flex items-center">
                          <label className="mr-2 text-sm">Qtd:</label>
                          <div className="flex border border-gray-300 rounded-md">
                            <button 
                              onClick={() => updateTicketQuantity(eventTicket.quantity - 1)} 
                              className="px-2 py-1 border-r border-gray-300"
                            >
                              -
                            </button>
                            <span className="px-4 py-1">{eventTicket.quantity}</span>
                            <button 
                              onClick={() => updateTicketQuantity(eventTicket.quantity + 1)} 
                              className="px-2 py-1 border-l border-gray-300"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        
                        <span className="font-bold">{formatCurrency(eventTicket.price * eventTicket.quantity)}</span>
                        <button onClick={removeTicket} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6 h-fit">
                <h2 className="text-xl font-bold mb-4 pb-4 border-b border-gray-200">
                  Resumo do Pedido
                </h2>
                
                <div className="space-y-3">
                  {subtotalProducts > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal Produtos</span>
                      <span>{formatCurrency(subtotalProducts)}</span>
                    </div>
                  )}
                  
                  {subtotalTickets > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal Ingressos</span>
                      <span>{formatCurrency(subtotalTickets)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frete</span>
                    <span>{shipping === 0 ? "Grátis" : formatCurrency(shipping)}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-butterfly-orange">{formatCurrency(total)}</span>
                    </div>
                    
                    {subtotal >= 200 && (
                      <div className="mt-2 text-green-600 text-sm">
                        Você ganhou frete grátis!
                      </div>
                    )}
                  </div>
                </div>
                
                <Button asChild className="w-full mt-6 bg-butterfly-orange hover:bg-butterfly-orange/90">
                  <Link to="/checkout">
                    Finalizar Compra
                  </Link>
                </Button>
                
                <div className="mt-6 text-center">
                  <Link 
                    to="/loja" 
                    className="text-butterfly-orange hover:underline text-sm"
                  >
                    Continuar Comprando
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Carrinho;
