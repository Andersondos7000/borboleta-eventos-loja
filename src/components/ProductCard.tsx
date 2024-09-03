
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import ProductModal from './ProductModal';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';

export interface ProductProps {
  id: string;
  name: string;
  price: number;
  image: string;
  category: 'camiseta' | 'vestido' | 'acessorio';
  sizes: string[];
  inStock: boolean;
}

const ProductCardContent: React.FC<{ product: ProductProps }> = ({ product }) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || '');
  const [isHovered, setIsHovered] = useState(false);

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
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      images: [product.image],
      category: product.category,
      quantity: 1,
      unit_price: product.price,
      total_price: product.price,
      metadata: { size: selectedSize }
    });

    toast({
      title: "Produto adicionado!",
      description: `${product.name} foi adicionado ao carrinho.`,
      variant: "default"
    });
  };

  const handleSelectSize = (size: string) => {
    setSelectedSize(size);
  };

  return (
    <div 
      data-testid="product-card"
      className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 border border-gray-100 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ProductModal product={product} onSelectSize={handleSelectSize}>
        <div className="relative aspect-square overflow-hidden cursor-pointer bg-gray-50">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
              target.onerror = null;
            }}
          />
          {!product.inStock && (
            <div className="absolute inset-0 bg-orange-500 bg-opacity-60 flex items-center justify-center">
              <span className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wide">
                Esgotado
              </span>
            </div>
          )}
          
          {/* Overlay com informações adicionais */}
          <div className={`absolute inset-0 bg-orange-500 bg-opacity-0 transition-all duration-300 flex items-end p-4 ${
            isHovered ? 'bg-opacity-20' : ''
          }`}>
            <div className={`transform transition-all duration-300 ${
              isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              <div className="flex gap-1">
                {product.sizes.slice(0, 4).map((size) => (
                  <span 
                    key={size} 
                    className="bg-white bg-opacity-90 text-gray-800 px-2 py-1 rounded text-xs font-medium"
                  >
                    {size}
                  </span>
                ))}
                {product.sizes.length > 4 && (
                  <span className="bg-white bg-opacity-90 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                    +{product.sizes.length - 4}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </ProductModal>
      
      <div className="p-5">
        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2 leading-tight">{product.name}</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span data-testid="product-price" className="text-2xl font-bold text-gray-900">{formattedPrice}</span>
            <span className="text-sm text-gray-500 capitalize">{product.category}</span>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Tamanhos</div>
            <div className="text-sm text-gray-600 font-medium">
              {product.sizes.slice(0, 3).join(' • ')}
              {product.sizes.length > 3 && ' • +'}
            </div>
          </div>
        </div>
        
        <Button 
          variant={product.inStock ? "default" : "secondary"}
          size="lg" 
          className={`w-full flex items-center justify-center font-semibold transition-all duration-200 ${
            product.inStock 
              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          disabled={!product.inStock}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="mr-2 h-5 w-5" /> 
          {product.inStock ? 'Adicionar ao Carrinho' : 'Produto Esgotado'}
        </Button>
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: ProductProps }> = ({ product }) => {
  return <ProductCardContent product={product} />;
};

export default ProductCard;
