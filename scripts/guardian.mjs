#!/usr/bin/env node
/**
 * Synapse Guardian — Session Validator
 * Checks ARCHITECTURE_v1.md + PROJECT_RULES.md invariants.
 * Run: node scripts/guardian.mjs
 * Exit 0 = clean, 1 = violation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const ok = (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
const bad = (msg) => { console.log(`\x1b[31m❌ ${msg}\x1b[0m`); failed = true; };
const warn = (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
const info = (msg) => console.log(`\x1b[34mℹ️  ${msg}\x1b[0m`);

console.log('\n🛡️  Synapse Guardian — Validating session constitution...\n');
console.log(`Root: ${root}\n`);

// 1. Files exist
const mustExist = ['ARCHITECTURE_v1.md','PROJECT_RULES.md','SYNAPSE_GUARDIAN.md','src/lib/types.ts','src/lib/persistence.ts','src/lib/store.ts','src/lib/operations/hierarchy.ts','src/lib/operations/nodes.ts','src/lib/operations/status.ts'];
for (const f of mustExist) {
  if (fs.existsSync(path.join(root, f))) ok(`Found ${f}`);
  else bad(`Missing required file: ${f}`);
}

// 2. Tech stack locked
console.log('\n── Tech Stack (LOCKED) ──');
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const banned = ['express','fastify','koa','@prisma/client','prisma','mongoose','mongodb','pg','mysql2','drizzle-orm','supabase','firebase','@supabase/supabase-js','next-auth','lucia','redux','@reduxjs/toolkit','jotai','valtio','mobx','recoil'];
  const foundBanned = banned.filter(b => allDeps[b]);
  if (foundBanned.length) bad(`Banned dependencies found: ${foundBanned.join(', ')} — backend/state violation (PROJECT_RULES §2)`);
  else ok('No banned dependencies — stack locked clean');

  // Check locked versions
  if (pkg.dependencies?.zustand) ok(`Zustand present (${pkg.dependencies.zustand}) — locked`);
  else bad('Zustand missing — required by PROJECT_RULES §2');

  if (pkg.dependencies?.next) ok(`Next.js present (${pkg.dependencies.next}) — locked`);
  else bad('Next.js missing');

  // No api routes
  const apiPath = path.join(root,'src/app/api');
  if (fs.existsSync(apiPath)) bad(`Backend violation: src/app/api/ exists — PROJECT_RULES §2 says Backend NONE`);
  else ok('No src/app/api/ — backend NONE respected');

} catch (e) { bad(`package.json check failed: ${e.message}`); }

// 3. Data model locked
console.log('\n── Data Model (LOCKED V1) ──');
try {
  const types = fs.readFileSync(path.join(root,'src/lib/types.ts'),'utf8');
  const checks = [
    [/type\s+Status\s*=.*'none'.*'failed'.*'review'.*'mastered'/s, 'Status type correct'],
    [/type\s+Node\s*=.*id:\s*string.*content:\s*string.*parentId:\s*string\s*\|\s*null.*position.*status:\s*Status.*isCollapsed:\s*boolean.*createdAt.*updatedAt/s, 'Node interface matches PROJECT_RULES §3'],
    [/type\s+CanvasData\s*=.*id:\s*string.*name:\s*string.*nodes:\s*Record<string,\s*Node>.*viewport.*createdAt.*updatedAt/s, 'CanvasData interface correct'],
    [/NODE_WIDTH\s*=\s*280/, 'NODE_WIDTH=280'],
    [/HORIZONTAL_INDENT\s*=\s*320/, 'HORIZONTAL_INDENT=320'],
  ];
  for (const [re,msg] of checks) {
    if (re.test(types)) ok(msg);
    else bad(`Data model drift: ${msg} — check src/lib/types.ts vs PROJECT_RULES §3`);
  }
  // Warn if isHidden / schemaVersion present without migration
  if (/isHidden/.test(types)) warn('isHidden found in types.ts — this is V2-04b (pending). Ensure persistence.ts migration exists!');
  if (/schemaVersion/.test(types)) warn('schemaVersion found — ensure loadCanvas() migrates old data (ARCHITECTURE §10)');

  // Content must be plain text — check for markdown fields
  if (/contentRich|markdown|richText/.test(types)) bad('Rich-text field detected in Node — V1 is plain text only');

} catch (e) { bad(`types.ts check failed: ${e.message}`); }

// 4. Persistence locked
console.log('\n── Persistence (localStorage) ──');
try {
  const pers = fs.readFileSync(path.join(root,'src/lib/persistence.ts'),'utf8');
  if (/synapse:v1:canvas:/.test(pers)) ok('Storage key synapse:v1:canvas:<id> correct');
  else bad('Storage key missing/incorrect — must be synapse:v1:canvas:<id>');

  if (/localStorage\.getItem/.test(pers) && /localStorage\.setItem/.test(pers)) ok('localStorage boundary intact');
  else bad('localStorage not used in persistence.ts');

  if (/synapse:v1:ui-settings/.test(pers)) ok('UI settings key present');
  else warn('UI settings key missing');

  if (/loadCanvas/.test(pers) && /saveCanvas/.test(pers)) ok('loadCanvas/saveCanvas present');
  else bad('persistence.ts missing load/save');

  // Migration check
  if (/schemaVersion/.test(pers)) ok('schemaVersion migration handling present');
  else info('No schemaVersion yet — V1 baseline (migration will be needed for future model changes)');

} catch (e) { bad(`persistence.ts check failed: ${e.message}`); }

// 5. Domain invariants
console.log('\n── Domain Invariants (ARCHITECTURE §3, §5) ──');
try {
  const hier = fs.readFileSync(path.join(root,'src/lib/operations/hierarchy.ts'),'utf8');
  if (/visibleOrder/.test(hier) && /isCollapsed/.test(hier)) ok('visibleOrder respects isCollapsed');
  else bad('visibleOrder missing collapse check');

  if (/descendants/.test(hier)) ok('descendants() present (cascading delete)');
  else bad('descendants() missing');

  if (/roots.*parentId===null/.test(hier)) ok('roots() filters parentId===null');
  else warn('roots() check — verify parentId null handling');

  if (/sort.*createdAt/.test(hier)) ok('Ordering by createdAt (deterministic)');
  else warn('Ordering not by createdAt — check ARCHITECTURE §7');

  const status = fs.readFileSync(path.join(root,'src/lib/operations/status.ts'),'utf8');
  if (/statusSummary/.test(status)) ok('statusSummary present (direct children only)');
  else bad('statusSummary missing');

  const nodes = fs.readFileSync(path.join(root,'src/lib/operations/nodes.ts'),'utf8');
  if (/makeNode/.test(nodes) && /isCollapsed:\s*false/.test(nodes)) ok('makeNode factory correct');
  else bad('makeNode factory drift');

  const store = fs.readFileSync(path.join(root,'src/lib/store.ts'),'utf8');
  if (/400/.test(store) && /setTimeout/.test(store) && /saveCanvas/.test(store)) ok('Debounced 400ms save intact');
  else warn('Debounced save check — expected 400ms in store.ts');

  if (/descendants/.test(store) && /delete.*nodes/.test(store)) ok('Cascading delete in store');
  else bad('Cascading delete missing in store.ts');

  if (/STATUS_ORDER/.test(store) || /STATUS_ORDER/.test(fs.readFileSync(path.join(root,'src/lib/types.ts'),'utf8'))) ok('Status cycle order preserved');
  else warn('STATUS_ORDER not found');

} catch (e) { bad(`Domain check failed: ${e.message}`); }

// 6. Architecture map
console.log('\n── Architecture Map (ARCHITECTURE §1, §4) ──');
const mapChecks = [
  ['src/app/layout.tsx','App shell'],
  ['src/app/page.tsx','Root redirect'],
  ['src/app/canvas/[id]/page.tsx','Dynamic canvas route'],
  ['src/components/Canvas/Canvas.tsx','Canvas composition'],
  ['src/components/Canvas/Node.tsx','Node card'],
  ['src/components/Canvas/Toolbar.tsx','Toolbar'],
  ['src/lib/store.ts','Zustand store'],
  ['src/lib/persistence.ts','Persistence boundary'],
];
for (const [p,desc] of mapChecks) {
  if (fs.existsSync(path.join(root,p))) ok(`${desc} @ ${p}`);
  else bad(`Missing ${desc} @ ${p}`);
}

// 7. Project rules compliance
console.log('\n── Project Rules Additional ──');
try {
  const rules = fs.readFileSync(path.join(root,'PROJECT_RULES.md'),'utf8');
  if (/Local-first/.test(rules)) ok('PROJECT_RULES.md present and readable');
} catch {}
try {
  const arch = fs.readFileSync(path.join(root,'ARCHITECTURE_v1.md'),'utf8');
  if (/Current project map/.test(arch)) ok('ARCHITECTURE_v1.md present');
} catch {}
if (fs.existsSync(path.join(root,'SYNAPSE_GUARDIAN.md'))) ok('SYNAPSE_GUARDIAN.md active (session constitution)');
else bad('Guardian constitution missing');

// 8. Tests / CI
console.log('\n── Testing & CI (ARCHITECTURE §7, §8) ──');
if (fs.existsSync(path.join(root,'tests'))) ok('tests/ directory exists');
else warn('tests/ not yet created — reserved (add hierarchy.test.ts etc.)');
if (fs.existsSync(path.join(root,'.github/workflows/ci.yml'))) ok('CI workflow present');
else info('No CI workflow yet — recommended: npm ci → npm run test → npm run build');
const pkg2 = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if (pkg2.scripts?.build) ok('npm run build script present');
else bad('build script missing');
if (pkg2.scripts?.test) ok('npm run test script present');
else bad('test script missing');

// Final
console.log('\n' + '─'.repeat(50));
if (failed) {
  console.log('\x1b[31m🛑 Guardian FAILED — fix violations above before proceeding.\x1b[0m');
  console.log('   See SYNAPSE_GUARDIAN.md for locked rules.\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✅ Guardian PASSED — session constitution obeyed. Clean to build.\x1b[0m');
  console.log('   Next: npm run build must also pass.\n');
  process.exit(0);
}
