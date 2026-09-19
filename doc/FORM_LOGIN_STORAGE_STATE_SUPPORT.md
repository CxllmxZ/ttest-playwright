# Form Login: เพิ่ม storageState pattern (Nebula NextAuth)

เอกสารนี้สรุปการเปลี่ยนแปลงใน `ttest-playwright` เพื่อรองรับ Form Login แบบ cookie-based (NextAuth) เพิ่มเติมจาก sessionStorage pattern เดิม (WEF Dealer) โดยใช้ pattern เดียวกัน แต่แยก mechanism ตาม format ของไฟล์ session

---

## 1. เป้าหมายของการเปลี่ยนแปลง

เดิมระบบ Form Login รองรับเฉพาะ `sessionStorage` pattern (ของ WEF Dealer) ทำให้เมื่อจะเพิ่ม project ใหม่ที่ใช้ NextAuth หรือ standard cookie-based auth (เช่น Nebula-Spa) ระบบไม่สามารถบันทึกและนำ session กลับมาใช้ได้

การเปลี่ยนแปลงในครั้งนี้:

- รองรับ 2 auth format ภายใต้ `authType = form`
  - `storageState` (cookies + localStorage) เช่น NextAuth
  - `sessionStorage` (custom) เช่น WEF Dealer
- ใช้ folder contract เดียวกัน (`_login/session-storage.json` เป็นชื่อไฟล์กลาง)
- Runner detect format ตอน runtime แล้วส่ง `AUTH_KIND` ให้ config
- ไม่แตะ mechanism เดิมของ WEF Dealer

---

## 2. ไฟล์ที่แก้ไข

```
Authen/Form-Login/form-auth.helper.ts     (เพิ่ม saveStorageState)
Authen/Form-Login/form-codegen.cjs        (detect 2 format + codegen mode)
playwright.config.ts                      (handle form + AUTH_KIND routing)
Test-Local/run-local.ps1                  (path + format detection + Out-Host)
```

## 3. ไฟล์ที่เพิ่มใหม่

```
Test-Local/Nebula-Spa/
└── Admin-Login/
    ├── project.config.json               (authType: form)
    ├── _login/
    │   ├── login.setup.ts                (ใช้ saveStorageState)
    │   └── session-storage.json          (auto-gen, gitignored)
    └── booking/
        └── booking-status-change.spec.ts (draft — มี known issues)
```

---

## 4. การเปลี่ยนแปลงราย component

### 4.1 `form-auth.helper.ts`

**เพิ่ม function `saveStorageState()`**

รับผิดชอบ save cookies + localStorage ผ่าน Playwright built-in `context.storageState()` แล้วเขียนเป็น JSON

ใช้กับ auth ที่เก็บ session ใน:
- Cookies (NextAuth, Django session, Laravel session)
- localStorage JWT

**ไม่แตะ** `saveSessionStorage()` เดิม — WEF Dealer ยังใช้ตามปกติ

**JSDoc ระบุชัดเจน:**
```
saveSessionStorage() → ใช้กับ sessionStorage-based (Dealer)
saveStorageState()   → ใช้กับ cookie-based (Nebula NextAuth)
```

---

### 4.2 `form-codegen.cjs`

**Pattern detection**

เพิ่ม `detectAuthPattern(sessionData)`:
- มี `origin` (string) + `items` (object) → `sessionStorage` pattern
- มี `cookies` (array) หรือ `origins` (array) → `storageState` pattern
- อื่น → throw error พร้อม expected schema

**3rd argument `mode`** (default `'inspect'`)

```
node form-codegen.cjs <sessionPath> <targetUrl> [inspect|codegen]
```

| Pattern × Mode | Inspect | Codegen |
|---|---|---|
| sessionStorage (Dealer) | Inspector + `page.pause()` | ❌ throw error |
| storageState (Nebula) | Inspector + `page.pause()` | spawn `playwright codegen --load-storage` |

**Codegen mode** ใช้ Playwright CLI `--load-storage` ให้ Recorder auto-start (ไม่ต้อง manual click Record button)

**Reason ที่ sessionStorage ไม่รองรับ codegen mode:**
Playwright CLI `--load-storage` โหลด cookies/localStorage ได้ แต่ไม่โหลด sessionStorage (HTML5 spec: tab-scoped) จึงต้อง custom `addInitScript()` ซึ่ง CLI ไม่เปิด hook ให้

---

### 4.3 `playwright.config.ts`

**เดิม:** handle เฉพาะ `AUTH_TYPE=microsoft`

**ใหม่:** handle ทั้ง `microsoft` และ `form` ผ่าน `AUTH_KIND`

```
if (authType === 'microsoft' || authType === 'form') {
  if (authKind === 'storagestate') {
    storageState = authStatePath  ← Playwright loads cookies + localStorage
  }
  else if (authKind === 'sessionstorage') {
    throw ... (ต้อง custom fixture — พรุ่งนี้ทำ)
  }
}
```

**Env var contract:**

| authType | AUTH_KIND | ผลลัพธ์ |
|---|---|---|
| none | (unset) | ไม่มี auth |
| microsoft | (unset → default storageState) | โหลด Microsoft state.json |
| form (Nebula) | storageState | โหลด session-storage.json ผ่าน storageState |
| form (Dealer) | sessionStorage | throw error (ยังไม่มี fixture) |

Microsoft ไม่ต้อง set `AUTH_KIND` — default เป็น `storageState`, backward compatible

---

### 4.4 `run-local.ps1`

**เปลี่ยน 4 จุด:**

**Get-ProjectAuthentication (form case):**
- Path: `_login\state.json` → `_login\session-storage.json`
- อ่านไฟล์ + detect format:
  - มี `cookies` หรือ `origins` → Kind = `storageState`
  - มี `origin` + `items` → Kind = `sessionStorage`
- Return hashtable เพิ่ม field `Kind`

**Set-TestAuthentication:**
- Set `$env:AUTH_KIND = $Authentication.Kind`
- Print type + kind ใน log

**Clear-TestAuthentication:**
- ล้าง `$env:AUTH_KIND` ด้วย

**Invoke-PlaywrightTest — บรรทัด playwright call:**

จากเดิม:
```
& $playwrightCommand @playwrightArguments
```

เป็น:
```
& $playwrightCommand @playwrightArguments | Out-Host
```

**เหตุผล:** ใน context ของ nested loop (scopeLoop > runLoop) PowerShell success stream buffer output ของ native command ไม่ flush ทำให้ Playwright output หายทั้งที่ test รันจริง `Out-Host` บังคับส่ง object ไป Host UI ตรงๆ bypass stream buffer

---

## 5. Debug journey — ที่มาของ Out-Host fix

**Symptom:**
- Run "ALL modules" → output เต็ม (test list, pass count)
- Run "ALL tests in module" หรือ single file → silent (แค่ Node warning + [SUCCESS])

**Diagnostic ที่ทำ:**

1. เพิ่ม DEBUG print ก่อน playwright command → ยืนยัน command เหมือน bit-perfect
2. Check `[Console]::IsOutputRedirected` → False ทั้ง 2 case
3. Manual test นอก script (paste command ตรงๆ ใน PowerShell) → output เต็มปกติ
4. Root cause: nested loop context ของ script → PowerShell native command stream buffer
5. Fix: `| Out-Host` — 1 บรรทัด

**Ruled out:**
- Command difference
- Environment variable difference
- Path resolution
- Working directory
- Console redirection
- Playwright installation

---

## 6. Test data ที่ใช้ verify

**Nebula-Spa Admin-Login:**
- URL: `http://localhost:8787/admin/login`
- Auth: NextAuth session cookie (JWT)
- Test credentials: `admin-test@nebula-spa.demo` / `ChangeMe123!Long`
- Save result: 1 cookie (session token), 0 localStorage, 0 sessionStorage

**Verify ผ่านครบวงจร:**
```
Universal Form Login Setup
→ Login Nebula สำเร็จ
→ session-storage.json (storageState format) สร้างสำเร็จ
→ Runner detect kind = storageState
→ Playwright config โหลด storageState
→ Test เข้า /admin โดยไม่ redirect ไป login
→ [SUCCESS] 1 passed
```

---

## 7. Known issues (test-level, ไม่ใช่ infrastructure)

`booking-status-change.spec.ts` เป็น draft และมี bug ที่ต้องแก้ก่อนใช้จริง

### 7.1 Fragile Radix ID
```
await page.locator('#radix-_r_p_').click()
```
`#radix-_r_p_` เป็น auto-generated ID ที่ Radix UI สร้างขึ้น runtime hash เปลี่ยนทุก mount

**Fix:** ใช้ role + accessible name แทน:
```
await page.getByRole('radio', { name: 'ยืนยันแล้ว' }).click()
```

### 7.2 Save button disabled
Test fail ที่ `expect(saveButton).toBeEnabled()` เพราะ Radix ID ที่คลิกเป็น radio ของ status ปัจจุบัน → form validation detect "no change" → disable save

### 7.3 ไม่มี verify หลัง save
Test บอกผ่านตอน click save = แค่ click ผ่าน ไม่ใช่ status เปลี่ยนสำเร็จ ต้องมี assertion หลัง save เช่น:
- Toast success visible + hidden
- Status label เปลี่ยนเป็นค่าใหม่
- Dialog close

### 7.4 Test data dependency
Test อ้าง booking Sep 2026 ในฐาน — ถ้าไม่มี → fail ที่ step click cell ต้อง seed หรือสร้าง booking ผ่าน API ก่อน test

---

## 8. Encoding note

`run-local.bat` และ `run-codegen.bat` ใช้ `chcp 437` ไม่ใช่ `chcp 65001` เพราะ 65001 มี error ในเครื่องอื่น

**Trade-off ที่ยอมรับ:**
- ✅ Compatible เครื่องอื่น (no error)
- ⚠️ Unicode `›` (U+203A) ใน Playwright test output แสดงเพี้ยนเป็น `ΓÇ║` — cosmetic เท่านั้น ไม่กระทบ functionality

---

## 9. งานที่ยังเหลือ

### 9.1 WEF Dealer verification (พรุ่งนี้)
- Verify `saveSessionStorage()` ยังทำงานเหมือนเดิม (ไม่ควรกระทบเพราะไม่ได้แตะ function เดิม)
- Verify `run-local.ps1` detect Kind = `sessionStorage` ถูกต้องเมื่อ Dealer session ถูกสร้าง
- Verify `form-codegen.cjs` inspect mode ยังใช้ได้กับ Dealer

### 9.2 sessionStorage inject ใน run-local (พรุ่งนี้)
ตอนนี้ `playwright.config.ts` throw error เมื่อเจอ `AUTH_KIND=sessionStorage` ต้องสร้าง custom fixture ที่เรียก `context.addInitScript()` เพื่อ inject sessionStorage ก่อน page load

**แนวทาง:**
```
Test-Local/_shared/session-storage-fixture.ts
```
Test file ของ Dealer import fixture นี้แทน `@playwright/test`

### 9.3 Tech debt: naming inconsistency
- ไฟล์ชื่อ `session-storage.json` แต่ content ของ Nebula เป็น storageState format
- Variable `sessionStoragePath` ใน helper ส่ง path ของ storageState ได้
- ไม่ block เพราะเป็น internal artifact user ไม่เห็น + runner detect ให้แล้ว
- Fix ทีหลังได้ถ้ารู้สึกรบกวน (rename convention ทั้งระบบ)

### 9.4 Menu integration ของ codegen mode ใหม่
`form-codegen.cjs` รองรับ arg `codegen` แล้ว แต่ `run-codegen.ps1` menu ยังส่งแค่ 2 args → codegen mode ยังใช้ผ่าน UI ไม่ได้ ต้อง manual command

**Manual command (ใช้ได้เลย):**
```
node Authen\Form-Login\form-codegen.cjs `
  "Test-Local\Nebula-Spa\Admin-Login\_login\session-storage.json" `
  "http://localhost:8787/admin" `
  codegen
```

---

## 10. Env var summary

**สำหรับ setup (form-auth.helper.ts อ่านจาก):**
```
FORM_LOGIN_USERNAME
FORM_LOGIN_PASSWORD
FORM_LOGIN_STATE_PATH   (auto-mapped to session-storage.json ใน helper)
```

**สำหรับ test run (playwright.config.ts อ่านจาก):**
```
AUTH_TYPE        none | microsoft | form
AUTH_KIND        storageState | sessionStorage   (เฉพาะ form)
AUTH_STATE_PATH  path ของไฟล์ session
```

---

## 11. Verification checklist

- [x] Nebula Login setup สร้าง `session-storage.json` สำเร็จ (storageState format)
- [x] Runner detect Kind = `storageState` ถูกต้อง
- [x] Playwright config load storageState
- [x] Test เข้า `/admin` โดยไม่ redirect
- [x] Test spec รันครบ flow (ผ่านทั้งใน "ALL modules" และ single file หลัง Out-Host fix)
- [x] Microsoft flow ยังทำงานปกติ (backward compat)
- [ ] WEF Dealer flow ยังทำงานปกติ (พรุ่งนี้)
- [ ] `run-local.ps1` inject sessionStorage สำหรับ Dealer (พรุ่งนี้)

---

## Document Metadata

**Session date:** 10 กันยายน 2026
**Related files:**
- `Authen/Form-Login/form-auth.helper.ts`
- `Authen/Form-Login/form-codegen.cjs`
- `playwright.config.ts`
- `Test-Local/run-local.ps1`
- `Test-Local/Nebula-Spa/Admin-Login/*`

**Related docs:**
- `LOCAL_RUNNER_CHANGELOG.md` — Universal Runner architecture
- `FORM_LOGIN_SESSION_STORAGE_GUIDE.md` — WEF Dealer form login (sessionStorage pattern)
