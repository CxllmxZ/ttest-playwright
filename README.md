# ttest

Universal Playwright test runner with YAML-based test cases.

**Status:** 🚧 v0.1.0 (early development — MVP)

## Vision

Test cases as data, not code. One framework, all projects.

Write tests in YAML — human-readable, git-friendly, non-tech accessible.

## Features (v0.1.0)

- ✅ YAML-based test cases
- ✅ Playwright engine (Chromium)
- ✅ 4 actions: `goto`, `click`, `fill`, `wait_for`
- ✅ 3 locators: `role`, `text`, `css`
- ✅ 3 assertions: `visible`, `url_matches`, `text_contains`
- ✅ CLI with colored output

## Quick Start

### Install (from source — not published yet)

```bash
git clone https://github.com/YOUR_USERNAME/ttest-playwright.git
cd ttest-playwright
pnpm install
pnpm exec playwright install chromium
pnpm build
```

### Write your first test

Create `my-test.yaml`:

```yaml
name: "My first test"
steps:
  - action: goto
    target: https://example.com

  - action: wait_for
    locator:
      css: "h1"

assertions:
  - type: text_contains
    locator:
      css: "h1"
    value: "Example"
```

### Run

```bash
node dist/cli.js run my-test.yaml
```

Or during development:

```bash
pnpm dev src/cli.ts run my-test.yaml
```

## YAML Schema

### Actions

**`goto`** — navigate to URL
```yaml
- action: goto
  target: https://example.com
  wait_until: domcontentloaded  # optional
```

**`click`** — click element
```yaml
- action: click
  locator: { role: button, name: "Submit" }
  timeout: 5000  # optional (ms)
```

**`fill`** — fill input
```yaml
- action: fill
  locator: { css: "#email" }
  value: "test@example.com"
```

**`wait_for`** — wait for element
```yaml
- action: wait_for
  locator: { role: heading }
  state: visible  # optional: visible | hidden | attached
  timeout: 30000  # optional (default 30s)
```

### Locators

Choose ONE strategy per locator:

```yaml
# By ARIA role
locator: { role: button, name: "Submit", exact: false }

# By visible text
locator: { text: "Sign in", exact: false }

# By CSS selector
locator: { css: "#submit-btn" }
```

### Assertions

**`visible`** — element is visible
```yaml
- type: visible
  locator: { role: heading }
  timeout: 5000  # optional
```

**`url_matches`** — URL matches pattern (regex)
```yaml
- type: url_matches
  pattern: "/dashboard"
```

**`text_contains`** — element contains text
```yaml
- type: text_contains
  locator: { css: "h1" }
  value: "Welcome"
```

## Examples

See `examples/` folder:
- `basic.yaml` — Wikipedia search
- `playwright-docs.yaml` — Documentation navigation
- `failing-test.yaml` — Error handling demo

## Development

### Project Structure