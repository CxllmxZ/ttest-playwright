# ttest-playwright

Universal Playwright test runner สำหรับ E2E testing — ทั้ง local development และ production URL

รองรับทั้ง GitHub Actions (auto CI) และ local machine (interactive menu)

---

# 📖 Section 1: วิธีการใช้

## 🌐 Test-Prod — ทดสอบบน GitHub Actions

Test-Prod ใช้สำหรับทดสอบ URL ที่ public (เช่น production website, staging URL) ผ่าน GitHub Actions โดยไม่ต้องลงอะไรที่เครื่อง

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

### Step 2: Setup GitHub Pages (สำหรับดู test report)

หลังจากมี repo แล้ว ต้อง enable Pages เพื่อให้ report แสดงเป็น public URL

1. เปิด repo ของคุณบน GitHub
2. คลิก **Settings** → **Pages** (sidebar ซ้าย)
3. **Source**: เลือก **GitHub Actions**
4. Save

หลัง test รันสำเร็จ → report จะ deploy อัตโนมัติที่:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

### Step 3: สร้างโปรเจคของคุณเอง

**Folder structure ที่ต้องสร้าง:**

```
Test-Prod/
├── nebula-spa/                    ← โปรเจค 1
│   └── smoke.spec.ts
├── my-website/                    ← โปรเจค 2 (สร้างใหม่)
│   ├── login.spec.ts
│   └── checkout.spec.ts
└── another-project/               ← โปรเจค 3 (สร้างใหม่)
    └── homepage.spec.ts
```

**ขั้นตอน:**

1. **สร้าง folder โปรเจคใน `Test-Prod/`**

```powershell
New-Item -ItemType Directory Test-Prod\my-website
```

2. **สร้าง test file (.spec.ts)**

```powershell
New-Item -ItemType File Test-Prod\my-website\homepage.spec.ts
```

3. **เขียน test** (หรือใช้ codegen — ดู section local)

**ตัวอย่าง test:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Website - Homepage', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('https://mywebsite.com');
    
    await expect(page).toHaveTitle(/My Website/);
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

4. **Commit + push**

```bash
git add Test-Prod/
git commit -m "add: my-website homepage test"
git push
```

### Step 4: รัน Test บน GitHub Actions

1. เปิด repo → tab **Actions**
2. คลิก workflow **"Start-TestCase"** (sidebar ซ้าย)
3. คลิก **Run workflow** (มุมขวาบน)
4. กรอก test path:

```
Format: project/testcase (ไม่ต้องใส่ .spec.ts)

Examples:
- my-website/homepage    → รัน homepage.spec.ts
- my-website/            → รันทุก test ใน my-website/
- nebula-spa/smoke       → รัน smoke.spec.ts
- nebula-spa/            → รันทุก test ใน nebula-spa/
```

5. คลิก **Run workflow**
6. รอ ~1-2 นาที
7. เปิด report ที่: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

**💡 Tip:** ถ้าพิมพ์ path ผิด → workflow จะแสดง list ของ tests ที่มีให้ดู

---

## 💻 Test-Local — ทดสอบบนเครื่องตัวเอง

Test-Local ใช้สำหรับ:
- ทดสอบ localhost (dev environment)
- ทดสอบ URL ที่มี Cloudflare Turnstile หรือ auth ที่ block bot
- Development workflow ที่ต้องการ feedback เร็ว

### Step 1: Setup (ครั้งเดียว)

**Prerequisites:**
- Node.js (https://nodejs.org)
- pnpm (setup.bat จะลงให้อัตโนมัติถ้ายังไม่มี)

**รัน setup:**

Double-click ที่:
```
Test-Local/setup.bat
```

**Setup จะ install:**
- pnpm (global — ถ้ายังไม่มี)
- `@playwright/test` (npm package)
- Chromium browser (~200MB) — เก็บใน `browsers/` folder ในโปรเจค

**รอ ~3-5 นาที** (Chromium download ใหญ่)

**หลัง setup เสร็จ → พร้อมใช้งาน**

### Step 2: รัน Tests

Double-click ที่:
```
Test-Local/run-local.bat
```

**Interactive menu จะเปิด:**

**Level 1: เลือก Project**
```
==========================================
  ttest - Select Project
==========================================

  > nebula-local
    demo
    [ Exit ]

(Use arrow keys, Enter to select, Esc to go back)
```

**ใช้ปุ่มลูกศร ↑↓ + Enter**

**Level 2: เลือก Scope**
```
Test scope:
  > Run ALL tests in nebula-local
    Select SPECIFIC test file
    [ Back ]
```

**Level 3: (ถ้าเลือก SPECIFIC) เลือกไฟล์**
```
Select Test File:
  > smoke.spec.ts
    book-customer-a.spec.ts
    [ Back ]
```

**Test รัน → Report เปิดอัตโนมัติ**

**Post-run menu:**
```
Test complete:
  > Run again: smoke.spec.ts
    Change test file (same project: nebula-local)
    Change project
    [ Exit ]
```

### Step 3: สร้างโปรเจคของคุณเอง (Local)

**Folder structure (เหมือน Test-Prod):**

```
Test-Local/
├── setup.bat
├── run-local.bat
├── run-codegen.bat
├── nebula-local/                  ← โปรเจค 1
│   ├── smoke.spec.ts
│   └── book-customer-a.spec.ts
├── my-local-app/                  ← โปรเจค 2 (สร้างใหม่)
│   └── homepage.spec.ts
└── another-app/                   ← โปรเจค 3 (สร้างใหม่)
    └── login.spec.ts
```

**ขั้นตอน:**

1. **สร้าง folder โปรเจคใน `Test-Local/`**

```powershell
New-Item -ItemType Directory Test-Local\my-local-app
```

2. **สร้าง test file (.spec.ts)**

```powershell
New-Item -ItemType File Test-Local\my-local-app\homepage.spec.ts
```

3. **เขียน test** (ใช้ codegen ช่วย recommended)

**ตัวอย่าง test สำหรับ localhost:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Local App', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

4. **รัน `run-local.bat`** → menu จะเห็น `my-local-app` **อัตโนมัติ**

### Step 4: ใช้ Codegen (บันทึก test อัตโนมัติ)

Codegen ช่วยบันทึก actions ในบราวเซอร์ → generate Playwright code ให้อัตโนมัติ

**วิธีใช้:**

Double-click:
```
Test-Local/run-codegen.bat
```

**Prompt:**
```
Enter URL to record: http://localhost:3000
```

**Enter → Chromium + Playwright Inspector เปิด:**

1. คลิก/พิมพ์ใน browser
2. Playwright Inspector แสดง code ที่ generated
3. Copy code
4. Save เป็น `.spec.ts` ใน folder โปรเจค

**Codegen ใช้ได้กับทุก URL:**
- Localhost dev environments
- Public websites
- Staging URLs

---

## 🔄 เพิ่มโปรเจคใหม่

**สิ่งสำคัญ:** ระบบ **detect โปรเจคใหม่อัตโนมัติ** — ไม่ต้อง config เพิ่ม

**สำหรับ Test-Prod:**
1. สร้าง folder ใหม่ใน `Test-Prod/`
2. เพิ่ม `.spec.ts` files
3. Commit + push
4. GitHub Actions → Run workflow → ใส่ path ใหม่ได้เลย

**สำหรับ Test-Local:**
1. สร้าง folder ใหม่ใน `Test-Local/`
2. เพิ่ม `.spec.ts` files
3. รัน `run-local.bat` → menu เห็นโปรเจคใหม่ทันที

**ไม่ต้อง:**
- ❌ แก้ workflow YAML
- ❌ Update menu config
- ❌ Restart อะไร

**ระบบ scan folder เอง** ✅

---

# 📁 Section 2: Project Structure & Overview

## โครงสร้างโดยรวม

```
ttest-playwright/
├── .github/
│   └── workflows/
│       └── Start-TestCase.yml     ← GitHub Actions workflow (CI)
│
├── Test-Prod/                     ← Tests สำหรับ public URLs
│   ├── nebula-spa/
│   │   └── smoke.spec.ts
│   └── demo-todo/
│       └── todo.spec.ts
│
├── Test-Local/                    ← Tests สำหรับ localhost
│   ├── setup.bat                  ← Install dependencies (ครั้งเดียว)
│   ├── run-local.bat              ← Launcher สำหรับ tests
│   ├── run-local.ps1              ← Interactive menu (PowerShell)
│   ├── run-codegen.bat            ← Launcher สำหรับ codegen
│   ├── nebula-local/
│   │   ├── smoke.spec.ts
│   │   └── book-customer-a.spec.ts
│   └── (โปรเจคของคุณ)/
│       └── your-test.spec.ts
│
├── browsers/                       ← Chromium binary (gitignored)
├── node_modules/                   ← Dependencies (gitignored)
├── playwright-report/              ← Test results (auto-generated)
│
├── playwright.config.ts            ← Playwright config
├── package.json                    ← Dependencies list
└── README.md                       ← เอกสารนี้
```

## ระบบทำอะไรบ้าง

**1. GitHub Actions (Test-Prod)**
- Auto CI/CD สำหรับทดสอบ public URLs
- Trigger manual ผ่าน Actions UI
- Deploy report ไป GitHub Pages
- Free unlimited (public repo)

**2. Interactive Local Menu (Test-Local)**
- PowerShell menu with arrow keys navigation
- Auto-detect projects (scan folder)
- Post-run options: run again / change file / change project
- Self-contained (browsers ใน folder repo)

**3. Playwright Codegen**
- Record browser actions → generate test code
- ใช้ได้กับ URL ไหนก็ได้ (localhost, production, staging)
- Save generated code เป็น `.spec.ts`

**4. HTML Reports**
- Playwright built-in HTML report
- แสดง test steps, screenshots, videos, traces
- Debug ผ่าน Playwright trace viewer

## Technologies

- **Playwright** — E2E testing framework
- **TypeScript** — Type-safe test code
- **GitHub Actions** — CI/CD platform
- **GitHub Pages** — Report hosting
- **PowerShell** — Local interactive menu (Windows)
- **pnpm** — Package manager

## Design Principles

**Separation of concerns:**
- **Test-Prod** = tests ที่รันบน cloud CI (public URLs only)
- **Test-Local** = tests ที่รันบนเครื่อง (localhost, forms with auth, etc.)

**Auto-detection:**
- ระบบ scan folder → รู้จัก projects ใหม่อัตโนมัติ
- ไม่ต้อง manual config เมื่อเพิ่ม test files

**Self-contained:**
- Local browsers เก็บใน repo folder (`browsers/`)
- ไม่กระทบ system Playwright installation
- Portable — clone → setup → พร้อมใช้

## ข้อจำกัด

**GitHub Actions:**
- ไม่สามารถทดสอบ localhost (เพราะรันบน cloud VM)
- Cloudflare Turnstile บล็อก Playwright (ต้องทดสอบ localhost แทน)

**Local:**
- ต้องมี Node.js + ต้อง setup ครั้งแรก
- Chromium ใช้พื้นที่ ~200MB

## Credits

Built with Playwright by Microsoft — https://playwright.dev

---

**Live demo:** https://cxllmxz.github.io/ttest-playwright/

**Repo:** https://github.com/CxllmxZ/ttest-playwright