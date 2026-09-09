const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('@playwright/test');

async function main() {
  const targetUrl = process.argv[2];

  if (!targetUrl) {
    console.error('[ERROR] Target URL is required.');
    process.exit(1);
  }

  const profilePath = path.resolve(__dirname, 'profile');
  const statePath = path.resolve(__dirname, 'state.json');

  console.log('==========================================');
  console.log('  Microsoft Authentication Profile');
  console.log('==========================================');
  console.log('');
  console.log(`Profile: ${profilePath}`);
  console.log(`State:   ${statePath}`);
  console.log(`URL:     ${targetUrl}`);
  console.log('');
  console.log('Complete Microsoft sign-in manually.');
  console.log('After the application opens successfully,');
  console.log('return to this window and press Enter.');
  console.log('');

  const context = await chromium.launchPersistentContext(
    profilePath,
    {
      headless: false,
      viewport: null,
      args: ['--start-maximized'],
    }
  );

  const pages = context.pages();

  const page = pages.length > 0
    ? pages[0]
    : await context.newPage();

  await page.goto(targetUrl);

  console.log('Browser opened.');
  console.log('');
  console.log('Instructions:');
  console.log('1. Complete Microsoft authentication.');
  console.log('2. Wait until the application opens.');
  console.log('3. Return to this window.');
  console.log('4. Press Enter to save the authentication state.');
  console.log('');

  await waitForEnter();

  console.log('');
  console.log('Saving authentication state...');

  await context.storageState({
    path: statePath,
    indexedDB: true,
  });

  if (!fs.existsSync(statePath)) {
    throw new Error(
      `Authentication state was not created: ${statePath}`
    );
  }

  console.log(`[SUCCESS] Authentication state saved: ${statePath}`);

  await context.close();

  console.log('[SUCCESS] Microsoft profile was saved.');
}

function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', () => resolve());
  });
}

main().catch((error) => {
  console.error('');
  console.error('[ERROR] Unable to prepare Microsoft authentication.');
  console.error(error);
  process.exit(1);
});