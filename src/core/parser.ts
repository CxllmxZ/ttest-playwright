import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import type { TestCase, Action, Assertion, Locator } from './types.js';

// ============================================
// Parser: YAML file → TestCase AST
// ============================================

export function parseTestFile(filePath: string): TestCase {
  const content = readFileSync(filePath, 'utf-8');
  const raw = parseYaml(content);
  return validateAndNormalize(raw, filePath);
}

// ---- Validation + Normalization ----

function validateAndNormalize(raw: any, filePath: string): TestCase {
  // Check required fields
  if (!raw || typeof raw !== 'object') {
    throw new Error(`[${filePath}] Invalid YAML: must be an object`);
  }

  if (!raw.name || typeof raw.name !== 'string') {
    throw new Error(`[${filePath}] Missing required field: "name"`);
  }

  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    throw new Error(`[${filePath}] "steps" must be a non-empty array`);
  }

  // Validate each step
  const steps: Action[] = raw.steps.map((step: any, i: number) =>
    validateStep(step, i, filePath)
  );

  // Validate assertions (optional)
  const assertions: Assertion[] | undefined = raw.assertions
    ? raw.assertions.map((a: any, i: number) =>
        validateAssertion(a, i, filePath)
      )
    : undefined;

  return {
    name: raw.name,
    description: raw.description,
    steps,
    assertions,
  };
}

// ---- Step (Action) Validation ----

function validateStep(step: any, index: number, filePath: string): Action {
  const location = `[${filePath}] step ${index + 1}`;

  if (!step || typeof step !== 'object') {
    throw new Error(`${location}: must be an object`);
  }

  if (!step.action || typeof step.action !== 'string') {
    throw new Error(`${location}: missing "action" field`);
  }

  switch (step.action) {
    case 'goto':
      if (!step.target) throw new Error(`${location}: goto requires "target"`);
      return {
        action: 'goto',
        target: step.target,
        wait_until: step.wait_until,
      };

    case 'click':
      if (!step.locator)
        throw new Error(`${location}: click requires "locator"`);
      return {
        action: 'click',
        locator: validateLocator(step.locator, location),
        timeout: step.timeout,
      };

    case 'fill':
      if (!step.locator)
        throw new Error(`${location}: fill requires "locator"`);
      if (step.value === undefined)
        throw new Error(`${location}: fill requires "value"`);
      return {
        action: 'fill',
        locator: validateLocator(step.locator, location),
        value: String(step.value),
      };

    case 'wait_for':
      if (!step.locator)
        throw new Error(`${location}: wait_for requires "locator"`);
      return {
        action: 'wait_for',
        locator: validateLocator(step.locator, location),
        state: step.state,
        timeout: step.timeout,
      };

    default:
      throw new Error(
        `${location}: unknown action "${step.action}". ` +
          `Supported: goto, click, fill, wait_for`
      );
  }
}

// ---- Assertion Validation ----

function validateAssertion(
  assertion: any,
  index: number,
  filePath: string
): Assertion {
  const location = `[${filePath}] assertion ${index + 1}`;

  if (!assertion || !assertion.type) {
    throw new Error(`${location}: missing "type" field`);
  }

  switch (assertion.type) {
    case 'visible':
      if (!assertion.locator)
        throw new Error(`${location}: visible requires "locator"`);
      return {
        type: 'visible',
        locator: validateLocator(assertion.locator, location),
        timeout: assertion.timeout,
      };

    case 'url_matches':
      if (!assertion.pattern)
        throw new Error(`${location}: url_matches requires "pattern"`);
      return {
        type: 'url_matches',
        pattern: String(assertion.pattern),
      };

    case 'text_contains':
      if (!assertion.locator)
        throw new Error(`${location}: text_contains requires "locator"`);
      if (assertion.value === undefined)
        throw new Error(`${location}: text_contains requires "value"`);
      return {
        type: 'text_contains',
        locator: validateLocator(assertion.locator, location),
        value: String(assertion.value),
      };

    default:
      throw new Error(
        `${location}: unknown assertion type "${assertion.type}". ` +
          `Supported: visible, url_matches, text_contains`
      );
  }
}

// ---- Locator Validation ----

function validateLocator(loc: any, location: string): Locator {
  if (!loc || typeof loc !== 'object') {
    throw new Error(`${location}: locator must be an object`);
  }

  // Check exactly one strategy is used
  const strategies = ['role', 'text', 'css'];
  const used = strategies.filter((s) => loc[s] !== undefined);

  if (used.length === 0) {
    throw new Error(
      `${location}: locator must specify one of: ${strategies.join(', ')}`
    );
  }

  if (used.length > 1) {
    throw new Error(
      `${location}: locator can only use one strategy, got: ${used.join(', ')}`
    );
  }

  // Return validated locator
  if (loc.role) {
    return { role: loc.role, name: loc.name, exact: loc.exact };
  }
  if (loc.text) {
    return { text: loc.text, exact: loc.exact };
  }
  if (loc.css) {
    return { css: loc.css };
  }

  throw new Error(`${location}: invalid locator`);
}