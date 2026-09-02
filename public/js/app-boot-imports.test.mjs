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
/** +1023 B / +0 files: 8.1.6 release-notes-highlights.mjs curated entries
 * (RELEASE_NOTES_816). Same eager module, no new import. */
/** +1680 B / +0 files: 8.1.7. labs-display.mjs (renderEntry, always-eager lab
 * render path) now imports insertSpaceAfterCultivoKeyword_ from
 * labs-cultivo-scan.mjs to fix glued cultivo headers ("UROCULTIVOPOR SONDA");
 * labs-cultivo-scan.mjs was already eager via labs-cultivo.mjs, no new file.
 * Plus RELEASE_NOTES_817 curated entries. */
/** +248 B / +0 files: 8.1.7. Cerrar-sesión-no-borra-la-sala + auto-install-on-idle
 * changes in session-manager.mjs, cloud-sync/settings.mjs,
 * clinical-access-runtime/lifecycle.mjs, features/platform/updater/*.mjs — all
 * already-eager modules on the boot path, no new imports. */
/** +827 B / +0 files: boot-speed-debt Phase 1 (2026-08-22). app.js now defers
 * the initTabBarMotion() call (tab-bar slide-indicator setup) to run after
 * paint (double-rAF, inlined to avoid a new boot-hub import) instead of
 * inline in runDeferredShellAfterOnboarding, plus perf.mark()
 * instrumentation around the deferred-shell boot sequence. ui-tab-motion.mjs
 * itself stays eager (already required, statically, by expediente-
 * navigation.mjs/expediente-inner-cache.mjs/app-tabs.mjs for the tab
 * indicator's correct first-paint position) — only the resize-observer +
 * rAF wiring inside initTabBarMotion() moves off the synchronous paint path.
 * No new eager file or import. */
// Raised for 8.1.8: remote-patient-delete-confirm actor-name lookup + gaso electrolyte fallback.
/** +276 B / +1 file: 8.1.8. labs-chemistry.mjs (parseESC_, always-eager lab
 * parse path) now imports computeCorrectedCalcium_ from the new
 * labs-calcium-corrected.mjs to compute cCa (corrected calcium) inline in
 * the ESC line, alongside the existing raw Ca. Eager — same tier as the rest
 * of parseESC_'s electrolyte extraction. */
/** +2372 B / +0 files: 8.1.9. BUN/CR ratio calc in labs-chemistry.mjs
 * (parseQS_, always-eager lab parse path); Tendencias copy-chart-as-PNG
 * (tend-export-render.mjs, tend-export.mjs) and drag-to-reorder legend
 * (tend-prefs.mjs, tend-group-charts-render.mjs) — all already-eager
 * modules on the boot path, no new imported files. */
/** +13590 B / +9 files: 8.2.0. Two already-decided pieces landing together —
 * Stage B.1 boot-debt work (app-tabs.mjs/expediente-navigation.mjs edge cuts,
 * docs/superpowers/plans/2026-08-23-boot-debt-phase3-stage-b.md — confirmed
 * that plan itself does not shrink the eager bundle, Stage B.2 needed for the
 * win and the user decided to stop there) and ui-motion.mjs's
 * appendExitingRows() (row exit-animation for census/pendientes, already-eager
 * chain via guardia-census-table.mjs/todos-list-render.mjs). Neither is a new
 * eager root; both were flagged and left for the committing session to
 * reconcile per docs/superpowers/plans/2026-08-23-boot-debt-phase2-phase3a.md. */
/** +24 B / +0 files: 8.2.0. app-version.mjs (caches getAppVersion() once for the
 * fleet-adoption version stamp sent on login/register) added to api-client.mjs,
 * already-eager on the sync boot path — no new eager file. */
/** +70 B / +0 files: api-client.mjs now stamps X-App-Version on every request,
 * not just login (session.js server side) — already-eager, no new eager file. */
/** +741 B / +0 files: 8.2.1. noteCloudLabSidecarOpsSent (cloud-lab-sidecar-index.mjs,
 * already-eager Nube push path) fixes heavy lab sets resyncing on every push —
 * fingerprints the pre-trim value, not the sent one. Plus RELEASE_NOTES_821
 * curated entries in the already-eager release-notes-highlights.mjs. */
/** +42308 B / +6 files: 8.2.2. Interconsulta team board redesign
 * (docs/superpowers/plans/2026-08-25-interconsulta-team-board.md) — the board
 * is now IC mode's main window, not a lazy sidebar list, so
 * interconsulta-team-board.mjs, interconsulta-mode-chrome.mjs's new bulk,
 * interconsulta-demo-toggle.mjs/-demo-state.mjs (⌥⌘⇧I demo seed),
 * interconsult-catalog.mjs, and the lib/clinical-scope board-buckets/
 * team-roles/interconsultas builders are all eager on the IC-mode boot path. */
/** +4795 B / +0 files: 8.2.2. "+ Agregar" board-header button
 * (interconsulta-mode-chrome.mjs, wired to the already-eager
 * patients-modal.mjs's openAddModal — no new eager file) plus the fixed
 * 4-lane board layout, "Ocultar post-guardia" toggle, and the ic_board_actions/
 * ic_consult_band tour steps added on top of the board redesign above. */
/** +1109 B / +0 files: 8.2.4. RELEASE_NOTES_824 curated entries in the
 * already-eager release-notes-highlights.mjs, plus the cloud-mobile app-version
 * fallback (api-client.mjs's already-eager getCachedAppVersion) — no new eager file. */
/** +4222 B / +0 files: 8.2.5. Cultivo antibiogram/dedup fixes in the already-eager
 * cultivo-block-core.mjs, labs-cultivo-atb.mjs, labs-cultivo-scan.mjs,
 * labs-cultivo.mjs, and labs-bh.mjs (BH reticulocitos), plus the RELEASE_NOTES_825
 * curated entries in the already-eager release-notes-highlights.mjs — no new
 * eager file. */
/** +20739 B / +0 files: 8.2.5. Tendencias event-tag chips (chart markers, group-
 * table date headers, per-day legend) in the already-eager
 * tendencias-event-context.mjs, eventualidades-store.mjs, and
 * tend-group-table-render.mjs, plus healUndoStackQuota() — the automatic
 * boot-time cleanup for the undo-stack localStorage quota bug — in the
 * already-eager productivity.mjs. No new eager file. */
/** +2800 B / +0 files: 8.2.6. Tendencias date-range filter and group-by-day
 * column merge in the already-eager tend-core.mjs, tend-group-modal*.mjs and
 * tend-group-table-render.mjs, the Estado Actual extra-glucometry hour select
 * in estado-actual-panel-glu-row.mjs, plus the RELEASE_NOTES_826 curated
 * entries in the already-eager release-notes-highlights.mjs — no new eager
 * file. */
/** +8612 B / +0 files: 8.2.7. Backlog accumulated on main since 8.2.6 in
 * already-eager modules: medications-*.mjs / estado-actual-meds*.mjs /
 * lab-bulk-preview-modal.mjs (meds panel + SOAP footer), insulin-pump-some-
 * detect.mjs and potassium-repos-detect.mjs/-display.mjs (core lab-paste
 * detection), tend-core.mjs / tendencias-event-context.mjs (event-tag
 * follow-ups), and lazy-feature-routes-charts.mjs (the lazy boundary itself).
 * No new eager file. */
/** +5150 B / +0 files: 8.2.8. RELEASE_NOTES_828 curated entries (Nube E2EE,
 * next-rotation team staging) in the already-eager release-notes-highlights.mjs
 * — no new eager file. */
/** +2767 B / +0 files: 8.2.9. New lab-clipboard.mjs (HTML-formatted copy
 * payload) is eager via lab-panel-workbench.mjs and lab-history-batch-copy-
 * modal.mjs, plus the copyToClipboardSafe HTML branch in soap-estado.mjs and
 * the RELEASE_NOTES_829 curated entries. File count unchanged: the deleted
 * lab-history-batch-copy-ui.mjs offsets the new eager file. */
/** +4621 B / +0 files: 8.2.9 (cont.). Backlog in already-eager modules:
 * lab-bulk-preview-modal.mjs / lab-panel-history-dedupe.mjs (SOAP/meds
 * panel), lab-bulk-paste.mjs / labs-fluidos.mjs / labs-citoquimico-
 * interpret*.mjs (EU-section split, multi-expediente paste tolerance),
 * patient-list-virtual.mjs (active-zone virtualization sizing fix),
 * cloud-push-direct.mjs (diagnostics). No new eager file. */
/** +238 B / +0 files: 8.2.9 (cont.). Complexity-reduction extraction in the
 * already-eager cloud-push-direct.mjs (pushChunkWithRetry helper). No new
 * eager file. */
/** +656 B / +0 files: 8.2.9 (cont.). mixedExpedienteWarning now also warns
 * (never silent) when a block resolves to a known census patient but
 * excludes a report from an unrecognized expediente — already-eager
 * lab-bulk-paste.mjs. No new eager file. */
const EAGER_BOOT_BUDGET_BYTES = 3573090;
const EAGER_BOOT_BUDGET_FILES = 113;

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

test('runDeferredShellAfterOnboarding defers initTabBarMotion off the paint path', () => {
  const src = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const start = src.indexOf('function runDeferredShellAfterOnboarding');
  const end = src.indexOf('\nfunction wireOnboardingFinishedBootResume');
  const body = src.slice(start, end);
  // renderInnerTabs()/syncMainAppTabA11y() must stay synchronous (first paint).
  assert.match(body, /syncMainAppTabA11y\(activeAppTab\);\s*\n\s*renderInnerTabs\(\);/);
  // initTabBarMotion() must not run inline right after renderInnerTabs() —
  // it must be deferred so it runs after paint instead.
  assert.doesNotMatch(body, /renderInnerTabs\(\);\s*\n\s*initTabBarMotion\(\);/);
  assert.match(body, /runInitTabBarMotionAfterPaint\s*=\s*function/);
  assert.match(body, /requestAnimationFrame\(runInitTabBarMotionAfterPaint\)/);
  assert.match(body, /perfMark\('deferred-shell-start'\)/);
  assert.match(body, /perfMark\('deferred-shell-eager-paint-done'\)/);
  assert.match(body, /perfMark\('deferred-shell-tab-bar-motion-ready'\)/);
});
