# Modo Entrega — Pendientes estructurados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pendientes de entrega estructurados (procedimientos con plantillas user/team), independientes del expediente, visibles en Modo Guardia y en el board interno con detalle, badges y marcar realizado.

**Architecture:** Módulo puro `lib/entrega/entrega-pendientes.mjs` normaliza `pendientes_json` v2; schema v8 agrega tablas de plantillas; modal Entrega reemplaza textarea; interno consume v2 + `PATCH` para completar ítems. Signos siguen en columnas `active_guardias`, no en `items`.

**Tech Stack:** Node `--test`, SQLCipher (`lib/db/schema.mjs` v8), Electron IPC, Express interno router, vanilla ESM renderer, `npm run build:ui` para partials del modal.

**Spec:** [2026-06-02-modo-entrega-pendientes-design.md](../specs/2026-06-02-modo-entrega-pendientes-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/entrega/entrega-pendientes.mjs` | Parse/normalize v1→v2, CRUD helpers, permissions, badges |
| `lib/entrega/entrega-pendientes.test.mjs` | Unit tests |
| `lib/db/schema.mjs` | `migrateToV8`, template tables |
| `lib/db/schema.test.mjs` | Migration assertions |
| `lib/db/clinical-access-db.mjs` | Template CRUD + `completeGuardiaPendiente` |
| `lib/db/clinical-access-db.test.mjs` | DB integration |
| `lib/db/ipc-handlers.mjs` | IPC channels |
| `preload.js` | Expose template APIs |
| `lib/db/clinical-ops-sync.mjs` | Replicate template tables on LAN merge |
| `lib/interno/interno-board.mjs` | v2 DTO (procedimientos, badges) |
| `lib/interno/interno-pendientes.mjs` | PATCH handler logic (complete item in JSON) |
| `lib/interno/interno-router.js` | `PATCH .../pendientes/:itemId` |
| `lib/interno/interno-router.test.mjs` | Router tests |
| `public/js/features/clinical-entrega.mjs` | Modal v2 UI + serialize v2 |
| `public/js/features/clinical-entrega.test.mjs` | Permission helpers re-export tests |
| `public/js/features/entrega-modal-ui.mjs` | DOM for lista/form/plantillas (keep entrega.mjs smaller) |
| `public/partials/modals/root.html` | Replace textarea markup |
| `public/interno/interno-app.mjs` | Estudios UI + detail sheet + complete |
| `public/interno/interno.css` | Styles for estudios/badges/sheet |
| `public/styles/settings.css` or `pase-board.css` | Entrega modal styles if needed |
| `package.json` | Register new test files in `npm test` |

---

### Task 1: Core `entrega-pendientes` module (TDD)

**Files:**
- Create: `lib/entrega/entrega-pendientes.mjs`
- Create: `lib/entrega/entrega-pendientes.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `lib/entrega/entrega-pendientes.test.mjs`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePendientesJson,
  serializePendientesJson,
  listActiveProcedimientos,
  pendingRequirementBadges,
  canDeletePendienteItem,
  completePendienteItem,
  createProcedimientoItem,
} from './entrega-pendientes.mjs';

describe('normalizePendientesJson', () => {
  it('legacy string array', () => {
    const doc = normalizePendientesJson(JSON.stringify(['TAC 14:00', 'Hb']));
    assert.equal(doc.version, 2);
    assert.equal(doc.items.length, 2);
    assert.equal(doc.items[0].type, 'legacy_text');
  });

  it('v2 round-trip', () => {
    const raw = serializePendientesJson({
      version: 2,
      items: [
        createProcedimientoItem({
          label: 'Endoscopia',
          kind: 'otro',
          scheduledAt: '2026-06-02T14:00:00',
          lockedBase: true,
          createdBy: { userId: 'u1', rank: 'R1' },
        }),
      ],
    });
    const doc = normalizePendientesJson(raw);
    assert.equal(doc.items[0].type, 'procedimiento');
    assert.equal(doc.items[0].label, 'Endoscopia');
  });
});

describe('pendingRequirementBadges', () => {
  it('consentimiento until autorizado', () => {
    const item = {
      requires: { consentimiento: true, anestesia: false, familiar: false },
      autorizado: false,
      comentado: false,
      agendado: false,
    };
    assert.deepEqual(pendingRequirementBadges(item), ['consentimiento']);
    item.autorizado = true;
    assert.deepEqual(pendingRequirementBadges(item), []);
  });
});

describe('canDeletePendienteItem', () => {
  it('guardia cannot delete lockedBase', () => {
    assert.equal(
      canDeletePendienteItem({ lockedBase: true }, { role: 'guardia' }),
      false
    );
    assert.equal(
      canDeletePendienteItem({ lockedBase: false }, { role: 'guardia' }),
      true
    );
  });
});

describe('completePendienteItem', () => {
  it('sets completedAt idempotently', () => {
    const doc = normalizePendientesJson('[]');
    const item = createProcedimientoItem({ label: 'TAC', kind: 'imagen' });
    doc.items.push(item);
    const next = completePendienteItem(doc, item.id, {
      kind: 'interno',
      name: 'Ana',
    });
    assert.ok(next.items[0].completedAt);
    const again = completePendienteItem(next, item.id, { kind: 'interno' });
    assert.equal(again.items[0].completedAt, next.items[0].completedAt);
  });
});

describe('listActiveProcedimientos', () => {
  it('excludes completed', () => {
    const item = createProcedimientoItem({ label: 'X', kind: 'otro' });
    item.completedAt = new Date().toISOString();
    const doc = { version: 2, items: [item] };
    assert.equal(listActiveProcedimientos(doc).length, 0);
  });
});
```

- [ ] **Step 2: Run tests (expect FAIL)**

```bash
node --test lib/entrega/entrega-pendientes.test.mjs
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `lib/entrega/entrega-pendientes.mjs`**

Minimum exports:

```js
import crypto from 'node:crypto';

const EMPTY = { version: 2, items: [] };

export function createProcedimientoItem(partial) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: 'procedimiento',
    kind: partial.kind === 'imagen' ? 'imagen' : 'otro',
    label: String(partial.label || '').trim(),
    scheduledAt: partial.scheduledAt || null,
    comentado: !!partial.comentado,
    autorizado: !!partial.autorizado,
    agendado: !!partial.agendado,
    requires: {
      familiar: !!partial.requires?.familiar,
      consentimiento: !!partial.requires?.consentimiento,
      anestesia: !!partial.requires?.anestesia,
    },
    lockedBase: !!partial.lockedBase,
    createdBy: partial.createdBy || null,
    updatedAt: now,
    completedAt: null,
    completedBy: null,
  };
}

export function normalizePendientesJson(raw) {
  if (!raw) return { ...EMPTY, items: [] };
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { ...EMPTY, items: [] };
  }
  if (parsed && parsed.version === 2 && Array.isArray(parsed.items)) {
    return { version: 2, items: parsed.items.filter(Boolean) };
  }
  if (Array.isArray(parsed)) {
    return {
      version: 2,
      items: parsed
        .map((line) => String(line).trim())
        .filter(Boolean)
        .map((text) => ({
          id: crypto.randomUUID(),
          type: 'legacy_text',
          text,
          updatedAt: new Date().toISOString(),
          completedAt: null,
        })),
    };
  }
  return { ...EMPTY, items: [] };
}

export function serializePendientesJson(doc) {
  return JSON.stringify(normalizePendientesJson(doc));
}

export function listActiveProcedimientos(doc) {
  return normalizePendientesJson(doc).items.filter(
    (it) =>
      (it.type === 'procedimiento' || it.type === 'legacy_text') && !it.completedAt
  );
}

export function pendingRequirementBadges(item) {
  const badges = [];
  if (item.requires?.consentimiento && !item.autorizado) badges.push('consentimiento');
  if (item.requires?.anestesia && !item.agendado) badges.push('anestesia');
  if (item.requires?.familiar && !item.comentado) badges.push('familiar');
  return badges;
}

export function canDeletePendienteItem(item, actor) {
  if (actor.role === 'diurno') return true;
  if (actor.role === 'guardia') return !item.lockedBase;
  return false;
}

export function completePendienteItem(doc, itemId, completedBy) {
  const norm = normalizePendientesJson(doc);
  const items = norm.items.map((it) => {
    if (it.id !== itemId) return it;
    if (it.completedAt) return it;
    return {
      ...it,
      completedAt: new Date().toISOString(),
      completedBy: completedBy || { kind: 'interno' },
      updatedAt: new Date().toISOString(),
    };
  });
  return { version: 2, items };
}
```

- [ ] **Step 4: Run tests (expect PASS)**

```bash
node --test lib/entrega/entrega-pendientes.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add lib/entrega/entrega-pendientes.mjs lib/entrega/entrega-pendientes.test.mjs
git commit -m "feat(entrega): core pendientes v2 normalize and permissions"
```

---

### Task 2: Schema v8 — template tables

**Files:**
- Modify: `lib/db/schema.mjs` (`SCHEMA_VERSION = 8`, `migrateToV8`, chain in `applyMigrations`)
- Modify: `lib/db/schema.test.mjs`

- [ ] **Step 1: Add failing schema test**

In `lib/db/schema.test.mjs`, add:

```js
it('migrateToV8 creates entrega template tables', () => {
  const db = openTestDb();
  applyMigrations(db);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  assert.ok(tables.includes('entrega_template_user'));
  assert.ok(tables.includes('entrega_template_team'));
});
```

- [ ] **Step 2: Run test (FAIL if version still 7 without migration)**

```bash
node --test lib/db/schema.test.mjs
```

- [ ] **Step 3: Implement `migrateToV8`**

Bump `SCHEMA_VERSION` to `8`. Add:

```js
function migrateToV8(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entrega_template_user (
      template_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
    CREATE TABLE IF NOT EXISTS entrega_template_team (
      template_id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
      FOREIGN KEY(created_by) REFERENCES users(user_id)
    );
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '8');
}
```

Wire `if (version < 8) migrateToV8(db);` in `applyMigrations`.

- [ ] **Step 4: Run schema tests PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.mjs lib/db/schema.test.mjs
git commit -m "feat(db): schema v8 entrega template tables"
```

---

### Task 3: Clinical DB — templates + complete pendiente

**Files:**
- Modify: `lib/db/clinical-access-db.mjs`
- Modify: `lib/db/clinical-access-db.test.mjs`
- Modify: `lib/db/ipc-handlers.mjs`
- Modify: `preload.js`

- [ ] **Step 1: Add DB tests** for `listEntregaTemplatesForUser`, `saveEntregaTemplateUser`, `saveEntregaTemplateTeam`, `completeActiveGuardiaPendiente(db, { patientId, itemId, completedBy })` using in-memory / test db helper already in `clinical-access-db.test.mjs`.

- [ ] **Step 2: Implement functions**

`completeActiveGuardiaPendiente`:
- `SELECT pendientes_json FROM active_guardias WHERE patient_id = ? AND status = 'Active'`
- `completePendienteItem` from `entrega-pendientes.mjs`
- `UPDATE ... SET pendientes_json = ?`
- Return updated item or `null`

Template list/save/delete: standard CRUD with `crypto.randomUUID()` for ids; `payload_json` stores `{ kind, label, requires, comentado, autorizado, agendado }` defaults only.

- [ ] **Step 3: IPC handlers**

Add to `ipc-handlers.mjs`:

- `db:entrega-template-list` → `{ userId, teamIds: string[] }`
- `db:entrega-template-save-user`
- `db:entrega-template-save-team`
- `db:entrega-template-delete`

Expose in `preload.js` as `dbEntregaTemplateList`, etc.

- [ ] **Step 4: Run tests**

```bash
node --test lib/db/clinical-access-db.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(db): entrega templates CRUD and complete pendiente item"
```

---

### Task 4: LAN sync — template tables

**Files:**
- Modify: `lib/db/clinical-ops-sync.mjs`
- Modify: `lib/db/clinical-ops-sync.test.mjs`

- [ ] **Step 1: Export/import snapshot** includes `entrega_template_user` and `entrega_template_team` arrays in `exportClinicalOpsSnapshot` / merge functions (last-write per `template_id`, same pattern as `teams`).

- [ ] **Step 2: Test merge** — incoming template overwrites local when `created_at` newer (or always last-write from incoming row).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(sync): replicate entrega templates on LAN clinical ops merge"
```

---

### Task 5: Interno board v2 + PATCH route

**Files:**
- Modify: `lib/interno/interno-board.mjs`
- Create: `lib/interno/interno-pendientes.mjs`
- Modify: `lib/interno/interno-router.js`
- Create: `lib/interno/interno-pendientes.test.mjs`
- Modify: `lib/interno/interno-vitals.test.mjs` (update `parsePendientesJson` tests if moved)

- [ ] **Step 1: Refactor board parsing**

Replace `parsePendientesJson` in `interno-board.mjs` to use `normalizePendientesJson` + map procedimientos to DTO:

```js
{
  id, label, kind,
  time: formatHHmm(item.scheduledAt),
  badges: pendingRequirementBadges(item),
  completed: !!item.completedAt,
}
```

Legacy `legacy_text` → `{ id, label: text, time: extracted regex, badges: [], completed: false }`.

`pendingCount` = count of non-completed procedimientos + legacy_text (exclude vitals).

- [ ] **Step 2: `interno-pendientes.mjs`**

```js
export function patchGuardiaPendienteComplete(db, patientId, itemId, completedBy) {
  // validate active guardia row exists for patient in scope
  // completeActiveGuardiaPendiente
}
```

- [ ] **Step 3: Router `PATCH /patients/:patientId/pendientes/:itemId`**

After token middleware, call `patchGuardiaPendienteComplete`, return `{ ok: true, item }`, `broadcastInterno(sala, { type: 'board-changed' })`, `broadcastSync` if deps provide.

- [ ] **Step 4: Tests**

```bash
node --test lib/interno/interno-pendientes.test.mjs lib/interno/interno-vitals.test.mjs
```

Add router integration test with mock db + store if pattern exists; else unit-test handler only.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(interno): board v2 procedimientos and PATCH complete"
```

---

### Task 6: Interno mobile UI

**Files:**
- Modify: `public/interno/interno-app.mjs`
- Modify: `public/interno/interno.css`

- [ ] **Step 1: Render estudios section** separate from vitals banner (already partially present); each row shows time, label, badge chips (`consentimiento` → «Consent», etc.), checkbox/button **Hecho**.

- [ ] **Step 2: Tap row (not checkbox)** opens read-only detail overlay with all flags/requires.

- [ ] **Step 3: On complete** — `fetch PATCH` with `X-Interno-Token`, body `{ completed: true, reporterName }`, refresh board or apply optimistic UI.

- [ ] **Step 4: Manual smoke** — `npm start`, open `/interno/sala-1?t=…` with seeded guardia + v2 pendientes.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(interno-ui): estudios detail badges and mark complete"
```

---

### Task 7: Entrega modal HTML + styles

**Files:**
- Modify: `public/partials/modals/root.html` (source for build-ui)
- Modify: `public/styles/pase-board.css` or add `public/styles/entrega-modal.css` imported from bundle
- Run: `npm run build:ui`

- [ ] **Step 1: Remove** `#entrega-pendientes` textarea block.

- [ ] **Step 2: Add markup**

```html
<div class="field-group entrega-proc-block">
  <div class="entrega-proc-header">
    <label>Procedimientos y estudios</label>
    <button type="button" id="btn-entrega-apply-template" class="btn-secondary">Aplicar plantilla</button>
    <button type="button" id="btn-entrega-add-proc" class="btn-secondary">+ Agregar</button>
  </div>
  <ul id="entrega-proc-list" class="entrega-proc-list"></ul>
  <div id="entrega-proc-form" class="entrega-proc-form hidden" aria-hidden="true"></div>
</div>
```

- [ ] **Step 3: Build UI**

```bash
npm run build:ui
```

Verify `public/index.html` contains new nodes.

- [ ] **Step 4: Commit**

```bash
git commit -m "ui: entrega modal procedimientos shell"
```

---

### Task 8: Renderer — `entrega-modal-ui.mjs` + wire `clinical-entrega.mjs`

**Files:**
- Create: `public/js/features/entrega-modal-ui.mjs`
- Modify: `public/js/features/clinical-entrega.mjs`
- Modify: `public/js/features/clinical-entrega.test.mjs`
- Modify: `scripts/bundle-renderer` import graph if needed (app bundle imports entrega)

- [ ] **Step 1: State** — in-memory `draftProcedimientos` array while modal open; load via `normalizePendientesJson(existing.pendientes_json)` on `openEntregaModal`.

- [ ] **Step 2: Render list cards** — label, time, chips; delete button hidden when `!canDeletePendienteItem(item, actor)` (`actor.role` = `diurno` if new entrega else `guardia`).

- [ ] **Step 3: Form** — kind select, label, `input type="time"`, checkboxes comentado/autorizado/agendado, requires.*; **Añadir** pushes `createProcedimientoItem({ lockedBase: actor.role === 'diurno', createdBy })`.

- [ ] **Step 4: Templates** — `dbEntregaTemplateList` on open; save via prompt name + scope; apply prefill.

- [ ] **Step 5: Submit** — `pendientesJson: serializePendientesJson({ version: 2, items: draftProcedimientos })` in `submitEntregaAssignment`.

- [ ] **Step 6: Tests** — export `resolveEntregaActorRole(currentUser, existingGuardia)` and test diurno vs guardia.

- [ ] **Step 7: Rebundle**

```bash
npm run bundle:renderer
node --test public/js/features/clinical-entrega.test.mjs
```

- [ ] **Step 8: Commit**

```bash
git commit -m "feat(entrega): modal v2 procedimientos and templates"
```

---

### Task 9: Grid chip pending count + package.json tests

**Files:**
- Modify: `public/js/features/unified-patient-grid-board.mjs`
- Modify: `public/js/features/guardia-board.mjs` (if census builds `pendingCount`)
- Modify: `package.json` `test` script

- [ ] **Step 1: When building patient row**, set `pendingCount` from `listActiveProcedimientos(normalizePendientesJson(g.pendientes_json)).length` (server-side or renderer when mapping guardias).

- [ ] **Step 2: Chip subtitle** shows count if > 0.

- [ ] **Step 3: Add to `npm test`:**

```
lib/entrega/entrega-pendientes.test.mjs
lib/interno/interno-pendientes.test.mjs
```

- [ ] **Step 4: Full test run**

```bash
npm test
```

- [ ] **Step 5: Update spec status** in `docs/superpowers/specs/2026-06-02-modo-entrega-pendientes-design.md` → `Status: Approved`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(guardia): pending count from entrega v2 procedimientos"
```

---

## Spec coverage checklist (self-review)

| Spec requirement | Task |
|------------------|------|
| Independent from `rpc-todos` | Task 8 (no imports from todos) |
| v2 `pendientes_json` | Task 1, 8 |
| Template user + team | Task 2, 3, 4, 8 |
| R1 diurno CRUD | Task 8 permissions `diurno` |
| R1 guardia flags + add, no delete locked | Task 1, 8 |
| Signos not in items | Tasks 5–6 unchanged vitals path |
| Interno detail + badges + complete | Tasks 5, 6 |
| PATCH API | Task 5 |
| LAN sync templates | Task 4 |
| Legacy migration | Task 1 |
| Eventualidades separate | No task (already exists) |

## Manual test plan

- [ ] R1 diurno: Entrega mode → add 2 procedimientos, save template, confirm handoff → R1 guardia sees patients + pendientes.
- [ ] R1 guardia: toggle autorizado on locked item; add new procedimiento; cannot delete locked.
- [ ] Interno QR: vitals banner tap works; estudios show badges; mark hecho updates board on desktop refresh/WS.
- [ ] LAN: second machine sees template list and updated pendientes after sync.

## Execution order

Tasks **1 → 2 → 3 → 4** (backend), then **5 → 6** (interno), then **7 → 8** (desktop UI), **9** (polish). Task 4 can parallelize after Task 3 if two workers.
