import type { Page } from 'playwright';
import type { Action } from './types.js';
import { resolveLocator } from './locator-resolver.js';

/**
 * Execute single action on page
 */
export async function executeAction(
  action: Action,
  page: Page
): Promise<void> {
  switch (action.action) {
    case 'goto':
      await page.goto(action.target, {
        waitUntil: action.wait_until ?? 'domcontentloaded',
      });
      break;

    case 'click':
      await resolveLocator(action.locator, page).click({
        timeout: action.timeout,
      });
      break;

    case 'fill':
      await resolveLocator(action.locator, page).fill(action.value);
      break;

    case 'wait_for':
      await resolveLocator(action.locator, page).waitFor({
        state: action.state ?? 'visible',
        timeout: action.timeout ?? 30_000,
      });
      break;

    default:
      throw new Error(
        `Unknown action: ${(action as any).action}`
      );
  }
}