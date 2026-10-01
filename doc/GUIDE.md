# ttest-playwright — User Guide

This guide walks through the full workflow, from an empty repository to running tests. For a short overview see the [README](../README.md). The complete rule reference is [`AGENTS.md`](../AGENTS.md).

ภาษาไทย: [GUIDE.th.md](GUIDE.th.md)

---

## Quick reference

| I want to… | Do | How |
|---|---|---|
| Start a new project / access flow / module | **Setup 1** | ⚡ Task |
| Prepare login (Microsoft / form) | Login setup | `.bat` script |
| Record a flow | Codegen | `Test-Local/run-codegen.bat` |
| Turn recorded locators into a locator list | **Setup 3** | 💬 Prompt |
| Write test cases | **Setup 4** | 💬 Prompt |
| Generate the test files | **Setup 5** | ⚡ Task |
| Run tests | Runner | `Test-Local/run-local.bat` |
| Add test cases | **Setup 4** → **Setup 7** | 💬 → ⚡ |
| Edit / delete test cases | edit CSV → **Setup 7** | ⚡ Task |
| Use a new action or field type | **Setup 6** → **Setup 7** | 💬 → ⚡ |

- **⚡ Task:** VS Code → `Ctrl+Shift+P` → **Run Task** → pick the setup → fill in the boxes.
- **💬 Prompt:** paste the template from [Appendix A](#appendix-a--prompt-templates) into your AI agent (e.g. GitHub Copilot in **Agent mode**).

Setup 2 no longer exists (merged into Setup 1).

---

## Contents

0. [Install](#0-install)
1. [Setup 1 — Create the project](#1-setup-1--create-the-project)
2. [Login setup](#2-login-setup)
3. [Record the flow with codegen](#3-record-the-flow-with-codegen)
4. [Split the recording into `_flows` and `_locators`](#4-split-the-recording-into-_flows-and-_locators)
5. [Setup 3 — Locators](#5-setup-3--locators)
6. [Setup 4 — Scenarios](#6-setup-4--scenarios)
7. [Setup 5 — Generate the feature](#7-setup-5--generate-the-feature)
8. [Run the tests](#8-run-the-tests)
9. [Add or change test cases](#9-add-or-change-test-cases)
10. [New action or field type (Setup 6)](#10-new-action-or-field-type-setup-6)
11. [Troubleshooting](#11-troubleshooting)
- [Appendix A — Prompt templates](#appendix-a--prompt-templates)
- [Appendix B — Script language](#appendix-b--script-language)

---

## 0. Install

Requirements: Node.js 18+, VS Code, Windows (for the `.bat` runners).

On Windows, double-click **`Test-Local/setup.bat`**. It checks Node.js and installs pnpm, Playwright, Chromium and TypeScript if they are missing.

Manual alternative:

```bash
pnpm install
pnpm exec playwright install chromium
```

Open the **repository folder itself** in VS Code (File → Open Folder → `ttest-playwright`). If you open a parent folder, the VS Code Tasks will not appear.

---

## 1. Setup 1 — Create the project

Creates the folders and the login configuration for one module.

**Run:** `Ctrl+Shift+P` → **Run Task** → **Setup 1 — Create-Project**

| Box | Meaning | Example |
|---|---|---|
| Project | the application under test | `Nebula-Spa` |
| AccessFlow | a way of entering the app (one login type) | `No-Auth` |
| Module | an area of the app | `Bookings` |
| AuthType | how this access flow logs in | `none` |

**AuthType:**

| Value | Use when |
|---|---|
| `none` | no login needed |
| `microsoft` | Microsoft / Azure AD single sign-on |
| `form` | the app's own email + password form |

**Result:**

```
Test-Local/Nebula-Spa/No-Auth/
├── project.config.json        { "authType": "none" }
└── Bookings/
    ├── _flows/
    ├── _locators/
    └── _scenarios/
```

**Good to know**

- Use the same task to add another module or access flow. Existing folders are reused, never overwritten.
- One access flow has exactly one AuthType. For a different login type, use a new AccessFlow name (e.g. `Admin-Login`).
- Names cannot contain spaces — use `-`.
- A name that differs from an existing folder only by letter case (`nebula-spa` vs `Nebula-Spa`) is rejected. Windows treats them as the same folder; git and Linux do not.

---

## 2. Login setup

Do this **before recording**, because the recorder opens the app with the saved login.

### `none`

Nothing to do.

### `microsoft`

1. Double-click **`Authen/Microsoft/setup-microsoft-auth.bat`**
2. Enter the application URL
3. Log in with Microsoft (including MFA) in the browser that opens
4. Wait until the application has fully loaded
5. Go back to the script window and press **Enter**

The browser profile is saved in `Authen/Microsoft/profile/` (git-ignored). Repeat these steps when the session expires.

Without this step, the recorder stops with *"Microsoft profile is not ready"*.

### `form`

Each `form` access flow has its own login script: **`Test-Local/<Project>/<AccessFlow>/_login/login.setup.ts`**. Setup 1 creates it from a template (`Authen/Form-Login/login.setup.template.ts`).

1. Open `_login/login.setup.ts`, delete the `throw new Error(...)` line at the top, and fill in the four TODOs:
   1. the login page URL
   2. the login form's fields and submit button — record them with `run-codegen.bat` → **Record login and test flow**, keep the locators, and use `username` / `password` as the values
   3. a wait that proves you are logged in (a URL or an element)
   4. how the app keeps the session: `saveStorageState` for cookies / localStorage (most apps), `saveSessionStorage` for sessionStorage-based apps
2. Double-click **`Authen/Form-Login/setup-form-auth.bat`** → pick the access flow → enter username and password (the password is hidden, and neither is written to disk)
3. The session is saved to `_login/session-storage.json` (git-ignored)

Never write credentials into `login.setup.ts`. Repeat step 2 when the session expires.

Details (credentials, session lifetime): [`FORM_LOGIN_SESSION_STORAGE_GUIDE.md`](FORM_LOGIN_SESSION_STORAGE_GUIDE.md).

---

## 3. Record the flow with codegen

1. Double-click **`Test-Local/run-codegen.bat`**
2. Pick **Project** → **Access Flow**
3. `form` only — pick a mode:
   - **Record login and test flow** — clean browser, records everything including the login
   - **Open authenticated browser / Pick locators** — already logged in, for picking single locators (does not record a full script)
4. Enter the URL to start from
5. In the browser, perform **one complete, typical test case** — for example, book one massage from start to finish
6. Copy the generated code from the **Playwright Inspector** window

The recorder does not save files. You paste the code in the next step.

**Record one test case only.** The other test cases come from the CSV later.

---

## 4. Split the recording into `_flows` and `_locators`

This is the most important step. One recording becomes two files with the **same name** — the *feature name*:

```
Bookings/_flows/bookings.ts
Bookings/_locators/bookings.ts
```

Use lowercase for the feature name. `_flows`, `_locators`, `_scenarios` and the generated folder must all use exactly the same name.

### The one rule

For each recorded line, ask: **does this step change from one test case to another?**

| Answer | Goes to |
|---|---|
| **No** — every test case does it the same way | `_flows` |
| **Yes** — each test case uses a different value or button | `_locators` (and removed from `_flows`) |

### Example — booking

Recorded:

```typescript
await page.goto('http://localhost:8787/');
await page.locator('#top').getByRole('link', { name: 'Book now →' }).click();
await page.getByRole('button', { name: 'Thai massage ฿ 350 60 min' }).click();   // varies
await page.getByRole('button', { name: 'Thursday 1 October' }).click();         // varies
await page.getByRole('button', { name: '11:00' }).click();                        // varies
await page.getByRole('textbox', { name: 'Full name' }).fill('test');              // varies
await page.getByRole('textbox', { name: 'Phone' }).fill('0812345678');            // varies
await page.getByRole('button', { name: 'Confirm booking →' }).click();
await page.getByRole('link', { name: 'Back to home' }).click();
```

**`_flows/bookings.ts`** — the unchanged steps, split by three markers:

```typescript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // === SETUP ===
  await page.goto('http://localhost:8787/');

  // === PER TEST ===
  await page.locator('#top').getByRole('link', { name: 'Book now →' }).click();

  // === DATA ===
  await page.getByRole('button', { name: 'Confirm booking →' }).click();
  await page.getByRole('link', { name: 'Back to home' }).click();
});
```

**`_locators/bookings.ts`** — the varying steps, in order, without the action:

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

You can paste the raw locator lines into `_locators` and let **Setup 3** convert them to this format.

### The three markers

| Marker | Runs | Put here |
|---|---|---|
| `// === SETUP ===` | once **before each** test case | open the start page; app-level login steps |
| `// === PER TEST ===` | at the start of each test case | steps before the test data (open a form, clear filters) |
| `// === DATA ===` | the test data is inserted here | steps **after** the data (submit, confirm) go below this marker |

- Each marker must appear **exactly once**, in this order.
- The `test('test', async ({ page }) => { … })` wrapper from codegen may stay; it is removed automatically.
- Use a **full URL** in SETUP's `page.goto(...)`. It is used to verify the test stayed in the app.
- If the page shows a loading overlay, add `await waitForLoading(page);` yourself where needed. It is never added automatically.
- **Never put passwords in `_flows`.** It is committed to git and copied into the spec.

**About login steps in SETUP**

- `microsoft`: the runner uses the saved Microsoft profile. Keep only the steps *inside* the app after sign-in (e.g. choosing a branch).
- `form`: the runner loads the saved session, so the **login form never appears**. Keep every step **except the ones on the login form itself** (email, password, the form's submit button). A "Login" button on the site that leads to the form stays — with a saved session it takes you straight into the app.

  ```typescript
  // === SETUP ===
  await page.goto('https://app.example.com/');
  await page.getByRole('button', { name: 'Login' }).click();          // keep — button on the site
  // await page.getByRole('textbox', { name: 'Email' }).fill('…');    // remove — login form
  // await page.getByRole('textbox', { name: 'Password' }).fill('…'); // remove — login form
  // await page.getByRole('button', { name: 'Sign in' }).click();     // remove — login form
  ```

  If the session expires, tests stop at the login form. Run `setup-form-auth.bat` again.

### Example — print buttons (nothing after DATA)

Each test case clicks a different button and nothing follows:

```typescript
  // === SETUP ===
  await page.goto('https://example.com/app/');

  // === PER TEST ===
  await page.getByRole('button', { name: 'Search' }).click();

  // === DATA ===
});
```

```typescript
export const printLocators: Array<(page: Page, value?: string) => Locator> = [
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }).first(),
  (page, value) => page.getByRole('button', { name: value }).first(),
];
```

Keep `.first()` when the page has several buttons with the same name (e.g. one per table row). Without it the test fails with *"strict mode violation"*.

### Locator types

| Type | Written as | CSV value | Use for |
|---|---|---|---|
| **Static** | `(page) => …` | text to type, option to pick, or `\|click` | textboxes, dropdowns, fixed buttons |
| **Parametric** | `(page, value) => …` | the name of the button to click | a button chosen differently per test case |

Parametric locators must have exactly two parameters and **no default value** (`(page, value = '') =>` breaks them).

### Buttons without a name

- **Same button in every test case:** static with position — `(page) => page.locator('.toolbar').getByRole('button').nth(2)`, CSV `|click`.
- **Different button per test case:** one static slot per button (CSV `|click,,` / `,|click,`), or a numbered parametric locator:
  `(page, value) => page.locator('.toolbar').getByRole('button').nth(Number(value) - 1)` with CSV `1`, `2`, `3`.
- Always narrow `.nth()` to a container (`.toolbar`). A bare `page.getByRole('button').nth(2)` clicks the wrong button as soon as the page layout changes.
- If you own the app, adding `aria-label` to the buttons is the best fix.

---

## 5. Setup 3 — Locators

Converts raw locator lines in `_locators/<feature>.ts` into the ordered list, and decides which buttons are parametric.

**Run:** paste the Setup 3 template ([Appendix A](#setup-3--locators)).

**Check the result:**
- the order matches the order you want in the CSV
- buttons that change per test case are parametric `(page, value) =>`
- `.first()` / `.nth()` were kept where needed
- no comments in the file (the meaning of each position lives in the CSV)

---

## 6. Setup 4 — Scenarios

Turns lines of `scenario name : value` into `_scenarios/<feature>.csv`.

**Run:** paste the Setup 4 template ([Appendix A](#setup-4--scenarios)) with your scenarios:

```
Book Thai massage : Thai massage,Thursday 1 October,11:00,test,0812345678
Book without phone : Thai massage,Thursday 1 October,13:00,test,
```

### Writing a value

The value is a comma-separated list. **Item N goes to locator N.**

| Locator at that position | Write | Example |
|---|---|---|
| textbox | text to type | `test` |
| dropdown | option to pick | `New job` |
| parametric button | button name (or a unique part of it) | `Thai massage` |
| fixed button | `\|click` | `\|click` |
| not used in this test case | nothing | `,,` |

**Rules**

- The number of items must equal the number of locators. 5 locators → always 4 commas.
- Names are matched as "contains", so `Thai massage` finds `Thai massage ฿ 350 60 min`.
- Commas inside an item are not possible. For `Hot stone ฿ 1,200`, write `Hot stone`.
- `name : value` is split at the **first** ` : ` (with spaces), so `11:00` is safe.

**If the CSV already exists**, Setup 4 **appends** new rows with the next TC-IDs. Existing rows are never changed. A scenario whose name already exists is skipped and reported.

---

## 7. Setup 5 — Generate the feature

**Run:** `Ctrl+Shift+P` → **Run Task** → **Setup 5 — Generate feature** → Project / AccessFlow / Module / Feature

Creates:

```
Bookings/bookings/
├── bookings.spec.ts      the flow with test data inserted
├── bookings.helper.ts    fills / picks / clicks each item
├── bookings.data.ts      the CSV rows
└── bookings.types.ts
```

It takes about a second. Before writing anything it checks the three source files: markers, locator format, item counts, encoding, file name case. If anything is wrong it **writes nothing** and tells you what to fix and where.

Do not edit the flow steps in `spec.ts`. Change `_flows` instead, delete the feature folder, and run Setup 5 again. Adding extra `expect(...)` checks to `defaultVerify` in `spec.ts` is fine.

---

## 8. Run the tests

### `Test-Local/run-local.bat` (all AuthTypes)

1. Double-click `run-local.bat`
2. Pick **Project** → **Access Flow** → **Module** (or all modules) → **Feature** (or all)
3. Pick **Run ALL tests** or **Select SPECIFIC test file**
4. The HTML report opens when the run finishes

`microsoft` and `form` access flows **must** use `run-local.bat` — it loads the saved login.

### Command line (`none` only)

```bash
pnpm exec playwright test Test-Local/Nebula-Spa/No-Auth/Bookings/bookings
```

| Add | To |
|---|---|
| `--headed` | watch the browser |
| `--ui` | step through tests visually |
| `-g "TC001"` | run one test case |

Report: `pnpm exec playwright show-report`

### What a pass means

Each generated test checks that **no error dialog appeared** and the page **stayed on the app's site**. It does not check business results (e.g. that a search returned rows). Add `expect(...)` to `defaultVerify` in the spec when you need that.

---

## 9. Add or change test cases

| I want to | Steps |
|---|---|
| **Add** test cases | Setup 4 with only the new scenarios → **Setup 7** |
| **Edit / delete** test cases | edit the CSV in **VS Code** → **Setup 7** |
| Locators changed (added / removed / reordered) | update every CSV row to the new count → **Setup 7** |

**Setup 7** (`Run Task` → **Setup 7 — Update test data**) rewrites only `data.ts` and lists which TC-IDs were **added** and **removed**. Check the removed list — deletions should be intentional.

**Do not edit the CSV in Excel.** Excel may save it in a non-UTF-8 encoding (non-English text becomes `�`) and turns values like `0812345678` or `11:00` into numbers or times. If you must use Excel, use *Save As → CSV UTF-8*.

---

## 10. New action or field type (Setup 6)

Use Setup 6 when a run or Setup 7 reports:

- **unknown action** — you need something other than `|click` (e.g. `|download`, `|check`)
- **unknown locator type** — a field the helper cannot fill (e.g. a date picker)

**Run:** paste the Setup 6 template ([Appendix A](#setup-6--extend-helper)) and describe what you need in plain words. No code needed — the agent writes it and shows you the change.

Then use the new action in the CSV → **Setup 7** → run.

**Limits**

- The extension applies to **that feature only**.
- Running Setup 5 again for that feature rebuilds `helper.ts` and **removes** the extension.
- To make it available for every future feature, a developer adds it to the helper template in `scripts/setup-5.mjs`.

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Tasks do not appear in Run Task | VS Code opened the wrong folder | open the `ttest-playwright` folder itself |
| `node` is not recognized | Node not on PATH for VS Code | restart VS Code; check `node --version` |
| Recorder: *Microsoft profile is not ready* | login setup not done | [Login setup](#microsoft) |
| Test fails at the first step (login page) | login session expired or not loaded | redo login setup; run via `run-local.bat` |
| *strict mode violation* | several elements match | add `.first()` to that locator, or use a longer button name |
| Date button not found | the date in the CSV has passed | update the CSV → Setup 7 |
| Slot / time button disabled | a previous run already booked it | reset the app data before running |
| `�` or `à¸…` in files | saved in the wrong encoding (Excel, PowerShell) | re-save as UTF-8 in VS Code |
| *case differs — Linux/CI will not find it* | file names differ in upper/lower case | rename so all names match exactly |
| Test passes but nothing happened | default check is shallow | add `expect(...)` to `defaultVerify` |
| Script messages in the wrong language | system language detection | [Appendix B](#appendix-b--script-language) |

---

## Appendix A — Prompt templates

Paste into your AI agent in **Agent mode**. Keep the `Read: #file:` line. Replace `<…>`.

### Setup 1 — Create-Project

(Faster as a Task.)

```markdown
### Setup 1 — Create-Project

Read: #file:prompts/setup-1-create-project.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- AuthType: <none | microsoft | form>
```

### Setup 3 — Locators

```markdown
### Setup 3 — Bootstrap locators

Read: #file:prompts/setup-3-modify-locators.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

### Setup 4 — Scenarios

```markdown
### Setup 4 — Create scenarios

Read: #file:prompts/setup-4-create-scenarios.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>

**Scenarios**
<scenario name 1> : <value 1>
<scenario name 2> : <value 2>
```

### Setup 5 — Generate feature

(Faster as a Task.)

```markdown
### Setup 5 — Create feature

Read: #file:prompts/setup-5-create-features.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

### Setup 6 — Extend helper

```markdown
### Setup 6 — Extend action

Read: #file:prompts/setup-6-extend-action.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>

**Extension**
<the error message, or what you need — e.g. "|download: click, then wait for the file download">
```

### Setup 7 — Update test data

(Faster as a Task.)

```markdown
### Setup 7 — Update TCs

Read: #file:prompts/setup-7-update-tcs.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

---

## Appendix B — Script language

The scripts print Thai or English, following the system language. To force one, open `.vscode/tasks.json` and set:

```json
"env": { "TTEST_LANG": "en" }
```

(`"th"` for Thai, empty for automatic). From a terminal: `set TTEST_LANG=en` (cmd) or `$env:TTEST_LANG="en"` (PowerShell).