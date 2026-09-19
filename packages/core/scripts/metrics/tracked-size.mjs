import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { GATE_EXCLUDED_RE } from './constants.mjs';

const SRC_RE = /\.(mjs|js|cjs)$/;
const TEST_RE = /\.test\.(mjs|js|cjs)$/;
const MODULE_RE =
  /^(packages\/core\/)?(public\/js\/|lib\/|cloud\/[^/]+-worker\/|scripts\/|main\.js$|preload\.js$|server\.js$|generate-)/;

/**
 * Count tracked text LOC and product module files (git ls-files only).
 * @param {string} root
 */
export function measureTrackedSize(root) {
  // Root-level bridge symlinks (main.js, preload.js, generate-*.js) point at a
  // real file also tracked at its own path under packages/core — readFileSync
  // follows the symlink, so counting both would double the real file's LOC.
  const files = execSync('git ls-files -s', { cwd: root, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+)\s+\S+\s+\S+\s+(.+)$/);
      return m ? { mode: m[1], rel: m[2] } : null;
    })
    .filter((f) => f && f.mode !== '120000')
    .map((f) => f.rel)
    .filter((rel) => !GATE_EXCLUDED_RE.test(rel));
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
  return { trackedLoc, moduleCount, fileCount: files.length };
}
