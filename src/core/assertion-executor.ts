import { expect, type Page } from 'playwright/test';
import type { Assertion } from './types.js';
import { resolveLocator } from './locator-resolver.js';

/**
 * Execute single assertion on page
 */
export async function executeAssertion(
  assertion: Assertion,
  page: Page
): Promise<void> {
  switch (assertion.type) {
    case 'visible':
      await expect(resolveLocator(assertion.locator, page)).toBeVisible({
        timeout: assertion.timeout ?? 5_000,
      });
      break;

    case 'url_matches':
      // Convert pattern → RegExp (support both regex string and substring)
      const pattern = new RegExp(assertion.pattern);
      await expect(page).toHaveURL(pattern);
      break;

    case 'text_contains':
      await expect(
        resolveLocator(assertion.locator, page)
      ).toContainText(assertion.value);
      break;

    default:
      throw new Error(
        `Unknown assertion: ${(assertion as any).type}`
      );
  }
}