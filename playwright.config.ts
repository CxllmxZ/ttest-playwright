// <reference types="node" />

import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

const authType = process.env.AUTH_TYPE?.toLowerCase() ?? 'none';

const authStatePath = process.env.AUTH_STATE_PATH
  ? path.resolve(process.env.AUTH_STATE_PATH)
  : undefined;

// AUTH_KIND is only relevant for form authentication.
// Microsoft always uses storageState mechanism.
const authKind = (
  process.env.AUTH_KIND ?? 'storageState'
).toLowerCase();

let storageState: string | undefined;

if (authType === 'microsoft' || authType === 'form') {
  if (!authStatePath) {
    throw new Error(
      `AUTH_STATE_PATH is required when AUTH_TYPE is ${authType}.`
    );
  }

  if (!fs.existsSync(authStatePath)) {
    throw new Error(
      [
        `${authType} authentication state was not found.`,
        `Expected: ${authStatePath}`,
        '',
        authType === 'microsoft'
          ? 'Run Authen\\Microsoft\\setup-microsoft-auth.bat first.'
          : 'Run Authen\\Form-Login\\setup-form-auth.bat first.',
      ].join('\n')
    );
  }

  if (authKind === 'storagestate') {
    // Standard Playwright storageState — cookies + localStorage
    storageState = authStatePath;

    console.log(`[AUTH] Type: ${authType} (storageState)`);
    console.log(`[AUTH] State: ${authStatePath}`);
  } else if (authKind === 'sessionstorage') {
    // sessionStorage cannot be injected via storageState config.
    // Requires a custom test fixture using context.addInitScript().
    throw new Error(
      [
        'AUTH_KIND=sessionStorage is not supported at config level.',
        '',
        'sessionStorage is tab-scoped by HTML5 spec and cannot be',
        'loaded via Playwright storageState.',
        '',
        'A custom test fixture that calls context.addInitScript()',
        'is required. This is planned for WEF Dealer support.',
        '',
        `State: ${authStatePath}`,
      ].join('\n')
    );
  } else {
    throw new Error(
      [
        `Unknown AUTH_KIND: ${authKind}`,
        '',
        'Supported values:',
        '- storageState',
        '- sessionStorage',
      ].join('\n')
    );
  }
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