
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, ShoppingCart, Heart, Share2, Star } from "lucide-react";
import { ProductProps } from './ProductCard';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface ProductModalProps {
  product: ProductProps;
  children: React.ReactNode;
  onSelectSize?: (size: string) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, children, onSelectSize }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Estado para múltiplas imagens
  const [productImages, setProductImages] = useState<string[]>([product.image]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Carregar imagens do produto do banco de dados
  useEffect(() => {
    const loadProductImages = async () => {
      setIsLoadingImages(true);
      try {
        const { data: images, error } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', product.id)
          .order('display_order');

        if (error) {
          console.error('Erro ao carregar imagens:', error);
          // Fallback para imagem única
          setProductImages([product.image]);
        } else if (images && images.length > 0) {
          setProductImages(images.map(img => img.image_url));
        } else {
          // Se não há imagens na tabela, usar a imagem principal
          setProductImages([product.image]);
        }
      } catch (error) {
        console.error('Erro ao buscar imagens:', error);
        setProductImages([product.image]);
      } finally {
        setIsLoadingImages(false);
      }
    };

    loadProductImages();
  }, [product.id, product.image]);

  const images = productImages;

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(product.price);

  const handleNextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const handlePreviousImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    if (onSelectSize) {
      onSelectSize(size);
    }
  };

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      toast({
        title: "Produto esgotado",
        description: "Este produto não está disponível no momento.",
        variant: "destructive"
      });
      return;
    }

    if (product.sizes.length > 0 && !selectedSize) {
      toast({
        title: "Selecione um tamanho",
        description: "Por favor, escolha um tamanho antes de adicionar ao carrinho.",
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
      quantity: quantity,
      unit_price: product.price,
      total_price: product.price * quantity,
      metadata: { size: selectedSize }
    });

    toast({
      title: "Produto adicionado!",
      description: `${product.name} foi adicionado ao seu carrinho.`,
    });
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos",
      description: `${product.name} ${isFavorite ? 'foi removido dos' : 'foi adicionado aos'} seus favoritos.`,
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Confira este produto: ${product.name}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copiado!",
        description: "O link do produto foi copiado para a área de transferência.",
      });
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  const getImageLabel = (index: number) => {
    const labels = ['Principal', 'Frente', 'Lateral', 'Detalhe'];
    return labels[index] || `Imagem ${index + 1}`;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="product-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{product.name}</DialogTitle>
          <DialogDescription>
            Visualize detalhes, imagens e opções de compra do produto
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative">
              <AspectRatio ratio={1} className="overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={images[currentImage]}
                  alt={`${product.name} - ${getImageLabel(currentImage)}`}
                  className="w-full h-full object-cover transition-transform duration-300 cursor-zoom-in"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              </AspectRatio>
              
              {/* Image Controls */}
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousImage}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white"
                  disabled={images.length <= 1}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white"
                  disabled={zoomLevel <= 1}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white"
                  disabled={zoomLevel >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextImage}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white"
                  disabled={images.length <= 1}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Image Counter */}
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-black/70 text-white">
                  {currentImage + 1} / {images.length}
                </Badge>
              </div>
            </div>
            
            {/* Image Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                    currentImage === index 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} - ${getImageLabel(index)}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Information Section */}
          <div className="space-y-6">
            {/* Price and Actions */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-primary">{formattedPrice}</p>
                {product.stock <= 5 && product.stock > 0 && (
                  <p className="text-sm text-orange-600">Apenas {product.stock} em estoque!</p>
                )}
                {product.stock <= 0 && (
                  <Badge variant="destructive">Esgotado</Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleToggleFavorite}
                  className={isFavorite ? 'text-red-500 border-red-500' : ''}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Product Description */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Descrição</h3>
              <p className="text-gray-600 leading-relaxed">
                {product.description || 'Produto de alta qualidade com design exclusivo. Confeccionado com materiais premium para garantir durabilidade e conforto.'}
              </p>
            </div>
            
            {/* Size Selection */}
            {product.sizes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Tamanho</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <Button
                      key={size}
                      variant={selectedSize === size ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSizeSelect(size)}
                      className="min-w-[50px] h-10"
                      data-testid={`size-button-${size}`}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quantity Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold">Quantidade</h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="h-10 w-10"
                >
                  -
                </Button>
                <span className="text-lg font-medium min-w-[3ch] text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= product.stock}
                  className="h-10 w-10"
                >
                  +
                </Button>
              </div>
            </div>
            
            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="w-full h-12 text-lg font-semibold"
              size="lg"
              data-testid="modal-add-to-cart"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {product.stock <= 0 ? 'Produto Esgotado' : 'Adicionar ao Carrinho'}
            </Button>
            
            {/* Product Features */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold">Características</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Qualidade Premium</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Entrega Rápida</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Garantia de 30 dias</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Troca Grátis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
       </DialogContent>
     </Dialog>
   );
};

export default ProductModal;
