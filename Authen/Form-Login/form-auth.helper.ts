import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

export type FormLoginCredentials = {
  username: string;
  password: string;
  sessionStoragePath: string;
};

export type SaveSessionStorageOptions = {
  page: Page;
  outputPath: string;
  waitBeforeSave?: number;
};

/**
 * Read Form Login credentials and output path
 * from environment variables prepared by setup-form-auth.ps1.
 */
export function getFormLoginCredentials():
  FormLoginCredentials {
  const username =
    process.env.FORM_LOGIN_USERNAME;

  const password =
    process.env.FORM_LOGIN_PASSWORD;

  const configuredOutputPath =
    process.env.FORM_LOGIN_STATE_PATH;

  if (!username) {
    throw new Error(
      'FORM_LOGIN_USERNAME environment variable is required.'
    );
  }

  if (!password) {
    throw new Error(
      'FORM_LOGIN_PASSWORD environment variable is required.'
    );
  }

  if (!configuredOutputPath) {
    throw new Error(
      'FORM_LOGIN_STATE_PATH environment variable is required.'
    );
  }

  /*
   * Compatibility:
   * If PowerShell still supplies state.json,
   * replace it with session-storage.json.
   *
   * If PowerShell already supplies session-storage.json,
   * use that path directly.
   */
  const sessionStoragePath =
    path.basename(configuredOutputPath).toLowerCase() ===
    'state.json'
      ? path.join(
          path.dirname(configuredOutputPath),
          'session-storage.json'
        )
      : configuredOutputPath;

  return {
    username,
    password,
    sessionStoragePath,
  };
}

/**
 * Read sessionStorage from the authenticated page
 * and save it as JSON for later reuse.
 */
export async function saveSessionStorage({
  page,
  outputPath,
  waitBeforeSave = 1_000,
}: SaveSessionStorageOptions): Promise<void> {
  if (!outputPath) {
    throw new Error(
      'Session Storage output path is required.'
    );
  }

  // Allow the application to finish storing authentication data
  if (waitBeforeSave > 0) {
    await page.waitForTimeout(waitBeforeSave);
  }

  console.log(`[AUTH] Final URL: ${page.url()}`);

  // Read storage metadata without logging sensitive values
  const cookies = await page.context().cookies();

  const localStorageKeys = await page.evaluate(() => {
    return Object.keys(localStorage);
  });

  const sessionStorageEntries =
    await page.evaluate(() => {
      return Object.entries(sessionStorage);
    });

  const sessionStorageKeys =
    sessionStorageEntries.map(([key]) => key);

  console.log(
    `[AUTH] Cookies: ${cookies.length}`
  );

  console.log(
    `[AUTH] Local Storage items: ${localStorageKeys.length}`
  );

  console.log(
    `[AUTH] Session Storage items: ${sessionStorageKeys.length}`
  );

  if (localStorageKeys.length > 0) {
    console.log(
      `[AUTH] Local Storage keys: ${localStorageKeys.join(', ')}`
    );
  }

  if (sessionStorageKeys.length > 0) {
    console.log(
      `[AUTH] Session Storage keys: ${sessionStorageKeys.join(', ')}`
    );
  }

  if (sessionStorageEntries.length === 0) {
    throw new Error(
      [
        'Form Login succeeded, but sessionStorage is empty.',
        '',
        `Final URL: ${page.url()}`,
      ].join('\n')
    );
  }

  const sessionStorageData = {
    origin: new URL(page.url()).origin,
    items: Object.fromEntries(
      sessionStorageEntries
    ),
  };

  fs.mkdirSync(
    path.dirname(outputPath),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      sessionStorageData,
      null,
      2
    ),
    'utf8'
  );

  if (!fs.existsSync(outputPath)) {
    throw new Error(
      `Session Storage file was not created: ${outputPath}`
    );
  }

  const savedFile = fs.statSync(outputPath);

  if (savedFile.size === 0) {
    throw new Error(
      `Session Storage file is empty: ${outputPath}`
    );
  }

  console.log(
    `[AUTH] Session Storage saved: ${outputPath}`
  );
}