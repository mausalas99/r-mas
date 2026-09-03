#!/usr/bin/env node
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Build scripts whose output must stay gitignored. */
const OUTPUTS = [
  'public/index.html',
  'public/js/app.bundle.mjs',
  'public/js/chunks',
  'public/styles/app.bundle.css',
  'cloud/sync-pages/public',
  'cloud/equipos-pages/public',
];

/**
 * A directory-only gitignore pattern (trailing `/`) only matches a bare path
 * if git can tell it's a directory — which it can't on a fresh checkout
 * where the path doesn't exist yet (exactly CI's case). Retry with a
 * trailing slash so the check doesn't depend on the path already existing.
 */
function isIgnored(rel) {
  for (const query of [rel, rel + '/']) {
    try {
      execSync('git check-ignore -q -- ' + query, { cwd: ROOT });
      return true;
    } catch {
      /* try next form */
    }
  }
  return false;
}

const leaked = OUTPUTS.filter((rel) => !isIgnored(rel));
if (leaked.length) {
  console.error('Build output is tracked (must be gitignored):');
  for (const rel of leaked) console.error('  ' + rel);
  process.exit(1);
}
console.log('build-output-ignored OK');
