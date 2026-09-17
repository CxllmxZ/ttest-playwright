import {
  test,
  expect,
  Page,
} from '@playwright/test';

import {
  dashboardSearchTestCases,
} from './dashboard-search.data';

import {
  applySearchControl,
} from './dashboard-search.helper';

import { verifySearchResult } from '../../_shared/verify-helpers';

const APPLICATION_URL =
  'https://apps-uat.tokiomarinesafety.co.th/wfe/';

/**
 * รอ Loading ของ WEF หาย
 */
async function waitForLoading(
  page: Page
): Promise<void> {
  const loadingBackdrop = page.locator(
    '.loading-backdrop'
  );

  if (await loadingBackdrop.count()) {
    await expect(loadingBackdrop).toBeHidden({
      timeout: 30_000,
    });
  }
}

/**
 * เข้า WEF Dashboard
 *
 * Flow:
 * 1. เปิด WEF
 * 2. เลือก TMSTH Staff
 * 3. เลือก Hongqi
 * 4. กดเข้าสู่ระบบ
 * 5. รอ Dashboard
 */
async function enterWefDashboard(
  page: Page
): Promise<void> {
  await page.goto(APPLICATION_URL);

  // ตรวจว่า Microsoft Authentication ยังทำงานอยู่
  await expect(page).not.toHaveURL(
    /login\.microsoftonline\.com/i
  );

  // เลือก TMSTH Staff
  const staffRole = page.getByText(
    'TMSTH Staff สำหรับพนักงานบริษัท',
    {
      exact: true,
    }
  );

  await expect(staffRole).toBeVisible({
    timeout: 30_000,
  });

  await staffRole.click();

  // รอหน้าเลือก Brand
  await expect(page).toHaveURL(
    /select-brand/i,
    {
      timeout: 30_000,
    }
  );

  // เปิด Brand Dropdown
  const brandDropdown = page.locator(
    '.ng-input'
  );

  await expect(brandDropdown).toBeVisible({
    timeout: 10_000,
  });

  await brandDropdown.click();

  // เลือก Hongqi
  const hongqiOption = page.getByRole(
    'option',
    {
      name: 'Hongqi',
      exact: true,
    }
  );

  await expect(hongqiOption).toBeVisible({
    timeout: 10_000,
  });

  await hongqiOption.click();

  // กดเข้าสู่ระบบ
  const loginButton = page.getByRole(
    'button',
    {
      name: 'เข้าสู่ระบบ',
    }
  );

  await expect(loginButton).toBeVisible({
    timeout: 10_000,
  });

  await loginButton.click();

  await waitForLoading(page);

  // ปิด Popup หลัง Login ถ้ามี
  const closeButton = page.getByRole(
    'button',
    {
      name: 'ปิด',
      exact: true,
    }
  );

  const closeButtonVisible = await closeButton
    .isVisible({
      timeout: 5_000,
    })
    .catch(() => false);

  if (closeButtonVisible) {
    await closeButton.click();

    await expect(closeButton).toBeHidden({
      timeout: 10_000,
    });
  }

  // ตรวจว่าเข้า Dashboard แล้ว
  await expect(page).toHaveURL(
    /dashboard/i,
    {
      timeout: 30_000,
    }
  );

  // ตรวจว่าหน้าค้นหาพร้อมใช้งาน
  await expect(
    page.getByRole('button', {
      name: /ล้างค่า/,
    })
  ).toBeVisible({
    timeout: 30_000,
  });

  await expect(
    page.getByRole('button', {
      name: /ค้นหา/,
    })
  ).toBeVisible({
    timeout: 30_000,
  });
}

/**
 * กดปุ่มล้างค่า
 */
async function clearSearchFilters(
  page: Page
): Promise<void> {
  const clearButton = page.getByRole(
    'button',
    {
      name: /ล้างค่า/,
    }
  );

  await expect(clearButton).toBeVisible({
    timeout: 10_000,
  });

  await clearButton.click();

  await waitForLoading(page);
}

/**
 * กดปุ่มค้นหา
 */
async function clickSearch(
  page: Page
): Promise<void> {
  const searchButton = page.getByRole(
    'button',
    {
      name: /ค้นหา/,
    }
  );

  await expect(searchButton).toBeVisible({
    timeout: 10_000,
  });

  await searchButton.click();

  await waitForLoading(page);
}

/**
 * Dashboard Search Tests
 */
test.describe('Dashboard Search', () => {
  /**
   * ก่อนทุก Test Case:
   *
   * เปิด WEF
   * → เลือก Staff
   * → เลือก Hongqi
   * → เข้า Dashboard
   */
  test.beforeEach(async ({ page }) => {
    await enterWefDashboard(page);
  });

  /**
   * สร้าง Test จาก dashboard-search.data.ts
   */
  for (
    const testData of dashboardSearchTestCases
  ) {
    test(
      `${testData.testCaseId} - ${testData.scenario}`,
      async ({ page }) => {
        /**
         * Step 1:
         * ล้าง Search Filters
         */
        await test.step(
          'Clear search filters',
          async () => {
            await clearSearchFilters(page);
          }
        );

        /**
         * Step 2:
         * ค้นหาแบบไม่ใส่ Filter
         *
         * ทำเฉพาะเมื่อ:
         * runInitialSearch = true
         */
        if (testData.runInitialSearch) {
          await test.step(
            'Run initial search with empty filters',
            async () => {
              await clickSearch(page);
            }
          );
        }

        /**
         * Step 3:
         * กรอก Textbox, Date หรือเลือก Dropdown
         *
         * Helper จะตรวจจาก:
         * testData.control.controlType
         */
        await test.step(
          [
            'Apply search control',
            `type=${testData.control.controlType}`,
            `value=${testData.control.value}`,
          ].join(', '),
          async () => {
            await applySearchControl(
              page,
              testData
            );
          }
        );

        /**
         * Step 4:
         * กดค้นหา
         */
        await test.step(
          'Click Search button',
          async () => {
            await clickSearch(page);
          }
        );

        /**
         * Step 5:
         * ตรวจผลลัพธ์
         */
        await test.step(
          'Verify search result',
          async () => {
            await verifySearchResult(page, {
              expectedText: testData.expectedText,
            });
          }
        );
      }
    );
  }
});