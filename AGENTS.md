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
            │
            ├── <Module>/                # Nested — multiple features or complex
            │   ├── _locators/           # Module-level (shared across features)
            │   │   ├── search.ts        # Named by feature
            │   │   ├── export.ts
            │   │   └── pagination.ts
            │   │
            │   └── <Feature>/           # Feature folder (no _locators inside)
            │       ├── <feature>.spec.ts
            │       ├── <feature>.helper.ts
            │       ├── <feature>.types.ts
            │       └── <feature>.data.ts
            │
            └── <SimpleModule>/          # Flat — single feature, simple CRUD
                ├── <name>.spec.ts       # e.g. car-model-add.spec.ts
                └── _locators/           # optional (module-level)
                    └── <name>.ts
```

### Auth types

| authType | Mechanism |
|---|---|
| `none` | Public pages, no login |
| `microsoft` | Azure AD SSO — persistent Chromium profile |
| `form` | Email/password login — session storage (cookies or sessionStorage) |

### Structure decision

| Structure | Use when | Example |
|---|---|---|
| **Flat** (spec directly in module) | Simple CRUD, single feature, <10 test cases | `car-model/car-model-add.spec.ts` |
| **Nested** (feature folder + 4 files) | Multiple features per module, OR 3+ control types, OR 10+ data-driven cases | `dashboard/search/search.spec.ts` + `.helper.ts` + `.types.ts` + `.data.ts` |

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
1. Codegen target page → save raw output to `<module>/_locators/<feature>.ts`
2. Get test scenarios (from QA's Excel, business req, or dev observation)
3. Create feature folder: `<module>/<feature>/`
4. Reference nearest similar feature for pattern
5. Create 4 files: `spec.ts` + `helper.ts` + `types.ts` + `data.ts`
6. AI composes test steps from scenarios + locators

**Files touched:** 4 new files in new folder + 1 locator file in module

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
    │     └─► No ──► Case 3 (new folder + 4 files + module _locators)
```

---

## Section 5: Locator Workflow

**Rule:** AI does not generate raw locators. Locators come from manual Playwright codegen.

**Location:** `<module>/_locators/<feature>.ts` — module-level, named by feature

**Rationale:** Multiple features in same module often share fields (e.g., dashboard search + export both use dealer filter). Module-level enables reuse; feature-named files preserve ownership.

### Workflow

1. Dev runs codegen on target page → copy raw output
2. Paste into `<module>/_locators/<feature>.ts` (create `_locators/` if missing)
3. Ask AI: *"generate feature based on `_locators/<feature>.ts` + scenarios below"* + paste scenarios
4. AI reads:
   - `<module>/_locators/<feature>.ts` (locators — what's on the page)
   - Provided scenarios (what to test)
   - Reference feature's `helper.ts` + `types.ts` (target pattern)
5. AI generates skeleton — human reviews + applies
6. Locator file stays as reference for future changes

### Naming convention

- **Per feature** — `search.ts`, `export.ts`, `pagination.ts`
- **Shared fields** (optional) — `common-fields.ts` when 3+ features share fields
- **Never commit** — gitignored (`**/_locators/`)

---

## Section 6: Adding a New Feature Workflow

1. **Codegen exploration + save**
   - Open target page
   - Interact with every field, button, dropdown for the new feature
   - Save raw output to `<module>/_locators/<feature>.ts`

2. **Gather test scenarios**
   - From QA's Excel — primary source
   - From business requirements — supplementary
   - From dev observation — for edge cases

3. **Choose structure** (flat vs nested — Section 1)

4. **Prompt AI with:**
   - Locators file path
   - Scenarios list
   - Reference pattern (existing similar feature)

5. **AI generates:**
   - Feature folder + 4 files
   - Types union based on locators
   - Helper switch mapping scenarios to actions
   - Data cases from scenarios
   - Test spec that composes flow

6. **Human reviews:**
   - Verify locator strategy (index, name, RegExp)
   - Fill any TODO markers (specific values from QA)
   - Adjust assertions if needed

7. **Run + verify + regenerate JSON cache** — `analyze-project.bat`

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

### When to move locator to `common-fields.ts`

- Field used in 3+ features → extract to shared file
- Field used in 1-2 features → keep in feature-specific file

---

## Contribution notes

- Update this file when new pattern emerges that AI should know
- Keep sections concise — AI ignores overly long docs
- Prefer **pointing to reference implementations** over inlining long examples
- Preserve Thai UI labels exactly (don't romanize or translate)
- After adding/removing feature, run `analyze-project.bat` to refresh JSON cache