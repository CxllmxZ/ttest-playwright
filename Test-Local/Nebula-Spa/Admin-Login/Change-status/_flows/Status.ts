import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // === SETUP ===
  await page.goto('http://localhost:8787/admin/login?callbackUrl=%2Fadmin');
  
  // === PER TEST ===
  
  // === DATA ===
  await page.getByRole('button', { name: 'บันทึก' }).click();
});