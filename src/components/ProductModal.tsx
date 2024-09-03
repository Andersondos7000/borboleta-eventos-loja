
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, ShoppingCart, Heart, Share2, Star } from "lucide-react";
import { ProductProps } from './ProductCard';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

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
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Mock multiple images (in a real app, these would come from the product data)
  const images = [
    product.image,
    product.image.replace('?q=80', '?q=80&flip=horizontal'), // Front view
    product.image.replace('?q=80', '?q=80&rotate=90'), // Side view
    product.image.replace('?q=80', '?q=80&grayscale') // Detail view
  ];

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(product.price);

  const handleNextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
    setPanPosition({ x: 0, y: 0 }); // Reset pan when changing image
  };

  const handlePreviousImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
    setPanPosition({ x: 0, y: 0 }); // Reset pan when changing image
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.min(prev + 0.5, 3);
      if (newZoom === 1) {
        setPanPosition({ x: 0, y: 0 }); // Reset pan when zoom is 1
      }
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setPanPosition({ x: 0, y: 0 }); // Reset pan when zoom is 1
      }
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      const maxPan = 100 * (zoomLevel - 1); // Limit pan based on zoom level
      const newX = Math.max(-maxPan, Math.min(maxPan, e.clientX - dragStart.x));
      const newY = Math.max(-maxPan, Math.min(maxPan, e.clientY - dragStart.y));
      setPanPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoomLevel === 1) {
      setZoomLevel(2);
    } else {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoomLevel((prev) => {
      const newZoom = Math.max(1, Math.min(3, prev + delta));
      if (newZoom === 1) {
        setPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
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
                <div
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onDoubleClick={handleDoubleClick}
                  onWheel={handleWheel}
                  style={{
                    cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                  }}
                >
                  <img
                    src={images[currentImage]}
                    alt={`${product.name} - ${getImageLabel(currentImage)}`}
                    className="w-full h-full object-cover transition-transform duration-200 ease-out select-none"
                    style={{
                      transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
                      transformOrigin: 'center center'
                    }}
                    draggable={false}
                  />
                </div>
              </AspectRatio>
              
              {/* Image Navigation Controls */}
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousImage}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white"
                  disabled={images.length <= 1}
                  title="Imagem anterior"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextImage}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white"
                  disabled={images.length <= 1}
                  title="Próxima imagem"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Zoom Controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                  className="bg-white/80 backdrop-blur-sm hover:bg-white/90"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 1}
                  className="bg-white/80 backdrop-blur-sm hover:bg-white/90"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                {/* Zoom Level Indicator */}
                {zoomLevel > 1 && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium text-center">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                )}
              </div>
              
              {/* Zoom Instructions */}
              {zoomLevel > 1 && (
                <div className="absolute bottom-4 left-4 bg-orange-500/70 text-white text-xs px-3 py-2 rounded-md backdrop-blur-sm">
                  Arraste para navegar • Duplo clique para resetar
                </div>
              )}
              
              {/* Scroll to Zoom Hint */}
              {zoomLevel === 1 && (
                <div className="absolute bottom-4 left-4 bg-orange-500/50 text-white text-xs px-3 py-2 rounded-md backdrop-blur-sm opacity-70">
                  Role o mouse para zoom • Duplo clique para ampliar
                </div>
              )}
              
              {/* Image Counter */}
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className="bg-orange-500/70 text-white">
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
