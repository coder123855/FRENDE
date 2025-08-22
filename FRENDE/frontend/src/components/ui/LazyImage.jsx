import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../../lib/utils';
import imageOptimizer from '../../utils/imageOptimization';

const LazyImage = React.forwardRef(({
  src,
  alt = '',
  className = '',
  placeholder = null,
  fallback = null,
  sizes = null,
  srcSet = null,
  loading = 'lazy',
  onLoad = null,
  onError = null,
  onIntersect = null,
  threshold = 0.1,
  rootMargin = '50px',
  progressive = true,
  blurUp = true,
  aspectRatio = null,
  objectFit = 'cover',
  objectPosition = 'center',
  ...props
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [blurPlaceholder, setBlurPlaceholder] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [performance, setPerformance] = useState(null);
  
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  const loadingStartTime = useRef(null);

  // Initialize intersection observer
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            onIntersect?.(entry);
            
            // Start loading the image
            if (imageSrc && !isLoaded && !hasError) {
              loadImage();
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imgRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, onIntersect]);

  // Handle image source changes
  useEffect(() => {
    if (src) {
      setImageSrc(src);
      setHasError(false);
      setIsLoaded(false);
      
      // Generate blur placeholder if enabled
      if (blurUp && progressive) {
        generateBlurPlaceholder();
      }
    }
  }, [src, blurUp, progressive]);

  // Generate blur placeholder
  const generateBlurPlaceholder = useCallback(async () => {
    try {
      if (src && src.startsWith('data:') || src.startsWith('blob:')) {
        // For data URLs or blob URLs, we can't generate a blur placeholder
        return;
      }
      
      // Create a small version of the image for blur placeholder
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });
      
      const placeholder = await imageOptimizer.generateBlurPlaceholder(file, 20);
      setBlurPlaceholder(placeholder);
    } catch (error) {
      console.warn('Failed to generate blur placeholder:', error);
    }
  }, [src]);

  // Load image with performance tracking
  const loadImage = useCallback(async () => {
    if (!imageSrc || isLoaded || hasError) return;

    loadingStartTime.current = performance.now();
    
    try {
      const img = new Image();
      
      img.onload = () => {
        const loadTime = performance.now() - (loadingStartTime.current || 0);
        setIsLoaded(true);
        setPerformance({ loadTime, success: true });
        onLoad?.(img, loadTime);
      };
      
      img.onerror = (error) => {
        const loadTime = performance.now() - (loadingStartTime.current || 0);
        setHasError(true);
        setPerformance({ loadTime, success: false, error: error.message });
        onError?.(error, loadTime);
      };
      
      img.src = imageSrc;
    } catch (error) {
      setHasError(true);
      onError?.(error);
    }
  }, [imageSrc, isLoaded, hasError, onLoad, onError]);

  // Handle immediate loading for non-lazy images
  useEffect(() => {
    if (loading === 'eager' && imageSrc) {
      setIsInView(true);
      loadImage();
    }
  }, [loading, imageSrc, loadImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Render placeholder
  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }
    
    if (blurPlaceholder && progressive) {
      return (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${blurPlaceholder})`,
            filter: 'blur(10px)',
            transform: 'scale(1.1)',
          }}
        />
      );
    }
    
    return (
      <div className="absolute inset-0 bg-gray-200 animate-pulse" />
    );
  };

  // Render fallback
  const renderFallback = () => {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  };

  // Calculate aspect ratio styles
  const aspectRatioStyle = aspectRatio ? {
    aspectRatio: typeof aspectRatio === 'number' ? aspectRatio : aspectRatio,
  } : {};

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden',
        aspectRatio && 'aspect-ratio-container',
        className
      )}
      style={aspectRatioStyle}
      {...props}
    >
      {/* Placeholder */}
      {!isLoaded && !hasError && renderPlaceholder()}
      
      {/* Error fallback */}
      {hasError && renderFallback()}
      
      {/* Actual image */}
      {imageSrc && isInView && !hasError && (
        <img
          ref={ref}
          src={imageSrc}
          alt={alt}
          sizes={sizes}
          srcSet={srcSet}
          loading={loading}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            'w-full h-full',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'contain' && 'object-contain',
            objectFit === 'fill' && 'object-fill',
            objectFit === 'scale-down' && 'object-scale-down',
            objectFit === 'none' && 'object-none'
          )}
          style={{
            objectPosition,
          }}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
      
      {/* Loading indicator */}
      {isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
      
      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && performance && (
        <div className="absolute top-1 right-1 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {performance.success ? `${Math.round(performance.loadTime)}ms` : 'Error'}
        </div>
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
