# Manejo modular + sala LAN persistente (room drive) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sala LAN con documento persistente (pacientes, labs, agenda, pendientes, Manejo de equipo), membresía pegajosa con reconexión al abrir R+, borrado de paciente con ⌘Z antes de propagar, y refactor de `manejo.mjs` en módulos acotados.

**Architecture:** LWW por entidad en `RoomSnapshot`; host squad (D1) como disco (`PUT/GET sync-bundle`) + relay WS; cliente con `rpc-lan-room-snapshots`, `rpc-lan-sync-outbox`, `rpc-lan-room-membership`. Fase B extrae UI Manejo siguiendo patrón `manejo-guia-*`.

**Tech Stack:** Electron, Express + `ws`, vanilla ESM, `localStorage`, `node --test`.

**Spec:** [`2026-05-26-manejo-room-drive-design.md`](../specs/2026-05-26-manejo-room-drive-design.md)

---

## File structure

| File | Responsabilidad |
|------|-----------------|
| `public/js/live-sync-membership.mjs` | Leer/escribir `rpc-lan-room-membership`; migrar desde `rpc-lan-last-room` |
| `public/js/live-sync-membership.test.mjs` | Tests membership get/set/clear |
| `public/js/live-sync-outbox.mjs` | Cola por `roomId`; enqueue/flush/drain |
| `public/js/live-sync-outbox.test.mjs` | Tests enqueue + drain |
| `public/js/live-sync-room.mjs` | Ampliar merge si hace falta `manejo` en bundles |
| `public/js/manejo-room-data.mjs` | Merge LWW `customProtocols`, `overrides`, `favorites`, `recent` |
| `public/js/manejo-room-data.test.mjs` | Tests merge manejo |
| `public/js/patient-delete-sync.mjs` | `pendingPatientDeletes`, emit diferido, timeout 30s |
| `public/js/patient-delete-sync.test.mjs` | Tests defer / cancel |
| `public/js/features/lan-sync.mjs` | Outbox flush, PUT sin WS, resume, reconnect loop, `manejo` en envelope |
| `public/js/features/patients.mjs` | Integrar `patient-delete-sync` en `deletePatient` |
| `public/js/features/lab-panel.mjs` | `updatedAt` en cada lab set al crear/reprocesar |
| `public/js/storage.js` | Helpers snapshot/outbox keys si se centralizan |
| `lan-squad/host-store.js` | Persistir `manejo` en `putRoomSyncBundle` |
| `lan-squad/host-store.test.js` | LWW bundle con `manejo` + `entries` |
| `public/js/features/manejo-guia-context.mjs` | **Fase B** — contexto `ui` |
| `public/js/features/manejo-electrolitos.mjs` | **Fase B** — UI electrolitos |
| `public/js/features/manejo-some-ui.mjs` | **Fase B** — builders SOME |
| `public/js/features/manejo-proto-detail.mjs` | **Fase B** — detalle infusión |
| `public/js/features/manejo-proto-editor.mjs` | **Fase B** — modal editor |
| `public/js/features/manejo-atb-ui.mjs` | **Fase B** — lectura ATB |
| `public/js/features/manejo.mjs` | Orquestador delgado; eliminar legacy |
| `public/js/features/settings-help.mjs` | Corregir copy pendientes/labs |
| `package.json` | Registrar nuevos `*.test.mjs` en script `test` |

---

## Phase A — Room drive (hacer antes de Fase B)

### Task 1: `live-sync-membership.mjs`

**Files:**
- Create: `public/js/live-sync-membership.mjs`
- Create: `public/js/live-sync-membership.test.mjs`
- Modify: `package.json` (añadir ambos al script `test`)

- [ ] **Step 1: Write failing tests**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRoomMembership,
  setRoomMembership,
  clearRoomMembership,
  migrateLastRoomToMembership,
} from './live-sync-membership.mjs';

const LS_KEY = 'rpc-lan-room-membership';
const LAST_KEY = 'rpc-lan-last-room';

test('set/get/clear membership', () => {
  global.localStorage = {
    _d: {},
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = v; },
    removeItem(k) { delete this._d[k]; },
  };
  setRoomMembership({ roomId: 'r1', label: 'Turno A' });
  const m = getRoomMembership();
  assert.equal(m.roomId, 'r1');
  assert.equal(m.label, 'Turno A');
  clearRoomMembership();
  assert.equal(getRoomMembership(), null);
});

test('migrateLastRoomToMembership copies rpc-lan-last-room once', () => {
  global.localStorage = {
    _d: { [LAST_KEY]: 'old-room' },
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = v; },
    removeItem(k) { delete this._d[k]; },
  };
  migrateLastRoomToMembership();
  assert.equal(getRoomMembership().roomId, 'old-room');
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `node --test public/js/live-sync-membership.test.mjs`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```javascript
const MEMBERSHIP_KEY = 'rpc-lan-room-membership';
const LAST_ROOM_KEY = 'rpc-lan-last-room';

export function getRoomMembership() {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !String(o.roomId || '').trim()) return null;
    return {
      roomId: String(o.roomId).trim(),
      label: String(o.label || o.roomId).trim(),
      joinedAt: String(o.joinedAt || ''),
    };
  } catch (_e) {
    return null;
  }
}

export function setRoomMembership({ roomId, label }) {
  const id = String(roomId || '').trim();
  if (!id) return;
  const payload = {
    roomId: id,
    label: String(label || id).trim(),
    joinedAt: new Date().toISOString(),
  };
  localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(payload));
  localStorage.setItem(LAST_ROOM_KEY, id);
}

export function clearRoomMembership() {
  try {
    localStorage.removeItem(MEMBERSHIP_KEY);
    localStorage.removeItem(LAST_ROOM_KEY);
  } catch (_e) {}
}

export function migrateLastRoomToMembership() {
  if (getRoomMembership()) return;
  try {
    const id = String(localStorage.getItem(LAST_ROOM_KEY) || '').trim();
    if (!id) return;
    setRoomMembership({ roomId: id, label: id });
  } catch (_e) {}
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `node --test public/js/live-sync-membership.test.mjs`

- [ ] **Step 5: Commit**

```bash
git add public/js/live-sync-membership.mjs public/js/live-sync-membership.test.mjs package.json
git commit -m "feat(lan): room membership persistence helpers"
```

---

### Task 2: `live-sync-outbox.mjs`

**Files:**
- Create: `public/js/live-sync-outbox.mjs`
- Create: `public/js/live-sync-outbox.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enqueueOutbox, drainOutbox, outboxSize } from './live-sync-outbox.mjs';

test('enqueue and drain per roomId', () => {
  global.localStorage = {
    _d: {},
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = v; },
    removeItem(k) { delete this._d[k]; },
  };
  enqueueOutbox('room1', { kind: 'bundle', payload: { type: 'livesync:bundle', roomId: 'room1' } });
  assert.equal(outboxSize('room1'), 1);
  const items = drainOutbox('room1');
  assert.equal(items.length, 1);
  assert.equal(outboxSize('room1'), 0);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `node --test public/js/live-sync-outbox.test.mjs`

- [ ] **Step 3: Implement** (clave `rpc-lan-sync-outbox` → objeto `{ [roomId]: Item[] }`, cap 50 items/room, FIFO)

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(lan): sync outbox queue per room"
```

---

### Task 3: Host bundle incluye `manejo`

**Files:**
- Modify: `lan-squad/host-store.js` (`putRoomSyncBundle` / `getRoomSyncBundle`)
- Modify: `lan-squad/host-store.test.js`
- Modify: `public/js/features/lan-sync.mjs` (`pushRoomSyncBundleToHost` body)

- [ ] **Step 1: Write failing host test**

```javascript
it('putRoomSyncBundle persiste manejo', () => {
  const store = createHostStore({ filePath, teamCodePlain: 'b' });
  const r = store.createRoom('Sala');
  store.putRoomSyncBundle(r.id, {
    updatedAt: '2026-05-26T10:00:00.000Z',
    uploadedByClientId: 'c1',
    agenda: [],
    todos: {},
    entries: [],
    manejo: { customProtocols: [{ id: 'p1', name: 'X' }], overrides: {}, favorites: [], recent: [], updatedAt: '2026-05-26T10:00:00.000Z' },
  });
  const got = store.getRoomSyncBundle(r.id);
  assert.strictEqual(got.manejo.customProtocols[0].id, 'p1');
});
```

- [ ] **Step 2: Run** `node --test lan-squad/host-store.test.js` — expect FAIL

- [ ] **Step 3: En `putRoomSyncBundle`**, añadir al `next`:

```javascript
manejo: incoming.manejo && typeof incoming.manejo === 'object' ? incoming.manejo : (cur && cur.manejo) || null,
```

- [ ] **Step 4: En `buildLiveSyncBundleEnvelope`**, incluir `manejo: collectManejoRoomPayload()` (implementar en Task 4).

- [ ] **Step 5: Run tests — PASS**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(lan): persist manejo block in room sync bundle"
```

---

### Task 4: `manejo-room-data.mjs`

**Files:**
- Create: `public/js/manejo-room-data.mjs`
- Create: `public/js/manejo-room-data.test.mjs`
- Modify: `public/js/manejo-custom-protocols.mjs` (export load sin side effects si hace falta)
- Modify: `public/js/manejo-protocol-favorites.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests** — merge dos `manejo` payloads: custom protocol mismo `id` gana por `updatedAt`; favorites = union ordenada por recencia.

- [ ] **Step 2: Implement**

```javascript
import { compareIso } from './live-sync-room.mjs';

export function collectManejoRoomPayload() {
  // import loadCustomProtocols, loadProtoFavorites, loadProtoRecentIds, load overrides
  return {
    customProtocols: [...],
    overrides: { ... },
    favorites: [...],
    recent: [...],
    updatedAt: new Date().toISOString(),
  };
}

export function mergeManejoRoomData(a, b) {
  // LWW protocols by id; overrides by protocolId; favorites/recent dedupe preserve order
}

export function applyManejoRoomDataToLocal(merged) {
  // write localStorage keys rpc-manejo-*
}
```

- [ ] **Step 3: Wire** `collectManejoRoomPayload` into `buildLiveSyncBundleEnvelope` and `applyLiveSyncMerged` after entries (call `applyManejoRoomDataToLocal` when `merged.manejo`).

- [ ] **Step 4: Run** `node --test public/js/manejo-room-data.test.mjs` — PASS

- [ ] **Step 5: Commit**

---

### Task 5: PUT host sin WS + outbox flush

**Files:**
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Refactor `scheduleLiveSyncPush`**

  - Siempre construir bundle.
  - `saveLocalRoomSnapshot(roomId)`.
  - Si `lanClient.liveConnected` → `sendLive(bundle)`.
  - **Siempre** si `isLanSessionConfiguredForRest()` → `pushRoomSyncBundleToHost` (quitar guard que exige solo live).
  - Si PUT falla → `enqueueOutbox(roomId, { kind: 'bundle', payload })`.

- [ ] **Step 2: Add `flushLiveSyncOutbox(roomId)`**

  - `drainOutbox` → intentar PUT cada bundle; en éxito no re-encolar.

- [ ] **Step 3: Call flush** al final de `reconcileLiveSyncRoom`, en `lan-live-status` connected, y timer `setInterval` 60s cuando membership activa.

- [ ] **Step 4: Extend `liveSyncBundleHasPayload`** — true si `bundle.manejo` tiene protocols/favorites.

- [ ] **Step 5: Manual test** — unir sala, procesar lab, cerrar WS (devtools), verificar PUT en host log / `roomSyncBundles` en `userData`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(lan): flush room bundle to host without live WS"
```

---

### Task 6: Membresía pegajosa + boot + reconnect

**Files:**
- Modify: `public/js/features/lan-sync.mjs`
- Modify: `public/js/app-runtimes.mjs` o boot path que llame `initLanClientFromStorage` (ver `lan-sync.mjs` línea ~333)

- [ ] **Step 1: En `joinLanRoom`**, tras éxito: `setRoomMembership({ roomId: id, label })`.

- [ ] **Step 2: En `leaveLiveSyncRoom`**, al final: `clearRoomMembership()` (no solo limpiar memoria).

- [ ] **Step 3: Add `resumeLiveSyncRoom()`**

```javascript
export function bootLanRoomMembership() {
  migrateLastRoomToMembership();
  const m = getRoomMembership();
  if (!m || !isLanSessionConfiguredForRest()) return;
  activeLiveSyncRoomId = m.roomId;
  activeLiveSyncRoomLabel = m.label;
  reconcileLiveSyncRoom(m.roomId).then(function () {
    try {
      if (!lanClient.connected) lanClient.connectSyncChannel();
      lanClient.connectLiveChannel(m.roomId);
    } catch (_e) {}
    startLiveSyncReconnectLoop();
    syncLiveSyncStatusChrome();
  });
}
```

- [ ] **Step 4: `startLiveSyncReconnectLoop`**

  - Si no membership → return.
  - Si `liveConnected` → return.
  - Backoff exponencial cap 30s; intentar `connectLiveChannel`; en connect → `syncLiveSyncAfterRoomJoin`.

- [ ] **Step 5: Invoke** `bootLanRoomMembership()` al final de `initLanClientFromStorage()` (setTimeout 0 para no bloquear boot).

- [ ] **Step 6: Update `syncLiveSyncStatusChrome`**

  - Textos: `· sincronizando` | `· reconectando…` | `· solo local (sin vivo)`.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(lan): sticky room membership and auto-resume on boot"
```

---

### Task 7: Borrado paciente diferido + ⌘Z

**Files:**
- Create: `public/js/patient-delete-sync.mjs`
- Create: `public/js/patient-delete-sync.test.mjs`
- Modify: `public/js/features/patients.mjs`
- Modify: `public/js/features/productivity.mjs` (opcional: hook post-undo para cancel pending)
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stagePatientDelete,
  cancelStagedPatientDelete,
  flushStagedPatientDeletes,
  hasStagedDelete,
} from './patient-delete-sync.mjs';

test('stage and cancel before flush', () => {
  stagePatientDelete('p1', { id: 'p1', registro: 'R1' });
  assert.equal(hasStagedDelete('p1'), true);
  cancelStagedPatientDelete('p1');
  assert.equal(hasStagedDelete('p1'), false);
});
```

- [ ] **Step 2: Implement staging** — Map en memoria `{ patientId → { patient, stagedAt, timeoutId } }`; `flush` llama callback `onCommit(patient)`; timeout 30s.

- [ ] **Step 3: Change `deletePatient` in `patients.mjs`**

  - Tras confirm: `pushUndoSnapshot` primero.
  - **No** llamar `emitLiveSyncPatientDelete` inmediato.
  - `removePatientLocally` solo si no hay sala activa; **si hay sala**: ocultar en UI (flag `patient._pendingDelete` o filtrar en `renderPatientList`) + `stagePatientDelete`.
  - En `onCommit`: `emitLiveSyncPatientDelete` + `scheduleLiveSyncPush`.

- [ ] **Step 4: On global undo** — si el snapshot restaurado incluye el paciente, `cancelStagedPatientDelete(id)` (wire desde `productivity.mjs` undo handler si expone evento; si no, comparar patients length antes/después undo).

- [ ] **Step 5: Run tests PASS**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(lan): defer patient delete until undo window expires"
```

---

### Task 8: `updatedAt` en lab sets

**Files:**
- Modify: `public/js/features/lab-panel.mjs` (`pushLabHistory`, bulk store paths)
- Modify: `public/js/lab-history-set.mjs` si normaliza sets

- [ ] **Step 1: En cada nuevo `set` object**, añadir:

```javascript
updatedAt: new Date().toISOString(),
```

  - En `pushLabHistory` al crear `set`.
  - En reprocesar/merge si se reemplaza set, bump `updatedAt`.

- [ ] **Step 2: Test** — extend `public/js/lab-history-set.test.mjs` o `lan-patient-merge.test.mjs`:

```javascript
test('mergeLabHistorySets prefers newer updatedAt', () => {
  const a = [{ id: '1', fecha: '01/01/2026', updatedAt: '2026-05-26T08:00:00.000Z', parsed: {} }];
  const b = [{ id: '1', fecha: '01/01/2026', updatedAt: '2026-05-26T10:00:00.000Z', parsed: { K: 3.1 } }];
  const m = mergeLabHistorySets(a, b);
  assert.equal(m[0].parsed.K, 3.1);
});
```

- [ ] **Step 3: Run** `npm test` (subset) — PASS

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(lab): updatedAt on lab history sets for room LWW"
```

---

### Task 9: Ayuda + limpieza pendientes legacy (A′)

**Files:**
- Modify: `public/js/features/settings-help.mjs` (~línea 1492)
- Optional: `public/js/features/todos.mjs` — función `archiveLegacyManejoRepoTodos(patientId)`

- [ ] **Step 1: Replace help text** — quitar “REPO DE POTASIO automático”; indicar solo Hb transfusion auto + Manejo manual + Pendiente.

- [ ] **Step 2: Add optional utility** (no UI obligatoria v1):

```javascript
export function archiveLegacyRepoTodos(patientId) {
  const todos = storage.getTodos(patientId).map(function (t) {
    if (!t || t.completed) return t;
    const rid = String(t.labRuleId || '');
    const txt = String(t.text || '');
    if (rid.indexOf('manejo:') === 0 || /^Repo /i.test(txt)) {
      return { ...t, completed: true, updatedAt: new Date().toISOString() };
    }
    return t;
  });
  storage.saveTodos(patientId, todos);
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "docs(help): fix lab pending copy; add legacy repo todo archiver"
```

---

## Phase B — Refactor Manejo (después de Phase A estable)

### Task 10: Extraer `manejo-guia-context.mjs`

**Files:**
- Create: `public/js/features/manejo-guia-context.mjs`
- Modify: `public/js/features/manejo.mjs`
- Modify: `public/js/features/manejo-guia.mjs` (import context factory)

- [ ] **Step 1: Move `buildManejoGuiaContext` y dependencias directas** al nuevo archivo; export `createManejoGuiaContext(deps)`.

- [ ] **Step 2: `manejo.mjs` imports** y pasa `renderManejo`, `storage`, etc. como deps.

- [ ] **Step 3: Run** `node --test public/js/features/manejo-guia-state.test.mjs` + smoke app.

- [ ] **Step 4: Commit**

---

### Task 11: Extraer electrolitos + SOME UI

**Files:**
- Create: `public/js/features/manejo-electrolitos.mjs`
- Create: `public/js/features/manejo-some-ui.mjs`
- Modify: `public/js/features/manejo.mjs`

- [ ] **Step 1: Move** `renderManejoElectrolitos`, `buildManejoCard`, `addManejoPendiente`, `buildManejoTodoText` → electrolitos.

- [ ] **Step 2: Move** `buildSomeField`, `buildOrderBlockArticle`, … → some-ui (guard `MANEJO_SOME_COPY_UI`).

- [ ] **Step 3: Export** `renderManejoElectrolitos(panel, ctx)` from electrolitos.

- [ ] **Step 4: Verify** `wc -l public/js/features/manejo.mjs` < 2500 líneas (progreso).

- [ ] **Step 5: Commit**

---

### Task 12: Extraer proto detail, editor, ATB UI

**Files:**
- Create: `public/js/features/manejo-proto-detail.mjs`
- Create: `public/js/features/manejo-proto-editor.mjs`
- Create: `public/js/features/manejo-atb-ui.mjs`

- [ ] **Step 1: Move** `buildProtocolDetailPanel`, calc drawer, list rows → proto-detail.

- [ ] **Step 2: Move** `openManejoProtocolEditorModal` → proto-editor.

- [ ] **Step 3: Move** `buildAtbReadingPanel`, RIS chip helpers → atb-ui.

- [ ] **Step 4: Commit**

---

### Task 13: Eliminar legacy renderers

**Files:**
- Modify: `public/js/features/manejo.mjs`

- [ ] **Step 1: Delete** `renderManejoProtocolos`, `renderManejoAtb`, `renderManejoCadEhh`, `buildManejoPatologiasUi` alias, y funciones **solo** referenciadas por ellos (grep antes de borrar).

- [ ] **Step 2: Run** `npm test` + manual: Electrolitos + Guía clínica (3 modos).

- [ ] **Step 3: Target** `manejo.mjs` < 400 líneas; si > 400, mover disclaimer/subtabs a `manejo-shell.mjs`.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(manejo): remove legacy subtab renderers and slim orchestrator"
```

---

## Verification checklist (antes de cerrar epic)

- [ ] Unir sala → cerrar app → reabrir → entra sola a la misma sala y reconcilia.
- [ ] Cliente sin host WS pero con REST: PUT bundle; otro cliente GET ve cambios.
- [ ] Alta paciente en cliente A visible en B tras merge.
- [ ] Borrar paciente → ⌘Z restaura; tras timeout desaparece en B.
- [ ] Lab nuevo en A con `updatedAt` gana sobre set viejo en B.
- [ ] Protocolo custom editado en sala persiste tras salir/reentrar.
- [ ] `npm test` verde con nuevos tests en `package.json`.

---

## Spec coverage (self-review)

| Spec § | Task |
|--------|------|
| RoomSnapshot + manejo | 3, 4, 5 |
| Membresía pegajosa | 1, 6 |
| Outbox + PUT | 2, 5 |
| Borrado ⌘Z | 7 |
| Labs updatedAt | 8 |
| Reposiciones / ayuda | 9 |
| Refactor Manejo | 10–13 |
| D1 host | 5, 6 (sin cambio infra) |

---

## Execution handoff

Plan guardado en `docs/superpowers/plans/2026-05-26-manejo-room-drive.md`.

**Opciones de ejecución:**

1. **Subagent-Driven (recomendado)** — un subagente por task, revisión entre tasks (`superpowers:subagent-driven-development`).

2. **Inline** — ejecutar en esta sesión con checkpoints (`superpowers:executing-plans`).

¿Con cuál quieres seguir?
