import { test, expect } from '@playwright/test';

test.describe('Wikipedia', () => {
  test('search functionality works', async ({ page }) => {
    await page.goto('https://www.wikipedia.org');
    
    await page.locator('#searchInput').fill('Playwright');
    await page.getByRole('button', { name: 'Search' }).click();
    
    await page.waitForSelector('#firstHeading');
    
    await expect(page).toHaveURL(/Playwright/);
    await expect(page.locator('#firstHeading')).toBeVisible();
  });
});