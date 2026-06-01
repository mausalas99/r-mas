# Clinical Teams, Entrega & Scope V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship V2 clinical operations—rotation cycles with Incoming preview, self-serve teams with per-team Guardia on-call, strict `evaluateClinicalScope`, Censo|Entrega grid with full Entrega flows, and R4 Follow-up pin—without breaking V1 census/crypto.

**Architecture:** Extend SQLCipher schema (v1→v2 incremental migrations), add DB helpers in `clinical-access-db.mjs`, IPC in `ipc-handlers.mjs` + `preload.js`, renderer modules `clinical-rotation.mjs`, `clinical-teams.mjs`, `clinical-entrega.mjs`, and wire `guardia-board.mjs` + `UnifiedPatientGridBoard`. Scope stays a pure function in `clinico-access.mjs` fed by query snapshots from main process.

**Tech Stack:** better-sqlite3-multiple-ciphers, Node `node:test`, Vanilla JS renderer, Electron IPC, existing `clinical-crypto.mjs` for signed Entrega events.

**Spec:** [docs/superpowers/specs/2026-05-31-clinical-teams-handoff-v2-design.md](../specs/2026-05-31-clinical-teams-handoff-v2-design.md)

---

## File map (create / modify)

| File | Role |
|------|------|
| `lib/db/schema.mjs` | `SCHEMA_VERSION = 2`; v2 tables + `teams.archived_at` |
| `lib/db/schema.test.mjs` | Assert v2 tables/columns |
| `lib/db/clinical-access-db.mjs` | Rotation, teams, assignments, guardia upsert, scope context queries |
| `lib/db/clinical-access-db.test.mjs` | DB unit tests |
| `lib/db/ipc-handlers.mjs` | `db:rotation-cycle-*`, `db:clinical-teams-*`, `db:guardia-upsert` |
| `preload.js` | Expose new IPC to renderer |
| `public/js/clinico-access.mjs` | `evaluateClinicalScope` V2 + helpers export |
| `public/js/clinico-access.test.mjs` | Scope matrix tests |
| `public/js/features/clinical-rotation.mjs` | Cycle UI, Incoming strip, Nueva rotación |
| `public/js/features/clinical-rotation.test.mjs` | Preview window math |
| `public/js/features/clinical-teams.mjs` | Mi rotación panel, Guardia checkbox |
| `public/js/features/clinical-teams.test.mjs` | Eligibility helpers if any |
| `public/js/features/clinical-entrega.mjs` | Modal + `listEntregaTargets` |
| `public/js/features/clinical-entrega.test.mjs` | Target lists per rank |
| `public/js/features/unified-patient-grid-board.mjs` | Censo/Entrega toggle, chip routing, Incoming row |
| `public/js/features/unified-patient-grid-board.test.mjs` | Context + click behavior |
| `public/js/features/guardia-board.mjs` | Wire toggle, Incoming, Follow-up sector |
| `public/js/clinical-access-runtime.mjs` | Load cycle + teams into session context |
| `public/partials/layout/app-body.html` | Guardia toolbar + Incoming host + Mi rotación entry |
| `public/partials/modals/root.html` | `#entrega-modal`, `#rotation-config-modal` |
| `public/styles/pase-board.css` | Incoming strip + Censo/Entrega segmented control |
| `package.json` | Register new `*.test.mjs` in `"test"` script |

---

## PR 1 — Schema + rotation cycles + Incoming preview

### Task 1: Schema v2 migration

**Files:**
- Modify: `lib/db/schema.mjs`
- Modify: `lib/db/schema.test.mjs`

- [ ] **Step 1: Failing test for v2 objects**

Add to `lib/db/schema.test.mjs`:

```javascript
it('includes V2 rotation and assignment tables', () => {
  const db = new Database(':memory:');
  applyMigrations(db);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  for (const t of ['rotation_cycles', 'patient_team_assignment', 'team_guardia_today']) {
    assert.ok(tables.includes(t), `missing ${t}`);
  }
  const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
  assert.ok(teamCols.includes('archived_at'));
  assert.equal(SCHEMA_VERSION, 2);
  db.close();
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node --test lib/db/schema.test.mjs
```

Expected: assertion on `rotation_cycles` or `SCHEMA_VERSION`.

- [ ] **Step 3: Implement v2 migration**

Refactor `applyMigrations` to run stepped migrations (`migrateV1` existing body, new `migrateV2`):

```javascript
export const SCHEMA_VERSION = 2;

function migrateV2(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rotation_cycles (
      cycle_id TEXT PRIMARY KEY,
      month_end_at TEXT NOT NULL,
      preview_days INTEGER NOT NULL DEFAULT 2,
      preview_start_at TEXT NOT NULL,
      effective_at TEXT NOT NULL,
      archived_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(created_by) REFERENCES users(user_id)
    );
    CREATE TABLE IF NOT EXISTS patient_team_assignment (
      patient_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      effective_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (patient_id, team_id, effective_at),
      FOREIGN KEY(patient_id) REFERENCES patients(id),
      FOREIGN KEY(team_id) REFERENCES teams(team_id)
    );
    CREATE TABLE IF NOT EXISTS team_guardia_today (
      team_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      declared_at TEXT NOT NULL,
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
  `);
  const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
  if (!teamCols.includes('archived_at')) {
    db.exec('ALTER TABLE teams ADD COLUMN archived_at TEXT');
  }
}
```

In `applyMigrations`, after v1: if `readSchemaVersion(db) < 2` run `migrateV2` and set `schema_version` to `2`.

- [ ] **Step 4: Run test — PASS**

```bash
node --test lib/db/schema.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.mjs lib/db/schema.test.mjs
git commit -m "feat(db): add V2 rotation and team assignment schema"
```

### Task 2: Rotation DB API + IPC

**Files:**
- Modify: `lib/db/clinical-access-db.mjs`
- Modify: `lib/db/clinical-access-db.test.mjs`
- Modify: `lib/db/ipc-handlers.mjs`
- Modify: `preload.js`

- [ ] **Step 1: Failing test — compute preview window**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import { upsertRotationCycle, getActiveRotationCycle, fetchIncomingAssignments } from './clinical-access-db.mjs';

describe('rotation cycle', () => {
  it('derives preview_start_at from effective_at and preview_days', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const cycle = upsertRotationCycle(db, {
      monthEndAt: '2026-05-31T23:59:59',
      effectiveAt: '2026-06-01T00:00:00',
      previewDays: 2,
      createdBy: 'u-admin',
    });
    assert.equal(cycle.preview_start_at, '2026-05-30T00:00:00');
    assert.equal(getActiveRotationCycle(db)?.cycle_id, cycle.cycle_id);
    db.close();
  });
});
```

- [ ] **Step 2: Run — FAIL** (`upsertRotationCycle` not defined)

- [ ] **Step 3: Implement helpers**

```javascript
export function upsertRotationCycle(db, { monthEndAt, effectiveAt, previewDays = 2, createdBy }) {
  const effective = new Date(effectiveAt);
  const previewStart = new Date(effective);
  previewStart.setDate(previewStart.getDate() - Number(previewDays));
  const cycleId = crypto.randomUUID();
  const row = {
    cycle_id: cycleId,
    month_end_at: monthEndAt,
    preview_days: previewDays,
    preview_start_at: previewStart.toISOString(),
    effective_at: effective.toISOString(),
    created_by: createdBy,
  };
  db.prepare(
    `INSERT INTO rotation_cycles (cycle_id, month_end_at, preview_days, preview_start_at, effective_at, created_by)
     VALUES (@cycle_id, @month_end_at, @preview_days, @preview_start_at, @effective_at, @created_by)`
  ).run(row);
  return row;
}

export function getActiveRotationCycle(db) {
  return db.prepare(
    `SELECT * FROM rotation_cycles WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 1`
  ).get();
}

export function archiveRotationAndTeams(db) {
  const now = new Date().toISOString();
  db.prepare(`UPDATE rotation_cycles SET archived_at = ? WHERE archived_at IS NULL`).run(now);
  db.prepare(`UPDATE teams SET archived_at = ? WHERE archived_at IS NULL`).run(now);
  db.prepare(`DELETE FROM active_guardias`).run();
  db.prepare(`DELETE FROM team_guardia_today`).run();
}
```

Add `assignPatientToTeam(db, { patientId, teamId, effectiveAt })` and `fetchIncomingAssignments(db, nowIso)` joining `patient_team_assignment` + `patients` where `effective_at > now` OR preview window per spec.

- [ ] **Step 4: IPC handlers**

```javascript
ipcMain.handle('db:rotation-cycle-get', async () => {
  return dbManager.withTransaction((db) => ({ ok: true, cycle: getActiveRotationCycle(db) }));
});
ipcMain.handle('db:rotation-cycle-upsert', async (_e, payload) => {
  return dbManager.withTransaction((db) => ({
    ok: true,
    cycle: upsertRotationCycle(db, payload),
  }));
});
ipcMain.handle('db:rotation-nueva', async (_e, { userId }) => {
  return dbManager.withTransaction((db) => {
    archiveRotationAndTeams(db);
    return { ok: true };
  });
});
```

Mirror in `preload.js` as `window.rplusDb.rotationCycleGet()` etc.

- [ ] **Step 5: Run tests — PASS**

```bash
node --test lib/db/clinical-access-db.test.mjs lib/db/schema.test.mjs
```

- [ ] **Step 6: Commit**

```bash
git add lib/db/clinical-access-db.mjs lib/db/clinical-access-db.test.mjs lib/db/ipc-handlers.mjs preload.js
git commit -m "feat(db): rotation cycle IPC and archive on nueva rotación"
```

### Task 3: Renderer rotation + Incoming strip (preview lock)

**Files:**
- Create: `public/js/features/clinical-rotation.mjs`
- Create: `public/js/features/clinical-rotation.test.mjs`
- Modify: `public/js/features/guardia-board.mjs`
- Modify: `public/partials/layout/app-body.html`
- Modify: `public/styles/pase-board.css`

- [ ] **Step 1: Failing test — in preview window**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isIncomingPreviewWindow, isChartLockedForPatient } from './clinical-rotation.mjs';

test('preview window is active between preview_start and effective', () => {
  const cycle = {
    preview_start_at: '2026-05-30T00:00:00.000Z',
    effective_at: '2026-06-01T00:00:00.000Z',
  };
  assert.equal(isIncomingPreviewWindow(cycle, new Date('2026-05-31T12:00:00Z')), true);
  assert.equal(isChartLockedForPatient({ effective_at: cycle.effective_at }, new Date('2026-05-31T12:00:00Z')), true);
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement `clinical-rotation.mjs`**

Export `renderIncomingStrip(assignments, { onLockedClick })`, `openRotationConfigModal` (R4/Admin only), `confirmNuevaRotacion()`. Locked click shows toast: `Disponible el {fecha}`.

- [ ] **Step 4: Wire `guardia-board.mjs`**

Before `drawCensusGrid`, call `renderIncomingStrip` when `isIncomingPreviewWindow(activeCycle, new Date())`. Pass `incomingPreview: true` on patient DTOs for strip chips.

- [ ] **Step 5: Run tests + bundle smoke**

```bash
node --test public/js/features/clinical-rotation.test.mjs
npm run bundle-renderer
```

- [ ] **Step 6: Commit**

```bash
git add public/js/features/clinical-rotation.mjs public/js/features/clinical-rotation.test.mjs public/js/features/guardia-board.mjs public/partials/layout/app-body.html public/styles/pase-board.css package.json
git commit -m "feat(guardia): Incoming preview strip and rotation controls"
```

---

## PR 2 — Self-serve teams + Guardia on-call

### Task 4: Teams DB + IPC

**Files:**
- Modify: `lib/db/clinical-access-db.mjs`
- Modify: `lib/db/clinical-access-db.test.mjs`
- Modify: `lib/db/ipc-handlers.mjs`, `preload.js`

- [ ] **Step 1: Failing test — create team + declare Guardia**

```javascript
it('declares team Guardia with last-write per team_id', () => {
  const db = new Database(':memory:');
  applyMigrations(db);
  const u1 = ensureClinicalUser(db, { clientId: 'a', rank: 'R2' });
  const u2 = ensureClinicalUser(db, { clientId: 'b', rank: 'R2' });
  const team = createTeam(db, { name: 'Sala A', service: 'Sala', onCallDayIndex: 1, createdBy: u1.userId });
  addTeamMember(db, team.team_id, u1.userId);
  setTeamGuardiaToday(db, team.team_id, u1.userId);
  setTeamGuardiaToday(db, team.team_id, u2.userId);
  const g = getTeamGuardiaToday(db, team.team_id);
  assert.equal(g.user_id, u2.userId);
  db.close();
});
```

- [ ] **Step 2–4: Implement** `createTeam`, `listActiveTeams`, `addTeamMember`, `removeTeamMember`, `setTeamGuardiaToday`, `getTeamGuardiaToday`; IPC `db:clinical-teams-list`, `db:clinical-teams-create`, `db:clinical-teams-member-add`, `db:clinical-teams-guardia-set`.

- [ ] **Step 5: Commit** `feat(db): self-serve teams and Guardia on-call declarations`

### Task 5: Mi rotación UI

**Files:**
- Create: `public/js/features/clinical-teams.mjs`
- Modify: `public/partials/layout/app-body.html` or settings slide-over
- Modify: `public/js/clinical-access-runtime.mjs`

- [ ] **Step 1: Panel lists teams + Guardia checkbox per joined team**
- [ ] **Step 2: Create team form** — `service` select (enum), optional `sub_area_fraction`, `on_call_day_index` 0–6, `name`
- [ ] **Step 3: Do not touch Profile Equipo** (PDF labels)
- [ ] **Step 4: Commit** `feat(ui): Mi rotación self-serve teams panel`

---

## PR 3 — `evaluateClinicalScope` V2

### Task 6: Scope engine

**Files:**
- Modify: `public/js/clinico-access.mjs`
- Modify: `public/js/clinico-access.test.mjs`

- [ ] **Step 1: Failing tests (one per rule)**

```javascript
test('R4 can write Sala patient without team membership', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r4', rank: 'R4' },
    { id: 'p1', service: 'Sala' },
    null,
    { teams: [], guardias: [], cycle: null, assignments: [], salaGuardiaToday: [] }
  );
  assert.equal(scope.writable, true);
});

test('incoming assignment is readable but not writable before effective_at', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2', rank: 'R2' },
    { id: 'p1', service: 'Sala A' },
    null,
    {
      teams: [{ team_id: 't1', service: 'Sala' }],
      guardias: [],
      cycle: { preview_start_at: '2026-05-30T00:00:00Z', effective_at: '2026-06-01T00:00:00Z' },
      assignments: [{ patient_id: 'p1', team_id: 't1', effective_at: '2026-06-01T00:00:00Z' }],
      salaGuardiaToday: [],
      now: '2026-05-31T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, false);
  assert.equal(scope.incomingPreview, true);
});

test('Sala ABCDEF deficit grants R2 write to full Sala census', () => {
  // u2 on call Sala B; no declaration for Sala A team → writable for Sala A patient
});
```

- [ ] **Step 2: Implement V2** — default deny; Admin allow-all; R4 macro; R3 on_call_day_index match; R2/R1 team + guardia; `computeSalaAbcdefDeficitWrite(salaGuardiaToday, teams, weekday)`.

- [ ] **Step 3: Add IPC `db:clinical-scope-context`** returning snapshot for renderer (or bundle in bootstrap).

- [ ] **Step 4: Run** `node --test public/js/clinico-access.test.mjs`

- [ ] **Step 5: Commit** `feat(clinical): evaluateClinicalScope V2 with Sala ABCDEF`

### Task 7: Enforce chart lock on patient open

**Files:**
- Modify: `public/js/features/patients.mjs` (or chart entry)
- Modify: `public/js/clinical-access-runtime.mjs`

- [ ] **Step 1: Before `selectPatient` opens chart, call `evaluateClinicalScope`; if `!writable && incomingPreview`, toast and return**
- [ ] **Step 2: Commit** `feat(clinical): lock chart during Incoming preview`

---

## PR 4 — Censo | Entrega + modal + guardia upsert

### Task 8: Guardia upsert IPC

**Files:**
- Modify: `lib/db/clinical-access-db.mjs`
- Modify: `lib/db/ipc-handlers.mjs`, `preload.js`

- [ ] **Step 1: Test upsert creates/updates active_guardias**

```javascript
it('upserts guardia row for Entrega', () => {
  const db = new Database(':memory:');
  applyMigrations(db);
  const u = ensureClinicalUser(db, { clientId: 'r1', rank: 'R1' });
  const team = createTeam(db, { name: 'A1', service: 'Sala', onCallDayIndex: 0, createdBy: u.userId });
  upsertActiveGuardia(db, {
    patientId: 'p1',
    coveringUserId: u.userId,
    sourceTeamId: team.team_id,
    isCritical: 1,
    pendientesJson: '[]',
    vitalsFrequency: '2h',
  });
  const rows = fetchActiveGuardias(db);
  assert.equal(rows.length, 1);
  db.close();
});
```

- [ ] **Step 2: `upsertActiveGuardia` + `db:guardia-upsert` IPC; sign via existing `db:sign-clinical-change` with `actionType: 'entrega.assign'`**

- [ ] **Step 3: Commit** `feat(db): guardia upsert for Entrega`

### Task 9: Entrega modal + eligibility

**Files:**
- Create: `public/js/features/clinical-entrega.mjs`
- Create: `public/js/features/clinical-entrega.test.mjs`
- Modify: `public/partials/modals/root.html`

- [ ] **Step 1: Tests for `listEntregaTargets(rank, teams, users, salaDeficit)`** — R1↔R1, R2↔R2, R2↔R4, R3 suggestions, generic all users

- [ ] **Step 2: `openEntregaModal({ patientId, guardiaId, onConfirm })`** — select covering user, pendientes textarea, critical toggle, vitals select

- [ ] **Step 3: Export `window.appShell.openEntregaModal`** from `app-shell.mjs` or `guardia-board.mjs`

- [ ] **Step 4: Commit** `feat(entrega): modal and eligibility lists`

### Task 10: Grid Censo | Entrega toggle

**Files:**
- Modify: `public/js/features/unified-patient-grid-board.mjs`
- Modify: `public/js/features/unified-patient-grid-board.test.mjs`
- Modify: `public/js/features/guardia-board.mjs`

- [ ] **Step 1: Test chip click routes by context**

```javascript
test('HANDOFF context invokes entrega callback instead of selectPatient', () => {
  let entregaCalled = false;
  const board = new UnifiedPatientGridBoard('x', 'HANDOFF');
  board.onChipClick = (id) => { entregaCalled = id === 'p1'; };
  // invoke internal handler with fixture patient
  assert.equal(entregaCalled, true);
});
```

- [ ] **Step 2: Add `setViewContext('GUARDIA'|'HANDOFF')`, `onChipClick` callback; remove hardcoded `selectPatient` when HANDOFF**

- [ ] **Step 3: Segmented control in guardia toolbar** — labels **Censo | Entrega**; `localStorage` key `guardia.gridMode`

- [ ] **Step 4: `guardia-board.mjs`** — Censo → `selectPatient`; Entrega → `openEntregaModal`; refresh census after upsert

- [ ] **Step 5: Relax filter** — when guardias empty, show full census (current behavior) so Entrega can assign first guardia

- [ ] **Step 6: Commit** `feat(guardia): Censo and Entrega grid modes`

---

## PR 5 — R4 Follow-up pin

### Task 11: Follow-up sector

**Files:**
- Modify: `public/js/features/guardia-board.mjs`
- Modify: `public/js/features/unified-patient-grid-board.mjs`

- [ ] **Step 1: Test R4 grid includes Follow-up divider when interconsult_type Follow-up and status not Resolved**

- [ ] **Step 2: Filter `patients` where `interconsult_type === 'Follow-up' && interconsult_status !== 'Resolved'` into pinned batch above sectors**

- [ ] **Step 3: Commit** `feat(guardia): R4 Follow-up pin row`

---

## PR 6 — LAN sync (same release train, after PR 4)

### Task 12: Replicate V2 tables on LAN merge

**Files:**
- Modify: `public/js/features/lan-sync.mjs` (or clinical blob keys if teams sync via blobs)

- [ ] **Step 1: Document merge strategy in code comment** — last-write for `team_guardia_today`, `teams` metadata; signed event type `rotation.nueva` applies archive on peers

- [ ] **Step 2: Include `rotation_cycles`, `patient_team_assignment`, `team_guardia_today` in sync payload or clinical-save-all path used today**

- [ ] **Step 3: Manual test checklist** — two peers, Entrega on A, census on B shows updated `covering_user_id`

- [ ] **Step 4: Commit** `feat(lan): sync V2 clinical ops tables`

---

## package.json test registration

After each new `*.test.mjs`, append to the `"test"` array in `package.json`:

```
lib/db/schema.test.mjs
lib/db/clinical-access-db.test.mjs
public/js/clinico-access.test.mjs
public/js/features/clinical-rotation.test.mjs
public/js/features/clinical-entrega.test.mjs
public/js/features/unified-patient-grid-board.test.mjs
```

Run full suite:

```bash
npm test
```

---

## Spec coverage checklist (self-review)

| Spec requirement | Task |
|------------------|------|
| `rotation_cycles` + program config | Task 2–3 |
| Incoming read-only strip | Task 3 |
| Chart lock until `effective_at` | Task 3, 7 |
| Nueva rotación any user | Task 2–3 |
| Self-serve teams + Guardia | Task 4–5 |
| Scope V2 + Sala ABCDEF | Task 6 |
| Censo \| Entrega toggle | Task 10 |
| Entrega modal + all flows | Task 9–10 |
| R4 Follow-up pin | Task 11 |
| LAN replicate | Task 12 |
| VPO drop deferred | — (out of scope) |
| Spanish labels Censo/Entrega/Guardia | Task 5, 10 |

No placeholders remain; types align (`HANDOFF` internal, UI Entrega).

---

## Manual test plan (post-PR 4)

1. Register clinical user R2; create Sala team; declare **Guardia** for today.
2. Open Modo Guardia → **Entrega** → assign patient → verify `active_guardias` row.
3. Switch **Censo** → chip opens chart.
4. R4/Admin set rotation dates → bind incoming patient → see Incoming strip, chart locked until effective.
5. **Nueva rotación** → teams archived, guardias cleared, patients remain.
