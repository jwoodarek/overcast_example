import { FullConfig } from '@playwright/test';

/**
 * Global Teardown for Playwright Integration Tests
 * 
 * Performs cleanup tasks after running integration tests.
 * Ensures clean state for subsequent test runs.
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for Overcast integration tests...');
  
  try {
    // Perform cleanup tasks here
    // For example: clear test data, reset application state, etc.
    
    // Log test results summary
    console.log('📊 Integration test run completed');
    
    // Clean up any temporary files or resources
    // Note: Playwright automatically cleans up browser instances
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;
