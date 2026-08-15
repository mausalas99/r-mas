import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { BOOT_GRAPH_DEBT_PER_IMPORT, BOOT_HUBS } from './constants.mjs';

/** Post BN-10: must only load via dynamic import(), not boot hub static import. */
export const BOOT_LAZY_ONLY_SUFFIXES = [
  'features/settings-help/index.mjs',
  'features/platform/index.mjs',
  'features/settings-help.mjs',
  'features/platform.mjs',
  'features/lab-panel.mjs',
  'features/tendencias.mjs',
  'features/estado-actual-charts-modal.mjs',
  'features/estado-actual-vital-history-modal.mjs',
  'features/clinical-entrega.mjs',
  'features/settings-help/tour-flow.mjs',
  'features/settings-help/tour-engine.mjs',
  'features/settings-help/settings-dropdown.mjs',
  'features/platform/audit.mjs',
  'features/platform/import-backup.mjs',
  'features/platform/offline.mjs',
];

function normalizeBootImportPath(from) {
  var p = String(from || '').replace(/\\/g, '/');
  if (p.startsWith('./')) p = p.slice(2);
  if (p.startsWith('public/js/')) p = p.slice('public/js/'.length);
  if (!p.endsWith('.mjs') && !p.endsWith('.js')) p += '.mjs';
  return p;
}

/**
 * @param {ReturnType<typeof collectBootStaticImports>} imports
 * @param {string[]} [denylist]
 */
export function findBootLazyOnlyViolations(imports, denylist = BOOT_LAZY_ONLY_SUFFIXES) {
  const violations = [];
  for (const row of imports) {
    if (row.isDynamic) continue;
    const norm = normalizeBootImportPath(row.from);
    for (const banned of denylist) {
      if (norm === banned || norm.endsWith('/' + banned)) {
        violations.push({ hub: row.hub, from: row.from, banned });
      }
    }
  }
  return violations;
}

const STATIC_RE = /import\s+(?![.(])[\s\S]*?from\s+['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

export function collectBootStaticImports(root) {
  const out = [];
  for (const rel of BOOT_HUBS) {
    const abs = path.join(root, rel);
    const src = fs.readFileSync(abs, 'utf8');
    let m;
    STATIC_RE.lastIndex = 0;
    while ((m = STATIC_RE.exec(src))) {
      out.push({ hub: rel, from: m[1], isDynamic: false });
    }
    DYNAMIC_RE.lastIndex = 0;
    while ((m = DYNAMIC_RE.exec(src))) {
      out.push({ hub: rel, from: m[1], isDynamic: true });
    }
  }
  return out.sort((a, b) => a.hub.localeCompare(b.hub) || a.from.localeCompare(b.from));
}

export function hashBootGraph(imports) {
  const staticOnly = imports.filter((i) => !i.isDynamic).map((i) => `${i.hub}:${i.from}`);
  return crypto.createHash('sha256').update(staticOnly.join('\n')).digest('hex').slice(0, 16);
}

export function bootGraphDebtDelta(currentImports, baselineImports) {
  const key = (i) => `${i.hub}:${i.from}`;
  const base = new Set((baselineImports || []).filter((i) => !i.isDynamic).map(key));
  const cur = currentImports.filter((i) => !i.isDynamic);
  let added = 0;
  for (const i of cur) {
    if (!base.has(key(i))) added += 1;
  }
  return added * BOOT_GRAPH_DEBT_PER_IMPORT;
}

const META_REL = 'public/js/app.bundle.meta.json';

/**
 * Eager boot payload from the esbuild metafile: entry chunk plus every chunk
 * reachable by `import-statement` (not `dynamic-import`).
 * @returns {{ files: string[], modules: string[], bytes: number }}
 */
export function collectEagerBundleSet(root) {
  const metaPath = path.join(root, META_REL);
  if (!fs.existsSync(metaPath)) {
    throw new Error(`${META_REL} missing — run: npm run build:ui`);
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const outputs = meta.outputs || {};
  const entry = Object.keys(outputs).find(
    (k) => k.endsWith('app.bundle.js') || k.endsWith('app.bundle.mjs')
  );
  if (!entry) throw new Error('app.bundle entry not found in metafile');

  const files = new Set([entry]);
  const stack = [entry];
  while (stack.length) {
    const cur = stack.pop();
    for (const imp of (outputs[cur] || {}).imports || []) {
      if (imp.kind !== 'import-statement') continue;
      if (files.has(imp.path)) continue;
      files.add(imp.path);
      stack.push(imp.path);
    }
  }

  const modules = new Set();
  let bytes = 0;
  for (const f of files) {
    bytes += (outputs[f] || {}).bytes || 0;
    for (const input of Object.keys((outputs[f] || {}).inputs || {})) modules.add(input);
  }
  return { files: [...files].sort(), modules: [...modules].sort(), bytes };
}

/**
 * Lazy-only modules that are nonetheless statically reachable at boot.
 * @param {string[]} eagerModules
 */
export function findEagerLazyOnlyModules(eagerModules, denylist = BOOT_LAZY_ONLY_SUFFIXES) {
  const hits = [];
  for (const mod of eagerModules) {
    const norm = normalizeBootImportPath(mod);
    for (const banned of denylist) {
      if (norm === banned || norm.endsWith('/' + banned)) hits.push({ module: mod, banned });
    }
  }
  return hits;
}
