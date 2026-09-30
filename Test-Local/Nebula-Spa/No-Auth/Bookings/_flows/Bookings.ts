import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // === SETUP ===
  await page.goto('http://localhost:8787/');

  // === PER TEST ===
  await page.locator('#top').getByRole('link', { name: 'จองเลย →' }).click();
 
  // === DATA ===
  await page.getByRole('button', { name: 'ยืนยันการจอง →' }).click();
  await page.getByRole('link', { name: 'กลับหน้าแรก' }).click();
});