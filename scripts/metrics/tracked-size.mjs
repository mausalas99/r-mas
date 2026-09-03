import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const SRC_RE = /\.(mjs|js|cjs)$/;
const TEST_RE = /\.test\.(mjs|js|cjs)$/;
const MODULE_RE =
  /^(public\/js\/|lib\/|cloud\/[^/]+-worker\/|scripts\/|main\.js$|preload\.js$|server\.js$|generate-)/;

/**
 * Count tracked text LOC and product module files (git ls-files only).
 * @param {string} root
 */
export function measureTrackedSize(root) {
  const files = execSync('git ls-files', { cwd: root, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
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
