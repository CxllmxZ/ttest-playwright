import { test, expect } from '@playwright/test';

test.describe('TodoMVC', () => {
  test('add and complete todo', async ({ page }) => {
    await page.goto('https://demo.playwright.dev/todomvc');
    
    // Add todo
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Learn Playwright');
    await input.press('Enter');
    
    // Verify todo added
    await expect(page.locator('.todo-list li')).toHaveCount(1);
    await expect(page.locator('.todo-list li')).toContainText('Learn Playwright');
    
    // Complete todo
    await page.locator('.toggle').click();
    
    // Verify marked complete
    await expect(page.locator('.todo-list li')).toHaveClass(/completed/);
  });
});