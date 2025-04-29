
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatCurrency';

interface OrderSummaryProps {
  subtotalProducts: number;
  subtotalTickets: number;
  shipping: number;
  total: number;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  subtotalProducts,
  subtotalTickets,
  shipping,
  total
}) => {
  return (
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
          
          {(subtotalProducts + subtotalTickets) >= 200 && (
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
  );
};

export default OrderSummary;
