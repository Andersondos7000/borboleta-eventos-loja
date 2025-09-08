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
    
    // Try alternative Unsplash format first
    if (imageSrc.includes('source.unsplash.com') && !imageSrc.includes('images.unsplash.com')) {
      const photoIdMatch = imageSrc.match(/source\.unsplash\.com\/([a-zA-Z0-9_-]+)/);
      if (photoIdMatch) {
        const photoId = photoIdMatch[1];
        setImageSrc(`https://images.unsplash.com/photo-${photoId}?w=400&h=400&fit=crop&crop=center`);
        return;
      }
    }
    
    // Try fallback if not already using it
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(true);
      return;
    }
    
    setHasError(true);
    onError?.();
  };

  // For Unsplash images, use a proxy or convert to a more reliable format
  const getOptimizedSrc = (originalSrc: string) => {
    // If it's already a source.unsplash.com URL that failed, try alternatives
    if (originalSrc.includes('source.unsplash.com')) {
      // Extract the photo ID from source.unsplash.com URL
      const photoIdMatch = originalSrc.match(/source\.unsplash\.com\/([a-zA-Z0-9_-]+)/);
      if (photoIdMatch) {
        const photoId = photoIdMatch[1];
        // Try using images.unsplash.com as fallback
        return `https://images.unsplash.com/photo-${photoId}?w=400&h=400&fit=crop&crop=center`;
      }
    }
    
    // If it's an images.unsplash.com image, convert to source API
    if (originalSrc.includes('images.unsplash.com')) {
      // Extract the photo ID from Unsplash URL
      const photoIdMatch = originalSrc.match(/photo-([a-zA-Z0-9_-]+)/);
      if (photoIdMatch) {
        const photoId = photoIdMatch[1];
        // Use Unsplash's source API which is more reliable
        return `https://source.unsplash.com/${photoId}/400x400`;
      }
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
        crossOrigin="anonymous"
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