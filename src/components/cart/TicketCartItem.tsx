
import React from 'react';
import { Trash2 } from 'lucide-react';
import { CartTicket, useCart } from '@/contexts/CartContext';

interface TicketCartItemProps {
  item: CartTicket;
}

const TicketCartItem: React.FC<TicketCartItemProps> = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart();
  
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      updateQuantity(item.id, newQuantity);
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  return (
    <div className="p-6 flex flex-wrap justify-between items-center">
      <div>
        <h3 className="font-medium text-lg">{item.name}</h3>
        <p className="text-gray-500">12 e 13 de Abril de 2025</p>
      </div>
      
      <div className="flex items-center gap-4 mt-4 md:mt-0">
        <div className="flex items-center">
          <label className="mr-2 text-sm">Qtd:</label>
          <div className="flex border border-gray-300 rounded-md">
            <button 
              onClick={() => handleQuantityChange(item.quantity - 1)} 
              className="px-2 py-1 border-r border-gray-300"
              aria-label="Diminuir quantidade"
              disabled={item.quantity <= 1}
            >
              -
            </button>
            <span className="px-4 py-1">{item.quantity}</span>
            <button 
              onClick={() => handleQuantityChange(item.quantity + 1)} 
              className="px-2 py-1 border-l border-gray-300"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
        </div>
        
        <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
        <button 
          onClick={() => removeFromCart(item.id)} 
          className="text-red-500 hover:text-red-700"
          aria-label="Remover ingresso"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default TicketCartItem;
