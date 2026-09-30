# ttest-playwright

Universal Playwright test runner สำหรับ E2E testing — ทั้ง local development และ production URL

รองรับ 3 auth mechanism (`none` / `microsoft` / `form`) + auto-detect project structure + GitHub Actions CI

---

# 📖 Section 1: วิธีการใช้

## 🌐 Test-Prod — ทดสอบ Public URL ผ่าน GitHub Actions

Test-Prod ใช้ทดสอบ URL ที่ public (production, staging) ผ่าน GitHub Actions โดยไม่ต้องลงอะไรที่เครื่อง เหมาะกับเว็บที่ไม่มี auth หรือ auth ที่ CI-friendly

### Step 1: Fork หรือ Clone Repo

**Option A: Fork (แนะนำ)**

1. เปิด https://github.com/CxllmxZ/ttest-playwright
2. คลิก **Fork** มุมขวาบน
3. เลือก account ของคุณ

**Option B: Clone แล้ว push repo ใหม่**

```bash
git clone https://github.com/CxllmxZ/ttest-playwright.git my-tests
cd my-tests
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/my-tests.git
git push -u origin main
```

### Step 2: Setup GitHub Pages

หลังมี repo แล้ว ต้อง enable Pages เพื่อให้ report แสดงเป็น public URL

1. Repo → **Settings** → **Pages**
2. **Source:** เลือก **GitHub Actions**
3. Save

Report จะ deploy อัตโนมัติที่ `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/` หลัง test รันสำเร็จ

### Step 3: สร้าง Test

**Folder structure:**

```
Test-Prod/
├── nebula-spa/                    ← Project
│   └── smoke.spec.ts
└── my-website/                    ← Project ใหม่
    └── homepage.spec.ts
```

**ตัวอย่าง test:**

```typescript
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('https://mywebsite.com');
  await expect(page).toHaveTitle(/My Website/);
});
```

Commit + push → พร้อมรัน

### Step 4: รัน Test

1. Repo → tab **Actions**
2. คลิก workflow **"Start-TestCase"**
3. **Run workflow** (มุมขวาบน)
4. กรอก path:

```
Format: project/testcase (ไม่ต้อง .spec.ts)

my-website/homepage    → รัน homepage.spec.ts
my-website/            → รันทุก test ใน my-website/
```

5. Run → รอ ~1-2 นาที → เปิด report ที่ Pages URL

---

## 💻 Test-Local — ทดสอบบนเครื่องตัวเอง + รองรับ Auth

Test-Local รองรับ project ที่มี login flow — ระบบมี infrastructure ให้แล้ว 3 แบบ

### Concept: 3 authType

ทุก **access flow** (login variant ของ project) ต้องระบุ `authType` ใน `project.config.json`:

| authType | ใช้เมื่อ | Auth mechanism |
|---|---|---|
| `none` | Public หน้า / landing page test | ไม่มี |
| `microsoft` | Microsoft SSO (Azure AD, MSAL) | Persistent Chromium profile + state.json |
| `form` | Email/password login (NextAuth, Django, custom) | session-storage.json (auto-detect format) |

1 project มีได้หลาย access flow (เช่น WEF มีทั้ง Microsoft และ Dealer form login)

### Folder Contract

```
Test-Local/
└── <Project>/                        ← โปรเจค
    └── <AccessFlow>/                 ← 1 project มีได้หลาย flow
        ├── project.config.json       ← กำหนด authType
        ├── _login/                   ← (form only)
        │   ├── login.setup.ts        ← script login (จาก codegen)
        │   └── session-storage.json  ← auto-gen (gitignored)
        └── <Module>/                 ← business logic tests
            └── *.spec.ts
```

**Auto-detect:** ระบบ scan folder เอง — เพิ่ม project/flow/module ใหม่ = menu เห็นทันที ไม่ต้อง config

---

### Step 1: Install Playwright (ครั้งเดียว)

Double-click:
```
Test-Local/setup.bat
```

Install: pnpm, `@playwright/test`, Chromium browser (~200MB, cached ที่ `%LOCALAPPDATA%\ms-playwright`)

รอ ~3-5 นาที (ครั้งแรกเท่านั้น)

---

### Step 2: สร้าง Project + Access Flow

**ตัวอย่าง:** เพิ่ม project `My-App` ที่ใช้ form login

```powershell
# สร้าง folder
New-Item -ItemType Directory Test-Local\My-App\Admin-Login\_login
New-Item -ItemType Directory Test-Local\My-App\Admin-Login\booking

# สร้าง project.config.json
@'
{
  "authType": "form"
}
'@ | Out-File -Encoding utf8 Test-Local\My-App\Admin-Login\project.config.json
```

**เลือก authType ตาม auth mechanism ของ app จริง:**

- App ใช้ Azure AD / Microsoft SSO → `"microsoft"`
- App มี login form (email/password) → `"form"`
- Test หน้าที่ไม่ต้อง login → `"none"`

---

### Step 3: Setup Auth (ข้ามได้ถ้า authType = `none`)

**Case A: authType = `microsoft`**

Double-click:
```
Authen/Microsoft/setup-microsoft-auth.bat
```

- Paste URL หน้า login Microsoft ของ app
- Browser เปิด → login มือ (email + password + MFA ถ้ามี)
- ปิด browser → state.json ถูก save ที่ `Authen/Microsoft/state.json` (gitignored)

State ใช้ได้กับทุก access flow ที่ authType = microsoft (shared across projects)

**Case B: authType = `form`**

Form login ต้องทำ **2 sub-step:**

**Sub-step B1 — Record login flow (สร้าง `login.setup.ts`):**

Double-click:
```
Test-Local/run-codegen.bat
```

- เลือก "Record login and test flow (clean session)"
- Enter URL หน้า login เช่น `http://localhost:8787/admin/login`
- Login มือใน browser → codegen บันทึก actions
- Copy code จาก Playwright Inspector
- Save เป็น `login.setup.ts` ใน `_login/` folder

**Template `login.setup.ts`:**

```typescript
import { test as setup } from '@playwright/test';
import {
  getFormLoginCredentials,
  saveStorageState,       // สำหรับ cookie-based (NextAuth)
  // saveSessionStorage,  // สำหรับ sessionStorage-based (custom)
} from '../../../../Authen/Form-Login/form-auth.helper';

setup('Create login session', async ({ page }) => {
  const { username, password, sessionStoragePath } =
    getFormLoginCredentials();

  await page.goto('http://localhost:8787/admin/login');

  await page.getByRole('textbox', { name: 'อีเมล' }).fill(username);
  await page.getByRole('textbox', { name: 'รหัสผ่าน' }).fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();

  // Verify login สำเร็จ
  await expect(page).not.toHaveURL(/\/login/);

  // Save session
  await saveStorageState({
    page,
    outputPath: sessionStoragePath,
  });
});
```

**เลือก helper function ตาม auth mechanism:**
- `saveStorageState()` — cookie-based (NextAuth, Django, standard session)
- `saveSessionStorage()` — auth ที่เก็บใน `sessionStorage` (SPA บางตัว)

**Sub-step B2 — Create session:**

Double-click:
```
Authen/Form-Login/setup-form-auth.bat
```

- Menu เลือก project + access flow
- Enter username / password
- Script รัน `login.setup.ts` → save `session-storage.json` ใน `_login/`

---

### Step 4: Record Test Case

Double-click:
```
Test-Local/run-codegen.bat
```

**เลือก mode ตาม authType:**

| authType | Mode ที่ใช้ได้ |
|---|---|
| none | Record login and test flow (clean) |
| microsoft | Open authenticated browser (Pick locators) |
| form (storageState) | Open authenticated browser / Full codegen with saved session |
| form (sessionStorage) | Open authenticated browser (Pick locators) |

- Enter URL ของหน้าที่จะ test (หลัง login แล้ว)
- Codegen เปิดใน state logged-in → record actions
- Copy code → save เป็น `.spec.ts` ใน `<Module>/`

---

### Step 5: Run Tests

Double-click:
```
Test-Local/run-local.bat
```

**Interactive menu 4 ระดับ:**

```
Level 1: Project             (Nebula-Spa / WEF / My-App)
Level 2: Access Flow         (Admin-Login / Microsoft-Login / Dealer-Login)
Level 3: Scope               (ALL modules / เลือก module)
Level 4: Test                (ALL tests / เลือกไฟล์)
```

- Auto-inject auth state ตาม `project.config.json`
- Test รัน → report เปิดอัตโนมัติ
- Post-run: run again / change scope / back to menu

---

## 🔄 เพิ่ม Project ใหม่

**Auto-detect** — ไม่ต้อง config เพิ่ม แค่:

1. สร้าง folder ตาม contract (project → access flow → module)
2. เพิ่ม `project.config.json` ใน access flow
3. Setup auth (ถ้า authType != none)
4. เพิ่ม `.spec.ts` ใน module
5. รัน `run-local.bat` → menu เห็นทันที

---

# 📁 Section 2: Project Structure & Overview

## Folder Structure

```
ttest-playwright/
│
├── .github/
│   └── workflows/
│       └── Start-TestCase.yml         ← GitHub Actions CI
│
├── Authen/                             ← Shared auth infrastructure
│   ├── Microsoft/
│   │   ├── setup-microsoft-auth.bat   ← Launcher
│   │   ├── setup-microsoft-auth.ps1
│   │   ├── profile/                    ← Persistent Chromium (gitignored)
│   │   └── state.json                  ← Saved auth (gitignored)
│   │
│   └── Form-Login/
│       ├── setup-form-auth.bat         ← Launcher
│       ├── setup-form-auth.ps1
│       ├── form-auth.helper.ts         ← Shared save/load helpers
│       ├── form-codegen.cjs            ← Authenticated codegen tool
│       └── playwright.form-auth.config.ts
│
├── Test-Prod/                          ← Public URL tests (CI-friendly)
│   ├── nebula-spa/
│   │   └── smoke.spec.ts
│   └── demo-todo/
│       └── todo.spec.ts
│
├── Test-Local/                         ← Local + auth-required tests
│   ├── setup.bat                       ← Install Playwright (ครั้งเดียว)
│   ├── run-local.bat                   ← Test runner launcher
│   ├── run-local.ps1                   ← Interactive menu
│   ├── run-codegen.bat                 ← Codegen launcher
│   ├── run-codegen.ps1                 ← Codegen menu
│   │
│   ├── Nebula-Spa/                     ← Project (form + NextAuth)
│   │   └── Admin-Login/                ← Access Flow
│   │       ├── project.config.json     ← authType: form
│   │       ├── _login/
│   │       │   ├── login.setup.ts
│   │       │   └── session-storage.json (gitignored)
│   │       └── booking/
│   │           └── booking-status-change.spec.ts
│   │
│   └── WEF/                            ← Project (multi-flow)
│       ├── Microsoft-Login/            ← Access Flow (microsoft)
│       │   ├── project.config.json
│       │   └── car-model/
│       │       └── car-model-add.spec.ts
│       │
│       └── Dealer-Login/               ← Access Flow (form/sessionStorage)
│           ├── project.config.json
│           ├── _login/
│           │   ├── login.setup.ts
│           │   └── session-storage.json (gitignored)
│           └── (modules)/
│
├── node_modules/                       ← (gitignored)
├── playwright-report/                  ← (gitignored)
├── test-results/                       ← (gitignored)
│
├── playwright.config.ts                ← Main config — routes auth ตาม env var
├── package.json
└── README.md
```

## Auth Architecture

**Env var contract** (playwright.config.ts อ่านตอนรัน test):

| authType | AUTH_TYPE | AUTH_KIND | AUTH_STATE_PATH |
|---|---|---|---|
| `none` | none | - | - |
| `microsoft` | microsoft | (default storageState) | `Authen/Microsoft/state.json` |
| `form` (cookie) | form | storageState | `<flow>/_login/session-storage.json` |
| `form` (sessionStorage) | form | sessionStorage | `<flow>/_login/session-storage.json` |

`run-local.ps1` **auto-detect** format ของ session file → set `AUTH_KIND` เอง

## ระบบทำอะไรบ้าง

**1. GitHub Actions (Test-Prod)**
- Auto CI/CD สำหรับทดสอบ public URLs
- Trigger manual ผ่าน Actions UI
- Deploy report ไป GitHub Pages
- Free unlimited (public repo)

**2. Interactive Local Menu (Test-Local)**
- PowerShell menu with arrow keys
- Auto-detect projects / access flows / modules
- Auto-inject auth state ตาม config
- Post-run navigation (run again / change scope)

**3. Multi-Auth Support**
- Microsoft SSO: persistent profile (handle refresh, MFA)
- Form Login (cookies): standard Playwright `storageState`
- Form Login (sessionStorage): custom `addInitScript()` (WIP)
- Universal setup scripts — 1 tool ใช้ทุก project

**4. Playwright Codegen**
- Record browser actions → generate test code
- Support authenticated recording (load session)
- 3 modes: fresh record / full codegen with session / inspect only

**5. HTML Reports**
- Playwright built-in report
- Screenshots, videos, traces on failure
- Debug ผ่าน Playwright trace viewer

## Technologies

- **Playwright** — E2E testing framework
- **TypeScript** — Type-safe test code
- **GitHub Actions** — CI/CD
- **GitHub Pages** — Report hosting
- **PowerShell** — Local interactive menu (Windows)
- **pnpm** — Package manager

## Design Principles

**Separation of concerns:**
- **Test-Prod** = public URL tests, CI-friendly (flat structure: project/spec)
- **Test-Local** = auth-required tests (3-level: project/flow/module)

**Universal auth infrastructure:**
- `Authen/` แยกออกจาก tests → shared ระหว่าง projects
- Setup scripts (Microsoft + Form) เป็น universal — 1 tool ใช้ได้ทุก project
- Auth mechanism configured per access flow ผ่าน `project.config.json`

**Auto-detection:**
- ระบบ scan folder → รู้จัก project / flow / module ใหม่อัตโนมัติ
- ไม่ต้อง manual config เมื่อเพิ่ม test files

**Zero project knowledge in framework:**
- Runner + config = universal (ไม่มี hard-code project name)
- Login flow เป็น per-project (ใน `login.setup.ts` แต่ละ flow)
- Save/load session logic = shared helper

## ข้อจำกัด

**GitHub Actions:**
- ไม่สามารถทดสอบ localhost
- Cloudflare Turnstile block Playwright → ต้องรัน local
- Microsoft/form auth ต้องมี CI-safe credentials

**Local:**
- ต้องมี Node.js
- Chromium ~200MB (cached ที่ system default)
- Auth ต้อง regenerate เมื่อ session expire

**Form Login (sessionStorage):**
- ยังไม่รองรับ inject ใน test run (playwright.config.ts throw)
- Roadmap: custom fixture ด้วย `addInitScript()`

## Credits

Built with Playwright by Microsoft — https://playwright.dev

---

**Live demo:** https://cxllmxz.github.io/ttest-playwright/

**Repo:** https://github.com/CxllmxZ/ttest-playwright
