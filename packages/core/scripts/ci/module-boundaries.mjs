#!/usr/bin/env node
/**
 * Fails when one package imports across a module boundary.
 *
 * This gate exists because the boundary rules were never enforced: the
 * depcruise call in scripts/metrics/run.mjs passes `-o`, which is not a
 * dependency-cruiser flag, so it threw into a bare `catch` and scored 0 on
 * every run since it was written. Every "0 violations" note in the handoff
 * recorded a run that never happened.
 *
 * So this script never swallows a failure. If depcruise does not produce a
 * report that actually cruised something, the gate fails loudly instead of
 * reporting success.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const CONFIG = '.dependency-cruiser-boundaries.cjs';
const SCAN = ['packages/core', 'packages/im', 'packages/hf', 'packages/neumo', 'packages/shared-signing'];
// The real binary, not `npx depcruise` — npx resolves a dependency-confusion
// placeholder whenever the cwd is outside this repo, and prints success-ish
// noise while cruising nothing.
export const DEPCRUISE = join(ROOT, 'node_modules/.bin/depcruise');

export function runBoundaryCruise(root = ROOT) {
  const out = join(tmpdir(), `module-boundaries-${process.pid}.json`);
  try {
    execFileSync(
      DEPCRUISE,
      // hf/neumo are not in the public repo; cruise only packages on disk.
      [...SCAN.filter((p) => existsSync(join(root, p))), '--config', CONFIG, '-T', 'json', '-f', out],
      { cwd: root, stdio: 'pipe' }
    );
    return JSON.parse(readFileSync(out, 'utf8')).summary;
  } finally {
    rmSync(out, { force: true });
  }
}

function main() {
  let summary;
  try {
    summary = runBoundaryCruise();
  } catch (e) {
    console.error('module-boundaries: depcruise did not run —', e.message);
    process.exit(1);
  }

  if (!summary || !summary.totalCruised) {
    console.error('module-boundaries: depcruise cruised nothing; gate cannot vouch for anything');
    process.exit(1);
  }

  const breaches = summary.violations || [];
  if (!breaches.length) {
    console.log(`module-boundaries OK (${summary.totalCruised} modules, ${SCAN.length} packages)`);
    return;
  }

  console.error('module-boundaries: forbidden cross-module imports:');
  for (const b of breaches) {
    console.error(`  [${b.rule.name}] ${b.from} -> ${b.to}`);
  }
  process.exit(1);
}

if (import.meta.main) main();
