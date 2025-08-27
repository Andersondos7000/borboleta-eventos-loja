import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.VITE_APP_ENV = 'test';
  
  // Disable console warnings for cleaner test output
  if (process.env.JEST_SILENT !== 'false') {
    console.warn = jest.fn();
  }
  
  // Setup fake timers globally
  jest.useFakeTimers();
  
  // Create test database if needed (for integration tests)
  try {
    // This would typically start a test Supabase instance
    // For now, we'll just ensure the test environment is ready
    console.log('✅ Test environment configured');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
  
  // Setup performance monitoring for tests
  global.testStartTime = Date.now();
  
  console.log('✅ Global test setup completed');
}