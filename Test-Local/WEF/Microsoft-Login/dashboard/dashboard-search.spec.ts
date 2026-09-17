import {
  test,
  expect,
  Locator,
  Page,
} from '@playwright/test';

const APPLICATION_URL =
  'https://apps-uat.tokiomarinesafety.co.th/wfe/';

/*
 * ============================================================
 * Test Data Types
 * ============================================================
 */

type TextFieldName =
  | 'receiptNumber'
  | 'insuredName'
  | 'dealer'
  | 'chassisNumber';

type DateFieldName =
  | 'notificationDateFrom'
  | 'notificationDateTo'
  | 'coverageStartDate'
  | 'coverageEndDate';

type DropdownFieldName =
  | 'formStatus'
  | 'voluntaryStatus'
  | 'compulsoryStatus'
  | 'carModel';

type DashboardSearchFilter =
  | {
      type: 'text';
      field: TextFieldName;
      value: string;
    }
  | {
      type: 'date';
      field: DateFieldName;
      value: string;
    }
  | {
      type: 'dropdown';
      field: DropdownFieldName;
      value: string;
    };

interface DashboardSearchTestCase {
  testCaseId: string;
  scenario: string;
  filters: DashboardSearchFilter[];

  /*
   * ข้อความที่คาดว่าจะพบในผลการค้นหา
   * เช่น เลขรับแจ้ง ชื่อผู้เอาประกัน รุ่นรถ หรือสถานะ
   */
  expectedText?: string;
}

/*
 * ============================================================
 * Test Cases
 * ============================================================
 */

const dashboardSearchTestCases: DashboardSearchTestCase[] = [
  {
    testCaseId: 'TC001',
    scenario: 'Search by Receipt Number',
    filters: [
      {
        type: 'text',
        field: 'receiptNumber',
        value: 'HQ0000016',
      },
    ],
    expectedText: 'HQ0000016',
  },

  {
    testCaseId: 'TC002',
    scenario: 'Search by Coverage Start Date',
    filters: [
      {
        type: 'date',
        field: 'coverageStartDate',
        value: '01/09/2026',
      },
    ],
  },

  {
    testCaseId: 'TC003',
    scenario: 'Search by Coverage End Date',
    filters: [
      {
        type: 'date',
        field: 'coverageEndDate',
        value: '30/09/2026',
      },
    ],
  },

  {
    testCaseId: 'TC004',
    scenario: 'Search by Form Status',
    filters: [
      {
        type: 'dropdown',
        field: 'formStatus',
        value: 'งานใหม่',
      },
    ],
    expectedText: 'งานใหม่',
  },

  {
    testCaseId: 'TC005',
    scenario: 'Search by Voluntary Transaction Status',
    filters: [
      {
        type: 'dropdown',
        field: 'voluntaryStatus',
        value: 'ดึงข้อมูลแล้ว',
      },
    ],
    expectedText: 'ดึงข้อมูลแล้ว',
  },

  {
    testCaseId: 'TC006',
    scenario: 'Search by Compulsory Transaction Status',
    filters: [
      {
        type: 'dropdown',
        field: 'compulsoryStatus',
        value: 'ออกกรมธรรม์แล้ว',
      },
    ],
    expectedText: 'ออกกรมธรรม์แล้ว',
  },

  {
    testCaseId: 'TC007',
    scenario: 'Search by Insured Name',
    filters: [
      {
        type: 'text',
        field: 'insuredName',
        value: 'ชื่อผู้เอาประกันที่มีอยู่จริง',
      },
    ],
    expectedText: 'ชื่อผู้เอาประกันที่มีอยู่จริง',
  },

  {
    testCaseId: 'TC008',
    scenario: 'Search by Car Model',
    filters: [
      {
        type: 'dropdown',
        field: 'carModel',
        value: 'E-HS9',
      },
    ],
    expectedText: 'E-HS9',
  },

  {
    testCaseId: 'TC009',
    scenario: 'Search by Chassis Number',
    filters: [
      {
        type: 'text',
        field: 'chassisNumber',
        value: 'CHASSIS-NUMBER-001',
      },
    ],
    expectedText: 'CHASSIS-NUMBER-001',
  },

  {
    testCaseId: 'TC010',
    scenario: 'Search with Multiple Filters',
    filters: [
      {
        type: 'date',
        field: 'coverageStartDate',
        value: '01/09/2026',
      },
      {
        type: 'date',
        field: 'coverageEndDate',
        value: '30/09/2026',
      },
      {
        type: 'dropdown',
        field: 'formStatus',
        value: 'งานใหม่',
      },
      {
        type: 'dropdown',
        field: 'carModel',
        value: 'E-HS9',
      },
    ],
    expectedText: 'E-HS9',
  },
];

/*
 * ============================================================
 * Field Mapping
 * ============================================================
 *
 * Locator ที่ได้จาก Codegen จะถูกรวมไว้ที่นี่
 * Test Case จะไม่ต้องรู้ว่า Field ใช้ first(), nth() หรือ CSS อะไร
 */

function getDashboardSearchFields(page: Page) {
  const allTextboxes = page.getByRole('textbox');

  const dateTextboxes = page.getByRole('textbox', {
    name: 'DD/MM/YYYY',
  });

  return {
    /*
     * Text Fields
     *
     * Mapping จาก Full Codegen:
     * first() = เลขรับแจ้ง / เลข พ.ร.บ.
     * nth(1)  = ชื่อผู้เอาประกัน / ชื่อบริษัท
     */
    receiptNumber: allTextboxes.first(),

    insuredName: allTextboxes.nth(1),

    dealer: page.getByRole('textbox', {
      name: 'รหัส Dealer / ชื่อ Dealer',
    }),

    chassisNumber: page.getByRole('textbox', {
      name: 'หมายเลขตัวถัง / หมายเลขเครื่อง',
    }),

    /*
     * Date Fields
     *
     * Mapping จาก Full Codegen:
     * first() = วันที่แจ้ง
     * nth(1)  = ถึงวันที่
     * nth(2)  = วันที่เริ่มคุ้มครอง
     * nth(3)  = วันที่สิ้นสุดความคุ้มครอง
     */
    notificationDateFrom: dateTextboxes.first(),

    notificationDateTo: dateTextboxes.nth(1),

    coverageStartDate: dateTextboxes.nth(2),

    coverageEndDate: dateTextboxes.nth(3),
  };
}

/*
 * ============================================================
 * Text and Date Locator Resolver
 * ============================================================
 */

function getTextFieldLocator(
  page: Page,
  field: TextFieldName
): Locator {
  const fields = getDashboardSearchFields(page);

  switch (field) {
    case 'receiptNumber':
      return fields.receiptNumber;

    case 'insuredName':
      return fields.insuredName;

    case 'dealer':
      return fields.dealer;

    case 'chassisNumber':
      return fields.chassisNumber;

    default: {
      const unsupportedField: never = field;

      throw new Error(
        `Unsupported text field: ${unsupportedField}`
      );
    }
  }
}

function getDateFieldLocator(
  page: Page,
  field: DateFieldName
): Locator {
  const fields = getDashboardSearchFields(page);

  switch (field) {
    case 'notificationDateFrom':
      return fields.notificationDateFrom;

    case 'notificationDateTo':
      return fields.notificationDateTo;

    case 'coverageStartDate':
      return fields.coverageStartDate;

    case 'coverageEndDate':
      return fields.coverageEndDate;

    default: {
      const unsupportedField: never = field;

      throw new Error(
        `Unsupported date field: ${unsupportedField}`
      );
    }
  }
}

/*
 * ============================================================
 * Dropdown Locator Resolver
 * ============================================================
 */

function getDropdownLocator(
  page: Page,
  field: DropdownFieldName
): Locator {
  switch (field) {
    case 'formStatus':
      return page
        .locator('ng-select')
        .filter({
          hasText: /สถานะแบบฟอร์ม/,
        })
        .first();

    case 'voluntaryStatus':
      return page
        .locator('ng-select')
        .filter({
          hasText: /สถานะงานภาคสมัครใจ/,
        })
        .first();

    case 'compulsoryStatus':
      return page
        .locator('ng-select')
        .filter({
          hasText: /สถานะงานพ\.ร\.บ\./,
        })
        .first();

    case 'carModel':
      return page
        .locator('ng-select')
        .filter({
          hasText: /รุ่นรถ/,
        })
        .first();

    default: {
      const unsupportedField: never = field;

      throw new Error(
        `Unsupported dropdown field: ${unsupportedField}`
      );
    }
  }
}

/*
 * ============================================================
 * Filter Actions
 * ============================================================
 */

async function fillTextField(
  page: Page,
  field: TextFieldName,
  value: string
): Promise<void> {
  const textbox = getTextFieldLocator(page, field);

  await expect(textbox).toBeVisible({
    timeout: 10_000,
  });

  await textbox.fill(value);

  await expect(textbox).toHaveValue(value);
}

async function fillDateField(
  page: Page,
  field: DateFieldName,
  value: string
): Promise<void> {
  const dateTextbox = getDateFieldLocator(
    page,
    field
  );

  await expect(dateTextbox).toBeVisible({
    timeout: 10_000,
  });

  /*
   * บาง Angular Date Picker รองรับ fill() ตรง ๆ
   * หากระบบไม่ยอมรับ ให้เปลี่ยนเป็น:
   *
   * await dateTextbox.click();
   * await dateTextbox.pressSequentially(value);
   * await dateTextbox.press('Tab');
   */
  await dateTextbox.fill(value);

  await dateTextbox.press('Tab');

  await expect(dateTextbox).toHaveValue(value);
}

async function selectDropdownOption(
  page: Page,
  field: DropdownFieldName,
  value: string
): Promise<void> {
  const dropdown = getDropdownLocator(page, field);

  await expect(dropdown).toBeVisible({
    timeout: 10_000,
  });

  await dropdown.click();

  /*
   * ng-select ของระบบมี Options list
   * จึงจำกัดการค้นหา Option ไว้ภายใน Panel
   */
  const optionsList = page.getByLabel(
    'Options list'
  );

  await expect(optionsList).toBeVisible({
    timeout: 10_000,
  });

  const option = optionsList.getByText(value, {
    exact: true,
  });

  await expect(option).toBeVisible({
    timeout: 10_000,
  });

  await option.click();

  /*
   * ตรวจว่า Dropdown แสดงค่าที่เลือกแล้ว
   */
  await expect(dropdown).toContainText(value);
}

/*
 * ============================================================
 * Apply Filters
 * ============================================================
 */

async function applyDashboardSearchFilters(
  page: Page,
  filters: DashboardSearchFilter[]
): Promise<void> {
  for (const filter of filters) {
    switch (filter.type) {
      case 'text':
        await fillTextField(
          page,
          filter.field,
          filter.value
        );
        break;

      case 'date':
        await fillDateField(
          page,
          filter.field,
          filter.value
        );
        break;

      case 'dropdown':
        await selectDropdownOption(
          page,
          filter.field,
          filter.value
        );
        break;

      default: {
        const unsupportedFilter: never = filter;

        throw new Error(
          `Unsupported filter: ${JSON.stringify(
            unsupportedFilter
          )}`
        );
      }
    }
  }
}

/*
 * ============================================================
 * WEF Application Login
 * ============================================================
 */

async function enterWefApplication(
  page: Page
): Promise<void> {
  await page.goto(APPLICATION_URL);

  // Verify Microsoft authentication state
  await expect(page).not.toHaveURL(
    /login\.microsoftonline\.com/i
  );

  // Select TMSTH Staff role
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

  // Verify navigation to Select Brand page
  await expect(page).toHaveURL(/select-brand/i, {
    timeout: 30_000,
  });

  // Open brand dropdown
  const brandDropdown = page
    .locator('ng-select')
    .first();

  await expect(brandDropdown).toBeVisible({
    timeout: 10_000,
  });

  await brandDropdown.click();

  // Select Hongqi
  const hongqiOption = page.getByText(
    'Hongqi',
    {
      exact: true,
    }
  );

  await expect(hongqiOption).toBeVisible({
    timeout: 10_000,
  });

  await hongqiOption.click();

  // Enter application
  const loginButton = page.getByRole('button', {
    name: 'เข้าสู่ระบบ',
  });

  await expect(loginButton).toBeVisible({
    timeout: 10_000,
  });

  await loginButton.click();

  // Wait until loading finishes
  await expect(
    page.locator('.loading-backdrop')
  ).toBeHidden({
    timeout: 30_000,
  });

  // Close login result popup when displayed
  const closeButton = page.getByRole('button', {
    name: 'ปิด',
  });

  const isCloseButtonVisible = await closeButton
    .isVisible({
      timeout: 10_000,
    })
    .catch(() => false);

  if (isCloseButtonVisible) {
    await closeButton.click();

    await expect(closeButton).toBeHidden({
      timeout: 10_000,
    });
  }

  // Verify Dashboard
  await expect(page).toHaveURL(/dashboard/i, {
    timeout: 30_000,
  });
}

/*
 * ============================================================
 * Search Result Assertion
 * ============================================================
 */

async function verifySearchResult(
  page: Page,
  expectedText?: string
): Promise<void> {
  /*
   * ปรับ Locator นี้ให้ตรงกับ Result Container จริง
   * หากหน้าใช้ table ให้ระบุ table หลักโดยตรงจะดีที่สุด
   */
  const resultContainer = page
    .locator(
      'table, [role="table"], [role="grid"]'
    )
    .first();

  await expect(resultContainer).toBeVisible({
    timeout: 10_000,
  });

  if (expectedText) {
    await expect(resultContainer).toContainText(
      expectedText,
      {
        timeout: 10_000,
      }
    );
  }
}

/*
 * ============================================================
 * Tests
 * ============================================================
 */

test.describe('Dashboard Search', () => {
  test.beforeEach(async ({ page }) => {
    await enterWefApplication(page);
  });

  for (const testData of dashboardSearchTestCases) {
    test(
      `${testData.testCaseId} - ${testData.scenario}`,
      async ({ page }) => {
        await test.step(
          'Apply dashboard search filters',
          async () => {
            await applyDashboardSearchFilters(
              page,
              testData.filters
            );
          }
        );

        await test.step(
          'Click Search button',
          async () => {
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

            await expect(
              page.locator('.loading-backdrop')
            ).toBeHidden({
              timeout: 30_000,
            });
          }
        );

        await test.step(
          'Verify search result',
          async () => {
            await verifySearchResult(
              page,
              testData.expectedText
            );
          }
        );
      }
    );
  }
});