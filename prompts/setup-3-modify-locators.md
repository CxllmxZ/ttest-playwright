# Setup 3 — Locators (Rules)

Rules file for AI. User pastes a minimal invocation (see `doc/GUIDE.md` Appendix A).

**Purpose:** Turn `_locators/<feature>.ts` into the framework's ordered locator array. Buttons with a name become **parametric** (the CSV supplies which button); everything else stays **static**.

Only the steps that **change per test case** belong in `_locators`. Steps that every test case does the same way live in `_flows/<feature>.ts` and are skipped here.

---

## What the user paste looks like

```markdown
### Setup 3 — Bootstrap locators

Read: #file:prompts/setup-3-modify-locators.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

---

## Scope

- **DO NOT open input dialogs or ask the user to paste code.** Read files from disk.
- Write only `Test-Local/<project>/<access-flow>/<module>/_locators/<feature>.ts`
- `_flows/` (read-only reference), `_scenarios/`, the feature folder: DO NOT modify
- DO NOT run tests, terminal commands, or scripts

### CRITICAL — File writing method

- Use file tools directly (`create_file`, `str_replace`, or equivalent).
- **DO NOT** use PowerShell, cmd, bash, or any shell to write files (`Out-File`, `Set-Content`, `echo >`, heredoc).
- UTF-8 without BOM. Non-ASCII text (e.g. Thai) must be preserved byte-for-byte.
- Write real newlines — never literal `` `n `` / `` `t ``.
- If no file tool is available → **STOP**: `File tool unavailable — not falling back to a shell.`

**Why:** PowerShell writes UTF-16 and garbles non-ASCII text (`à¸Šà¸·à¹ˆà¸­`); shell heredocs leak literal `` `n ``.

---

## Input formats

### Format A — raw codegen

Either the full recording or only the varying lines, with or without the `test(...)` wrapper:

```typescript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:8787/');
  await page.getByRole('button', { name: 'Thai massage ฿ 350 60 min' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('test');
});
```

### Format B — array (framework format)

```typescript
import type { Locator, Page } from '@playwright/test';

export const bookingsLocators: Array<(page: Page, value?: string) => Locator> = [
  (page, value) => page.getByRole('button', { name: value }),
  (page) => page.getByRole('textbox', { name: 'Full name' }),
];
```

---

## Rules

Execute in order.

### Read

1. Read `_locators/<feature>.ts`. Missing → **STOP**: `Cannot read _locators/<feature>.ts — record with codegen and save it there first.`
2. Read `_flows/<feature>.ts` if it exists (used in step 6). If missing, continue without it and mention it in the report.
3. Detect format:
   - contains `export const <featureCamel>Locators` → **Format B** → step 10
   - contains `page.` calls (with or without `test(`) → **Format A** → step 4
   - otherwise → **STOP**: `Cannot detect format — expected raw codegen or a locator array.`

### Format A — extract

4. Take the lines of the `test(...)` body (or the whole file if there is no wrapper). Ignore blank lines and comments.

5. Classify each line:

   | Line | Result |
   |---|---|
   | ends with `.click()`, `.fill(…)`, `.check()`, `.uncheck()`, `.selectOption(…)`, `.press(…)` | **KEEP** |
   | `page.goto(`, `page.waitFor…(`, `const …`, `await …Promise`, `expect(`, `import `, `test(`, `});` | **SKIP** |
   | anything else | **STOP**: `Cannot classify line: <line>` |

6. **Skip fixed steps.** For each KEEP line, if the same line (ignoring leading/trailing whitespace) appears in `_flows/<feature>.ts`, it is a step every test case does → **SKIP** it and list it in the report as "already in _flows (fixed step)".

   Example: `ยืนยันการจอง →` / `Confirm booking →` is clicked after DATA in `_flows` → skipped here.

6b. **Merge dropdown selections.** A click on a dropdown followed by a click on the chosen option is **one** slot — the option is the CSV value.

    Dropdown line: locator contains `getByRole('combobox'` or `ng-select`.
    Option line (the KEEP line right after it), any of:
    - `getByRole('option', …)`
    - `getByLabel('X').getByText('X')` or `getByText('X')`
    - `getByRole('listbox')…`

    → Keep the dropdown line, **drop the option line**, and list it in the report as "merged into dropdown — put `X` in the CSV". The helper opens the dropdown and picks `getByRole('option', { name: <CSV value> })`.

    `X.selectOption('…')` on a native `<select>` is a single line: keep it as a static locator (the value is dropped like any other action).

7. Strip the trailing action from each remaining line to get the locator expression:
   `await X.click()` → `X`, `await X.fill('v')` → `X`, and so on.

8. Classify each locator:

   | Locator | Output |
   |---|---|
   | `getByRole('button'` **with** `name:` | **parametric:** `(page, value) => page.getByRole('button', { name: value })<chain>` — the recorded name is discarded; `<chain>` = everything after `getByRole(...)` (e.g. `.first()`, `.nth(1)`), kept exactly |
   | `getByRole('button'` **without** `name:` | **static:** `(page) => <expression>` — kept exactly; CSV uses `\|click` |
   | anything else (textbox, combobox, link, `page.locator(…)`) | **static:** `(page) => <expression>` — kept exactly |

   A prefix before `getByRole` (e.g. `page.locator('#dialog').getByRole('button', { name: 'OK' })`) is kept: `(page, value) => page.locator('#dialog').getByRole('button', { name: value })`.

9. Overwrite `_locators/<feature>.ts`:

   ```typescript
   import type { Locator, Page } from '@playwright/test';

   export const <featureCamel>Locators: Array<(page: Page, value?: string) => Locator> = [
     <one entry per remaining line, in recorded order>
   ];
   ```

   - `<featureCamel>`: feature name in camelCase (`bookings` → `bookingsLocators`, `car-model` → `carModelLocators`)
   - No comments in the file
   - Parametric entries have exactly `(page, value)` — **never** a default value

   → step 11

### Format B — check only

10. Do not rewrite a valid file. Only fix these mechanical problems, then report what changed:
    - a parametric entry with a default value (`(page, value = 'X') =>`) → remove the default: `(page, value) =>`. A default makes the function look static at runtime and `setup-5.mjs` rejects it.
    - type `Array<(page: Page) => Locator>` while the array has 2-parameter entries → change to `Array<(page: Page, value?: string) => Locator>`

    Nothing else changes (order, chains, static entries stay as they are).

### Report

11. Report in the user's language:
    - Format A (converted) / Format B (no change / fixed: …)
    - `N locators (P parametric, S static)` — count in the conversation; do not run tools
    - Skipped fixed steps (step 6), if any
    - Merged dropdown options (step 6b), with the option text to use in the CSV
    - Reminder: CSV items for parametric positions are **button names**; `|click` is only for static buttons
    - Next: **Setup 4**

---

## Stop conditions

| Signal | Report |
|---|---|
| `_locators/` missing | `Cannot read _locators/<feature>.ts` |
| Format unknown | `Cannot detect format` |
| Unclassifiable line | `Cannot classify line: <line>` |
| No file tool | `File tool unavailable — not falling back to a shell` |

---

## Example — booking (full recording pasted into `_locators`)

`_flows/bookings.ts` contains, after `// === DATA ===`:

```typescript
  await page.getByRole('button', { name: 'Confirm booking →' }).click();
  await page.getByRole('link', { name: 'Back to home' }).click();
```

and `// === PER TEST ===` contains the `Book now →` link click.

`_locators/bookings.ts` before:

```typescript
test('test', async ({ page }) => {
  await page.goto('http://localhost:8787/');
  await page.locator('#top').getByRole('link', { name: 'Book now →' }).click();
  await page.getByRole('button', { name: 'Thai massage ฿ 350 60 min' }).click();
  await page.getByRole('button', { name: 'Thursday 1 October' }).click();
  await page.getByRole('button', { name: '11:00' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('test');
  await page.getByRole('textbox', { name: 'Phone' }).fill('0812345678');
  await page.getByRole('button', { name: 'Confirm booking →' }).click();
  await page.getByRole('link', { name: 'Back to home' }).click();
});
```

- `goto` → skip
- `Book now →`, `Confirm booking →`, `Back to home` → found in `_flows` → skip (fixed steps)
- 3 named buttons → parametric; 2 textboxes → static

After:

```typescript
import type { Locator, Page } from '@playwright/test';

export const bookingsLocators: Array<(page: Page, value?: string) => Locator> = [
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }),
  (page) => page.getByRole('textbox', { name: 'Full name' }),
  (page) => page.getByRole('textbox', { name: 'Phone' }),
];
```

Report: `Format A (converted) — 5 locators (3 parametric, 2 static). Skipped as fixed steps (already in _flows): Book now →, Confirm booking →, Back to home.`

## Example — dropdown

```typescript
  await page.getByRole('button', { name: '17 Sep 11:30 Nopparut' }).click();
  await page.getByRole('combobox', { name: 'Change status' }).click();
  await page.getByLabel('Cancelled').getByText('Cancelled').click();
```
→
```typescript
  (page, value) => page.getByRole('button', { name: value }),
  (page) => page.getByRole('combobox', { name: 'Change status' }),
```

Report: `Merged into dropdown: Cancelled — put the status (e.g. Cancelled, No-show) in the CSV for position 2.`

CSV: `"17 Sep 11:30,Cancelled"` — position 1 picks the booking row, position 2 picks the status.

## Example — repeated buttons

```typescript
  await page.getByRole('button', { name: 'Job sheet' }).first().click();
  await page.getByRole('button', { name: 'Export Excel' }).click();
```
→
```typescript
  (page, value) => page.getByRole('button', { name: value }).first(),
  (page, value) => page.getByRole('button', { name: value }),
```

`.first()` is kept: the page has one such button per table row.

---

## Notes

- **Why named buttons are parametric:** a test often picks one of several buttons (1 of 8 services). The CSV names the button, so one locator slot serves every choice. A button that is the same in every test case is written by its name in the CSV (e.g. `Next`), or — better — kept in `_flows` as a fixed step.
- **Re-running** is safe: Format B is left unchanged except for the fixes in step 10.
- **File names:** `_flows`, `_locators`, `_scenarios` and the feature folder must use exactly the same feature name, including letter case.

## Changelog

- 2026-10-02 (v10.1) — Merges "dropdown click + option click" into one dropdown slot (step 6b); the option becomes the CSV value.
- 2026-09-28 (v10) — Skips lines already present in `_flows` (fixed steps) instead of turning every click into a locator. Format B: removes default parameter values and fixes the array type. `expect(` lines skipped. Examples use neutral data. Report in the user's language.