#!/usr/bin/env node

/**
 * Tree Shaking Analyzer for Frende Frontend
 * Helps identify unused dependencies and code that can be removed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const PACKAGE_JSON = path.join(__dirname, '../package.json');

/**
 * Get all JavaScript/JSX files recursively
 */
function getAllJsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      getAllJsFiles(fullPath, files);
    } else if (stat.isFile() && /\.(js|jsx)$/.test(item)) {
      files.push(fullPath);
    }
  });
  
  return files;
}

/**
 * Extract imports from a file
 */
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  
  // Match ES6 imports
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip relative imports for now
    if (!importPath.startsWith('.')) {
      imports.push(importPath);
    }
  }
  
  return imports;
}

/**
 * Check if a dependency is used in the codebase
 */
function isDependencyUsed(dependency, allImports) {
  return allImports.some(importPath => {
    // Check exact match
    if (importPath === dependency) return true;
    
    // Check if it's a subpath import
    if (importPath.startsWith(dependency + '/')) return true;
    
    return false;
  });
}

/**
 * Analyze tree shaking opportunities
 */
function analyzeTreeShaking() {
  console.log('🌳 Analyzing Tree Shaking Opportunities...\n');
  
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  // Get all JS files
  const jsFiles = getAllJsFiles(SRC_DIR);
  console.log(`📁 Found ${jsFiles.length} JavaScript/JSX files\n`);
  
  // Extract all imports
  const allImports = [];
  jsFiles.forEach(file => {
    const imports = extractImports(file);
    allImports.push(...imports);
  });
  
  // Remove duplicates
  const uniqueImports = [...new Set(allImports)];
  
  console.log('📦 Dependencies Analysis:\n');
  
  const unusedDeps = [];
  const usedDeps = [];
  
  Object.keys(dependencies).forEach(dep => {
    if (isDependencyUsed(dep, uniqueImports)) {
      usedDeps.push(dep);
    } else {
      unusedDeps.push(dep);
    }
  });
  
  console.log(`✅ Used Dependencies (${usedDeps.length}):`);
  usedDeps.forEach(dep => {
    console.log(`  - ${dep}`);
  });
  
  console.log(`\n❌ Potentially Unused Dependencies (${unusedDeps.length}):`);
  if (unusedDeps.length > 0) {
    unusedDeps.forEach(dep => {
      console.log(`  - ${dep}`);
    });
    console.log('\n💡 Consider removing these dependencies if they are truly unused.');
  } else {
    console.log('  None found! 🎉');
  }
  
  // Analyze import patterns
  console.log('\n📊 Import Analysis:');
  
  const importCounts = {};
  allImports.forEach(importPath => {
    importCounts[importPath] = (importCounts[importPath] || 0) + 1;
  });
  
  const sortedImports = Object.entries(importCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  console.log('\n🔝 Most Imported Dependencies:');
  sortedImports.forEach(([dep, count]) => {
    console.log(`  ${dep}: ${count} imports`);
  });
  
  // Check for large dependencies
  console.log('\n⚠️  Large Dependencies to Monitor:');
  const largeDeps = [
    'react', 'react-dom', 'socket.io-client', 'axios',
    '@radix-ui/react-dialog', '@radix-ui/react-slot',
    '@heroicons/react', 'lucide-react'
  ];
  
  largeDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`  - ${dep}: ${dependencies[dep]}`);
    }
  });
  
  console.log('\n💡 Tree Shaking Recommendations:');
  console.log('  1. Use ES6 imports/exports consistently');
  console.log('  2. Avoid importing entire libraries when possible');
  console.log('  3. Use dynamic imports for code splitting');
  console.log('  4. Consider using smaller alternatives for large dependencies');
  console.log('  5. Regularly audit and remove unused dependencies');
  
  console.log('\n✅ Tree shaking analysis complete!');
}

// Run analysis
analyzeTreeShaking();
