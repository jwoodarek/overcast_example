import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for Playwright Integration Tests
 * 
 * Performs setup tasks before running integration tests.
 * Ensures the application is ready for testing.
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Overcast integration tests...');
  
  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the development server to be ready
    console.log('⏳ Waiting for development server...');
    await page.goto(config.webServer?.url || 'http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // Verify the application loads correctly
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('✅ Development server is ready');
    
    // Perform any additional setup tasks here
    // For example: seed test data, authenticate test users, etc.
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
