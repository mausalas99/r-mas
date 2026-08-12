#!/usr/bin/env node
/**
 * CI gate: fail if production sources reintroduce LAN LiveSync imports.
 * Excludes docs/, *.test.*, scripts/ci self, and comment-only mentions.
 * `/api/lan/v1` is only forbidden in client graphs (public/js, cloud/) —
 * server may keep a 410 Gone stub.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

/** @type {{ name: string, re: RegExp, clientOnly?: boolean }[]} */
export const FORBIDDEN_RULES = [
  { name: 'features/lan', re: /from\s+['"][^'"]*features\/lan(?:\/|['"])/ },
  { name: 'lan-squad-import', re: /(?:from\s+['"][^'"]*lan-squad|require\(\s*['"][^'"]*lan-squad)/ },
  { name: '/api/lan/v1', re: /['"`]\/api\/lan\/v1/, clientOnly: true },
];

/** @param {string} relPath */
export function shouldScanPath(relPath) {
  const p = String(relPath || '').replace(/\\/g, '/');
  if (!p) return false;
  if (p.startsWith('docs/')) return false;
  if (p.startsWith('scripts/ci/')) return false;
  if (/\.test\.[cm]?js$/.test(p) || /\.spec\.[cm]?js$/.test(p)) return false;
  if (p.includes('/node_modules/') || p.startsWith('node_modules/')) return false;
  if (p.includes('/dist/') || p.startsWith('dist/')) return false;
  if (/\.(map|md|txt|json)$/.test(p)) return false;
  return /\.(mjs|js|cjs)$/.test(p);
}

/** @param {string} src */
export function stripComments(src) {
  return String(src || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[\s;{}()[\],=])\/\/[^\n]*/g, '$1');
}

/** @param {string} src */
export function stripDevWardBlocks(src) {
  return String(src || '').replace(
    /if\s*\(\s*process\.env\.R_PLUS_DEV_WARD_SERVER[\s\S]*?\{[\s\S]*?\n\}/g,
    ''
  );
}

/** @param {string} relPath */
function isClientGraph(relPath) {
  const p = String(relPath || '').replace(/\\/g, '/');
  return p.startsWith('public/js/') || p.startsWith('cloud/');
}

/**
 * @param {string} source
 * @param {string} relPath
 */
export function scanSourceForForbiddenLanImports(source, relPath) {
  if (!shouldScanPath(relPath)) return [];
  let body = stripComments(source);
  if (String(relPath).replace(/\\/g, '/').endsWith('server.js')) {
    body = stripDevWardBlocks(body);
  }
  /** @type {{ path: string, rule: string, line: number, excerpt: string }[]} */
  const hits = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const rule of FORBIDDEN_RULES) {
      if (rule.clientOnly && !isClientGraph(relPath)) continue;
      if (rule.re.test(line)) {
        hits.push({
          path: relPath,
          rule: rule.name,
          line: i + 1,
          excerpt: line.trim().slice(0, 160),
        });
      }
    }
  }
  return hits;
}

/** @param {string} dir @param {string[]} out */
function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === 'dist' || name === '.git' || name === 'coverage') continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
}

export function collectScanFiles(root = ROOT) {
  const roots = ['public/js', 'lib', 'cloud', 'scripts'].map((p) => join(root, p));
  const files = [join(root, 'server.js'), join(root, 'main.js'), join(root, 'preload.js')];
  for (const r of roots) walk(r, files);
  return files
    .map((abs) => relative(root, abs).replace(/\\/g, '/'))
    .filter(shouldScanPath);
}

export function scanRepoForForbiddenLanImports(root = ROOT) {
  /** @type {{ path: string, rule: string, line: number, excerpt: string }[]} */
  const hits = [];
  for (const rel of collectScanFiles(root)) {
    let src;
    try {
      src = readFileSync(join(root, rel), 'utf8');
    } catch {
      continue;
    }
    hits.push(...scanSourceForForbiddenLanImports(src, rel));
  }
  return hits;
}

function main() {
  const hits = scanRepoForForbiddenLanImports();
  if (!hits.length) {
    console.log('forbid-lan-imports: ok (0 hits)');
    process.exit(0);
  }
  console.error('forbid-lan-imports: forbidden LAN LiveSync references:');
  for (const h of hits) {
    console.error(`  ${h.path}:${h.line} [${h.rule}] ${h.excerpt}`);
  }
  process.exit(1);
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('forbid-lan-imports.mjs') ||
    process.argv[1].endsWith('forbid-lan-imports.js'));
if (isMain) main();
