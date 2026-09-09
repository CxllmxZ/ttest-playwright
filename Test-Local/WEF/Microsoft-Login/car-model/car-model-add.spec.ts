import { test, expect } from '@playwright/test';

const carModelTestCases = [
  {
    testCaseId: 'TC-CAR-ADD-004',
    carModelName: '218i',
    carSubModelName: 'Gran Coupe M Sport QA-2026-A01',
    modelYear: '2026',
    engineCapacity: '1499',
    seatCount: '5',
    sumInsured: '1,850,000',
    sellingPrice: '2,199,000',
  },
  {
    testCaseId: 'TC-CAR-ADD-005',
    carModelName: '330e',
    carSubModelName: 'M Sport Pro QA-2026-A02',
    modelYear: '2026',
    engineCapacity: '1998',
    seatCount: '5',
    sumInsured: '2,600,000',
    sellingPrice: '3,099,000',
  },
  {
    testCaseId: 'TC-CAR-ADD-006',
    carModelName: 'i4',
    carSubModelName: 'eDrive40 M Sport QA-2026-A03',
    modelYear: '2026',
    engineCapacity: '250',
    seatCount: '5',
    sumInsured: '3,500,000',
    sellingPrice: '4,200,000',
  },
];

test.describe('Car Model Management', () => {
  for (const testData of carModelTestCases) {
    test(`${testData.testCaseId} Add ${testData.carModelName} successfully`, async ({ page }) => {
      // Open application
      await page.goto('http://localhost:4200/');

      // Verify that Microsoft authentication state is active
      await expect(page).not.toHaveURL(
        /login\.microsoftonline\.com/
      );

      // Select Staff role
      await page.locator('.role-icon.staff').click();

      // Open company dropdown
      await page.locator('span').first().click();

      // Select BMW company
      await page.getByText('BMW', { exact: true }).click();

      // Enter application
      await page
        .getByRole('button', { name: 'เข้าสู่ระบบ' })
        .click();

      // Wait until login loading finishes
      await expect(
        page.locator('.loading-backdrop')
      ).toBeHidden({
        timeout: 30_000,
      });

      // Close login result popup
      const loginCloseButton = page.getByRole('button', {
        name: 'ปิด',
      });

      await expect(loginCloseButton).toBeVisible({
        timeout: 10_000,
      });

      await loginCloseButton.click();
      await expect(loginCloseButton).toBeHidden({
        timeout: 10_000,
      });

      // Open Car Model menu
      const carModelLink = page.getByRole('link', {
        name: 'Car Model',
      });

      await expect(carModelLink).toBeVisible();
      await carModelLink.click();

      // Verify navigation to Car Model page
      await expect(page).toHaveURL(/carmodel-master/);

      // Wait until Car Model page loading finishes
      await expect(
        page.locator('.loading-backdrop')
      ).toBeHidden({
        timeout: 30_000,
      });

      // Open Add Car Model form
      await page
        .getByRole('button', { name: /เพิ่มรายการ/ })
        .click();

      // Fill Car Model information
      await page
        .getByRole('textbox', { name: 'ชื่อรุ่นรถ' })
        .fill(testData.carModelName);

      await page
        .getByRole('textbox', {
          name: 'ชื่อรุ่นย่อยรถยนต์',
        })
        .fill(testData.carSubModelName);

      await page
        .getByRole('textbox', { name: 'ปีรถยนต์' })
        .fill(testData.modelYear);

      await page
        .getByRole('textbox', { name: 'CC / KW' })
        .fill(testData.engineCapacity);

      await page
        .getByRole('textbox', { name: 'จำนวนที่นั่ง' })
        .fill(testData.seatCount);

      await page
        .getByRole('textbox', { name: 'ทุนประกัน' })
        .fill(testData.sumInsured);

      await page
        .getByRole('textbox', { name: 'ราคาขาย' })
        .fill(testData.sellingPrice);

      // Save Car Model
      await page
        .getByRole('button', { name: /บันทึก/ })
        .click();

      // Verify and close result popup
      const resultCloseButton = page.getByRole('button', {
        name: 'ปิด',
      });

      await expect(resultCloseButton).toBeVisible({
        timeout: 10_000,
      });

      await resultCloseButton.click();

      await expect(resultCloseButton).toBeHidden({
        timeout: 10_000,
      });
    });
  }
});
