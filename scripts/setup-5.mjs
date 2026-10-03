#!/usr/bin/env node
// Setup 5 — generate the 4 feature files (types / helper / spec / data) without AI
//
// Usage:
//   node scripts/setup-5.mjs <Project> <AccessFlow> <Module> <feature> [--dry-run]
//   node scripts/setup-5.mjs <Project> <AccessFlow> <Module> <feature> --data-only   (Setup 7)
//
// --data-only: feature exists → rewrite only <feature>.data.ts from the CSV
//              allowed |actions = cases in this feature's helper.ts (incl. Setup 6 additions)
//
// Language: auto from system locale (Thai → th, else en). Override: TTEST_LANG=th | en
//
// Example:
//   node scripts/setup-5.mjs Nebula-Spa No-Auth Bookings bookings
//
// Source of truth:
//   _flows/<feature>.ts      -> spec.ts  (copied verbatim, split by markers)
//   _locators/<feature>.ts   -> helper.ts (imported at runtime) + slot count N
//   _scenarios/<feature>.csv -> data.ts  (every row must have N items)
//
// Exit code: 0 = success, 1 = problem (nothing written)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALID_AUTH = ['none', 'microsoft', 'form'];
const ACTIONS = ['click'];
let LABEL = 'Setup 5';

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
      t(
        `${rel(file)} ถูกบันทึกเป็น UTF-16 (มักเกิดจาก PowerShell)\n  → เปิดใน VS Code แล้วเลือก "Save with Encoding" → UTF-8`,
        `${rel(file)} is saved as UTF-16 (often caused by PowerShell)\n  → open it in VS Code → "Save with Encoding" → UTF-8`
      )
    );
  }
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (/à¸|à¹/.test(text)) {
    fail(
      t(
        `${rel(file)} มีภาษาไทยเพี้ยน (เช่น "à¸...")\n  → ไฟล์นี้เสียจากขั้นก่อนหน้า ต้องแก้ข้อความให้ถูกก่อน แล้วบันทึกเป็น UTF-8`,
        `${rel(file)} contains garbled text (e.g. "à¸...")\n  → the file was damaged by an earlier step; fix the text and save as UTF-8`
      )
    );
  }
  if (text.includes('\uFFFD')) {
    fail(
      t(
        `${rel(file)} มีตัวอักษร � (ข้อความเสีย — มักเกิดจากบันทึกด้วย Excel)\n  → ถ้าใช้ Excel ให้ Save As แบบ "CSV UTF-8" หรือเปิดแก้ใน VS Code แทน`,
        `${rel(file)} contains � (broken text — usually saved by Excel)\n  → in Excel use Save As "CSV UTF-8", or edit the file in VS Code instead`
      )
    );
  }
  if (/`n/.test(text)) {
    fail(
      t(
        `${rel(file)} มีตัวอักษร \`n หลุดเข้ามา (เศษจาก PowerShell)\n  → แก้ให้เป็นการขึ้นบรรทัดจริง`,
        `${rel(file)} contains a literal \`n (PowerShell leftover)\n  → replace it with a real line break`
      )
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

// Split array body into top-level entries (string- and comment-aware)
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
      if (i === -1) fail(t('_locators มี comment /* ที่ไม่ได้ปิด', '_locators has an unclosed /* comment'));
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
  fail(t('_locators: หา "]" ปิด array ไม่เจอ', '_locators: closing "]" of the array not found'));
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
  if (q) fail(t('_scenarios: มีเครื่องหมาย " ที่เปิดแล้วไม่ได้ปิด', '_scenarios: a " quote is opened but never closed'));
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
    if (idx.length === 0) fail(t(`${rel(file)} ไม่มีบรรทัด ${marker}`, `${rel(file)} has no ${marker} line`));
    if (idx.length > 1) fail(t(`${rel(file)} มี ${marker} ซ้ำ ${idx.length} ครั้ง`, `${rel(file)} has ${marker} ${idx.length} times (must be once)`));
    return idx[0];
  };
  const iS = find('// === SETUP ===');
  const iP = find('// === PER TEST ===');
  const iD = find('// === DATA ===');
  if (!(iS < iP && iP < iD)) {
    fail(t(`${rel(file)} ลำดับ marker ผิด ต้องเป็น SETUP → PER TEST → DATA`, `${rel(file)} markers are out of order — must be SETUP → PER TEST → DATA`));
  }

  let post = lines.slice(iD + 1);
  const wrapped = /\btest\s*\(/.test(lines.slice(0, iS).join('\n'));
  if (wrapped) {
    let k = post.length - 1;
    while (k >= 0 && post[k].trim() === '') k--;
    if (k < 0 || !/^\s*\}\s*\)\s*;?\s*$/.test(post[k])) {
      fail(t(`${rel(file)} หา "});" ปิดท้าย test(...) ไม่เจอ`, `${rel(file)}: closing "});" of test(...) not found`));
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
    // 1-based line number of the first line of each section (for messages)
    lineOf: { setup: iS + 2, pre: iP + 2, post: iD + 2 },
    allLines: lines,
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
      t(`${rel(file)} ไม่มี export ชื่อ ${exportName}`, `${rel(file)} does not export ${exportName}`) +
        (found.length ? t(` (เจอ: ${found.join(', ')})`, ` (found: ${found.join(', ')})`) : '')
    );
  }
  const typeText = m[1].replace(/\s+/g, '');
  const entries = splitTopLevel(text, m.index + m[0].length);
  if (entries.length === 0) fail(t(`${rel(file)} array ว่าง ไม่มี locator`, `${rel(file)}: the array is empty`));

  const locators = entries.map((src, i) => {
    let params;
    const paren = src.match(/^\(([^)]*)\)\s*=>/);
    if (paren) params = paren[1].split(',').map((p) => p.trim()).filter(Boolean);
    else if (/^\w+\s*=>/.test(src)) params = [src.match(/^(\w+)/)[1]];
    else fail(t(`${rel(file)} locator [${i}] ไม่ใช่ arrow function: ${src.slice(0, 60)}`, `${rel(file)} locator [${i}] is not an arrow function: ${src.slice(0, 60)}`));
    if (params.some((p) => p.includes('='))) {
      fail(
        t(
          `${rel(file)} locator [${i}] มีค่า default ใน parameter\n  → parametric ต้องเป็น (page, value) => ... ห้ามมี value = ...`,
          `${rel(file)} locator [${i}] has a default parameter value\n  → parametric locators must be (page, value) => ... without value = ...`
        )
      );
    }
    if (params.length < 1 || params.length > 2) {
      fail(t(`${rel(file)} locator [${i}] ต้องรับ 1 หรือ 2 parameter`, `${rel(file)} locator [${i}] must take 1 or 2 parameters`));
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
    fail(t(`${rel(file)} type ของ array ไม่ถูกต้อง ต้องเป็น Array<(page: Page, value?: string) => Locator>`, `${rel(file)}: wrong array type — must be Array<(page: Page, value?: string) => Locator>`));
  }
  if (hasParam && typeText === oldType) {
    fail(
      t(
        `${rel(file)} มี parametric locator แต่ type ยังเป็นแบบเก่า\n  → เปลี่ยนเป็น Array<(page: Page, value?: string) => Locator>`,
        `${rel(file)} has parametric locators but uses the old type\n  → change it to Array<(page: Page, value?: string) => Locator>`
      )
    );
  }
  return locators;
}

function readScenarios(file, locators, { actions = ACTIONS, checkKinds = true } = {}) {
  const rows = parseCsv(readText(file));
  if (rows.length === 0) fail(t(`${rel(file)} ว่างเปล่า`, `${rel(file)} is empty`));
  const header = rows[0].cells.map((c) => c.trim().toLowerCase());
  const expected = ['tc-id', 'module', 'feature', 'scenario', 'value'];
  if (header.join(',') !== expected.join(',')) {
    fail(t(`${rel(file)} หัวตารางต้องเป็น: TC-ID,Module,Feature,Scenario,Value`, `${rel(file)}: header must be TC-ID,Module,Feature,Scenario,Value`));
  }

  const N = locators.length;
  const errors = [];
  const seen = new Set();
  const cases = [];

  for (const { cells, line } of rows.slice(1)) {
    if (cells.length !== 5) {
      errors.push(
        t(`บรรทัด ${line}: มี ${cells.length} คอลัมน์ ต้องมี 5`, `line ${line}: ${cells.length} columns, expected 5`) +
          (cells.length > 5 ? t(' — Value มี comma แต่ไม่ได้ครอบด้วย "..."', ' — Value contains commas but is not wrapped in "..."') : '')
      );
      continue;
    }
    const [id, , , scenario, raw] = cells.map((c) => c.trim());
    if (!id) {
      errors.push(t(`บรรทัด ${line}: ไม่มี TC-ID`, `line ${line}: missing TC-ID`));
      continue;
    }
    if (seen.has(id)) errors.push(t(`${id}: TC-ID ซ้ำ`, `${id}: duplicate TC-ID`));
    seen.add(id);

    const values = raw.split(',').map((v) => v.trim());
    if (values.length !== N) {
      const diff = N - values.length;
      errors.push(
        t(
          `${id}: มี ${values.length} ค่า แต่ต้องมี ${N} ค่า (ตามจำนวน locator) → ` +
            (diff > 0 ? `ขาด ${diff} ช่อง (เติม comma ท้าย)` : `เกิน ${-diff} ช่อง`),
          `${id}: ${values.length} items, expected ${N} (one per locator) → ` +
            (diff > 0 ? `${diff} missing (add trailing commas)` : `${-diff} too many`)
        )
      );
      continue;
    }
    values.forEach((v, i) => {
      if (v === '') return;
      const loc = locators[i];
      if (v.startsWith('|')) {
        const action = v.slice(1);
        if (!actions.includes(action)) {
          errors.push(t(
            `${id} ช่อง ${i + 1}: ไม่รู้จัก action "${v}" (รองรับ: ${actions.map((a) => '|' + a).join(', ')}) → ถ้าต้องการ action ใหม่ใช้ Setup 6`,
            `${id} item ${i + 1}: unknown action "${v}" (supported: ${actions.map((a) => '|' + a).join(', ')}) → use Setup 6 to add a new action`
          ));
        } else if (loc.parametric) {
          errors.push(t(`${id} ช่อง ${i + 1}: ช่องนี้เป็นปุ่มแบบเลือกชื่อ ต้องใส่ชื่อปุ่ม ไม่ใช่ ${v}`, `${id} item ${i + 1}: this position is a button chosen by name — give the button name, not ${v}`));
        }
      }
    });
    cases.push({ id, scenario, values });
  }

  if (errors.length) {
    fail(t(`${rel(file)} มีปัญหา ${errors.length} จุด:`, `${rel(file)} has ${errors.length} problem(s):`) + '\n  - ' + errors.join('\n  - '));
  }
  if (cases.length === 0) fail(t(`${rel(file)} ไม่มีแถวข้อมูล`, `${rel(file)} has no data rows`));
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

// ------------------------------------------------- dropdowns & brittle locators

// Option click recorded by codegen: getByRole('option', { name: 'X' }) or getByLabel('X').getByText('X')
const OPTION_RES = [
  /^await page\.getByRole\(\s*(['"])option\1\s*,\s*\{\s*name:\s*(['"])((?:\\.|(?!\2).)*)\2\s*(?:,\s*exact:\s*true\s*)?\}\s*\)\.click\(\)\s*;?$/,
  /^await page\.getByLabel\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)\.getByText\(\s*(['"])\2\3\s*\)\.click\(\)\s*;?$/,
];
// Clicks that are attempts to open the same dropdown (no identity of their own)
const DROPDOWN_NOISE = [
  /^await page\.locator\(\s*(['"])(div|span)\1\s*\)\.(nth\(\d+\)|first\(\)|last\(\))\.click\(\)\s*;?$/,
  /^await page\.locator\(\s*(['"])[^'"]*ng-(input|select|arrow|placeholder)[^'"]*\1\s*\)(\.(nth\(\d+\)|first\(\)))?\.click\(\)\s*;?$/,
  /^await page\.getByRole\(\s*(['"])combobox\1[^)]*\)(\.(nth\(\d+\)|first\(\)))?\.click\(\)\s*;?$/,
];
const CLICK_RE = /^await (page\..+)\.click\(\)\s*;?$/;
// Position-only locators: correct when recorded, wrong when the page changes
const BRITTLE_RES = [
  // bare tag + position: locator('div').nth(3)
  /locator\(\s*(['"])(div|span|a|li|p|button|i|svg|td|tr|img)\1\s*\)\.(nth\(\d+\)|first\(\)|last\(\))/,
  // generated ids: #mat-input-3, #radix-:r5:, #react-select-2-input
  /['"]#(mat-|radix-|cdk-|react-select-|ext-gen|ember\d|headlessui-)/,
  // structural CSS paths: two or more ">" steps, or :nth-child / :nth-of-type
  /locator\(\s*(['"])(?:(?!\1).)*>(?:(?!\1).)*>(?:(?!\1).)*\1/,
  /:nth-(child|of-type)\(/,
  // XPath
  /locator\(\s*(['"])(xpath=|\/\/|\/html)/,
];
const BRITTLE_RE = { test: (line) => BRITTLE_RES.some((re) => re.test(line)) };

function optionName(trimmed) {
  for (const re of OPTION_RES) {
    const m = trimmed.match(re);
    if (m) return re === OPTION_RES[0] ? { q: m[2], name: m[3] } : { q: m[1], name: m[2] };
  }
  return null;
}

// Replace "opener click + option click" with selectOption(); drop misclicks right before the opener.
function collapseDropdowns(lines, firstLineNo, file) {
  const out = lines.slice();
  const notes = [];
  const dropped = new Set();
  let used = false;
  for (let i = 0; i < out.length; i++) {
    const opt = optionName((out[i] || '').trim());
    if (!opt) continue;
    let j = i - 1;
    while (j >= 0 && (out[j] === null || out[j].trim() === '')) j--;
    if (j < 0) continue;
    const opener = out[j].trim().match(CLICK_RE);
    if (!opener || optionName(out[j].trim())) continue;
    const indent = out[j].match(/^\s*/)[0];
    const removed = [];
    let k = j - 1;
    for (;;) {
      while (k >= 0 && (out[k] === null || out[k].trim() === '')) k--;
      if (k < 0 || !DROPDOWN_NOISE.some((re) => re.test(out[k].trim()))) break;
      removed.push(firstLineNo + k);
      dropped.add(firstLineNo + k);
      out[k] = null;
      k--;
    }
    out[j] = `${indent}await selectOption(page, ${opener[1]}, ${opt.q}${opt.name}${opt.q});`;
    out[i] = null;
    used = true;
    notes.push(t(
      `${file} บรรทัด ${firstLineNo + j}–${firstLineNo + i}: dropdown → selectOption(${opener[1]}, ${opt.q}${opt.name}${opt.q})` +
        (removed.length ? ` · ตัดคลิกที่พยายามเปิด dropdown ซ้ำ: บรรทัด ${removed.reverse().join(', ')}` : ''),
      `${file} lines ${firstLineNo + j}–${firstLineNo + i}: dropdown → selectOption(${opener[1]}, ${opt.q}${opt.name}${opt.q})` +
        (removed.length ? ` · dropped repeated attempts to open it: line ${removed.reverse().join(', ')}` : '')
    ));
  }
  return { lines: out.filter((l) => l !== null), notes, dropped, used };
}

function brittleWarnings(fileLines, file, skip = new Set()) {
  const warns = [];
  fileLines.forEach((line, idx) => {
    const no = idx + 1;
    if (skip.has(no) || line.trim().startsWith('//')) return;
    if (BRITTLE_RE.test(line)) {
      warns.push(t(
        `${file} บรรทัด ${no}: ${line.trim()}\n      เลือกจากลำดับ / โครงสร้างหน้า / id อัตโนมัติ — อาจกดผิดตัวเมื่อหน้าเว็บเปลี่ยน → ใช้ locator ที่มีชื่อหรือข้อความ (ถ้าแก้แอปได้ ใส่ data-testid หรือ aria-label)`,
        `${file} line ${no}: ${line.trim()}\n      picks by position / page structure / generated id — may hit the wrong element when the page changes → use a locator with a name or text (if you own the app, add data-testid or aria-label)`
      ));
    }
  });
  return warns;
}

function genHelper(P, c, feature) {
  return `// Generated by scripts/setup-5.mjs — extend via Setup 6.
import type { Locator, Page } from '@playwright/test';
import type { ${P}TestCase } from './${feature}.types';
import { ${c}Locators } from '../_locators/${feature}';

// Accepts both static-only and parametric locator arrays.
const locators: ReadonlyArray<(page: Page, value?: string) => Locator> = ${c}Locators;

// What kind of field is this element? (text box, native <select>, dropdown, or something else)
export async function fieldKind(target: Locator): Promise<'text' | 'select' | 'dropdown' | string> {
  return target.evaluate((el: Element) => {
    const tag = el.tagName;
    const role = (el.getAttribute('role') || '').toLowerCase();
    if (tag === 'SELECT') return 'select';
    if (role === 'combobox' || el.getAttribute('aria-haspopup') === 'listbox') return 'dropdown';
    if (role === 'textbox' || role === 'searchbox' || tag === 'TEXTAREA') return 'text';
    const editable = (el.getAttribute('contenteditable') || 'false').toLowerCase();
    if ((el as HTMLElement).isContentEditable || ['', 'true', 'plaintext-only'].includes(editable)) return 'text';
    if (tag === 'INPUT') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (['checkbox', 'radio'].includes(type)) return type;
      if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
      if (type === 'file') return 'file input';
      return 'text';
    }
    if (tag === 'BUTTON' && role !== 'combobox') {
      // Buttons that open a list (shadcn / Radix select triggers) announce it with aria-expanded
      return el.hasAttribute('aria-expanded') ? 'dropdown' : 'button';
    }
    return 'dropdown'; // div / span / placeholder text: treated as a dropdown opener
  });
}

// Open a dropdown and pick an option by name. Used for dropdown slots in _locators
// and for dropdown steps in _flows (codegen records them as "opener click + option click").
export async function selectOption(page: Page, opener: Locator, name: string): Promise<void> {
  const option = page.getByRole('option', { name });
  await opener.click();
  try {
    await option.first().waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    // Some dropdowns open only on a second click (e.g. after taking focus)
    await opener.click();
  }
  await option.click();
}

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

  // Static locator + text: decided by the element on the page, not by how codegen wrote the locator.
  const target = locatorFn(page);
  const kind = await fieldKind(target);

  if (kind === 'text') {
    await target.fill(item);
  } else if (kind === 'select') {
    await target.selectOption({ label: item });
  } else if (kind === 'dropdown') {
    await selectOption(page, target, item);
  } else {
    throw new Error(
      \`Locator at index \${index} is a \${kind} — it cannot take text "\${item}". \` +
        \`Use |click (or add an action such as |check with Setup 6)\`
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
  const f = `_flows/${feature}.ts`;
  const cs = collapseDropdowns(flows.setup, flows.lineOf.setup, f);
  const cp = collapseDropdowns(flows.pre, flows.lineOf.pre, f);
  const cq = collapseDropdowns(flows.post, flows.lineOf.post, f);
  flows.dropdownNotes = [...cs.notes, ...cp.notes, ...cq.notes];
  flows.droppedLines = new Set([...cs.dropped, ...cp.dropped, ...cq.dropped]);
  const usesSelect = cs.used || cp.used || cq.used;
  const setup = reindent(cs.lines, '  ');
  const pre = reindent(cp.lines, '      ');
  const post = reindent(cq.lines, '      ');

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
import { apply${P}Inputs${usesSelect ? ', selectOption' : ''} } from './${feature}.helper';
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

// File names must match case exactly (Windows ignores case, Linux/CI does not)
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
    if (other) problems.push(t(`${rel(f)} → ไฟล์จริงชื่อ "${other}" (ตัวพิมพ์ต่างกัน — Linux/CI จะหาไม่เจอ)`, `${rel(f)} → actual file is "${other}" (case differs — Linux/CI will not find it)`));
    else if (!fs.existsSync(f)) problems.push(rel(f));
  }
  if (problems.length) {
    fail(
      t('ไม่พบไฟล์ต้นทาง หรือชื่อตัวพิมพ์ไม่ตรง:', 'Source file missing or name case differs:') +
        '\n  - ' + problems.join('\n  - ') +
        t('\n  → ใช้ชื่อ feature ให้ตรงกับชื่อไฟล์ทุกตัวอักษร (แนะนำตัวพิมพ์เล็กทั้งหมด)',
          '\n  → the feature name must match the file names exactly (lowercase recommended)')
    );
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
      t('ต้องระบุ 4 ค่า: <Project> <AccessFlow> <Module> <feature>', '4 values required: <Project> <AccessFlow> <Module> <feature>') +
        t('\n  ตัวอย่าง: ', '\n  example: ') + 'node scripts/setup-5.mjs Nebula-Spa No-Auth Bookings bookings'
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
    const shown = rel(otherDir ? path.join(moduleDir, otherDir) : outDir);
    fail(t(`โฟลเดอร์ ${shown} มีอยู่แล้ว → ถ้าจะอัปเดต TC ให้ใช้ Setup 7`, `${shown} already exists → use Setup 7 to update test cases`));
  }

  const warnings = [];
  const configFile = path.join(accessDir, 'project.config.json');
  if (!fs.existsSync(configFile)) {
    warnings.push(t(`ไม่พบ ${rel(configFile)} (runner จะใช้ authType = none)`, `${rel(configFile)} not found (runner defaults to authType = none)`));
  } else {
    try {
      const auth = JSON.parse(readText(configFile)).authType;
      if (!VALID_AUTH.includes(auth)) {
        warnings.push(t(`${rel(configFile)}: authType = ${JSON.stringify(auth)} ไม่ถูกต้อง ต้องเป็น ${VALID_AUTH.join(' / ')}`, `${rel(configFile)}: authType = ${JSON.stringify(auth)} is invalid — must be ${VALID_AUTH.join(' / ')}`));
      }
    } catch (e) {
      if (e instanceof SetupError) throw e;
      warnings.push(t(`${rel(configFile)} อ่าน JSON ไม่ได้`, `${rel(configFile)} is not valid JSON`));
    }
  }

  const flows = readFlows(flowsFile);
  const locators = readLocators(locFile, `${c}Locators`);
  const cases = readScenarios(csvFile, locators);
  if (!flows.gotoUrl) warnings.push(t('SETUP ไม่มี page.goto แบบ URL เต็ม → defaultVerify จะไม่ตรวจ URL', 'SETUP has no page.goto with a full URL → defaultVerify will not check the URL'));

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
  const dry = dryRun ? t('(dry-run — ไม่ได้เขียนไฟล์) ', '(dry-run — nothing written) ') : '';
  console.log(t(`✅ Setup 5 ${dry}สำเร็จ: ${rel(outDir)}/`, `✅ Setup 5 ${dry}done: ${rel(outDir)}/`));
  console.log(t(`   locator: ${locators.length} ช่อง (ปุ่มเลือกชื่อ ${nParam}, อื่นๆ ${locators.length - nParam})`,
    `   locators: ${locators.length} (buttons chosen by name: ${nParam}, other: ${locators.length - nParam})`));
  console.log(t(`   test case: ${cases.length} (${cases.map((x) => x.id).join(', ')})`, `   test cases: ${cases.length} (${cases.map((x) => x.id).join(', ')})`));
  console.log(t(`   flow: SETUP ${count(flows.setup)} บรรทัด, ก่อน DATA ${count(flows.pre)}, หลัง DATA ${count(flows.post)}`,
    `   flow lines: SETUP ${count(flows.setup)}, before DATA ${count(flows.pre)}, after DATA ${count(flows.post)}`));
  for (const name of Object.keys(files)) console.log(`   - ${name}`);
  for (const n of flows.dropdownNotes) console.log(`ℹ️  ${n}`);
  const brittle = [
    ...brittleWarnings(flows.allLines, `_flows/${feature}.ts`, flows.droppedLines),
    ...brittleWarnings(readText(locFile).split('\n'), `_locators/${feature}.ts`),
  ];
  for (const w of [...warnings, ...brittle]) console.log(`⚠️  ${w}`);
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
    console.log(t(`▶  รันเทส: npx playwright test ${rel(outDir)}`, `▶  run tests: npx playwright test ${rel(outDir)}`));
  } else {
    console.log(t(`▶  รันเทส: Test-Local\\run-local.bat → เลือก Project / Access Flow / Module`,
      `▶  run tests: Test-Local\\run-local.bat → pick Project / Access Flow / Module`));
    console.log(t(`   (authType = ${auth} ต้องรันผ่าน run-local เพื่อโหลด session login — npx ตรงๆ จะไม่ได้ login)`,
      `   (authType = ${auth} must run through run-local to load the login session — plain npx will not be logged in)`));
  }
}

function updateData({ feature, P, c, locFile, csvFile, outDir, dryRun, accessDir }) {
  const helperFile = path.join(outDir, `${feature}.helper.ts`);
  const dataFile = path.join(outDir, `${feature}.data.ts`);
  if (!fs.existsSync(outDir)) {
    fail(t(`ยังไม่มีโฟลเดอร์ ${rel(outDir)} → feature ใหม่ต้องใช้ Setup 5`, `${rel(outDir)} does not exist → use Setup 5 for a new feature`));
  }
  checkSources([locFile, csvFile, helperFile]);

  const actions = [...readText(helperFile).matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)].map((m) => m[1]);
  if (actions.length === 0) fail(t(`${rel(helperFile)} ไม่มี action case ใน switch (ไฟล์อาจถูกแก้ผิด)`, `${rel(helperFile)} has no action cases in its switch (file may be edited incorrectly)`));

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

  const dry = dryRun ? t('(dry-run — ไม่ได้เขียนไฟล์) ', '(dry-run — nothing written) ') : '';
  const acts = actions.map((a) => '|' + a).join(', ');
  const list = (a) => (a.length ? a.join(', ') : '-');
  console.log(t(`✅ Setup 7 ${dry}สำเร็จ: ${rel(dataFile)}`, `✅ Setup 7 ${dry}done: ${rel(dataFile)}`));
  console.log(t(`   locator: ${locators.length} ช่อง · action ที่ helper รองรับ: ${acts}`, `   locators: ${locators.length} · actions supported by helper: ${acts}`));
  console.log(t(`   test case ทั้งหมด: ${cases.length}`, `   test cases: ${cases.length}`));
  console.log(t(`   เพิ่มใหม่: ${list(added)}`, `   added: ${list(added)}`));
  console.log(t(`   หายไปจากเดิม: ${list(removed)}`, `   removed: ${list(removed)}`));
  console.log(t('   ไม่ได้แตะ: spec.ts, helper.ts, types.ts', '   untouched: spec.ts, helper.ts, types.ts'));
  printRunHint(outDir, accessDir);
}

try {
  main();
} catch (e) {
  if (e instanceof SetupError) {
    console.error(t(`❌ ${LABEL} หยุดทำงาน — ไม่มีไฟล์ใดถูกเขียนหรือแก้`, `❌ ${LABEL} stopped — no files were written or changed`) + `\n${e.message}`);
    process.exit(1);
  }
  throw e;
}
