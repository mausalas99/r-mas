import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectBootStaticImports,
  findBootLazyOnlyViolations,
  collectEagerBundleSet,
  findEagerLazyOnlyModules,
} from '../../scripts/metrics/boot-graph.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function parseNamedImports(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const out = [];
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const from = m[2];
    const names = m[1]
      .split(',')
      .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    out.push({ from, names });
  }
  return out;
}

function collectExportedNames(filePath, visited = new Set()) {
  const abs = path.resolve(filePath);
  if (visited.has(abs)) return new Set();
  visited.add(abs);

  const src = fs.readFileSync(abs, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    m[1].split(',').forEach((part) => {
      const chunk = part.trim();
      if (!chunk) return;
      const alias = chunk.split(/\s+as\s+/);
      names.add(alias[alias.length - 1].trim());
    });
  }
  for (const m of src.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g)) {
    const reExport = resolveImport(path.dirname(abs), m[1]);
    if (reExport && fs.existsSync(reExport)) {
      for (const n of collectExportedNames(reExport, visited)) names.add(n);
    }
  }
  return names;
}

function resolveImport(baseDir, from) {
  if (!from.startsWith('.')) return null;
  const rel = from.endsWith('.mjs') || from.endsWith('.js') ? from : from + '.mjs';
  return path.resolve(baseDir, rel);
}

for (const bootFile of ['app.js', 'app-shell.mjs', 'app-runtimes.mjs']) {
  test(bootFile + ' — imports nombrados existen en el módulo destino', () => {
    const baseDir = __dirname;
    const bootPath = path.join(baseDir, bootFile);
    const imports = parseNamedImports(bootPath);
    const missing = [];

    for (const { from, names } of imports) {
      const target = resolveImport(baseDir, from);
      if (!target || !fs.existsSync(target)) continue;
      const exports = collectExportedNames(target);
      for (const name of names) {
        if (!exports.has(name)) missing.push({ from, name });
      }
    }

    assert.equal(
      missing.length,
      0,
      missing.map((x) => `${bootFile}: ${x.name} no exportado en ${x.from}`).join('\n')
    );
  });
}

test('app-shell.mjs no corrompe literales settings-* ni rpc-settings', () => {
  const src = fs.readFileSync(path.join(__dirname, 'app-shell.mjs'), 'utf8');
  assert.doesNotMatch(src, /rpc-shellCtx|shellCtx\.getSettings\(\)-/);
});

test('register* helpers use the same param name in signature and body', () => {
  const root = __dirname;
  const mismatches = [];
  const re = /export function (register\w+)\((partial|ctx)\)\s*\{([\s\S]{0,400}?)\n\}/g;

  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules') continue;
        walk(p);
        continue;
      }
      if (!ent.name.endsWith('.mjs')) continue;
      const src = fs.readFileSync(p, 'utf8');
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(src))) {
        const name = m[1];
        const param = m[2];
        const body = m[3];
        if (param === 'partial' && (/\bctx\b/.test(body) && !/\bpartial\b/.test(body))) {
          mismatches.push(`${path.relative(root, p)}:${name} declares partial but body uses ctx`);
        }
        if (param === 'ctx' && (/\bpartial\b/.test(body) && !/\bctx\b/.test(body))) {
          mismatches.push(`${path.relative(root, p)}:${name} declares ctx but body uses partial`);
        }
      }
    }
  }

  walk(root);
  assert.equal(mismatches.length, 0, mismatches.join('\n'));
});

test('boot hubs do not eagerly import lazy-only feature shells (BN-12)', () => {
  const imports = collectBootStaticImports(REPO_ROOT);
  const violations = findBootLazyOnlyViolations(imports);
  assert.equal(
    violations.length,
    0,
    violations
      .map((v) => `${v.hub} must not import ${v.from} (lazy route — use lazy-feature-routes.mjs)`)
      .join('\n')
  );
});

/** Update only with a measured win. Never raise without a note in the commit message. */
/** Budget measured after Steps 4–5 (dynamic release-notes, leaf lab-set-date).
 * Unminified (build:ui); releases use --prod. See Step 6 caveat. */
/** Budget after Step 4b (closeReleaseNotes extraction). Unminified (build:ui). */
/** Budget measured for 8.1.4: indicaciones smart-paste kind (paste-smart-model.mjs,
 * paste-smart.mjs, medications-actions.mjs), min-version-fetch Worker awareness,
 * labs-cultivo MICROORGANISMO truncation fix, stable-downgrade-ui fallback change.
 * All eager, none of it lazy-loadable (core paste/labs paths). +269 B over prior budget. */
/** +248 B: cloud-lab-sidecar-index batches fingerprint/poison index reads
 * (O(1) instead of per-lab-set) in buildDirtyLabSidecarOpsForPatient. Eager path. */
/** Budget for 8.1.5: ⌘⇧C copy-team-labs.mjs and copy-team-estado-actual.mjs
 * (patients-list shortcuts, app-shell-keyboard.mjs). Both eager — invoked from
 * the always-mounted shell keyboard handler, same tier as the other named
 * shortcuts in that file. +14376 B / +4 files over prior budget. */
/** Budget for 8.1.6: lab-paste-modal.mjs (header-button "Pegar SOME" modal,
 * replacing the inline <details> disclosure) plus the trend-lookup and
 * censo-labs-format fixes. Eager — mounted from the always-open Laboratorio
 * card header. +58939 B / +7 files over prior budget. */
/** +6941 B / +1 file: expediente-cultivos-table.mjs now imports
 * normalizeLabLine from lab-history-auto-store-core.mjs to key cultivo-row
 * dedupe. Eager — cultivos table is always-mounted in the expediente. */
const EAGER_BOOT_BUDGET_BYTES = 3449629;
const EAGER_BOOT_BUDGET_FILES = 98;

/**
 * Pre-existing eager/lazy-only conflicts, not introduced by the startup-lag
 * pass (docs/superpowers/plans/2026-08-15-startup-lag-optimization.md).
 * Each needs its own edge fix (see that plan's Step 6 for the pattern:
 * extract the boot-needed piece to a leaf module). Do not add to this list
 * to silence a *new* violation — fix the import instead.
 */
const KNOWN_EAGER_LAZY_ONLY = new Set([
  'features/clinical-entrega.mjs',
  'features/lab-panel.mjs',
  'features/platform/audit.mjs',
  'features/platform/import-backup.mjs',
  'features/platform/offline.mjs',
  'features/settings-help/settings-dropdown.mjs',
]);

test('boot bundle: no lazy-only feature is statically reachable (BN-12 transitive)', () => {
  const eager = collectEagerBundleSet(REPO_ROOT);
  const hits = findEagerLazyOnlyModules(eager.modules);
  const newHits = hits.filter((h) => !KNOWN_EAGER_LAZY_ONLY.has(h.banned));
  assert.equal(
    newHits.length,
    0,
    newHits
      .map((h) => `${h.module} is eager but listed lazy-only (${h.banned}) — new regression`)
      .join('\n') + '\nRun: node scripts/metrics/why-eager.mjs <module> to find the edge.'
  );
});

test('boot bundle: eager payload stays inside budget', () => {
  const eager = collectEagerBundleSet(REPO_ROOT);
  assert.ok(
    eager.bytes <= EAGER_BOOT_BUDGET_BYTES,
    `eager boot payload ${eager.bytes} B > budget ${EAGER_BOOT_BUDGET_BYTES} B ` +
      `(${eager.files.length} files). Make the new import dynamic, or justify raising the budget.`
  );
  assert.ok(
    eager.files.length <= EAGER_BOOT_BUDGET_FILES,
    `eager chunk count ${eager.files.length} > budget ${EAGER_BOOT_BUDGET_FILES}`
  );
});
