#!/usr/bin/env node
/**
 * CI gate: Preact files must not write HTML strings. A file counts as Preact when it is `.jsx`/`.tsx`
 * or imports from 'preact'. Old files with ~8,500 `innerHTML` writes are not Preact files, so they
 * are not flagged. Forbidden in Preact files: `.innerHTML`, `.outerHTML`, `insertAdjacentHTML`,
 * `dangerouslySetInnerHTML`, `document.write`. Escape hatch: list the path in
 * scripts/ci/preact-innerhtml-allowlist.txt (keep it empty; a line there needs the owner's OK).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { stripComments } from './forbid-lan-imports.mjs';

const ROOT = process.cwd();
const FORBIDDEN = /\.(?:innerHTML|outerHTML)\b|\binsertAdjacentHTML\b|\bdangerouslySetInnerHTML\b|\bdocument\.write\s*\(/;
const PREACT_IMPORT = /from\s+['"]preact(?:\/[^'"]*)?['"]/;

/** @param {string} relPath @param {string} source */
export function isPreactFile(relPath, source) {
  const p = String(relPath || '').replace(/\\/g, '/');
  if (!p.startsWith('public/js/') || p.startsWith('public/js/chunks/')) return false;
  if (/\.test\.[cm]?[jt]sx?$/.test(p) || /app\.bundle/.test(p)) return false;
  if (/\.[jt]sx$/.test(p)) return true;
  return /\.(mjs|js)$/.test(p) && PREACT_IMPORT.test(source);
}

/** @param {string} source @param {string} relPath @returns {{ path: string, line: number, excerpt: string }[]} */
export function scanPreactSource(source, relPath) {
  if (!isPreactFile(relPath, source)) return [];
  const hits = [];
  stripComments(source).split('\n').forEach((line, i) => {
    if (FORBIDDEN.test(line)) hits.push({ path: relPath, line: i + 1, excerpt: line.trim().slice(0, 160) });
  });
  return hits;
}

/** @param {string} dir @param {string[]} out */
function walk(dir, out) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (name === 'node_modules' || name === 'chunks') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
}

/** @param {string} [root] */
export function loadAllowlist(root = ROOT) {
  try {
    return new Set(
      readFileSync(join(root, 'scripts/ci/preact-innerhtml-allowlist.txt'), 'utf8')
        .split('\n')
        .map((l) => l.replace(/#.*/, '').trim())
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

/** @param {string} [root] */
export function scanRepoForPreactInnerHtml(root = ROOT) {
  const allow = loadAllowlist(root);
  const files = [];
  walk(join(root, 'public/js'), files);
  const hits = [];
  for (const abs of files) {
    const rel = relative(root, abs).replace(/\\/g, '/');
    if (allow.has(rel) || !/\.(mjs|js|jsx|tsx)$/.test(rel)) continue;
    hits.push(...scanPreactSource(readFileSync(abs, 'utf8'), rel));
  }
  return hits;
}

function main() {
  const hits = scanRepoForPreactInnerHtml();
  if (!hits.length) {
    console.log('no-innerhtml-in-preact: ok (0 hits)');
    process.exit(0);
  }
  console.error('no-innerhtml-in-preact: Preact files must render with JSX, not HTML strings:');
  for (const h of hits) console.error(`  ${h.path}:${h.line} ${h.excerpt}`);
  process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('no-innerhtml-in-preact.mjs')) main();
