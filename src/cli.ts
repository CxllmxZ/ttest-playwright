#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { parseTestFile } from './core/parser.js';
import { runTest } from './core/runner.js';
import type { TestResult } from './core/types.js';
import { writeHTMLReport } from './reporters/html-reporter.js';
import { isFolder } from './core/test-discovery.js';
import { runSuite } from './core/runner.js';
import type { TestSuiteResult } from './core/types.js';

const program = new Command();

program
  .name('ttest')
  .description('Universal Playwright test runner with YAML test cases')
  .version('0.1.0');

program
  .command('run <path>')
  .description('Run a test file or all tests in a folder')
  .action(async (path: string) => {
    try {
      const targetIsFolder = isFolder(path);

      if (targetIsFolder) {
        // Run suite (folder)
        console.log(chalk.cyan(`🚀 Running suite: ${chalk.bold(path)}`));
        console.log(chalk.gray('─'.repeat(60)));

        const suiteResult = await runSuite(path);
        printSuiteResult(suiteResult);

        // Write HTML report
        const reportPath = writeHTMLReport(suiteResult);
        console.log(chalk.gray(`\n📄 HTML report: ${reportPath}`));

        process.exit(suiteResult.status === 'pass' ? 0 : 1);
      } else {
        // Run single test (file)
        console.log(chalk.gray('📖 Parsing YAML...'));
        const testCase = parseTestFile(path);

        console.log(chalk.cyan(`🚀 Running: ${chalk.bold(testCase.name)}`));
        if (testCase.description) {
          console.log(chalk.gray(`   ${testCase.description}`));
        }
        console.log(chalk.gray('─'.repeat(60)));

        const result = await runTest(testCase);
        printResult(result);

        // Wrap single test as suite for consistent report
        const suiteResult: TestSuiteResult = {
          name: testCase.name,
          status: result.status,
          duration: result.duration,
          totalTests: 1,
          passedTests: result.status === 'pass' ? 1 : 0,
          failedTests: result.status === 'fail' ? 1 : 0,
          tests: [result],
        };

        const reportPath = writeHTMLReport(suiteResult);
        console.log(chalk.gray(`\n📄 HTML report: ${reportPath}`));

        process.exit(result.status === 'pass' ? 0 : 1);
      }
    } catch (err: any) {
      console.error(chalk.red(`\n💥 Fatal error: ${err.message}`));
      process.exit(2);
    }
  });

program.parse();

function printSuiteResult(suite: TestSuiteResult) {
  const icon = suite.status === 'pass' ? chalk.green('✅') : chalk.red('❌');
  const statusText =
    suite.status === 'pass'
      ? chalk.green.bold('ALL PASSED')
      : chalk.red.bold('SUITE FAILED');

  console.log(`\n${icon} ${statusText} ${chalk.gray(`(${suite.duration}ms)`)}`);
  console.log(
    chalk.gray(
      `   ${suite.totalTests} tests: ${chalk.green(suite.passedTests + ' passed')}, ${chalk.red(suite.failedTests + ' failed')}`
    )
  );

  console.log(chalk.bold(`\nTests:`));
  for (const test of suite.tests) {
    const testIcon =
      test.status === 'pass' ? chalk.green('  ✓') : chalk.red('  ✗');
    const duration = chalk.gray(`(${test.duration}ms)`);
    console.log(`${testIcon} ${test.name} ${duration}`);
    if (test.error) {
      console.log(chalk.red(`      ${test.error}`));
    }
  }
}

// ============================================
// Result Printer
// ============================================

function printResult(result: TestResult) {
  const icon = result.status === 'pass' ? chalk.green('✅') : chalk.red('❌');
  const statusText =
    result.status === 'pass'
      ? chalk.green.bold('PASS')
      : chalk.red.bold('FAIL');

  console.log(`\n${icon} ${statusText} ${chalk.gray(`(${result.duration}ms)`)}`);

  // Steps
  console.log(chalk.bold(`\nSteps (${result.steps.length}):`));
  for (const step of result.steps) {
    const stepIcon =
      step.status === 'pass' ? chalk.green('  ✓') : chalk.red('  ✗');
    const stepText = `${step.index + 1}. ${step.action}`;
    const duration = chalk.gray(`(${step.duration}ms)`);
    console.log(`${stepIcon} ${stepText} ${duration}`);
    if (step.error) {
      console.log(chalk.red(`      ${step.error}`));
    }
  }

  // Assertions
  if (result.assertions.length > 0) {
    console.log(chalk.bold(`\nAssertions (${result.assertions.length}):`));
    for (const assertion of result.assertions) {
      const aIcon =
        assertion.status === 'pass' ? chalk.green('  ✓') : chalk.red('  ✗');
      console.log(`${aIcon} ${assertion.index + 1}. ${assertion.type}`);
      if (assertion.error) {
        console.log(chalk.red(`      ${assertion.error}`));
      }
    }
  }

  if (result.error && result.status === 'fail') {
    console.log(chalk.red.bold(`\n💥 ${result.error}`));
  }
}