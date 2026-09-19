# R+ v8.0 — Performance + Time-Aware Pendientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v8.0 with buttery UI (profile-first perf fixes, lazy chunks, virtual censo scroll) and optional due-date/reminder pendientes synced over LAN.

**Architecture:** Two parallel tracks. **Track A** extends `storage.js` + `features/todos.mjs` with optional ISO date fields and a renderer notification scheduler; LAN merge stays LWW on `updatedAt` via `mergeTodoListsById`. **Track B** profiles LAN reconcile first, applies scoped repaint fixes or workers only if justified, extends `lazy-feature-routes.mjs` for labs/charts, adds vanilla-DOM virtual scroll for `#patient-list` active zone.

**Tech Stack:** Electron 41, vanilla ESM renderer (`public/js/**/*.mjs`), esbuild code-splitting (`scripts/bundle-renderer.mjs`), `node --test`, existing LAN stack (`features/lan/orchestrator.mjs`).

**Specs:** [`2026-06-11-v8-scoped-design.md`](../specs/2026-06-11-v8-scoped-design.md) · [time-aware pendientes](../specs/2026-06-11-v8-time-aware-pendientes.md) · [LAN workers](../specs/2026-06-11-v8-lan-sync-workers.md) · [lazy loading](../specs/2026-06-11-v8-module-lazy-loading.md) · [virtualized lists](../specs/2026-06-11-v8-virtualized-lists.md)

**Prerequisites:** `npm run build:ui` after renderer edits · targeted `node --test` · `npm run metrics:check` on touched `.mjs` · read `.cursor/rules/project-context.mdc`

**Suggested branch:** `feature/v8-perf-pendientes`

---

## File map

| Track | File | Action |
|-------|------|--------|
| A | `public/js/storage.js` | Extend `getTodos` / `saveTodos` normalization |
| A | `public/js/storage.test.mjs` | New field tests |
| A | `public/js/todos-due.mjs` | **Create** — sort, overdue, reminder scheduling helpers |
| A | `public/js/todos-due.test.mjs` | **Create** — unit tests |
| A | `public/js/features/todos.mjs` | Due UI, sort, wire scheduler |
| A | `public/js/todos-priority.mjs` | Unchanged (keep `alta`/`media`/`baja`) |
| A | `public/js/features/pase-board.mjs` | Due display in board chips if applicable |
| A | `public/js/features/session-manager.mjs` | Reuse `Notification` pattern for pendientes |
| A | `public/styles/*.css` | Due/overdue row styles (minimal) |
| B | `docs/logs/v8-lan-sync-profile-*.md` | **Create** — profiling deliverable |
| B | `public/js/features/lan/orchestrator.mjs` | Perf marks; scoped `refreshAllTodoUIs` |
| B | `public/js/features/lan/room.mjs` | Audit post-sync repaint scope |
| B | `public/js/lazy-feature-routes.mjs` | Labs + charts lazy loaders |
| B | `public/js/app-boot-imports.test.mjs` | Denylist new boot imports |
| B | `public/js/virtual-scroll.mjs` | **Create** — generic virtual scroll controller |
| B | `public/js/virtual-scroll.test.mjs` | **Create** |
| B | `public/js/patient-list-virtual.mjs` | **Create** — censo integration |
| B | `public/js/features/patients.mjs` | Wire virtual list for active zone |
| B | `public/js/perf-markers.mjs` | **Create** — dev journey marks |
| * | `public/js/app.bundle.mjs` | Regenerate via `npm run build:ui` only |
| * | `.cursor/rules/project-context.mdc` | Changelog on merge |

---

## Track A — Time-aware pendientes

### Task A1: Todo due-date helpers (TDD)

**Files:**
- Create: `public/js/todos-due.mjs`
- Create: `public/js/todos-due.test.mjs`

- [ ] **Step 1: Write failing tests**

```javascript
// todos-due.test.mjs — key cases
// isTodoOverdue({ dueDate: yesterday, completed: false }) → true
// todoCompareForDueSort: overdue before future; then dueDate asc; then priority alta<media<baja
// computeReminderAt({ dueDate, reminderAt: null }) → dueDate
// formatTodoDueLabel(iso, locale) → Spanish short label
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node --test public/js/todos-due.test.mjs
```

- [ ] **Step 3: Implement `todos-due.mjs`**

Export:
- `isTodoOverdue(todo, now?)`
- `todoCompareForDueSort(a, b, now?)` — completed last; overdue first; due time; then `todoCompareForSort` priority
- `computeReminderAt(todo)`
- `formatTodoDueLabel(iso)` — e.g. `Hoy 18:00`, `Mañana 08:00`
- `parseDuePreset(presetId)` — `hoy-18`, `manana-8`, `en-3h`, `en-24h`

Keep each function ≤ 15 complexity, file ≤ 600 lines.

- [ ] **Step 4: Run test — expect PASS**

```bash
node --test public/js/todos-due.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add public/js/todos-due.mjs public/js/todos-due.test.mjs
git commit -m "feat(pendientes): due-date sort and label helpers"
```

---

### Task A2: Storage normalization

**Files:**
- Modify: `public/js/storage.js` (`getTodos`, `saveTodos`)
- Modify: `public/js/storage.test.mjs`

- [ ] **Step 1: Write failing storage tests**

```javascript
// getTodos preserves dueDate, reminderAt, createdBy, completedAt, completedBy when present
// getTodos returns null for missing optional fields
// saveTodos strips invalid ISO; keeps valid optional fields
// legacy rows without new fields unchanged
```

- [ ] **Step 2: Run — expect FAIL**

```bash
node --test public/js/storage.test.mjs
```

- [ ] **Step 3: Extend normalization**

In `getTodos` return object add:
```javascript
dueDate: t && t.dueDate ? String(t.dueDate) : null,
reminderAt: t && t.reminderAt ? String(t.reminderAt) : null,
createdBy: t && t.createdBy ? String(t.createdBy) : null,
completedAt: t && t.completedAt ? String(t.completedAt) : null,
completedBy: t && t.completedBy ? String(t.completedBy) : null,
```

Mirror in `saveTodos` map (pass through when string non-empty; else `null`).

- [ ] **Step 4: Run — expect PASS**

```bash
node --test public/js/storage.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(storage): optional due-date fields on todos"
```

---

### Task A3: Create/edit UI in todos.mjs

**Files:**
- Modify: `public/js/features/todos.mjs`
- Modify: `public/styles/` (pendientes section — locate existing todo CSS)

- [ ] **Step 1: Collapsed due-date row on add form**

Below `#todo-input` add optional section (collapsed by default):
- Toggle: `⏰ Fecha límite (opcional)`
- Date + time inputs OR preset chips: `Hoy 18:00`, `Mañana 08:00`, `En 3 h`, `En 24 h`
- Checkbox: `🔔 Recordarme` (enabled when due set; `reminderAt` = due or 15 min before — v8 MVP: at due time only)

- [ ] **Step 2: Wire `addTodo`**

Set `createdBy` from `rt.getSettings().clinicalUsername` when available.

Populate `dueDate` / `reminderAt` from form; bump `updatedAt`.

- [ ] **Step 3: Row display**

In `buildTodoRow`, if `t.dueDate` show `.todo-due-label` with `formatTodoDueLabel`; add class `todo-row--overdue` when `isTodoOverdue(t)`.

- [ ] **Step 4: Sort**

Replace `todoCompareForSort` usage in `renderTodoListSection` with `todoCompareForDueSort` from `todos-due.mjs`.

- [ ] **Step 5: Complete flow**

In `toggleTodo`, set `completedAt` / `completedBy` on complete; clear on uncomplete.

- [ ] **Step 6: Manual smoke**

```bash
npm run build:ui && npm start
# Create pendiente with Mañana 08:00 → row shows label; overdue styling works with past date
```

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(pendientes): due date UI and overdue sort"
```

---

### Task A4: Notification scheduler

**Files:**
- Create: `public/js/todos-reminder-scheduler.mjs`
- Create: `public/js/todos-reminder-scheduler.test.mjs`
- Modify: `public/js/features/todos.mjs`
- Modify: `public/js/app-runtimes.mjs` (boot hook)

- [ ] **Step 1: Write failing scheduler tests**

```javascript
// scheduleTodoReminders(todos) registers timeout per open reminderAt
// reschedule on todo update cancels old timeout
// on fire: calls notify callback with { patientId, todoId, text }
// startup: fires immediately for missed reminderAt < now && !completed
```

- [ ] **Step 2: Implement scheduler module**

- In-memory `Map<todoId, timeoutId>`
- `rescheduleAllTodos(patientId?)` scans `storage.getTodos` for active patient or all patients
- Use `typeof Notification !== 'undefined'` pattern from `session-manager.mjs`
- Request permission once on first reminder-enabled create (graceful fallback to in-app toast via `rt.showToast`)

- [ ] **Step 3: Wire boot**

After DB/session ready in app runtimes, call `rescheduleAllTodos()`.

Call `rescheduleAllTodos(aid())` after `addTodo` / `updateTodo` / `toggleTodo` / LAN apply.

- [ ] **Step 4: In-app toast fallback**

When window focused, prefer `rt.showToast` + optional `Notification` when permitted.

- [ ] **Step 5: Tests + build**

```bash
node --test public/js/todos-reminder-scheduler.test.mjs
npm run build:ui
npm run metrics:check
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(pendientes): reminder scheduler and desktop notifications"
```

---

### Task A5: LAN sync field passthrough

**Files:**
- Modify: `public/js/livesync-patient-ids.mjs` (only if merge strips fields — verify first)
- Create: `public/js/livesync-patient-ids.test.mjs` or extend existing
- Modify: `public/js/features/lan/orchestrator.mjs` (if todo payload builder normalizes)

- [ ] **Step 1: Test merge preserves new fields**

```javascript
const a = { id: '1', text: 'x', updatedAt: '2026-06-10T10:00:00Z', dueDate: '2026-06-11T08:00:00Z' };
const b = { id: '1', text: 'x', updatedAt: '2026-06-11T09:00:00Z', dueDate: '2026-06-11T10:00:00Z' };
// mergeTodoListsById → b wins with dueDate intact
```

- [ ] **Step 2: Fix normalization if any layer strips unknown keys**

- [ ] **Step 3: Run related tests**

```bash
node --test public/js/livesync-patient-ids.test.mjs 2>/dev/null || node --test public/js/features/lan/orchestrator.mjs
# use colocated test files that exist
```

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(lan): preserve pendiente due fields on LWW merge"
```

---

### Task A6: Track A wrap-up

- [ ] **Step 1: Run targeted test bundle**

```bash
node --test public/js/todos-due.test.mjs public/js/storage.test.mjs public/js/todos-reminder-scheduler.test.mjs
```

- [ ] **Step 2: `npm run build:ui` + `npm run metrics:check`**

- [ ] **Step 3: Update `project-context.mdc` changelog** — `v8-pendientes-due`

**Stop gate Track A:** Pendientes due/reminder works offline, syncs new fields, notifications fire in Electron.

---

## Track B — Performance

### Task B0: Baseline perf markers

**Files:**
- Create: `public/js/perf-markers.mjs`
- Modify: `public/js/app.js` (single mark at boot)

- [ ] **Step 1: Create dev-only helper**

```javascript
export function perfMark(name) {
  if (!import.meta.url.includes('dev') && !globalThis.__RPLUS_PERF__) return;
  try { performance.mark(name); } catch (_) {}
}
export function perfMeasure(name, start, end) { /* log in dev */ }
```

Enable via `localStorage.setItem('rplus-perf', '1')` or existing dev flag.

- [ ] **Step 2: Mark `app-boot-start` in `app.js`, `app-first-paint` after first `requestAnimationFrame`**

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(perf): dev perf markers for v8 baseline"
```

---

### Task B1: LAN sync profiling gate (required)

**Files:**
- Modify: `public/js/features/lan/orchestrator.mjs`
- Modify: `public/js/lan-merge-registry.mjs` (if exists at path)
- Create: `docs/logs/v8-lan-sync-profile-2026-06-11.md`

- [ ] **Step 1: Add `performance.mark` / `measure` around**

- `mergeLiveSyncFullBundles` / registry merge
- `applyLwwConflictLocally` + bundle apply
- `runtime.refreshAllTodoUIs()` and census/board repaints after reconcile

- [ ] **Step 2: Reproduce journey**

10+ patient LAN reconcile (two Macs or mocked bundle in dev). Record median/p95 via Performance panel or logged measures.

- [ ] **Step 3: Write profile doc**

Template:
```markdown
# v8 LAN sync profile — YYYY-MM-DD
## Setup
## Journeys measured
## Results (median / p95 ms)
## Conclusion: worker needed? scoped repaint enough?
## Recommended fix
```

- [ ] **Step 4: Decision**

| Outcome | Next task |
|---------|-----------|
| Long tasks ≥ 50ms on merge/apply | B2a Worker spike |
| Jank from `refreshAllTodoUIs` / full census | B2b Scoped repaint |
| Network wait only | B2c Debounce/delta only; skip worker |

- [ ] **Step 5: Commit profile doc + instrumentation**

```bash
git commit -m "docs(perf): v8 LAN sync profiling gate"
```

**Stop gate:** Do not start B2a worker without profile doc conclusion.

---

### Task B2b: Scoped LAN repaint (default path)

**Files:**
- Modify: `public/js/features/lan/orchestrator.mjs`
- Modify: `public/js/features/lan/room.mjs`
- Modify: `public/js/features/todos.mjs` (optional `refreshTodoUIsForPatient(patientId)`)

- [ ] **Step 1: Add `refreshTodoUIsForPatient(patientId)`**

Only re-render todo mounts when sync touched that patient's todos (not every reconcile).

- [ ] **Step 2: Replace blanket `refreshAllTodoUIs()` on bundle apply**

Pass `todoTouchedPatientIds` from merge path (already exists in `attachTodosMapToPatientEntries`).

- [ ] **Step 3: Re-profile — target p95 reconcile UI work ↓ ≥ 50%**

- [ ] **Step 4: Commit**

```bash
git commit -m "perf(lan): scoped pendiente UI refresh after sync"
```

---

### Task B2a: LAN worker spike (conditional)

**Only if profile doc recommends worker.**

**Files:**
- Create: `public/js/workers/lan-sync-worker.mjs`
- Create: `public/js/features/lan/lan-sync-worker-bridge.mjs`
- Extract pure merge functions testable without DOM

Follow [`2026-06-11-v8-lan-sync-workers.md`](../specs/2026-06-11-v8-lan-sync-workers.md) — worker returns patch descriptors; main applies storage.

- [ ] **Steps:** extract pure reconcile → worker postMessage → bridge → integration test → re-profile.

---

### Task B3: Lazy-load labs chunk

**Files:**
- Modify: `public/js/lazy-feature-routes.mjs`
- Modify: `public/js/app-boot-imports.test.mjs`
- Modify: entry that opens Laboratorio tab (trace from `expediente-tabs.mjs` / `lab-panel.mjs`)

- [ ] **Step 1: Add `ensureLabsLoaded()` with promise cache** (mirror `ensureSettingsHelpLoaded`)

Dynamic import: `./features/lab-panel.mjs` or smallest shell that owns first paint.

- [ ] **Step 2: Tab open path awaits loader + skeleton**

Show existing panel shell; replace when module resolves.

- [ ] **Step 3: Extend boot-graph denylist test** — labs not in `app.js` static graph.

- [ ] **Step 4: Verify**

```bash
node --test public/js/app-boot-imports.test.mjs
npm run build:ui
npm run metrics:check
```

- [ ] **Step 5: Commit**

```bash
git commit -m "perf(lazy): defer lab panel until Laboratorio open"
```

---

### Task B4: Lazy-load charts / tendencias

**Files:**
- Modify: `public/js/lazy-feature-routes.mjs`
- Modify: first chart render entry (`estado-actual-charts*.mjs`, `tendencias.mjs`)

- [ ] **Step 1: `ensureChartsLoaded()`** — dynamic import chart modules (Chart.js already UMD in HTML per BN-09).

- [ ] **Step 2: First modal/tab chart render awaits loader**

- [ ] **Step 3: Boot test + metrics + commit**

```bash
git commit -m "perf(lazy): defer chart modules until first render"
```

---

### Task B5: Virtual scroll — core

**Files:**
- Create: `public/js/virtual-scroll.mjs`
- Create: `public/js/virtual-scroll.test.mjs`

- [ ] **Step 1: Failing tests**

- `computeVisibleRange(scrollTop, heights, viewportHeight, overscan)` 
- Fixed-height mode first (estimate 56px)

- [ ] **Step 2: Implement vanilla controller**

API:
```javascript
export function createVirtualScroll({
  container,
  items,
  estimateItemHeight,
  renderItem, // ({ item, index, top }) => HTMLElement
  overscan: 3,
});
```

No JSX. Pool DOM nodes. `requestAnimationFrame` on scroll.

- [ ] **Step 3: Tests pass**

```bash
node --test public/js/virtual-scroll.test.mjs
```

- [ ] **Step 4: Commit**

```bash
git commit -m "perf(virtual-scroll): core list controller"
```

---

### Task B6: Virtual scroll — censo active zone

**Files:**
- Create: `public/js/patient-list-virtual.mjs`
- Modify: `public/js/features/patients.mjs`
- Respect: `public/js/patient-list-incremental.mjs` (pinned/archived zones stay eager; virtualize `active` zone only when count > 30)

- [ ] **Step 1: Threshold gate**

If `zones.active.length <= 30`, keep current incremental renderer.

- [ ] **Step 2: Wire virtual scroll for active zone**

Reuse `patientCardDisplayKey` for row identity; preserve selection/`activeId` highlight.

- [ ] **Step 3: Manual test** — 100+ patients, scroll 60fps, selection works.

- [ ] **Step 4: Commit**

```bash
git commit -m "perf(censo): virtual scroll for large active patient lists"
```

---

### Task B7: Track B wrap-up

- [ ] **Step 1: Record before/after in profile doc** (startup mark, tab open, scroll).

- [ ] **Step 2: `npm run build:ui` + `npm run metrics:check`**

- [ ] **Step 3: Update `project-context.mdc`** — `v8-perf`

---

## Phase 3 — Integration & release prep

### Task I1: Cross-track verification

- [ ] LAN sync with due pendientes on two devices — fields merge correctly
- [ ] Reminder fires on device A; synced todo on B shows due label (local notification per device)
- [ ] Lazy labs + virtual censo + scoped LAN refresh — no regressions in guardia/pase flows

### Task I2: Release notes stub

- [ ] Add bullets to next release notes module or `docs/RELEASE_NOTES_*.txt` when versioning

### Task I3: Final commit / PR

```bash
node --test public/js/todos-due.test.mjs public/js/storage.test.mjs public/js/todos-reminder-scheduler.test.mjs public/js/virtual-scroll.test.mjs public/js/app-boot-imports.test.mjs
npm run build:ui
npm run metrics:check
```

---

## Execution order (recommended)

```text
Week 1:  A1 → A2 → A3 (pendientes MVP visible)
Week 2:  A4 → A5 → B0 → B1 (notifications + profile gate)
Week 3:  B2b (or B2a) → B3
Week 4:  B4 → B5 → B6 → I1
```

Tracks A and B can overlap after A2 (storage schema frozen).

---

## Deferred (do not implement in v8.0)

- Auto-detection / event-triggered pendientes
- Team handoff filter
- WebRTC P2P mesh
- Full optimistic UI for all save paths
- Virtual scroll for lab history (follow-up after censo proves pattern)

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Virtual scroll breaks incremental LAN sidebar | Virtualize only `active` zone; keep `patient-list-incremental` for pinned |
| Notification spam on LAN sync | Schedule locally from `reminderAt`; do not re-fire on merge unless time changed |
| Boot-graph debt | Every lazy route → `app-boot-imports.test.mjs` denylist |
| Worker complexity | Profile gate; prefer B2b scoped repaint |
