// Image Optimization Utilities for Frende App
class ImageOptimizer {
  constructor() {
    this.supportedFormats = this.detectSupportedFormats();
    this.breakpoints = {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536
    };
  }

  // Detect supported image formats
  detectSupportedFormats() {
    const canvas = document.createElement('canvas');
    const formats = {
      webp: false,
      avif: false,
      jpeg: true, // Always supported
      png: true   // Always supported
    };

    // Test WebP support
    canvas.width = 1;
    canvas.height = 1;
    const webpDataURL = canvas.toDataURL('image/webp');
    formats.webp = webpDataURL.indexOf('data:image/webp') === 0;

    // Test AVIF support (newer browsers)
    try {
      const avifDataURL = canvas.toDataURL('image/avif');
      formats.avif = avifDataURL.indexOf('data:image/avif') === 0;
    } catch (e) {
      formats.avif = false;
    }

    return formats;
  }

  // Get optimal format based on browser support
  getOptimalFormat() {
    if (this.supportedFormats.avif) return 'avif';
    if (this.supportedFormats.webp) return 'webp';
    return 'jpeg';
  }

  // Generate responsive image URLs
  generateResponsiveUrls(baseUrl, options = {}) {
    const {
      widths = [320, 640, 768, 1024, 1280],
      format = this.getOptimalFormat(),
      quality = 85
    } = options;

    const urls = {};
    const srcset = [];

    widths.forEach(width => {
      const url = this.generateOptimizedUrl(baseUrl, {
        width,
        format,
        quality
      });
      urls[width] = url;
      srcset.push(`${url} ${width}w`);
    });

    return {
      urls,
      srcset: srcset.join(', '),
      sizes: this.generateSizes(widths),
      defaultUrl: urls[widths[Math.floor(widths.length / 2)]]
    };
  }

  // Generate optimized URL with parameters
  generateOptimizedUrl(baseUrl, options = {}) {
    const {
      width,
      height,
      format = this.getOptimalFormat(),
      quality = 85,
      crop = false
    } = options;

    if (!baseUrl) return '';

    const url = new URL(baseUrl, window.location.origin);
    
    // Add optimization parameters
    if (width) url.searchParams.set('w', width);
    if (height) url.searchParams.set('h', height);
    if (format !== 'jpeg') url.searchParams.set('f', format);
    if (quality !== 85) url.searchParams.set('q', quality);
    if (crop) url.searchParams.set('c', '1');

    return url.toString();
  }

  // Generate sizes attribute for responsive images
  generateSizes(widths) {
    const sizes = [
      `(max-width: ${this.breakpoints.sm}px) ${widths[0]}px`,
      `(max-width: ${this.breakpoints.md}px) ${widths[1]}px`,
      `(max-width: ${this.breakpoints.lg}px) ${widths[2]}px`,
      `(max-width: ${this.breakpoints.xl}px) ${widths[3]}px`,
      `${widths[4]}px`
    ];
    return sizes.join(', ');
  }

  // Compress image on client side before upload
  async compressImage(file, options = {}) {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 0.8,
      format = 'jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          `image/${format}`,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Generate blur-up placeholder
  async generateBlurPlaceholder(file, size = 20) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate thumbnail dimensions
        const ratio = Math.min(size / img.width, size / img.height);
        const width = img.width * ratio;
        const height = img.height * ratio;

        canvas.width = width;
        canvas.height = height;

        // Draw thumbnail
        ctx.drawImage(img, 0, 0, width, height);

        // Apply blur effect
        const imageData = ctx.getImageData(0, 0, width, height);
        const blurredData = this.applyBlur(imageData, 2);
        ctx.putImageData(blurredData, 0, 0);

        // Convert to base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.3);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Failed to generate placeholder'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Simple blur effect
  applyBlur(imageData, radius) {
    const { data, width, height } = imageData;
    const newData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              a += data[idx + 3];
              count++;
            }
          }
        }

        const idx = (y * width + x) * 4;
        newData[idx] = r / count;
        newData[idx + 1] = g / count;
        newData[idx + 2] = b / count;
        newData[idx + 3] = a / count;
      }
    }

    return new ImageData(newData, width, height);
  }

  // Get image dimensions
  getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height
        });
      };
      img.onerror = () => reject(new Error('Failed to get image dimensions'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Validate image file
  validateImage(file, options = {}) {
    const {
      maxSize = 30 * 1024 * 1024, // 30MB
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxWidth = 4096,
      maxHeight = 4096
    } = options;

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please select a JPEG, PNG, or WebP image file'
      };
    }

    return { valid: true };
  }

  // Preload image
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
      img.src = src;
    });
  }

  // Get image loading performance metrics
  async getImagePerformance(src) {
    const startTime = performance.now();
    
    try {
      await this.preloadImage(src);
      const loadTime = performance.now() - startTime;
      
      return {
        success: true,
        loadTime,
        size: await this.getImageSize(src)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        loadTime: performance.now() - startTime
      };
    }
  }

  // Get image file size
  async getImageSize(src) {
    try {
      const response = await fetch(src, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength) : null;
    } catch (error) {
      return null;
    }
  }

  // Generate avatar-specific URLs
  generateAvatarUrls(baseUrl, size = 320) {
    const sizes = [40, 80, 120, 160, 240, 320];
    return this.generateResponsiveUrls(baseUrl, {
      widths: sizes,
      format: this.getOptimalFormat(),
      quality: 90
    });
  }

  // Generate thumbnail URLs
  generateThumbnailUrls(baseUrl, size = 150) {
    const sizes = [50, 100, 150, 200];
    return this.generateResponsiveUrls(baseUrl, {
      widths: sizes,
      format: this.getOptimalFormat(),
      quality: 80
    });
  }
}

// Create singleton instance
const imageOptimizer = new ImageOptimizer();

export default imageOptimizer;
