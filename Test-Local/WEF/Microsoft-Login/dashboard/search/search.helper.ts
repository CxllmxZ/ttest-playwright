import {
  expect,
  Locator,
  Page,
} from '@playwright/test';

import type {
  DashboardSearchControl,
  DashboardSearchTestCase,
} from './search.types';

function getIndexedControl(
  controls: Locator,
  controlIndex: number
): Locator {
  if (
    !Number.isInteger(controlIndex) ||
    controlIndex < 0
  ) {
    throw new Error(
      `Invalid control index: ${controlIndex}`
    );
  }

  return controlIndex === 0
    ? controls.first()
    : controls.nth(controlIndex);
}

async function applyControl(
  page: Page,
  controlData: DashboardSearchControl
): Promise<void> {
  switch (controlData.controlType) {
    case 'textbox': {
      const textboxes =
        page.getByRole('textbox');

      const textbox = getIndexedControl(
        textboxes,
        controlData.controlIndex
      );

      await expect(textbox).toBeVisible({
        timeout: 30_000,
      });

      await textbox.click();
      await textbox.fill(controlData.value);

      await expect(textbox).toHaveValue(
        controlData.value
      );

      break;
    }

    case 'dateTextbox': {
      const dateTextboxes = page.getByRole(
        'textbox',
        {
          name: 'DD/MM/YYYY',
        }
      );

      const dateTextbox = getIndexedControl(
        dateTextboxes,
        controlData.controlIndex
      );

      await expect(dateTextbox).toBeVisible({
        timeout: 30_000,
      });

      await dateTextbox.click();
      await dateTextbox.fill(
        controlData.value
      );

      await dateTextbox.press('Tab');

      await expect(dateTextbox).toHaveValue(
        controlData.value
      );

      break;
    }

    case 'namedTextbox': {
      const textbox = page.getByRole(
        'textbox',
        {
          name: controlData.accessibleName,
          exact: false,
        }
      );

      await expect(textbox).toBeVisible({
        timeout: 30_000,
      });

      await textbox.click();
      await textbox.fill(controlData.value);

      await expect(textbox).toHaveValue(
        controlData.value
      );

      break;
    }

    case 'dropdown': {
      const dropdowns = page.locator(
        [
          '.ng-select-searchable',
          '> .ng-select-container',
          '> .ng-arrow-wrapper',
        ].join(' ')
      );

      const dropdown = getIndexedControl(
        dropdowns,
        controlData.controlIndex
      );

      await expect(dropdown).toBeVisible({
        timeout: 30_000,
      });

      await dropdown.click();

      const option = page.getByRole('option', {
        name: controlData.value,
        exact: false,
      });

      await expect(option).toBeVisible({
        timeout: 10_000,
      });

      await option.click();

      break;
    }

    case 'namedDropdown': {
      const dropdown = page
        .locator('ng-select')
        .filter({
          hasText: controlData.dropdownText,
        })
        .getByRole('combobox');

      await expect(dropdown).toBeVisible({
        timeout: 30_000,
      });

      await dropdown.click();

      const option = page.getByRole('option', {
        name: controlData.value,
        exact: false,
      });

      await expect(option).toBeVisible({
        timeout: 10_000,
      });

      await option.click();

      break;
    }

    default: {
      const unsupportedControl: never =
        controlData;

      throw new Error(
        `Unsupported control: ${JSON.stringify(
          unsupportedControl
        )}`
      );
    }
  }
}

export async function applySearchControl(
  page: Page,
  testData: DashboardSearchTestCase
): Promise<void> {
  await applyControl(
    page,
    testData.control
  );

  console.log(
    [
      'Applied search control',
      `controlType=${testData.control.controlType}`,
      `value=${testData.control.value}`,
    ].join(', ')
  );
}