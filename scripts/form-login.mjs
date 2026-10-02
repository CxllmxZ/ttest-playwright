#!/usr/bin/env node
// Form-Login (Setup 2) — turn a recorded login (codegen) into _login/login.setup.ts
//
// Usage:
//   node scripts/form-login.mjs <Project> <AccessFlow> [--session-storage]
//
// 1. Record the login with run-codegen.bat → "Record login and test flow"
// 2. Paste the login part into Test-Local/<Project>/<AccessFlow>/_login/login-locators.ts
//    (git-ignored scratch file)
// 3. Run this script. It writes _login/login.setup.ts (username/password become variables)
//    and resets login-locators.ts so the real values do not stay on disk.
//    Then run Authen/Form-Login/setup-form-auth.bat
//
// --session-storage: the app keeps its login in sessionStorage (default: cookies/localStorage)
// Exit code: 0 = success or nothing to do, 1 = problem (nothing written)
// Language: auto from system locale (Thai → th, else en). Override: TTEST_LANG=th | en

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Scratch file for the recorded login (git-ignored). The same text is in
// create-project.mjs and form-login.mjs — each script works on its own.
const LOGIN_SCRATCH_NAME = 'login-locators.ts';
const LOGIN_SCRATCH_PLACEHOLDER = `// @ts-nocheck — scratch file, not type-checked
// Paste the LOGIN part of your recording here (git-ignored — never committed).
//   1. Test-Local/run-codegen.bat → "Record login and test flow" → log in
//   2. Paste the recorded lines below, from page.goto(...) up to the point you are inside the app
//      (including steps like choosing a company or closing a popup)
//   3. VS Code: Run Task → "Setup 2 — Form login"
// Setup 2 writes login.setup.ts (username/password become variables) and resets this file,
// so the real values do not stay on disk.
export {};
`;

function detectLang() {
  const env = (process.env.TTEST_LANG || '').toLowerCase();
  if (env === 'th' || env === 'en') return env;
  const loc = Intl.DateTimeFormat().resolvedOptions().locale || '';
  return loc.toLowerCase().startsWith('th') ? 'th' : 'en';
}
const LANG = detectLang();
const t = (th, en) => (LANG === 'th' ? th : en);

class SetupError extends Error {}
const fail = (msg) => {
  throw new SetupError(msg);
};
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

const PASSWORD_HINT = /pass|pwd|รหัส|type=["']?password/i;
const FILL_RE = /\.fill\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*\)/;
let RAW_HAS_SECRET = false;

function readText(file) {
  const buf = fs.readFileSync(file);
  if ((buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff)) {
    fail(t(
      `${rel(file)} ถูกบันทึกเป็น UTF-16 → เปิดใน VS Code แล้ว "Save with Encoding" → UTF-8`,
      `${rel(file)} is saved as UTF-16 → open it in VS Code → "Save with Encoding" → UTF-8`
    ));
  }
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (/à¸|à¹|\uFFFD/.test(text)) {
    fail(t(`${rel(file)} มีข้อความเพี้ยน → แก้แล้วบันทึกเป็น UTF-8`, `${rel(file)} contains garbled text → fix it and save as UTF-8`));
  }
  return text.replace(/\r\n?/g, '\n');
}

function unescape(s) {
  return s.replace(/\\(.)/g, '$1');
}

// Lines of the recorded test body (or the whole file if there is no test(...) wrapper)
function recordedLines(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /\btest\s*\(.*=>\s*\{\s*$/.test(l));
  let body = lines;
  if (start >= 0) {
    let end = lines.length - 1;
    while (end > start && !/^\s*\}\s*\)\s*;?\s*$/.test(lines[end])) end--;
    body = lines.slice(start + 1, end);
  }
  return body
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//') && !l.startsWith('import ') && !l.startsWith('export '));
}

function convert(lines) {
  const fills = [];
  lines.forEach((line, i) => {
    const m = line.match(FILL_RE);
    if (m) fills.push({ i, target: line.slice(0, m.index), value: unescape(m[2]) });
  });
  if (fills.length === 0) {
    fail(t(
      'ไม่พบการกรอกข้อมูล (.fill) ในโค้ดที่แปะ → แปะส่วนที่อัดตอนกรอกฟอร์ม login',
      'No .fill(...) found in the pasted code → paste the part recorded while filling the login form'
    ));
  }
  RAW_HAS_SECRET = true;

  // Password field: by its locator text, else the 2nd of exactly two fills
  let pw = fills.filter((f) => PASSWORD_HINT.test(f.target));
  let guessed = false;
  if (pw.length === 0 && fills.length === 2) {
    pw = [fills[1]];
    guessed = true;
  }
  if (pw.length !== 1) {
    fail(t(
      `หาช่องรหัสผ่านไม่ได้แน่ชัด (พบ ${pw.length} ช่องที่น่าจะใช่ จาก ${fills.length} ช่อง)\n  → ลบบรรทัดที่ไม่ใช่ฟอร์ม login ออก ให้เหลือแค่ช่อง username กับ password`,
      `Cannot tell which field is the password (${pw.length} candidates among ${fills.length} fields)\n  → remove lines that are not part of the login form, keeping only the username and password fields`
    ));
  }
  const pwFill = pw[0];
  const userFill = fills.find((f) => f !== pwFill && f.i < pwFill.i) || fills.find((f) => f !== pwFill);
  if (!userFill) {
    fail(t('หาช่อง username ไม่เจอ (มีแค่ช่องรหัสผ่าน)', 'Cannot find the username field (only a password field was found)'));
  }

  const others = fills.filter((f) => f !== pwFill && f !== userFill);
  const fillTargets = new Set([userFill.target, pwFill.target]);

  const out = [];
  lines.forEach((line, i) => {
    // codegen records a click right before each fill — drop it
    const next = lines[i + 1] || '';
    const clickTarget = line.replace(/\.click\(\)\s*;?$/, '');
    if (line !== clickTarget && next.startsWith(clickTarget) && FILL_RE.test(next)) return;

    if (i === userFill.i) out.push(line.replace(FILL_RE, '.fill(username)'));
    else if (i === pwFill.i) out.push(line.replace(FILL_RE, '.fill(password)'));
    else out.push(line);
  });

  // The real password must not survive anywhere else
  const literal = (v) => [`'${v}'`, `"${v}"`, `\`${v}\``];
  if (out.some((l) => literal(pwFill.value).some((q) => l.includes(q)))) {
    fail(t(
      'รหัสผ่านจริงยังปรากฏในบรรทัดอื่น → ลบบรรทัดนั้นออกแล้วรันใหม่',
      'The real password still appears on another line → remove that line and run again'
    ));
  }

  return { out, userFill, pwFill, others, guessed, fillTargets };
}

function render(out, sessionStorage) {
  const save = sessionStorage ? 'saveSessionStorage' : 'saveStorageState';
  const body = out.map((l) => '  ' + l).join('\n');
  return `// Generated by scripts/form-login.mjs from a codegen recording — run by Authen/Form-Login/setup-form-auth.bat
// Credentials come from environment variables set by that script; never write them here.
import { test as setup, expect } from '@playwright/test';
import { getFormLoginCredentials, ${save} } from '../../../../Authen/Form-Login/form-auth.helper';

setup('Create form login session', async ({ page }) => {
  const { username, password, sessionStoragePath } = getFormLoginCredentials();

${body}

  // Logged in: no longer on a login page (on failure the error shows the URL it stayed on)
  await expect(page).not.toHaveURL(/login|signin|sign-in/i);

  await ${save}({ page, outputPath: sessionStoragePath });
});
`;
}

function alreadyDone(loginFile) {
  console.log(t(
    `✅ ${rel(loginFile)} พร้อมใช้แล้ว — ไม่ต้องทำอะไร (ถ้าหน้า login เปลี่ยน ให้อัดใหม่แล้วแปะใน ${LOGIN_SCRATCH_NAME})\n▶  ถัดไป: Authen\\Form-Login\\setup-form-auth.bat`,
    `✅ ${rel(loginFile)} is ready — nothing to do (if the login page changes, record again and paste into ${LOGIN_SCRATCH_NAME})\n▶  next: Authen\\Form-Login\\setup-form-auth.bat`
  ));
}

function main() {
  const args = process.argv.slice(2);
  const sessionStorage = args.includes('--session-storage');
  const pos = args.filter((a) => a && !a.startsWith('--'));
  if (pos.length !== 2) {
    fail(
      t('ต้องระบุ 2 ค่า: <Project> <AccessFlow>', '2 values required: <Project> <AccessFlow>') +
        t('\n  ตัวอย่าง: ', '\n  example: ') + 'node scripts/form-login.mjs Nebula-Spa Admin-Login'
    );
  }
  const [project, access] = pos;
  const accessDir = path.join(ROOT, 'Test-Local', project, access);
  const configFile = path.join(accessDir, 'project.config.json');
  const loginFile = path.join(accessDir, '_login', 'login.setup.ts');
  const scratch = path.join(accessDir, '_login', LOGIN_SCRATCH_NAME);
  const converted = fs.existsSync(loginFile) && readText(loginFile).includes('getFormLoginCredentials(');

  if (!fs.existsSync(scratch)) {
    fs.mkdirSync(path.dirname(scratch), { recursive: true });
    fs.writeFileSync(scratch, LOGIN_SCRATCH_PLACEHOLDER, { encoding: 'utf8' });
    if (converted) return alreadyDone(loginFile);
    fail(t(
      `สร้าง ${rel(scratch)} ให้แล้ว → แปะโค้ด login ที่อัดด้วย run-codegen.bat ("Record login and test flow") แล้วรัน Setup 2 อีกครั้ง`,
      `created ${rel(scratch)} → paste the login recorded by run-codegen.bat ("Record login and test flow") and run Setup 2 again`
    ));
  }

  const lines = recordedLines(readText(scratch));
  if (!lines.some((l) => l.includes('page.'))) {
    if (converted) return alreadyDone(loginFile);
    fail(t(
      `${rel(scratch)} ยังว่าง → แปะโค้ด login ที่อัดด้วย run-codegen.bat ("Record login and test flow")`,
      `${rel(scratch)} is empty → paste the login recorded by run-codegen.bat ("Record login and test flow")`
    ));
  }
  const { out, userFill, pwFill, others, guessed } = convert(lines);

  fs.writeFileSync(loginFile, render(out, sessionStorage), { encoding: 'utf8' });
  fs.writeFileSync(scratch, LOGIN_SCRATCH_PLACEHOLDER, { encoding: 'utf8' });
  RAW_HAS_SECRET = false;

  const field = (f) => f.target.replace(/^await\s+/, '');
  console.log(t(`✅ Setup 2 สำเร็จ: ${rel(loginFile)}`, `✅ Setup 2 done: ${rel(loginFile)}`));
  console.log(`   username → ${field(userFill)}`);
  console.log(`   password → ${field(pwFill)}${guessed ? t('  (เดาจากลำดับ — ตรวจให้ถูก)', '  (guessed from order — please check)') : ''}`);
  console.log(t(
    `   บันทึก session แบบ: ${sessionStorage ? 'sessionStorage' : 'cookies / localStorage'}`,
    `   session saved as: ${sessionStorage ? 'sessionStorage' : 'cookies / localStorage'}`
  ));
  console.log(t(
    `   ล้าง ${rel(scratch)} แล้ว — ค่า username / password จริงไม่เหลือในเครื่อง`,
    `   reset ${rel(scratch)} — the real username / password are no longer on disk`
  ));
  for (const o of others) {
    console.log(t(
      `   ⚠️  ช่องอื่นที่กรอกค่าตายตัวไว้: ${field(o)} = "${o.value}" — ถ้าเป็นข้อมูลลับ ให้ลบ`,
      `   ⚠️  another field keeps a fixed value: ${field(o)} = "${o.value}" — remove it if it is secret`
    ));
  }
  console.log(t('▶  ถัดไป: Authen\\Form-Login\\setup-form-auth.bat', '▶  next: Authen\\Form-Login\\setup-form-auth.bat'));
}

try {
  main();
} catch (e) {
  if (e instanceof SetupError) {
    console.error(t('❌ Setup 2 หยุดทำงาน — ไม่ได้แก้ไฟล์', '❌ Setup 2 stopped — the file was not changed') + `\n${e.message}`);
    if (RAW_HAS_SECRET) {
      console.error(t(
        `⚠️  ${LOGIN_SCRATCH_NAME} ยังมีรหัสผ่านจริงที่แปะไว้ (ไม่ขึ้น git) — แก้แล้วรันใหม่ หรือลบเนื้อหาออกถ้าเลิกทำ`,
        `⚠️  ${LOGIN_SCRATCH_NAME} still holds the pasted real password (git-ignored) — fix and rerun, or clear it if you stop here`
      ));
    }
    process.exit(1);
  }
  throw e;
}
