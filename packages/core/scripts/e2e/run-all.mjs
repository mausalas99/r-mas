#!/usr/bin/env node
/**
 * Run the E2E scenarios, 5 at a time, and print one summary line per scenario.
 * Each slot gets its own LAN port block (E2E_PORT_OFFSET). Scenarios that use
 * the system clipboard run one at a time within that group. Each slot also
 * gets its own local Worker port block. Longest scenarios (from the last timings.json) start first.
 *
 *   npm run e2e                     # build, then every *.e2e.mjs
 *   npm run e2e -- patients vpo     # only these (names without .e2e.mjs)
 *   npm run e2e -- --no-build       # skip the renderer / Worker page builds
 *   npm run e2e -- --repeat=5 x     # each scenario 5 times, pass count per scenario
 *   npm run e2e -- --jobs=1         # one at a time (A11Y_UPDATE=1 forces this)
 *
 * Before running: builds the renderer (build:ui + bundle) and the Worker's
 * static pages (cloud/sync-pages/public, needed by `wrangler dev`), and checks
 * that the sync Worker's own wrangler is installed. On Linux with no DISPLAY
 * each scenario runs under xvfb-run.
 *
 * Writes e2e-artifacts/summary.json. Exit code 0 only if every scenario passed.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../..');
const CORE = path.join(REPO, 'packages/core');
const WRANGLER = path.join(CORE, 'cloud/sync-worker/node_modules/.bin/wrangler');

const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const wanted = args.filter((a) => !a.startsWith('--'));
// nube-staging* hit the shared staging Worker (STAGING_URL etc.): run them by hand.
const named = fs.readdirSync(HERE).filter((f) => f.endsWith('.e2e.mjs')).map((f) => f.replace(/\.e2e\.mjs$/, '')).sort();
const all = named.filter((n) => !n.startsWith('nube-staging'));
const unknown = wanted.filter((w) => !named.includes(w));
if (unknown.length) {
  console.error(`Unknown scenario(s): ${unknown.join(', ')}\nAvailable: ${named.join(', ')}`);
  process.exit(2);
}
const scenarios = wanted.length ? wanted : all;

function run(cmd, cmdArgs, opts = {}) {
  return spawnSync(cmd, cmdArgs, { cwd: REPO, stdio: 'inherit', ...opts });
}

if (!noBuild) {
  for (const script of ['build-ui.mjs', 'bundle-renderer.mjs', 'build-cloud-mobile.mjs', 'build-cloud-interno.mjs']) {
    const res = run(process.execPath, [path.join(CORE, 'scripts', script)], { stdio: 'pipe', encoding: 'utf8' });
    if (res.status !== 0) {
      console.error(`${res.stdout || ''}${res.stderr || ''}\nBuild step ${script} failed.`);
      process.exit(1);
    }
  }
}
if (!fs.existsSync(WRANGLER)) {
  console.error('The Nube scenarios need the sync Worker\'s wrangler: run `npm ci` in packages/core/cloud/sync-worker.');
  process.exit(1);
}

const headless = process.platform === 'linux' && !process.env.DISPLAY;
// Baseline re-record is a read-modify-write of one file: keep it serial.
const jobs = process.env.A11Y_UPDATE ? 1 : Math.max(1, Number(args.find((a) => a.startsWith('--jobs='))?.slice(7)) || 5);
const TIMINGS = path.join(REPO, 'e2e-artifacts/timings.json');
let timings = {};
try { timings = JSON.parse(fs.readFileSync(TIMINGS, 'utf8')); } catch { /* first run */ }
// ponytail: one lock per shared resource (the system clipboard).
const locksOf = (name) => {
  const src = fs.readFileSync(path.join(HERE, `${name}.e2e.mjs`), 'utf8');
  return [/clipboard/.test(src) && 'clipboard'].filter(Boolean);
};
const repeat = Math.max(1, Number(args.find((a) => a.startsWith('--repeat='))?.slice(9)) || 1);
const pending = Array.from({ length: repeat }, () => scenarios).flat().sort((a, b) => (timings[b] || 0) - (timings[a] || 0)).map((name) => ({ name, locks: locksOf(name) }));
const held = new Set();
const freeSlots = Array.from({ length: jobs }, (_, i) => i);
const results = [];

function runOne(name, slot) {
  const file = path.join(HERE, `${name}.e2e.mjs`);
  const started = Date.now();
  const [cmd, cmdArgs] = headless ? ['xvfb-run', ['-a', process.execPath, file]] : [process.execPath, [file]];
  const child = spawn(cmd, cmdArgs, { cwd: REPO, env: { ...process.env, E2E_PORT_OFFSET: String(slot * 10) } });
  let out = '';
  child.stdout.on('data', (b) => { out += b; });
  child.stderr.on('data', (b) => { out += b; });
  return new Promise((resolve) => child.on('close', (code) => {
    const tally = out.match(/(\d+)\/(\d+) checks passed/);
    const failed = out.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => l.slice(6, 240));
    const ok = code === 0;
    const r = { name, ok, passed: tally ? +tally[1] : 0, total: tally ? +tally[2] : 0, seconds: Math.round((Date.now() - started) / 1000), failed };
    results.push(r);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(18)} ${String(r.passed).padStart(3)}/${String(r.total).padEnd(3)} ${String(r.seconds).padStart(4)}s`);
    for (const f of failed) console.log(`        ${f}`);
    if (!tally && !ok) console.log(`        ${out.trim().split('\n').slice(-3).join(' | ').slice(0, 300)}`);
    resolve();
  }));
}

const wallStart = Date.now();
await new Promise((allDone) => {
  const fill = () => {
    if (!pending.length && freeSlots.length === jobs) return allDone();
    while (freeSlots.length) {
      const i = pending.findIndex((p) => p.locks.every((l) => !held.has(l)));
      if (i < 0) break;
      const [{ name, locks }] = pending.splice(i, 1);
      const slot = freeSlots.shift();
      locks.forEach((l) => held.add(l));
      runOne(name, slot).then(() => { locks.forEach((l) => held.delete(l)); freeSlots.push(slot); fill(); });
    }
  };
  fill();
});
results.sort((a, b) => a.name.localeCompare(b.name));
if (repeat > 1) for (const n of scenarios) console.log(`${n}: ${results.filter((x) => x.name === n && x.ok).length}/${repeat} runs passed`);

fs.mkdirSync(path.join(REPO, 'e2e-artifacts'), { recursive: true });
fs.writeFileSync(path.join(REPO, 'e2e-artifacts/summary.json'), JSON.stringify(results, null, 2) + '\n');
const bad = results.filter((x) => !x.ok);
for (const r of results) timings[r.name] = r.seconds;
fs.writeFileSync(TIMINGS, JSON.stringify(timings, null, 2) + '\n');
console.log(`\n${results.length - bad.length}/${results.length} scenarios passed in ${Math.round((Date.now() - wallStart) / 60000)} min (${jobs} at a time).`);
process.exit(bad.length ? 1 : 0);
