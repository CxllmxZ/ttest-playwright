import type {
  DashboardSearchTestCase,
} from './search.types';

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
      scenario: 'Search by Coverage Start Date',

      control: {
        controlType: 'dateTextbox',
        controlIndex: 0,
        value: '10',
      },

      runInitialSearch: true,
      expectedText: '10',
    },

    {
      testCaseId: 'TC003',
      scenario: 'Search by Coverage End Date',

      control: {
        controlType: 'dateTextbox',
        controlIndex: 1,
        value: '30',
      },

      runInitialSearch: true,
      expectedText: '30',
    },

    {
      testCaseId: 'TC004',
      scenario: 'Search by Transaction Status',

      control: {
        controlType: 'dropdown',
        controlIndex: 0,
        value: 'งานใหม่',
      },

      runInitialSearch: true,
      expectedText: 'งานใหม่',
    },

    {
      testCaseId: 'TC005',
      scenario: 'Search by Insured Name',

      control: {
        controlType: 'namedTextbox',
        accessibleName: 'ชื่อผู้เอาประกัน',
        value: 'Harry',
      },

      runInitialSearch: true,
      expectedText: 'Harry',
    },

    {
      testCaseId: 'TC006',
      scenario: 'Search by Car Model',

      control: {
        controlType: 'namedDropdown',
        dropdownText: '-- กรุณาเลือกรุ่นรถยนต์ --',
        value: 'E-HS9',
      },

      runInitialSearch: true,
      expectedText: 'E-HS9',
    },

    {
      testCaseId: 'TC007',
      scenario: 'Search by Chassis Number',

      control: {
        controlType: 'namedTextbox',
        accessibleName:
          'หมายเลขตัวถัง / หมายเลขเครื่อง',
        value: 'CAM220PT2JJE04221F',
      },

      runInitialSearch: true,
      expectedText: 'CAM220PT2JJE04221F',
    },

    {
      testCaseId: 'TC008',
      scenario: 'Search with Multiple Filters',

      control: {
        controlType: 'textbox',
        controlIndex: 0,
        value: '',
      },

      runInitialSearch: true,
      expectedText: '',
    },
  ];