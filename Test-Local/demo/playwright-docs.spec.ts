import { test, expect } from '@playwright/test';

test.describe('Playwright Docs', () => {
  test('navigation to Get started works', async ({ page }) => {
    await page.goto('https://playwright.dev');
    
    await page.waitForSelector('nav');
    
    await page.getByRole('link', { name: 'Get started' }).click();
    
    await page.waitForSelector('article');
    
    await expect(page).toHaveURL(/intro/);
    await expect(page.locator('article')).toBeVisible();
  });
});