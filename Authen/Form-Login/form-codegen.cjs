const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('@playwright/test');

async function main() {
  const sessionFilePath = process.argv[2];
  const targetUrl = process.argv[3];
  const mode = (process.argv[4] || 'inspect').toLowerCase();

  validateArguments({ sessionFilePath, targetUrl, mode });

  const resolvedSessionPath = path.resolve(sessionFilePath);
  const sessionData = loadSessionFile(resolvedSessionPath);
  const pattern = detectAuthPattern(sessionData);

  if (mode === 'codegen' && pattern === 'sessionStorage') {
    throw new Error(
      [
        'Full codegen mode is not supported for sessionStorage pattern.',
        '',
        'Playwright CLI --load-storage does not inject sessionStorage.',
        'Use "inspect" mode (Authenticated browser + Pick locators)',
        'or use "Record login and test flow" to record from a clean session.',
      ].join('\n')
    );
  }

  if (pattern === 'sessionStorage') {
    await runSessionStorageInspectMode({
      resolvedSessionPath,
      sessionData,
      targetUrl,
    });
  } else if (mode === 'codegen') {
    await runStorageStateCodegenMode({
      resolvedSessionPath,
      sessionData,
      targetUrl,
    });
  } else {
    await runStorageStateInspectMode({
      resolvedSessionPath,
      sessionData,
      targetUrl,
    });
  }
}

// ===== Pattern detection =====
function detectAuthPattern(sessionData) {
  if (!sessionData || typeof sessionData !== 'object') {
    throw new Error('Session file must contain a JSON object.');
  }

  if (
    typeof sessionData.origin === 'string' &&
    sessionData.items
  ) {
    return 'sessionStorage';
  }

  if (
    Array.isArray(sessionData.cookies) ||
    Array.isArray(sessionData.origins)
  ) {
    return 'storageState';
  }

  throw new Error(
    [
      'Session file format was not recognised.',
      '',
      'Expected either:',
      '- sessionStorage pattern: { origin, items }',
      '- storageState pattern: { cookies, origins }',
    ].join('\n')
  );
}

// ===== sessionStorage inspect mode (WEF Dealer — unchanged) =====
async function runSessionStorageInspectMode({
  resolvedSessionPath,
  sessionData,
  targetUrl,
}) {
  validateSessionStorageFormat({ sessionData, targetUrl });

  const itemCount = Object.keys(sessionData.items).length;

  printLaunchInformation({
    resolvedSessionPath,
    origin: sessionData.origin,
    detail: `Items: ${itemCount}`,
    targetUrl,
    mode: 'sessionStorage / inspect',
  });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: null });

  try {
    await context.addInitScript(
      ({ origin, items }) => {
        if (window.location.origin !== origin) {
          return;
        }
        for (const [key, value] of Object.entries(items)) {
          window.sessionStorage.setItem(key, String(value));
        }
      },
      {
        origin: sessionData.origin,
        items: sessionData.items,
      }
    );

    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    await verifySessionStorageInject({
      page,
      expectedOrigin: sessionData.origin,
      expectedItemCount: itemCount,
    });

    printInspectorReadyMessage();

    await context._enableRecorder({
      language: 'javascript',   // or 'playwright-test'
      mode: 'recording',
    });

    await page.pause();
  } finally {
    await context.close();
    await browser.close();
  }
}

// ===== storageState inspect mode (Nebula NextAuth — unchanged) =====
async function runStorageStateInspectMode({
  resolvedSessionPath,
  sessionData,
  targetUrl,
}) {
  validateStorageStateFormat({ sessionData, targetUrl });

  const cookieCount = (sessionData.cookies || []).length;
  const localStorageCount = (sessionData.origins || []).reduce(
    (sum, o) => sum + (o.localStorage || []).length,
    0
  );

  const savedOrigins = collectOrigins(sessionData);

  printLaunchInformation({
    resolvedSessionPath,
    origin: savedOrigins.join(', ') || '(cookies only)',
    detail: `Cookies: ${cookieCount}, Local Storage: ${localStorageCount}`,
    targetUrl,
    mode: 'storageState / inspect',
  });

  const browser = await chromium.launch({ headless: false });

  const context = await browser.newContext({
    viewport: null,
    storageState: resolvedSessionPath,
  });

  try {
    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    await verifyStorageStateAfterLoad({
      page,
      context,
      expectedCookieCount: cookieCount,
    });

    printInspectorReadyMessage();

    await context._enableRecorder({
      language: 'javascript',   // or 'playwright-test'
      mode: 'recording',
    });

    await page.pause();
  } finally {
    await context.close();
    await browser.close();
  }
}

// ===== storageState codegen mode (Nebula NextAuth — new) =====
async function runStorageStateCodegenMode({
  resolvedSessionPath,
  sessionData,
  targetUrl,
}) {
  validateStorageStateFormat({ sessionData, targetUrl });

  const cookieCount = (sessionData.cookies || []).length;
  const localStorageCount = (sessionData.origins || []).reduce(
    (sum, o) => sum + (o.localStorage || []).length,
    0
  );

  const savedOrigins = collectOrigins(sessionData);

  printLaunchInformation({
    resolvedSessionPath,
    origin: savedOrigins.join(', ') || '(cookies only)',
    detail: `Cookies: ${cookieCount}, Local Storage: ${localStorageCount}`,
    targetUrl,
    mode: 'storageState / codegen',
  });

  console.log('Launching Playwright Codegen with saved session.');
  console.log('Recorder will generate action code as you interact.');
  console.log('');

  await spawnPlaywrightCodegen({
    storageStatePath: resolvedSessionPath,
    targetUrl,
  });
}

function spawnPlaywrightCodegen({
  storageStatePath,
  targetUrl,
}) {
  return new Promise((resolve, reject) => {
    const args = [
      'exec',
      'playwright',
      'codegen',
      `--load-storage=${storageStatePath}`,
      '--target=playwright-test',
      targetUrl,
    ];

    const child = spawn('pnpm', args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', (error) => {
      reject(
        new Error(
          `Failed to launch Playwright Codegen: ${error.message}`
        )
      );
    });

    child.on('exit', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(
          new Error(`Playwright Codegen exited with code ${code}`)
        );
      }
    });
  });
}

// ===== Validation =====
function validateArguments({ sessionFilePath, targetUrl, mode }) {
  if (!sessionFilePath) {
    throw new Error('Session file path is required.');
  }
  if (!targetUrl) {
    throw new Error('Target URL is required.');
  }

  if (mode !== 'inspect' && mode !== 'codegen') {
    throw new Error(
      `Unknown mode: ${mode}. Expected "inspect" or "codegen".`
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    throw new Error(`Invalid target URL: ${targetUrl}`);
  }

  if (
    parsedUrl.protocol !== 'http:' &&
    parsedUrl.protocol !== 'https:'
  ) {
    throw new Error('Target URL must use http or https.');
  }
}

function validateSessionStorageFormat({ sessionData, targetUrl }) {
  if (
    !sessionData.origin ||
    typeof sessionData.origin !== 'string'
  ) {
    throw new Error('Session Storage origin is required.');
  }

  if (
    !sessionData.items ||
    typeof sessionData.items !== 'object' ||
    Array.isArray(sessionData.items)
  ) {
    throw new Error('Session Storage items must be an object.');
  }

  if (Object.keys(sessionData.items).length === 0) {
    throw new Error('Session Storage items are empty.');
  }

  let savedOrigin;
  try {
    savedOrigin = new URL(sessionData.origin).origin;
  } catch {
    throw new Error(
      `Invalid Session Storage origin: ${sessionData.origin}`
    );
  }

  const targetOrigin = new URL(targetUrl).origin;

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

function validateStorageStateFormat({ sessionData, targetUrl }) {
  const hasCookies =
    Array.isArray(sessionData.cookies) &&
    sessionData.cookies.length > 0;

  const hasLocalStorage = (sessionData.origins || []).some(
    (o) =>
      Array.isArray(o.localStorage) &&
      o.localStorage.length > 0
  );

  if (!hasCookies && !hasLocalStorage) {
    throw new Error(
      'storageState file has no cookies or localStorage entries.'
    );
  }

  const targetOrigin = new URL(targetUrl).origin;
  const targetHostname = new URL(targetUrl).hostname;

  const cookieHosts = (sessionData.cookies || []).map(
    (c) => c.domain || ''
  );

  const localStorageOrigins = (sessionData.origins || []).map(
    (o) => {
      try {
        return new URL(o.origin).origin;
      } catch {
        return o.origin;
      }
    }
  );

  const originMatches = localStorageOrigins.some(
    (o) => o === targetOrigin
  );

  const cookieMatches = cookieHosts.some((h) => {
    if (!h) return false;
    const normalised = h.startsWith('.') ? h.slice(1) : h;
    return (
      targetHostname === normalised ||
      targetHostname.endsWith('.' + normalised)
    );
  });

  if (!originMatches && !cookieMatches) {
    console.warn('');
    console.warn(
      '[WARNING] Target URL does not match any saved cookie domain or origin.'
    );
    console.warn(`Target: ${targetOrigin}`);
    console.warn(
      `Saved origins: ${
        localStorageOrigins.join(', ') || '(none)'
      }`
    );
    console.warn(
      `Saved cookie domains: ${
        cookieHosts.join(', ') || '(none)'
      }`
    );
    console.warn('The session may not apply on this URL.');
    console.warn('');
  }
}

// ===== Verification =====
async function verifySessionStorageInject({
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
        originMatches: window.location.origin === origin,
      };
    },
    { origin: expectedOrigin }
  );

  console.log(`[AUTH] Current origin: ${verification.currentOrigin}`);
  console.log(`[AUTH] Injected items: ${verification.itemCount}`);
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

  if (verification.itemCount < expectedItemCount) {
    console.warn(
      `[WARNING] Fewer items in browser (${verification.itemCount}) than saved file (${expectedItemCount}).`
    );
  }
}

async function verifyStorageStateAfterLoad({
  page,
  context,
  expectedCookieCount,
}) {
  const cookies = await context.cookies();
  const currentOrigin = new URL(page.url()).origin;

  console.log(`[AUTH] Current origin: ${currentOrigin}`);
  console.log(`[AUTH] Loaded cookies: ${cookies.length}`);

  if (cookies.length > 0) {
    console.log(
      `[AUTH] Cookie names: ${cookies.map((c) => c.name).join(', ')}`
    );
  }

  if (cookies.length === 0 && expectedCookieCount > 0) {
    console.warn(
      `[WARNING] No cookies loaded (expected ${expectedCookieCount}). Session may not apply.`
    );
  }
}

// ===== Utilities =====
function loadSessionFile(sessionFilePath) {
  if (!fs.existsSync(sessionFilePath)) {
    throw new Error(`Session file was not found: ${sessionFilePath}`);
  }

  const content = fs.readFileSync(sessionFilePath, 'utf8');

  if (!content.trim()) {
    throw new Error(`Session file is empty: ${sessionFilePath}`);
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      [
        'Session file contains invalid JSON.',
        '',
        `File: ${sessionFilePath}`,
        `Details: ${error.message}`,
      ].join('\n')
    );
  }
}

function collectOrigins(storageStateData) {
  const origins = new Set();

  (storageStateData.origins || []).forEach((o) => {
    if (o.origin) {
      try {
        origins.add(new URL(o.origin).origin);
      } catch {
        origins.add(o.origin);
      }
    }
  });

  return Array.from(origins);
}

function printLaunchInformation({
  resolvedSessionPath,
  origin,
  detail,
  targetUrl,
  mode,
}) {
  console.log('==========================================');
  console.log('  Form Login Authenticated Browser');
  console.log('==========================================');
  console.log('');
  console.log(`Mode:    ${mode}`);
  console.log(`Session: ${resolvedSessionPath}`);
  console.log(`Origin:  ${origin}`);
  console.log(`Detail:  ${detail}`);
  console.log(`URL:     ${targetUrl}`);
  console.log('');
}

function printInspectorReadyMessage() {
  console.log('');
  console.log('[AUTH] Session applied successfully.');
  console.log('');
  console.log('Playwright Inspector is opening.');
  console.log('');
  console.log('Available actions:');
  console.log('- Pick Locator');
  console.log('- Inspect elements');
  console.log('- Run commands manually');
  console.log('- Verify the authenticated page');
  console.log('');
  console.log('Note: This is not the full Playwright Codegen recorder.');
  console.log(
    'For full recording on storageState pattern, use "codegen" mode.'
  );
  console.log('');
  console.log(
    'Close the Inspector or click Resume when finished.'
  );
  console.log('');
}

main().catch((error) => {
  console.error('');
  console.error('[ERROR] Form authenticated browser failed.');
  console.error('');
  console.error(
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});