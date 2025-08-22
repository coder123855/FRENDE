import React, { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import LazyImage from './LazyImage';
import DefaultAvatar from './default-avatar';
import imageOptimizer from '../../utils/imageOptimization';
import imagePerformanceMonitor from '../../utils/imagePerformance';

const OptimizedAvatar = React.forwardRef(({
  src,
  alt = '',
  name = '',
  size = 'md',
  className = '',
  fallback = null,
  loading = 'lazy',
  onLoad = null,
  onError = null,
  variant = 'silhouette', // For default avatar
  ...props
}, ref) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-24 h-24',
    '3xl': 'w-32 h-32'
  };

  // Generate responsive image URLs for avatar
  const getResponsiveUrls = useCallback(() => {
    if (!src) return null;

    const sizes = {
      xs: [24, 32],
      sm: [32, 48],
      md: [48, 64, 96],
      lg: [64, 96, 128],
      xl: [80, 120, 160],
      '2xl': [96, 144, 192],
      '3xl': [128, 192, 256]
    };

    const avatarSizes = sizes[size] || sizes.md;
    return imageOptimizer.generateResponsiveUrls(src, {
      widths: avatarSizes,
      format: imageOptimizer.getOptimalFormat(),
      quality: 90
    });
  }, [src, size]);

  // Handle image load
  const handleImageLoad = useCallback((img, loadTime) => {
    setIsLoaded(true);
    
    // Track performance
    const format = src?.split('.').pop() || 'unknown';
    imagePerformanceMonitor.trackImageLoad(src, loadTime, null, format);
    
    onLoad?.(img, loadTime);
  }, [src, onLoad]);

  // Handle image error
  const handleImageError = useCallback((error, loadTime) => {
    setHasError(true);
    
    // Track error
    imagePerformanceMonitor.trackImageError(src, error, loadTime);
    
    onError?.(error, loadTime);
  }, [src, onError]);

  // Render fallback
  const renderFallback = () => {
    if (fallback) {
      return fallback;
    }
    
    return (
      <DefaultAvatar
        size={size}
        name={name}
        variant={variant}
        className={className}
      />
    );
  };

  // If no source or error occurred, show fallback
  if (!src || hasError) {
    return renderFallback();
  }

  const responsiveUrls = getResponsiveUrls();
  const aspectRatio = 1; // Square aspect ratio for avatars

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-full',
        sizeClasses[size],
        className
      )}
      style={{ aspectRatio }}
      {...props}
    >
      <LazyImage
        src={responsiveUrls?.defaultUrl || src}
        alt={alt}
        srcSet={responsiveUrls?.srcset}
        sizes={responsiveUrls?.sizes}
        loading={loading}
        aspectRatio={aspectRatio}
        objectFit="cover"
        objectPosition="center"
        onLoad={handleImageLoad}
        onError={handleImageError}
        fallback={renderFallback()}
        className="w-full h-full"
      />
    </div>
  );
});

OptimizedAvatar.displayName = 'OptimizedAvatar';

export default OptimizedAvatar;
