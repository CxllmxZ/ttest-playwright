# Setup 3 — Modify Locators (Rules)

Rules file for AI. Do NOT paste this file's content as prompt — user pastes minimal invocation (see `AGENT_PROMPTS.md`).

**Purpose:** Convert `_locators/<feature>.ts` from raw Playwright codegen to framework array format. Button locators are converted to **parametric form** (accept value as argument, no default) so tests must supply which button to click via CSV value; non-button locators stay static.

**Does one thing only:** Reads → detects format → rewrites if needed.
No CSV, no scenarios. Standalone.

---

## What the user paste looks like

```markdown
### Setup 3 — Modify locators

Read: #file:prompts/setup-3-modify-locators.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

AI extracts Location from user prompt. AI reads codegen from disk (see Preconditions).

---

## Preconditions

**`_locators/<feature>.ts` MUST exist before Setup 3 runs.**

It can be in either format:

### Format A — Raw codegen (from Playwright codegen)

```typescript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('...');
  await page.getByRole('button', { name: 'ใบแจ้งงาน' }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: ' Export Excel' }).click();
  const download = await downloadPromise;
  await page.getByRole('button', { name: 'ปริ้นท์ พ.ร.บ' }).first().click();
});
```

Setup 3 will parse this, extract locator lines, and rewrite as Format B.

### Format B — Array format (framework standard)

```typescript
import type { Locator, Page } from '@playwright/test';

export const printLocators: Array<(page: Page, value?: string) => Locator> = [
  (page, value) => page.getByRole('button', { name: value }).first(),
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }).first(),
];
```

**Note the pattern:**
- Buttons with `name` in codegen → **parametric, no default**: `(page, value) => page.getByRole('button', { name: value })` — CSV value supplies the name at runtime
- Buttons without `name` (e.g., positional via `.nth(N)`) → **static**: `(page) => page.getByRole('button').nth(N)` — CSV value should be `|click`
- Non-buttons (textbox, combobox, link, other) → **static**: `(page) => page.getByRole('textbox', { name: '<name>' })`

Setup 3 will detect this format and skip conversion (no-op).

---

## Scope

- **DO NOT open interactive input dialogs asking the user to paste content.** All required content is on disk. READ files directly.
- Read/overwrite 1 file: `_locators/<feature>.ts`
- `_flows/`, `_scenarios/`, feature folder, spec/helper/types/data are READ-ONLY — DO NOT modify
- DO NOT run tests, terminal commands, or scripts.
- DO NOT generate `_scenarios/` CSV (that's Setup 4's job).

### CRITICAL — File writing method

When overwriting `_locators/<feature>.ts` in step 7:

- **USE file creation/edit tools DIRECTLY** (e.g., `create_file`, `str_replace`, or the equivalent in your environment).
- **DO NOT use PowerShell, cmd, bash, or any shell** to write the file — not `Out-File`, not `echo >`, not `Set-Content`, not heredoc redirection.
- **File encoding MUST be UTF-8** (no BOM). Thai and other Unicode characters must be preserved byte-for-byte.
- **DO NOT wrap content in PowerShell escape sequences** — no `` `n `` (backtick-n for newlines), no `` `t ``, no `` ` `` (single backtick). Write actual newline characters in the file content.

**Why:** PowerShell's default `Out-File` in Windows writes UTF-16 LE with BOM and mangles Unicode (Thai characters appear as mojibake like `à¸Šà¸·à¹ˆà¸­`). Shell heredocs on Windows often leak literal `` `n `` into the file instead of newlines. Direct file tool writes preserve UTF-8 and produce clean output.

---

## Rules

Execute in this order.

### Precondition verification

1. **READ** the file `_locators/<feature>.ts` at:
   `Test-Local/<project>/<access-flow>/<module>/_locators/<feature>.ts`
   
   **CRITICAL DIRECTIVES:**
   - You MUST read the file DIRECTLY using file tools.
   - DO NOT ask the user to paste the file content.
   - DO NOT ask the user to provide the Playwright Codegen block.
   - DO NOT open an interactive input dialog requesting information.
   - The file exists on disk — READ IT.
   
   If the file truly cannot be read (missing on disk, permission denied) → **STOP** and report:
   ```
   Cannot read _locators/<feature>.ts. File missing or inaccessible. Codegen the feature and save to that path first.
   ```

### Detect file format

2. Parse the content read in step 1. **You already have the content — do NOT ask user for it.**

3. Detect format:
   - If content has `export const <feature>Locators` → **Format B (already array)** → go to step 8
   - If content has `test(` function or `page.goto(` → **Format A (raw codegen)** → go to step 4
   - Otherwise → **STOP** and report:
     ```
     Cannot detect _locators/<feature>.ts format.
     Expected: raw Playwright codegen OR array of locator functions.
     ```
   
   Note: Existing Format B files may use the older type signature `Array<(page: Page) => Locator>` (all static). New Format B uses `Array<(page: Page, value?: string) => Locator>` (buttons parametric, others static). Both are detected as Format B; step 8 (no-op) applies to both.

### Parse raw codegen (Format A only)

4. Extract lines from inside the `test(` function body.

5. For each line, classify:
   - **KEEP** if line ends with `.click()`, `.fill(...)`, `.check(...)`, `.uncheck(...)`, `.selectOption(...)`, `.press(...)` — line contains a Playwright locator followed by an action
   - **SKIP** if line contains any of:
     - `page.goto(`
     - `page.waitForEvent(`
     - `page.waitForLoadState(`
     - `page.waitForTimeout(`
     - `page.waitForURL(`
     - `page.waitForResponse(`
     - `const ` (variable declaration like `const downloadPromise = ...`)
     - `await downloadPromise`, `await responsePromise` (dangling promise awaits)
     - `import ` or `test(` or `});` (framework boilerplate)
   - **AMBIGUOUS** if none of the above → **STOP** and report:
     ```
     Cannot classify line: <line>
     Fix _locators/<feature>.ts and rerun.
     ```

6. For each KEEP line, strip the trailing action to isolate the locator:
   - `await X.click()` → `X`
   - `await X.fill('value')` → `X`
   - `await X.check()` → `X`
   - `await X.selectOption('opt')` → `X`
   
   Result: locator expression as a string (e.g., `page.getByRole('button', { name: ' Export Excel' }).first()`)

### Classify locator type

Each isolated locator expression is classified for output form:

**Button with `name`** — contains `getByRole('button'` or `getByRole("button"` AND has a `name:` argument
- Rewrite as **parametric (no default)** in step 7
- The codegen `name` value is discarded — CSV value will supply it at runtime
- Extract any chained methods after the closing `)` of `getByRole(...)` — e.g., `.first()`, `.nth(1)`, `.last()`
- Chained methods are preserved (they're structural, not data)

**Button without `name`** (positional / structural) — contains `getByRole('button'` AND has NO `name:` argument (typically has `.nth(N)`, `.first()`, or `.last()` only)
- Rewrite as **static** in step 7
- CSV value should be `|click` at runtime

**Non-button** — anything else (textbox, combobox, link, custom `page.locator(...)`, etc.)
- Rewrite as **static** in step 7 (unchanged from the isolated expression)

### Rewrite locators file

7. Overwrite `_locators/<feature>.ts` with array format.
   
   **⚠️ Before writing:** Re-read the "CRITICAL — File writing method" section above. Use a file tool, write UTF-8 (no BOM), no PowerShell escape sequences.
   
   ```typescript
   import type { Locator, Page } from '@playwright/test';
   
   export const <feature>Locators: Array<(page: Page, value?: string) => Locator> = [
     // Button with name (parametric, NO default): CSV value supplies the button name
     (page, value) => page.getByRole('button', { name: value })<chained>,
     
     // Button without name (positional, static): CSV value should be |click
     (page) => page.getByRole('button')<chained>,
     
     // Non-button (static): preserve original expression exactly
     (page) => <locator expression>,
     
     // ... one per KEEP line, in original order
   ];
   ```
   
   - `<feature>` = camelCase of feature name
   - Array type signature: `Array<(page: Page, value?: string) => Locator>` (accommodates both parametric buttons and static locators)
   - NO comments in output
   - For **buttons with `name`**: parametric form `(page, value) => page.getByRole('button', { name: value })<chained>`
     - The codegen `name` value is discarded
     - `<chained>` is any chained methods after `getByRole(...)` — e.g., `.first()`, `.nth(1)`
     - Example: `page.getByRole('button', { name: 'ใบแจ้งงาน' }).first()` → `(page, value) => page.getByRole('button', { name: value }).first()`
   - For **buttons without `name`**: static form `(page) => <original expression>` — preserve character-for-character
     - Example: `page.getByRole('button').nth(2)` → `(page) => page.getByRole('button').nth(2)`
   - For **non-buttons**: static form `(page) => <original expression>` — preserve character-for-character (do NOT rewrite)

### Format B detected (no-op)

8. If Format B was detected in step 3, do nothing (file already correct).
   Report "Already array format, no changes made" and count N.

### Verify output

9. **Verify (in-conversation only — NO tools):**
   - Count entries in the array you just wrote (or existing array if Format B)
   - Count how many are parametric buttons (2-arg with default) vs static (1-arg)
   - **DO NOT run terminal, PowerShell, bash, regex tools, scripts, or any tool for this check**
   - **DO NOT read the file back with a tool — trust what you just wrote**
   - Report: "Locators: N entries (P parametric buttons, S static) ✓"

---

## Output

- Updated `_locators/<feature>.ts` (rewritten as array if was raw, unchanged if was array)
- Report:
  - Format detected: "Format A (converted)" or "Format B (no-op)"
  - "<N> locators (<P> parametric buttons, <S> static)"

---

## Stop conditions summary

| Signal | Report |
|---|---|
| `_locators/` missing | `"Cannot read _locators/<feature>.ts. File missing or inaccessible."` |
| Cannot detect format | `"Cannot detect _locators/ format. Expected raw codegen or array."` |
| Codegen line ambiguous | `"Cannot classify line: <line>. Fix _locators/ and rerun."` |
| Cannot write UTF-8 directly | `"File tool unavailable — do not fall back to PowerShell/shell. Report the issue instead."` |

---

## Example — Print feature (Format A → converts)

**Precondition file** `_locators/print.ts` (raw codegen):

```typescript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://example.com/'); 
  await page.getByRole('button', { name: 'ใบแจ้งงาน' }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: ' Export Excel' }).click();
  const download = await downloadPromise;
  await page.getByRole('button', { name: 'ปริ้นท์ พ.ร.บ' }).first().click();
});
```

**User paste:**

```markdown
### Setup 3 — Modify locators

Read: #file:prompts/setup-3-modify-locators.md

**Location**
- Project: WEF
- AccessFlow: Microsoft-Login
- Module: dashboard
- Feature: print
```

**AI process:**
- Read `_locators/print.ts` → detect Format A (has `test(` function)
- Extract 7 lines from inside test body:
  - `page.goto(...)` → SKIP
  - `ใบแจ้งงาน...click()` → KEEP → strip `.click()`
  - `const downloadPromise = ...waitForEvent` → SKIP
  - `Export Excel...click()` → KEEP → strip `.click()`
  - `const download = await downloadPromise` → SKIP
  - `ปริ้นท์ พ.ร.บ...click()` → KEEP → strip `.click()`
- 3 locators extracted → N = 3

**Overwrites `_locators/print.ts`:**

```typescript
import type { Locator, Page } from '@playwright/test';

export const printLocators: Array<(page: Page, value?: string) => Locator> = [
  (page, value) => page.getByRole('button', { name: value }).first(),
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }).first(),
];
```

**Report:**
```
Format A (converted)
3 locators (3 parametric buttons, 0 static)
```

Note: CSV Value column for each row must now supply button names (e.g., `"ใบแจ้งงาน"` for row 0 instead of `"|click"`).

---

## Example — Search feature (Format B → no-op)

**Precondition file** `_locators/search.ts` (already array — all textboxes, all static):

```typescript
import type { Locator, Page } from '@playwright/test';

export const searchLocators: Array<(page: Page, value?: string) => Locator> = [
  (page) => page.getByRole('textbox').first(),
  (page) => page.getByRole('textbox').nth(1),
  // ... 10 more ...
];
```

**AI process:**
- Read `_locators/search.ts` → detect Format B (has `export const searchLocators`)
- No conversion needed
- Count N = 12 from array

**Report:**
```
Format B (no-op)
12 locators
```

---

## Example — Nebula booking (Format A → converts, mixed types)

**Precondition file** `_locators/bookings.ts` (raw codegen):

```typescript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:8787/');
  await page.locator('#top').getByRole('link', { name: 'จองเลย →' }).click();
  await page.getByRole('button', { name: 'นวดไทย ฿ 350 60 นาที' }).click();
  await page.getByRole('button', { name: 'วันพฤหัสบดีที่ 1 ตุลาคม' }).click();
  await page.getByRole('button', { name: '11:00' }).click();
  await page.getByRole('textbox', { name: 'ชื่อ-นามสกุล' }).fill('test');
  await page.getByRole('textbox', { name: 'เบอร์โทร' }).fill('0812345678');
  await page.getByRole('button', { name: 'ยืนยันการจอง →' }).click();
});
```

**AI process:**
- Read `_locators/bookings.ts` → detect Format A
- Extract 8 lines from inside test body:
  - `page.goto(...)` → SKIP
  - `จองเลย →` link click → this is a `getByRole('link', ...)`, KEEP → non-button (static)
  - `นวดไทย...` button click → KEEP → button (parametric)
  - `วันพฤหัสบดี...` button click → KEEP → button (parametric)
  - `11:00` button click → KEEP → button (parametric)
  - `ชื่อ-นามสกุล` textbox fill → KEEP → non-button (static)
  - `เบอร์โทร` textbox fill → KEEP → non-button (static)
  - `ยืนยันการจอง →` button click → KEEP → button (parametric)
- 7 locators extracted (1 link static + 4 buttons parametric + 2 textboxes static)

**Overwrites `_locators/bookings.ts`:**

```typescript
import type { Locator, Page } from '@playwright/test';

export const bookingsLocators: Array<(page: Page, value?: string) => Locator> = [
  (page) => page.locator('#top').getByRole('link', { name: 'จองเลย →' }),
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }),
  (page) => page.getByRole('textbox', { name: 'ชื่อ-นามสกุล' }),
  (page) => page.getByRole('textbox', { name: 'เบอร์โทร' }),
  (page, value) => page.getByRole('button', { name: value }),
];
```

**Report:**
```
Format A (converted)
7 locators (4 parametric buttons, 3 static)
```

Note: CSV Value must supply button names — e.g., `"นวดไทย ฿ 350 60 นาที,วันพฤหัสบดีที่ 1 ตุลาคม,11:00,test,0812345678,ยืนยันการจอง →"` (or `|click` for the link at index 0 if it's meant to be a fixed navigation).

---

## Notes

### Purpose

Setup 3 does one thing: takes `_locators/<feature>.ts` (raw codegen or array) → produces array format.

Benefits:
- Fast (single file conversion)
- Idempotent (re-running on array = no-op)
- Easy to debug (one concern)

### Why buttons are parametric

Buttons often need to be **dynamic** — e.g., "select one service from 8 options" — where each TC clicks a different button. Making button locators parametric (no default) lets CSV values fully control which button to click:

- **Locator with `name`** in codegen → parametric `(page, value) => page.getByRole('button', { name: value })` — CSV value = button's accessible name
- **Locator without `name`** (positional, e.g., `.nth(2)`) → static `(page) => page.getByRole('button').nth(2)` — CSV value = `|click`

**Design rule:** parametric buttons have NO default value. The CSV value is required at runtime — helper will throw an error if `|click` is used with a parametric button. This forces the data (which button to click) to live in the CSV, not in the locator's identifier.

Textboxes and other inputs are static because their locator identifies the field, while the CSV value is the **content to fill** — not the field name.

### After Setup 3

`_locators/<feature>.ts` is now in array format. Framework code (Setup 5's helper template) can consume it — Setup 5 generates a helper that detects each locator's arity (1 = static, 2 = parametric) and dispatches accordingly.

### Re-running Setup 3

Safe. Format B detection makes it idempotent — running twice on array format is no-op.

### Compatibility with older Format B files

Older Format B files may use the type `Array<(page: Page) => Locator>` (all static, no parametric buttons). These are detected as Format B and skipped (no-op). To upgrade an older file, delete it and re-run Setup 3 with the raw codegen — or convert manually by rewriting button locators to the parametric form shown above.

Older parametric locators with default values (e.g., `(page, value = 'X') => ...`) will also work at runtime — the default is just unused when CSV supplies the value. But new Setup 3 runs will produce the no-default form.