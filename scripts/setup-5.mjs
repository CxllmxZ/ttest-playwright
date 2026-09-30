#!/usr/bin/env node
// Setup 5 — สร้าง 4 ไฟล์ของ feature (types / helper / spec / data) แบบไม่ใช้ AI
//
// Usage:
//   node scripts/setup-5.mjs <Project> <AccessFlow> <Module> <feature> [--dry-run]
//   node scripts/setup-5.mjs <Project> <AccessFlow> <Module> <feature> --data-only   (Setup 7)
//
// --data-only: feature มีอยู่แล้ว → เขียนใหม่เฉพาะ <feature>.data.ts จาก CSV
//              action ที่ยอมรับ = case ใน helper.ts ของ feature (รวมที่ Setup 6 เพิ่ม)
//
// Example:
//   node scripts/setup-5.mjs Nebula-Spa No-Auth Bookings bookings
//
// Source of truth:
//   _flows/<feature>.ts      -> spec.ts  (ก๊อปตรงตัวตาม marker)
//   _locators/<feature>.ts   -> helper.ts (import ตอนรัน) + จำนวนช่อง N
//   _scenarios/<feature>.csv -> data.ts  (แต่ละแถวต้องมีค่า N ตัว)
//
// Exit code: 0 = สำเร็จ, 1 = มีปัญหา (ไม่มีไฟล์ใดถูกเขียน)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALID_AUTH = ['none', 'microsoft', 'form'];
const ACTIONS = ['click'];
let LABEL = 'Setup 5';

class SetupError extends Error {}
const fail = (msg) => {
  throw new SetupError(msg);
};

// ---------------------------------------------------------------- utils

function toPascal(s) {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
}

function toCamel(s) {
  const p = toPascal(s);
  return p[0].toLowerCase() + p.slice(1);
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function readText(file) {
  const buf = fs.readFileSync(file);
  if (
    (buf[0] === 0xff && buf[1] === 0xfe) ||
    (buf[0] === 0xfe && buf[1] === 0xff)
  ) {
    fail(
      `${rel(file)} ถูกบันทึกเป็น UTF-16 (มักเกิดจาก PowerShell)\n` +
        `  → เปิดใน VS Code แล้วเลือก "Save with Encoding" → UTF-8`
    );
  }
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (/à¸|à¹/.test(text)) {
    fail(
      `${rel(file)} มีภาษาไทยเพี้ยน (เช่น "à¸...")\n` +
        `  → ไฟล์นี้เสียจากขั้นก่อนหน้า ต้องแก้ข้อความไทยให้ถูกก่อน แล้วบันทึกเป็น UTF-8`
    );
  }
  if (text.includes('\uFFFD')) {
    fail(
      `${rel(file)} มีตัวอักษร � (ภาษาไทยเสีย — มักเกิดจากบันทึกด้วย Excel)\n` +
        '  → ถ้าใช้ Excel ให้ Save As แบบ "CSV UTF-8" หรือเปิดแก้ใน VS Code แทน'
    );
  }
  if (/`n/.test(text)) {
    fail(
      `${rel(file)} มีตัวอักษร \`n หลุดเข้ามา (เศษจาก PowerShell)\n` +
        '  → แก้ให้เป็นการขึ้นบรรทัดจริง'
    );
  }
  return text.replace(/\r\n?/g, '\n');
}

function trimBlankEdges(lines) {
  let a = 0;
  let b = lines.length;
  while (a < b && lines[a].trim() === '') a++;
  while (b > a && lines[b - 1].trim() === '') b--;
  return lines.slice(a, b);
}

function reindent(lines, indent) {
  const body = trimBlankEdges(lines);
  const widths = body
    .filter((l) => l.trim() !== '')
    .map((l) => l.match(/^\s*/)[0].length);
  const min = widths.length ? Math.min(...widths) : 0;
  return body.map((l) => (l.trim() === '' ? '' : indent + l.slice(min)));
}

function jsStr(s) {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

// ------------------------------------------------------------- scanners

// แยก array body ออกเป็น entries ระดับบนสุด (รู้จัก string และ comment)
function splitTopLevel(src, startIdx) {
  const entries = [];
  let depth = 0;
  let cur = '';
  let i = startIdx;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      i = src.indexOf('*/', i + 2);
      if (i === -1) fail('_locators มี comment /* ที่ไม่ได้ปิด');
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\') j++;
        j++;
      }
      cur += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0 && ch === ']') {
        entries.push(cur);
        return entries.map((e) => e.trim()).filter(Boolean);
      }
      depth--;
    }
    if (ch === ',' && depth === 0) {
      entries.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
    i++;
  }
  fail('_locators: หา "]" ปิด array ไม่เจอ');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (q) fail('_scenarios: มีเครื่องหมาย " ที่เปิดแล้วไม่ได้ปิด');
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows
    .map((cells, idx) => ({ cells, line: idx + 1 }))
    .filter((r) => r.cells.some((c) => c.trim() !== ''));
}

// --------------------------------------------------------------- readers

function readFlows(file) {
  const text = readText(file);
  const lines = text.split('\n');
  const find = (marker) => {
    const idx = lines
      .map((l, i) => (l.trim() === marker ? i : -1))
      .filter((i) => i >= 0);
    if (idx.length === 0) fail(`${rel(file)} ไม่มีบรรทัด ${marker}`);
    if (idx.length > 1) fail(`${rel(file)} มี ${marker} ซ้ำ ${idx.length} ครั้ง`);
    return idx[0];
  };
  const iS = find('// === SETUP ===');
  const iP = find('// === PER TEST ===');
  const iD = find('// === DATA ===');
  if (!(iS < iP && iP < iD)) {
    fail(`${rel(file)} ลำดับ marker ผิด ต้องเป็น SETUP → PER TEST → DATA`);
  }

  let post = lines.slice(iD + 1);
  const wrapped = /\btest\s*\(/.test(lines.slice(0, iS).join('\n'));
  if (wrapped) {
    let k = post.length - 1;
    while (k >= 0 && post[k].trim() === '') k--;
    if (k < 0 || !/^\s*\}\s*\)\s*;?\s*$/.test(post[k])) {
      fail(`${rel(file)} หา "});" ปิดท้าย test(...) ไม่เจอ`);
    }
    post = post.slice(0, k);
  }

  const setup = lines.slice(iS + 1, iP);
  const pre = lines.slice(iP + 1, iD);
  const goto = setup.join('\n').match(/page\.goto\(\s*(['"`])(.*?)\1/);
  return {
    setup,
    pre,
    post,
    gotoUrl: goto ? goto[2] : null,
    usesWaitForLoading: /waitForLoading\s*\(/.test(text),
  };
}

function readLocators(file, exportName) {
  const text = readText(file);
  const re = new RegExp(
    `export\\s+const\\s+${exportName}\\s*:\\s*([\\s\\S]+?)=\\s*\\[`
  );
  const m = text.match(re);
  if (!m) {
    const found = [...text.matchAll(/export\s+const\s+(\w+)/g)].map((x) => x[1]);
    fail(
      `${rel(file)} ไม่มี export ชื่อ ${exportName}` +
        (found.length ? ` (เจอ: ${found.join(', ')})` : '')
    );
  }
  const typeText = m[1].replace(/\s+/g, '');
  const entries = splitTopLevel(text, m.index + m[0].length);
  if (entries.length === 0) fail(`${rel(file)} array ว่าง ไม่มี locator`);

  const locators = entries.map((src, i) => {
    let params;
    const paren = src.match(/^\(([^)]*)\)\s*=>/);
    if (paren) params = paren[1].split(',').map((p) => p.trim()).filter(Boolean);
    else if (/^\w+\s*=>/.test(src)) params = [src.match(/^(\w+)/)[1]];
    else fail(`${rel(file)} locator [${i}] ไม่ใช่ arrow function: ${src.slice(0, 60)}`);
    if (params.some((p) => p.includes('='))) {
      fail(
        `${rel(file)} locator [${i}] มีค่า default ใน parameter\n` +
          '  → parametric ต้องเป็น (page, value) => ... ห้ามมี value = ...'
      );
    }
    if (params.length < 1 || params.length > 2) {
      fail(`${rel(file)} locator [${i}] ต้องรับ 1 หรือ 2 parameter`);
    }
    const parametric = params.length === 2;
    let kind = 'other';
    if (parametric) kind = 'parametric';
    else if (/getByRole\(\s*['"]textbox['"]/.test(src)) kind = 'textbox';
    else if (/getByRole\(\s*['"]combobox['"]/.test(src) || src.includes('ng-select')) {
      kind = 'combobox';
    }
    return { index: i, parametric, kind, src };
  });

  const hasParam = locators.some((l) => l.parametric);
  const newType = 'Array<(page:Page,value?:string)=>Locator>';
  const oldType = 'Array<(page:Page)=>Locator>';
  if (typeText !== newType && typeText !== oldType) {
    fail(`${rel(file)} type ของ array ไม่ถูกต้อง ต้องเป็น Array<(page: Page, value?: string) => Locator>`);
  }
  if (hasParam && typeText === oldType) {
    fail(
      `${rel(file)} มี parametric locator แต่ type ยังเป็นแบบเก่า\n` +
        '  → เปลี่ยนเป็น Array<(page: Page, value?: string) => Locator>'
    );
  }
  return locators;
}

function readScenarios(file, locators, { actions = ACTIONS, checkKinds = true } = {}) {
  const rows = parseCsv(readText(file));
  if (rows.length === 0) fail(`${rel(file)} ว่างเปล่า`);
  const header = rows[0].cells.map((c) => c.trim().toLowerCase());
  const expected = ['tc-id', 'module', 'feature', 'scenario', 'value'];
  if (header.join(',') !== expected.join(',')) {
    fail(`${rel(file)} หัวตารางต้องเป็น: TC-ID,Module,Feature,Scenario,Value`);
  }

  const N = locators.length;
  const errors = [];
  const seen = new Set();
  const cases = [];

  for (const { cells, line } of rows.slice(1)) {
    if (cells.length !== 5) {
      errors.push(
        `บรรทัด ${line}: มี ${cells.length} คอลัมน์ ต้องมี 5` +
          (cells.length > 5 ? ' — Value มี comma แต่ไม่ได้ครอบด้วย "..."' : '')
      );
      continue;
    }
    const [id, , , scenario, raw] = cells.map((c) => c.trim());
    if (!id) {
      errors.push(`บรรทัด ${line}: ไม่มี TC-ID`);
      continue;
    }
    if (seen.has(id)) errors.push(`${id}: TC-ID ซ้ำ`);
    seen.add(id);

    const values = raw.split(',').map((v) => v.trim());
    if (values.length !== N) {
      const diff = N - values.length;
      errors.push(
        `${id}: มี ${values.length} ค่า แต่ต้องมี ${N} ค่า (ตามจำนวน locator) → ` +
          (diff > 0 ? `ขาด ${diff} ช่อง (เติม comma ท้าย)` : `เกิน ${-diff} ช่อง`)
      );
      continue;
    }
    values.forEach((v, i) => {
      if (v === '') return;
      const loc = locators[i];
      if (v.startsWith('|')) {
        const action = v.slice(1);
        if (!actions.includes(action)) {
          errors.push(`${id} ช่อง ${i + 1}: ไม่รู้จัก action "${v}" (รองรับ: ${actions.map((a) => '|' + a).join(', ')}) → ถ้าต้องการ action ใหม่ใช้ Setup 6`);
        } else if (loc.parametric) {
          errors.push(`${id} ช่อง ${i + 1}: ช่องนี้เป็นปุ่มแบบเลือกชื่อ ต้องใส่ชื่อปุ่ม ไม่ใช่ ${v}`);
        }
      } else if (checkKinds && !loc.parametric && loc.kind === 'other') {
        errors.push(`${id} ช่อง ${i + 1}: ช่องนี้กรอกข้อความไม่ได้ (ไม่ใช่ textbox/combobox) → ใช้ |click หรือเว้นว่าง`);
      }
    });
    cases.push({ id, scenario, values });
  }

  if (errors.length) {
    fail(`${rel(file)} มีปัญหา ${errors.length} จุด:\n  - ` + errors.join('\n  - '));
  }
  if (cases.length === 0) fail(`${rel(file)} ไม่มีแถวข้อมูล`);
  return cases;
}

// ------------------------------------------------------------ templates

function genTypes(P) {
  return `export interface ${P}TestCase {
  testCaseId: string;
  scenario: string;
  values: string[];
}
`;
}

function genHelper(P, c, feature) {
  return `// Generated by scripts/setup-5.mjs — extend via Setup 6.
import type { Locator, Page } from '@playwright/test';
import type { ${P}TestCase } from './${feature}.types';
import { ${c}Locators } from '../_locators/${feature}';

// Accepts both static-only and parametric locator arrays.
const locators: ReadonlyArray<(page: Page, value?: string) => Locator> = ${c}Locators;

async function applyItem(page: Page, index: number, item: string): Promise<void> {
  const locatorFn = locators[index];
  if (!locatorFn) {
    throw new Error(\`No locator at index \${index}\`);
  }

  // Action marker (currently supported: |click)
  if (item.startsWith('|')) {
    const action = item.slice(1);
    switch (action) {
      case 'click': {
        if (locatorFn.length === 2) {
          throw new Error(
            \`Locator at index \${index} is parametric — CSV must give a button name, not |click\`
          );
        }
        await locatorFn(page).click();
        return;
      }
      default:
        throw new Error(\`Unknown action: |\${action}\`);
    }
  }

  // Parametric locator: value = name of the element to click
  if (locatorFn.length === 2) {
    await locatorFn(page, item).click();
    return;
  }

  // Static locator + text: dispatch by locator type
  const target = locatorFn(page);
  const locatorCode = locatorFn.toString();

  if (/getByRole\\(\\s*['"]textbox['"]/.test(locatorCode)) {
    await target.fill(item);
  } else if (/getByRole\\(\\s*['"]combobox['"]/.test(locatorCode) || locatorCode.includes('ng-select')) {
    await target.click();
    await page.getByRole('option', { name: item }).click();
  } else {
    throw new Error(
      \`Cannot dispatch text value at index \${index} — unknown locator type. Locator: \${locatorCode}\`
    );
  }
}

export async function apply${P}Inputs(page: Page, testData: ${P}TestCase): Promise<void> {
  if (testData.values.length !== locators.length) {
    throw new Error(
      \`\${testData.testCaseId}: \${testData.values.length} values, expected \${locators.length}\`
    );
  }
  for (let i = 0; i < testData.values.length; i++) {
    const item = testData.values[i];
    if (item === '') continue;
    await applyItem(page, i, item);
  }
}
`;
}

function genSpec(P, c, feature, flows) {
  const setup = reindent(flows.setup, '  ');
  const pre = reindent(flows.pre, '      ');
  const post = reindent(flows.post, '      ');

  let urlCheck = '';
  if (flows.gotoUrl) {
    try {
      const origin = new URL(flows.gotoUrl).origin;
      urlCheck = `  await expect(page).toHaveURL(/^${escapeRegex(origin)}/, { timeout: 10_000 });\n`;
    } catch {
      /* relative URL — skip URL check */
    }
  }

  const waitFn = flows.usesWaitForLoading
    ? `
async function waitForLoading(page: Page): Promise<void> {
  const loadingBackdrop = page.locator('.loading-backdrop');
  if (await loadingBackdrop.count()) {
    await expect(loadingBackdrop).toBeHidden({ timeout: 30_000 });
  }
}
`
    : '';

  const block = (lines) => (lines.length ? lines.join('\n') + '\n' : '');

  return `// Generated by scripts/setup-5.mjs from _flows/${feature}.ts — regenerate instead of editing flow steps.
import { test, expect, type Page } from '@playwright/test';
import { ${c}TestCases } from './${feature}.data';
import { apply${P}Inputs } from './${feature}.helper';
${waitFn}
async function enter${P}Page(page: Page): Promise<void> {
${block(setup)}}

async function defaultVerify(page: Page): Promise<void> {
  const errorDialog = page
    .locator('[role="dialog"], .modal, .swal2-popup')
    .filter({ hasText: /error|ผิดพลาด|ข้อผิดพลาด/i });
  await expect(errorDialog).toHaveCount(0, { timeout: 10_000 });
${urlCheck}}

test.describe('${P}', () => {
  test.beforeEach(async ({ page }) => {
    await enter${P}Page(page);
  });

  for (const testData of ${c}TestCases) {
    test(\`\${testData.testCaseId} - \${testData.scenario}\`, async ({ page }) => {
${block(pre)}      // === DATA ===
      await apply${P}Inputs(page, testData);
${block(post)}
      await defaultVerify(page);
    });
  }
});
`;
}

function genData(P, c, feature, cases) {
  const rows = cases.map(({ id, scenario, values }) => {
    const chunks = [];
    for (let i = 0; i < values.length; i += 6) {
      chunks.push('      ' + values.slice(i, i + 6).map(jsStr).join(', ') + ',');
    }
    return `  {
    testCaseId: ${jsStr(id)},
    scenario: ${jsStr(scenario)},
    values: [
${chunks.join('\n')}
    ],
  },`;
  });
  return `// Generated by scripts/setup-5.mjs from _scenarios/${feature}.csv
import type { ${P}TestCase } from './${feature}.types';

export const ${c}TestCases: ${P}TestCase[] = [
${rows.join('\n')}
];
`;
}

// ------------------------------------------------------------------ main

// ชื่อไฟล์ต้องตรงตัวพิมพ์ (Windows ไม่แยก แต่ Linux/CI แยก)
function caseMismatch(file) {
  const dir = path.dirname(file);
  const name = path.basename(file);
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir);
  if (entries.includes(name)) return null;
  return entries.find((e) => e.toLowerCase() === name.toLowerCase()) || null;
}

function checkSources(files) {
  const problems = [];
  for (const f of files) {
    const other = caseMismatch(f);
    if (other) problems.push(`${rel(f)} → ไฟล์จริงชื่อ "${other}" (ตัวพิมพ์ต่างกัน — Linux/CI จะหาไม่เจอ)`);
    else if (!fs.existsSync(f)) problems.push(rel(f));
  }
  if (problems.length) {
    fail('ไม่พบไฟล์ต้นทาง หรือชื่อตัวพิมพ์ไม่ตรง:\n  - ' + problems.join('\n  - ') +
      '\n  → ใช้ชื่อ feature ให้ตรงกับชื่อไฟล์ทุกตัวอักษร (แนะนำตัวพิมพ์เล็กทั้งหมด)');
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const dataOnly = args.includes('--data-only');
  if (dataOnly) LABEL = 'Setup 7';
  const pos = args.filter((a) => !a.startsWith('--'));
  if (pos.length !== 4) {
    fail(
      'ต้องระบุ 4 ค่า: <Project> <AccessFlow> <Module> <feature>\n' +
        '  ตัวอย่าง: node scripts/setup-5.mjs Nebula-Spa No-Auth Bookings bookings'
    );
  }
  const [project, access, moduleName, feature] = pos;
  const P = toPascal(feature);
  const c = toCamel(feature);

  const accessDir = path.join(ROOT, 'Test-Local', project, access);
  const moduleDir = path.join(accessDir, moduleName);
  const flowsFile = path.join(moduleDir, '_flows', `${feature}.ts`);
  const locFile = path.join(moduleDir, '_locators', `${feature}.ts`);
  const csvFile = path.join(moduleDir, '_scenarios', `${feature}.csv`);
  const outDir = path.join(moduleDir, feature);

  if (dataOnly) return updateData({ feature, P, c, locFile, csvFile, outDir, dryRun, accessDir });

  checkSources([flowsFile, locFile, csvFile]);
  const otherDir = caseMismatch(outDir);
  if (fs.existsSync(outDir) || otherDir) {
    fail(`โฟลเดอร์ ${rel(otherDir ? path.join(moduleDir, otherDir) : outDir)} มีอยู่แล้ว → ถ้าจะอัปเดต TC ให้ใช้ Setup 7`);
  }

  const warnings = [];
  const configFile = path.join(accessDir, 'project.config.json');
  if (!fs.existsSync(configFile)) {
    warnings.push(`ไม่พบ ${rel(configFile)} (runner จะใช้ authType = none)`);
  } else {
    try {
      const auth = JSON.parse(readText(configFile)).authType;
      if (!VALID_AUTH.includes(auth)) {
        warnings.push(`${rel(configFile)}: authType = ${JSON.stringify(auth)} ไม่ถูกต้อง ต้องเป็น ${VALID_AUTH.join(' / ')}`);
      }
    } catch (e) {
      if (e instanceof SetupError) throw e;
      warnings.push(`${rel(configFile)} อ่าน JSON ไม่ได้`);
    }
  }

  const flows = readFlows(flowsFile);
  const locators = readLocators(locFile, `${c}Locators`);
  const cases = readScenarios(csvFile, locators);
  if (!flows.gotoUrl) warnings.push('SETUP ไม่มี page.goto แบบ URL เต็ม → defaultVerify จะไม่ตรวจ URL');

  const files = {
    [`${feature}.types.ts`]: genTypes(P),
    [`${feature}.helper.ts`]: genHelper(P, c, feature),
    [`${feature}.spec.ts`]: genSpec(P, c, feature, flows),
    [`${feature}.data.ts`]: genData(P, c, feature, cases),
  };

  if (!dryRun) {
    fs.mkdirSync(outDir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(outDir, name), content, { encoding: 'utf8' });
    }
  }

  const nParam = locators.filter((l) => l.parametric).length;
  const count = (arr) => trimBlankEdges(arr).filter((l) => l.trim() !== '').length;
  console.log(`✅ Setup 5 ${dryRun ? '(dry-run — ไม่ได้เขียนไฟล์) ' : ''}สำเร็จ: ${rel(outDir)}/`);
  console.log(`   locator: ${locators.length} ช่อง (ปุ่มเลือกชื่อ ${nParam}, อื่นๆ ${locators.length - nParam})`);
  console.log(`   test case: ${cases.length} (${cases.map((x) => x.id).join(', ')})`);
  console.log(`   flow: SETUP ${count(flows.setup)} บรรทัด, ก่อน DATA ${count(flows.pre)}, หลัง DATA ${count(flows.post)}`);
  for (const name of Object.keys(files)) console.log(`   - ${name}`);
  for (const w of warnings) console.log(`⚠️  ${w}`);
  printRunHint(outDir, accessDir);
}

function readAuthType(accessDir) {
  const f = path.join(accessDir, 'project.config.json');
  if (!fs.existsSync(f)) return 'none';
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')).authType;
  } catch {
    return null;
  }
}

function printRunHint(outDir, accessDir) {
  const auth = readAuthType(accessDir);
  if (auth === 'none') {
    console.log(`▶  รันเทส: npx playwright test ${rel(outDir)}`);
  } else {
    console.log(`▶  รันเทส: Test-Local\\run-local.bat → เลือก Project / Access Flow / Module`);
    console.log(`   (authType = ${auth} ต้องรันผ่าน run-local เพื่อโหลด session login — npx ตรงๆ จะไม่ได้ login)`);
  }
}

function updateData({ feature, P, c, locFile, csvFile, outDir, dryRun, accessDir }) {
  const helperFile = path.join(outDir, `${feature}.helper.ts`);
  const dataFile = path.join(outDir, `${feature}.data.ts`);
  if (!fs.existsSync(outDir)) {
    fail(`ยังไม่มีโฟลเดอร์ ${rel(outDir)} → feature ใหม่ต้องใช้ Setup 5`);
  }
  checkSources([locFile, csvFile, helperFile]);

  const actions = [...readText(helperFile).matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)].map((m) => m[1]);
  if (actions.length === 0) fail(`${rel(helperFile)} ไม่มี action case ใน switch (ไฟล์อาจถูกแก้ผิด)`);

  const locators = readLocators(locFile, `${c}Locators`);
  // checkKinds=false: Setup 6 may have taught this helper new locator types
  const cases = readScenarios(csvFile, locators, { actions, checkKinds: false });

  const oldIds = fs.existsSync(dataFile)
    ? [...readText(dataFile).matchAll(/testCaseId:\s*'([^']*)'/g)].map((m) => m[1])
    : [];
  const newIds = cases.map((x) => x.id);
  const added = newIds.filter((id) => !oldIds.includes(id));
  const removed = oldIds.filter((id) => !newIds.includes(id));

  if (!dryRun) fs.writeFileSync(dataFile, genData(P, c, feature, cases), { encoding: 'utf8' });

  console.log(`✅ Setup 7 ${dryRun ? '(dry-run — ไม่ได้เขียนไฟล์) ' : ''}สำเร็จ: ${rel(dataFile)}`);
  console.log(`   locator: ${locators.length} ช่อง · action ที่ helper รองรับ: ${actions.map((a) => '|' + a).join(', ')}`);
  console.log(`   test case ทั้งหมด: ${cases.length}`);
  console.log(`   เพิ่มใหม่: ${added.length ? added.join(', ') : '-'}`);
  console.log(`   หายไปจากเดิม: ${removed.length ? removed.join(', ') : '-'}`);
  console.log('   ไม่ได้แตะ: spec.ts, helper.ts, types.ts');
  printRunHint(outDir, accessDir);
}

try {
  main();
} catch (e) {
  if (e instanceof SetupError) {
    console.error(`❌ ${LABEL} หยุดทำงาน — ไม่มีไฟล์ใดถูกเขียนหรือแก้\n${e.message}`);
    process.exit(1);
  }
  throw e;
}
