// ============================================
// TTest AST Types (v0.1)
// ============================================

// ---- Locators ----

export type Locator =
  | { role: string; name?: string; exact?: boolean }
  | { text: string; exact?: boolean }
  | { css: string };

// ---- Actions ----

export type Action =
  | GotoAction
  | ClickAction
  | FillAction
  | WaitForAction
  | AssertAction;

export interface GotoAction {
  action: 'goto';
  target: string;
  wait_until?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface ClickAction {
  action: 'click';
  locator: Locator;
  timeout?: number;
}

export interface FillAction {
  action: 'fill';
  locator: Locator;
  value: string;
}

export interface WaitForAction {
  action: 'wait_for';
  locator: Locator;
  state?: 'visible' | 'hidden' | 'attached';
  timeout?: number;
}

export interface AssertAction {
  action: 'assert';
  type: AssertionType;
  [key: string]: any;
}

// ---- Assertions ----

export type Assertion =
  | VisibleAssertion
  | UrlMatchesAssertion
  | TextContainsAssertion;

export type AssertionType = 'visible' | 'url_matches' | 'text_contains';

export interface VisibleAssertion {
  type: 'visible';
  locator: Locator;
  timeout?: number;
}

export interface UrlMatchesAssertion {
  type: 'url_matches';
  pattern: string;
}

export interface TextContainsAssertion {
  type: 'text_contains';
  locator: Locator;
  value: string;
}

// ---- Test Case (root) ----

export interface TestCase {
  name: string;
  description?: string;
  steps: Action[];
  assertions?: Assertion[];
}

// ============================================
// Result Types (execution output)
// ============================================

export interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  duration: number;              // ms
  steps: StepResult[];
  assertions: AssertionResult[];
  error?: string;
}

export interface StepResult {
  index: number;
  action: string;
  status: 'pass' | 'fail';
  duration: number;
  error?: string;
}

export interface AssertionResult {
  index: number;
  type: string;
  status: 'pass' | 'fail';
  error?: string;
}

export interface TestResult {
  name: string;
  description?: string;      // ← เพิ่มบรรทัดนี้
  status: 'pass' | 'fail';
  duration: number;
  steps: StepResult[];
  assertions: AssertionResult[];
  error?: string;
}

// ============================================
// Suite Result (multiple tests combined)
// ============================================

export interface TestSuiteResult {
  name: string;                    // Suite name (folder name or filename)
  status: 'pass' | 'fail';         // overall status (fail if any test failed)
  duration: number;                // total ms
  totalTests: number;
  passedTests: number;
  failedTests: number;
  tests: TestResult[];             // individual test results
}