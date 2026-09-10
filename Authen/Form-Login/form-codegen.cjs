const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

async function main() {
  const sessionStoragePath = process.argv[2];
  const targetUrl = process.argv[3];

  validateArguments({
    sessionStoragePath,
    targetUrl,
  });

  const resolvedSessionPath = path.resolve(
    sessionStoragePath
  );

  const sessionData = loadSessionStorage(
    resolvedSessionPath
  );

  validateSessionData({
    sessionData,
    targetUrl,
  });

  const sessionItemCount = Object.keys(
    sessionData.items
  ).length;

  printLaunchInformation({
    resolvedSessionPath,
    sessionData,
    sessionItemCount,
    targetUrl,
  });

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: null,
  });

  try {
    /*
     * Inject sessionStorage before application scripts run.
     * This script runs before each page navigation.
     */
    await context.addInitScript(
      ({ origin, items }) => {
        if (window.location.origin !== origin) {
          return;
        }

        for (const [key, value] of Object.entries(items)) {
          window.sessionStorage.setItem(
            key,
            String(value)
          );
        }
      },
      {
        origin: sessionData.origin,
        items: sessionData.items,
      }
    );

    const page = await context.newPage();

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
    });

    await verifySessionStorage({
      page,
      expectedOrigin: sessionData.origin,
      expectedItemCount: sessionItemCount,
    });

    console.log('');
    console.log('[AUTH] Session Storage injected successfully.');
    console.log(`[AUTH] Current URL: ${page.url()}`);
    console.log('');
    console.log('Playwright Inspector is opening.');
    console.log('');
    console.log('Available actions:');
    console.log('- Pick Locator');
    console.log('- Inspect elements');
    console.log('- Run commands manually');
    console.log('- Verify the authenticated page');
    console.log('');
    console.log(
      'Note: This is not the full Playwright Codegen recorder.'
    );
    console.log(
      'Use "Record login and test flow" to generate action code.'
    );
    console.log('');
    console.log(
      'Close the Inspector or click Resume when finished.'
    );
    console.log('');

    await page.pause();
  }
  finally {
    await context.close();
    await browser.close();
  }
}

function validateArguments({
  sessionStoragePath,
  targetUrl,
}) {
  if (!sessionStoragePath) {
    throw new Error(
      'Session Storage path is required.'
    );
  }

  if (!targetUrl) {
    throw new Error(
      'Target URL is required.'
    );
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(targetUrl);
  }
  catch {
    throw new Error(
      `Invalid target URL: ${targetUrl}`
    );
  }

  if (
    parsedUrl.protocol !== 'http:' &&
    parsedUrl.protocol !== 'https:'
  ) {
    throw new Error(
      'Target URL must use http or https.'
    );
  }
}

function loadSessionStorage(sessionStoragePath) {
  if (!fs.existsSync(sessionStoragePath)) {
    throw new Error(
      `Session Storage file was not found: ${sessionStoragePath}`
    );
  }

  const fileContent = fs.readFileSync(
    sessionStoragePath,
    'utf8'
  );

  if (!fileContent.trim()) {
    throw new Error(
      `Session Storage file is empty: ${sessionStoragePath}`
    );
  }

  try {
    return JSON.parse(fileContent);
  }
  catch (error) {
    throw new Error(
      [
        'Session Storage file contains invalid JSON.',
        '',
        `File: ${sessionStoragePath}`,
        `Details: ${error.message}`,
      ].join('\n')
    );
  }
}

function validateSessionData({
  sessionData,
  targetUrl,
}) {
  if (
    !sessionData ||
    typeof sessionData !== 'object'
  ) {
    throw new Error(
      'Session Storage data must be an object.'
    );
  }

  if (
    !sessionData.origin ||
    typeof sessionData.origin !== 'string'
  ) {
    throw new Error(
      'Session Storage origin is required.'
    );
  }

  if (
    !sessionData.items ||
    typeof sessionData.items !== 'object' ||
    Array.isArray(sessionData.items)
  ) {
    throw new Error(
      'Session Storage items must be an object.'
    );
  }

  const sessionItemCount = Object.keys(
    sessionData.items
  ).length;

  if (sessionItemCount === 0) {
    throw new Error(
      'Session Storage items are empty.'
    );
  }

  let savedOrigin;

  try {
    savedOrigin = new URL(
      sessionData.origin
    ).origin;
  }
  catch {
    throw new Error(
      `Invalid Session Storage origin: ${sessionData.origin}`
    );
  }

  const targetOrigin = new URL(
    targetUrl
  ).origin;

  if (targetOrigin !== savedOrigin) {
    throw new Error(
      [
        'Target URL origin does not match the saved session origin.',
        '',
        `Saved origin:  ${savedOrigin}`,
        `Target origin: ${targetOrigin}`,
        '',
        'Open a URL that uses the same protocol, host, and port.',
      ].join('\n')
    );
  }

  sessionData.origin = savedOrigin;
}

async function verifySessionStorage({
  page,
  expectedOrigin,
  expectedItemCount,
}) {
  const verification = await page.evaluate(
    ({ origin }) => {
      return {
        currentOrigin: window.location.origin,
        itemCount: window.sessionStorage.length,
        keys: Object.keys(window.sessionStorage),
        originMatches:
          window.location.origin === origin,
      };
    },
    {
      origin: expectedOrigin,
    }
  );

  console.log(
    `[AUTH] Current origin: ${verification.currentOrigin}`
  );

  console.log(
    `[AUTH] Injected items: ${verification.itemCount}`
  );

  console.log(
    `[AUTH] Session Storage keys: ${verification.keys.join(', ')}`
  );

  if (!verification.originMatches) {
    throw new Error(
      [
        'Session Storage was opened on an unexpected origin.',
        '',
        `Expected: ${expectedOrigin}`,
        `Actual:   ${verification.currentOrigin}`,
      ].join('\n')
    );
  }

  if (verification.itemCount === 0) {
    throw new Error(
      'Session Storage injection failed. No items were found.'
    );
  }

  if (
    verification.itemCount < expectedItemCount
  ) {
    console.warn(
      [
        '[WARNING] The browser contains fewer Session Storage',
        'items than the saved session file.',
        `Expected: ${expectedItemCount}`,
        `Actual:   ${verification.itemCount}`,
      ].join(' ')
    );
  }
}

function printLaunchInformation({
  resolvedSessionPath,
  sessionData,
  sessionItemCount,
  targetUrl,
}) {
  console.log('==========================================');
  console.log('  Form Login Authenticated Browser');
  console.log('==========================================');
  console.log('');
  console.log(`Session: ${resolvedSessionPath}`);
  console.log(`Origin:  ${sessionData.origin}`);
  console.log(`Items:   ${sessionItemCount}`);
  console.log(`URL:     ${targetUrl}`);
  console.log('');
}

main().catch((error) => {
  console.error('');
  console.error(
    '[ERROR] Form authenticated browser failed.'
  );

  console.error('');
  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
});