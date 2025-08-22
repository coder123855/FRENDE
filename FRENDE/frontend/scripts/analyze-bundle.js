#!/usr/bin/env node

/**
 * Bundle Analysis Script for Frende Frontend
 * Analyzes bundle size and provides optimization recommendations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

/**
 * Get file size in human readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get gzipped size estimate (rough calculation)
 */
function estimateGzipSize(bytes) {
  // Rough estimate: gzip typically reduces size by 60-80%
  const compressionRatio = 0.7;
  return Math.round(bytes * compressionRatio);
}

/**
 * Analyze bundle files
 */
function analyzeBundle() {
  console.log('🔍 Analyzing Frende Frontend Bundle...\n');
  
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }
  
  const files = [];
  
  // Read all files in assets directory
  if (fs.existsSync(ASSETS_DIR)) {
    const assetFiles = fs.readdirSync(ASSETS_DIR);
    
    assetFiles.forEach(file => {
      const filePath = path.join(ASSETS_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        const size = stats.size;
        const gzipSize = estimateGzipSize(size);
        
        files.push({
          name: file,
          size,
          gzipSize,
          type: path.extname(file).substring(1)
        });
      }
    });
  }
  
  // Sort by size (largest first)
  files.sort((a, b) => b.size - a.size);
  
  // Calculate totals
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalGzipSize = files.reduce((sum, file) => sum + file.gzipSize, 0);
  
  // Group by type
  const byType = files.reduce((acc, file) => {
    acc[file.type] = acc[file.type] || [];
    acc[file.type].push(file);
    return acc;
  }, {});
  
  // Display results
  console.log('📊 Bundle Analysis Results:\n');
  
  console.log('📁 File Breakdown:');
  files.forEach(file => {
    const sizeStr = formatBytes(file.size);
    const gzipStr = formatBytes(file.gzipSize);
    console.log(`  ${file.name.padEnd(30)} ${sizeStr.padStart(10)} (${gzipStr} gzipped)`);
  });
  
  console.log('\n📈 Totals:');
  console.log(`  Total Size: ${formatBytes(totalSize)}`);
  console.log(`  Total Gzipped: ${formatBytes(totalGzipSize)}`);
  
  console.log('\n📂 By Type:');
  Object.entries(byType).forEach(([type, typeFiles]) => {
    const typeSize = typeFiles.reduce((sum, file) => sum + file.size, 0);
    const typeGzipSize = typeFiles.reduce((sum, file) => sum + file.gzipSize, 0);
    console.log(`  ${type.toUpperCase()}: ${formatBytes(typeSize)} (${formatBytes(typeGzipSize)} gzipped)`);
  });
  
  // Performance recommendations
  console.log('\n💡 Optimization Recommendations:');
  
  const largeFiles = files.filter(file => file.size > 500 * 1024); // > 500KB
  if (largeFiles.length > 0) {
    console.log('\n⚠️  Large files detected:');
    largeFiles.forEach(file => {
      console.log(`  - ${file.name}: ${formatBytes(file.size)}`);
    });
    console.log('  Consider implementing code splitting for these components.');
  }
  
  if (totalSize > 2 * 1024 * 1024) { // > 2MB
    console.log('\n⚠️  Total bundle size is large (>2MB). Consider:');
    console.log('  - Implementing more aggressive code splitting');
    console.log('  - Lazy loading non-critical components');
    console.log('  - Tree shaking unused dependencies');
  }
  
  // Check for duplicate dependencies
  const jsFiles = files.filter(file => file.type === 'js');
  if (jsFiles.length > 5) {
    console.log('\n💡 Multiple JS chunks detected. Consider:');
    console.log('  - Reviewing manual chunk configuration');
    console.log('  - Consolidating related dependencies');
  }
  
  console.log('\n✅ Bundle analysis complete!');
}

// Run analysis
analyzeBundle();
