import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { SIZE_GATE_EXCLUDED_RE } from './constants.mjs';

const SRC_RE = /\.(mjs|js|cjs)$/;
// .e2e.mjs scenarios are tests too, not product modules.
const TEST_RE = /\.(test|e2e)\.(mjs|js|cjs)$/;
// Every workspace package (core, shared-signing, hf, neumo) gets the same
// prefix alternation — a package left out here undercounts its moduleCount
// silently even once SIZE_GATE_EXCLUDED_RE stops excluding it (found
// 2026-09-21 measuring the hf/neumo ceiling extension: hf/neumo were never
// in this list, so widening the gate's exclusion alone would have left
// their module count at 0).
export const MODULE_RE =
  /^(packages\/(core|shared-signing|hf|neumo)\/)?(public\/js\/|lib\/|cloud\/[^/]+-worker\/|scripts\/|main\.js$|preload\.js$|server\.js$|generate-)/;

// Documentation is outside the ratchet (see SIZE_GATE_EXCLUDED_RE), so its
// size is reported and never compared. Nothing here can fail a gate.
const DOCS_RE = /^docs\//;

/**
 * Count tracked text LOC and product module files (git ls-files only).
 * @param {string} root
 */
export function measureTrackedSize(root) {
  // Root-level bridge symlinks (main.js, preload.js, generate-*.js) point at a
  // real file also tracked at its own path under packages/core — readFileSync
  // follows the symlink, so counting both would double the real file's LOC.
  const allFiles = execSync('git ls-files -s', { cwd: root, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+)\s+\S+\s+\S+\s+(.+)$/);
      return m ? { mode: m[1], rel: m[2] } : null;
    })
    .filter((f) => f && f.mode !== '120000')
    .map((f) => f.rel);
  const files = allFiles.filter((rel) => !SIZE_GATE_EXCLUDED_RE.test(rel));
  let trackedLoc = 0;
  let moduleCount = 0;
  for (const rel of files) {
    const abs = path.join(root, rel);
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    if (text.includes('\u0000')) continue;
    trackedLoc += text.split('\n').length;
    if (SRC_RE.test(rel) && !TEST_RE.test(rel) && MODULE_RE.test(rel)) {
      moduleCount += 1;
    }
  }
  const docsFiles = allFiles.filter((rel) => DOCS_RE.test(rel));
  let docsLoc = 0;
  for (const rel of docsFiles) {
    let text;
    try {
      text = fs.readFileSync(path.join(root, rel), 'utf8');
    } catch {
      continue;
    }
    // Two .docx plan attachments live under docs/.
    if (text.includes('\u0000')) continue;
    docsLoc += text.split('\n').length;
  }
  return {
    trackedLoc,
    moduleCount,
    fileCount: files.length,
    docsLoc,
    docsFileCount: docsFiles.length,
  };
}
