
import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { CartItem } from '@/hooks/useCart';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductCartItemProps {
  item: CartItem;
  updateQuantity: (id: string, quantity: number, order_item_id?: string) => void;
  updateSize: (id: string, size: string, order_item_id?: string) => void;
  removeItem: (id: string, order_item_id?: string) => void;
  sizes: {
    camiseta: string[];
    vestido: string[];
  };
}

const ProductCartItem: React.FC<ProductCartItemProps> = ({ 
  item, 
  updateQuantity, 
  updateSize, 
  removeItem,
  sizes
}) => {
  // Function to prevent negative quantities
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0) {
      updateQuantity(item.id, newQuantity, item.order_item_id);
    }
  };

  return (
    <div className="p-6 border-b border-gray-100">
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
                    onClick={() => handleQuantityChange(item.quantity - 1)} 
                    className="px-2 py-1 border-r border-gray-300 disabled:opacity-50"
                    disabled={item.quantity <= 1}
                    aria-label="Diminuir quantidade"
                    type="button"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-1">{item.quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange(item.quantity + 1)} 
                    className="px-2 py-1 border-l border-gray-300"
                    aria-label="Aumentar quantidade"
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
            <button 
              onClick={() => removeItem(item.id, item.order_item_id)} 
              className="text-red-500 hover:text-red-700"
              aria-label="Remover item"
              type="button"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCartItem;
