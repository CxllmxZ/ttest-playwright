# Local Playwright Runner: สรุปการเปลี่ยนแปลง

เอกสารนี้สรุปการปรับปรุง `ttest-playwright` จากโครงสร้างเดิมที่วาง Test File ไว้ใต้ Project โดยตรง ไปเป็น Universal Local Test Runner ที่รองรับหลาย Project, หลาย Access Flow, หลาย Module และ Authentication หลายประเภท

## 1. เป้าหมายของการปรับปรุง

การปรับปรุงครั้งนี้มีเป้าหมายหลักดังนี้:

- รองรับ Project ที่ไม่มี Login
- รองรับ Project ที่มี Login แบบเดียว
- รองรับ Project ที่มี Login มากกว่าหนึ่งแบบ
- ตรวจพบ Project, Access Flow, Module และ Test File จากโครงสร้าง Folder โดยอัตโนมัติ
- ไม่ Hard-code ชื่อ Project หรือชื่อ Module ใน Runner
- รองรับ Microsoft Authentication ด้วย Session ที่นำกลับมาใช้ซ้ำได้
- แยกข้อมูล Authentication ออกจาก Test Case
- รองรับการรันทุก Module, ทุก Test ใน Module หรือเลือก Spec File เฉพาะไฟล์
- เปิด HTML Report หลัง Test จบ
- ค้างหน้าจอ Log จนกว่าผู้ใช้จะกดปุ่มก่อนกลับ Menu

---

## 2. โครงสร้างเดิม

โครงสร้างเดิมวาง Test File ไว้ใต้ Project โดยตรง:

```text
Test-Local/
├── demo/
│   ├── basic.spec.ts
│   ├── failing-test.spec.ts
│   └── playwright-docs.spec.ts
│
└── WEF/
    └── car-model-add.spec.ts
```

ข้อจำกัดของโครงสร้างเดิม:

- ไม่สามารถบอกได้ชัดเจนว่า Test ใช้ Login แบบใด
- หนึ่ง Project รองรับ Access Flow ได้เพียงรูปแบบเดียว
- ไม่รองรับ Project ที่มีทั้ง Microsoft Login และ Dealer Login
- Test File ยังไม่ได้แบ่งตาม Module อย่างชัดเจน
- Runner ค้นหาไฟล์เฉพาะระดับ Project
- การเพิ่มระดับ Folder ใหม่ทำให้ Runner หา Test ไม่พบ

---

## 3. โครงสร้างใหม่

โครงสร้างใหม่ใช้มาตรฐานเดียวกันทุก Project:

```text
Project
└── Access Flow
    ├── project.config.json
    ├── _login/                  # ใช้เฉพาะ Form Login เมื่อจำเป็น
    └── Module
        └── *.spec.ts
```

ตัวอย่างโครงสร้างปัจจุบัน:

```text
ttest-playwright/
├── Authen/
│   └── Microsoft/
│       ├── profile/
│       │   └── .gitkeep
│       ├── state.json                 # ไม่ Commit
│       ├── microsoft-profile.cjs
│       ├── setup-microsoft-auth.bat
│       └── setup-microsoft-auth.ps1
│
├── Test-Local/
│   ├── demo/
│   │   └── Public/
│   │       ├── project.config.json
│   │       └── general/
│   │           ├── basic.spec.ts
│   │           ├── failing-test.spec.ts
│   │           └── playwright-docs.spec.ts
│   │
│   ├── WEF/
│   │   ├── Microsoft-Login/
│   │   │   ├── project.config.json
│   │   │   └── car-model/
│   │   │       └── car-model-add.spec.ts
│   │   │
│   │   └── Dealer-Login/
│   │       ├── project.config.json
│   │       ├── _login/
│   │       └── dealer-model/
│   │
│   ├── run-local.bat
│   ├── run-local.ps1
│   ├── run-codegen.bat
│   └── setup.bat
│
├── Test-Prod/
├── playwright.config.ts
├── package.json
├── pnpm-lock.yaml
└── .gitignore
```

---

## 4. Access Flow

Access Flow คือช่องทางเข้าใช้งานระบบหนึ่งรูปแบบภายใน Project

ตัวอย่างของ WEF:

```text
WEF
├── Microsoft-Login
└── Dealer-Login
```

ข้อดีของการแยก Access Flow:

- Project เดียวรองรับ Login ได้หลายแบบ
- แต่ละ Flow มี Authentication Configuration ของตัวเอง
- Test ของ Microsoft Login ไม่ปะปนกับ Dealer Login
- หากเพิ่ม Login Flow ใหม่ในอนาคต Runner สามารถตรวจพบจาก Folder ได้

### Project ที่ไม่มี Login

ใช้ Access Flow เช่น `Public`:

```text
demo/
└── Public/
    ├── project.config.json
    └── general/
        └── *.spec.ts
```

### Project ที่มี Login แบบเดียว

ยังคงใช้ชั้น Access Flow เพื่อให้ Structure เหมือนกันทุก Project:

```text
Project-A/
└── Microsoft-Login/
    ├── project.config.json
    └── dashboard/
        └── *.spec.ts
```

Runner สามารถข้ามหน้าเลือก Access Flow ได้เมื่อพบเพียงหนึ่ง Flow

### Project ที่มีหลาย Login Flow

```text
WEF/
├── Microsoft-Login/
└── Dealer-Login/
```

Runner จะแสดง Menu ให้ผู้ใช้เลือก Flow

---

## 5. Authentication Configuration

แต่ละ Access Flow ใช้ไฟล์:

```text
project.config.json
```

### ไม่ใช้ Authentication

```json
{
  "authType": "none"
}
```

### Microsoft Authentication

```json
{
  "authType": "microsoft"
}
```

### Form Login

```json
{
  "authType": "form"
}
```

สถานะปัจจุบัน:

- `none`: ใช้งานได้แล้ว
- `microsoft`: ใช้งานได้แล้ว
- `form`: เตรียมโครงสร้างไว้แล้ว แต่ Login Flow ยังไม่ได้ Implement

หากไม่มี `project.config.json` ระบบจะใช้ `authType = none` เป็นค่าเริ่มต้น

---

## 6. Microsoft Authentication

เพิ่มโครงสร้างกลางสำหรับ Microsoft Authentication:

```text
Authen/Microsoft/
├── profile/
├── state.json
├── microsoft-profile.cjs
├── setup-microsoft-auth.bat
└── setup-microsoft-auth.ps1
```

### `profile/`

ใช้เก็บ Chromium Persistent Profile สำหรับ:

- Microsoft Sign-in
- MFA
- Microsoft Codegen
- Session ของ Browser

### `state.json`

ใช้เก็บ Authentication State สำหรับ `playwright test` เช่น:

- Cookies
- Local Storage
- IndexedDB Authentication Data

`state.json` ถูกโหลดผ่าน `playwright.config.ts` เฉพาะ Access Flow ที่กำหนด:

```json
{
  "authType": "microsoft"
}
```

### ขั้นตอนเตรียม Microsoft Session

```text
เปิด setup-microsoft-auth.bat
→ กรอก URL ของ Application
→ Login Microsoft หรือทำ MFA
→ รอจนเข้า Application สำเร็จ
→ กลับมาที่หน้าต่าง Script
→ กด Enter
→ สร้าง state.json
```

### Microsoft Codegen

`run-codegen.bat` ใช้:

```text
--user-data-dir=Authen/Microsoft/profile
```

ทำให้ Codegen เปิดด้วย Microsoft Profile เดิมและไม่ต้องเริ่ม Session ใหม่ทุกครั้ง

---

## 7. Universal Local Runner

`run-local.ps1` ถูกออกแบบใหม่ให้ตรวจ Folder โดยอัตโนมัติ ตามลำดับ:

```text
Project
→ Access Flow
→ Module
→ Test Scope
→ Spec File
```

### ระดับ Menu

1. เลือก Project
2. เลือก Access Flow เมื่อ Project มีมากกว่าหนึ่ง Flow
3. เลือก Module
4. เลือก Run All หรือ Specific Test File
5. รัน Test
6. เปิด HTML Report
7. กดปุ่มใดก็ได้เพื่อกลับ Menu

### การตรวจพบอัตโนมัติ

Runner ไม่ Hard-code ชื่อเหล่านี้:

- Project
- Access Flow
- Module
- Spec File

เมื่อเพิ่ม Folder ตามมาตรฐาน Runner จะตรวจพบในการเปิด Menu รอบถัดไป

### Folder ที่ไม่ถือเป็น Module

Runner จะ Ignore:

```text
_login
Login
node_modules
Folder ที่ขึ้นต้นด้วย _
Folder ที่ขึ้นต้นด้วย .
```

---

## 8. รูปแบบการรัน Test

Runner รองรับ 3 ระดับหลัก:

### Run All Modules

รันทุก `.spec.ts` ภายใต้ Access Flow ที่เลือก

```text
WEF/Microsoft-Login/**/**.spec.ts
```

### Run All Tests in Module

รันทุก `.spec.ts` ภายใต้ Module ที่เลือก

```text
WEF/Microsoft-Login/car-model/**/*.spec.ts
```

### Select Specific Test File

รัน Spec File ที่ผู้ใช้เลือกเพียงไฟล์เดียว

```text
WEF/Microsoft-Login/car-model/car-model-add.spec.ts
```

Runner ค้นหา Spec File ก่อน และส่งรายชื่อไฟล์จริงให้ Playwright เพื่อให้ทุก Scope ใช้กลไกเดียวกัน

---

## 9. การส่ง Authentication ให้ Playwright

`run-local.ps1` อ่าน `project.config.json` ของ Access Flow แล้วตั้งค่า:

```text
AUTH_TYPE
AUTH_STATE_PATH
```

ตัวอย่าง Microsoft:

```text
AUTH_TYPE=microsoft
AUTH_STATE_PATH=Authen/Microsoft/state.json
```

`playwright.config.ts` จะโหลด `storageState` เมื่อ Authentication Type ต้องใช้ Session

หลัง Test จบ Runner จะล้างค่าทันที เพื่อไม่ให้ Authentication ของ Flow หนึ่งรั่วไปอีก Flow:

```text
Run Microsoft Flow
→ โหลด Microsoft State
→ Test จบ
→ ล้าง AUTH_TYPE และ AUTH_STATE_PATH
→ Run Public Flow โดยไม่มี Microsoft Session
```

---

## 10. Car Model Test Case

เพิ่ม Test Case จริงสำหรับ WEF Car Model ภายใต้:

```text
Test-Local/WEF/Microsoft-Login/car-model/
```

Test Case ครอบคลุม:

- เปิด Application ด้วย Microsoft Session
- เลือก Staff Role
- เลือกบริษัท BMW
- เข้าสู่ระบบ WEF
- เข้าเมนู Car Model
- เพิ่มข้อมูล Car Model
- ตรวจ Popup ผลลัพธ์
- รองรับหลาย Test Case ใน Spec File เดียว

ข้อมูลที่บันทึกสำเร็จตัวอย่าง:

```text
218i | Gran Coupe M Sport QA-2026-A01
330e | M Sport Pro QA-2026-A02
i4   | eDrive40 M Sport QA-2026-A03
```

มีการกำหนดทุนประกันให้ไม่น้อยกว่า 80% ของราคาขาย เพื่อให้ผ่าน Business Validation

---

## 11. Setup Script และ Dependencies

เพิ่มการตรวจสอบ Package ที่จำเป็นใน `setup.bat`:

- Node.js
- pnpm
- `@playwright/test`
- Chromium
- `@types/node`
- TypeScript

Dependencies ปัจจุบันใน `package.json`:

```json
{
  "devDependencies": {
    "@playwright/test": "^1.62.1",
    "@types/node": "^26.5.0",
    "typescript": "^7.0.2"
  }
}
```

Chromium ใช้ Playwright Shared Browser Cache ของ Windows แทนการ Fix Path ภายใน Repository

```text
%LOCALAPPDATA%\ms-playwright
```

ทำให้เปลี่ยน Repository Path แล้วไม่ต้องดาวน์โหลด Chromium ใหม่ หาก Browser Revision ที่ต้องใช้มีอยู่แล้ว

---

## 12. HTML Report

`playwright.config.ts` ใช้ Reporter สองแบบ:

- `line` สำหรับแสดงผลใน Console
- `html` สำหรับสร้าง HTML Report

Report ถูกสร้างที่:

```text
playwright-report/
```

`run-local.ps1` เปิด Report อัตโนมัติหลัง Test จบ และรอให้ผู้ใช้กดปุ่มก่อนกลับ Menu

Generated Report ถูกนำออกจาก Git Tracking และเพิ่มใน `.gitignore`

---

## 13. Git Ignore และข้อมูลสำคัญ

เพิ่มกฎเพื่อป้องกัน Generated Files และ Authentication Data ถูก Commit:

```gitignore
node_modules/
playwright-report/
test-results/
blob-report/
browsers/

Authen/Microsoft/profile/*
Authen/Microsoft/state.json
!Authen/Microsoft/profile/.gitkeep

Test-Local/**/_login/state.json
```

ไฟล์ที่ Commit ได้:

```text
Authen/Microsoft/microsoft-profile.cjs
Authen/Microsoft/setup-microsoft-auth.bat
Authen/Microsoft/setup-microsoft-auth.ps1
Authen/Microsoft/profile/.gitkeep
```

ไฟล์ที่ห้าม Commit:

```text
Authen/Microsoft/state.json
Authen/Microsoft/profile/Default/
Authen/Microsoft/profile/Local State
Test-Local/**/_login/state.json
```

---

## 14. ผลลัพธ์หลังการปรับปรุง

ระบบรองรับสถานการณ์ต่อไปนี้แล้ว:

```text
Project ไม่มี Login
→ Public Flow
→ authType = none

Project มี Login แบบเดียว
→ Access Flow เดียว
→ Runner เลือก Flow ให้อัตโนมัติ

Project มีหลาย Login Flow
→ Runner แสดง Menu ให้เลือก Flow
→ แต่ละ Flow โหลด Authentication ของตัวเอง
```

Microsoft Authentication และ WEF Car Model Test ทำงานครบวงจรแล้ว:

```text
Project Config
→ Microsoft state.json
→ Interactive Runner
→ Playwright Test
→ เพิ่มข้อมูลจริง
→ HTML Report
```

---

## 15. งานที่ยังเหลือ

- Implement Dealer Form Login
- สร้าง `_login/state.json` สำหรับ Dealer Login
- ปรับ `playwright.config.ts` ให้รองรับ Form State อย่างสมบูรณ์
- เพิ่ม Dealer Model Test Cases
- ตรวจและปรับ Run All Scope ให้ส่ง Spec File จริงทุกกรณี
- พิจารณาแยก Local Retry ออกจากตัวแปร `CI`
- ปรับ Console Encoding หากต้องการแสดงชื่อ Test ภาษาไทยโดยไม่เกิด `write EIO`
- ปรับ Locator ที่ยังอิงลำดับ Element เช่น `span.first()` ให้ใช้ Label หรือ Test ID

---

## 16. Folder Contract สำหรับ Project ใหม่

เมื่อเพิ่ม Project ใหม่ ให้ใช้โครงสร้างนี้:

```text
Test-Local/
└── <project-name>/
    └── <access-flow-name>/
        ├── project.config.json
        ├── _login/                  # Optional
        └── <module-name>/
            └── <test-name>.spec.ts
```

ตัวอย่าง Project ไม่มี Login:

```text
Test-Local/New-Public-App/Public/general/homepage.spec.ts
```

ตัวอย่าง Microsoft Login:

```text
Test-Local/New-App/Microsoft-Login/dashboard/dashboard.spec.ts
```

ตัวอย่าง Form Login:

```text
Test-Local/New-App/Dealer-Login/
├── project.config.json
├── _login/
└── dealer-model/
    └── dealer-add.spec.ts
```

เมื่อตรงตาม Folder Contract แล้ว Runner จะตรวจพบ Project, Flow, Module และ Spec File โดยอัตโนมัติ
