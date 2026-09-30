#!/usr/bin/env node
// Create-Project — สร้าง project + access flow + module + config ในครั้งเดียว (รวม Setup 1 + 2 เดิม)
//
// Usage:
//   node scripts/create-project.mjs <Project> <AccessFlow> <Module> <AuthType>
//
// Example:
//   node scripts/create-project.mjs Nebula-Spa No-Auth Bookings none
//
// AuthType: none | microsoft | form
// Exit code: 0 = สำเร็จ, 1 = มีปัญหา (ไม่มีอะไรถูกสร้าง)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST_LOCAL = path.join(ROOT, 'Test-Local');
const VALID_AUTH = ['none', 'microsoft', 'form'];
const CONVENTION = ['_flows', '_locators', '_scenarios'];

class SetupError extends Error {}
const fail = (msg) => {
  throw new SetupError(msg);
};
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function checkName(label, name) {
  if (!name || name.trim() !== name) fail(`${label} ว่างหรือมีช่องว่างหน้า/หลัง: "${name}"`);
  if (/[<>:"/\\|?*\s]/.test(name)) {
    fail(`${label} "${name}" มีตัวอักษรที่ใช้เป็นชื่อโฟลเดอร์ไม่ได้ (ช่องว่าง < > : " / \\ | ? *) → ใช้ - แทน`);
  }
  if (name.startsWith('_') || name.startsWith('.')) {
    fail(`${label} "${name}" ห้ามขึ้นต้นด้วย _ หรือ . (สงวนไว้สำหรับโฟลเดอร์ของระบบ)`);
  }
}

// โฟลเดอร์ที่ชื่อเหมือนกันแต่ตัวพิมพ์ต่างกัน (Windows มองว่าเป็นอันเดียวกัน แต่ git/Linux ไม่ใช่)
function checkCase(parentDir, name, label) {
  if (!fs.existsSync(parentDir)) return;
  const entries = fs.readdirSync(parentDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  const exact = entries.some((d) => d.name === name);
  const other = entries.find((d) => d.name !== name && d.name.toLowerCase() === name.toLowerCase());
  if (!exact && other) {
    fail(`มี ${label} ชื่อ "${other.name}" อยู่แล้ว (ต่างกันแค่ตัวพิมพ์เล็ก-ใหญ่) → ใช้ "${other.name}"`);
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
      'ต้องระบุ 4 ค่า: <Project> <AccessFlow> <Module> <AuthType>\n' +
        '  ตัวอย่าง: node scripts/create-project.mjs Nebula-Spa No-Auth Bookings none'
    );
  }
  const [project, access, moduleName, authType] = args;

  if (!VALID_AUTH.includes(authType)) {
    fail(`AuthType "${authType}" ไม่ถูกต้อง ต้องเป็น ${VALID_AUTH.join(' / ')} (ตัวพิมพ์เล็ก)`);
  }
  checkName('Project', project);
  checkName('AccessFlow', access);
  checkName('Module', moduleName);

  if (!fs.existsSync(TEST_LOCAL)) {
    fail(`ไม่พบโฟลเดอร์ ${rel(TEST_LOCAL)} → รันสคริปต์จากใน repo ttest-playwright หรือไม่`);
  }

  const projectDir = path.join(TEST_LOCAL, project);
  const accessDir = path.join(projectDir, access);
  const moduleDir = path.join(accessDir, moduleName);
  const configFile = path.join(accessDir, 'project.config.json');

  checkCase(TEST_LOCAL, project, 'project');
  checkCase(projectDir, access, 'access flow');
  checkCase(accessDir, moduleName, 'module');

  if (fs.existsSync(moduleDir)) {
    fail(`${rel(moduleDir)} มีอยู่แล้ว → ลบเองก่อน หรือใช้ชื่อ module อื่น`);
  }

  // config: ตัดสินใจก่อนสร้างอะไรทั้งนั้น (ถ้าต้องหยุด จะได้ไม่มีโฟลเดอร์ค้าง)
  let configAction = 'create';
  if (fs.existsSync(configFile)) {
    const { value, broken } = readAuth(configFile);
    if (!broken && value === authType) configAction = 'keep';
    else if (!broken && VALID_AUTH.includes(value)) {
      fail(
        `access flow "${access}" ใช้ authType "${value}" อยู่แล้ว (1 access flow = 1 แบบ)\n` +
          `  → ถ้าต้องการ "${authType}" ให้ตั้งชื่อ AccessFlow ใหม่`
      );
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
  if (configAction !== 'keep') {
    fs.writeFileSync(configFile, JSON.stringify({ authType }, null, 2) + '\n', { encoding: 'utf8' });
  }

  const configNote = {
    create: `สร้าง project.config.json (authType: ${authType})`,
    keep: `ใช้ project.config.json เดิม (authType: ${authType})`,
    fix: `แก้ project.config.json เดิมที่ค่าไม่ถูกต้อง → authType: ${authType}`,
  }[configAction];

  console.log(`✅ Create-Project สำเร็จ: ${rel(moduleDir)}/`);
  console.log(`   project: ${project}${newProject ? ' (ใหม่)' : ' (มีอยู่แล้ว)'}`);
  if (newProject && existingProjects.length) {
    console.log(`   ⚠️  โปรเจคที่มีอยู่ก่อนหน้า: ${existingProjects.join(', ')} — ถ้าตั้งใจใช้อันเดิม แปลว่าพิมพ์ชื่อผิด`);
  }
  console.log(`   access flow: ${access}${newAccess ? ' (ใหม่)' : ' (มีอยู่แล้ว)'}`);
  console.log(`   module: ${moduleName} (ใหม่) — _flows/ _locators/ _scenarios/`);
  console.log(`   ${configNote}`);
  console.log('▶  ถัดไป: dev วาง codegen ใน _flows/<feature>.ts (มี marker SETUP / PER TEST / DATA)');
  console.log('          และ _locators/<feature>.ts แล้วใช้ Setup 3');
}

try {
  main();
} catch (e) {
  if (e instanceof SetupError) {
    console.error(`❌ Create-Project หยุดทำงาน — ไม่มีอะไรถูกสร้าง\n${e.message}`);
    process.exit(1);
  }
  throw e;
}
