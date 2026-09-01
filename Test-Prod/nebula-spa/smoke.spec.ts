import { test, expect } from '@playwright/test';

test.describe('Nebula Production - Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('https://nebula-spa.bimav.workers.dev');
    
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page).toHaveURL(/nebula-spa.bimav.workers.dev/);
    await expect(page.locator('body')).toBeVisible();
  });
});