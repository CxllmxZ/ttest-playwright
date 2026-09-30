# ttest-playwright — คู่มือการใช้งาน

คู่มือนี้พาทำตั้งแต่ repo เปล่าจนรันเทสได้ ภาพรวมสั้นๆ อยู่ใน [README](../README.md) ส่วนกฎทั้งหมดแบบละเอียดอยู่ใน [`AGENTS.md`](../AGENTS.md)

English: [GUIDE.md](GUIDE.md)

---

## สรุปสั้น

| ต้องการ | ทำ | วิธี |
|---|---|---|
| เริ่มโปรเจค / access flow / module ใหม่ | **Setup 1** | ⚡ Task |
| เตรียม login (Microsoft / form) | ตั้งค่า Login | สคริปต์ `.bat` |
| อัดขั้นตอนการใช้งาน | Codegen | `Test-Local/run-codegen.bat` |
| จัด locator ที่อัดได้ให้เป็นรายการ | **Setup 3** | 💬 Prompt |
| เขียน test case | **Setup 4** | 💬 Prompt |
| สร้างไฟล์เทส | **Setup 5** | ⚡ Task |
| รันเทส | Runner | `Test-Local/run-local.bat` |
| เพิ่ม test case | **Setup 4** → **Setup 7** | 💬 → ⚡ |
| แก้ / ลบ test case | แก้ CSV → **Setup 7** | ⚡ Task |
| ใช้ action หรือช่องกรอกแบบใหม่ | **Setup 6** → **Setup 7** | 💬 → ⚡ |

- **⚡ Task:** VS Code → `Ctrl+Shift+P` → **Run Task** → เลือก Setup → กรอกค่าในกล่อง
- **💬 Prompt:** ก๊อป template จาก[ภาคผนวก ก](#ภาคผนวก-ก--template-ของ-prompt) ไปแปะใน AI (เช่น GitHub Copilot โหมด **Agent**)

ไม่มี Setup 2 แล้ว (รวมเข้ากับ Setup 1)

---

## สารบัญ

0. [ติดตั้ง](#0-ติดตั้ง)
1. [Setup 1 — สร้างโปรเจค](#1-setup-1--สร้างโปรเจค)
2. [ตั้งค่า Login](#2-ตั้งค่า-login)
3. [อัดขั้นตอนด้วย codegen](#3-อัดขั้นตอนด้วย-codegen)
4. [แบ่งโค้ดที่อัดได้ลง `_flows` และ `_locators`](#4-แบ่งโค้ดที่อัดได้ลง-_flows-และ-_locators)
5. [Setup 3 — Locators](#5-setup-3--locators)
6. [Setup 4 — Scenarios](#6-setup-4--scenarios)
7. [Setup 5 — สร้าง feature](#7-setup-5--สร้าง-feature)
8. [รันเทส](#8-รันเทส)
9. [เพิ่มหรือแก้ test case](#9-เพิ่มหรือแก้-test-case)
10. [action หรือช่องกรอกแบบใหม่ (Setup 6)](#10-action-หรือช่องกรอกแบบใหม่-setup-6)
11. [แก้ปัญหา](#11-แก้ปัญหา)
- [ภาคผนวก ก — Template ของ Prompt](#ภาคผนวก-ก--template-ของ-prompt)
- [ภาคผนวก ข — ภาษาของสคริปต์](#ภาคผนวก-ข--ภาษาของสคริปต์)

---

## 0. ติดตั้ง

ต้องมี: Node.js 18 ขึ้นไป, VS Code, Windows (สำหรับไฟล์ `.bat`)

บน Windows ดับเบิลคลิก **`Test-Local/setup.bat`** จะเช็ค Node.js และติดตั้ง pnpm, Playwright, Chromium, TypeScript ให้ถ้ายังไม่มี

หรือติดตั้งเอง:

```bash
pnpm install
pnpm exec playwright install chromium
```

เปิด **โฟลเดอร์ของ repo โดยตรง** ใน VS Code (File → Open Folder → `ttest-playwright`) ถ้าเปิดโฟลเดอร์ที่อยู่สูงกว่านั้น Task จะไม่ขึ้นในเมนู

---

## 1. Setup 1 — สร้างโปรเจค

สร้างโฟลเดอร์และการตั้งค่า login สำหรับ 1 module

**รัน:** `Ctrl+Shift+P` → **Run Task** → **Setup 1 — Create-Project**

| ช่อง | ความหมาย | ตัวอย่าง |
|---|---|---|
| Project | แอปที่จะเทส | `Nebula-Spa` |
| AccessFlow | ช่องทางเข้าแอป (login แบบเดียว) | `No-Auth` |
| Module | ส่วนหนึ่งของแอป | `Bookings` |
| AuthType | วิธี login ของ access flow นี้ | `none` |

**AuthType:**

| ค่า | ใช้เมื่อ |
|---|---|
| `none` | ไม่ต้อง login |
| `microsoft` | login ด้วยบัญชี Microsoft / Azure AD |
| `form` | login ด้วยฟอร์ม email + รหัสผ่านของแอปเอง |

**ผลที่ได้:**

```
Test-Local/Nebula-Spa/No-Auth/
├── project.config.json        { "authType": "none" }
└── Bookings/
    ├── _flows/
    ├── _locators/
    └── _scenarios/
```

**ควรรู้**

- ใช้ Task เดิมเพื่อเพิ่ม module หรือ access flow ใหม่ได้ โฟลเดอร์ที่มีอยู่แล้วจะถูกใช้ต่อ ไม่ถูกเขียนทับ
- 1 access flow ใช้ AuthType ได้แบบเดียว ถ้าจะใช้ login แบบอื่นให้ตั้งชื่อ AccessFlow ใหม่ (เช่น `Admin-Login`)
- ชื่อห้ามมีช่องว่าง ใช้ `-` แทน
- ชื่อที่ต่างจากโฟลเดอร์เดิมแค่ตัวพิมพ์เล็ก-ใหญ่ (`nebula-spa` กับ `Nebula-Spa`) จะถูกปฏิเสธ เพราะ Windows มองว่าเป็นโฟลเดอร์เดียวกัน แต่ git และ Linux มองว่าเป็นคนละโฟลเดอร์

---

## 2. ตั้งค่า Login

ทำ**ก่อนอัด codegen** เพราะตัวอัดจะเปิดแอปด้วย login ที่บันทึกไว้

### `none`

ไม่ต้องทำอะไร

### `microsoft`

1. ดับเบิลคลิก **`Authen/Microsoft/setup-microsoft-auth.bat`**
2. ใส่ URL ของแอป
3. login ด้วย Microsoft (รวม MFA) ในเบราว์เซอร์ที่เปิดขึ้นมา
4. รอจนแอปโหลดเสร็จ
5. กลับไปที่หน้าต่างสคริปต์ แล้วกด **Enter**

profile ของเบราว์เซอร์ถูกเก็บไว้ที่ `Authen/Microsoft/profile/` (ไม่ขึ้น git) ทำซ้ำเมื่อ session หมดอายุ

ถ้าไม่ทำขั้นนี้ ตัวอัดจะหยุดและขึ้นว่า *"Microsoft profile is not ready"*

### `form`

รัน **`Authen/Form-Login/setup-form-auth.bat`** จะ login หนึ่งครั้งแล้วเก็บ session ไว้ที่ `Test-Local/<Project>/<AccessFlow>/_login/session-storage.json` (ไม่ขึ้น git)

รายละเอียด (รหัสผ่าน, อายุ session): [`FORM_LOGIN_SESSION_STORAGE_GUIDE.md`](FORM_LOGIN_SESSION_STORAGE_GUIDE.md)

---

## 3. อัดขั้นตอนด้วย codegen

1. ดับเบิลคลิก **`Test-Local/run-codegen.bat`**
2. เลือก **Project** → **Access Flow**
3. เฉพาะ `form` — เลือกโหมด:
   - **Record login and test flow** — เบราว์เซอร์ใหม่ที่ยังไม่ login อัดทุกขั้นรวมถึงการ login
   - **Open authenticated browser / Pick locators** — login ไว้แล้ว ใช้เลือก locator ทีละตัว (ไม่ได้อัดโค้ดทั้งหมด)
4. ใส่ URL หน้าเริ่มต้น
5. ในเบราว์เซอร์ ทำ **test case ปกติหนึ่งรอบจนจบ** เช่น จองนวดหนึ่งครั้งตั้งแต่ต้นจนจบ
6. ก๊อปโค้ดจากหน้าต่าง **Playwright Inspector**

ตัวอัดไม่ได้บันทึกไฟล์ให้ ต้องเอาโค้ดไปวางเองในขั้นถัดไป

**อัดแค่ test case เดียว** test case อื่นมาจาก CSV ทีหลัง

---

## 4. แบ่งโค้ดที่อัดได้ลง `_flows` และ `_locators`

ขั้นนี้สำคัญที่สุด โค้ดที่อัดได้ชุดเดียว แบ่งเป็น 2 ไฟล์ที่**ชื่อเหมือนกัน** เรียกว่า *ชื่อ feature*:

```
Bookings/_flows/bookings.ts
Bookings/_locators/bookings.ts
```

ใช้ตัวพิมพ์เล็กทั้งหมดสำหรับชื่อ feature และ `_flows`, `_locators`, `_scenarios` กับโฟลเดอร์ที่สร้างขึ้น ต้องใช้ชื่อเดียวกันทุกตัวอักษร

### กฎข้อเดียว

ดูทีละบรรทัดที่อัดได้ แล้วถามว่า: **ขั้นนี้เปลี่ยนไปตามแต่ละ test case ไหม?**

| คำตอบ | ไปอยู่ที่ |
|---|---|
| **ไม่** — ทุก test case ทำเหมือนกัน | `_flows` |
| **ใช่** — แต่ละ test case ใช้ค่าหรือปุ่มต่างกัน | `_locators` (และลบออกจาก `_flows`) |

### ตัวอย่าง — การจอง

โค้ดที่อัดได้:

```typescript
await page.goto('http://localhost:8787/');
await page.locator('#top').getByRole('link', { name: 'จองเลย →' }).click();
await page.getByRole('button', { name: 'นวดไทย ฿ 350 60 นาที' }).click();       // เปลี่ยนตาม TC
await page.getByRole('button', { name: 'วันพฤหัสบดีที่ 1 ตุลาคม' }).click();     // เปลี่ยนตาม TC
await page.getByRole('button', { name: '11:00' }).click();                       // เปลี่ยนตาม TC
await page.getByRole('textbox', { name: 'ชื่อ-นามสกุล' }).fill('test');          // เปลี่ยนตาม TC
await page.getByRole('textbox', { name: 'เบอร์โทร' }).fill('0812345678');        // เปลี่ยนตาม TC
await page.getByRole('button', { name: 'ยืนยันการจอง →' }).click();
await page.getByRole('link', { name: 'กลับหน้าแรก' }).click();
```

**`_flows/bookings.ts`** — ขั้นที่ไม่เปลี่ยน แบ่งด้วย marker 3 จุด:

```typescript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // === SETUP ===
  await page.goto('http://localhost:8787/');

  // === PER TEST ===
  await page.locator('#top').getByRole('link', { name: 'จองเลย →' }).click();

  // === DATA ===
  await page.getByRole('button', { name: 'ยืนยันการจอง →' }).click();
  await page.getByRole('link', { name: 'กลับหน้าแรก' }).click();
});
```

**`_locators/bookings.ts`** — ขั้นที่เปลี่ยน เรียงตามลำดับ ไม่มี action ต่อท้าย:

```typescript
import type { Locator, Page } from '@playwright/test';

export const bookingsLocators: Array<(page: Page, value?: string) => Locator> = [
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }),
  (page) => page.getByRole('textbox', { name: 'ชื่อ-นามสกุล' }),
  (page) => page.getByRole('textbox', { name: 'เบอร์โทร' }),
];
```

จะวางบรรทัด locator ดิบๆ ลงใน `_locators` แล้วให้ **Setup 3** แปลงเป็นรูปแบบนี้ก็ได้

### Marker 3 จุด

| Marker | ทำงานตอน | ใส่อะไร |
|---|---|---|
| `// === SETUP ===` | **ก่อนทุก** test case | เปิดหน้าเริ่มต้น, ขั้นตอน login ภายในแอป |
| `// === PER TEST ===` | ตอนเริ่มแต่ละ test case | ขั้นก่อนใส่ข้อมูลเทส (เปิดฟอร์ม, ล้างตัวกรอง) |
| `// === DATA ===` | จุดที่ข้อมูลเทสถูกใส่ | ขั้น**หลัง**ใส่ข้อมูล (กดยืนยัน, กดบันทึก) อยู่ใต้ marker นี้ |

- แต่ละ marker ต้องมี **ครั้งเดียว** และเรียงตามลำดับนี้
- `test('test', async ({ page }) => { … })` ที่ codegen ใส่มา ปล่อยไว้ได้ ระบบตัดออกให้เอง
- ใช้ **URL เต็ม** ใน `page.goto(...)` ของ SETUP ระบบใช้ตรวจว่าเทสยังอยู่ในแอป
- ถ้าหน้าเว็บมีหน้าจอ loading ต้องใส่ `await waitForLoading(page);` เองตรงจุดที่ต้องรอ ระบบไม่ใส่ให้อัตโนมัติ
- **ห้ามใส่รหัสผ่านใน `_flows`** ไฟล์นี้ขึ้น git และถูกก๊อปไปอยู่ใน spec

**เรื่องขั้นตอน login ใน SETUP**

- `microsoft`: runner ใช้ profile Microsoft ที่บันทึกไว้ เก็บไว้เฉพาะขั้นตอน*ภายในแอป*หลัง sign-in (เช่น เลือกสาขา)
- `form`: runner โหลด session ที่บันทึกไว้ แอปจึงมักจะ login อยู่แล้ว ให้เริ่ม SETUP จากหน้าแรกหลัง login และลบขั้นตอน login ที่อัดมาออก ควรลองกับแอปของคุณหนึ่งครั้ง เพราะบางแอปทำงานต่างกัน

### ตัวอย่าง — ปุ่มพิมพ์ (หลัง DATA ว่าง)

แต่ละ test case กดคนละปุ่ม และไม่มีขั้นอื่นต่อ:

```typescript
  // === SETUP ===
  await page.goto('https://example.com/app/');

  // === PER TEST ===
  await page.getByRole('button', { name: 'ค้นหา' }).click();

  // === DATA ===
});
```

```typescript
export const printLocators: Array<(page: Page, value?: string) => Locator> = [
  (page, value) => page.getByRole('button', { name: value }),
  (page, value) => page.getByRole('button', { name: value }).first(),
  (page, value) => page.getByRole('button', { name: value }).first(),
];
```

ใส่ `.first()` เมื่อหน้าเว็บมีปุ่มชื่อซ้ำหลายตัว (เช่น ปุ่มเดียวกันในแต่ละแถวของตาราง) ไม่อย่างนั้นเทสจะ fail ด้วย *"strict mode violation"*

### ชนิดของ locator

| ชนิด | เขียนแบบ | ค่าใน CSV | ใช้กับ |
|---|---|---|---|
| **Static** | `(page) => …` | ข้อความที่พิมพ์, ตัวเลือกที่เลือก หรือ `\|click` | ช่องกรอก, dropdown, ปุ่มที่กดตัวเดิมทุกครั้ง |
| **Parametric** | `(page, value) => …` | ชื่อปุ่มที่จะกด | ปุ่มที่แต่ละ test case เลือกต่างกัน |

Parametric ต้องรับ 2 parameter พอดี และ**ห้ามมีค่า default** (`(page, value = '') =>` จะทำให้ใช้ไม่ได้)

### ปุ่มที่ไม่มีชื่อ

- **ทุก test case กดปุ่มเดียวกัน:** static ระบุตำแหน่ง — `(page) => page.locator('.toolbar').getByRole('button').nth(2)` ใน CSV ใส่ `|click`
- **แต่ละ test case กดคนละปุ่ม:** แยกช่องละปุ่ม (CSV `|click,,` / `,|click,`) หรือ parametric แบบตัวเลข:
  `(page, value) => page.locator('.toolbar').getByRole('button').nth(Number(value) - 1)` ใน CSV ใส่ `1`, `2`, `3`
- `.nth()` ต้องมีตัวกรองกลุ่มก่อนเสมอ (`.toolbar`) ถ้าเขียน `page.getByRole('button').nth(2)` เฉยๆ เทสจะกดผิดปุ่มทันทีที่หน้าเว็บเปลี่ยนเลย์เอาต์
- ถ้าเป็นแอปของคุณเอง เพิ่ม `aria-label` ให้ปุ่มดีที่สุด

---

## 5. Setup 3 — Locators

แปลงบรรทัด locator ดิบใน `_locators/<feature>.ts` ให้เป็นรายการที่เรียงลำดับแล้ว และตัดสินว่าปุ่มไหนเป็น parametric

**รัน:** แปะ template ของ Setup 3 ([ภาคผนวก ก](#setup-3--locators))

**ตรวจผล:**
- ลำดับตรงกับลำดับที่ต้องการใน CSV
- ปุ่มที่เปลี่ยนตาม test case เป็น parametric `(page, value) =>`
- `.first()` / `.nth()` ยังอยู่ในจุดที่จำเป็น
- ไม่มีคอมเมนต์ในไฟล์ (ความหมายของแต่ละตำแหน่งอยู่ใน CSV)

---

## 6. Setup 4 — Scenarios

แปลงบรรทัดแบบ `ชื่อ scenario : ค่า` ให้เป็น `_scenarios/<feature>.csv`

**รัน:** แปะ template ของ Setup 4 ([ภาคผนวก ก](#setup-4--scenarios)) พร้อม scenario:

```
จองนวดไทย : นวดไทย,วันพฤหัสบดีที่ 1 ตุลาคม,11:00,test,0812345678
จองโดยไม่กรอกเบอร์ : นวดไทย,วันพฤหัสบดีที่ 1 ตุลาคม,13:00,test,
```

### การเขียนค่า

ค่าคือรายการที่คั่นด้วย comma **ค่าตัวที่ N ไปที่ locator ตัวที่ N**

| locator ในตำแหน่งนั้น | ใส่ | ตัวอย่าง |
|---|---|---|
| ช่องกรอก | ข้อความที่พิมพ์ | `test` |
| dropdown | ตัวเลือก | `งานใหม่` |
| ปุ่ม parametric | ชื่อปุ่ม (หรือส่วนที่ไม่ซ้ำ) | `นวดไทย` |
| ปุ่มที่กดตัวเดิม | `\|click` | `\|click` |
| test case นี้ไม่ใช้ | เว้นว่าง | `,,` |

**กฎ**

- จำนวนค่าต้องเท่ากับจำนวน locator 5 locator = comma 4 ตัวเสมอ
- ชื่อปุ่มถูกค้นแบบ "มีคำนี้อยู่" ดังนั้น `นวดไทย` จะเจอ `นวดไทย ฿ 350 60 นาที`
- ใส่ comma ในค่าไม่ได้ ถ้าปุ่มชื่อ `นวดหินร้อน ฿ 1,200` ให้ใส่ `นวดหินร้อน`
- `ชื่อ : ค่า` ถูกแยกที่ ` : ` **ตัวแรก** (มีเว้นวรรคหน้า-หลัง) เวลา `11:00` จึงไม่ถูกตัด

**ถ้ามี CSV อยู่แล้ว** Setup 4 จะ**เพิ่มต่อท้าย**ด้วย TC-ID ถัดไป แถวเดิมไม่ถูกแก้ scenario ที่ชื่อซ้ำกับของเดิมจะถูกข้ามและแจ้งให้ทราบ

---

## 7. Setup 5 — สร้าง feature

**รัน:** `Ctrl+Shift+P` → **Run Task** → **Setup 5 — Generate feature** → Project / AccessFlow / Module / Feature

ได้:

```
Bookings/bookings/
├── bookings.spec.ts      ขั้นตอนพร้อมข้อมูลเทส
├── bookings.helper.ts    กรอก / เลือก / กด ทีละค่า
├── bookings.data.ts      แถวจาก CSV
└── bookings.types.ts
```

ใช้เวลาประมาณ 1 วินาที ก่อนเขียนไฟล์จะตรวจไฟล์ต้นทางทั้ง 3: marker, รูปแบบ locator, จำนวนค่า, encoding, ตัวพิมพ์ของชื่อไฟล์ ถ้ามีอะไรผิด**จะไม่เขียนอะไรเลย** และบอกว่าต้องแก้อะไรที่ไหน

อย่าแก้ขั้นตอนใน `spec.ts` โดยตรง ให้แก้ `_flows` แล้วลบโฟลเดอร์ feature แล้วรัน Setup 5 ใหม่ ส่วนการเพิ่ม `expect(...)` ใน `defaultVerify` ของ `spec.ts` ทำได้

---

## 8. รันเทส

### `Test-Local/run-local.bat` (ทุก AuthType)

1. ดับเบิลคลิก `run-local.bat`
2. เลือก **Project** → **Access Flow** → **Module** (หรือทุก module) → **Feature** (หรือทุก feature)
3. เลือก **Run ALL tests** หรือ **Select SPECIFIC test file**
4. รายงาน HTML เปิดเองเมื่อรันเสร็จ

access flow แบบ `microsoft` และ `form` **ต้อง**ใช้ `run-local.bat` เพราะมันโหลด login ที่บันทึกไว้

### Command line (เฉพาะ `none`)

```bash
pnpm exec playwright test Test-Local/Nebula-Spa/No-Auth/Bookings/bookings
```

| เติม | เพื่อ |
|---|---|
| `--headed` | ดูเบราว์เซอร์ตอนรัน |
| `--ui` | ไล่ดูเทสทีละขั้น |
| `-g "TC001"` | รันแค่ test case เดียว |

รายงาน: `pnpm exec playwright show-report`

### "ผ่าน" แปลว่าอะไร

เทสที่สร้างขึ้นตรวจว่า**ไม่มี dialog error** และหน้าเว็บ**ยังอยู่ในเว็บของแอป** ไม่ได้ตรวจผลทางธุรกิจ (เช่น ค้นหาแล้วมีข้อมูลขึ้น) ถ้าต้องการ ให้เพิ่ม `expect(...)` ใน `defaultVerify` ของ spec

---

## 9. เพิ่มหรือแก้ test case

| ต้องการ | ขั้นตอน |
|---|---|
| **เพิ่ม** test case | Setup 4 แปะเฉพาะ scenario ใหม่ → **Setup 7** |
| **แก้ / ลบ** test case | แก้ CSV ใน **VS Code** → **Setup 7** |
| locator เปลี่ยน (เพิ่ม / ลบ / สลับลำดับ) | แก้ทุกแถวใน CSV ให้จำนวนค่าตรง → **Setup 7** |

**Setup 7** (`Run Task` → **Setup 7 — Update test data**) เขียนใหม่เฉพาะ `data.ts` และบอกว่า TC-ID ไหน**เพิ่มใหม่** และไหน**หายไป** ให้เช็ครายการที่หายไปทุกครั้ง ว่าตั้งใจลบจริง

**อย่าแก้ CSV ด้วย Excel** Excel อาจบันทึกเป็น encoding ที่ไม่ใช่ UTF-8 (ภาษาไทยกลายเป็น `�`) และแปลงค่าอย่าง `0812345678` หรือ `11:00` เป็นตัวเลขหรือเวลา ถ้าจำเป็นต้องใช้ ให้ *Save As → CSV UTF-8*

---

## 10. action หรือช่องกรอกแบบใหม่ (Setup 6)

ใช้ Setup 6 เมื่อการรันหรือ Setup 7 แจ้งว่า:

- **ไม่รู้จัก action** — ต้องการ action อื่นนอกจาก `|click` (เช่น `|download`, `|check`)
- **unknown locator type** — ช่องกรอกที่ helper กรอกไม่เป็น (เช่น ตัวเลือกวันที่)

**รัน:** แปะ template ของ Setup 6 ([ภาคผนวก ก](#setup-6--ขยาย-helper)) แล้วอธิบายสิ่งที่ต้องการเป็นภาษาปกติ ไม่ต้องเขียนโค้ด AI จะเขียนให้และแสดงสิ่งที่เปลี่ยนให้ดู

จากนั้นใส่ action ใหม่ใน CSV → **Setup 7** → รันเทส

**ข้อจำกัด**

- มีผล**เฉพาะ feature นั้น**
- ถ้ารัน Setup 5 ใหม่กับ feature นั้น `helper.ts` จะถูกสร้างใหม่และ**สิ่งที่เพิ่มจะหายไป**
- ถ้าอยากให้ทุก feature ในอนาคตมีด้วย dev ต้องเพิ่มลงในแม่แบบ helper ใน `scripts/setup-5.mjs`

---

## 11. แก้ปัญหา

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| ไม่เห็น Task ในเมนู Run Task | VS Code เปิดโฟลเดอร์ผิดระดับ | เปิดโฟลเดอร์ `ttest-playwright` โดยตรง |
| `node` is not recognized | VS Code หา Node ไม่เจอ | ปิดเปิด VS Code ใหม่ เช็ค `node --version` |
| ตัวอัดขึ้น *Microsoft profile is not ready* | ยังไม่ได้ตั้งค่า login | [ตั้งค่า Login](#microsoft) |
| เทส fail ตั้งแต่ขั้นแรก (หน้า login) | session หมดอายุหรือไม่ได้โหลด | ตั้งค่า login ใหม่ รันผ่าน `run-local.bat` |
| *strict mode violation* | เจอหลาย element | ใส่ `.first()` ให้ locator นั้น หรือใส่ชื่อปุ่มให้ยาวขึ้น |
| หาปุ่มวันที่ไม่เจอ | วันที่ใน CSV ผ่านไปแล้ว | แก้ CSV → Setup 7 |
| ปุ่มเวลากดไม่ได้ | รอบก่อนจองไปแล้ว | ล้างข้อมูลในแอปก่อนรัน |
| ไฟล์มี `�` หรือ `à¸…` | บันทึกผิด encoding (Excel, PowerShell) | บันทึกใหม่เป็น UTF-8 ใน VS Code |
| *ตัวพิมพ์ต่างกัน — Linux/CI จะหาไม่เจอ* | ชื่อไฟล์ตัวพิมพ์เล็ก-ใหญ่ไม่ตรงกัน | เปลี่ยนชื่อให้ตรงกันทุกตัวอักษร |
| เทสผ่านแต่ไม่มีอะไรเกิดขึ้น | การตรวจพื้นฐานตรวจไม่ลึก | เพิ่ม `expect(...)` ใน `defaultVerify` |
| ข้อความของสคริปต์เป็นภาษาที่ไม่ต้องการ | ระบบตรวจภาษาของเครื่อง | [ภาคผนวก ข](#ภาคผนวก-ข--ภาษาของสคริปต์) |

---

## ภาคผนวก ก — Template ของ Prompt

แปะใน AI โหมด **Agent** ห้ามลบบรรทัด `Read: #file:` แทน `<…>` ด้วยค่าจริง

### Setup 1 — Create-Project

(ใช้ Task เร็วกว่า)

```markdown
### Setup 1 — Create-Project

Read: #file:prompts/setup-1-create-project.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- AuthType: <none | microsoft | form>
```

### Setup 3 — Locators

```markdown
### Setup 3 — Bootstrap locators

Read: #file:prompts/setup-3-modify-locators.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

### Setup 4 — Scenarios

```markdown
### Setup 4 — Create scenarios

Read: #file:prompts/setup-4-create-scenarios.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>

**Scenarios**
<ชื่อ scenario 1> : <ค่า 1>
<ชื่อ scenario 2> : <ค่า 2>
```

### Setup 5 — สร้าง feature

(ใช้ Task เร็วกว่า)

```markdown
### Setup 5 — Create feature

Read: #file:prompts/setup-5-create-features.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

### Setup 6 — ขยาย helper

```markdown
### Setup 6 — Extend action

Read: #file:prompts/setup-6-extend-action.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>

**Extension**
<error ที่เจอ หรือสิ่งที่ต้องการ เช่น "|download: กดปุ่มแล้วรอไฟล์ดาวน์โหลด">
```

### Setup 7 — อัปเดตข้อมูลเทส

(ใช้ Task เร็วกว่า)

```markdown
### Setup 7 — Update TCs

Read: #file:prompts/setup-7-update-tcs.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

---

## ภาคผนวก ข — ภาษาของสคริปต์

สคริปต์แสดงผลเป็นไทยหรืออังกฤษตามภาษาของเครื่อง ถ้าต้องการบังคับ เปิด `.vscode/tasks.json` แล้วตั้งค่า:

```json
"env": { "TTEST_LANG": "th" }
```

(`"en"` = อังกฤษ, ว่าง = อัตโนมัติ) ถ้ารันจาก terminal: `set TTEST_LANG=th` (cmd) หรือ `$env:TTEST_LANG="th"` (PowerShell)
