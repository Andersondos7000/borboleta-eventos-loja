
import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

export interface ProductProps {
  id: string;
  name: string;
  price: number;
  image: string;
  category: 'camiseta' | 'vestido';
  sizes: string[];
  inStock: boolean;
}

const ProductCard: React.FC<{ product: ProductProps }> = ({ product }) => {
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(product.price);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:translate-y-[-5px] border border-gray-200">
      <div className="relative h-64 overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
        />
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold">
              Esgotado
            </span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-lg">{product.name}</h3>
        <div className="flex justify-between items-center mt-2">
          <span className="text-butterfly-orange font-bold text-xl">{formattedPrice}</span>
          
          <div className="text-sm text-gray-500">
            {product.sizes.slice(0, 3).join(', ')}
            {product.sizes.length > 3 && '...'}
          </div>
        </div>
        
        <Button 
          variant="default" 
          size="sm" 
          className="w-full mt-4 flex items-center justify-center"
          disabled={!product.inStock}
        >
          <ShoppingCart className="mr-2 h-4 w-4" /> 
          {product.inStock ? 'Adicionar ao Carrinho' : 'Indisponível'}
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
