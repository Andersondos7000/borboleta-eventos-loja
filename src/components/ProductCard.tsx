
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductModal from './ProductModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState<string>("");
  
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(product.price);

  const handleAddToCart = () => {
    if (!selectedSize) return;
    
    navigate('/carrinho', { 
      state: { 
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        productImage: product.image,
        productCategory: product.category,
        productSize: selectedSize,
      } 
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:translate-y-[-5px] border border-gray-200">
      <ProductModal product={product}>
        <div className="relative h-64 overflow-hidden cursor-pointer">
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
      </ProductModal>
      
      <div className="p-4">
        <h3 className="font-medium text-lg">{product.name}</h3>
        <div className="flex flex-col gap-3 mt-2">
          <span className="text-butterfly-orange font-bold text-xl">{formattedPrice}</span>
          
          <Select value={selectedSize} onValueChange={setSelectedSize}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o tamanho" />
            </SelectTrigger>
            <SelectContent>
              {product.sizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="default" 
          size="sm" 
          className="w-full mt-4 flex items-center justify-center"
          disabled={!product.inStock || !selectedSize}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="mr-2 h-4 w-4" /> 
          {product.inStock ? (selectedSize ? 'Adicionar ao Carrinho' : 'Selecione um tamanho') : 'Indisponível'}
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
