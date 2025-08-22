import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import compression from 'vite-plugin-compression'
import imagemin from 'vite-plugin-imagemin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      url: process.env.SENTRY_URL,
      telemetry: false,
    }),
    // Gzip compression
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files larger than 1KB
      deleteOriginFile: false,
    }),
    // Brotli compression
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),
    // Image optimization
    imagemin({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.65, 0.8] },
      svgo: { 
        plugins: [
          { removeViewBox: false },
          { removeEmptyAttrs: true },
          { removeEmptyText: true },
          { removeEmptyContainers: true },
          { removeHiddenElems: true },
          { removeEmptyLines: true },
          { removeUselessDefs: true },
          { removeUselessStrokeAndFill: true },
          { removeUnusedNS: true },
          { removeXMLNS: true },
          { removeEditorsNSData: true },
          { removeEmptyAttrs: true },
          { removeEmptyText: true },
          { removeEmptyContainers: true },
          { removeHiddenElems: true },
          { removeEmptyLines: true },
          { removeUselessDefs: true },
          { removeUselessStrokeAndFill: true },
          { removeUnusedNS: true },
          { removeXMLNS: true },
          { removeEditorsNSData: true }
        ]
      },
      webp: { quality: 80 },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          
          // Routing
          'router': ['react-router-dom'],
          
          // UI Components
          'ui-components': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-slot', 
            '@radix-ui/react-tabs',
            '@radix-ui/react-avatar',
            '@radix-ui/react-label',
            '@radix-ui/react-select'
          ],
          
          // Icons
          'icons': ['@heroicons/react', 'lucide-react'],
          
          // Utilities
          'utils': ['clsx', 'class-variance-authority', 'tailwind-merge'],
          
          // Networking
          'network': ['axios', 'socket.io-client'],
          
          // Error tracking
          'monitoring': ['@sentry/react'],
          
          // Crypto and storage
          'crypto': ['crypto-js', 'idb'],
        },
        // Optimize chunk loading with CDN-friendly naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          
          // Organize assets by type for better CDN caching
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`
          }
          if (/js/i.test(ext)) {
            return `assets/js/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
    host: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'socket.io-client',
      '@sentry/react',
      'crypto-js',
      'idb'
    ],
  },
})
