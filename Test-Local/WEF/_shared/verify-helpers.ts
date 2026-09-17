import { expect, Page, Locator } from '@playwright/test';

// ============================================================
// Error message builder
// ============================================================

function buildErrorBox(tag: string, lines: string[]): string {
  const bar = '━'.repeat(60);
  return [
    '',
    bar,
    `  ${tag}`,
    bar,
    ...lines.map(l => `  ${l}`),
    bar,
  ].join('\n');
}

// ============================================================
// Search result verification
// ============================================================

export interface VerifySearchResultOptions {
  tableLocator?: Locator;
  expectedText?: string;
  emptyStateLocator?: Locator;
  timeout?: number;
  debugContentLength?: number;
}

/**
 * ตรวจผลการค้นหา + จำแนก error 3 category:
 * - RESULT TABLE MISSING (UI issue)
 * - SEARCH RETURNED NO DATA (data issue)
 * - SEARCH RESULT MISMATCH (filter logic issue)
 */
export async function verifySearchResult(
  page: Page,
  options: VerifySearchResultOptions = {}
): Promise<void> {
  const {
    tableLocator = page.locator('table').filter({
      has: page.locator('tbody'),
    }),
    expectedText,
    emptyStateLocator = page.getByText('ไม่พบข้อมูล', { exact: true }),
    timeout = 10_000,
    debugContentLength = 500,
  } = options;

  // === Phase 1: Table exists? ===
  const tableCount = await tableLocator.count();

  if (tableCount === 0) {
    throw new Error(
      buildErrorBox('RESULT TABLE MISSING', [
        'Search executed but result table not rendered in UI',
        'This is a UI/rendering issue, not a data issue',
      ])
    );
  }

  await expect(
    tableLocator.first(),
    'Result table not visible after search'
  ).toBeVisible({ timeout });

  // === Phase 2: expected text? ===
  if (!expectedText) return;

  const matchingRows = tableLocator
    .locator('tbody tr')
    .filter({ hasText: expectedText });

  const matchingRowCount = await matchingRows.count();

  if (matchingRowCount === 0) {
    const hasNoData = await emptyStateLocator
      .isVisible()
      .catch(() => false);

    if (hasNoData) {
      throw new Error(
        buildErrorBox('SEARCH RETURNED NO DATA', [
          `Expected: "${expectedText}"`,
          'System responded: "ไม่พบข้อมูล"',
          'This is a DATA issue — record does not exist',
          'Fix: Seed data, or verify search value',
        ])
      );
    }

    const tableContent = await tableLocator
      .first()
      .innerText()
      .catch(() => '(empty)');

    const trimmedContent = tableContent.length > debugContentLength
      ? tableContent.substring(0, debugContentLength) + '\n... (truncated)'
      : tableContent;

    throw new Error(
      buildErrorBox('SEARCH RESULT MISMATCH', [
        `Expected text: "${expectedText}"`,
        'Table has rows but none contain the expected text',
        'This is a SEARCH LOGIC issue — filter did not match',
        '',
        'Table content:',
        trimmedContent,
      ])
    );
  }

  const matched = await matchingRows.first().innerText();
  console.log(`✓ Match found: ${matched}`);
}

// ============================================================
// Empty state verification
// ============================================================

export interface VerifyEmptyStateOptions {
  emptyStateLocator?: Locator;
  timeout?: number;
}

export async function verifyEmptyState(
  page: Page,
  options: VerifyEmptyStateOptions = {}
): Promise<void> {
  const {
    emptyStateLocator = page.getByText('ไม่พบข้อมูล', { exact: true }),
    timeout = 10_000,
  } = options;

  await expect(
    emptyStateLocator,
    'Expected empty state ("ไม่พบข้อมูล") but not shown'
  ).toBeVisible({ timeout });
}

// ============================================================
// Record count verification
// ============================================================

export interface VerifyRecordCountOptions {
  tableLocator?: Locator;
  expectedCount: number;
  timeout?: number;
}

export async function verifyRecordCount(
  page: Page,
  options: VerifyRecordCountOptions
): Promise<void> {
  const {
    tableLocator = page.locator('table').filter({
      has: page.locator('tbody'),
    }),
    expectedCount,
    timeout = 10_000,
  } = options;

  const rows = tableLocator.first().locator('tbody tr');

  await expect(
    rows,
    `Expected ${expectedCount} records but got different count`
  ).toHaveCount(expectedCount, { timeout });
}

// ============================================================
// Field validation error verification
// ============================================================

export interface VerifyFieldErrorOptions {
  /**
   * ชื่อ field (สำหรับ debug message)
   */
  fieldName: string;

  /**
   * ข้อความ error ที่คาดว่าจะแสดง
   */
  expectedMessage: string | RegExp;

  /**
   * Locator ของ error element
   * Default: หา element ที่มี text ตรงกับ expectedMessage
   * ใน common Angular/HTML pattern:
   * - <mat-error>
   * - .invalid-feedback
   * - [role="alert"]
   * - .error-message
   */
  errorLocator?: Locator;

  /**
   * Timeout (ms) — default 5_000
   */
  timeout?: number;
}

/**
 * ตรวจว่า form validation error แสดงตามที่คาด
 * ใช้เมื่อ test case จงใจกรอกข้อมูลผิดเพื่อ trigger validation
 */
export async function verifyFieldError(
  page: Page,
  options: VerifyFieldErrorOptions
): Promise<void> {
  const {
    fieldName,
    expectedMessage,
    errorLocator = page.locator(
      [
        'mat-error',
        '.invalid-feedback',
        '[role="alert"]',
        '.error-message',
        '.field-error',
      ].join(', ')
    ).filter({ hasText: expectedMessage }),
    timeout = 5_000,
  } = options;

  const visible = await errorLocator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    // Collect all visible errors on page for debug
    const allErrors = await page
      .locator('mat-error, .invalid-feedback, [role="alert"], .error-message')
      .allTextContents()
      .catch(() => []);

    const visibleErrors = allErrors.filter(e => e.trim().length > 0);

    throw new Error(
      buildErrorBox('VALIDATION ERROR NOT SHOWN', [
        `Field:    "${fieldName}"`,
        `Expected: ${expectedMessage instanceof RegExp
          ? expectedMessage.toString()
          : `"${expectedMessage}"`}`,
        '',
        'Actual errors on page:',
        visibleErrors.length > 0
          ? visibleErrors.map(e => `  - ${e}`).join('\n')
          : '  (no validation errors visible)',
        '',
        'Cause: App validation logic changed, or message text differs',
      ])
    );
  }
}

// ============================================================
// Success toast/notification verification
// ============================================================

export interface VerifySuccessToastOptions {
  /**
   * ข้อความที่คาดว่าจะเห็นใน toast
   */
  expectedMessage: string | RegExp;

  /**
   * Locator ของ toast container
   * Default: common toast selectors
   */
  toastLocator?: Locator;

  /**
   * Timeout รอ toast ปรากฏ (ms) — default 10_000
   */
  timeout?: number;

  /**
   * รอจน toast หายด้วยหรือไม่ (บาง toast auto-dismiss) — default false
   */
  waitForDismiss?: boolean;
}

/**
 * ตรวจว่ามี success toast/notification แสดง
 * ใช้หลัง action ที่ควร trigger success feedback (save, submit, delete)
 */
export async function verifySuccessToast(
  page: Page,
  options: VerifySuccessToastOptions
): Promise<void> {
  const {
    expectedMessage,
    toastLocator = page.locator(
      [
        '.toast-success',
        '.notification-success',
        '.alert-success',
        '[role="status"]',
        '.swal2-success',
      ].join(', ')
    ).filter({ hasText: expectedMessage }),
    timeout = 10_000,
    waitForDismiss = false,
  } = options;

  const visible = await toastLocator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    // Debug: check ว่ามี toast อื่นแสดงไหม (error, warning, etc.)
    const anyToast = await page
      .locator('[role="alert"], [role="status"], .toast, .notification, .alert')
      .allTextContents()
      .catch(() => []);

    const visibleToasts = anyToast.filter(t => t.trim().length > 0);

    throw new Error(
      buildErrorBox('SUCCESS TOAST NOT SHOWN', [
        `Expected: ${expectedMessage instanceof RegExp
          ? expectedMessage.toString()
          : `"${expectedMessage}"`}`,
        '',
        'Other notifications on page:',
        visibleToasts.length > 0
          ? visibleToasts.map(t => `  - ${t}`).join('\n')
          : '  (none)',
        '',
        'Cause: Action failed silently, or toast selector changed',
      ])
    );
  }

  if (waitForDismiss) {
    await toastLocator
      .first()
      .waitFor({ state: 'hidden', timeout: 15_000 })
      .catch(() => {
        console.log('[WARN] Toast did not auto-dismiss within 15s');
      });
  }
}

// ============================================================
// Navigation verification
// ============================================================

export interface VerifyNavigatedToOptions {
  /**
   * URL pattern ที่คาด — string หรือ RegExp
   */
  urlPattern: string | RegExp;

  /**
   * Context สำหรับ error message (เช่น "หลังกด Save")
   */
  actionContext?: string;

  /**
   * Timeout (ms) — default 10_000
   */
  timeout?: number;
}

/**
 * ตรวจว่า navigate ไป URL ที่คาดหลัง action
 * ใช้หลัง click ที่ควรพา user ไปหน้าอื่น
 */
export async function verifyNavigatedTo(
  page: Page,
  options: VerifyNavigatedToOptions
): Promise<void> {
  const {
    urlPattern,
    actionContext,
    timeout = 10_000,
  } = options;

  try {
    await expect(page).toHaveURL(urlPattern, { timeout });
  } catch {
    const currentUrl = page.url();

    throw new Error(
      buildErrorBox('NAVIGATION FAILED', [
        actionContext ? `Context:  ${actionContext}` : '',
        `Expected: ${urlPattern instanceof RegExp
          ? urlPattern.toString()
          : urlPattern}`,
        `Actual:   ${currentUrl}`,
        '',
        'Cause: Action did not trigger navigation, or wrong URL pattern',
      ].filter(Boolean))
    );
  }
}