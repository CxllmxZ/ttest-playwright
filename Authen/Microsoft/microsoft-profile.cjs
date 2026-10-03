const path = require('node:path');
const fs = require('node:fs');
const readline = require('node:readline');
const { chromium } = require('@playwright/test');

const LOGIN_HOSTS = /login\.microsoftonline\.com|login\.live\.com|login\.windows\.net|microsoftonline\.us/i;

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

  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  let browserClosed = false;
  context.on('close', () => {
    browserClosed = true;
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto(targetUrl);

  console.log('Browser opened.');
  console.log('');
  console.log('Instructions:');
  console.log('1. Complete Microsoft sign-in (and MFA) in the browser.');
  console.log('2. If asked "Stay signed in?", choose YES.');
  console.log('3. Wait until the application has fully loaded.');
  console.log('4. Come back to THIS window and press Enter.');
  console.log('   Do NOT close the browser yourself - it is closed after saving.');
  console.log('');

  // Wait for Enter; stop early if the user closes the browser instead.
  for (;;) {
    const closedEarly = await Promise.race([
      waitForEnter().then(() => false),
      new Promise((resolve) => context.once('close', () => resolve(true))),
    ]);

    if (closedEarly || browserClosed) {
      console.error('');
      console.error('[ERROR] The browser was closed before the login was saved.');
      console.error('        Run setup-microsoft-auth.bat again, sign in, then press Enter');
      console.error('        in this window while the browser is still open.');
      process.exit(1);
    }

    const current = activePage(context, page);
    if (current && LOGIN_HOSTS.test(current.url())) {
      console.log('');
      console.log('[WAIT] The browser is still on the Microsoft sign-in page:');
      console.log(`       ${current.url()}`);
      console.log('       Finish signing in, wait for the application, then press Enter again.');
      console.log('');
      continue;
    }
    break;
  }

  console.log('');
  console.log('Saving authentication state...');

  const current = activePage(context, page) || page;
  const sessionKeys = await current
    .evaluate(() => Object.keys(sessionStorage))
    .catch(() => []);

  await context.storageState({ path: statePath, indexedDB: true });

  if (!fs.existsSync(statePath) || fs.statSync(statePath).size === 0) {
    throw new Error(`Authentication state was not created: ${statePath}`);
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const cookieCount = state.cookies.length;
  const msCookies = state.cookies.filter((c) => LOGIN_HOSTS.test(c.domain)).length;
  const persistentMs = state.cookies.filter(
    (c) => LOGIN_HOSTS.test(c.domain) && c.expires > 0
  ).length;

  console.log(`[SUCCESS] Authentication state saved: ${statePath}`);
  console.log(`          URL:     ${current.url()}`);
  console.log(`          Cookies: ${cookieCount} (Microsoft sign-in: ${msCookies}, persistent: ${persistentMs})`);

  // Diagnostics for "tests keep asking to log in"
  const msalInSession = sessionKeys.some((k) => /msal|login\.windows\.net|accesstoken|idtoken/i.test(k));
  if (msalInSession) {
    console.log('');
    console.log('[WARNING] This application keeps its Microsoft login in sessionStorage');
    console.log(`          (keys: ${sessionKeys.slice(0, 5).join(', ')}${sessionKeys.length > 5 ? ', ...' : ''}).`);
    console.log('          state.json cannot store sessionStorage, so tests may still be sent');
    console.log('          to the Microsoft sign-in page. Report this - the runner needs');
    console.log('          sessionStorage support for Microsoft login.');
  }
  if (msCookies > 0 && persistentMs === 0) {
    console.log('');
    console.log('[WARNING] Microsoft sign-in cookies expire when the browser closes.');
    console.log('          You probably answered NO to "Stay signed in?".');
    console.log('          Run setup again and answer YES.');
  }

  await context.close();
  console.log('[SUCCESS] Microsoft profile was saved.');
}

// The page that is in front: the app may have opened a new tab during sign-in.
function activePage(context, fallback) {
  const pages = context.pages().filter((p) => !p.isClosed());
  return pages.length ? pages[pages.length - 1] : fallback && !fallback.isClosed() ? fallback : null;
}

function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin });
    rl.once('line', () => {
      rl.close();
      resolve();
    });
  });
}

main().catch((error) => {
  console.error('');
  console.error('[ERROR] Unable to prepare Microsoft authentication.');
  console.error(error);
  process.exit(1);
});
