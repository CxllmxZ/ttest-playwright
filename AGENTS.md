# AGENTS.md — ttest-playwright

Instructions for AI agents (GitHub Copilot, Cursor, Claude, ChatGPT) working with this framework.

---

## Section 1: Project Overview

**ttest-playwright** = universal Playwright test runner supporting multiple projects with different auth mechanisms.

### Folder structure

```
ttest-playwright/
├── AGENTS.md                            # This file (agent instructions)
├── analyze-project.bat / .ps1           # JSON structure generator
├── .agent-cache/                        # JSON cache (gitignored)
│   └── project-structure.json
│
├── Authen/                              # Shared auth infrastructure
│   ├── Microsoft/                       # Azure AD SSO
│   └── Form-Login/                      # Form-based auth
│
├── Test-Prod/                           # Public URL tests (flat: project/spec)
│
└── Test-Local/                          # Auth-required tests
    └── <Project>/                       # e.g. WEF, Nebula-Spa
        └── <AccessFlow>/                # e.g. Microsoft-Login, Admin-Login
            ├── project.config.json      # { "authType": "microsoft|form|none" }
            └── <Module>/                # e.g. dashboard, car-model
                └── <Feature>/           # e.g. search, add, edit
                    ├── <feature>.spec.ts
                    ├── <feature>.helper.ts
                    ├── <feature>.types.ts
                    ├── <feature>.data.ts
                    └── _locators/       # Raw codegen dumps (gitignored)
```

### Auth types

| authType | Mechanism |
|---|---|
| `none` | Public pages, no login |
| `microsoft` | Azure AD SSO — persistent Chromium profile |
| `form` | Email/password login — session storage (cookies or sessionStorage) |

### Simple vs complex module

| Structure | Use when |
|---|---|
| **1 file** (spec only) | Simple CRUD, single flow, <10 test cases |
| **4 files** (spec + helper + types + data) | 3+ control types, 10+ test cases, data-driven |

---

## Section 2: Universal Principles

### Locator rules

- **Prefer role-based** selectors: `page.getByRole('button', { name: 'ค้นหา' })`
- **Never use** auto-generated IDs (`#radix-*`, `#mat-*`, UUIDs) — they change per render
- **Avoid `exact: true`** with Thai labels containing `/`, spaces, or special chars — use partial match or RegExp
- **Preserve Thai UI text** exactly as it appears in the app (`'ค้นหา'`, `'บันทึก'`, `'ไม่พบข้อมูล'`)

### Verification

- Import shared helpers from `Test-Local/<project>/_shared/verify-helpers.ts`
- Use `verifySearchResult`, `verifyEmptyState`, `verifyRecordCount`, `verifyFieldError`, `verifySuccessToast`, `verifyNavigatedTo`
- Never use bare `expect(...).toBeVisible()` for common patterns — use typed helper

### Security (never commit)

- `session-storage.json`, `state.json`, `profile/`
- `.env` files
- `_locators/**` (raw codegen may include real UI state)
- `.agent-cache/*.json`

---

## Section 3: Discovery Mechanism

AI agents can discover project structure via two paths — user chooses per session.

### Option A: Read JSON cache (token-efficient)

**File:** `.agent-cache/project-structure.json`

**Generate:** Run `analyze-project.bat` (or `.ps1`) — scans `Test-Local/` and writes JSON

**Contents:** All projects → access flows → modules → features → files, control types, test case count

**When to use:**
- Chat AI (Claude, ChatGPT web) — paste JSON as context
- Any AI when workspace scanning is expensive

**When to regenerate:** After adding/renaming feature, module, or access flow

### Option B: Scan workspace directly

**When to use:** Copilot/Cursor with native workspace access

**How:** Follow folder convention in Section 1 to locate files

---

## Section 4: Pattern Design Workflow

When adding a scenario, identify which of 3 cases applies:

### Case 1 — Add data row (pattern stable, control type covered)

**Signal:** Feature exists, control type in `types.ts` already covers scenario

**Action:** Add one object to `<feature>.data.ts`

**Files touched:** 1 (`data.ts`)

**Example:** `Search by Receipt = "HQ0000021"` — `textbox` case already exists

### Case 2 — Extend pattern (feature exists, new control type)

**Signal:** Feature exists but scenario requires new control type (e.g., checkbox filter)

**Action:**
1. Add case to `<feature>.types.ts` union
2. Add case to `<feature>.helper.ts` switch
3. Add test case(s) to `<feature>.data.ts`

**Files touched:** 3 (`types.ts` + `helper.ts` + `data.ts`)

### Case 3 — New feature (new pattern, new folder)

**Signal:** Feature doesn't exist — concept differs from existing features (e.g., Search → Export)

**Action:**
1. Create folder: `<module>/<feature>/`
2. Reference nearest similar feature (see Discovery)
3. Create 4 files: `spec.ts` + `helper.ts` + `types.ts` + `data.ts`
4. Get locators via codegen → paste in `_locators/raw-codegen.ts`
5. Refactor locators into pattern

**Files touched:** 4 new files in new folder

### Decision tree

```
New scenario request
    │
    ├─► Same feature as existing?
    │     │
    │     ├─► Yes ─► Control type covered in types.ts?
    │     │         │
    │     │         ├─► Yes ─► Case 1 (add data row)
    │     │         └─► No  ─► Case 2 (extend types + helper)
    │     │
    │     └─► No ──► Case 3 (new folder + 4 files)
```

---

## Section 5: Locator Workflow

**Rule:** AI does not generate raw locators. Locators come from manual Playwright codegen.

### Workflow

1. Dev runs codegen → copy raw output
2. Paste into `<module>/<feature>/_locators/raw-codegen.ts` (create folder if missing)
3. Ask AI: *"refactor `_locators/raw-codegen.ts` into `helper.ts` pattern"*
4. AI reads:
   - `_locators/raw-codegen.ts` (source)
   - `<feature>.helper.ts` (target pattern)
   - `<feature>.types.ts` (schema)
5. AI generates refactored code — human reviews + applies
6. Raw file stays as reference for future regen

### `_locators/` convention

- **Per feature** — one folder per feature
- **Any file name** — `raw-codegen.ts`, `dealer-fields.ts`, etc.
- **Never commit** — gitignored (`**/_locators/`)

---

## Section 6: Adding a New Module Workflow

1. **Explore via codegen**
   - Open target page
   - Interact with every field, button, dropdown
   - Note field types and ordering (`first()`, `nth(1)`, etc.)
   - Save raw output to `<module>/<feature>/_locators/raw-codegen.ts`

2. **Choose structure** (1-file vs 4-file — Section 1)

3. **Design types union**
   - One case per field type
   - Named fields (unique) → `named<Type>` case
   - Ordered fields (repeated type) → `<Type>` with `controlIndex`
   - Reference: existing feature's `types.ts`

4. **Implement helper**
   - Switch on `controlType`
   - Import verify helpers from `_shared/verify-helpers.ts`

5. **Skeleton spec + verify with 1-2 test cases**

6. **Data expansion** — Fill `data.ts` from QA's scenarios

7. **Regenerate JSON cache** — `analyze-project.bat` (if using Option A discovery)

---

## Section 7: Decision Trees

### When to add new verify helper

- Pattern used across 3+ specs → extract to `_shared/verify-helpers.ts` (rule of three)
- Pattern used in 1-2 specs → inline in spec

### When to create new AGENTS.md (nested)

- **Never** — this framework is universal by design
- If rules must differ per project → discuss refactoring framework instead

### When to extract to `_shared/`

- Helper function used across 3+ specs → extract
- Login flow used across 3+ specs → extract to `<project>/_shared/`

---

## Contribution notes

- Update this file when new pattern emerges that AI should know
- Keep sections concise — AI ignores overly long docs
- Prefer **pointing to reference implementations** over inlining long examples
- Preserve Thai UI labels exactly (don't romanize or translate)
- After adding/removing feature, run `analyze-project.bat` to refresh JSON cache
