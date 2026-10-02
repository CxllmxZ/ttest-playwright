#!/usr/bin/env node
// Create-Project (Setup 1) — create project + access flow + module + config in one step
//
// Usage:
//   node scripts/create-project.mjs <Project> <AccessFlow> <Module> <AuthType>
//
// Example:
//   node scripts/create-project.mjs Nebula-Spa No-Auth Bookings none
//
// AuthType: none | microsoft | form
// Exit code: 0 = success, 1 = problem (nothing created)
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
const TEST_LOCAL = path.join(ROOT, 'Test-Local');
const VALID_AUTH = ['none', 'microsoft', 'form'];
const CONVENTION = ['_flows', '_locators', '_scenarios'];

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

function checkName(label, name) {
  if (!name || name.trim() !== name) fail(t(`${label} ว่างหรือมีช่องว่างหน้า/หลัง: "${name}"`, `${label} is empty or has leading/trailing spaces: "${name}"`));
  if (/[<>:"/\\|?*\s]/.test(name)) {
    fail(t(`${label} "${name}" มีตัวอักษรที่ใช้เป็นชื่อโฟลเดอร์ไม่ได้ (ช่องว่าง < > : " / \\ | ? *) → ใช้ - แทน`,
      `${label} "${name}" has characters not allowed in folder names (space < > : " / \\ | ? *) → use - instead`));
  }
  if (name.startsWith('_') || name.startsWith('.')) {
    fail(t(`${label} "${name}" ห้ามขึ้นต้นด้วย _ หรือ . (สงวนไว้สำหรับโฟลเดอร์ของระบบ)`, `${label} "${name}" must not start with _ or . (reserved for framework folders)`));
  }
}

// Same name, different case (Windows treats them as equal, git/Linux do not)
function checkCase(parentDir, name, label) {
  if (!fs.existsSync(parentDir)) return;
  const entries = fs.readdirSync(parentDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  const exact = entries.some((d) => d.name === name);
  const other = entries.find((d) => d.name !== name && d.name.toLowerCase() === name.toLowerCase());
  if (!exact && other) {
    fail(t(`มี ${label} ชื่อ "${other.name}" อยู่แล้ว (ต่างกันแค่ตัวพิมพ์เล็ก-ใหญ่) → ใช้ "${other.name}"`, `${label} "${other.name}" already exists (differs only in letter case) → use "${other.name}"`));
  }
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name);
}

function readAuth(configFile) {
  const buf = fs.readFileSync(configFile);
  let text = buf.toString('utf8').replace(/^\uFEFF/, '');
  if ((buf[0] === 0xff && buf[1] === 0xfe) || /`n/.test(text)) return { broken: true };
  try {
    return { value: JSON.parse(text).authType };
  } catch {
    return { broken: true };
  }
}

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (args.length !== 4) {
    fail(
      t('ต้องระบุ 4 ค่า: <Project> <AccessFlow> <Module> <AuthType>', '4 values required: <Project> <AccessFlow> <Module> <AuthType>') +
        t('\n  ตัวอย่าง: ', '\n  example: ') + 'node scripts/create-project.mjs Nebula-Spa No-Auth Bookings none'
    );
  }
  const [project, access, moduleName, authType] = args;

  if (!VALID_AUTH.includes(authType)) {
    fail(t(`AuthType "${authType}" ไม่ถูกต้อง ต้องเป็น ${VALID_AUTH.join(' / ')} (ตัวพิมพ์เล็ก)`, `AuthType "${authType}" is invalid — must be ${VALID_AUTH.join(' / ')} (lowercase)`));
  }
  checkName('Project', project);
  checkName('AccessFlow', access);
  checkName('Module', moduleName);

  if (!fs.existsSync(TEST_LOCAL)) {
    fail(t(`ไม่พบโฟลเดอร์ ${rel(TEST_LOCAL)} → รันสคริปต์จากใน repo ttest-playwright หรือไม่`, `${rel(TEST_LOCAL)} not found → is this script inside the ttest-playwright repo?`));
  }

  const projectDir = path.join(TEST_LOCAL, project);
  const accessDir = path.join(projectDir, access);
  const moduleDir = path.join(accessDir, moduleName);
  const configFile = path.join(accessDir, 'project.config.json');

  checkCase(TEST_LOCAL, project, 'project');
  checkCase(projectDir, access, 'access flow');
  checkCase(accessDir, moduleName, 'module');

  if (fs.existsSync(moduleDir)) {
    fail(t(`${rel(moduleDir)} มีอยู่แล้ว → ลบเองก่อน หรือใช้ชื่อ module อื่น`, `${rel(moduleDir)} already exists → delete it first or choose another module name`));
  }

  // Decide on config before creating anything (so a stop leaves no half-created folders)
  let configAction = 'create';
  if (fs.existsSync(configFile)) {
    const { value, broken } = readAuth(configFile);
    if (!broken && value === authType) configAction = 'keep';
    else if (!broken && VALID_AUTH.includes(value)) {
      fail(t(
        `access flow "${access}" ใช้ authType "${value}" อยู่แล้ว (1 access flow = 1 แบบ)\n  → ถ้าต้องการ "${authType}" ให้ตั้งชื่อ AccessFlow ใหม่`,
        `access flow "${access}" already uses authType "${value}" (one auth type per access flow)\n  → for "${authType}" use a new AccessFlow name`
      ));
    } else configAction = 'fix';
  }

  const newProject = !fs.existsSync(projectDir);
  const existingProjects = newProject ? listDirs(TEST_LOCAL) : [];
  const newAccess = !fs.existsSync(accessDir);

  for (const sub of CONVENTION) {
    const dir = path.join(moduleDir, sub);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.gitkeep'), '');
  }
  let loginNote = null;
  if (authType === 'form') {
    const scratch = path.join(accessDir, '_login', LOGIN_SCRATCH_NAME);
    const loginSetup = path.join(accessDir, '_login', 'login.setup.ts');
    if (!fs.existsSync(scratch)) {
      fs.mkdirSync(path.dirname(scratch), { recursive: true });
      fs.writeFileSync(scratch, LOGIN_SCRATCH_PLACEHOLDER, { encoding: 'utf8' });
    }
    loginNote = fs.existsSync(loginSetup)
      ? t(`ใช้ ${rel(loginSetup)} เดิม`, `kept existing ${rel(loginSetup)}`)
      : t(
          `เตรียม ${rel(scratch)} → อัด login ด้วย run-codegen แล้วแปะในไฟล์นี้ → Setup 2`,
          `prepared ${rel(scratch)} → record the login with run-codegen, paste it into this file → Setup 2`
        );
  }
  if (configAction !== 'keep') {
    fs.writeFileSync(configFile, JSON.stringify({ authType }, null, 2) + '\n', { encoding: 'utf8' });
  }

  const configNote = {
    create: t(`สร้าง project.config.json (authType: ${authType})`, `created project.config.json (authType: ${authType})`),
    keep: t(`ใช้ project.config.json เดิม (authType: ${authType})`, `kept existing project.config.json (authType: ${authType})`),
    fix: t(`แก้ project.config.json เดิมที่ค่าไม่ถูกต้อง → authType: ${authType}`, `fixed invalid project.config.json → authType: ${authType}`),
  }[configAction];
  const state = (isNew) => (isNew ? t(' (ใหม่)', ' (new)') : t(' (มีอยู่แล้ว)', ' (existing)'));

  console.log(t(`✅ Create-Project สำเร็จ: ${rel(moduleDir)}/`, `✅ Create-Project done: ${rel(moduleDir)}/`));
  console.log(`   project: ${project}${state(newProject)}`);
  if (newProject && existingProjects.length) {
    console.log(t(
      `   ⚠️  โปรเจคที่มีอยู่ก่อนหน้า: ${existingProjects.join(', ')} — ถ้าตั้งใจใช้อันเดิม แปลว่าพิมพ์ชื่อผิด`,
      `   ⚠️  existing projects: ${existingProjects.join(', ')} — if you meant one of these, the name is mistyped`
    ));
  }
  console.log(`   access flow: ${access}${state(newAccess)}`);
  console.log(`   module: ${moduleName}${state(true)} — _flows/ _locators/ _scenarios/`);
  console.log(`   ${configNote}`);
  if (loginNote) console.log(`   ${loginNote}`);
  console.log(t(
    '▶  ถัดไป: อัด codegen แล้วแบ่งลง _flows/<feature>.ts (marker SETUP / PER TEST / DATA)\n          และ _locators/<feature>.ts แล้วใช้ Setup 3',
    '▶  next: record with codegen, split it into _flows/<feature>.ts (SETUP / PER TEST / DATA markers)\n          and _locators/<feature>.ts, then run Setup 3'
  ));
}

try {
  main();
} catch (e) {
  if (e instanceof SetupError) {
    console.error(t('❌ Create-Project หยุดทำงาน — ไม่มีอะไรถูกสร้าง', '❌ Create-Project stopped — nothing was created') + `\n${e.message}`);
    process.exit(1);
  }
  throw e;
}
