/// <reference types="node" />

import path from 'node:path';
import { defineConfig } from '@playwright/test';

const repoRoot = path.resolve(
  import.meta.dirname,
  '..',
  '..'
);

export default defineConfig({
  testDir: path.join(repoRoot, 'Test-Local'),

  testMatch: '**/_login/login.setup.ts',

  timeout: 60_000,

  expect: {
    timeout: 10_000,
  },

  retries: 0,
  workers: 1,

  reporter: [['line']],

  use: {
    browserName: 'chromium',
    headless: false,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});