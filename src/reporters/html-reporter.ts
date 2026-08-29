import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { TestResult } from '../core/types.js';
import { generateHTML } from './html-template.js';

/**
 * Write HTML report to file
 */
export function writeHTMLReport(
  result: TestResult,
  outputPath: string = './report/index.html'
): string {
  const absPath = resolve(outputPath);
  const dir = dirname(absPath);

  // Ensure directory exists
  mkdirSync(dir, { recursive: true });

  // Generate + write HTML
  const html = generateHTML(result);
  writeFileSync(absPath, html, 'utf-8');

  return absPath;
}