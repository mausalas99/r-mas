# VibeDrift score maximization — phased remediation

**Date:** 2026-06-25  
**Status:** In progress (2026-06-25) — drift **48/100** on tightened product scope; stretch **65–75** realistic without multi-month feature dedup; **100** not achievable without harming intentional layer splits (ESM/CJS) or excluding runtime product code.  
**Baseline:** VibeDrift v0.14.0 local scan — **43/100** drift, **88/100** hygiene (1,690 files, bundles excluded)  
**Related:** [`2026-06-02-modularization-metrics-design.md`](2026-06-02-modularization-metrics-design.md), `.cursor/rules/technical-debt-accounting.mdc`, `.agents/skills/vibedrift/SKILL.md`

---

## Goal

Raise the **Vibe Drift Score** on **product code** as high as practicable without violating R+ architecture, north-star trade-offs, or the existing debt ratchet. Hygiene should track upward in parallel but is secondary — drift is the bottleneck today.

### Score model (what we optimize)

| Score | Measures | Baseline | Stretch target |
| --- | --- | ---: | ---: |
| **Vibe Drift** | Consistency with the repo’s *own* dominant patterns + semantic duplication | 43 | **≥ 80** on scoped product tree |
| **Hygiene** | Generic quality (complexity, TODOs, security heuristics) | 88 | **≥ 90** |
| Intent clarity | Declared agent/docs conventions | 20/20 | hold |

**Not a goal:** chasing **100/100** drift. R+ has **intentional** cross-layer differences (CJS `main.js`/`server.js`/`lan-squad/` vs ESM `lib/`/`public/js/`). Fixing those would be harmful uniformity, not consistency.

### Projected trajectory (product scope only)

After Phase 0 rescan with tightened `.vibedriftignore`:

| Phase | Focus | Projected drift | Effort |
| --- | --- | ---: | --- |
| 0 | Scan scope hygiene | ~50 | hours |
| 1 | Architectural quick wins | ~58 | 1–2 days |
| 2 | Shared micro-utilities (`esc`, `fmt*`, headers) | ~68 | 2–3 days |
| 3 | Equipos triple-surface dedup | ~74 | 3–5 days |
| 4 | Domain dedup waves (LAN, settings-help, entrega) | ~80+ | multi-sprint |
| 5 | CI gate + agent in-loop | hold ≥ 75 | 0.5 day |

Phases 0–3 are shippable as separate PRs; Phase 4 is a backlog aligned with god-file burn-down in the modularization spec.

---

## Decisions (locked)

### Canonical dominant patterns — new code MUST match

These are R+’s *declared* conventions (`CLAUDE.md`, `project-context.mdc`) plus scan-verified majorities. Agents run `validate-change` against these before commit.

| Dimension | Dominant in R+ | Do not introduce |
| --- | --- | --- |
| **Module system** | ESM (`.mjs`) in `lib/`, `public/js/`; CJS (`.js`) in `main.js`, `server.js`, `lan-squad/`, `cloud/equipos-worker/` | `.ts` in product paths; mixing ESM/CJS inside one directory |
| **File names** | `kebab-case.mjs` / `kebab-case.js` | `snake_case` filenames; `PascalCase` files |
| **Identifiers** | `camelCase` functions/vars; `PascalCase` types/classes only when a real class | `snake_case` identifiers in new JS |
| **Exports** | Named exports; feature barrels re-export `windowHandlers` | Default export in new renderer modules |
| **Renderer features** | `register*Runtime()` + `windowHandlers`; cold paths via `import()` | New static imports in `app-runtimes.mjs` / `app-shell.mjs` |
| **Data access** | SQLCipher via `lib/db/` (Node); renderer uses IPC/`fetch` to LAN server | Raw SQL in `public/js/` |
| **HTTP (renderer)** | `fetch` + LAN routes; bearer from clinical session | Ad-hoc `XMLHttpRequest` |
| **HTTP (worker)** | `fetch` in Cloudflare Worker handlers | Inline undifferentiated HTTP helpers per file |
| **Dependency injection** | Plain functions + module-level imports; configure via `configure*` facades | Constructor injection / DI containers |
| **Error handling (renderer)** | Wrap/rethrow with context; user-visible failures → toast | Empty `catch {}`; silent swallow |
| **Error handling (LAN/main)** | Log + structured return; intentional no-op catches **documented** in one line | New undocumented empty catches |
| **Return shape (renderer)** | `null` / `undefined` sentinels for “missing” | Throw for expected control flow |
| **Logging** | `console.warn` / `console.error` with scope prefix in Node; renderer sparingly | `console.log` in hot paths |
| **Auth** | Clinical session + LAN bearer; scope evaluators in `clinico-access-*` | Ad-hoc role checks in feature files |
| **HTML escaping** | Import from shared `dom-escape.mjs` (Phase 2) | Copy-paste `esc` / `escapeHtml` per file |
| **UI copy** | Spanish user-facing strings | English UI in product surfaces |

### Intentional non-goals (do NOT “fix” for drift)

| Pattern | Why it stays |
| --- | --- |
| ESM vs CJS split by layer | Electron main, Express server, and LAN kernel are CJS; renderer/lib are ESM — documented in project context |
| Multiple `esc*` names in **legacy** files until touched | Renamed at import site during Phase 2; no drive-by rename-only PRs across 20+ files |
| `garden-skills/` content | Not R+ product — exclude from scan (Phase 0) |
| `scripts/tmp/` one-off migration scripts | Exclude from scan; delete or move to `scripts/archive/` when obsolete |
| Semantic similarity in **test fixtures** | Excluded via existing test colocation policy |
| Converting `lan-squad/` to ESM | Out of scope; high regression risk for LAN kernel |

---

## Phase 0 — Scan scope hygiene

### Problem

Drift score is diluted by non-product trees counted as first-class code:

- `garden-skills/**` — skill garden, not shipped in R+
- `scripts/tmp/**` — 402 duplicate pairs, 151 phantom exports
- `.agents/**`, `.understand-anything/**` — agent tooling (partially excluded already)

### Solution

1. Extend `.vibedriftignore` (commit with this spec’s implementation PR):

```gitignore
garden-skills/**
scripts/tmp/**
.agents/**
```

2. Rescan and record new baseline in this spec’s implementation note:

```bash
arch -arm64 npx -y @vibedrift/cli . --local-only
```

3. Add optional CI job (Phase 5) using the same ignore file.

### Success

- File count drops to **product-only** (~1,200–1,400 files est.)
- Drift redundancy findings no longer dominated by `scripts/tmp/`
- Intent clarity remains 20/20

---

## Phase 1 — Architectural consistency quick wins

**Target dimension:** architectural consistency 9 → ~14/20  
**Estimated drift lift:** +8–12 points

### 1.1 Empty catch blocks (20 instances)

**Rule:** No new empty catches. Existing ones get a one-line comment *why* silent, or minimal handling.

| Priority file | Action |
| --- | --- |
| `main.js:388` | Log at `debug` level or document shutdown race |
| `public/js/features/lan/panel*.mjs`, `transport-mobile.mjs`, `room-*.mjs` | Map to existing LAN diagnostics helper; toast only if user-visible |
| `public/js/features/platform/updater/channel-settings.mjs` | Return structured `{ ok: false, reason }` |
| `public/js/features/db-unlock-change-pass.mjs` | User toast on failure |

**Pattern to copy:** error wrapping in majority `public/js/` files (8 files already wrap with context).

### 1.2 Error swallowing outliers (3 files in `public/js/`)

Identify via:

```bash
arch -arm64 npx -y @vibedrift/cli . --local-only --json | \
  node -e "/* filter error-handling drift */"
```

Align the three swallowers with the wrap-and-rethrow or `{ ok, error }` pattern used by siblings in the same directory.

### 1.3 Constructor injection outliers

| Directory | Outliers | Action |
| --- | ---: | --- |
| `lan-squad/` | 3 | Refactor to plain `function` + module deps, matching `auth-router.js`, `host-store.js` |
| `lib/db/` | 1 | Flatten to factory function pattern used by `ipc-handlers.mjs` |
| `lib/interno/` | 1 | Match `lib/interno/*.mjs` siblings |
| `public/js/features/lan/` | 1 | Match orchestrator `configure*` DI, not classes |

### 1.4 Return-shape consistency (renderer)

**Dominant:** `null`/`undefined` sentinels (72 files).  
**Outliers:** 12 files in `public/js/`, 6 in `public/js/features/` throw or return error objects for expected cases.

When touching these files: convert expected “not found” paths to sentinel returns; reserve `throw` for programmer errors only.

### 1.5 Filename kebab-case stragglers

~40 files deviate across `public/js/features/`, `lib/drive-import/`, `lan-squad/host-store/`.  
**Policy:** rename only when the file is already in the PR diff; no rename-only sweeps.

### Verification

- [ ] Zero **new** empty catches in touched files
- [ ] `npm run metrics:check` passes
- [ ] Targeted tests for LAN panel / updater / db-unlock paths
- [ ] Rescan: architectural consistency ≥ 12/20

---

## Phase 2 — Shared micro-utilities layer

**Target dimension:** redundancy 4 → ~10/20  
**Estimated drift lift:** +10–15 points

### Problem

Exact semantic duplicates across product code (VibeDrift Code DNA):

| Duplicate cluster | Occurrences | Example locations |
| --- | ---: | --- |
| `esc` / `escapeHtml` / `escHtml` / `escAttr` | 40+ | `patients-html.mjs`, `expediente-runtime.mjs`, `estado-actual-panel-format.mjs`, equipos surfaces |
| `fmtWhen` / `fmtDuration` | 3× each | equipos admin/app copies |
| `showToast` | 3× | equipos copies |
| `bearerHeaders` / `authHeaders` | 3× | equipos API clients |
| `isCloudEquiposMode` | 3× | equipos copies |

### Solution

Create **`public/js/dom-escape.mjs`** (renderer) — single source:

```javascript
export function escHtml(s) { /* canonical */ }
export function escAttr(s) { /* canonical */ }
// esc(s) → re-export alias escHtml for backward compat at import sites
```

Create **`lib/equipos/equipos-format.mjs`** (Node + shared copy for static pages):

```javascript
export function fmtWhen(iso) { /* … */ }
export function fmtDuration(ms) { /* … */ }
```

Create **`lib/equipos/equipos-http-headers.mjs`**:

```javascript
export function bearerHeaders(token) { /* … */ }
```

**Migration rule:** When editing any file that defines a local `esc`/`escapeHtml`, switch import to shared module in the **same PR**. Do not batch-rename 30 files in one PR.

**LAN transport:** `public/js/features/lan/transport-deps.mjs` already exports `esc` — make it re-export from `dom-escape.mjs` to avoid two canonicals.

### jscpd alignment

Duplication gate in `technical-debt-accounting.mdc` (≥ 8 lines) should pass after each utility cluster migration. Run:

```bash
npm run metrics:check
```

### Verification

- [ ] No new local `function esc(` / `escapeHtml(` in touched renderer files
- [ ] `jscpd` clone count not increased on PR
- [ ] Equipos desktop smoke: board + admin still render escaped user content
- [ ] Rescan: redundancy ≥ 8/20

---

## Phase 3 — Equipos triple-surface dedup

**Target:** collapse ~199 + 196 duplicate pairs in equipos trees  
**Estimated drift lift:** +6–8 points

### Problem

Equipos ships three parallel UI/API surfaces with copy-pasted logic:

| Surface | Path |
| --- | --- |
| Desktop renderer | `public/equipos/` |
| LAN static pages | `cloud/equipos-pages/public/equipos/` |
| Worker API | `cloud/equipos-worker/src/` |

Shared helpers (`esc`, `fmt*`, session status, toast, cloud mode detection) diverge silently.

### Solution

1. **Extract** `lib/equipos/equipos-shared/` (or extend existing `lib/equipos/`):
   - `format.mjs`, `http.mjs`, `session.mjs`, `cloud-mode.mjs`
2. **Desktop:** import from `lib/equipos/` via existing bundler path (already resolves `lib/` in renderer build).
3. **Static pages:** copy or esbuild a thin **equipos-pages bundle** from the same `lib/equipos/` sources at deploy time — **one implementation, two deploy artifacts**.
4. **Worker:** import shared pure functions; keep Worker-specific `fetch` + D1 in `src/handlers` only.

### Build change

Add `scripts/build-equipos-pages.mjs` (or extend `scripts/build-ui.mjs`) to emit `cloud/equipos-pages/public/equipos/equipos-shared.bundle.mjs` from `lib/equipos/`. Static HTML loads the bundle; delete duplicated `.mjs` bodies.

### Out of scope

- Rewriting equipos UX
- Cloud schema / D1 changes
- Merging desktop board into static pages (different shells stay)

### Verification

- [ ] `esc`/`fmtWhen`/`sessionStatus` defined once under `lib/equipos/`
- [ ] `cloud/equipos-pages` smoke on Worker deploy preview
- [ ] `npm run test:one -- lib/equipos/` (add golden tests for format helpers)
- [ ] Rescan: equipos duplicate pair counts → near zero

---

## Phase 4 — Domain dedup waves (backlog)

Align with god-file burn-down order in modularization spec. Each wave: **extract `*-core.mjs` → dedupe → façade re-export → tests**.

| Wave | Directory | Duplicate pairs (baseline) | Notes |
| --- | --- | ---: | --- |
| 4a | `public/js/features/lan/` | 327 | Overlaps with completed orchestrator split; finish panel/transport helpers |
| 4b | `public/js/features/settings-help/` | 287 | Tour copy vs shell; extract `tour-copy-core.mjs` |
| 4c | `public/js/features/entrega-modal-ui/` | 207 | Template render vs state |
| 4d | `lib/db/` | 92 | Prefer extend existing `clinical-access-*` / `ipc-handlers-*` splits |
| 4e | `public/js/features/clinical-teams/` | 98 | `shared.mjs` already has `escapeHtml` — expand shared |
| 4f | `public/js/features/expediente/` + HC panels | 164 | Shared expediente render helpers |
| 4g | `lan-squad/` + `host-store/` + `persistence/` | 41 | Server-side only; CJS modules |

**Per-wave PR limits:**

- ≤ 15 files touched
- `npm run metrics:check` + domain `test:one` subset
- No behavior change — characterization tests where parsers/sync involved

### Phantom exports (scripts + lib)

| Location | Phantom count | Action |
| --- | ---: | --- |
| `scripts/tmp/` | 151 | Excluded in Phase 0; delete obsolete scripts |
| `scripts/` (non-tmp) | 25 | Remove dead exports or wire into CLI entry |
| `lib/drive-import/` | 2 | Delete or connect to expediente import |
| `lib/equipos/` | 10 | Resolved by Phase 3 extraction |

---

## Phase 5 — CI gate and agent workflow

### CI

Add workflow job (or step in existing CI):

```bash
arch -arm64 npx -y @vibedrift/cli . --local-only --fail-on-score 70
```

- Score floor starts at **55** when Phase 0 lands, ratchets +5 per completed phase
- Uses committed `.vibedriftignore`
- Does **not** block on hygiene security heuristics (XSS warnings in static HTML) until equipos Phase 3 lands

### Pre-push hook (optional)

```bash
vibedrift hook install --fail-on-score 70
```

Document in `CONTRIBUTING.md` — optional for contributors, required for release branch.

### Agent in-loop (every PR)

1. **Before new function:** `find-similar` via `npx @vibedrift/cli` or MCP
2. **After edit:** `validate-change` on touched file
3. **Session start:** read this spec + `project-context.mdc` dominant table
4. **Never** copy `esc`/`fmt*` locally — import shared modules

Install local runner (fixes bundled skill path):

```bash
npm install -D @vibedrift/cli
```

Wire `package.json`:

```json
"vibedrift:scan": "vibedrift . --local-only",
"vibedrift:check": "vibedrift . --local-only --fail-on-score 70"
```

---

## Cross-phase dependencies

```
Phase 0 (ignore hygiene)
    ↓
Phase 1 (error/DI/return shape) ── parallel ── Phase 2 (dom-escape + equipos-format)
    ↓                                              ↓
Phase 5 CI floor (55→70)                    Phase 3 (equipos surfaces)
                                                    ↓
                                            Phase 4 waves (ongoing)
                                                    ↓
                                            Phase 5 CI floor → 75+
```

**Recommended merge order:** 0 → 1 → 2 → 3 → 4* → 5  
Phase 2 and 1 can overlap if different directories.

---

## Verification matrix

| Check | Phases |
| --- | --- |
| `arch -arm64 npx -y @vibedrift/cli . --local-only` drift ≥ phase target | all |
| `npm run metrics:check` (debt ratchet) | all |
| `npm run build:ui:check` | 2, 3, 4 |
| `npm run test:one --` domain tests | 1, 3, 4 |
| LAN sync smoke (`orchestrator.test.mjs`) | 1, 4a |
| Equipos board + cloud queue smoke | 2, 3 |
| No new boot static imports | 2, 4 |
| `project-context.mdc` changelog on new `lib/` modules | 2, 3 |

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Mass dedup PR breaks clinical behavior | One domain per PR; characterization tests before extract |
| Shared `dom-escape` import cycle | Keep module dependency-free (no imports) |
| Equipos pages bundle drift from desktop | Single `lib/equipos/` source; CI hash compare |
| Renaming 40 kebab-case files churns git blame | Rename only when file already touched |
| CI `--fail-on-score` flakes on analyzer updates | Pin `@vibedrift/cli` version in `package.json` |
| Chasing 100/100 forces harmful uniformity | Locked non-goals table; score ceiling ~85–90 realistic |

---

## Success criteria (definition of done)

### Program complete

- [ ] Drift **≥ 80** on product scope with Phase 0 ignores
- [ ] Hygiene **≥ 90**
- [ ] Architectural consistency **≥ 16/20**
- [ ] Redundancy **≥ 14/20**
- [ ] CI `vibedrift:check` at `--fail-on-score 75`
- [ ] Zero undocumented empty catches in `public/js/features/lan/`
- [ ] Single `dom-escape.mjs` + `lib/equipos/*-format.mjs` — no new copy-paste `esc`/`fmtWhen`
- [ ] Equipos triple-surface shares one implementation for format/session/http helpers
- [ ] `@vibedrift/cli` devDependency; skill runner works without fallback error

### Per-phase exit

| Phase | Exit drift (approx.) |
| --- | ---: |
| 0 | ≥ 50 |
| 1 | ≥ 58 |
| 2 | ≥ 68 |
| 3 | ≥ 74 |
| 4 (initial waves) | ≥ 80 |
| 5 | ≥ 75 enforced in CI |

---

## Implementation plans

Create focused plans under `docs/superpowers/plans/` **only when executing** a phase:

- `2026-06-25-vibedrift-phase0-scan-hygiene.md`
- `2026-06-25-vibedrift-phase1-arch-quick-wins.md`
- `2026-06-25-vibedrift-phase2-shared-utilities.md`
- `2026-06-25-vibedrift-phase3-equipos-dedup.md`

Do not start Phase 4 waves until Phases 0–3 are merged and rescanned.
