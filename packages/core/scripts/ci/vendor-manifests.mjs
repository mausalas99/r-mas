#!/usr/bin/env node
/**
 * HF and Neumo copy core files by `scripts/vendor-core-manifest.json`
 * (see their `scripts/vendor-core.mjs`). Two ways core breaks them:
 *   1. A manifest entry names a file core no longer has.
 *   2. A copied file imports a file the package does not have (not in its
 *      manifest, not its own file).
 * This check reports both. Packages that are absent (CI) are skipped.
 *
 *   node scripts/ci/vendor-manifests.mjs          # check
 *   node scripts/ci/vendor-manifests.mjs --write  # drop dead entries, add missing imports
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './forbid-lan-imports.mjs';

const PACKAGES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CODE = /\.(mjs|js|cjs|jsx)$/;
const IMPORT = /(?:\bfrom|\bimport)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g;

export function checkPackage(pkg, { write = false, packages = PACKAGES } = {}) {
  const manifestPath = path.join(packages, pkg, 'scripts/vendor-core-manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  const core = path.join(packages, 'core');
  const own = path.join(packages, pkg);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const set = new Set(manifest);
  const dead = manifest.filter((rel) => !fs.existsSync(path.join(core, rel)));
  for (const rel of dead) set.delete(rel);
  const missing = new Set();
  const queue = [...set].filter((rel) => CODE.test(rel) && !/\.test\./.test(rel));
  for (let rel; (rel = queue.pop()); ) {
    const src = stripComments(fs.readFileSync(path.join(core, rel), 'utf8'));
    for (const m of src.matchAll(IMPORT)) {
      const target = path.posix.join(path.posix.dirname(rel), m[1]);
      if (set.has(target) || missing.has(target) || fs.existsSync(path.join(own, target))) continue;
      if (!fs.existsSync(path.join(core, target))) continue; // not a core file; Node resolution is not our business
      missing.add(target);
      if (write) set.add(target);
      if (CODE.test(target)) queue.push(target);
    }
  }
  if (write) { // keep each file's own layout (HF is indented, Neumo is one line) so their diffs stay small
    const raw = fs.readFileSync(manifestPath, 'utf8');
    fs.writeFileSync(manifestPath, JSON.stringify([...set], null, raw.includes('\n[') || raw.startsWith('[\n') ? 2 : 0) + (raw.endsWith('\n') ? '\n' : ''));
  }
  return { dead, missing: [...missing].sort() };
}

if (import.meta.main) {
  const write = process.argv.includes('--write');
  let bad = 0;
  for (const pkg of ['hf', 'neumo']) {
    const r = checkPackage(pkg, { write });
    if (!r) { console.log(`vendor-manifests: ${pkg} absent, skipped.`); continue; }
    for (const rel of r.dead) console.error(`${pkg}: manifest lists a file core lacks: ${rel}`);
    for (const rel of r.missing) console.error(`${pkg}: copied file imports a file not copied: ${rel}`);
    if (!write) bad += r.dead.length + r.missing.length;
    else console.log(`${pkg}: removed ${r.dead.length}, added ${r.missing.length}.`);
  }
  if (bad) process.exit(1);
}
