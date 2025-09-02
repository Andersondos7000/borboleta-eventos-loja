#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Parse command line arguments
const args = process.argv.slice(2);
const isWatch = args.includes('--watch') || args.includes('-w');
const isCoverage = args.includes('--coverage') || args.includes('-c');
const isVerbose = args.includes('--verbose') || args.includes('-v');
const testPattern = args.find(arg => arg.startsWith('--testNamePattern='))?.split('=')[1];
const testFile = args.find(arg => !arg.startsWith('-') && arg.endsWith('.test.ts'));

// Build Jest command
let jestCommand = 'npx jest';

// Add configuration
jestCommand += ' --config jest.config.js';

// Add options based on arguments
if (isWatch) {
  jestCommand += ' --watch';
}

if (isCoverage) {
  jestCommand += ' --coverage';
}

if (isVerbose) {
  jestCommand += ' --verbose';
}

if (testPattern) {
  jestCommand += ` --testNamePattern="${testPattern}"`;
}

if (testFile) {
  jestCommand += ` ${testFile}`;
}

// Environment setup
process.env.NODE_ENV = 'test';
process.env.JEST_SILENT = 'false';

log('🧪 Running Realtime System Tests', 'cyan');
log('=====================================', 'cyan');

if (isWatch) {
  log('👀 Watch mode enabled', 'yellow');
}

if (isCoverage) {
  log('📊 Coverage reporting enabled', 'yellow');
}

if (testFile) {
  log(`🎯 Running specific test: ${testFile}`, 'yellow');
}

if (testPattern) {
  log(`🔍 Test pattern: ${testPattern}`, 'yellow');
}

log('', 'reset');

try {
  // Check if required dependencies are installed
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found. Make sure you\'re in the project root.');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = [
    'jest',
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@testing-library/user-event',
    'fake-indexeddb'
  ];

  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
  );

  if (missingDeps.length > 0) {
    log('❌ Missing required test dependencies:', 'red');
    missingDeps.forEach(dep => log(`   - ${dep}`, 'red'));
    log('\nInstall them with:', 'yellow');
    log(`npm install --save-dev ${missingDeps.join(' ')}`, 'cyan');
    process.exit(1);
  }

  // Run Jest
  log(`🚀 Executing: ${jestCommand}`, 'blue');
  log('', 'reset');
  
  execSync(jestCommand, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  log('', 'reset');
  log('✅ All tests completed successfully!', 'green');
  
  if (isCoverage) {
    log('📊 Coverage report generated in ./coverage/', 'cyan');
    log('   Open ./coverage/lcov-report/index.html to view detailed coverage', 'cyan');
  }

} catch (error) {
  log('', 'reset');
  log('❌ Test execution failed!', 'red');
  
  if (error.status) {
    log(`Exit code: ${error.status}`, 'red');
  }
  
  if (error.message) {
    log(`Error: ${error.message}`, 'red');
  }
  
  log('', 'reset');
  log('💡 Troubleshooting tips:', 'yellow');
  log('   1. Make sure all dependencies are installed: npm install', 'yellow');
  log('   2. Check if TypeScript compilation is working: npm run type-check', 'yellow');
  log('   3. Verify Jest configuration in jest.config.js', 'yellow');
  log('   4. Run with --verbose for more detailed output', 'yellow');
  
  process.exit(1);
}