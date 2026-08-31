/// <reference types="node" />
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './Test-Prod',
  
  // Timeout per test
  timeout: 30_000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5_000,
  },

  retries: (globalThis as any).process?.env?.CI ? 2 : 0,
  workers: (globalThis as any).process?.env?.CI ? 4 : 1,
  
  // Reporter
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  // Global settings for all tests
  use: {
    // Screenshots on failure
    screenshot: 'only-on-failure',
    
    // Video on failure  
    video: 'retain-on-failure',
    
    // Trace on retry
    trace: 'on-first-retry',
  },
  
  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});