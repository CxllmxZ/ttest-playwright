# Setup 1 — Create-Project (Rules)

Rules file for AI. User pastes a minimal invocation (see `doc/AGENT_PROMPTS.md`).

Creates project + access flow + module + `project.config.json` + `_flows/ _locators/ _scenarios/` in one step (replaces old Setup 1 + Setup 2).

The work is done by `scripts/create-project.mjs`, not by you. Your job: run it, then explain the result in the user's language (the language they wrote the prompt in).

> Faster alternative without AI: VS Code → `Ctrl+Shift+P` → **Run Task** → "Setup 1 — Create-Project".

---

## What the user paste looks like

```markdown
### Setup 1 — Create-Project

Read: #file:prompts/setup-1-create-project.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- AuthType: <none | microsoft | form>
```

Extract the 4 values exactly as written. Do not change case, spacing, or spelling — the script validates them.

---

## Rules

1. Requires Copilot **Agent mode**. If you cannot run terminal commands → STOP: "Setup 1 ต้องใช้ Agent mode"
2. Check `scripts/create-project.mjs` exists. If missing → STOP: "ไม่พบ scripts/create-project.mjs". **Do NOT create it.**
3. Run exactly once, from the repo root:
   ```
   node scripts/create-project.mjs <project> <access-flow> <module> <auth-type>
   ```
4. Report the output to the user in the user's language (the language they wrote the prompt in). The script prints Thai or English depending on the system language (`TTEST_LANG`).

## DO NOT

- ❌ Create folders or files yourself (not even if the script fails)
- ❌ Edit `project.config.json` or anything the script created
- ❌ Retry with changed values (e.g. fixing case) — tell the user and let them decide
- ❌ Run any other command

## Reporting

- **Exit 0:** summarize what was created. If the output has `⚠️ existing projects` / `⚠️ โปรเจคที่มีอยู่ก่อนหน้า`, ask the user to confirm the new project name is intended (not a typo).
- **Exit 1:** nothing was created. Show the message as-is — it already says what to fix. Do not guess further fixes.

---

## Changelog

- 2026-09-28 (v10) — Merged old Setup 1 (project folder) and Setup 2 (access + module + config) into one script-driven step. Setup 2 removed; Setups 3–7 keep their numbers.