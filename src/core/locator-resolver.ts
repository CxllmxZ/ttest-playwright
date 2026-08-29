import type { Page, Locator as PlaywrightLocator } from 'playwright';
import type { Locator } from './types.js';

/**
 * Convert ttest Locator (from YAML) → Playwright Locator
 */
export function resolveLocator(
  locator: Locator,
  page: Page
): PlaywrightLocator {
  if ('role' in locator) {
    return page.getByRole(locator.role as any, {
      name: locator.name,
      exact: locator.exact,
    });
  }

  if ('text' in locator) {
    return page.getByText(locator.text, {
      exact: locator.exact,
    });
  }

  if ('css' in locator) {
    return page.locator(locator.css);
  }

  throw new Error(`Unknown locator type: ${JSON.stringify(locator)}`);
}