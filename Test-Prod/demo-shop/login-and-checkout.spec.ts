import { test, expect } from '@playwright/test';

test.describe('Sauce Demo - E-commerce Flow', () => {
  test('login and add to cart', async ({ page }) => {
    // Login
    await page.goto('https://www.saucedemo.com/');
    await page.locator('#user-name').fill('standard_user');
    await page.locator('#password').fill('secret_sauce');
    await page.locator('#login-button').click();
    
    // Verify redirect to inventory
    await expect(page).toHaveURL(/inventory/);
    
    // Add first product to cart
    await page.locator('.btn_inventory').first().click();
    
    // Verify cart has 1 item
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
    
    // Go to cart
    await page.locator('.shopping_cart_link').click();
    
    // Verify on cart page
    await expect(page).toHaveURL(/cart/);
  });
});