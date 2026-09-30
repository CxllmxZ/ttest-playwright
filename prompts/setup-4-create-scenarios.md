# Setup 4 — Create / Append Scenarios CSV (Rules)

Rules file for AI. Do NOT paste this file's content as prompt — user pastes minimal invocation (see `doc/AGENT_PROMPTS.md`).

**Purpose:** Turn `scenario : value` lines into rows of `_scenarios/<feature>.csv`.

- CSV does not exist → **create** it.
- CSV exists → **append** new rows at the end. Existing rows are never changed, reordered, renumbered, or deleted.

To change or delete an existing row, the user edits the CSV directly (in VS Code, not Excel) — not this setup.

---

## What the user paste looks like

```markdown
### Setup 4 — Create scenarios

Read: #file:prompts/setup-4-create-scenarios.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>

**Scenarios**
<Scenario name 1> : <value 1>
<Scenario name 2> : <value 2>
```

---

## Scope

- **DO NOT open interactive input dialogs.** Read files from disk directly.
- Write only `_scenarios/<feature>.csv`.
- `_flows/`, `_locators/`, feature folder files are READ-ONLY.
- DO NOT run tests, terminal commands, or scripts.
- DO NOT convert raw codegen — if `_locators/` is not array format, STOP (Setup 3's job).

### CRITICAL — File writing method

- Use file tools directly (`create_file`, `str_replace`, insert/edit tools).
- **DO NOT** use PowerShell, cmd, bash, or any shell to write files.
- Encoding: UTF-8 without BOM. Thai text must be preserved exactly.
- Write real newlines, never literal `` `n `` or `\n`.
- **Append mode:** add lines after the last line using an edit/insert tool. Do not rewrite existing lines. If your tool can only write the whole file, copy every existing line character-for-character.

---

## Rules

Execute in this order.

### Read inputs

1. Verify the prompt has a `**Scenarios**` block with at least one line. If missing → **STOP**: `Scenarios block required`.

2. Read `Test-Local/<project>/<access-flow>/<module>/_locators/<feature>.ts` with file tools. If missing → **STOP**: `Cannot read _locators/<feature>.ts`.

3. Verify it exports `<featureCamelCase>Locators` with ONE of these types:
   - `Array<(page: Page, value?: string) => Locator>` (has parametric buttons)
   - `Array<(page: Page) => Locator>` (static only)

   Anything else → **STOP**: `_locators/<feature>.ts is not in array format — run Setup 3`.

4. Count array entries → **N**. Note which indexes are **parametric**: entries written `(page, value) => ...` (2 parameters).

### Parse scenarios

5. For each non-empty line in the Scenarios block: split at the **first** ` : ` (space + colon + space) → `name`, `value`. Trim both.
   - No ` : ` in the line → **STOP**: `Line <n> missing ' : ' separator`.
   - `11:00` (no spaces) is part of the value, not a separator.

6. Split `value` by `,` → items. Validate each scenario:
   - Item count **must equal N** → else **STOP**:
     `Scenario '<name>' has <M> items, expected <N> (<N-1> commas).`
   - At a **parametric** index, `|click` is not allowed (a button name is required) → **STOP**:
     `Scenario '<name>' item <i+1>: this position needs a button name, not |click.`
   - Names inside the same Scenarios block must be unique → else **STOP**: `Duplicate scenario name '<name>'`.

   Validate **all** scenarios first and report every problem together. Write nothing if any check fails.

### Existing CSV?

7. Check `.../_scenarios/<feature>.csv`.

   **Not found → create mode.** Start at `TC001`. Module / Feature columns:
   - `Module` = Location Module as written
   - `Feature` = Location Feature with first letter uppercase (`print` → `Print`)

   **Found → append mode.** Read it:
   - First line must be exactly `TC-ID,Module,Feature,Scenario,Value` → else **STOP**: `Existing CSV header is wrong — fix the file first`.
   - If the file contains `�` or garbled Thai like `à¸` → **STOP**: `Existing CSV has corrupted Thai text (often saved by Excel) — fix the file first`.
   - Next TC-ID = highest existing `TC<number>` + 1, same zero-padding (`TC007` → `TC008`).
   - Module / Feature columns = copy from the first existing data row (keep the file consistent).
   - **Skip** any new scenario whose name already exists in the CSV (exact match). List skipped names in the report. Do not change the existing row.
   - If every scenario was skipped → write nothing, report that.

### Write rows

8. Each row:
   ```
   <TC-ID>,<Module>,<Feature>,"<Scenario name>","<value>"
   ```
   - Scenario and Value **always** wrapped in `"..."`
   - A `"` inside them is written as `""`
   - Preserve `|<action>` markers, Thai text, and empty items (`,,`) exactly
   - Create mode: header line first, then rows
   - Append mode: new rows after the last existing line (make sure the previous last line ends with a newline first)

### Verify

9. In conversation, for each written row report: `TC0xx: <N> items ✓`.
   This is a sanity check only — `scripts/setup-5.mjs` validates the CSV again strictly.

---

## Value rules (share with the user when they make mistakes)

| Position type | Put | Example |
|---|---|---|
| Textbox | Text to type | `test`, `0812345678` |
| Combobox / dropdown | Option to pick | `งานใหม่` |
| Parametric button (chosen per TC) | **Button name** | `นวดไทย ฿ 350 60 นาที` |
| Fixed button | `|click` | `|click` |
| Not used in this scenario | Empty | `,,` |

- A button name that contains a comma (e.g. `นวดหินร้อน ฿ 1,200 90 นาที`) cannot be written whole. Use a unique part without the comma: `นวดหินร้อน`.
- Item count must equal N. With 5 locators, a value always has 4 commas.

---

## Output

Report in Thai:
- Mode: สร้างใหม่ / เพิ่มต่อท้าย
- `<N>` locators
- Rows written: TC-IDs + names
- Skipped (name already exists): names, if any
- Next: new feature → **Setup 5**; feature folder already exists → **Setup 7**

---

## Stop conditions summary

| Signal | Report |
|---|---|
| No Scenarios block | `Scenarios block required` |
| `_locators/` missing | `Cannot read _locators/<feature>.ts` |
| `_locators/` not array | `not in array format — run Setup 3` |
| Line without ` : ` | `Line <n> missing ' : ' separator` |
| Item count ≠ N | `Scenario '<name>' has <M> items, expected <N>` |
| `|click` at parametric position | `needs a button name, not |click` |
| Duplicate name in block | `Duplicate scenario name '<name>'` |
| Existing CSV header wrong / corrupted | `fix the file first` |

---

## Example — create mode

`_locators/bookings.ts` has 5 entries: 3 parametric buttons, 2 textboxes. No CSV yet.

**Scenarios:**
```
จองนวดไทย : นวดไทย,วันพฤหัสบดีที่ 1 ตุลาคม,11:00,test,0812345678
จองโดยไม่กรอกเบอร์ : นวดไทย,วันพฤหัสบดีที่ 1 ตุลาคม,13:00,test,
```

**Creates:**
```csv
TC-ID,Module,Feature,Scenario,Value
TC001,Bookings,Bookings,"จองนวดไทย","นวดไทย,วันพฤหัสบดีที่ 1 ตุลาคม,11:00,test,0812345678"
TC002,Bookings,Bookings,"จองโดยไม่กรอกเบอร์","นวดไทย,วันพฤหัสบดีที่ 1 ตุลาคม,13:00,test,"
```

## Example — append mode

Existing CSV ends at `TC002`. **Scenarios:**
```
จองนวดไทย : นวดไทย,วันศุกร์ที่ 2 ตุลาคม,11:00,test,0812345678
จองอโรม่า : อโรม่า,วันศุกร์ที่ 2 ตุลาคม,14:00,แอนน์,0898765432
```

**Result:** `จองนวดไทย` skipped (name exists, TC001 unchanged). Appends:
```csv
TC003,Bookings,Bookings,"จองอโรม่า","อโรม่า,วันศุกร์ที่ 2 ตุลาคม,14:00,แอนน์,0898765432"
```

---

## Changelog

- 2026-09-28 (v10) — Append mode (existing CSV: add rows, never modify/renumber; skip duplicate names). Accepts parametric locator type. `|click` at parametric position rejected. Split at first ` : ` only. Scenario and Value always quoted, `"` escaped as `""`. File-writing rules (UTF-8, no shell). Corrupted existing CSV detected.