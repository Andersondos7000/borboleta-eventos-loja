import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onError?: () => void;
  onLoad?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  fallbackSrc = '/placeholder.svg',
  onError,
  onLoad
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset states when src changes
  useEffect(() => {
    setImageSrc(src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoading(false);
    
    // Strategy 1: Try picsum.photos as primary alternative (no CORS issues)
    if (imageSrc.includes('images.unsplash.com') || imageSrc.includes('source.unsplash.com')) {
      const randomId = Math.floor(Math.random() * 1000) + 1;
      setImageSrc(`https://picsum.photos/400/400?random=${randomId}`);
      return;
    }
    
    // Strategy 2: Try fallback if not already using it
    if (imageSrc !== fallbackSrc && !imageSrc.includes('picsum.photos')) {
      setImageSrc(fallbackSrc);
      return;
    }
    
    // Final fallback: show error state
    setHasError(true);
    onError?.();
  };

  // Optimize image sources for better compatibility
  const getOptimizedSrc = (originalSrc: string) => {
    // For Unsplash URLs, replace with Picsum Photos to avoid CORS issues
    if (originalSrc.includes('images.unsplash.com') || originalSrc.includes('source.unsplash.com')) {
      const randomId = Math.floor(Math.random() * 1000) + 1;
      return `https://picsum.photos/400/400?random=${randomId}`;
    }
    
    // For picsum.photos, keep as is
    if (originalSrc.includes('picsum.photos')) {
      return originalSrc;
    }
    
    return originalSrc;
  };

  const optimizedSrc = getOptimizedSrc(imageSrc);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 text-sm">Carregando...</div>
        </div>
      )}
      
      <img
        src={optimizedSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          hasError ? 'opacity-50' : ''
        )}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-500 text-sm text-center p-4">
            <div>Imagem não disponível</div>
            <div className="text-xs mt-1">Usando placeholder</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;