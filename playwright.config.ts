/// <reference types="node" />
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['Test-Prod/**/*.spec.ts', 'Test-Local/**/*.spec.ts'],
  
  timeout: 30_000,
  
  expect: {
    timeout: 5_000,
  },
  
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 1,
  
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});