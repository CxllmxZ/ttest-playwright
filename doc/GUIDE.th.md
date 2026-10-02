# ttest-playwright — คู่มือการใช้งาน

คู่มือนี้พาทำตั้งแต่ repo เปล่าจนรันเทสได้ ภาพรวมสั้นๆ อยู่ใน [README](../README.md) ส่วนกฎทั้งหมดแบบละเอียดอยู่ใน [`AGENTS.md`](../AGENTS.md)

English: [GUIDE.md](GUIDE.md)

---

## สรุปสั้น

| ต้องการ | ทำ | วิธี |
|---|---|---|
| เริ่มโปรเจค / access flow / module ใหม่ | **Setup 1** | ⚡ Task |
| เตรียม login — Microsoft | ตั้งค่า Login | สคริปต์ `.bat` |
| เตรียม login — form | อัด → **Setup 2** → `.bat` | ⚡ Task |
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


---

## สารบัญ

0. [ติดตั้ง](#0-ติดตั้ง)
1. [Setup 1 — สร้างโปรเจค](#1-setup-1--สร้างโปรเจค)
2. [เลือกเส้นทาง (none / microsoft / form)](#2-เลือกเส้นทาง)
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

## 2. เลือกเส้นทาง

เลือกเส้นทางตาม **AuthType** ที่เลือกใน Setup 1 แต่ละแบบมีลำดับขั้นตอนไม่เหมือนกัน

| | `none` | `microsoft` | `form` |
|---|---|---|---|
| เตรียม login | — | **ก่อน**อัด codegen | **หลัง**อัด codegen (ใช้สิ่งที่อัดได้) |
| ขั้นพิเศษ | — | — | Setup 2 |
| รันเทสด้วย | `run-local.bat` หรือ command line | `run-local.bat` เท่านั้น | `run-local.bat` เท่านั้น |

หัวข้อ 3–10 อธิบายแต่ละขั้นแบบละเอียด แต่ละเส้นทางด้านล่างลิงก์ไปให้

### เส้นทาง A — ไม่มี login (`none`)

1. **Setup 1** เลือก AuthType `none` ([หัวข้อ 1](#1-setup-1--สร้างโปรเจค))
2. **อัด** test case หนึ่งรอบ — `Test-Local/run-codegen.bat` ([หัวข้อ 3](#3-อัดขั้นตอนด้วย-codegen))
3. **แบ่ง**โค้ดลง `_flows` และ `_locators` ([หัวข้อ 4](#4-แบ่งโค้ดที่อัดได้ลง-_flows-และ-_locators))
4. **Setup 3** — locators ([หัวข้อ 5](#5-setup-3--locators))
5. **Setup 4** — scenarios ([หัวข้อ 6](#6-setup-4--scenarios))
6. **Setup 5** — สร้าง feature ([หัวข้อ 7](#7-setup-5--สร้าง-feature))
7. **รันเทส** — `run-local.bat` หรือ `pnpm exec playwright test …` ([หัวข้อ 8](#8-รันเทส))

### เส้นทาง B — login Microsoft (`microsoft`)

1. **Setup 1** เลือก AuthType `microsoft`
2. **บันทึก login Microsoft** (ครั้งเดียวต่อเครื่อง ใช้ร่วมกันทุกโปรเจคที่เป็น `microsoft`):
   1. ดับเบิลคลิก **`Authen/Microsoft/setup-microsoft-auth.bat`**
   2. ใส่ URL ของแอป
   3. login ด้วย Microsoft (รวม MFA) ในเบราว์เซอร์ที่เปิดขึ้นมา
   4. รอจนแอปโหลดเสร็จ
   5. กลับไปที่หน้าต่างสคริปต์ แล้วกด **Enter**

   profile ถูกเก็บที่ `Authen/Microsoft/profile/` (ไม่ขึ้น git) ถ้าไม่ทำขั้นนี้ ตัวอัดจะหยุดและขึ้น *"Microsoft profile is not ready"*
3. **อัด** test case หนึ่งรอบ — `run-codegen.bat` เปิดแอปแบบ login แล้ว ([หัวข้อ 3](#3-อัดขั้นตอนด้วย-codegen))
4. **แบ่ง**โค้ด ([หัวข้อ 4](#4-แบ่งโค้ดที่อัดได้ลง-_flows-และ-_locators)) ใน SETUP เก็บเฉพาะขั้นตอน*ภายในแอป*หลัง sign-in (เช่น เลือกสาขา) ส่วนการ sign-in ของ Microsoft ไม่ถูกอัดมาอยู่แล้ว
5. **Setup 3 → Setup 4 → Setup 5** ([หัวข้อ 5–7](#5-setup-3--locators))
6. **รันเทส** — `run-local.bat` เท่านั้น ([หัวข้อ 8](#8-รันเทส))

เมื่อ session หมดอายุ: ทำข้อ 2 ใหม่

### เส้นทาง C — login แบบฟอร์ม (`form`)

access flow แบบ `form` แต่ละตัวมีสคริปต์ login ของตัวเอง ไม่ต้องเขียนเอง แค่**อัดการ login หนึ่งครั้ง** แล้ว Setup 2 สร้างให้

```
Test-Local/<Project>/<AccessFlow>/_login/
├── login-locators.ts      Setup 1 สร้าง — ที่สำหรับแปะ login ที่อัดได้ (ไม่ขึ้น git)
├── login.setup.ts         Setup 2 สร้าง — สคริปต์ login (ขึ้น git, ไม่มีรหัสผ่าน)
└── session-storage.json   setup-form-auth.bat สร้าง — session ที่บันทึกไว้ (ไม่ขึ้น git)
```

1. **Setup 1** เลือก AuthType `form` — สร้าง `_login/login-locators.ts` ให้
2. **อัด login และ test case รวดเดียว** — `run-codegen.bat` → เลือกโปรเจค / access flow → **Record login and test flow** แล้ว login (รวมขั้นตอนที่ต้องทำก่อนเข้าแอปได้ เช่น เลือกบริษัท, ปิด popup) แล้วทำ test case หนึ่งรอบ ยังไม่ต้องปิดหน้าต่างอัด
3. **แปะส่วน login** — ตั้งแต่ `page.goto(...)` จนถึงจุดที่เข้าแอปแล้ว — ลงใน `_login/login-locators.ts` ใต้คอมเมนต์
4. **Setup 2** — `Ctrl+Shift+P` → **Run Task** → **Setup 2 — Form login** → เลือกโปรเจค / access flow → เลือกว่าแอปเก็บ login แบบไหน ([วิธีเลือก](#cookies-หรือ-sessionstorage))
   สคริปต์จะสร้าง `login.setup.ts` โดยเปลี่ยน username กับรหัสผ่านเป็นตัวแปร แล้ว**ล้าง `login-locators.ts`** ค่าจริงจึงไม่เหลือในเครื่อง
5. **บันทึก session** — ดับเบิลคลิก **`Authen/Form-Login/setup-form-auth.bat`** → เลือก access flow → พิมพ์ username และรหัสผ่านใน terminal (รหัสผ่านถูกซ่อน และไม่ถูกบันทึกลงไฟล์) เบราว์เซอร์จะ login เอง แล้วบันทึก `session-storage.json`
6. **แบ่งโค้ดส่วนที่เหลือ** ([หัวข้อ 4](#4-แบ่งโค้ดที่อัดได้ลง-_flows-และ-_locators)) session ที่บันทึกไว้ทำให้ไม่ต้องผ่านฟอร์ม login SETUP จึงแค่เปิดหน้าในแอปที่เทสเริ่ม ตัดบรรทัด login ที่อัดมาทิ้งได้เลย ยกเว้นแอปมีหน้าแรกที่ต้องกดเพื่อเข้าแอป (เช่น ปุ่ม "เข้าสู่ระบบ" ที่พาเข้าแอปทันที) ให้เก็บการกดนั้นไว้ใน SETUP
7. **Setup 3 → Setup 4 → Setup 5** ([หัวข้อ 5–7](#5-setup-3--locators))
8. **รันเทส** — `run-local.bat` เท่านั้น ([หัวข้อ 8](#8-รันเทส))

ข้อ 2–4 ทำครั้งเดียวต่อแอป (ทำใหม่เฉพาะเมื่อหน้า login เปลี่ยน) เมื่อ session หมดอายุ: ทำข้อ 5 ใหม่

`login-locators.ts` ไม่ขึ้น git รหัสที่แปะไว้จึงไม่หลุด แม้จะทำค้างไว้กลางทาง และ `setup-form-auth.bat` จะไม่ยอมรันจนกว่า Setup 2 จะสร้าง `login.setup.ts`

#### Cookies หรือ sessionStorage

Setup 2 จะถามว่าแอปเก็บ login ไว้ที่ไหน:

| เลือก | เมื่อ |
|---|---|
| **cookies / localStorage** | แอปส่วนใหญ่ — **ไม่แน่ใจให้เลือกอันนี้** |
| **sessionStorage** | แอปที่เก็บ login ไว้เฉพาะแท็บเบราว์เซอร์นั้น |

ถ้าเลือกผิด ข้อ 5 จะแจ้งว่า *"Form Login succeeded, but storageState is empty … use saveSessionStorage() instead"* ให้แปะ login ลง `login-locators.ts` ใหม่ (Setup 2 ล้างไปแล้ว) แล้วรัน Setup 2 โดยเลือก **sessionStorage**

ถ้าอยากเช็คก่อน: login แอปในเบราว์เซอร์ปกติ → กด `F12` → แท็บ **Application** →
- **Cookies** มีรายการชื่อคล้าย `session`, `token`, `auth` → cookies
- **Cookies** ว่าง แต่ **Session Storage** มีข้อมูล → sessionStorage

ตัวอย่างที่รู้แล้ว: Nebula (NextAuth) = cookies, WEF Dealer = sessionStorage

รายละเอียดเพิ่ม: [`FORM_LOGIN_SESSION_STORAGE_GUIDE.md`](FORM_LOGIN_SESSION_STORAGE_GUIDE.md)

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

**ขั้นตอน login ใน SETUP:** ดู[เส้นทาง B ข้อ 4](#เส้นทาง-b--login-microsoft-microsoft) (Microsoft) และ[เส้นทาง C ข้อ 6](#เส้นทาง-c--login-แบบฟอร์ม-form) (form)

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
| ตัวอัดขึ้น *Microsoft profile is not ready* | ยังไม่ได้บันทึก login Microsoft | [เส้นทาง B ข้อ 2](#เส้นทาง-b--login-microsoft-microsoft) |
| เทส fail ตั้งแต่ขั้นแรก (หน้า login) | session หมดอายุหรือไม่ได้โหลด | ตั้งค่า login ใหม่ รันผ่าน `run-local.bat` |
| *strict mode violation* | เจอหลาย element — มักเป็นปุ่มอื่นที่ชื่อ*มีคำนั้นอยู่* (เช่น แถวในตารางที่แสดงสถานะเดียวกัน) | จำกัดให้หาในกล่องนั้น (`page.getByRole('dialog').getByRole('button', …)`), ใช้ชื่อตรงทุกตัวอักษร (`{ name: value, exact: true }`) หรือใส่ `.first()` เฉพาะเมื่อทุกตัวที่เจอเป็นปุ่มเดียวกันจริง |
| *Login setup file was not found* | ยังไม่ได้สร้าง `login.setup.ts` | แปะ login ที่อัดได้ใน `_login/login-locators.ts` → Setup 2 |
| *storageState is empty* (form login) | แอปเก็บ login ใน sessionStorage | แปะใหม่ → Setup 2 เลือก **sessionStorage** ([รายละเอียด](#cookies-หรือ-sessionstorage)) |
| Setup 2: *หาช่องรหัสผ่านไม่ได้แน่ชัด* | โค้ดที่แปะมีช่องอื่นปนมา | เหลือไว้เฉพาะบรรทัดของฟอร์ม login ใน `login-locators.ts` |
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

### Setup 2 — Form login

(ใช้ Task เร็วกว่า)

```markdown
### Setup 2 — Form login

Read: #file:prompts/setup-2-form-login.md

**Location**
- Project: <project>
- AccessFlow: <access-flow>
- Session: <cookies | sessionStorage>
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