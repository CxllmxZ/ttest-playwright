import type { Locator, Page } from '@playwright/test';

export const bookingsLocators: Array<(page: Page, value?: string) => Locator> = [
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }),
  (page) => page.getByRole('textbox', { name: 'ชื่อ-นามสกุล' }),
  (page) => page.getByRole('textbox', { name: 'เบอร์โทร' }),
];
