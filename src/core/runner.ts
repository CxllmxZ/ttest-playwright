import { chromium } from 'playwright';
import type {
  TestCase,
  TestResult,
  StepResult,
  AssertionResult,
} from './types.js';
import { executeAction } from './action-executor.js';
import { executeAssertion } from './assertion-executor.js';

/**
 * Run a single test case end-to-end
 */
export async function runTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();
  const stepResults: StepResult[] = [];
  const assertionResults: AssertionResult[] = [];

  let browser;
  let overallError: string | undefined;

  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Execute steps sequentially
    for (let i = 0; i < testCase.steps.length; i++) {
      const step = testCase.steps[i];
      const stepStart = Date.now();

      try {
        await executeAction(step, page);
        stepResults.push({
          index: i,
          action: step.action,
          status: 'pass',
          duration: Date.now() - stepStart,
        });
      } catch (err: any) {
        stepResults.push({
          index: i,
          action: step.action,
          status: 'fail',
          duration: Date.now() - stepStart,
          error: err.message,
        });
        // Fail fast: stop on first error
        overallError = `Step ${i + 1} (${step.action}) failed: ${err.message}`;
        throw err;
      }
    }

    // Execute assertions (if all steps passed)
    if (testCase.assertions) {
      for (let i = 0; i < testCase.assertions.length; i++) {
        const assertion = testCase.assertions[i];

        try {
          await executeAssertion(assertion, page);
          assertionResults.push({
            index: i,
            type: assertion.type,
            status: 'pass',
          });
        } catch (err: any) {
          assertionResults.push({
            index: i,
            type: assertion.type,
            status: 'fail',
            error: err.message,
          });
          overallError = `Assertion ${i + 1} (${assertion.type}) failed: ${err.message}`;
        }
      }
    }
  } catch (err: any) {
    // Error already captured in step/assertion loop
    if (!overallError) overallError = err.message;
  } finally {
    if (browser) await browser.close();
  }

  const duration = Date.now() - startTime;

  // Determine overall status
  const allStepsPassed = stepResults.every((s) => s.status === 'pass');
  const allAssertionsPassed = assertionResults.every(
    (a) => a.status === 'pass'
  );
  const status = allStepsPassed && allAssertionsPassed ? 'pass' : 'fail';

  return {
    name: testCase.name,
    status,
    duration,
    steps: stepResults,
    assertions: assertionResults,
    error: overallError,
  };
}