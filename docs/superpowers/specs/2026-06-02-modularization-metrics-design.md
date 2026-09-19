# Modularization via Metrics & Static Analysis

**Status:** Approved — implementation plan: [`2026-06-02-modularization-metrics.md`](../plans/2026-06-02-modularization-metrics.md)  
**Date:** 2026-06-02  
**Priority:** Developer velocity + testability + evolution, with **runtime performance non-negotiable**  
**Policy:** `.cursor/rules/technical-debt-accounting.mdc`, `scripts/metrics/baseline.json`

---

## Context

R+ is **modular on disk, monolithic at runtime**:

- ~122 renderer features under `public/js/features/` with `register*Runtime()` + `windowHandlers`.
- Single esbuild bundle (`app.js` → `app.bundle.mjs`, ~2.7MB dev) with no code-splitting.
- Hub files (`app-runtimes.mjs`, `app-shell.mjs`) statically import most of the graph.
- Sparse `import()` (onboarding, HC LAN sync, clinical-teams).
- `lib/` and `lan-squad/` are reasonably bounded; renderer god-files (`lan-sync`, `settings-help`, `platform`) drive complexity and coupling.

A prior refactor increased file count without shrinking the load graph, causing perceived performance regression. This design prevents that by coupling modularization to **measurable debt** and **boot/hot-path budgets**.

---

## Section 1: Measurement stack (approved)

### Tools

| Metric | Tool | Scope |
|--------|------|--------|
| Cyclomatic complexity | ESLint `complexity`, `max-depth`, `max-lines-per-function` | Tier 1 on touched files |
| Duplication | `jscpd` (min 8 lines, 60 tokens) | `public/js/`, `lib/` |
| Import / coupling smells | `dependency-cruiser` | Boot hubs + cross-domain |
| Cognitive complexity | `eslint-plugin-sonarjs` | Warn → error on ratchet paths |
| Boot graph | esbuild `metafile` + static import scan | `app.js`, `app-runtimes.mjs`, `app-shell.mjs` |

### Debt score

See `technical-debt-accounting.mdc`. Committed `scripts/metrics/baseline.json`; generated `scripts/metrics/report.json` (gitignored).

**Tier 1 budgets (new or touched files):** cyclomatic ≤ 15, function ≤ 80 lines, file ≤ 600 lines, no new 8-line clones, no new forbidden imports.

**Gates:** `report.totalScore ≤ baseline.totalScore`; bundle growth ≤ 2% without approval; no new eager boot imports without `import()`.

---

## Section 2: Refactoring workflow

### Principles

1. **Measure before moving** — baseline current file score; target net zero debt delta on the PR.
2. **Extract behavior before boundaries** — pure functions and `*-core.mjs` modules first; UI wiring stays in feature shell.
3. **Defer registration, don’t duplicate hubs** — never add static imports to `app-runtimes` for cold paths; use existing `register*Runtime` or dynamic import + single registrar.
4. **One concern per PR** — split `lan-sync.mjs` over multiple PRs by subdomain (conflicts, presence, clinical-ops), not one 4k-line move.

### Standard sequence (per god-file)

```text
1. jscpd + complexity report on file → pick highest-cost smells
2. Extract *-core.mjs (no DOM, no window) → unit tests
3. Deduplicate clones into shared helper (same domain folder)
4. Shrink feature shell to orchestration + windowHandlers
5. If cold path: dynamic import() from single call site; document in bootGraph
6. npm run metrics:check + existing node --test subset for domain
```

### PR checklist

- [ ] Touched files meet Tier 1 budgets  
- [ ] `totalScore` not increased (or baseline refresh explicitly requested)  
- [ ] No new static import in boot hubs unless justified + lazy alternative considered  
- [ ] Tests added/updated for extracted `*-core` logic  
- [ ] `project-context.mdc` changelog if new module or IPC/route (per sync rule)  
- [ ] No hand-edits to `app.bundle.mjs`

### Anti-patterns (caused last regression)

| Don’t | Do instead |
|-------|------------|
| Split file → add imports to `app-runtimes` | Register from existing feature or lazy-load submodule |
| Move code → more cross-feature static imports | Pass via `registerAppRuntimeContext` getters or domain facade |
| Refactor + change render timing in same PR | Behavior-preserving extract first; perf follow-up measured |
| Fix all legacy violations at once | Ratchet only touched files; burn down backlog in scoped initiatives |

### God-file burn-down order (recommended)

1. **`lan-sync.mjs`** — highest coupling; split into `lan-sync/` folder: `conflicts.mjs`, `room-state.mjs`, `clinical-ops-bridge.mjs`, `connection-ui.mjs`, thin `lan-sync.mjs` re-export.
2. **`settings-help.mjs`** — split tour/help/settings into submodules; keep `windowHandlers` merge in shell.
3. **`platform.mjs`** — extract OS/Electron adapters to `platform/` (already partially isolated patterns).
4. **`clinical-teams.mjs`**, **`tendencias.mjs`**, **`estado-actual-panel.mjs`** — domain cores already partially exist; align with table below.

---

## Section 3: Target module map

### Domain packages (logical, not npm packages)

Folders are **prefix or subdirectories** under `public/js/features/` or `public/js/`; enforced by `dependency-cruiser` rules (implementation in plan phase).

| Domain | Path prefix | May import from | Must not import |
|--------|-------------|-----------------|-----------------|
| **boot** | `app.js`, `app-runtimes.mjs`, `app-shell.mjs`, `app-state.mjs` | all domains (orchestration only) | business logic bodies |
| **chrome** | `chrome.mjs`, `pase-board.mjs`, `profile.mjs` | boot contracts, `app-state` | `lan-sync` internals, `settings-help` tour |
| **patients** | `patients.mjs`, `unified-patient-grid-*` | chrome, `app-state`, clinical-access runtime | `settings-help` |
| **labs** | `lab-*`, `tendencias.mjs`, `labs*.mjs` (root) | patients (read-only context), `*-core` | `lan-sync`, entrega |
| **clinical-access** | `clinical-*`, `db-unlock`, `guardia-*` | boot, `lib/db` via IPC bridge | labs panel internals |
| **lan** | `lan-sync.mjs`, `lan-sync/`, `lan-*.mjs` (root) | clinical-access, `lib/` via adapters | settings tour, expediente |
| **expediente** | `expediente.mjs`, `historia-clinica-*`, `hc-*` | patients, labs (read) | lan internals |
| **entrega** | `clinical-entrega.mjs`, `entrega-*` | clinical-access, patients | labs |
| **settings** | `settings-help.mjs`, `settings-help/`, onboarding | chrome, profile | patients list render |
| **productivity** | `productivity.mjs`, `todos.mjs`, search | chrome | lan |

**`lib/`** remains server/main/IPC shared logic; renderer imports `lib/` only through thin adapters (existing pattern in entrega, interno).

### `window` handlers

Keep HTML `onclick` compatibility:

- Each domain shell exports `windowHandlers` (small object).
- `app.js` continues **one** `Object.assign(window, …)` — do not scatter new globals.
- New UI: prefer `data-action` + delegated listener in domain shell over new `window.foo` when touching markup anyway (gradual; not required for every PR).

### Lazy-load candidates (after domain split)

| Module | Trigger |
|--------|---------|
| `settings-help` tour / release notes | First open Settings or Help |
| `clinical-onboarding-main` | Already partial dynamic import — extend pattern |
| `historia-clinica-lan-sync` | Already dynamic — keep |
| `drive-import-modal` | Open import modal |
| `entrega-modal-ui` | Open entrega modal |
| `interno-qr-panel` | Guardia mode + QR tab |

Cold paths use `import()` from **one** call site per domain; cache module promise on first load.

---

## Section 4: CI & npm scripts

### Scripts (to implement)

```json
"metrics": "node scripts/metrics/run.mjs",
"metrics:check": "node scripts/metrics/check.mjs",
"metrics:baseline": "node scripts/metrics/run.mjs --write-baseline"
```

### `run.mjs` responsibilities

1. ESLint on Tier 1 globs with complexity + sonarjs rules.  
2. `jscpd` JSON report → duplicationDebt contribution.  
3. `dependency-cruiser` → importSmellDebt.  
4. Parse boot files + esbuild metafile (or import list from `app-boot-imports.test` style) → bootGraphHash + bootGraphDebt.  
5. Write `scripts/metrics/report.json`.

### `check.mjs`

- Fail if `report.totalScore > baseline.totalScore`.  
- Fail if any **git-changed** file under Tier 1 globs violates budgets.  
- Warn on bundle size delta from committed `app.bundle.meta.json` threshold.

### CI placement

| When | Command |
|------|---------|
| PR / local pre-push (recommended) | `npm run metrics:check` |
| Nightly | `npm run metrics` + upload report artifact |
| Release (`prebuild:mac`) | `metrics:check` + existing `build:ui:check` |

### Perf smoke (lightweight, same pipeline)

- **Boot graph:** compare `bootGraphHash` to baseline.  
- **Optional:** `node --test public/js/app-boot-imports.test.mjs` already guards import integrity — keep in metrics job.  
- **Future:** Electron-less timer around `registerAllFeatureRuntimes` in jsdom fixture (plan task, not blocking v1 metrics).

---

## Approach summary

| Phase | Focus | Outcome |
|-------|--------|---------|
| **0** (done) | Debt rule + baseline contract | `.cursor/rules/technical-debt-accounting.mdc` |
| **1** | ESLint + jscpd + dependency-cruiser + `run.mjs` | First real `baseline.json` population |
| **2** | Ratchet refactors on god-files | Smaller files, stable or lower debt score |
| **3** | Domain folders + cruiser rules | Enforced boundaries |
| **4** | Lazy chunks + esbuild `splitting` (optional) | Smaller initial parse; no UX regression |

---

## Success criteria

- Debt score trend flat or decreasing over 8 weeks.  
- No PR increases `totalScore` without labeled baseline refresh.  
- Top 5 files by line count each reduced by ≥ 30% or split into submodules with Tier 1 compliance.  
- User-visible: cold start and patient-switch latency unchanged within measurement noise (manual + future smoke).  

---

## Out of scope (YAGNI)

- Micro-frontends or iframe modules.  
- Rewriting `window` handlers to full event-bus architecture.  
- npm workspaces / monorepo split.  
- SonarQube server (CLI tools only).
