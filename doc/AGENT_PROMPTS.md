# Agent Prompts — สำหรับ QA

รายละเอียดของ framework: `AGENTS.md`

---

## ใช้ Setup ไหน?

| สถานการณ์ | Setup | วิธีที่เร็วที่สุด |
|---|---|---|
| โปรเจคใหม่ / access flow ใหม่ / module ใหม่ | **1** | ⚡ Task |
| dev วาง codegen ใน `_locators/` แล้ว | **3** | prompt |
| มี scenario ใหม่ (ครั้งแรก หรือเพิ่มจากของเดิม) | **4** แล้วตามด้วย 5 หรือ 7 | prompt |
| มีครบ `_flows/` + `_locators/` + `_scenarios/` → สร้างเทส | **5** | ⚡ Task |
| เทสแจ้ง "unknown locator type" หรือ "Unknown action" | **6** | prompt |
| แก้/ลบ scenario เดิม → แก้ CSV ใน **VS Code** (ห้ามใช้ Excel) แล้วใช้ | **7** | ⚡ Task |
| dev แก้ `_locators/` ของ feature ที่มีอยู่แล้ว | **7** | ⚡ Task |

ลำดับปกติ: 1 (ครั้งเดียวต่อ module) แล้ว 3 → 4 → 5 (ทุก feature)

ไม่มี Setup 2 (รวมเข้ากับ Setup 1 แล้ว)

---

## ⚡ วิธีที่ 1 — VS Code Task (Setup 1, 5, 7)

เร็วที่สุด ไม่ต้องผ่าน AI

1. `Ctrl+Shift+P` → พิมพ์ **Run Task** → Enter
2. เลือก Setup ที่ต้องการ
3. กรอกค่าในกล่องที่ขึ้นมาทีละช่อง (AuthType เลือกจากรายการ)
4. ดูผลใน terminal — ✅ = สำเร็จ, ❌ = ข้อความบอกว่าต้องแก้อะไร

ต้องเปิดโฟลเดอร์ `ttest-playwright` เป็น workspace (ไม่ใช่โฟลเดอร์ที่อยู่สูงกว่า)

---

## 💬 วิธีที่ 2 — แปะ prompt ใน Copilot Chat

ใช้กับ Setup 3, 4, 6 เสมอ และใช้กับ Setup 1, 5, 7 ได้ถ้าไม่สะดวกใช้ Task

- ใช้ **Agent mode**
- แปะแค่ template อย่าแปะไฟล์กฎ (`prompts/...`) เอง
- บรรทัด `Read: #file:...` ต้องอยู่ครบ ห้ามลบ
- Setup 1, 5, 7: Copilot จะขออนุญาตรันคำสั่ง `node scripts/...` → กดอนุญาต (ปกติ)

### Setup 1 — Create-Project
```markdown
### Setup 1 — Create-Project

Read: #file:prompts/setup-1-create-project.md

**Location**
- Project: <project-name>
- AccessFlow: <access-flow>
- Module: <module>
- AuthType: <none | microsoft | form>
```

`AuthType`: `none` = ไม่ต้อง login, `microsoft` = login ด้วย Microsoft, `form` = login ด้วย email/password

ชื่อห้ามมีช่องว่าง ใช้ `-` แทน · โปรเจค/access flow ที่มีอยู่แล้วจะถูกใช้ต่อ ไม่สร้างซ้ำ

### Setup 3 — Bootstrap locators
```markdown
### Setup 3 — Bootstrap locators

Read: #file:prompts/setup-3-modify-locators.md

**Location**
- Project: <project-name>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

### Setup 4 — Create scenarios
```markdown
### Setup 4 — Create scenarios

Read: #file:prompts/setup-4-create-scenarios.md

**Location**
- Project: <project-name>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>

**Scenarios**
<scenario name 1> : <value 1>
<scenario name 2> : <value 2>
```

- แปะเฉพาะ scenario **ใหม่** — ถ้ามี CSV อยู่แล้ว ระบบจะเพิ่มต่อท้าย ไม่แตะของเดิม (ชื่อซ้ำจะถูกข้าม)
- จำนวนค่าต้องเท่าจำนวน locator (5 locator = comma 4 ตัว) ช่องที่ไม่ใช้ปล่อยว่าง
- ช่องปุ่มแบบเลือกชื่อ ใส่ชื่อปุ่ม ไม่ใช่ `|click` · ชื่อปุ่มที่มี comma ให้ใส่แค่ส่วนที่ไม่ซ้ำ

### Setup 5 — Create feature
```markdown
### Setup 5 — Create feature

Read: #file:prompts/setup-5-create-features.md

**Location**
- Project: <project-name>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

### Setup 6 — Extend action
```markdown
### Setup 6 — Extend action

Read: #file:prompts/setup-6-extend-action.md

**Location**
- Project: <project-name>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>

**Extension**
<error ที่เจอ หรืออธิบายสิ่งที่ต้องการ เช่น "|download: กดปุ่มแล้วรอไฟล์ดาวน์โหลด">
```

ไม่ต้องเขียนโค้ด — AI ออกแบบให้ แล้วแสดงโค้ดที่เพิ่มให้ดู · มีผลเฉพาะ feature นี้ · เสร็จแล้วใส่ action ใน CSV → Run Task Setup 7

### Setup 7 — Update TCs
```markdown
### Setup 7 — Update TCs

Read: #file:prompts/setup-7-update-tcs.md

**Location**
- Project: <project-name>
- AccessFlow: <access-flow>
- Module: <module>
- Feature: <feature>
```

ถ้ารายงานว่ามี TC "หายไปจากเดิม" ให้เช็คว่าตั้งใจลบจริง

---

## Changelog

- 2026-09-28 (v10) — Rewritten for QA (Thai). Setup 1 + 2 merged into Setup 1 Create-Project (AuthType required); Setup 2 removed. VS Code Tasks for Setup 1/5/7. Setup 5/7 run `scripts/setup-5.mjs` (no Overrides). Setup 4 appends; editing existing rows is done in VS Code. Removed sections duplicated in AGENTS.md. Moved to `doc/`.
- 2026-09-20 (v9) — 7 setups (dropped verify-helpers).
- 2026-09-20 (v8) — Renamed cases to `setup-N-*`.
- 2026-09-20 (v5–v7) — Minimal prompt + rules file; value-based model.
- 2026-09-19 (v1) — Case 1 finalized.