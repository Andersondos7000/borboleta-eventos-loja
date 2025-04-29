
import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductModal from './ProductModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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
  const { user } = useAuth();
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(product.price);

  const handleAddToCart = async () => {
    try {
      if (!user) {
        // If user is not logged in, store product in localStorage temporarily
        // and redirect to login page
        const cartItems = JSON.parse(localStorage.getItem('tempCart') || '[]');
        cartItems.push({
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          productImage: product.image,
          productCategory: product.category,
          size: product.sizes[0], // Default to first available size
          quantity: 1
        });
        localStorage.setItem('tempCart', JSON.stringify(cartItems));
        
        toast({
          title: "Produto adicionado ao carrinho",
          description: "Faça login para finalizar sua compra"
        });
        
        navigate('/carrinho');
        return;
      }

      // Check if there's an open cart (order with status 'Pendente')
      const { data: existingOrder, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'Pendente')
        .maybeSingle();

      if (orderError) throw orderError;

      let orderId;

      if (existingOrder) {
        // Use existing order
        orderId = existingOrder.id;
      } else {
        // Create new order
        const { data: newOrder, error: createOrderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            total: product.price, // Initial total is just the product price
            status: 'Pendente'
          })
          .select('id')
          .single();

        if (createOrderError) throw createOrderError;
        orderId = newOrder.id;
      }

      // Add product to order_items
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: orderId,
          product_id: product.id,
          quantity: 1,
          price: product.price,
          size: product.sizes[0] // Default to first available size
        });

      if (itemError) throw itemError;

      // Update order total
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('price, quantity')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const newTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ total: newTotal })
        .eq('id', orderId);

      if (updateOrderError) throw updateOrderError;

      toast({
        title: "Produto adicionado ao carrinho",
        description: "Seu carrinho foi atualizado com sucesso"
      });

      navigate('/carrinho');
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar ao carrinho",
        description: error.message || "Ocorreu um erro ao adicionar o produto ao carrinho"
      });
    }
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

export default ProductCard;
