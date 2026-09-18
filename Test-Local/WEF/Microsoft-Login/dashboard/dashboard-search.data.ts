import type {
  DashboardSearchTestCase,
} from './dashboard-search.types';

export const dashboardSearchTestCases:
  DashboardSearchTestCase[] = [
    {
      testCaseId: 'TC001',
      scenario: 'Search by Receipt Number',

      control: {
        controlType: 'textbox',
        controlIndex: 0,
        value: 'HQ0000020',
      },

      runInitialSearch: true,
      expectedText: 'HQ0000020',
    },

    {
      testCaseId: 'TC002',
      scenario: 'Search by Dealer',

      control: {
        controlType: 'namedTextbox',
        accessibleName:
          'รหัส Dealer / ชื่อ Dealer',
        value: 'EVMFH00002',
      },

      runInitialSearch: true,
      expectedText: 'EVMFH00002',
    },

    {
      testCaseId: 'TC003',
      scenario: 'Search by Chassis Number',

      control: {
        controlType: 'namedTextbox',
        accessibleName:
          'หมายเลขตัวถัง / หมายเลขเครื่อง',
        value: 'EEEEEEEEEEEEEEEEE',
      },

      runInitialSearch: true,
      expectedText: 'EEEEEEEEEEEEEEEEE',
    },

    {
      testCaseId: 'TC004',
      scenario: 'Search by Car Model',

      control: {
        controlType: 'namedDropdown',
        dropdownText:
          '-- กรุณาเลือกรุ่นรถยนต์ --',
        value: 'E-HS9',
      },

      runInitialSearch: true,
      expectedText: 'E-HS9',
    },
  ];