# Cold Start & Code Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Ship Phase 0 completely before Phase 2.**

**Goal:** Reduce cold-start lag (early Electron window, lazy LAN server, smaller initial JS parse) and improve code navigation (bounded files, `features/lan/` layout, enforced debt metrics) without changing clinical/LAN merge semantics.

**Architecture:** Phase 0 fixes main-process sequencing and wires the metrics gate from the modularization-metrics plan. Phase 1 decomposes god-files and consolidates LAN paths under ratchet rules. Phase 2 adds lazy feature routes and esbuild code-splitting with boot-graph regression tests.

**Tech Stack:** Electron 41 `main.js`, Node `node:test`, esbuild (`scripts/bundle-renderer.mjs`), Express/`lan-squad` lazy init, vanilla ESM renderer.

**Spec:** [`docs/superpowers/specs/2026-06-03-cold-start-navigation-design.md`](../specs/2026-06-03-cold-start-navigation-design.md)

**Prerequisites:** `npm test` green on branch; read `technical-debt-accounting.mdc`.

**Debt gate:** After every task group, `npm run metrics:check` (once BN-00 complete) and `npm run build:ui` when renderer changes.

**Suggested branch:** `perf/cold-start-navigation` (worktree recommended).

**Related plan (BN-00):** [`2026-06-02-modularization-metrics.md`](2026-06-02-modularization-metrics.md) — execute Tasks 1–7 there first or in parallel with BN-01.

---

## File map (by phase)

| Phase | File | Action |
|-------|------|--------|
| 0 | `scripts/metrics/*` | Create pipeline per modularization-metrics plan |
| 0 | `package.json` | `metrics`, `metrics:check`, `metrics:baseline` |
| 0 | `main.js` | Early `createWindow`, lazy `startLanServer` |
| 0 | `server.js` | Export `startLanServer` / idempotent listen |
| 0 | `preload.js` | Optional `lanServerReady` IPC |
| 0 | `public/js/boot/boot-steps.mjs` | **Create** — ordered boot steps |
| 0 | `public/js/app.js` | Use boot-steps; no new eager imports |
| 0 | `public/js/app-runtimes.mjs` | Pass `rt` to registrars (BN-03) |
| 1 | `public/js/features/lan/*` | **Create** — move LAN modules (BN-04) |
| 1 | `public/js/features/settings-help/*` | **Create** — split BN-05 |
| 1 | `public/js/features/platform/*` | **Create** — split BN-06 |
| 1 | `public/js/features/clinical-teams/*` | **Create** — split BN-07 |
| 1 | `public/js/app-shell.mjs` | Trim BN-08 |
| 2 | `public/index.html` | Chart UMD before bundle (BN-09 revised — reliability over lazy-only) |
| 2 | `scripts/bundle-renderer.mjs` | `splitting: true` BN-11 |
| 2 | `public/js/app-boot-imports.test.mjs` | Boot graph denylist BN-12 |
| * | `public/js/app.bundle.mjs` | Regenerate only via `npm run build:ui` |
| * | `.cursor/rules/project-context.mdc` | Changelog on architectural merge |

---

## Phase 0 — Governance & boot path (BN-00 – BN-03)

### Task 0: BN-00 — Metrics pipeline (delegate)

**Files:** See [`2026-06-02-modularization-metrics.md`](2026-06-02-modularization-metrics.md) Tasks 1–7.

- [ ] **Step 1:** Complete modularization-metrics Tasks 1–6 (eslint, jscpd, dependency-cruiser, `run.mjs`, `check.mjs`).

- [ ] **Step 2:** Run `npm run metrics:baseline` and commit populated `scripts/metrics/baseline.json`.

- [ ] **Step 3:** Add to `package.json` `pretest` chain OR document in PR template: `npm run metrics:check`.

- [ ] **Step 4:** Verify `npm run metrics:check` passes on clean tree.

**Stop gate:** Do not start BN-10/11 until this task is done.

---

### Task 1: BN-01 — Lazy LAN server factory

**Files:**
- Modify: `server.js`
- Modify: `main.js`
- Test: `lib/server-http-security.test.js` (if exists); add `main-boot-order.test.mjs` optional

- [ ] **Step 1: Refactor `server.js` to export idempotent starter**

Ensure module does not listen on `require()` — export async function:

```javascript
let serverInstance = null;

async function startLanServer(opts = {}) {
  if (serverInstance) return serverInstance;
  // existing listen/setup logic
  return serverInstance;
}

function stopLanServer() {
  if (serverInstance && serverInstance.close) serverInstance.close();
  serverInstance = null;
}

module.exports = { startLanServer, stopLanServer };
```

Adjust existing `module.exports` pattern to match how `main.js` consumes it today.

- [ ] **Step 2: Write failing test (optional but recommended)**

Create `main-lan-lazy.test.mjs` that mocks `server` module and asserts `main.js` startup path does not call `startLanServer` before window path (static analysis test: read `main.js` source, assert no top-level `require('./server')` listen).

- [ ] **Step 3: Update `main.js` whenReady**

```javascript
// Remove: server = await require('./server');
// Keep: DB native + IPC + registerDbIpcHandlers
// Move ensureUnlocked to non-blocking for window:
buildMenu();
createWindow();
try {
  await dbManager.ensureUnlocked();
} catch (unlockErr) { /* existing warn */ }
globalThis.__rplusStartLanServer = () =>
  import('./server.js').then((m) => m.startLanServer());
```

Wire `before-quit` to `stopLanServer` if started.

- [ ] **Step 4: Tiered LAN start (see spec “LAN host when primary leaves”)**

Add preload IPC: `ensureLanServerReady()` → main `startLanServer()`.

**Tier A (after window, non-blocking):** In renderer boot or `lan-sync` init, if `storage.getLanConfig()` role is `host`|`client`, or room membership / `getSurrogateHostState()` exists → `void ensureLanServerReady()` (do not block first paint).

**Tier B:** Before first sync connect / ⇄ host actions / `joinLanRoom`.

**Tier C:** At start of `promoteSelfToSurrogateHost()` in `lan-sync-room.mjs` — `await ensureLanServerReady()` before `resolveLanHostUrlAuto` + push.

Retry connect with backoff if ping fails while server still starting.

- [ ] **Step 5: Manual verify**

```bash
npm start
# LAN disabled: lsof -i :3738 should be empty until user opens ⇄ panel
# LAN enabled: server listens, sync works
```

- [ ] **Step 6: Run tests**

```bash
npm test
npm run metrics:check
```

- [ ] **Step 7: Commit**

```bash
git commit -m "perf(main): lazy-start LAN server after window creation"
```

---

### Task 2: BN-02 — Boot step registry

**Files:**
- Create: `public/js/boot/boot-steps.mjs`
- Modify: `public/js/app.js`
- Test: extend `public/js/app-boot-imports.test.mjs` or create `public/js/boot/boot-steps.test.mjs`

- [ ] **Step 1: Create boot-steps module**

```javascript
/**
 * @param {Array<{ id: string, run: (ctx: object) => Promise<void> }>} steps
 */
export async function runBootSteps(steps, ctx) {
  for (const step of steps) {
    try {
      await step.run(ctx);
    } catch (err) {
      console.error('[boot]', step.id, err);
      throw err;
    }
  }
}
```

- [ ] **Step 2: Move existing chain from `app.js` into step array**

Steps (order preserved):

1. `clinical-access-init`
2. `onboarding-dynamic-import`
3. `clinical-teams-dynamic-import`
4. `consume-team-join-url`

- [ ] **Step 3: Replace `.then()` ladder with `runBootSteps`**

- [ ] **Step 4: Run tests**

```bash
node --test public/js/app-boot-imports.test.mjs
npm test
```

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(boot): ordered boot step registry in app.js"
```

---

### Task 3: BN-03 — Collapse app-runtimes DI

**Files:**
- Modify: `public/js/app-runtimes.mjs`
- Modify: each `register*Runtime` in feature files (signature accepts `rt` or `ctx`)
- Test: existing feature tests + `app-boot-imports.test.mjs`

- [ ] **Step 1: Add shared context export in app-runtimes**

```javascript
export function getAppRuntimeContext() {
  return rt;
}
```

- [ ] **Step 2: Change one registrar as template (e.g. `registerPaseBoardRuntime`)**

From:

```javascript
registerPaseBoardRuntime({ getActiveAppTab: function () { return rt.getActiveAppTab(); }, ... });
```

To:

```javascript
registerPaseBoardRuntime(rt);
```

Update `pase-board.mjs` to read `ctx.getActiveAppTab()` etc.

- [ ] **Step 3: Migrate remaining registrars in batches** (patients, labs, lan-sync, chrome — one commit per batch)

- [ ] **Step 4: Measure line count**

Target `app-runtimes.mjs` ≤ 600 lines.

- [ ] **Step 5: Run tests + metrics**

```bash
npm test
npm run metrics:check
npm run build:ui
```

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(runtimes): pass shared context instead of DI closures"
```

---

## Phase 1 — Navigation & decomposition (BN-04 – BN-08)

> One BN ID per PR. Each PR: extract `*-core.mjs` + tests first, then move DOM shell.

### Task 4: BN-04 — LAN folder consolidation

**Files:**
- Create: `public/js/features/lan/orchestrator.mjs`, `push.mjs`, `room.mjs`, `transport.mjs`, `panel.mjs`, `runtime.mjs`
- Modify: imports across codebase (grep `lan-sync-push`, `lan-sync-panel`, etc.)
- Modify: `.dependency-cruiser.cjs` when BN-00 added — `lan` domain paths
- Test: all `lan-sync*.test.mjs`, `lan-sync-wiring.test.mjs`

- [ ] **Step 1: Create `features/lan/orchestrator.mjs` barrel** — re-export public API currently imported from `features/lan-sync.mjs`

- [ ] **Step 2: Move files with `git mv`** — preserve history where possible

- [ ] **Step 3: Keep `features/lan-sync.mjs` as thin forwarder** (≤ 50 lines) for one release, then delete in follow-up

- [ ] **Step 4: Update `project-context.mdc` domain index** (LAN row)

- [ ] **Step 5: `npm test` + `npm run build:ui` + `metrics:check`**

- [ ] **Step 6: Commit** `refactor(lan): consolidate modules under features/lan/`

---

### Task 5: BN-05 — Split settings-help

**Files:**
- Create: `public/js/features/settings-help/index.mjs`, `settings-dropdown.mjs`, `help-content.mjs`, `tour-runtime.mjs`
- Modify: `app-runtimes.mjs` import path (still eager until Phase 2)
- Test: `settings-help-imports.test.mjs`

- [ ] **Step 1: Run jscpd/complexity on `settings-help.mjs`** — pick largest extract (tour vs help)

- [ ] **Step 2: Extract pure tour helpers → `tour-runtime.mjs` + tests**

- [ ] **Step 3: Extract dropdown → `settings-dropdown.mjs`**

- [ ] **Step 4: Leave `index.mjs` shell ≤ 400 lines merging `windowHandlers`**

- [ ] **Step 5: Verify no file > 1000 lines; `metrics:check`**

- [ ] **Step 6: Commit** `refactor(settings-help): split tour and dropdown modules`

---

### Task 6: BN-06 — Split platform

Same pattern as Task 5 for `platform.mjs` → `features/platform/{audit,offline,import-backup,index}.mjs`.

- [ ] Complete extract-test-move sequence
- [ ] Commit `refactor(platform): split audit offline import modules`

---

### Task 7: BN-07 — Split clinical-teams

**Files:** `features/clinical-teams/*` — align with existing dynamic `import()` chunks.

- [ ] **Step 1: Freeze line count** — no net +lines in shell until extract done

- [ ] **Step 2: Extract `teams-invite.mjs`, `teams-roster.mjs` cores + tests**

- [ ] **Step 3: Commit** `refactor(clinical-teams): split invite and roster`

---

### Task 8: BN-08 — Trim app-shell

**Files:**
- Modify: `public/js/app-shell.mjs`
- Move: doc-export guards → owner feature module
- Test: any `app-shell` contract tests

- [ ] **Step 1: List exports used outside shell** (grep `from './app-shell`)

- [ ] **Step 2: Move doc-export + confetti with re-export shim in shell (deprecate comment)**

- [ ] **Step 3: Target ≤ 800 lines; metrics:check**

- [ ] **Step 4: Commit** `refactor(shell): move doc-export and celebration out of app-shell`

---

## Phase 2 — Lazy load & splitting (BN-09 – BN-12)

### Task 9: BN-09 — Chart.js loading (revised)

**Decision:** Keep `chart.umd.min.js` in `index.src.html` before the bundle (sync global `Chart`). `vendor-loader.mjs` only injects UMD if missing; dropped brittle ESM/`chart-chunk.json` path after prod failures.

**Files:**
- Modify: `public/index.src.html`, `public/js/features/tendencias.mjs`, `public/js/vendor-loader.mjs`
- Create: `public/js/vendor-loader.mjs`, `public/js/vendor-loader.test.mjs`

- [x] **Step 1: Add `loadChartJs()` promise cache in vendor-loader**

- [x] **Step 2: Restore `<script src="vendor/chart.umd.min.js">` in index.src.html** (revised from lazy-only)

- [x] **Step 3: Call `await loadChartJs()` before first chart init; tendencias error toasts**

- [x] **Step 4: Manual — open tendencias chart + estado actual chart**

- [x] **Step 5: Commit** `fix(chart): restore UMD in index; drop brittle ESM lazy path`

---

### Task 10: BN-10 — Feature lazy routes (pilot)

**Pilot domains:** `settings-help`, `platform` (post-split index shells).

**Files:**
- Modify: `public/js/app-runtimes.mjs`, `public/js/app.js`
- Modify: `features/settings-help/index.mjs`, `features/platform/index.mjs`

- [ ] **Step 1: Replace static import with stub registrar**

```javascript
let settingsHelpPromise;
export function ensureSettingsHelpLoaded() {
  if (!settingsHelpPromise) {
    settingsHelpPromise = import('./features/settings-help/index.mjs');
  }
  return settingsHelpPromise;
}
```

- [ ] **Step 2: Wire first-open settings to `await ensureSettingsHelpLoaded()`**

- [ ] **Step 3: Run boot-graph — confirm hash changed and import removed from hub**

- [ ] **Step 4: Commit** `perf(boot): lazy-load settings-help on first open`

Repeat for `platform` in second commit.

---

### Task 11: BN-11 — esbuild code splitting

**Files:**
- Modify: `scripts/bundle-renderer.mjs`
- Modify: `public/index.html` (script path if entry becomes `app.bundle.mjs` + chunks)
- Modify: `scripts/bundle-renderer.test.mjs`

- [ ] **Step 1: Enable splitting in buildOptions**

```javascript
splitting: true,
chunkNames: 'chunks/[name]-[hash]',
```

- [ ] **Step 2: Update `index.html` to load entry only** (esbuild injects dynamic imports)

- [ ] **Step 3: Run prod bundle and compare metafile**

```bash
npm run bundle:renderer:prod
# Record initial chunk bytes in PR notes
```

- [ ] **Step 4: Test Electron packaged path** `npm run build:mac` smoke — app launches

- [ ] **Step 5: Commit** `perf(bundle): enable esbuild code splitting`

---

### Task 12: BN-12 — Boot graph denylist test

**Files:**
- Modify: `scripts/metrics/boot-graph.mjs` or `public/js/app-boot-imports.test.mjs`

- [ ] **Step 1: Add denylist paths** (post-lazy module paths)

```javascript
const LAZY_ONLY = [
  'features/settings-help/index.mjs',
  'features/platform/index.mjs',
];
```

- [ ] **Step 2: Assert boot hubs do not statically import denylist**

- [ ] **Step 3: Wire test into `npm test` and `metrics:check`**

- [ ] **Step 4: Commit** `test(boot): deny eager imports for lazy-only modules`

---

## Verification checklist (end of initiative)

- [x] Phase 0: Window visible before LAN listen (LAN off scenario) — lazy LAN in `main.js`; manual spot-check OK
- [x] Phase 0: `metrics:check` in CI/local pre-push — wired in `pretest`
- [x] Phase 1: No `features/*.mjs` > 1000 lines for touched BN splits
- [x] Phase 2: Chart UMD in `index.src.html` before bundle; `loadChartJs()` fallback inject; pilot lazy routes (Ajustes / platform) work
- [ ] Phase 2: esbuild chunks load in Electron prod build — run `npm run build:mac:arm64-only` smoke
- [x] `project-context.mdc` changelog updated
- [x] Initiative shipped on `main` (9967514 + follow-ups)

---

## Suggested execution order (human or agent)

```text
Week 1:  Task 0 (BN-00) ∥ Task 1 (BN-01) → Task 2 (BN-02) → Task 3 (BN-03)
Week 2:  Task 4 (BN-04) → Task 5 or 6 (BN-05/06)
Week 3:  Task 7 (BN-07) → Task 8 (BN-08)
Week 4:  Task 9 (BN-09) → Task 10 (BN-10 pilot) → Task 11 (BN-11) → Task 12 (BN-12)
```

Do not parallelize Task 11 with Task 1 — splitting before lazy routes increases debug surface.

---

## Out of scope (track separately)

| Item | Track in |
|------|----------|
| Split `tendencias`, `estado-actual-panel`, `lab-panel`, `patients` | modularization-metrics god-file table |
| IM-14–16 LAN future specs | lan-sync-improvements Phase 4 |
| Full `onclick` → `data-action` migration | modular-app-refactor follow-up |
| Boot graph: eager `features/platform/*` and `features/settings-help/*` sub-imports in `app-shell` / `app-runtimes` | cold-start follow-up — route through lazy barrels or dynamic `import()` |
