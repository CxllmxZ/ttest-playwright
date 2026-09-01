import { test, expect } from '@playwright/test';

test.describe('Nebula Production - Booking Flow', () => {
  test('Customer A books', async ({ page }) => {
    await page.goto('https://nebula-spa.bimav.workers.dev/book');
    
    // Select service
    await page.getByRole('button', { name: 'นวดไทย ฿ 350 60 นาที' }).click();
    
    // Select date (Monday 31 Aug)
    await page.getByRole('button', { name: 'วันพฤหัสบดีที่ 3 กันยายน' }).click();
    
    // Select time (12:00)
    await page.getByRole('button', { name: '18:00' }).click();
    
    // Fill customer info
    await page.getByRole('textbox', { name: 'ชื่อ-นามสกุล' }).fill('Customer A');
    await page.getByRole('textbox', { name: 'เบอร์โทร' }).fill('0811111111');
    
    // Submit
    await page.getByRole('button', { name: 'ยืนยันการจอง →' }).click();
    
    // Verify redirect to confirmation page
    await expect(page).toHaveURL(/\/book\/[a-zA-Z0-9]{6}/);
  });
});