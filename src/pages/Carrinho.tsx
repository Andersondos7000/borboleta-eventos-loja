import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  size: string;
  quantity: number;
}

const Carrinho = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 'tshirt-1',
      name: 'Camiseta Logo Conferência',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80',
      price: 60,
      size: 'M',
      quantity: 1
    },
    {
      id: 'dress-1',
      name: 'Vestido Elegance',
      image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80',
      price: 140,
      size: '6',
      quantity: 1
    }
  ]);

  const eventTicket = {
    id: 'ticket-1',
    name: 'Ingresso Conferência',
    price: 83,
    quantity: 1
  };
  
  const [hasTicket, setHasTicket] = useState(true);

  const navigate = useNavigate();

  const removeItem = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(cartItems.map(item => 
      item.id === id ? {...item, quantity: newQuantity} : item
    ));
  };

  const removeTicket = () => {
    setHasTicket(false);
  };

  const updateTicketQuantity = (newQuantity: number) => {
    if (newQuantity < 1) return;
    eventTicket.quantity = newQuantity;
    setHasTicket(true);
  };

  // Cálculos do carrinho
  const subtotalProducts = cartItems.reduce(
    (total, item) => total + item.price * item.quantity, 0
  );
  
  const subtotalTickets = hasTicket ? eventTicket.price * eventTicket.quantity : 0;
  const subtotal = subtotalProducts + subtotalTickets;
  
  const shipping = subtotal > 200 ? 0 : 18.90;
  const total = subtotal + shipping;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleCheckout = () => {
    navigate('/checkout', { state: { cartItems, hasTicket, eventTicket, total } });
  };

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
                {/* Produtos */}
                {cartItems.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-bold">Produtos</h2>
                    </div>
                    
                    {cartItems.map((item) => (
                      <div key={item.id} className="p-6 border-b border-gray-100 flex flex-wrap md:flex-nowrap gap-4">
                        <div className="w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{item.name}</h3>
                          <p className="text-gray-500 mb-2">Tamanho: {item.size}</p>
                          <div className="flex flex-wrap justify-between items-center mt-2">
                            <div className="flex items-center">
                              <label className="mr-2 text-sm">Qtd:</label>
                              <div className="flex border border-gray-300 rounded-md">
                                <button 
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                                  className="px-2 py-1 border-r border-gray-300"
                                >
                                  -
                                </button>
                                <span className="px-4 py-1">{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                                  className="px-2 py-1 border-l border-gray-300"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                              <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Ingressos */}
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
              
              {/* Resumo */}
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
                
                <Button 
                  className="w-full mt-6 bg-butterfly-orange hover:bg-butterfly-orange/90"
                  onClick={handleCheckout}
                >
                  Finalizar Compra
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
