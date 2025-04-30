
import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { EventTicket } from '@/hooks/useCart';
import { formatCurrency } from '@/utils/formatCurrency';

interface TicketCartItemProps {
  eventTicket: EventTicket;
  updateTicketQuantity: (quantity: number) => void;
  removeTicket: () => void;
}

const TicketCartItem: React.FC<TicketCartItemProps> = ({ 
  eventTicket, 
  updateTicketQuantity, 
  removeTicket 
}) => {
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0) {
      updateTicketQuantity(newQuantity);
    }
  };

  return (
    <div className="p-6 flex flex-wrap justify-between items-center border-b border-gray-100">
      <div>
        <h3 className="font-medium text-lg">{eventTicket.name}</h3>
        <p className="text-gray-500">12 e 13 de Abril de 2025</p>
      </div>
      
      <div className="flex items-center gap-4 mt-4 md:mt-0">
        <div className="flex items-center">
          <label className="mr-2 text-sm">Qtd:</label>
          <div className="flex border border-gray-300 rounded-md">
            <button 
              onClick={() => handleQuantityChange(eventTicket.quantity - 1)} 
              className="px-2 py-1 border-r border-gray-300 disabled:opacity-50"
              disabled={eventTicket.quantity <= 1}
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-4 py-1">{eventTicket.quantity}</span>
            <button 
              onClick={() => handleQuantityChange(eventTicket.quantity + 1)} 
              className="px-2 py-1 border-l border-gray-300"
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <span className="font-bold">{formatCurrency(eventTicket.price * eventTicket.quantity)}</span>
        <button 
          onClick={removeTicket} 
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
