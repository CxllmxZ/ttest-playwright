import type { TestSuiteResult, TestResult } from '../core/types.js';

/**
 * Generate HTML report for test suite
 */
export function generateSuiteHTML(suite: TestSuiteResult): string {
  const statusColor = suite.status === 'pass' ? '#22c55e' : '#ef4444';
  const statusIcon = suite.status === 'pass' ? '✓' : '✗';
  const statusText = suite.status === 'pass' ? 'ALL PASSED' : 'FAILED';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ttest Report — ${escapeHtml(suite.name)}</title>
  <script>
    (function() {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('t')) {
        url.searchParams.set('t', Date.now());
        window.location.replace(url.toString());
      }
    })();
  </script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      background: #1e293b;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1.5rem;
      border-left: 4px solid ${statusColor};
    }
    .brand {
      font-size: 0.875rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }
    .suite-name {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 1rem;
    }
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: ${statusColor}22;
      color: ${statusColor};
      border-radius: 8px;
      font-weight: 600;
      font-size: 1.125rem;
    }
    .summary {
      color: #94a3b8;
      font-size: 0.95rem;
    }
    .duration { color: #64748b; }
    .test-card {
      background: #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      border-left: 4px solid;
    }
    .test-card.pass { border-left-color: #22c55e; }
    .test-card.fail { border-left-color: #ef4444; }
    details { cursor: pointer; }
    summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      list-style: none;
      user-select: none;
    }
    summary::-webkit-details-marker { display: none; }
    .test-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }
    .test-icon {
      font-size: 1.25rem;
      font-weight: 700;
      min-width: 1.5rem;
    }
    .icon-pass { color: #22c55e; }
    .icon-fail { color: #ef4444; }
    .test-name {
      color: #f1f5f9;
      font-size: 1.05rem;
      font-weight: 600;
    }
    .test-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: #64748b;
      font-size: 0.875rem;
    }
    .toggle-icon {
      transition: transform 0.2s;
      color: #64748b;
    }
    details[open] .toggle-icon { transform: rotate(90deg); }
    .test-detail {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #334155;
    }
    .section-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 0.75rem;
      margin-top: 1rem;
    }
    .section-title:first-child { margin-top: 0; }
    .count {
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 400;
    }
    .item {
      background: #0f172a;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin-bottom: 0.375rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .item:last-child { margin-bottom: 0; }
    .item-icon { font-weight: 700; min-width: 1.25rem; }
    .item-body { flex: 1; min-width: 0; }
    .item-header {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .item-name { color: #e2e8f0; font-size: 0.9rem; }
    .item-duration {
      color: #64748b;
      font-size: 0.8rem;
      font-family: monospace;
    }
    .item-error {
      margin-top: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: #7f1d1d33;
      border-left: 3px solid #ef4444;
      border-radius: 4px;
      color: #fca5a5;
      font-family: monospace;
      font-size: 0.8rem;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .footer {
      text-align: center;
      margin-top: 2rem;
      color: #475569;
      font-size: 0.875rem;
    }
    .footer a { color: #64748b; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">ttest suite report</div>
      <h1 class="suite-name">${escapeHtml(suite.name)}</h1>
      <div class="status-row">
        <div class="status">
          <span>${statusIcon}</span>
          <span>${statusText}</span>
        </div>
        <div class="summary">
          <strong style="color: #22c55e;">${suite.passedTests} passed</strong>
          ${suite.failedTests > 0 ? ` · <strong style="color: #ef4444;">${suite.failedTests} failed</strong>` : ''}
          · <span class="duration">${formatDuration(suite.duration)}</span>
        </div>
      </div>
    </div>

    ${suite.tests.map((t) => renderTestCard(t)).join('')}

    <div class="footer">
      Generated by <a href="https://github.com/CxllmxZ/ttest-playwright">ttest</a> · ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// Helpers
// ==========================================

function renderTestCard(test: TestResult): string {
  const icon = test.status === 'pass' ? '✓' : '✗';
  const iconClass = test.status === 'pass' ? 'icon-pass' : 'icon-fail';
  const cardClass = test.status === 'pass' ? 'pass' : 'fail';

  return `
    <div class="test-card ${cardClass}">
      <details ${test.status === 'fail' ? 'open' : ''}>
        <summary>
          <div class="test-header">
            <span class="test-icon ${iconClass}">${icon}</span>
            <span class="test-name">${escapeHtml(test.name)}</span>
          </div>
          <div class="test-meta">
            <span>${formatDuration(test.duration)}</span>
            <span class="toggle-icon">▶</span>
          </div>
        </summary>
        <div class="test-detail">
          ${test.description ? `<div class="section-title" style="color: #94a3b8; margin-bottom: 1rem;">${escapeHtml(test.description)}</div>` : ''}
          ${renderSteps(test)}
          ${renderAssertions(test)}
          ${test.error && test.steps.length === 0 ? `<div class="section-title">Error</div><div class="item-error">${escapeHtml(test.error)}</div>` : ''}
        </div>
      </details>
    </div>
  `;
}

function renderSteps(test: TestResult): string {
  if (test.steps.length === 0) return '';

  const items = test.steps.map((step) => {
    const iconClass = step.status === 'pass' ? 'icon-pass' : 'icon-fail';
    const icon = step.status === 'pass' ? '✓' : '✗';

    return `
      <div class="item">
        <div class="item-icon ${iconClass}">${icon}</div>
        <div class="item-body">
          <div class="item-header">
            <span class="item-name">${step.index + 1}. ${escapeHtml(step.action)}</span>
            <span class="item-duration">${formatDuration(step.duration)}</span>
          </div>
          ${step.error ? `<div class="item-error">${escapeHtml(step.error)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="section-title">Steps <span class="count">(${test.steps.length})</span></div>
    ${items}
  `;
}

function renderAssertions(test: TestResult): string {
  if (test.assertions.length === 0) return '';

  const items = test.assertions.map((assertion) => {
    const iconClass = assertion.status === 'pass' ? 'icon-pass' : 'icon-fail';
    const icon = assertion.status === 'pass' ? '✓' : '✗';

    return `
      <div class="item">
        <div class="item-icon ${iconClass}">${icon}</div>
        <div class="item-body">
          <div class="item-header">
            <span class="item-name">${assertion.index + 1}. ${escapeHtml(assertion.type)}</span>
          </div>
          ${assertion.error ? `<div class="item-error">${escapeHtml(assertion.error)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="section-title">Assertions <span class="count">(${test.assertions.length})</span></div>
    ${items}
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}