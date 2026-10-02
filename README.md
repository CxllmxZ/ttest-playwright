# ttest-playwright

A Playwright test framework where **QA writes test data in CSV** and the test code is **generated, not hand-written**.

Developers record a flow once with Playwright codegen. QA adds scenarios as rows in a CSV. A script turns the three into a ready-to-run Playwright spec — deterministically, the same output every time.

AI agents (GitHub Copilot, Cursor, …) are used only for the steps that need judgment. Everything mechanical is done by plain Node scripts.

---

## Why

Writing Playwright tests by hand doesn't scale to QA teams that don't code. Letting an AI generate the whole test file does not work reliably either: in practice it renames buttons, invents steps, and corrupts non-ASCII text.

ttest-playwright splits the work:

| Part | Done by | Why |
|---|---|---|
| Record the flow and selectors | Developer (Playwright codegen) | Selectors must come from the real app |
| Decide what each test case does | QA (CSV) | No code needed |
| Generate the test files | **Script** | Pure templating — must be exact |
| Classify locators, draft scenarios, extend the helper | AI agent | Needs judgment |

---

## How it works

Each feature has three source files and four generated files:

```
_flows/<feature>.ts        dev    one recorded flow, split by markers
_locators/<feature>.ts     dev    ordered list of fields/buttons
_scenarios/<feature>.csv   QA     one row per test case
            │
            ▼   node scripts/setup-5.mjs
<feature>/
├── <feature>.spec.ts      the flow, with test data inserted
├── <feature>.helper.ts    fills / selects / clicks each item
├── <feature>.data.ts      CSV rows as test cases
└── <feature>.types.ts
```

**Core rule: Locator = WHERE, Value = WHAT.** Position N in the locator list matches item N in the CSV value.

```typescript
// _locators/bookings.ts
export const bookingsLocators: Array<(page: Page, value?: string) => Locator> = [
  (page, value) => page.getByRole('button', { name: value }),  // service  (chosen per test)
  (page, value) => page.getByRole('button', { name: value }),  // date
  (page, value) => page.getByRole('button', { name: value }),  // time
  (page) => page.getByRole('textbox', { name: 'Full name' }),   // name
  (page) => page.getByRole('textbox', { name: 'Phone' }),       // phone
];
```

```csv
TC-ID,Module,Feature,Scenario,Value
TC001,Bookings,Bookings,"Book Thai massage","Thai massage,Thursday 1 October,11:00,test,0812345678"
TC002,Bookings,Bookings,"Book without phone","Thai massage,Thursday 1 October,13:00,test,"
```

| CSV item | Result |
|---|---|
| text at a textbox | fill |
| text at a combobox | pick option |
| text at a parametric button | click the button with that name |
| `\|click` at a fixed button | click |
| empty | skip |

The full vocabulary is in [`AGENTS.md`](AGENTS.md) Section 9.

---

## Requirements

- **Node.js 18+**
- **pnpm**
- **VS Code** (recommended) — setups 1, 5, 7 run as VS Code Tasks
- **An AI agent with file access** for setups 3, 4, 6 (e.g. GitHub Copilot in Agent mode)
- **Windows** for the interactive runners and auth helpers (`*.bat` / `*.ps1`). The generator scripts (`scripts/*.mjs`) and the tests themselves are cross-platform.

---

## Install

```bash
git clone https://github.com/<owner>/ttest-playwright.git
cd ttest-playwright
pnpm install
pnpm exec playwright install
```

On Windows you can run `Test-Local/setup.bat` instead; it checks the required tools.

---

## Workflow

Full step-by-step guide: [English](doc/GUIDE.md) · [ภาษาไทย](doc/GUIDE.th.md)

| Setup | What | How |
|---|---|---|
| **1** Create-Project | project + access flow + module + auth config | ⚡ Task |
| **2** Form login | recorded login pasted in `_login/login-locators.ts` → `_login/login.setup.ts` (form login only) | ⚡ Task |
| **3** Locators | codegen → ordered locator list | AI prompt |
| **4** Scenarios | `name : value` lines → CSV (appends to an existing CSV) | AI prompt |
| **5** Create feature | generate the 4 files | ⚡ Task |
| **6** Extend helper | add a new `\|action` or locator type to one feature | AI prompt |
| **7** Update TCs | regenerate `data.ts` after CSV/locator changes | ⚡ Task |

**⚡ Task** = VS Code → `Ctrl+Shift+P` → **Run Task** → pick the setup → fill in the prompts. No AI involved; takes about a second.

**AI prompt** = paste the template from the [user guide](doc/GUIDE.md#appendix-a--prompt-templates) into your agent. The agent follows the rules in `prompts/`.

### New feature, step by step

1. **Setup 1** — create the module (once per module)
2. Record the flow with Playwright codegen. Save it as `_flows/<feature>.ts` and add three markers:
   ```typescript
   // === SETUP ===        runs once per test (beforeEach): open page, log in
   // === PER TEST ===     steps before the test data
   // === DATA ===         test data goes here; steps after it run after the data
   ```
3. Put the recorded field/button locators in `_locators/<feature>.ts` → **Setup 3**
4. Write scenarios → **Setup 4**
5. **Setup 5**
6. Run the tests

### Add or change test cases

- Add: **Setup 4** with only the new scenarios → **Setup 7**
- Edit / delete: edit the CSV in a text editor (not Excel — it changes encoding and number formats) → **Setup 7**

---

## Running tests

| `authType` | Command |
|---|---|
| `none` | `pnpm exec playwright test Test-Local/<Project>/<AccessFlow>/<Module>/<feature>` |
| `microsoft`, `form` | `Test-Local/run-local.bat` → pick project / access flow / module (loads the login session) |

Useful flags for `playwright test`: `--headed`, `--ui`, `-g "TC001"`. Report: `pnpm exec playwright show-report`.

The generator prints the right command for each feature.

---

## Authentication

Set per access flow in `Test-Local/<Project>/<AccessFlow>/project.config.json`:

| `authType` | Setup before running tests |
|---|---|
| `none` | nothing |
| `microsoft` | `Authen/Microsoft/setup-microsoft-auth.bat` — log in once, session is saved ([guide](doc/GUIDE.md#path-b--microsoft-login-microsoft)) |
| `form` | record the login once → **Setup 2** → `Authen/Form-Login/setup-form-auth.bat` ([guide](doc/GUIDE.md#path-c--form-login-form)) |

Session files, browser profiles, `.env` and the login scratch file (`_login/login-locators.ts`) are git-ignored.

---

## Project layout

```
ttest-playwright/
├── AGENTS.md              rules for AI agents (also the full reference)
├── doc/                   user guide (GUIDE.md, GUIDE.th.md) and login guides
├── prompts/               rule files for AI-driven setups
├── scripts/               generators: create-project.mjs, form-login.mjs, setup-5.mjs
├── .vscode/tasks.json     Setup 1 / 5 / 7 as VS Code Tasks
├── Authen/                login helpers (Microsoft, form)
├── Test-Local/            tests run through the local runner
│   ├── run-local.bat      interactive runner
│   └── <Project>/<AccessFlow>/<Module>/
│       ├── _flows/  _locators/  _scenarios/
│       └── <feature>/     generated
├── Test-Prod/             tests against public URLs
└── src/                   experimental YAML runner (not used by the setup workflow)
```

---

## Example project

`Test-Local/Nebula-Spa/No-Auth/Bookings` is a complete example: three parametric buttons, two text fields, generated files included. It targets a booking demo app at `http://localhost:8787`, which is not part of this repository — read it as a reference.

---

## Known limitations

- **Dates in CSV are absolute.** A value like `Thursday 1 October` stops working once that date has passed. Relative dates are not supported yet.
- **Setup 6 extensions are per feature.** Regenerating a feature with Setup 5 rebuilds `helper.ts` and drops them. Make an extension permanent by adding it to the helper template in `scripts/setup-5.mjs`.
- **File names are case-sensitive.** `_flows/`, `_locators/`, `_scenarios/` and the feature folder must use the exact same name. The generator checks this, because Windows hides the mismatch and Linux CI does not.
- **Default verification is shallow.** Generated tests check that no error dialog appears and the page stays on the app's origin. Add feature-specific `expect(...)` calls to `defaultVerify` when needed.
- **Buttons without an accessible name** work through position-based locators (`.nth()`), which break when the page layout changes. If you own the app, add `aria-label`s.

---

## Contributing

Issues and pull requests are welcome. When changing generated code, change the template in `scripts/setup-5.mjs` — it is the single source of truth — and update `AGENTS.md` Section 8/9 if behavior changes.

---

## License

[MIT](LICENSE)