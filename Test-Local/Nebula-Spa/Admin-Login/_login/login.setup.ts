// Form login for this access flow — run by Authen/Form-Login/setup-form-auth.bat
// Credentials come from environment variables set by that script; never write them here.
import { test as setup, expect } from '@playwright/test';
import {
  getFormLoginCredentials,
  saveStorageState,
  // saveSessionStorage,
} from '../../../../Authen/Form-Login/form-auth.helper';

setup('Create form login session', async ({ page }) => {
  // Delete this line after filling in TODO 1–4.
  throw new Error('login.setup.ts is still the unedited template — fill in TODO 1–4 first (doc/GUIDE.md, section 2)');

  const { username, password, sessionStoragePath } = getFormLoginCredentials();

  // TODO 1: the app's login page
  await page.goto('https://app.example.com/login');

  // TODO 2: the login form's fields and submit button
  //         (record them with run-codegen.bat → "Record login and test flow")
  await page.getByRole('textbox', { name: 'Email' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // TODO 3: any steps after sign-in that are needed to reach the app
  //         (e.g. choose a company or role, close a popup), then verify
  //         that login succeeded. On failure the error shows the URL it stayed on.
  await expect(page).not.toHaveURL(/login|signin/i);
  // Optional, stricter: an element only shown after login
  // await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

  // TODO 4: keep ONE of these
  // Cookies / localStorage (most apps, e.g. NextAuth):
  await saveStorageState({ page, outputPath: sessionStoragePath });
  // sessionStorage-based apps:
  // await saveSessionStorage({ page, outputPath: sessionStoragePath });
});