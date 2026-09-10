import { test as setup, expect } from '@playwright/test';

import {
  getFormLoginCredentials,
  saveSessionStorage,
} from '../../../../Authen/Form-Login/form-auth.helper';

setup('Create Dealer Login authentication session', async ({
  page,
}) => {
  const {
    username,
    password,
    sessionStoragePath,
  } = getFormLoginCredentials();

  // Open Dealer Login page
  await page.goto(
    'http://localhost:4200/login?type=dealer'
  );

  // Fill Dealer credentials
  await page
    .getByRole('textbox', { name: 'Username' })
    .fill(username);

  await page
    .getByRole('textbox', { name: 'Password' })
    .fill(password);

  await page
    .getByRole('button', { name: 'Login' })
    .click();

  // Select company
  await page.locator('span').first().click();

  await page
    .getByText('HONGQI', { exact: true })
    .click();

  // Enter application
  await page
    .getByRole('button', { name: 'เข้าสู่ระบบ' })
    .click();

  // Wait until application loading finishes
  await expect(
    page.locator('.loading-backdrop')
  ).toBeHidden({
    timeout: 30_000,
  });

  // Verify and close the login result popup
  const closeButton = page.getByRole('button', {
    name: 'ปิด',
  });

  await expect(closeButton).toBeVisible({
    timeout: 10_000,
  });

  await closeButton.click();

  await expect(closeButton).toBeHidden({
    timeout: 10_000,
  });

  // Verify that Dealer Login completed successfully
  await expect(page).not.toHaveURL(
    /login\?type=dealer/
  );

  await expect(page).toHaveURL(
    /dashboard/
  );

  // Save sessionStorage through the shared Form Login helper
  await saveSessionStorage({
    page,
    outputPath: sessionStoragePath,
  });
});