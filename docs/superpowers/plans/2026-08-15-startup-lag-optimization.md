# Implementation plan — R+ startup lag

**Status (2026-08-23): Steps 0-8 shipped.** Step 9's outline has been folded into [`docs/superpowers/plans/2026-08-23-boot-debt-phase2-phase3a.md`](2026-08-23-boot-debt-phase2-phase3a.md#future-scope--tab-level-code-split-folded-in-from-2026-08-15-doc-step-9-not-started) — read that doc for current status, not this section. This document is kept for the historical record of Steps 0-8 and their reasoning.

Target: cut 600–900 ms from boot with items 1–8. Item 9 (tab split) is outlined only; it needs its own plan.

**Ground rules for the implementer**
- Every change under `public/` needs `npm run build:ui` before you test or measure.
- Never run bare `npm test`. Use `npm run test:one -- <path>`.
- One step = one commit. Do not batch steps.
- Do not change `CLAUDE.md`, `AGENTS.md`, or any config outside the files named here.

---

## Step 0 — Add main-process timing (do this first)

No optimisation yet. This gives before/after numbers. Without it, later steps cannot be verified.

**File:** `/Users/mauriciosalas/R+/main.js`

Add near the top, after the `require` block (after line 29):

```js
// Boot timing. Enable with R_PLUS_BOOT_PERF=1.
const BOOT_T0 = process.hrtime.bigint();
function bootMark(label) {
  if (process.env.R_PLUS_BOOT_PERF !== '1') return;
  const ms = Number(process.hrtime.bigint() - BOOT_T0) / 1e6;
  console.log(`[R+ boot] ${label}: ${ms.toFixed(1)}ms`);
}
```

Add `bootMark(...)` calls at these points inside `app.whenReady().then(async () => {` (starts line 855):
- after `captureDefaultUpdaterFeed();` → `bootMark('updater-feed')`
- after `loadNativeDatabase();` succeeds → `bootMark('native-db')`
- after `registerDbIpcHandlers({...})` → `bootMark('db-ipc')`
- immediately before `createWindow();` → `bootMark('pre-window')`
- inside `mainWindow.once('ready-to-show', ...)` (line 277) → `bootMark('ready-to-show')`
- inside `mainWindow.webContents.once('did-finish-load', ...)` (line 284), first line → `bootMark('did-finish-load')`

Record a baseline: `R_PLUS_BOOT_PERF=1 npm start`, capture the six numbers, paste them into the commit message.

**Test:** `npm run test:one -- main-lan-boot.test.mjs`
Must stay green. `bootMark` is a plain function; it touches no assertion in that file.

---

## Step 1 — Lazy-require the document export stack (~270 ms)

`require('./lib/doc-export-service.js')` at module load pulls `pdf-lib`, three `.docx` generators, `generate-censo.js`, `generate-receta-hu.js`, and re-parses `public/js/labs.js` as ESM. Measured 273 ms. It is needed only when the user exports.

**File:** `/Users/mauriciosalas/R+/main.js`, lines 584–585.

Before:
```js
const docExport = require('./lib/doc-export-service.js');
const { logDocExport } = require('./lib/doc-export-audit.js');

ipcMain.handle('generate-document', async (_e, { kind, payload }) => {
  const paths = {
```

After:
```js
let docExportModule = null;
let logDocExportFn = null;
function loadDocExport() {
  if (!docExportModule) {
    docExportModule = require('./lib/doc-export-service.js');
    logDocExportFn = require('./lib/doc-export-audit.js').logDocExport;
  }
  return { docExport: docExportModule, logDocExport: logDocExportFn };
}

ipcMain.handle('generate-document', async (_e, { kind, payload }) => {
  const { docExport, logDocExport } = loadDocExport();
  const paths = {
```

Nothing else in the handler body changes — `docExport` and `logDocExport` stay in scope as locals with the same names.

**Check:** `grep -n "docExport\|logDocExport" main.js` — every use must be inside the `generate-document` handler. If any use exists elsewhere, stop and report; do not add a second call site.

**Test:** `npm run test:one -- main-lan-boot.test.mjs`
**Manual:** start the app, export a nota, an indicaciones, and a censo. All three must produce a file. This is the only way to catch a missed binding.

---

## Step 2 — Lazy-require `electron-updater` (~40 ms)

`autoUpdater` is required at line 11 but the first check runs at `did-finish-load` + 1500 ms (`main.js:308`). It is not on the boot critical path.

**Warning:** `autoUpdater` is referenced in ~15 places, including four top-level `autoUpdater.on(...)` registrations (lines 325, 337, 352, 384) and top-level config at lines 59–61. A naive lazy getter breaks all of them.

**File:** `/Users/mauriciosalas/R+/main.js`

Replace line 11 (`const { autoUpdater } = require('electron-updater');`) with a memoised accessor:

```js
let _autoUpdater = null;
function getAutoUpdater() {
  if (!_autoUpdater) {
    _autoUpdater = require('electron-updater').autoUpdater;
    _autoUpdater.autoDownload = true;
    _autoUpdater.autoInstallOnAppQuit = true;
    _autoUpdater.allowPrerelease = false;
    _autoUpdater.on('update-available', onUpdateAvailable);
    _autoUpdater.on('download-progress', onDownloadProgress);
    _autoUpdater.on('update-downloaded', onUpdateDownloaded);
    _autoUpdater.on('update-not-available', onUpdateNotAvailable);
    _autoUpdater.on('error', onUpdaterError);
  }
  return _autoUpdater;
}
```

Then:
- Delete lines 59–61 (the three `autoUpdater.autoDownload = ...` config lines). They move into `getAutoUpdater()`.
- Convert the four top-level `autoUpdater.on('x', (arg) => {...})` blocks (lines 325–408) into named function declarations `onUpdateAvailable`, `onDownloadProgress`, `onUpdateDownloaded`, `onUpdateNotAvailable`, `onUpdaterError`. Keep the bodies byte-identical. Remove the `autoUpdater.on(...)` wrappers.
- Replace every remaining `autoUpdater.` with `getAutoUpdater().`. Sites: lines 93–95, 106, 117, 120, 131–133, 142, 152, 156, 169–171, 412, 433.

**Ordering trap:** `applyUpdateChannel()` and `captureDefaultUpdaterFeed()` run inside `whenReady` (lines 863–864) and both touch `autoUpdater`. They will trigger the load there. That is acceptable — it is 40 ms off the top-level path and inside an already-async block. Do not try to defer further in this step.

**Test:** `npm run test:one -- main-lan-boot.test.mjs`
**Manual:** open the app menu → "Buscar actualizaciones…". A result toast or modal must appear.

If this step turns out larger than ~60 changed lines, stop and report. The gain is only 40 ms; it is not worth a risky refactor of the updater.

---

## Step 3 — Fix the vendor script waterfall (~150–250 ms)

`app.bundle.mjs` is not requested until Sortable (48 KB) and Chart.js (204 KB) have both downloaded **and executed**, in series.

**File:** `/Users/mauriciosalas/R+/public/js/clinical-onboarding-early-boot.js`, function `loadAppScripts` at line 165.

Before:
```js
  function loadAppScripts() {
    if (window.__RPC_APP_SCRIPTS_LOADING__ || window.__RPC_APP_SCRIPTS_LOADED__) return;
    window.__RPC_APP_SCRIPTS_LOADING__ = true;
    appendScript('/vendor/sortable.min.js', function () {
      appendScript('/vendor/chart.umd.min.js', function () {
        window.__RPC_APP_SCRIPTS_LOADED__ = true;
        injectAppBundle();
      });
    });
  }
```

After:
```js
  function loadAppScripts() {
    if (window.__RPC_APP_SCRIPTS_LOADING__ || window.__RPC_APP_SCRIPTS_LOADED__) return;
    window.__RPC_APP_SCRIPTS_LOADING__ = true;
    // The module bundle is the long pole — request it first.
    injectAppBundle();
    var pending = 2;
    function done() {
      pending -= 1;
      if (pending === 0) window.__RPC_APP_SCRIPTS_LOADED__ = true;
    }
    appendScript('/vendor/sortable.min.js', done);
    appendScript('/vendor/chart.umd.min.js', done);
  }
```

**Correctness note — read before editing.** This changes the guarantee that `window.Sortable` and `window.Chart` exist before the bundle runs. Two facts make it safe:
1. `injectAppBundle` appends `<script type="module">`, which is deferred by spec. It executes after the document parses, and the two classic `appendScript` tags are appended in the same tick, so both are in flight already.
2. `public/js/vendor-loader.mjs` already exists and `tendencias-ui-detail.mjs:5` uses `loadChartJs` from it.

Still, you must verify. Run:
```
grep -rn "window.Sortable\|globalThis.Sortable\|new Sortable\|window.Chart\|globalThis.Chart" public/js --include="*.mjs" --include="*.js" | grep -v "\.test\."
```
For every hit, confirm it is inside a function called after user interaction or after `loadChartJs`, not at module top level. **If any hit is at module top level, stop and report it instead of shipping this step.** A top-level `new Sortable(...)` would now throw.

**Test:** `npm run test:one -- public/js/clinical-onboarding-early-boot.test.mjs`
**Manual after `npm run build:ui`:** drag a card in the Pase board (Sortable), then open Tendencias and confirm a chart draws (Chart.js).

---

## Step 4 — Make release notes a dynamic import (~40–80 ms, 117 KB)

`data/release-notes-highlights.mjs` is 117 KB minified and sits in the eager boot chunk. It is 5.7 % of the whole eager payload. It is text for Settings → Novedades.

Chain, from the esbuild metafile:
```
app.js:57 → features/profile.mjs → profile-load.mjs
  → profile-load-platform.mjs:6 → settings-help/release-notes.mjs
  → release-notes-curated.mjs:5 → data/release-notes-highlights.mjs
```

**File:** `/Users/mauriciosalas/R+/public/js/features/profile-load-platform.mjs`

Delete the static import at lines 2–6:
```js
import {
  maybeShowReleaseNotesFor,
  initReleaseNotesDevPreviewIfEnabled,
  RELEASE_NOTES_DEV_FORCE_SHOW,
} from "./settings-help/release-notes.mjs";
```

In `populateProfileVersionBlock`, make the `.then` callback async and import inside the branch that needs it. `RELEASE_NOTES_DEV_FORCE_SHOW` is `export var ... = false` (`release-notes.mjs:9`), a dev-only flag, so it only matters once we already decided to load the module.

Before (lines 16–36):
```js
  window.electronAPI
    .getAppVersion()
    .then(function (v) {
      verEl.textContent = v || "—";
      var LAST_SEEN_VERSION_KEY = "rplus-last-seen-app-version";
      var prev = localStorage.getItem(LAST_SEEN_VERSION_KEY);
      if (prev) window.__RPC_PREV_APP_VERSION__ = prev;
      if (RELEASE_NOTES_DEV_FORCE_SHOW) {
        initReleaseNotesDevPreviewIfEnabled(v);
      } else if (prev && v && prev !== v) {
        getProfileRuntime().showToast(...);
        maybeShowReleaseNotesFor(v, prev);
      }
      if (v) localStorage.setItem(LAST_SEEN_VERSION_KEY, v);
    })
```

After:
```js
  window.electronAPI
    .getAppVersion()
    .then(async function (v) {
      verEl.textContent = v || "—";
      var LAST_SEEN_VERSION_KEY = "rplus-last-seen-app-version";
      var prev = localStorage.getItem(LAST_SEEN_VERSION_KEY);
      if (prev) window.__RPC_PREV_APP_VERSION__ = prev;
      var versionChanged = !!(prev && v && prev !== v);
      if (versionChanged) {
        getProfileRuntime().showToast(
          "Actualizado a v" + v + ". Consulta Ajustes o el menú para buscar actualizaciones.",
          "success"
        );
      }
      if (versionChanged || window.__RPC_RELEASE_NOTES_DEV__) {
        var notes = await import("./settings-help/release-notes.mjs");
        if (notes.RELEASE_NOTES_DEV_FORCE_SHOW) {
          notes.initReleaseNotesDevPreviewIfEnabled(v);
        } else if (versionChanged) {
          notes.maybeShowReleaseNotesFor(v, prev);
        }
      }
      if (v) localStorage.setItem(LAST_SEEN_VERSION_KEY, v);
    })
```

The toast now fires before the modal, not after. That is the same visible order the user already sees.

**Do not touch the other three importers of `release-notes.mjs`.** They are `app-shell-modals.mjs:30`, `platform/updater/electron-handlers.mjs:3`, and `settings-help/index.mjs:42`. Check with:
```
grep -rn "release-notes.mjs" public/js --include="*.mjs" | grep -v "\.test\."
```
`settings-help/index.mjs` is already lazy-only. But `app-shell-modals.mjs:30` (`closeReleaseNotes`) and `platform/updater/electron-handlers.mjs:3` (`formatUpdaterReleaseNotesPlain`) may still be eager. **After `npm run build:ui`, re-run the metafile check in Step 6 to confirm `data/release-notes-highlights.mjs` left the eager set.** If it did not, report which edge still holds it; do not add more dynamic imports on your own initiative.

**Test:** `npm run test:one -- public/js/app-boot-imports.test.mjs`
**Manual:** open Ajustes → Mi Perfil. The version string must render.

---

## Step 5 — Extract `inferFechaLabSetFromId` to a leaf module (~30–60 ms)

Two modules import one small pure function from the Tendencias feature barrel, which drags 95 modules / 487 KB of source into the eager graph and defeats the `features/tendencias.mjs` lazy route.

Bad edges:
- `/Users/mauriciosalas/R+/public/js/lab-history-format.mjs:13`
- `/Users/mauriciosalas/R+/public/js/lab-history-maint.mjs:17`

Both read: `import { inferFechaLabSetFromId } from './features/tendencias.mjs';`

There is already a duplicated copy at `/Users/mauriciosalas/R+/public/js/lazy-feature-routes-charts.mjs:36` (`inferFechaLabSetFromIdFallback`). This step removes the duplication too.

**5a. Create** `/Users/mauriciosalas/R+/public/js/lab-set-date.mjs`:

```js
/** Fecha aproximada desde id numérico (timestamp al guardar el set). Leaf module — no feature imports. */

export function formatDMYDate(d) {
  if (!d || isNaN(d.getTime())) return '';
  return (
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    d.getFullYear()
  );
}

export function inferFechaLabSetFromId(set) {
  if (!set || set.fecha === 'Anterior') return '';
  var id = String(set.id || '');
  if (!/^\d{10,}$/.test(id)) return '';
  var ms = parseInt(id, 10);
  if (id.length === 10) ms *= 1000;
  return formatDMYDate(new Date(ms));
}
```

This is copied verbatim from `/Users/mauriciosalas/R+/public/js/features/tendencias-ui-detail.mjs` lines 59–72. Do not "improve" it. The file must import nothing.

**5b.** In `/Users/mauriciosalas/R+/public/js/features/tendencias-ui-detail.mjs`, delete the local `formatDMYDate` (line 59) and `inferFechaLabSetFromId` (line 65) definitions and add at the top of the import block:
```js
import { formatDMYDate, inferFechaLabSetFromId } from '../lab-set-date.mjs';
```
Leave the `export { ... inferFechaLabSetFromId, formatDMYDate, ... }` list at line 475 untouched, so `features/tendencias.mjs` keeps re-exporting both. Public API does not change.

**5c.** In `lab-history-format.mjs` change line 13 and in `lab-history-maint.mjs` change line 17 to:
```js
import { inferFechaLabSetFromId } from './lab-set-date.mjs';
```

**5d.** In `/Users/mauriciosalas/R+/public/js/lazy-feature-routes-charts.mjs`, delete `inferFechaLabSetFromIdFallback` (lines 36–47) and import the shared one:
```js
import { inferFechaLabSetFromId as inferFechaLabSetFromIdFallback } from './lab-set-date.mjs';
```
Keep the local alias name so the rest of that file needs no edit. Verify with `grep -n "inferFechaLabSetFromIdFallback" public/js/lazy-feature-routes-charts.mjs` that every use still resolves.

**Test:**
```
npm run test:one -- public/js/app-boot-imports.test.mjs
npm run test:one -- scripts/metrics/boot-graph.test.mjs
```
Then `npm run build:ui` and confirm `features/tendencias*` left the eager set using the Step 6 script.

**Manual:** open a patient → Labs → history list. Dates must still render next to each lab set.

---

## Step 6 — Widen the boot-graph guard (do after Steps 4 and 5)

The current guard is too narrow and let Steps 4 and 5 ship. `findBootLazyOnlyViolations` checks only **direct** imports of three hubs (`BOOT_HUBS` in `scripts/metrics/constants.mjs`). `profile-load-platform.mjs` and `lab-history-format.mjs` are not hubs, so both leaks passed a green test.

Fix: read the real eager set from the esbuild metafile that `scripts/bundle-renderer.mjs` already writes to `public/js/app.bundle.meta.json` (line 121 of that file).

**6a. Add to** `/Users/mauriciosalas/R+/scripts/metrics/boot-graph.mjs` (keep all existing exports unchanged — `scripts/metrics/boot-graph.test.mjs` and `run.mjs` depend on them):

```js
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
```

Note `normalizeBootImportPath` already strips a leading `public/js/`, which is the form the metafile uses. Reuse it; do not write a second normaliser.

**6b. Add two tests to the end of** `/Users/mauriciosalas/R+/public/js/app-boot-imports.test.mjs`.

Extend the existing import at the top of that file:
```js
import {
  collectBootStaticImports,
  findBootLazyOnlyViolations,
  collectEagerBundleSet,
  findEagerLazyOnlyModules,
} from '../../scripts/metrics/boot-graph.mjs';
```

Then append:

```js
/** Update only with a measured win. Never raise without a note in the commit message. */
const EAGER_BOOT_BUDGET_BYTES = 0; // ← fill in, see below
const EAGER_BOOT_BUDGET_FILES = 0; // ← fill in, see below

test('boot bundle: no lazy-only feature is statically reachable (BN-12 transitive)', () => {
  const eager = collectEagerBundleSet(REPO_ROOT);
  const hits = findEagerLazyOnlyModules(eager.modules);
  assert.equal(
    hits.length,
    0,
    hits
      .map((h) => `${h.module} is eager but listed lazy-only (${h.banned})`)
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
```

**Filling the budget.** Do not guess. After Steps 4 and 5 have landed and `npm run build:ui` has run:
```
node -e "import('./scripts/metrics/boot-graph.mjs').then(m=>{const e=m.collectEagerBundleSet(process.cwd());console.log('bytes',e.bytes,'files',e.files.length,'modules',e.modules.length)})"
```
Set both constants to the measured values with **no headroom**. A budget with slack is a budget that never fires.

**Caveat the reviewer must check:** the committed `app.bundle.meta.json` is produced by the non-`--prod` (unminified) bundler, while releases use `--prod` (`package.json` `prebuild:mac` / `prebuild:win`). The byte number is therefore an unminified proxy, not the shipped size. That is fine for regression detection — it is a consistent yardstick — but say so in a comment above the constants so nobody reads it as the shipped payload. Measured reference points: unminified eager = 3 773 799 B / 63 files / 1120 modules; minified eager = 2 051 KB / 63 files / 1014 modules.

**6c.** Add the helper the failure message promises, `/Users/mauriciosalas/R+/scripts/metrics/why-eager.mjs`. It takes a module path and prints the shortest static import chain from `public/js/app.js`, using `meta.inputs[].imports` filtered to `kind === 'import-statement'` and a BFS over reversed edges. This is the tool that turns a red test into a one-line fix. Keep it under 40 lines.

**Test:**
```
npm run test:one -- scripts/metrics/boot-graph.test.mjs
npm run test:one -- public/js/app-boot-imports.test.mjs
```
Then confirm the guard actually bites: temporarily add `import './features/tendencias.mjs';` to `public/js/app.js`, run `npm run build:ui`, re-run the test, see it fail, then revert. **Report the failure text you saw.** A guard test that has never been seen failing is not a guard.

---

## Step 7 — Concatenate stylesheets (~80–150 ms)

`/Users/mauriciosalas/R+/public/index.html` lines 115–144 hold 33 render-blocking `<link rel="stylesheet">` tags, 944 KB total, each a separate `app://rplus` request that runs `fs.existsSync` + `fs.statSync` + `net.fetch` in `/Users/mauriciosalas/R+/lib/renderer-protocol.cjs:58`.

`scripts/build-ui.mjs` already expands `<!-- @include ... -->` directives into `index.html` from `index.src.html`. Add the same treatment for CSS.

**File:** `/Users/mauriciosalas/R+/scripts/build-ui.mjs`

Add a pass in `buildUi`, after `const content = expand(absSrc, []);` and **before** `collectDuplicateIds`:

1. Match every `<link rel="stylesheet" href="/…">` whose `href` starts with `/` (skip `https://fonts.googleapis.com`, which uses the `media="print"` trick at line 18 and is already non-blocking).
2. Concatenate those files in **source order** into `public/styles/app.bundle.css`. Order is load-bearing — CSS cascade depends on it. Do not sort, do not dedupe.
3. Strip any `?v=` query (line 142 has `overlays.css?v=hybrid-polish-3`) when resolving the path from disk.
4. Replace the whole run of tags with one `<link rel="stylesheet" href="/styles/app.bundle.css">` at the position of the first tag.
5. Prefix each concatenated file with `/* --- <relative path> --- */` so DevTools stays navigable.

Leave `/tokens.css` (line 20) where it is if it must load before the inline `<script>` at line 21. Check that script: if it reads computed custom properties, tokens must stay separate and first. If it does not, fold tokens.css in as the first entry.

**Traps:**
- `url(...)` paths inside the CSS files are resolved against the stylesheet URL. Moving files from `/styles/x.css` to `/styles/app.bundle.css` keeps the same directory, so relative `url()` still resolves. `/tokens.css` is at the root — if you fold it in, rewrite its relative `url()` references or leave it out. **Leaving it out is the safe choice.**
- Add `public/styles/app.bundle.css` to `.gitignore` only if the other build artefacts are ignored. Check how `public/js/app.bundle.mjs` is handled and match it exactly.
- `build:ui:check` (`scripts/build-ui.mjs --check`) must still pass; the check path compares generated output to disk, so the CSS bundle must be written in `--check` mode too, or excluded from the comparison. Follow whichever pattern the existing code uses for `index.html`.

**Test:** `npm run test:one -- scripts/build-ui.test.mjs` (if it exists; otherwise `ls scripts/*build-ui*test*` and run what you find), then `npm run build:ui:check`.
**Manual:** this is a visual change. Open the app and check Pase board, Labs panel, Expediente, Ajustes modal, and one overlay/modal. Compare against a screenshot taken before the change. Any spacing or colour shift means the order broke.

---

## Step 8 — Do not block window creation on the DB unlock (~100–250 ms) — HIGHEST RISK

**Do this step last.** It is the only one that changes runtime ordering guarantees.

Today `main.js:917` (`if (unlockPromise) await unlockPromise;`) finishes the native SQLCipher load, the DB open, `PRAGMA key`, WAL setup, and the migration check before `createWindow()` at line 956. The renderer cannot start in parallel.

### 8a. Prerequisite: make `ensureUnlocked` concurrency-safe

**This must land before 8b, in the same commit or an earlier one.**

`lib/db/ipc-handlers-register-core.mjs:136` (`db:auto-unlock`) calls `dbManager.ensureUnlocked()` — the identical function `unlockClinicalDbAtStartup` calls. Today they cannot overlap, because main finishes before the window exists. After 8b they can, and the renderer polls aggressively (`public/js/features/db-unlock-boot.mjs`).

`ensureUnlockedImpl` (`lib/db/db-manager-auth-unlock-flows.mjs:336`) guards with `if (deps.getState() === 'unlocked') return { ok: true };`, but that check is not atomic across the `await`s that follow. Two concurrent callers both observe `'locked'`, both reach `openDatabaseConnection`, and the second one calls `lockDb(ctx)` (`db-manager-auth-internals.mjs:94`) which **closes the connection the first one just opened**. Symptoms would be intermittent `DB_LOCKED` errors, a lost handle, or in the worst case a half-applied migration transaction.

**File:** `/Users/mauriciosalas/R+/lib/db/db-manager.mjs`

Memoise the in-flight promise inside `createDbManager`:

```js
  let inFlightUnlock = null;
  function ensureUnlockedShared() {
    if (state === 'unlocked' && db) return Promise.resolve({ ok: true });
    if (!inFlightUnlock) {
      inFlightUnlock = Promise.resolve()
        .then(() => auth.ensureUnlocked())
        .finally(() => { inFlightUnlock = null; });
    }
    return inFlightUnlock;
  }
```

Change the returned object (line 82) from `ensureUnlocked: auth.ensureUnlocked,` to `ensureUnlocked: ensureUnlockedShared,`.

Do **not** memoise `unlockWithPassphrase` or `unlockWithRecoveryCode`. Those are user-initiated, carry different credentials, and must not be deduplicated.

**Test:** `npm run test:one -- lib/db/db-manager.test.mjs`
Add one test to that file: call `dbManager.ensureUnlocked()` twice without awaiting between calls, `await Promise.all([...])`, and assert both resolve `{ ok: true }` and the DB opened once. If the existing test harness cannot count opens, assert at minimum that both resolve and `getState() === 'unlocked'`.
Also run: `npm run test:one -- lib/db/ipc-handlers.test.mjs`

### 8b. Reorder `main.js`

Keep the diff minimal. **Leave the LAN block (lines 899–916) exactly where it is** — it is a cheap `if` when the env flag is off, and moving it would break two assertions in `main-lan-boot.test.mjs`.

**File:** `/Users/mauriciosalas/R+/main.js`

1. **Delete line 917:** `if (unlockPromise) await unlockPromise;`

2. **Attach a rejection handler** where `unlockPromise` is assigned (line 897):
```js
    unlockPromise = unlockClinicalDbAtStartup(dbManager);
    unlockPromise.catch((unlockErr) => {
      // The renderer surfaces this through db:status + the unlock overlay
      // (public/js/features/db-unlock-boot.mjs). Log only — do not quit here.
      console.error('[R+ boot] clinical DB unlock failed:', unlockErr && unlockErr.message);
    });
```
Without this, an unlock failure becomes an unhandled rejection once nothing awaits it.

3. **The `R_PLUS_RECOVER_CENSUS` branch still needs the DB.** At the top of the `if (process.env.R_PLUS_RECOVER_CENSUS === '1') {` block (line 919), inside its existing `try`, add:
```js
        await unlockPromise;
```
This branch calls `app.quit()` and never creates a window, so blocking there is correct and costs nothing on a normal boot.

4. `createWindow()` at line 956 and everything after stays unchanged.

### What could break — the reviewer must confirm each

| Risk | Why it is covered | Verify how |
|---|---|---|
| Renderer calls a `db:*` channel before the handler exists | `registerDbIpcHandlers` (line 887) still runs before `createWindow` (line 956). Do not move it. | `grep -n "registerDbIpcHandlers\|createWindow()" main.js` — the register line number must be lower. |
| Renderer reads clinical data from a locked DB | `db-unlock-boot.mjs` already polls `dbStatus()` and calls `db:auto-unlock` with retry (`getClinicalBootDelays`). It handles `state !== 'unlocked'`. | Manual: launch and confirm no unlock overlay flashes for a normal remembered session. |
| Two unlocks race and close each other's handle | Fixed by 8a. **8b is invalid without 8a.** | Run the concurrency test from 8a. |
| Native ABI failure now shows after the window paints | Unchanged. `loadNativeDatabase()` (line 866) still runs before `createWindow` and still calls `dialog.showErrorBox` + `app.quit()`. | Read lines 866–877; confirm untouched. |
| Unlock failure no longer quits the app | Intended. The renderer shows the unlock gate or an error toast. **Confirm the user sees something.** | Manual: rename `clinical.db` in userData to force a failure. An overlay or toast must appear. A blank window is a bug — report it. |
| A migration runs while the renderer is already issuing reads | Migrations run inside `openDatabaseConnection` before `setState('unlocked')`, and every read path calls `assertUnlocked()`. Reads get `DB_LOCKED` and retry. | Manual: this is the case worth exercising on a machine with a large DB. |

### 8c. Rewrite the stale invariant test

`/Users/mauriciosalas/R+/main-lan-boot.test.mjs` lines 24–35 assert the **old** invariant and will now fail:
```js
  const awaitUnlock = body.indexOf('await unlockPromise');
  assert.ok(awaitUnlock >= 0 && awaitUnlock < createIdx, 'await unlockPromise before createWindow');
```

Replace that test with one that encodes the new invariant. Also update the file header comment at line 2 ("clinical DB unlock before window") — it is now wrong.

```js
test('main boot: DB IPC registered before window; unlock runs in parallel', () => {
  const body = whenReadyBody(MAIN_SRC);
  const createIdx = body.indexOf('createWindow()');
  assert.ok(createIdx >= 0, 'createWindow in whenReady');

  const registerIdx = body.indexOf('registerDbIpcHandlers(');
  assert.ok(registerIdx >= 0 && registerIdx < createIdx,
    'db IPC handlers registered before the window can call them');

  const assignIdx = body.indexOf('unlockPromise = unlockClinicalDbAtStartup(dbManager)');
  assert.ok(assignIdx >= 0 && assignIdx < createIdx, 'unlock starts before createWindow');

  const awaitIdx = body.indexOf('await unlockPromise');
  assert.ok(
    awaitIdx === -1 || awaitIdx > createIdx,
    'unlock must not block createWindow (recover-census branch may await after)'
  );
  assert.match(body, /unlockPromise\.catch\(/,
    'unlock rejection handled — otherwise it is an unhandled rejection');
  assert.ok(MAIN_SRC.includes('await dbManager.ensureUnlocked'),
    'ensureUnlocked invoked from startup helper');
});
```

The `awaitIdx > createIdx` clause is wrong if you put the recover-census `await` before `createWindow` — and it is before it, at line 919. Use this instead, which is what the code actually does:

```js
  const awaitIdx = body.indexOf('await unlockPromise');
  if (awaitIdx >= 0) {
    const recoverIdx = body.indexOf("R_PLUS_RECOVER_CENSUS");
    assert.ok(recoverIdx >= 0 && awaitIdx > recoverIdx,
      'the only await on unlockPromise is inside the recover-census branch');
  }
```

**Test:** `npm run test:one -- main-lan-boot.test.mjs`
Confirm the other three tests in that file (ward-server guard, `lan-ensure-server-ready` registered, no-op in production) still pass untouched. If any of them fail, you moved something you should not have.

**Measure:** re-run `R_PLUS_BOOT_PERF=1 npm start` and compare `pre-window` and `ready-to-show` against the Step 0 baseline. Put both numbers in the commit message.

---

## Step order and dependencies

| Order | Step | Depends on | Risk |
|---|---|---|---|
| 1 | 0 — boot timing | — | none |
| 2 | 1 — doc-export lazy require | 0 | low |
| 3 | 2 — electron-updater lazy require | 0 | medium (many call sites) |
| 4 | 3 — vendor script order | 0 | medium (global `Sortable` / `Chart`) |
| 5 | 4 — release notes dynamic | — | low |
| 6 | 5 — tendencias helper extract | — | low |
| 7 | 6 — guard test widening | **4 and 5** (budget must record the win) | low |
| 8 | 7 — stylesheet concatenation | — | medium (CSS order, visual) |
| 9 | 8a — concurrency-safe `ensureUnlocked` | — | medium |
| 10 | 8b/8c — window/DB reorder | **8a** | high |

Steps 4, 5, 6, and 7 are independent of 1, 2, 3 and can be done in either order. Step 8b must never ship without 8a.

**Stop and report instead of improvising if:**
- a top-level `new Sortable(...)` or `window.Chart` reference exists (Step 3);
- `data/release-notes-highlights.mjs` is still eager after Step 4;
- Step 2 exceeds ~60 changed lines;
- any `main-lan-boot.test.mjs` test other than the one named in 8c goes red.

---

## Step 9 — Tab-level code split (outline only, needs its own plan)

Do not start this from this document. It needs a separate plan and a separate review.

**The problem.** `public/js/app.js` lines 32–112 hold ~50 static imports. The static closure from `app.js` is 1120 modules / 4.8 MB source / **2.05 MB minified across 63 chunks**, all fetched with `kind: "import-statement"` before the app is usable. There is no single fat dependency — `motion` tree-shakes to 62 KB. The weight is flat: **1140 KB spread across `public/js/features`**. Roughly 1014 modules parse and execute on every launch.

The graph is a hub, not a tree. Cutting any one direct import of `app.js` saves almost nothing, because nearly every direct import reaches nearly the whole graph (measured: 12 different direct imports each reach 1049–1118 modules). This cannot be fixed edge by edge.

**Goal.** Boot only what the first screen needs. Target roughly 400–600 KB eager, under 20 chunks. Estimated saving 600–1200 ms.

**Suggested split boundaries** (a starting hypothesis, to be validated with the metafile, not accepted as given):

- **Boot core** — shell, tab bar, storage, DB bridge, unlock, Pase board. Everything the user sees in the first second.
- **Labs** — `lab-panel*`, `labs-*`, `lab-history-*`, `paste-smart*`, `labs-cultivo*`. Loads when the Labs tab opens.
- **Expediente / notes** — `expediente*`, `notes-indicaciones`, `soap-estado`, `estado-actual-*`.
- **Charts / Tendencias** — already lazy-routed; keep it that way and stop the leaks.
- **Settings / help / tour** — `settings-help/*`, `profile*`, release notes. Never needed at boot.
- **Cloud sync / teams / guardia** — `cloud-sync/*`, `clinical-teams/*`, `guardia-board`. Loads on demand, except any autostart path.

**Main risks.**
1. `public/js/lazy-feature-routes.mjs` already implements this pattern and it has been defeated twice (Steps 4 and 5). The mechanism works; the discipline does not. **The Step 6 guard test is the prerequisite for this work, not an afterthought.** Land Step 6 first.
2. Circular imports between features. esbuild resolves a cycle by hoisting the shared modules into an eagerly-loaded chunk, so one bad edge can silently undo a whole split. Every boundary needs a metafile check, not a code review.
3. `window.*` global handler registration. `app.js` assembles `windowHandlers` from ~20 feature modules at boot. Deferring a module defers its handlers, so an inline `onclick` in `index.html` can hit an undefined function. Each moved feature needs a lazy proxy — the pattern in `lazy-feature-routes-charts.mjs` (`chartsRuntimeProxies`, `wireChartsRuntimeExports`) is the model to copy.
4. Perceived regression. A first click on a deferred tab now pays a load. Needs a skeleton or spinner — `public/js/ui-skeleton.mjs` and `buildLabPanelSkeletonHtml` already exist for this.

**Sequencing.** Settings/help first — it is the largest cleanly separable block (306 KB via `tour-flow` alone) and has the least interaction with the first screen. Then Cloud sync/teams. Then Expediente. Labs last; it is closest to the north star (`SOME paste → structured labs → .docx`) and should probably stay in the boot core.

**Definition of done.** The Step 6 budget drops to the new figure and the guard test holds it. Boot timing from Step 0 shows the `did-finish-load` → interactive gap shrink on a real machine, not only in the metafile.
