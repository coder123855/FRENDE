# Compression and CDN Optimization Guide

## Overview

This document describes the compression and CDN optimization system implemented in the Frende application to improve static asset delivery, reduce bandwidth usage, and enhance page load performance.

## Features

### Frontend Optimizations

#### 1. Vite Build Optimization
- **Gzip Compression**: Automatic generation of `.gz` files for all assets
- **Brotli Compression**: Automatic generation of `.br` files for better compression ratios
- **Image Optimization**: Automatic optimization of images using imagemin
- **Code Splitting**: Advanced chunking strategy for optimal loading
- **Asset Organization**: CDN-friendly asset organization by type

#### 2. CDN Integration (Vercel)
- **Automatic Compression**: Vercel's built-in compression for all assets
- **Cache Headers**: Optimized cache control headers for different asset types
- **Geographic Distribution**: Global CDN distribution for faster loading
- **Edge Functions**: Support for edge-side optimization

#### 3. HTML Optimization
- **Resource Hints**: DNS prefetch, preconnect, and preload directives
- **Compression Detection**: Client-side compression support detection
- **Performance Monitoring**: Built-in performance tracking

### Backend Optimizations

#### 1. Compression Middleware
- **Gzip Support**: Automatic gzip compression for API responses
- **Brotli Support**: Brotli compression for better ratios
- **Conditional Compression**: Only compress when beneficial
- **Vary Headers**: Proper cache control with Accept-Encoding

#### 2. Static Asset Optimization
- **Enhanced Caching**: Optimized cache headers for different file types
- **CDN Headers**: CDN-specific optimization headers
- **Image Optimization**: Automatic image format optimization
- **Security Headers**: Additional security for static assets

#### 3. Performance Monitoring
- **Asset Tracking**: Monitor asset loading performance
- **Compression Metrics**: Track compression ratios and bandwidth savings
- **CDN Analytics**: Monitor CDN hit rates and performance
- **Performance Alerts**: Automatic alerts for performance issues

## Configuration

### Frontend Configuration

#### Vite Configuration (`vite.config.js`)

```javascript
export default defineConfig({
  plugins: [
    // Gzip compression
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
    // Brotli compression
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
    // Image optimization
    imagemin({
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.65, 0.8] },
      webp: { quality: 80 },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // CDN-friendly asset organization
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name.split('.').pop();
          if (/png|jpe?g|svg|gif|webp/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|ttf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
});
```

#### Vercel Configuration (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "CDN-Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "compress": true
}
```

### Backend Configuration

#### Environment Variables

```bash
# Compression Configuration
COMPRESSION_ENABLED=true
COMPRESSION_MIN_SIZE=1024
COMPRESSION_LEVEL=6
BROTLI_ENABLED=true
BROTLI_QUALITY=11

# CDN Configuration
CDN_ENABLED=true
CDN_DOMAIN=
CDN_CACHE_DURATION=31536000
CDN_GEO_DISTRIBUTION=true

# Asset Optimization
ASSET_OPTIMIZATION_ENABLED=true
IMAGE_QUALITY=80
FONT_SUBSETTING=true
WEBP_ENABLED=true
AVIF_ENABLED=false
```

## Usage

### Frontend Usage

#### Building with Compression

```bash
# Build with compression
npm run build

# Test compression
npm run test:compression
```

#### Performance Testing

```bash
# Run performance tests
node scripts/performance-test.js

# Test with custom base URL
TEST_BASE_URL=https://your-domain.com node scripts/performance-test.js
```

### Backend Usage

#### Compression Middleware

The compression middleware is automatically applied to all responses. It will:

1. Check if the response should be compressed
2. Determine the best compression type (Brotli > Gzip)
3. Apply compression if beneficial
4. Add appropriate headers

#### Static Asset Optimization

Static assets are automatically optimized with:

1. **Cache Headers**: Based on file type
2. **CDN Headers**: For CDN optimization
3. **Security Headers**: Additional security measures
4. **Image Headers**: Format-specific optimization headers

#### Performance Monitoring

Access performance metrics via API endpoints:

```bash
# Get global metrics
GET /api/v1/asset-performance/metrics

# Get specific asset metrics
GET /api/v1/asset-performance/assets/{asset_path}

# Get performance alerts
GET /api/v1/asset-performance/alerts

# Get optimization suggestions
GET /api/v1/asset-performance/suggestions
```

## Testing

### Frontend Testing

#### Compression Testing

```bash
# Test compression files exist
npm run test:compression

# Expected output:
# PASS: Build directory exists
# PASS: Bundle size: main.js (under limit)
# PASS: Gzip compression files exist (2 gzip files found)
# PASS: Brotli compression files exist (2 brotli files found)
# PASS: Images are optimized (5 optimized images, 0 large images)
# PASS: Directory exists: assets/js
# PASS: Vercel configuration has headers
# PASS: HTML has preload directives
```

#### Manual Testing

```bash
# Test gzip compression
curl -H "Accept-Encoding: gzip" -I https://your-domain.com/assets/main.js

# Test brotli compression
curl -H "Accept-Encoding: br" -I https://your-domain.com/assets/main.js

# Test cache headers
curl -I https://your-domain.com/assets/main.js
```

### Backend Testing

#### Unit Tests

```bash
# Run compression tests
pytest tests/test_compression.py -v

# Run specific test class
pytest tests/test_compression.py::TestCompressionMiddleware -v
```

#### Integration Tests

```bash
# Test compression middleware
pytest tests/test_compression.py::TestCompressionIntegration -v

# Test static file optimization
pytest tests/test_compression.py::TestOptimizedStaticFiles -v
```

## Performance Metrics

### Expected Improvements

- **50-70% Reduction**: In asset file sizes through compression
- **30-50% Faster**: Asset loading through CDN distribution
- **Improved Core Web Vitals**: Better LCP, FID, and CLS scores
- **Reduced Bandwidth**: Lower bandwidth costs and faster loading

### Monitoring Metrics

#### Compression Metrics
- **Compression Ratio**: Average compression ratio across all assets
- **Bandwidth Saved**: Total bandwidth saved through compression
- **Assets Served**: Total number of assets served

#### CDN Metrics
- **CDN Hit Rate**: Percentage of requests served from CDN
- **Response Time**: Average response time from CDN
- **Geographic Distribution**: Performance across different regions

#### Performance Alerts
- **Slow Loading**: Assets taking longer than 2 seconds to load
- **Low Compression**: Assets with compression ratio below 20%
- **Large Files**: Assets larger than 1MB

## Troubleshooting

### Common Issues

#### Compression Not Working

1. **Check Configuration**:
   ```bash
   # Verify compression is enabled
   echo $COMPRESSION_ENABLED
   
   # Check minimum size threshold
   echo $COMPRESSION_MIN_SIZE
   ```

2. **Check Headers**:
   ```bash
   # Verify Accept-Encoding header
   curl -H "Accept-Encoding: gzip" -I https://your-domain.com/api/test
   ```

3. **Check Logs**:
   ```bash
   # Look for compression errors
   tail -f logs/app.log | grep compression
   ```

#### CDN Not Working

1. **Check Vercel Configuration**:
   ```bash
   # Verify vercel.json exists and is valid
   cat vercel.json | jq .
   ```

2. **Check Cache Headers**:
   ```bash
   # Verify cache headers are set
   curl -I https://your-domain.com/assets/main.js
   ```

3. **Check CDN Status**:
   ```bash
   # Check CDN performance metrics
   curl https://your-domain.com/api/v1/asset-performance/cdn-stats
   ```

#### Performance Issues

1. **Check Asset Sizes**:
   ```bash
   # Analyze bundle sizes
   npm run analyze
   ```

2. **Check Compression Ratios**:
   ```bash
   # Get compression statistics
   curl https://your-domain.com/api/v1/asset-performance/compression-stats
   ```

3. **Check Performance Alerts**:
   ```bash
   # Get recent alerts
   curl https://your-domain.com/api/v1/asset-performance/alerts
   ```

### Debugging

#### Enable Debug Logging

```python
# In your environment
DEBUG=true
LOG_LEVEL=DEBUG
```

#### Manual Testing

```bash
# Test compression manually
curl -H "Accept-Encoding: gzip" https://your-domain.com/api/large-response | wc -c
curl -H "Accept-Encoding: br" https://your-domain.com/api/large-response | wc -c
curl https://your-domain.com/api/large-response | wc -c
```

## Best Practices

### Frontend Best Practices

1. **Asset Organization**: Keep assets organized by type for better caching
2. **Image Optimization**: Use WebP format when possible
3. **Code Splitting**: Split code into logical chunks
4. **Resource Hints**: Use preload and preconnect for critical resources
5. **Compression Testing**: Regularly test compression effectiveness

### Backend Best Practices

1. **Conditional Compression**: Only compress when beneficial
2. **Cache Headers**: Set appropriate cache headers for different content types
3. **Monitoring**: Monitor compression ratios and performance metrics
4. **Error Handling**: Handle compression errors gracefully
5. **Security**: Add security headers to static assets

### CDN Best Practices

1. **Cache Strategy**: Use immutable cache for versioned assets
2. **Geographic Distribution**: Leverage CDN edge locations
3. **Compression**: Enable compression at CDN level
4. **Monitoring**: Monitor CDN performance and hit rates
5. **Fallbacks**: Have fallback strategies for CDN failures

## Future Enhancements

### Planned Features

1. **AVIF Support**: Add AVIF image format support
2. **Dynamic Compression**: Adjust compression based on network conditions
3. **Real-time Monitoring**: Real-time performance monitoring dashboard
4. **Automated Optimization**: Automatic asset optimization based on usage patterns
5. **Multi-CDN Support**: Support for multiple CDN providers

### Performance Targets

- **LCP < 2.5s**: Largest Contentful Paint under 2.5 seconds
- **FID < 100ms**: First Input Delay under 100 milliseconds
- **CLS < 0.1**: Cumulative Layout Shift under 0.1
- **Compression Ratio > 60%**: Average compression ratio above 60%
- **CDN Hit Rate > 90%**: CDN cache hit rate above 90%

## Support

For issues and questions related to compression and CDN optimization:

1. **Check Documentation**: Review this guide and related documentation
2. **Run Tests**: Execute performance tests to identify issues
3. **Check Logs**: Review application logs for error messages
4. **Monitor Metrics**: Use performance monitoring endpoints
5. **Contact Support**: Reach out to the development team

## References

- [Vite Compression Plugin](https://github.com/vbenjs/vite-plugin-compression)
- [Vite Image Optimization](https://github.com/vbenjs/vite-plugin-imagemin)
- [Vercel CDN Documentation](https://vercel.com/docs/edge-network)
- [Brotli Compression](https://github.com/google/brotli)
- [Web Performance Best Practices](https://web.dev/performance/)
