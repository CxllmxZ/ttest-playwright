import { test as setup, expect } from '@playwright/test';

import {
  getFormLoginCredentials,
  saveStorageState,
} from '../../../../Authen/Form-Login/form-auth.helper';

setup('Create Nebula Admin Login authentication session', async ({
  page,
}) => {
  const {
    username,
    password,
    sessionStoragePath,
  } = getFormLoginCredentials();

  // Open Admin Login page
  await page.goto(
    'http://localhost:8787/admin'
  );

  // Fill Admin credentials
  await page
    .getByRole('textbox', { name: 'อีเมล' })
    .fill(username);

  await page
    .getByRole('textbox', { name: 'รหัสผ่าน' })
    .fill(password);

  await page
    .getByRole('button', { name: 'เข้าสู่ระบบ' })
    .click();

  // Verify that Admin Login completed successfully
  await expect(page).not.toHaveURL(/admin\/login/);
  await expect(page).toHaveURL(/\/admin(?!\/login)/);

  // Save session through the shared Form Login helper
  await saveStorageState({
    page,
    outputPath: sessionStoragePath,
  });
});