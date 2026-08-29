#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { parseTestFile } from './core/parser.js';
import { runTest } from './core/runner.js';
import type { TestResult } from './core/types.js';
import { writeHTMLReport } from './reporters/html-reporter.js';

const program = new Command();

program
  .name('ttest')
  .description('Universal Playwright test runner with YAML test cases')
  .version('0.1.0');

program
  .command('run <file>')
  .description('Run a test case from YAML file')
  .action(async (file: string) => {
    try {
      console.log(chalk.gray('📖 Parsing YAML...'));
      const testCase = parseTestFile(file);

      console.log(chalk.cyan(`🚀 Running: ${chalk.bold(testCase.name)}`));
      if (testCase.description) {
        console.log(chalk.gray(`   ${testCase.description}`));
      }
      console.log(chalk.gray('─'.repeat(60)));

      const result = await runTest(testCase);
      printResult(result);

      // Write HTML report
      const reportPath = writeHTMLReport(result);
      console.log(chalk.gray(`\n📄 HTML report: ${reportPath}`));

      process.exit(result.status === 'pass' ? 0 : 1);
    } catch (err: any) {
      console.error(chalk.red(`\n💥 Fatal error: ${err.message}`));
      process.exit(2);
    }
  });

program.parse();

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