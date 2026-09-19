export type DashboardSearchControl =
  | {
      controlType: 'textbox';
      controlIndex: number;
      value: string;
    }
  | {
      controlType: 'dateTextbox';
      controlIndex: number;
      value: string;
    }
  | {
      controlType: 'namedTextbox';
      accessibleName: string;
      value: string;
    }
  | {
      controlType: 'dropdown';
      controlIndex: number;
      value: string;
    }
  | {
      controlType: 'namedDropdown';
      dropdownText: string;
      value: string;
    };

export interface DashboardSearchTestCase {
  testCaseId: string;
  scenario: string;

  control: DashboardSearchControl;

  runInitialSearch?: boolean;
  expectedText?: string;
}