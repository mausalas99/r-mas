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

function isIgnored(rel) {
  try {
    execSync('git check-ignore -q -- ' + rel, { cwd: ROOT });
    return true;
  } catch {
    return false;
  }
}

const leaked = OUTPUTS.filter((rel) => !isIgnored(rel));
if (leaked.length) {
  console.error('Build output is tracked (must be gitignored):');
  for (const rel of leaked) console.error('  ' + rel);
  process.exit(1);
}
console.log('build-output-ignored OK');
