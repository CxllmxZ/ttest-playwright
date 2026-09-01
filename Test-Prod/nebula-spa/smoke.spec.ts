import { test, expect } from '@playwright/test';

test.describe('Nebula Localhost - Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('https://nebula-spa.bimav.workers.dev');
    
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page).toHaveURL(/localhost:8787/);
    await expect(page.locator('body')).toBeVisible();
  });
});