import { test, expect } from '@playwright/test';

test.describe('Nebula Spa - Production Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('https://nebula-spa.bimav.workers.dev');
    
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    
    // Verify URL
    await expect(page).toHaveURL(/nebula-spa/);
    
    // Verify body visible
    await expect(page.locator('body')).toBeVisible();
  });
});