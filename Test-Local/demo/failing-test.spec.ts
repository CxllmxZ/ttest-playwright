import { test, expect } from '@playwright/test';

test.describe('Failing Test (intentional)', () => {
  test('element does not exist — should fail', async ({ page }) => {
    await page.goto('https://example.com');
    
    // This should fail — button doesn't exist
    await page.getByRole('button', { name: 'This button does not exist' }).click({
      timeout: 3000,
    });
  });
});