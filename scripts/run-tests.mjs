#!/usr/bin/env node
/**
 * Discover tracked test files via git ls-files and run node --test.
 * Replaces the hand-maintained file list in package.json (audit M0).
 */
import { spawnSync } from 'node:child_process';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function discoverTestFiles() {
  const out = execSync("git ls-files '*.test.js' '*.test.mjs' '*.test.cjs'", {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return out
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort();
}

function main() {
  const args = process.argv.slice(2);
  const onlyIdx = args.indexOf('--only');
  let files = discoverTestFiles();

  if (onlyIdx !== -1) {
    const pattern = args[onlyIdx + 1];
    if (!pattern) {
      console.error('run-tests: --only requires a substring or regex pattern');
      process.exit(2);
    }
    let re;
    try {
      re = new RegExp(pattern);
    } catch {
      re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    files = files.filter((f) => re.test(f));
  }

  if (!files.length) {
    console.error('run-tests: no test files matched');
    process.exit(1);
  }

  console.error(`run-tests: ${files.length} file(s)`);
  const result = spawnSync(process.execPath, ['--test', ...files], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}

main();
