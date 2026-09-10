# Universal Form Login และ Session Storage สำหรับ Playwright

เอกสารนี้อธิบายการออกแบบและสถานะปัจจุบันของระบบ Universal Form Login ภายใน `ttest-playwright` โดยครอบคลุมตั้งแต่การค้นหา Access Flow, การ Login อัตโนมัติ, การสร้าง `session-storage.json`, การใช้งานกับ Codegen, ข้อจำกัดที่พบ และแนวทางเชื่อมต่อกับ `run-local`

> สถานะสำคัญ: Dealer Login ของ WEF เก็บข้อมูล Authentication ไว้ใน `sessionStorage` ไม่ได้เก็บใน Cookies หรือ Local Storage ดังนั้น Playwright `storageState()` ปกติไม่สามารถบันทึก Session ชุดนี้ได้โดยตรง

---

## 1. เป้าหมายของการออกแบบ

ระบบ Form Login ถูกออกแบบให้มีคุณสมบัติดังนี้:

- รองรับ Form Login หลาย Project และหลาย Access Flow
- ไม่ Hard-code ชื่อ Project ใน Script กลาง
- แสดง Menu เฉพาะ Access Flow ที่กำหนด `authType = form`
- แต่ละ Access Flow เขียนเฉพาะขั้นตอน Login ของตัวเอง
- Logic อ่าน Credential และบันทึก Session ใช้ Shared Helper กลาง
- Username และ Password ไม่ถูกเขียนลง Source Code
- Credential ถูกเก็บใน Environment Variable ชั่วคราวและล้างหลังใช้งาน
- Session ของแต่ละ Access Flow ถูกเก็บแยกกัน
- Session File ไม่ถูก Commit เข้า Git
- รองรับการนำ Session กลับไปใช้กับ Local Test Runner
- รองรับการเปิด Authenticated Browser สำหรับตรวจ Locator

---

## 2. โครงสร้างไฟล์ปัจจุบัน

```text
ttest-playwright/
├── Authen/
│   ├── Microsoft/
│   │   ├── profile/
│   │   ├── state.json
│   │   ├── microsoft-profile.cjs
│   │   ├── setup-microsoft-auth.bat
│   │   └── setup-microsoft-auth.ps1
│   │
│   └── Form-Login/
│       ├── form-auth.helper.ts
│       ├── form-codegen.cjs
│       ├── playwright.form-auth.config.ts
│       ├── setup-form-auth.bat
│       └── setup-form-auth.ps1
│
├── Test-Local/
│   ├── run-codegen.bat
│   ├── run-codegen.ps1
│   ├── run-local.bat
│   ├── run-local.ps1
│   │
│   └── WEF/
│       ├── Microsoft-Login/
│       │   ├── project.config.json
│       │   └── car-model/
│       │       └── car-model-add.spec.ts
│       │
│       └── Dealer-Login/
│           ├── project.config.json
│           ├── _login/
│           │   ├── login.setup.ts
│           │   └── session-storage.json
│           └── dealer-model/
│
├── playwright.config.ts
└── .gitignore
```

---

## 3. หน้าที่ของแต่ละไฟล์

### 3.1 `Authen/Form-Login/setup-form-auth.bat`

เป็น Launcher สำหรับเรียก PowerShell Script กลาง

หน้าที่:

```text
ตรวจว่า setup-form-auth.ps1 มีอยู่
→ เรียก PowerShell ด้วย ExecutionPolicy Bypass
→ รับ Exit Code
→ Pause เมื่อเกิด Error
```

ไฟล์นี้ไม่มี Logic ของ Project และไม่มี Credential

---

### 3.2 `Authen/Form-Login/setup-form-auth.ps1`

เป็น Universal Form Login Setup Runner

หน้าที่:

```text
สแกน Test-Local
→ ค้นหา project.config.json ทุก Access Flow
→ อ่าน authType
→ เลือกเฉพาะ authType = form
→ แสดง Menu ให้เลือก Access Flow
→ ตรวจ _login/login.setup.ts
→ รับ Username
→ รับ Password แบบซ่อน
→ ตั้ง Environment Variable ชั่วคราว
→ รัน login.setup.ts
→ ตรวจ session-storage.json
→ ล้าง Credential
```

Environment Variable กลางที่ใช้:

```text
FORM_LOGIN_USERNAME
FORM_LOGIN_PASSWORD
FORM_LOGIN_STATE_PATH
```

แม้ชื่อ `FORM_LOGIN_STATE_PATH` ยังมีคำว่า State แต่ค่าปัจจุบันใช้เป็นตำแหน่งของ `session-storage.json`

ในอนาคตสามารถเปลี่ยนชื่อเป็น:

```text
FORM_LOGIN_SESSION_PATH
```

เพื่อให้ตรงความหมายมากขึ้น

---

### 3.3 `Authen/Form-Login/playwright.form-auth.config.ts`

เป็น Playwright Config เฉพาะการสร้าง Form Login Session

หน้าที่:

- รันเฉพาะ `**/_login/login.setup.ts`
- ไม่รัน Test Case ธุรกิจ
- ใช้ Worker เดียว
- ไม่ Retry
- เปิด Browser ให้เห็นด้วย `headless: false`
- ใช้ Timeout ที่เหมาะกับ Login Flow

เหตุผลที่แยก Config:

```text
playwright.config.ts หลัก
→ ใช้รัน Test Case ธุรกิจ

playwright.form-auth.config.ts
→ ใช้รัน Login Setup เท่านั้น
```

ช่วยป้องกันไม่ให้ `login.setup.ts` ถูกรันโดย `Run ALL modules`

---

### 3.4 `Authen/Form-Login/form-auth.helper.ts`

เป็น Shared Helper กลางสำหรับ Form Login ทุก Project

หน้าที่หลักแบ่งเป็นสองส่วน

#### `getFormLoginCredentials()`

รับผิดชอบ:

- อ่าน `FORM_LOGIN_USERNAME`
- อ่าน `FORM_LOGIN_PASSWORD`
- อ่าน Output Path
- ตรวจว่าค่าที่จำเป็นมีครบ
- แปลง Path เดิมจาก `state.json` เป็น `session-storage.json` เมื่อจำเป็น

#### `saveSessionStorage()`

รับผิดชอบ:

- รอ Application บันทึก Session
- ตรวจ Cookies
- ตรวจ Local Storage
- อ่าน `sessionStorage`
- แสดงเฉพาะชื่อ Key ไม่แสดง Token Value
- ตรวจว่า `sessionStorage` ไม่ว่าง
- สร้าง Folder ปลายทาง
- เขียน `session-storage.json`
- ตรวจว่าไฟล์ถูกสร้างและไม่ว่าง

ข้อดีของ Shared Helper:

```text
Project ใหม่ไม่ต้อง Copy Logic ยาวทั้งหมด
→ เขียนเฉพาะ Login Flow
→ เรียก Helper กลางเพื่อบันทึก Session
```

---

### 3.5 `Test-Local/<project>/<flow>/_login/login.setup.ts`

เป็น Login Flow เฉพาะ Access Flow

ตัวอย่าง WEF Dealer Login รับผิดชอบ:

```text
เปิด /login?type=dealer
→ กรอก Username
→ กรอก Password
→ กด Login
→ เลือก HONGQI
→ กดเข้าสู่ระบบ
→ รอ Loading หาย
→ ปิด Popup
→ ตรวจว่าเข้า /dashboard
→ เรียก saveSessionStorage()
```

สิ่งที่ควรอยู่ในไฟล์นี้:

- Login URL
- Locator ของ Username
- Locator ของ Password
- ปุ่ม Login
- ขั้นตอนเลือกบริษัทหรือ Role
- Assertion ที่ยืนยันว่า Login สำเร็จ

สิ่งที่ไม่ควรอยู่ในไฟล์นี้:

- Username จริง
- Password จริง
- Logic เขียน JSON ซ้ำ
- Path ที่ Fix ชื่อ Project
- Generic Error Handling ที่ Shared Helper จัดการได้

---

### 3.6 `session-storage.json`

เป็นไฟล์ Session ที่ได้จาก Dealer Login

ตำแหน่ง:

```text
Test-Local/WEF/Dealer-Login/_login/session-storage.json
```

โครงสร้าง:

```json
{
  "origin": "http://localhost:4200",
  "items": {
    "user_type": "...",
    "is_authorized": "...",
    "user_data": "...",
    "available_brands": "...",
    "dealer_token": "...",
    "msal.version": "...",
    "selected_brand": "..."
  }
}
```

ไฟล์นี้มี Token และข้อมูล Session จึงห้าม Commit

```gitignore
Test-Local/**/_login/session-storage.json
```

---

### 3.7 `Authen/Form-Login/form-codegen.cjs`

ไฟล์นี้ทำหน้าที่เป็น Authenticated Browser Launcher

หน้าที่:

```text
อ่าน session-storage.json
→ ตรวจ JSON
→ ตรวจ Origin
→ เปิด Chromium Context
→ addInitScript()
→ ใส่ sessionStorage ก่อน Application Script ทำงาน
→ เปิด Target URL
→ ตรวจว่า Session ถูกฉีดจริง
→ เปิด Playwright Inspector ด้วย page.pause()
```

ข้อจำกัดสำคัญ:

```text
page.pause()
≠
playwright codegen
```

ดังนั้นไฟล์นี้ทำได้:

- เปิดหน้า Authenticated
- Pick Locator
- Inspect Element
- Debug Command
- ตรวจว่า Session ใช้งานได้

แต่ไม่สามารถรับประกันว่า Click และ Fill ทุก Action จะถูก Generate เป็น Code เหมือน Full Playwright Codegen CLI

---

## 4. ผลการตรวจระบบ Dealer Login

ผล Diagnostic หลัง Login:

```text
Final URL: http://localhost:4200/dashboard
Cookies: 0
Local Storage items: 0
Session Storage items: 7
```

Session Storage Keys ที่พบ:

```text
user_type
is_authorized
user_data
available_brands
dealer_token
msal.version
selected_brand
```

ข้อสรุป:

```text
Dealer Login สำเร็จ
แต่ Authentication อยู่ใน sessionStorage
ไม่ใช่ Cookies หรือ Local Storage
```

จึงไม่สามารถใช้ `storageState()` แบบ Microsoft ได้

---

## 5. ความแตกต่างระหว่าง Microsoft และ Form Login

### Microsoft Authentication

```text
Persistent Browser Profile
→ Authen/Microsoft/profile
→ Codegen ใช้ --user-data-dir
→ Playwright Test ใช้ state.json
```

Microsoft Profile รองรับ Full Codegen CLI:

```text
playwright codegen --user-data-dir=<profile>
```

### Dealer Form Login

```text
Login Automation
→ sessionStorage
→ session-storage.json
→ ต้อง addInitScript() เพื่อฉีดกลับ
```

Playwright Codegen CLI ไม่มี Option สำหรับโหลด `sessionStorage` โดยตรง

```text
--load-storage
→ รองรับ Cookies / Local Storage / IndexedDB State
→ ไม่รองรับ sessionStorage โดยตรง
```

นี่คือเหตุผลที่ Authenticated Form Browser ไม่สามารถ Generate Code ได้แบบเดียวกับ Microsoft Profile

---

## 6. Codegen Mode สำหรับ Form Login

### 6.1 Record login and test flow

ใช้ Full Playwright Codegen CLI ด้วย Clean Browser Session

Flow:

```text
เปิดหน้า Dealer Login
→ Login
→ เลือก HONGQI
→ เข้า Dashboard
→ ทำ Business Flow ต่อ
→ Codegen สร้าง Code ทั้งหมด
```

ข้อดี:

- Generate Code ได้จริง
- ได้ Locator จาก Flow จริง
- บันทึก Login และ Business Flow ต่อเนื่องได้

ข้อควรทำหลัง Copy Code:

```text
ลบส่วน Login ออกจาก Business Spec
→ เก็บเฉพาะขั้นตอนหลัง Login
→ ให้ run-local ฉีด sessionStorage ให้แทน
```

### 6.2 Open authenticated browser / Pick locators

ใช้ `form-codegen.cjs`

Flow:

```text
อ่าน session-storage.json
→ ฉีด Session
→ เปิดหน้า Dashboard
→ เปิด Inspector
```

ใช้สำหรับ:

- Pick Locator
- Inspect Element
- ตรวจหน้า Authenticated
- ทดลอง Selector
- Debug Flow

ไม่ใช่ Full Code Generator

---

## 7. สาเหตุที่ Authenticated Form Browser Generate Code ไม่ได้

โค้ดใช้:

```javascript
await page.pause();
```

คำสั่งนี้เปิด Playwright Inspector ในโหมด Pause/Debug ไม่ใช่ Recorder Engine ของ CLI

Full Codegen ใช้คำสั่ง:

```text
playwright codegen
```

แต่ Full Codegen CLI ไม่เปิด API ให้เราใส่ `context.addInitScript()` เพื่อ Inject `sessionStorage` ก่อน Application โหลด

จึงเกิดข้อจำกัด:

```text
Custom Context
→ ฉีด sessionStorage ได้
→ ไม่ได้ Full Codegen

Codegen CLI
→ Generate Code ได้
→ ฉีด sessionStorage แบบ Custom ไม่ได้
```

---

## 8. แนวทางสร้าง Dealer Test Case ที่แนะนำ

### วิธีที่ 1: ใช้ Full Codegen ตั้งแต่ Login

```text
เลือก Record login and test flow
→ Login Dealer
→ ทำ Business Flow
→ Copy Code
```

จากนั้นปรับ Spec:

```text
ลบ Username/Password
ลบขั้นตอน Login
ลบการเลือก HONGQI หาก Session มี selected_brand แล้ว
เก็บเฉพาะ Business Flow
```

### วิธีที่ 2: ใช้ Authenticated Browser หา Locator

```text
เปิด Authenticated Browser
→ Pick Locator
→ นำ Locator มาเขียน Test Case เอง
```

เหมาะเมื่อ Business Flow ไม่ยาวมาก หรือมี Test Template อยู่แล้ว

---

## 9. สิ่งที่ต้องทำต่อกับ `run-local`

ตอนนี้สร้าง Session ได้แล้ว แต่ `run-local` ยังต้องรองรับการนำ Session กลับมาใช้

Flow เป้าหมาย:

```text
เลือก Project
→ เลือก Dealer-Login
→ อ่าน authType = form
→ หา _login/session-storage.json
→ ส่ง Path ให้ Playwright
→ Fixture อ่าน JSON
→ context.addInitScript()
→ ฉีด Session ก่อน page.goto()
→ รัน Dealer Test
```

สิ่งที่ต้องเพิ่ม:

- Form Session Fixture กลาง
- Environment Variable เช่น `FORM_LOGIN_SESSION_PATH`
- Logic ใน `run-local.ps1` สำหรับ `authType = form`
- Test Fixture ที่ Inject `sessionStorage`
- Smoke Test ตรวจว่าเปิด Dashboard ได้โดยไม่ Login ซ้ำ

---

## 10. Smoke Test ที่ควรสร้างก่อน Business Test

Test แรกควรเป็น:

```text
TC-DEALER-SESSION-001
Reuse Dealer Login session successfully
```

เป้าหมาย:

```text
ฉีด sessionStorage
→ เปิด http://localhost:4200/dashboard
→ ไม่ Redirect ไป /login?type=dealer
→ เห็น Element ของ Dashboard
```

หาก Smoke Test ผ่าน จึงค่อยทำ:

- Dealer Model Add
- Dealer Model Search
- Dealer Model Edit
- Dealer Import
- Dealer Export

---

## 11. Test หน้า Login กับ Test หลัง Login

ต้องแยกวัตถุประสงค์

### Login Tests

ต้องใช้ Clean Session:

```text
Valid Login
Invalid Password
Missing Username
Missing Password
Locked Account
```

### Business Tests

ต้องโหลด `session-storage.json`:

```text
Dashboard
Dealer Model
Search
Add
Edit
Import
Export
```

ถ้า Business Flow โหลด Session สำเร็จ ไม่ควร Login ซ้ำในทุก Test

---

## 12. Git Security

ควรมี `.gitignore` ดังนี้:

```gitignore
# Microsoft authentication
Authen/Microsoft/profile/*
Authen/Microsoft/state.json
!Authen/Microsoft/profile/.gitkeep

# Form login session
Test-Local/**/_login/state.json
Test-Local/**/_login/session-storage.json

# Local credentials
.env
.env.*
!.env.example
```

ตรวจว่า Session ถูก Ignore:

```cmd
git check-ignore -v "Test-Local\WEF\Dealer-Login\_login\session-storage.json"
```

ห้ามแชร์เนื้อหาใน:

```text
session-storage.json
```

เพราะมี `dealer_token` และข้อมูลผู้ใช้งาน

---

## 13. สถานะล่าสุด

```text
Universal Form Login Menu                    สำเร็จ
ค้นหาเฉพาะ authType = form                  สำเร็จ
รับ Username และ Password แบบซ่อน           สำเร็จ
Login Dealer อัตโนมัติ                       สำเร็จ
เลือก HONGQI                                 สำเร็จ
เข้า Dashboard                               สำเร็จ
Shared Form Auth Helper                      สำเร็จ
สร้าง session-storage.json                   สำเร็จ
ตรวจ Session Storage 7 รายการ               สำเร็จ
Form Login Clean Codegen                     สำเร็จ
Authenticated Browser / Pick Locator         สำเร็จ
Full Codegen หลัง Inject sessionStorage       ไม่รองรับโดยตรง
run-local Inject sessionStorage              ยังไม่ได้ทำ
Dealer Session Smoke Test                    ยังไม่ได้ทำ
Dealer Business Test Cases                   ยังไม่ได้ทำ
```

---

## 14. ขั้นตอนถัดไป

ลำดับที่แนะนำ:

```text
1. ปรับ run-local.ps1 ให้รองรับ session-storage.json
2. สร้าง Shared Fixture สำหรับ Inject sessionStorage
3. สร้าง Smoke Test เปิด Dashboard
4. ยืนยันว่าไม่ Redirect ไป Dealer Login
5. สร้าง Dealer Model Test Case
6. อัปเดต Universal Runner Documentation
7. Commit โดยไม่รวม Session File
```

---

## 15. สรุป Architecture

```text
Authen/Form-Login/setup-form-auth.ps1
→ จัดการ Menu และ Credential

Authen/Form-Login/form-auth.helper.ts
→ จัดการ Session Storage แบบกลาง

<access-flow>/_login/login.setup.ts
→ Login Flow เฉพาะระบบ

<access-flow>/_login/session-storage.json
→ Session ของ Access Flow

Authen/Form-Login/form-codegen.cjs
→ Authenticated Browser และ Pick Locator

run-codegen.ps1
→ Clean Codegen หรือ Authenticated Inspector

run-local.ps1 + Fixture
→ เป้าหมายถัดไปสำหรับรัน Business Test ด้วย Session
```

โครงสร้างนี้ยังคงเป็น Universal เพราะ Project ใหม่ต้องเพิ่มเพียง:

```text
project.config.json
_login/login.setup.ts
Module Test Cases
```

ส่วน Menu, Credential Handling, Session Saving และ Session Injection ใช้ Logic กลางร่วมกัน
