
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/hooks/useCart';
import ProductCartItem from '@/components/cart/ProductCartItem';
import TicketCartItem from '@/components/cart/TicketCartItem';
import OrderSummary from '@/components/cart/OrderSummary';
import EmptyCart from '@/components/cart/EmptyCart';

// Size options for different product categories
const sizes = {
  camiseta: ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EXGG'],
  vestido: ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EXGG']
};

const Carrinho = () => {
  const {
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
  } = useCart();

  const { subtotalProducts, subtotalTickets, subtotal, shipping, total } = calculateTotals();

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
            <EmptyCart />
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {cartItems.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-bold">Produtos</h2>
                    </div>
                    
                    {cartItems.map((item) => (
                      <ProductCartItem 
                        key={`${item.id}-${item.order_item_id || ''}-${item.size}`}
                        item={item}
                        updateQuantity={updateQuantity}
                        updateSize={updateSize}
                        removeItem={removeItem}
                        sizes={sizes}
                      />
                    ))}
                  </div>
                )}
                
                {hasTicket && (
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-bold">Ingressos</h2>
                    </div>
                    
                    <TicketCartItem 
                      eventTicket={eventTicket}
                      updateTicketQuantity={updateTicketQuantity}
                      removeTicket={removeTicket}
                    />
                  </div>
                )}
              </div>
              
              <OrderSummary 
                subtotalProducts={subtotalProducts}
                subtotalTickets={subtotalTickets}
                shipping={shipping}
                total={total}
              />
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Carrinho;
