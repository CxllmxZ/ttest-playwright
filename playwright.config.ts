// <reference types="node" />

import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

const authType = process.env.AUTH_TYPE?.toLowerCase() ?? 'none';
const authStatePath = process.env.AUTH_STATE_PATH
  ? path.resolve(process.env.AUTH_STATE_PATH)
  : undefined;

let storageState: string | undefined;

if (authType === 'microsoft') {
  if (!authStatePath) {
    throw new Error(
      'AUTH_STATE_PATH is required when AUTH_TYPE is microsoft.'
    );
  }

  if (!fs.existsSync(authStatePath)) {
    throw new Error(
      [
        'Microsoft authentication state was not found.',
        `Expected: ${authStatePath}`,
        'Run Authen\\Microsoft\\setup-microsoft-auth.bat first.',
      ].join('\n')
    );
  }

  storageState = authStatePath;

  console.log('[AUTH] Type: Microsoft');
  console.log(`[AUTH] State: ${authStatePath}`);
} else {
  console.log(`[AUTH] Type: ${authType}`);
}

export default defineConfig({
  testDir: '.',

  testMatch: [
    'Test-Prod/**/*.spec.ts',
    'Test-Local/**/*.spec.ts',
  ],

  timeout: 30_000,

  expect: {
    timeout: 5_000,
  },

  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 1,

  reporter: [
    [
      'html',
      {
        open: 'never',
        outputFolder: 'playwright-report',
      },
    ],
    ['line'],
  ],

  use: {
    storageState,

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