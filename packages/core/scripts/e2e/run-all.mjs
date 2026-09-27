#!/usr/bin/env node
/**
 * Run the E2E scenarios one after another (they share the LAN port and the
 * local Worker port range) and print one summary line per scenario.
 *
 *   npm run e2e                     # build, then every *.e2e.mjs
 *   npm run e2e -- patients vpo     # only these (names without .e2e.mjs)
 *   npm run e2e -- --no-build       # skip the renderer / Worker page builds
 *
 * Before running: builds the renderer (build:ui + bundle) and the Worker's
 * static pages (cloud/sync-pages/public, needed by `wrangler dev`), and checks
 * that the sync Worker's own wrangler is installed. On Linux with no DISPLAY
 * each scenario runs under xvfb-run.
 *
 * Writes e2e-artifacts/summary.json. Exit code 0 only if every scenario passed.
 */
import { spawnSync } from 'node:child_process';
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
const all = fs.readdirSync(HERE).filter((f) => f.endsWith('.e2e.mjs')).map((f) => f.replace(/\.e2e\.mjs$/, '')).sort();
const unknown = wanted.filter((w) => !all.includes(w));
if (unknown.length) {
  console.error(`Unknown scenario(s): ${unknown.join(', ')}\nAvailable: ${all.join(', ')}`);
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
const results = [];
for (const name of scenarios) {
  const file = path.join(HERE, `${name}.e2e.mjs`);
  const started = Date.now();
  const res = headless
    ? spawnSync('xvfb-run', ['-a', process.execPath, file], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 << 20 })
    : spawnSync(process.execPath, [file], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  const tally = out.match(/(\d+)\/(\d+) checks passed/);
  const failed = out.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => l.slice(6, 240));
  const ok = res.status === 0;
  results.push({ name, ok, passed: tally ? +tally[1] : 0, total: tally ? +tally[2] : 0, seconds: Math.round((Date.now() - started) / 1000), failed });
  const r = results[results.length - 1];
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(18)} ${String(r.passed).padStart(3)}/${String(r.total).padEnd(3)} ${String(r.seconds).padStart(4)}s`);
  for (const f of failed) console.log(`        ${f}`);
  if (!tally && !ok) console.log(`        ${out.trim().split('\n').slice(-3).join(' | ').slice(0, 300)}`);
}

fs.mkdirSync(path.join(REPO, 'e2e-artifacts'), { recursive: true });
fs.writeFileSync(path.join(REPO, 'e2e-artifacts/summary.json'), JSON.stringify(results, null, 2) + '\n');
const bad = results.filter((x) => !x.ok);
console.log(`\n${results.length - bad.length}/${results.length} scenarios passed.`);
process.exit(bad.length ? 1 : 0);
