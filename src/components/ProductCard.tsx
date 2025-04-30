
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import ProductModal from './ProductModal';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';

export interface ProductProps {
  id: string;
  name: string;
  price: number;
  image: string;
  category: 'camiseta' | 'vestido';
  sizes: string[];
  inStock: boolean;
}

const ProductCardContent: React.FC<{ product: ProductProps }> = ({ product }) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || '');

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(product.price);

  const handleAddToCart = () => {
    if (!product.inStock) {
      toast({
        title: "Produto indisponível",
        description: "Este produto está esgotado no momento.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedSize) {
      toast({
        title: "Selecione um tamanho",
        description: "Por favor, selecione um tamanho antes de adicionar ao carrinho.",
        variant: "destructive"
      });
      return;
    }

    addToCart({
      id: '', // Will be set by CartContext
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      size: selectedSize,
      quantity: 1,
      productId: product.id
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:translate-y-[-5px] border border-gray-200">
      <ProductModal product={product} onSelectSize={setSelectedSize}>
        <div className="relative h-64 overflow-hidden cursor-pointer">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80';
              target.onerror = null;
            }}
          />
          {!product.inStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold">
                Esgotado
              </span>
            </div>
          )}
        </div>
      </ProductModal>
      
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
          onClick={handleAddToCart}
        >
          <ShoppingCart className="mr-2 h-4 w-4" /> 
          {product.inStock ? 'Adicionar ao Carrinho' : 'Indisponível'}
        </Button>
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: ProductProps }> = ({ product }) => {
  return (
    <CartProvider>
      <ProductCardContent product={product} />
    </CartProvider>
  );
};

export default ProductCard;
