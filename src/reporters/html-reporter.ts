import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { TestSuiteResult } from '../core/types.js';
import { generateSuiteHTML } from './html-template.js';

/**
 * Write HTML report to file
 */
export function writeHTMLReport(
  suite: TestSuiteResult,
  outputPath: string = './report/index.html'
): string {
  const absPath = resolve(outputPath);
  const dir = dirname(absPath);

  mkdirSync(dir, { recursive: true });

  const html = generateSuiteHTML(suite);
  writeFileSync(absPath, html, 'utf-8');

  return absPath;
}