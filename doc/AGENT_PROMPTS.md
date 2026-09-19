# AGENT_PROMPTS.md — Prompt Templates

Ready-to-use prompt templates for AI agents (GitHub Copilot, Claude, Cursor, ChatGPT) working with **ttest-playwright**.

Each case = one template. Copy → fill placeholders → send to agent.

---

## Which case?

| Case | When to use | Files touched |
|---|---|---|
| **Case 1** | Add test case(s) to existing feature (pattern already covers it) | 1 (`data.ts`) |
| **Case 2** | Extend existing feature — new control type needed | 3 (`types.ts` + `helper.ts` + `data.ts`) |
| **Case 3** | New feature — no existing pattern | 4 new files + 1 locator file |

Full decision tree in `AGENTS.md` Section 4.

---

## Case 1 — Add test case(s) to existing feature

**Use when:** pattern (types + helper + spec + locators) already exists. You just need to feed new scenarios from QA Excel through the existing pattern.

**You provide:** Location + scenarios (TC-ID / Scenario / Value / Expected)

**AI infers:** `controlType` + identifier field (`controlIndex` / `accessibleName` / `dropdownText`) by reading the 3 pattern files

### Template

```markdown
### Case 1 — Add test case(s) to existing feature

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>

**Scenarios to add** (from QA Excel)
| TC-ID | Scenario | Value | Expected |
|-------|----------|-------|----------|
| TC00X | <scenario name from Excel> | <value> | <expected result> |

**Rules**
1. Read `AGENTS.md` and `.agent-cache/project-structure.json`
2. Locate feature path from JSON
3. Read the 3 pattern files:
   - `<feature>.types.ts` — supported controlTypes union
   - `<feature>.helper.ts` — how each controlType is handled
   - `<feature>.data.ts` — existing scenario → control mappings
4. For each new scenario, infer control config in this order:
   a. **Direct match** — same or near-identical scenario name exists in `data.ts` → copy its `control` block as-is
   b. **Inferred match** — scenario name maps to a field defined in `<module>/_locators/<feature>.ts` AND `helper.ts` handles that controlType → build control block from locator
   c. **No match** → **STOP** and report: "Case 2 or 3 required — scenario '<name>' cannot be mapped to existing pattern"
5. Change ONLY: `testCaseId`, `scenario`, `value`, `expectedText`
6. Preserve Thai UI labels character-for-character (no romanize, no translate, no trim)
7. Modify ONLY `<feature>.data.ts` — append at end of test cases array
8. Do not touch: `helper.ts`, `spec.ts`, `types.ts`, `_locators/*`

**Output**
- Full modified `<feature>.data.ts`
- Per TC note: "TC00X inferred from <source> (control: <type> / <identifier>)"
  - source = "direct match TC00Z" | "locators + helper case '<type>'"
```

### Example — filled in

```markdown
### Case 1 — Add test case(s) to existing feature

**Location**
- Project: WEF
- AccessFlow: Microsoft-Login
- Module: dashboard
- Feature: search

**Scenarios to add**
| TC-ID | Scenario | Value | Expected |
|-------|----------|-------|----------|
| TC009 | Search by Receipt Number | HQ0000021 | HQ0000021 |
| TC010 | Search by Insured Name | สมชาย | สมชาย |
| TC011 | Search by Coverage Start Date | 15 | 15 |

**Rules** (as above)
**Output** (as above)
```

### Expected AI behavior

For the example above:

- **TC009** → matches existing `TC001` (`Search by Receipt Number`)  
  → copies `{ controlType: 'textbox', controlIndex: 0 }`  
  → changes `value` + `expectedText` only

- **TC010** → matches existing `TC005` (`Search by Insured Name`)  
  → copies `{ controlType: 'namedTextbox', accessibleName: 'ชื่อผู้เอาประกัน' }`

- **TC011** → matches existing `TC002` (`Search by Coverage Start Date`)  
  → copies `{ controlType: 'dateTextbox', controlIndex: 0 }`

### Stop conditions (AI must refuse)

| Signal | Report |
|---|---|
| Scenario name not in `data.ts` AND field not in `_locators/` | "Case 2 or 3 required — scenario '<name>' cannot be mapped" |
| Scenario needs `controlType` not in union | "Case 2 required — new control type needed" |
| Field label appears in `_locators/` but `helper.ts` has no case for its controlType | "Case 2 required — helper missing case for '<type>'" |

### Why user does not provide Field label

`controlType` + identifier (`accessibleName` / `controlIndex` / `dropdownText`) are decided during **Case 2/3** when pattern is designed. In Case 1 they are already fixed — asking user to repeat them invites drift between Excel and pattern.

User provides only what changes per test: **Scenario / Value / Expected**.

---

## Case 2 — Extend feature (new control type)

**TODO** — template pending design.

**Rough intent:** feature exists but scenario requires a control type not yet in `types.ts` union (e.g., add checkbox filter to search that only had textboxes and dropdowns before).

Will cover:
- Where new locator goes (append to existing `<feature>.ts` in `_locators/` — decision pending)
- Union extension in `types.ts`
- New case in `helper.ts` switch
- Seed test case(s) in `data.ts`

---

## Case 3 — New feature (new folder)

**TODO** — template pending design.

**Rough intent:** no existing pattern — codegen + scenarios → generate 4 files from scratch.

Will cover:
- Codegen → `_locators/<feature>.ts`
- Choose flat vs nested (Section 1 of AGENTS.md)
- Reference nearest similar feature
- Generate 4 files
- Fill TODO markers

---

## Changelog

- 2026-09-19 — Case 1 finalized. Case 2 + 3 pending.
