#!/usr/bin/env node

/**
 * Performance testing script for Frende frontend
 * Tests compression, CDN optimization, and asset loading performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  assetsDir: path.join(__dirname, '../dist/assets'),
  thresholds: {
    maxBundleSize: 500 * 1024, // 500KB
    maxLoadTime: 2000, // 2 seconds
    minCompressionRatio: 20, // 20%
    maxImageSize: 100 * 1024 // 100KB
  }
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(50)}`, 'blue');
  log(title, 'blue');
  log(`${'='.repeat(50)}`, 'blue');
}

function logTest(testName, passed, details = '') {
  const status = passed ? 'PASS' : 'FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status}: ${testName}`, color);
  if (details) {
    log(`  ${details}`, 'yellow');
  }
}

// Test 1: Check if build directory exists
function testBuildDirectory() {
  logSection('Testing Build Directory');
  
  const distPath = path.join(__dirname, '../dist');
  const exists = fs.existsSync(distPath);
  
  logTest('Build directory exists', exists);
  
  if (!exists) {
    log('Build directory not found. Run "npm run build" first.', 'red');
    process.exit(1);
  }
  
  return exists;
}

// Test 2: Check bundle sizes
function testBundleSizes() {
  logSection('Testing Bundle Sizes');
  
  const assetsPath = path.join(__dirname, '../dist/assets');
  if (!fs.existsSync(assetsPath)) {
    logTest('Assets directory exists', false, 'Assets directory not found');
    return false;
  }
  
  const files = fs.readdirSync(assetsPath);
  let allPassed = true;
  
  files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.css')) {
      const filePath = path.join(assetsPath, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      const passed = stats.size <= TEST_CONFIG.thresholds.maxBundleSize;
      
      logTest(
        `Bundle size: ${file}`,
        passed,
        `${sizeKB}KB ${passed ? '(under limit)' : '(over limit)'}`
      );
      
      if (!passed) allPassed = false;
    }
  });
  
  return allPassed;
}

// Test 3: Check for compressed files
function testCompression() {
  logSection('Testing Compression');
  
  const assetsPath = path.join(__dirname, '../dist/assets');
  if (!fs.existsSync(assetsPath)) {
    logTest('Compressed files exist', false, 'Assets directory not found');
    return false;
  }
  
  const files = fs.readdirSync(assetsPath);
  let gzipFiles = 0;
  let brotliFiles = 0;
  
  files.forEach(file => {
    if (file.endsWith('.js.gz') || file.endsWith('.css.gz')) {
      gzipFiles++;
    }
    if (file.endsWith('.js.br') || file.endsWith('.css.br')) {
      brotliFiles++;
    }
  });
  
  const gzipPassed = gzipFiles > 0;
  const brotliPassed = brotliFiles > 0;
  
  logTest('Gzip compression files exist', gzipPassed, `${gzipFiles} gzip files found`);
  logTest('Brotli compression files exist', brotliPassed, `${brotliFiles} brotli files found`);
  
  return gzipPassed && brotliPassed;
}

// Test 4: Check image optimization
function testImageOptimization() {
  logSection('Testing Image Optimization');
  
  const assetsPath = path.join(__dirname, '../dist/assets');
  if (!fs.existsSync(assetsPath)) {
    logTest('Optimized images exist', false, 'Assets directory not found');
    return false;
  }
  
  const files = fs.readdirSync(assetsPath);
  let optimizedImages = 0;
  let largeImages = 0;
  
  files.forEach(file => {
    if (file.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
      const filePath = path.join(assetsPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.size <= TEST_CONFIG.thresholds.maxImageSize) {
        optimizedImages++;
      } else {
        largeImages++;
      }
    }
  });
  
  const passed = optimizedImages > 0 && largeImages === 0;
  
  logTest(
    'Images are optimized',
    passed,
    `${optimizedImages} optimized images, ${largeImages} large images`
  );
  
  return passed;
}

// Test 5: Check asset organization
function testAssetOrganization() {
  logSection('Testing Asset Organization');
  
  const distPath = path.join(__dirname, '../dist');
  const subdirs = ['assets/js', 'assets/css', 'assets/images', 'assets/fonts'];
  let allExist = true;
  
  subdirs.forEach(subdir => {
    const fullPath = path.join(distPath, subdir);
    const exists = fs.existsSync(fullPath);
    logTest(`Directory exists: ${subdir}`, exists);
    if (!exists) allExist = false;
  });
  
  return allExist;
}

// Test 6: Check for CDN-ready configuration
function testCDNConfiguration() {
  logSection('Testing CDN Configuration');
  
  const vercelConfigPath = path.join(__dirname, '../vercel.json');
  const exists = fs.existsSync(vercelConfigPath);
  
  if (!exists) {
    logTest('Vercel configuration exists', false, 'vercel.json not found');
    return false;
  }
  
  const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  
  const hasHeaders = config.headers && config.headers.length > 0;
  const hasCompression = config.compress === true;
  const hasCacheControl = config.headers && config.headers.some(h => 
    h.headers && h.headers.some(header => header.key === 'Cache-Control')
  );
  
  logTest('Vercel configuration has headers', hasHeaders);
  logTest('Vercel configuration has compression', hasCompression);
  logTest('Vercel configuration has cache control', hasCacheControl);
  
  return hasHeaders && hasCompression && hasCacheControl;
}

// Test 7: Check HTML optimization
function testHTMLOptimization() {
  logSection('Testing HTML Optimization');
  
  const indexPath = path.join(__dirname, '../dist/index.html');
  const exists = fs.existsSync(indexPath);
  
  if (!exists) {
    logTest('Index HTML exists', false, 'index.html not found');
    return false;
  }
  
  const html = fs.readFileSync(indexPath, 'utf8');
  
  const hasPreload = html.includes('rel="preload"');
  const hasPreconnect = html.includes('rel="preconnect"');
  const hasDNS = html.includes('rel="dns-prefetch"');
  const hasCompressionDetection = html.includes('CompressionStream');
  
  logTest('HTML has preload directives', hasPreload);
  logTest('HTML has preconnect directives', hasPreconnect);
  logTest('HTML has DNS prefetch', hasDNS);
  logTest('HTML has compression detection', hasCompressionDetection);
  
  return hasPreload && hasPreconnect && hasDNS && hasCompressionDetection;
}

// Main test runner
function runTests() {
  log('Starting Frende Frontend Performance Tests', 'blue');
  log(`Base URL: ${TEST_CONFIG.baseUrl}`, 'yellow');
  
  const tests = [
    { name: 'Build Directory', fn: testBuildDirectory },
    { name: 'Bundle Sizes', fn: testBundleSizes },
    { name: 'Compression', fn: testCompression },
    { name: 'Image Optimization', fn: testImageOptimization },
    { name: 'Asset Organization', fn: testAssetOrganization },
    { name: 'CDN Configuration', fn: testCDNConfiguration },
    { name: 'HTML Optimization', fn: testHTMLOptimization }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  tests.forEach(test => {
    try {
      const result = test.fn();
      if (result) passedTests++;
    } catch (error) {
      log(`Error in ${test.name}: ${error.message}`, 'red');
    }
  });
  
  logSection('Test Results');
  log(`Passed: ${passedTests}/${totalTests}`, passedTests === totalTests ? 'green' : 'red');
  
  if (passedTests === totalTests) {
    log('All tests passed! 🎉', 'green');
    process.exit(0);
  } else {
    log('Some tests failed. Please review the issues above.', 'red');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testBuildDirectory,
  testBundleSizes,
  testCompression,
  testImageOptimization,
  testAssetOrganization,
  testCDNConfiguration,
  testHTMLOptimization
};
