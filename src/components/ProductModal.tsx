
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut } from "lucide-react";
import { ProductProps } from './ProductCard';

interface ProductModalProps {
  product: ProductProps;
  children: React.ReactNode;
  onSelectSize?: (size: string) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, children, onSelectSize }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Mock front and back images (in a real app, these would come from the product data)
  const images = [
    product.image,
    product.image.replace('?q=80', '?q=80&flip=horizontal') // This is just for demonstration
  ];

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

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <div className="relative">
          <AspectRatio ratio={4/3} className="overflow-hidden">
            <img
              src={images[currentImage]}
              alt={`${product.name} - ${currentImage === 0 ? 'Frente' : 'Costas'}`}
              className="w-full h-full object-cover transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})` }}
            />
          </AspectRatio>
          
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousImage}
              className="bg-white/80 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              className="bg-white/80 backdrop-blur-sm"
              disabled={zoomLevel <= 1}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              className="bg-white/80 backdrop-blur-sm"
              disabled={zoomLevel >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextImage}
              className="bg-white/80 backdrop-blur-sm"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
