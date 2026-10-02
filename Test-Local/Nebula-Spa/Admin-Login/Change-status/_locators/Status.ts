import type { Locator, Page } from '@playwright/test';

export const statusLocators: Array<(page: Page, value?: string) => Locator> = [
  (page, value) => page.getByRole('button', { name: value }),
  (page) => page.getByRole('combobox', { name: 'เปลี่ยนสถานะ' }),
];