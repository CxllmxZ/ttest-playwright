import { test, expect } from '@playwright/test';

const bookingStatusTestCases = [
  {
    testCaseId: 'TC-BOOKING-STATUS-001',
    monthLabel: 'Sep 2026',
    bookingIndex: 0,
    // ⚠️ ISSUE #1: Radix auto-generated ID — เปลี่ยนทุก render, test จะ flaky
    // TODO: replace ด้วย role/text ของ radio option (เช่น { role: 'radio', name: 'ยืนยันแล้ว' })
    statusOptionSelector: '#radix-_r_p_',
    expectedStatusText: 'ยืนยันแล้ว', // TODO: ปรับตาม status label จริง
  },
];

test.describe('Admin Booking Status Change', () => {
  for (const testData of bookingStatusTestCases) {
    test(
      `${testData.testCaseId} Change booking status in ${testData.monthLabel} successfully`,
      async ({ page }) => {
        // Open admin
        await page.goto('http://localhost:8787/admin');

        // Verify session is applied (not redirected to login)
        await expect(page).not.toHaveURL(/admin\/login/);

        // Open Booking menu
        const bookingLink = page.getByRole('link', {
          name: 'การจอง',
          exact: true,
        });

        await expect(bookingLink).toBeVisible();
        await bookingLink.click();

        // Select booking cell from calendar
        // ⚠️ ISSUE #2: cell selector by month name = ambiguous
        //             (ทุก booking ใน Sep 2026 มี name เดียวกัน)
        const monthCell = page
          .getByRole('cell', { name: testData.monthLabel })
          .nth(testData.bookingIndex);

        await expect(monthCell).toBeVisible();
        await monthCell.click();

        // Open status dropdown
        const statusCombobox = page.getByRole('combobox', {
          name: 'เปลี่ยนสถานะ',
        });

        await expect(statusCombobox).toBeVisible();
        await statusCombobox.click();

        // Select new status
        // ⚠️ ISSUE #1 (again): Radix ID
        await page.locator(testData.statusOptionSelector).click();

        // Save
        const saveButton = page.getByRole('button', {
          name: 'บันทึก',
        });

        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        // ⚠️ ISSUE #3: ยังไม่มี verify หลัง save
        // TODO: verify toast success / status label update / dialog close
        // ตัวอย่างที่น่าจะใช้ (ปรับตาม UI จริง):
        //   await expect(page.getByText(testData.expectedStatusText)).toBeVisible();
      }
    );
  }
});