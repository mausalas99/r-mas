#!/usr/bin/env node
/**
 * Report-only. `packages/hf` and `packages/neumo` each carry a full,
 * independent copy of most of `packages/core` on purpose (the owner's
 * "separate module, like HF" call) — DUPLICATE_GATE_EXCLUDED_RE keeps both
 * out of no-duplicate-files.mjs, so nothing ever told anyone when a fix
 * landed only in core's copy of a file. That already
 * happened twice: a persist error-swallowing bug and a missing lazy-import
 * `.catch`, both fixed in core, both still live in hf/neumo until a session
 * happened to notice.
 *
 * This flags it going forward: for every packages/core file this branch
 * changed, if hf's or neumo's copy at the same path matched core's *old*
 * content but no longer matches the *new* content, this PR just created a
 * drift a reviewer should decide whether to port. Never fails the build —
 * whether to port a fix is a human call, not a gate.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const MODULES = ['hf', 'neumo'];
const CORE_RE = /^packages\/core\//;

function hash(buf) {
  return createHash('md5').update(buf).digest('hex');
}

function readAtRef(root, ref, rel) {
  try {
    return execFileSync('git', ['show', `${ref}:${rel}`], { cwd: root, stdio: 'pipe' });
  } catch {
    return null;
  }
}

function changedFilesAgainst(root, base) {
  try {
    return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** @returns {string[]} one report line per file this branch drifted from a twin it used to match. */
export function findDrifts(root = ROOT, base = 'main') {
  const changed = changedFilesAgainst(root, base).filter((p) => CORE_RE.test(p));
  const drifts = [];

  for (const coreRel of changed) {
    const relPath = coreRel.slice('packages/core/'.length);
    const corePath = join(root, coreRel);
    if (!existsSync(corePath)) continue; // deleted in this branch
    const newCoreHash = hash(readFileSync(corePath));
    const oldCoreBuf = readAtRef(root, base, coreRel);
    if (!oldCoreBuf) continue; // new file, no twin to have drifted from
    const oldCoreHash = hash(oldCoreBuf);
    if (oldCoreHash === newCoreHash) continue; // this branch didn't actually change it

    for (const mod of MODULES) {
      const twinRel = `packages/${mod}/${relPath}`;
      const twinPath = join(root, twinRel);
      if (!existsSync(twinPath)) continue;
      const twinHash = hash(readFileSync(twinPath));
      if (twinHash === oldCoreHash && twinHash !== newCoreHash) {
        drifts.push(`  ${coreRel} -> ${twinRel} (was byte-identical, this PR breaks it)`);
      }
    }
  }
  return drifts.sort();
}

function main() {
  const drifts = findDrifts();
  if (drifts.length) {
    console.log('core-drift-report: this PR diverges core from a twin it still copies:');
    for (const line of drifts) console.log(line);
    console.log('Not a failure — decide whether the module needs the same fix.');
  } else {
    console.log('core-drift-report: no new drift from hf/neumo twins');
  }
}

if (import.meta.main) main();
