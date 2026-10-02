# Setup 2 — Form Login (Rules)

Rules file for AI. User pastes a minimal invocation (see `doc/GUIDE.md` Appendix A).

Converts a recorded login pasted into `Test-Local/<project>/<access-flow>/_login/login-locators.ts` (git-ignored scratch file) into `_login/login.setup.ts`, then resets the scratch file. The work is done by `scripts/form-login.mjs`, not by you. Your job: run it, then explain the result in the user's language.

Only for access flows with `authType: form`. Microsoft login needs no Setup 2.

---

## What the user paste looks like

```markdown
### Setup 2 — Form login

Read: #file:prompts/setup-2-form-login.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Session: <cookies | sessionStorage>
```

`Session` is optional; default `cookies` (cookies / localStorage — most apps).

---

## Rules

1. Requires Copilot **Agent mode**. If you cannot run terminal commands → STOP: "Setup 2 needs Agent mode".
2. Check `scripts/form-login.mjs` exists. If missing → STOP. **Do NOT create it.**
3. Run exactly once from the repo root:
   ```
   node scripts/form-login.mjs <project> <access-flow>
   ```
   Add `--session-storage` only if Session is `sessionStorage`.
4. Report the output (below).

## DO NOT

- ❌ Open, read out, repeat, or log `login-locators.ts` — it may contain the user's real password
- ❌ Edit `login.setup.ts` or `login-locators.ts` yourself, or retry with changed values
- ❌ Run any other command, including `setup-form-auth.bat`

## Reporting

- **Exit 0:** which fields became username / password, and the session type. If the output says the password was *guessed from order*, ask the user to confirm the field. Show any `⚠️` lines. Next: run `Authen/Form-Login/setup-form-auth.bat`.
- **Exit 1:** show the message as-is. If it warns that `login-locators.ts` still holds the real password, repeat it: the file is git-ignored, but the user should fix and rerun, or clear it.

## Changelog

- 2026-09-28 (v10) — New. Uses the free Setup 2 slot. Input is the git-ignored scratch file `_login/login-locators.ts`.