# Achievements (Logros) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an event-driven achievements system (20+ catalog) with SQLCipher per-user progress, quiet Spanish unlock toasts, and a Logros shelf in Aprender R+.

**Architecture:** Static catalog in `data/` + pure engine in renderer; thin `emitAchievementEvent` hooks at success sites; progress in `clinical_user_achievements` (schema v22) via IPC; Learn Hub shelf + toast for UX. No XP, streaks, or LAN vanity sync. Lazy-loaded with settings-help — no new boot-graph imports.

**Tech Stack:** Electron renderer ESM, SQLCipher (`better-sqlite3-multiple-ciphers`), `node --test` via `npm run test:one`, esbuild (`npm run build:ui`).

**Spec:** [docs/superpowers/specs/2026-07-19-achievements-design.md](../specs/2026-07-19-achievements-design.md)

## Global Constraints

- Spanish UI copy only (`title`, `hint`, toast strings)
- No PHI in event payloads or `unlocked_json` (IDs + timestamps only)
- No XP / streaks / LAN leaderboards
- No new static imports in `app.js`, `app-shell.mjs`, or `app-runtimes.mjs`
- Tier 1: complexity ≤15, function ≤80 lines, file ≤600 lines on touched files
- Tests: `npm run test:one -- <path>` only — never full `npm test` during implementation
- Schema bump: `SCHEMA_VERSION` 21 → 22
- Guardia chapter ids (live): `ch-guardia-modo`, `ch-guardia-censo`, `ch-guardia-entrega`, `ch-guardia-lan`, `ch-guardia-movil`

---

## File map

| File | Responsibility |
|------|----------------|
| `data/achievements-catalog.mjs` | Static 24-entry catalog (ESM export) |
| `public/js/achievements-engine.mjs` | Pure match/unlock + shelf view helpers |
| `public/js/achievements-engine.test.mjs` | Engine + catalog unit tests |
| `public/js/achievements-runtime.mjs` | Session cache, emit, IPC persist, toast queue |
| `public/js/achievements-emit.mjs` | Tiny dynamic-import wrapper for hooks |
| `lib/db/schema-migrate-v22-achievements.mjs` | CREATE TABLE + bump version |
| `lib/db/schema-primitives.mjs` | `SCHEMA_VERSION = 22` |
| `lib/db/schema-migrate-v15-v17.mjs` | Wire v22 into migration chain |
| `lib/db/schema.mjs` | Re-export migrate |
| `lib/db/schema-v22-achievements.test.mjs` | Migrate smoke test |
| `lib/db/clinical-access-achievements.mjs` | `getUserAchievements` / `upsertUserAchievements` |
| `lib/db/clinical-access-db.mjs` | Re-export accessors |
| `lib/db/ipc-handlers-register-achievements.mjs` | IPC get/upsert |
| `lib/db/ipc-handlers.mjs` | Register achievements handlers |
| `preload.js` | `dbAchievementsGet` / `dbAchievementsUpsert` |
| `public/js/features/settings-help/learn-hub-achievements.mjs` | Logros shelf HTML |
| `public/js/features/settings-help/learn-hub.mjs` | Insert shelf before footer |
| `public/styles/modals.css` | Shelf tile styles |
| Hook sites | tour / labs / docs / LAN / entrega / equipos / tendencias |
| `docs/features/features-index.md` | Feature domain entry |
| `.cursor/rules/project-context.mdc` | Changelog bullet |

---

### Task 1: Catalog + pure engine

**Files:**
- Create: `data/achievements-catalog.mjs`
- Create: `public/js/achievements-engine.mjs`
- Create: `public/js/achievements-engine.test.mjs`

**Interfaces:**
- Produces:
  - `ACHIEVEMENTS_CATALOG: AchievementDef[]`
  - `getAchievementById(id): AchievementDef | null`
  - `matchUnlocks({ catalog, unlocked, eventId, ctx, sessionEvents }): string[]`
  - `buildShelfItems({ catalog, unlocked }): ShelfItem[]`
  - `AchievementDef = { id, title, hint, category, secret?, events, once?, when?, requireAllInSession? }`
  - `ShelfItem = { id, title, hint, secret, unlocked, unlockedAt }`

- [ ] **Step 1: Write failing engine tests**

```javascript
// public/js/achievements-engine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS_CATALOG } from '../../data/achievements-catalog.mjs';
import {
  matchUnlocks,
  buildShelfItems,
  getAchievementById,
} from './achievements-engine.mjs';

test('catalog has at least 20 entries and unique ids', () => {
  assert.ok(ACHIEVEMENTS_CATALOG.length >= 20);
  const ids = ACHIEVEMENTS_CATALOG.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('catalog has 2–3 secrets', () => {
  const secrets = ACHIEVEMENTS_CATALOG.filter((a) => a.secret);
  assert.ok(secrets.length >= 2 && secrets.length <= 3);
});

test('matchUnlocks unlocks labs.first_procesar once', () => {
  const first = matchUnlocks({
    catalog: ACHIEVEMENTS_CATALOG,
    unlocked: {},
    eventId: 'labs.procesar',
    ctx: {},
    sessionEvents: new Set(['labs.procesar']),
  });
  assert.ok(first.includes('labs.first_procesar'));
  const second = matchUnlocks({
    catalog: ACHIEVEMENTS_CATALOG,
    unlocked: { 'labs.first_procesar': Date.now() },
    eventId: 'labs.procesar',
    ctx: {},
    sessionEvents: new Set(['labs.procesar']),
  });
  assert.deepEqual(second, []);
});

test('matchUnlocks respects when.chapterId', () => {
  const hit = matchUnlocks({
    catalog: ACHIEVEMENTS_CATALOG,
    unlocked: {},
    eventId: 'tour.chapter_complete',
    ctx: { chapterId: 'ch-guardia-modo' },
    sessionEvents: new Set(),
  });
  assert.ok(hit.includes('onboarding.gv7_modo'));
  const miss = matchUnlocks({
    catalog: ACHIEVEMENTS_CATALOG,
    unlocked: {},
    eventId: 'tour.chapter_complete',
    ctx: { chapterId: 'other' },
    sessionEvents: new Set(),
  });
  assert.equal(miss.includes('onboarding.gv7_modo'), false);
});

test('secret magic_moment needs all session events', () => {
  const partial = matchUnlocks({
    catalog: ACHIEVEMENTS_CATALOG,
    unlocked: {},
    eventId: 'doc.note_exported',
    ctx: {},
    sessionEvents: new Set(['labs.procesar', 'doc.note_exported']),
  });
  assert.equal(partial.includes('secret.magic_moment'), false);
  const full = matchUnlocks({
    catalog: ACHIEVEMENTS_CATALOG,
    unlocked: {},
    eventId: 'doc.note_exported',
    ctx: {},
    sessionEvents: new Set(['labs.procesar', 'tendencias.open', 'doc.note_exported']),
  });
  assert.ok(full.includes('secret.magic_moment'));
});

test('buildShelfItems hides secret title until unlocked', () => {
  const locked = buildShelfItems({ catalog: ACHIEVEMENTS_CATALOG, unlocked: {} });
  const secret = locked.find((i) => i.id === 'secret.magic_moment');
  assert.ok(secret);
  assert.equal(secret.secret, true);
  assert.equal(secret.unlocked, false);
  assert.equal(secret.title, '???');
  const unlocked = buildShelfItems({
    catalog: ACHIEVEMENTS_CATALOG,
    unlocked: { 'secret.magic_moment': 1 },
  });
  const open = unlocked.find((i) => i.id === 'secret.magic_moment');
  assert.notEqual(open.title, '???');
  assert.equal(open.unlocked, true);
});

test('getAchievementById returns entry', () => {
  assert.equal(getAchievementById('labs.first_procesar')?.title, 'Laboratoriazo');
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test:one -- public/js/achievements-engine.test.mjs
```

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Implement catalog**

Create `data/achievements-catalog.mjs` with the full array below (24 entries). Use exact guardia chapter ids from Global Constraints.

```javascript
/** @typedef {{ id: string, title: string, hint: string, category: string, secret?: boolean, events: string[], once?: boolean, when?: Record<string, string>, requireAllInSession?: string[] }} AchievementDef */

/** @type {AchievementDef[]} */
export const ACHIEVEMENTS_CATALOG = [
  {
    id: 'onboarding.first_fundamentos',
    title: 'Primeros pasos',
    hint: 'Completá un módulo de Fundamentos',
    category: 'onboarding',
    events: ['fundamentos.module_complete'],
    once: true,
  },
  {
    id: 'onboarding.gv7_modo',
    title: 'Modo Guardia',
    hint: 'Completá el módulo Modo Guardia en Aprender R+',
    category: 'onboarding',
    events: ['tour.chapter_complete'],
    when: { chapterId: 'ch-guardia-modo' },
    once: true,
  },
  {
    id: 'onboarding.gv7_censo',
    title: 'Censo al día',
    hint: 'Completá el módulo censo y alcance',
    category: 'onboarding',
    events: ['tour.chapter_complete'],
    when: { chapterId: 'ch-guardia-censo' },
    once: true,
  },
  {
    id: 'onboarding.gv7_entrega',
    title: 'Entrega clara',
    hint: 'Completá el módulo Modo Entrega',
    category: 'onboarding',
    events: ['tour.chapter_complete'],
    when: { chapterId: 'ch-guardia-entrega' },
    once: true,
  },
  {
    id: 'onboarding.gv7_lan',
    title: 'Turno en red',
    hint: 'Completá el módulo LAN y equipos',
    category: 'onboarding',
    events: ['tour.chapter_complete'],
    when: { chapterId: 'ch-guardia-lan' },
    once: true,
  },
  {
    id: 'onboarding.gv7_movil',
    title: 'En el bolsillo',
    hint: 'Completá el módulo móvil / iPad',
    category: 'onboarding',
    events: ['tour.chapter_complete'],
    when: { chapterId: 'ch-guardia-movil' },
    once: true,
  },
  {
    id: 'onboarding.branch_sala',
    title: 'Ruta Sala',
    hint: 'Terminá el tour de Fundamentos Sala',
    category: 'onboarding',
    events: ['tour.branch_complete'],
    when: { branch: 'sala' },
    once: true,
  },
  {
    id: 'onboarding.branch_guardia',
    title: 'Guardia 7.x',
    hint: 'Terminá la pista Guardia y novedades',
    category: 'onboarding',
    events: ['tour.branch_complete'],
    when: { branch: 'guardia-v7' },
    once: true,
  },
  {
    id: 'labs.first_procesar',
    title: 'Laboratoriazo',
    hint: 'Pegá y procesá tu primer SOME',
    category: 'labs',
    events: ['labs.procesar'],
    once: true,
  },
  {
    id: 'labs.tendencias',
    title: 'Curvas en vista',
    hint: 'Abrí Tendencias de un paciente',
    category: 'labs',
    events: ['tendencias.open'],
    once: true,
  },
  {
    id: 'labs.gasometria',
    title: 'Gases al aire',
    hint: 'Procesá una gasometría en labs',
    category: 'labs',
    events: ['labs.gaso'],
    once: true,
  },
  {
    id: 'labs.coag',
    title: 'Coágulo leído',
    hint: 'Procesá un panel de coagulación',
    category: 'labs',
    events: ['labs.coag'],
    once: true,
  },
  {
    id: 'labs.cultivo',
    title: 'Cultivo en mano',
    hint: 'Importá o procesá un cultivo',
    category: 'labs',
    events: ['labs.cultivo'],
    once: true,
  },
  {
    id: 'labs.anion_gap',
    title: 'Hueco aniónico',
    hint: 'Revisá AG / AGc en gases o QS',
    category: 'labs',
    events: ['labs.anion_gap'],
    once: true,
  },
  {
    id: 'docs.note',
    title: 'Nota lista',
    hint: 'Exportá tu primera nota .docx',
    category: 'docs',
    events: ['doc.note_exported'],
    once: true,
  },
  {
    id: 'docs.indicaciones',
    title: 'Indicaciones listas',
    hint: 'Exportá tu primer set de indicaciones',
    category: 'docs',
    events: ['doc.indicaciones_exported'],
    once: true,
  },
  {
    id: 'docs.listado',
    title: 'Listado del pase',
    hint: 'Exportá un listado .docx',
    category: 'docs',
    events: ['doc.listado_exported'],
    once: true,
  },
  {
    id: 'lan.joined',
    title: '⇄ en el turno',
    hint: 'Unite a una sala LiveSync',
    category: 'lan',
    events: ['lan.joined'],
    once: true,
  },
  {
    id: 'lan.host',
    title: 'Anfitrión del turno',
    hint: 'Iniciá el host LiveSync',
    category: 'lan',
    events: ['lan.host_started'],
    once: true,
  },
  {
    id: 'entrega.done',
    title: 'Entrega cerrada',
    hint: 'Completá un flujo de Modo Entrega',
    category: 'entrega',
    events: ['entrega.completed'],
    once: true,
  },
  {
    id: 'equipos.queue',
    title: 'Equipo en cola',
    hint: 'Usá la cola de Lumify / EKG / US',
    category: 'equipos',
    events: ['equipos.queue_used'],
    once: true,
  },
  {
    id: 'secret.magic_moment',
    title: 'Momento mágico',
    hint: 'SOME → Tendencias → Nota en la misma sesión',
    category: 'secret',
    secret: true,
    events: [],
    requireAllInSession: ['labs.procesar', 'tendencias.open', 'doc.note_exported'],
    once: true,
  },
  {
    id: 'secret.full_guardia',
    title: 'Guardia completa',
    hint: 'Terminá toda la pista Guardia 7.x',
    category: 'secret',
    secret: true,
    events: ['tour.branch_complete'],
    when: { branch: 'guardia-v7' },
    once: true,
  },
  {
    id: 'secret.host_and_entrega',
    title: 'Pase maestro',
    hint: 'Host LiveSync y una entrega en la misma sesión',
    category: 'secret',
    secret: true,
    events: [],
    requireAllInSession: ['lan.host_started', 'entrega.completed'],
    once: true,
  },
];
```

- [ ] **Step 4: Implement engine**

Create `public/js/achievements-engine.mjs`:

```javascript
import { ACHIEVEMENTS_CATALOG } from '../../data/achievements-catalog.mjs';

export { ACHIEVEMENTS_CATALOG };

export function getAchievementById(id, catalog = ACHIEVEMENTS_CATALOG) {
  const key = String(id || '');
  return catalog.find((a) => a.id === key) || null;
}

function whenMatches(def, ctx) {
  const when = def.when;
  if (!when || typeof when !== 'object') return true;
  for (const [k, v] of Object.entries(when)) {
    if (String(ctx?.[k] ?? '') !== String(v)) return false;
  }
  return true;
}

function requireAllMet(def, sessionEvents) {
  const need = def.requireAllInSession;
  if (!Array.isArray(need) || need.length === 0) return true;
  const set = sessionEvents instanceof Set ? sessionEvents : new Set(sessionEvents || []);
  return need.every((e) => set.has(e));
}

function eventMatches(def, eventId) {
  if (Array.isArray(def.requireAllInSession) && def.requireAllInSession.length) {
    return def.requireAllInSession.includes(eventId);
  }
  return Array.isArray(def.events) && def.events.includes(eventId);
}

/** @returns {string[]} newly unlocked achievement ids */
export function matchUnlocks({
  catalog = ACHIEVEMENTS_CATALOG,
  unlocked = {},
  eventId,
  ctx = {},
  sessionEvents = new Set(),
}) {
  const ev = String(eventId || '');
  if (!ev) return [];
  const out = [];
  for (const def of catalog) {
    if (unlocked[def.id] != null) continue;
    if (!eventMatches(def, ev)) continue;
    if (!whenMatches(def, ctx)) continue;
    if (!requireAllMet(def, sessionEvents)) continue;
    out.push(def.id);
  }
  return out;
}

export function buildShelfItems({ catalog = ACHIEVEMENTS_CATALOG, unlocked = {} }) {
  return catalog.map((def) => {
    const unlockedAt = unlocked[def.id] ?? null;
    const isUnlocked = unlockedAt != null;
    const secret = !!def.secret;
    return {
      id: def.id,
      title: secret && !isUnlocked ? '???' : def.title,
      hint: secret && !isUnlocked ? '' : def.hint,
      secret,
      unlocked: isUnlocked,
      unlockedAt,
    };
  });
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm run test:one -- public/js/achievements-engine.test.mjs
```

- [ ] **Step 6: Commit**

```bash
git add data/achievements-catalog.mjs public/js/achievements-engine.mjs public/js/achievements-engine.test.mjs
git commit -m "$(cat <<'EOF'
feat(achievements): catalog + pure unlock engine

EOF
)"
```

---

### Task 2: Schema v22 + DB accessors

**Files:**
- Modify: `lib/db/schema-primitives.mjs` (`SCHEMA_VERSION = 22`)
- Create: `lib/db/schema-migrate-v22-achievements.mjs`
- Modify: `lib/db/schema-migrate-v15-v17.mjs` (append v22 after v21 block)
- Modify: `lib/db/schema.mjs` (re-export)
- Create: `lib/db/clinical-access-achievements.mjs`
- Modify: `lib/db/clinical-access-db.mjs` (re-export)
- Create: `lib/db/schema-v22-achievements.test.mjs`
- Fix: tests that hard-assert `SCHEMA_VERSION === 21` → `22`

**Interfaces:**
- Produces:
  - `migrateToV22Achievements(db): void`
  - `getUserAchievements(db, userId): { userId, unlocked, updatedAt }`
  - `upsertUserAchievements(db, { userId, unlocked }): same shape`

- [ ] **Step 1: Write failing migrate test**

```javascript
// lib/db/schema-v22-achievements.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';
import {
  getUserAchievements,
  upsertUserAchievements,
} from './clinical-access-achievements.mjs';

describe('schema v22 clinical_user_achievements', () => {
  it('creates clinical_user_achievements and round-trips unlocks', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .all()
      .map((r) => r.name);
    assert.ok(tables.includes('clinical_user_achievements'));
    const v = db.prepare(`SELECT value FROM app_meta WHERE key = 'schema_version'`).get();
    assert.equal(Number(v.value), SCHEMA_VERSION);
    assert.equal(SCHEMA_VERSION, 22);

    // Match live users columns from existing schema tests if this INSERT fails.
    db.prepare(
      `INSERT INTO users (user_id, display_name, created_at) VALUES (?, ?, datetime('now'))`
    ).run('u1', 'Test');

    const empty = getUserAchievements(db, 'u1');
    assert.deepEqual(empty.unlocked, {});

    upsertUserAchievements(db, {
      userId: 'u1',
      unlocked: { 'labs.first_procesar': 1700000000000 },
    });
    const got = getUserAchievements(db, 'u1');
    assert.equal(got.unlocked['labs.first_procesar'], 1700000000000);
    db.close();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test:one -- lib/db/schema-v22-achievements.test.mjs
```

- [ ] **Step 3: Implement migration + accessors**

`lib/db/schema-migrate-v22-achievements.mjs`:

```javascript
export function migrateToV22Achievements(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clinical_user_achievements (
      user_id TEXT PRIMARY KEY,
      unlocked_json TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '22');
}
```

Set `SCHEMA_VERSION = 22` in `schema-primitives.mjs`.

In `runMigrationsV11ThroughV19` after the v21 block:

```javascript
import { migrateToV22Achievements } from './schema-migrate-v22-achievements.mjs';
// ...
if (readSchemaVersion(db) < 22) {
  db.transaction(() => migrateToV22Achievements(db))();
}
```

`lib/db/clinical-access-achievements.mjs`:

```javascript
function parseUnlocked(raw) {
  try {
    const o = JSON.parse(raw || '{}');
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      const n = Number(v);
      if (k && Number.isFinite(n)) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

export function getUserAchievements(db, userId) {
  const id = String(userId || '').trim();
  if (!id) return { userId: '', unlocked: {}, updatedAt: null };
  const row = db
    .prepare(
      'SELECT user_id, unlocked_json, updated_at FROM clinical_user_achievements WHERE user_id = ?'
    )
    .get(id);
  if (!row) return { userId: id, unlocked: {}, updatedAt: null };
  return {
    userId: row.user_id,
    unlocked: parseUnlocked(row.unlocked_json),
    updatedAt: row.updated_at == null ? null : Number(row.updated_at),
  };
}

export function upsertUserAchievements(db, { userId, unlocked }) {
  const id = String(userId || '').trim();
  if (!id) throw new Error('userId required');
  const map = unlocked && typeof unlocked === 'object' ? unlocked : {};
  const cleaned = {};
  for (const [k, v] of Object.entries(map)) {
    const n = Number(v);
    if (k && Number.isFinite(n)) cleaned[k] = n;
  }
  const now = Date.now();
  db.prepare(`
    INSERT INTO clinical_user_achievements (user_id, unlocked_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      unlocked_json = excluded.unlocked_json,
      updated_at = excluded.updated_at
  `).run(id, JSON.stringify(cleaned), now);
  return getUserAchievements(db, id);
}
```

Re-export from `clinical-access-db.mjs` and `schema.mjs`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:one -- lib/db/schema-v22-achievements.test.mjs
```

Update any schema test that still asserts literal `21`.

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema-primitives.mjs lib/db/schema-migrate-v22-achievements.mjs \
  lib/db/schema-migrate-v15-v17.mjs lib/db/schema.mjs \
  lib/db/clinical-access-achievements.mjs lib/db/clinical-access-db.mjs \
  lib/db/schema-v22-achievements.test.mjs
git add -u lib/db/schema-v20-equipos-push.test.mjs lib/db/schema-v21-clinical-sala-check.test.mjs
git commit -m "$(cat <<'EOF'
feat(db): schema v22 clinical_user_achievements

EOF
)"
```

---

### Task 3: IPC + preload

**Files:**
- Create: `lib/db/ipc-handlers-register-achievements.mjs`
- Modify: `lib/db/ipc-handlers.mjs`
- Modify: `preload.js`

**Interfaces:**
- Channels: `db:achievements-get`, `db:achievements-upsert`
- Preload: `dbAchievementsGet({ userId })`, `dbAchievementsUpsert({ userId, unlocked })`
- Returns: `{ ok: true, achievements }` via `bindIpcHandler`

- [ ] **Step 1: Implement register module**

```javascript
// lib/db/ipc-handlers-register-achievements.mjs
import { bindIpcHandler } from './ipc-handlers-bind.mjs';
import {
  getUserAchievements,
  upsertUserAchievements,
} from './clinical-access-achievements.mjs';

export function registerDbAchievementsHandlers({ ipcMain, dbManager }) {
  bindIpcHandler(ipcMain, 'db:achievements-get', async (payload) => {
    const achievements = await dbManager.withTransaction((db) =>
      getUserAchievements(db, String(payload.userId || ''))
    );
    return { ok: true, achievements };
  });

  bindIpcHandler(ipcMain, 'db:achievements-upsert', async (payload) => {
    const achievements = await dbManager.withTransaction((db) =>
      upsertUserAchievements(db, {
        userId: String(payload.userId || ''),
        unlocked: payload.unlocked || {},
      })
    );
    return { ok: true, achievements };
  });
}
```

Wire in `ipc-handlers.mjs`:

```javascript
import { registerDbAchievementsHandlers } from './ipc-handlers-register-achievements.mjs';
// inside registerDbIpcHandlers(ctx):
registerDbAchievementsHandlers(ctx);
```

In `preload.js` near other `dbClinical*` wrappers:

```javascript
dbAchievementsGet: function(opts) {
  return ipcRenderer.invoke('db:achievements-get', opts);
},
dbAchievementsUpsert: function(opts) {
  return ipcRenderer.invoke('db:achievements-upsert', opts);
},
```

- [ ] **Step 2: Optional IPC smoke test**

Add `lib/db/ipc-handlers-achievements.test.mjs` using the existing `createIpcHarness()` pattern from `ipc-handlers.test.mjs` (get → upsert → get). Or skip if harness setup is heavy and rely on Task 2 round-trip + manual smoke in Task 6.

- [ ] **Step 3: Commit**

```bash
git add lib/db/ipc-handlers-register-achievements.mjs lib/db/ipc-handlers.mjs preload.js
git commit -m "$(cat <<'EOF'
feat(ipc): achievements get/upsert channels

EOF
)"
```

---

### Task 4: Runtime (emit + toast + persist)

**Files:**
- Create: `public/js/achievements-runtime.mjs`
- Create: `public/js/achievements-runtime.test.mjs`
- Create: `public/js/achievements-emit.mjs`

**Interfaces:**
- `emitAchievementEvent(eventId, ctx?): Promise<string[]>`
- `loadAchievementsProgress(): Promise<Record<string, number>>`
- `getCachedUnlocked(): Record<string, number>`
- `subscribeAchievements(listener): () => void`
- `mergeUnlockMap(prev, ids, now): Record<string, number>`
- `achievements-emit.mjs` re-exports a fire-and-forget `emitAchievementEvent` via dynamic import of runtime

- [ ] **Step 1: Write failing unit test**

```javascript
// public/js/achievements-runtime.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeUnlockMap } from './achievements-runtime.mjs';

test('mergeUnlockMap adds new ids with timestamps', () => {
  const next = mergeUnlockMap({ a: 1 }, ['b', 'c'], 1000);
  assert.deepEqual(next, { a: 1, b: 1000, c: 1000 });
});
```

- [ ] **Step 2: Implement runtime + emit wrapper**

```javascript
// public/js/achievements-runtime.mjs
import { matchUnlocks, getAchievementById } from './achievements-engine.mjs';
import { resolveClinicalSessionUserId } from './clinical-session-context.mjs';

const sessionEvents = new Set();
let cachedUnlocked = {};
let loadedForUser = '';
const listeners = new Set();
let toastChain = Promise.resolve();

export function mergeUnlockMap(prev, ids, now = Date.now()) {
  const out = { ...prev };
  for (const id of ids) {
    if (out[id] == null) out[id] = now;
  }
  return out;
}

function api() {
  return typeof window !== 'undefined' ? window.electronAPI : null;
}

function notify() {
  for (const fn of listeners) {
    try { fn(cachedUnlocked); } catch (_e) { void _e; }
  }
}

export function subscribeAchievements(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCachedUnlocked() {
  return { ...cachedUnlocked };
}

export async function loadAchievementsProgress() {
  const userId = resolveClinicalSessionUserId();
  if (!userId) {
    cachedUnlocked = {};
    loadedForUser = '';
    return cachedUnlocked;
  }
  if (loadedForUser === userId) return cachedUnlocked;
  const a = api();
  if (!a?.dbAchievementsGet) return cachedUnlocked;
  try {
    const res = await a.dbAchievementsGet({ userId });
    if (res?.ok && res.achievements?.unlocked) {
      cachedUnlocked = { ...res.achievements.unlocked };
      loadedForUser = userId;
    }
  } catch (_e) { void _e; }
  return cachedUnlocked;
}

function enqueueUnlockToast(ids) {
  for (const id of ids) {
    const def = getAchievementById(id);
    if (!def) continue;
    const msg = `Logro desbloqueado: ${def.title}${def.hint ? ' — ' + def.hint : ''}`;
    toastChain = toastChain.then(() => new Promise((resolve) => {
      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(msg, 'success');
      }
      setTimeout(resolve, 900);
    }));
  }
}

export async function emitAchievementEvent(eventId, ctx = {}) {
  const ev = String(eventId || '');
  if (!ev) return [];
  const userId = resolveClinicalSessionUserId();
  if (!userId) return [];

  sessionEvents.add(ev);
  await loadAchievementsProgress();

  const newly = matchUnlocks({
    unlocked: cachedUnlocked,
    eventId: ev,
    ctx,
    sessionEvents,
  });
  if (!newly.length) return [];

  const now = Date.now();
  cachedUnlocked = mergeUnlockMap(cachedUnlocked, newly, now);
  notify();
  enqueueUnlockToast(newly);

  const a = api();
  if (a?.dbAchievementsUpsert) {
    try {
      await a.dbAchievementsUpsert({ userId, unlocked: cachedUnlocked });
    } catch (_e) { void _e; }
  }
  return newly;
}
```

```javascript
// public/js/achievements-emit.mjs
/** Fire-and-forget emit for feature hooks (dynamic import — no boot edge). */
export function emitAchievementEvent(eventId, ctx = {}) {
  void import('./achievements-runtime.mjs')
    .then((m) => m.emitAchievementEvent(eventId, ctx))
    .catch(() => {});
}
```

Only import `achievements-emit.mjs` from already-lazy feature modules (labs panel, notes, LAN, settings-help). Never from `app.js` / `app-shell.mjs` / `app-runtimes.mjs`.

- [ ] **Step 3: Run unit test**

```bash
npm run test:one -- public/js/achievements-runtime.test.mjs
```

- [ ] **Step 4: Commit**

```bash
git add public/js/achievements-runtime.mjs public/js/achievements-runtime.test.mjs public/js/achievements-emit.mjs
git commit -m "$(cat <<'EOF'
feat(achievements): runtime emit, persist, toast queue

EOF
)"
```

---

### Task 5: Learn Hub Logros shelf + CSS

**Files:**
- Create: `public/js/features/settings-help/learn-hub-achievements.mjs`
- Modify: `public/js/features/settings-help/learn-hub.mjs`
- Modify: `public/styles/modals.css`

**Interfaces:**
- `renderLearnHubLogrosShelfHtml(unlocked): string`

- [ ] **Step 1: Implement shelf module**

```javascript
// public/js/features/settings-help/learn-hub-achievements.mjs
import { escapeHtml } from '../../dom-escape.mjs';
import { buildShelfItems } from '../../achievements-engine.mjs';

export function renderLearnHubLogrosShelfHtml(unlocked = {}) {
  const items = buildShelfItems({ unlocked });
  const done = items.filter((i) => i.unlocked).length;
  const total = items.length;
  const tiles = items.map((item) => {
    const cls = [
      'learn-hub-logro',
      item.unlocked ? 'is-unlocked' : 'is-locked',
      item.secret && !item.unlocked ? 'is-secret' : '',
    ].filter(Boolean).join(' ');
    const title = escapeHtml(item.title);
    const hint = escapeHtml(item.hint || '');
    const tip = item.unlocked || item.secret ? (item.unlocked ? title : '') : hint;
    const mark = item.unlocked ? '◆' : (item.secret ? '?' : '◇');
    return (
      `<div class="${cls}" title="${tip}" role="listitem">` +
      `<span class="learn-hub-logro-mark" aria-hidden="true">${mark}</span>` +
      `<span class="learn-hub-logro-title">${title}</span>` +
      `</div>`
    );
  }).join('');

  return (
    `<section class="learn-hub-logros" aria-label="Logros">` +
    `<div class="learn-hub-logros-head">` +
    `<h3 class="learn-hub-logros-title">Logros</h3>` +
    `<span class="learn-hub-logros-count">${done} / ${total}</span>` +
    `</div>` +
    `<div class="learn-hub-logros-grid" role="list">${tiles}</div>` +
    `</section>`
  );
}
```

- [ ] **Step 2: Wire into `renderLearnHubBody`**

After `renderLearnHubFundamentosTrack(...)`, before footer:

```javascript
parts.push('<div class="learn-hub-logros-host" id="learn-hub-logros-host"></div>');
```

After `host.innerHTML = parts.join('')`:

```javascript
void import('../../achievements-runtime.mjs').then(async (m) => {
  const { renderLearnHubLogrosShelfHtml } = await import('./learn-hub-achievements.mjs');
  const unlocked = await m.loadAchievementsProgress();
  const hostEl = document.getElementById('learn-hub-logros-host');
  if (hostEl) hostEl.innerHTML = renderLearnHubLogrosShelfHtml(unlocked);
  m.subscribeAchievements((u) => {
    const el = document.getElementById('learn-hub-logros-host');
    if (el) el.innerHTML = renderLearnHubLogrosShelfHtml(u);
  });
});
```

Keep `learn-hub.mjs` ≤600 lines; if over budget, move the async fill into `learn-hub-achievements.mjs` as `hydrateLearnHubLogrosShelf()`.

- [ ] **Step 3: CSS**

Add under Learn Hub rules in `public/styles/modals.css` (prefer live token names from neighboring rules):

```css
.learn-hub-logros {
  margin-top: var(--space-4, 1rem);
  padding-top: var(--space-3, 0.75rem);
  border-top: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.08));
}
.learn-hub-logros-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.learn-hub-logros-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}
.learn-hub-logros-count {
  font-size: 0.8rem;
  color: var(--text-muted, #64748b);
}
.learn-hub-logros-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
  gap: 0.5rem;
}
.learn-hub-logro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.55rem 0.4rem;
  border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.1));
  border-radius: var(--radius-md, 8px);
  text-align: center;
  font-size: 0.7rem;
  line-height: 1.25;
}
.learn-hub-logro.is-locked { opacity: 0.55; }
.learn-hub-logro.is-unlocked {
  border-color: var(--accent-muted, #a7f3d0);
  background: var(--surface-success-subtle, #f0fdf4);
}
.learn-hub-logro-mark { font-size: 1.1rem; }
```

- [ ] **Step 4: Build UI**

```bash
npm run build:ui
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/settings-help/learn-hub-achievements.mjs \
  public/js/features/settings-help/learn-hub.mjs public/styles/modals.css
git commit -m "$(cat <<'EOF'
feat(achievements): Logros shelf in Learn Hub

EOF
)"
```

---

### Task 6: Wire success hooks

**Files:**
- Modify: `public/js/features/settings-help/tour-flow-chapter.mjs`
- Modify: `public/js/features/settings-help/tour-flow-lifecycle.mjs` (branch complete)
- Modify: `public/js/features/lab-panel-workbench.mjs`
- Modify: `public/js/features/notes-indicaciones.mjs`
- Modify: `public/js/features/lan/room-membership.mjs`
- Modify: LAN host-start success path (locate via create-room / host toast)
- Modify: tendencias open success path
- Modify: entrega completion success path
- Modify: equipos queue success path (optional if clear)

Use:

```javascript
import { emitAchievementEvent } from '../../achievements-emit.mjs'; // adjust relative depth
emitAchievementEvent('labs.procesar');
```

Or inline dynamic import if static import of emit would pull a cold chunk into a warmer one unexpectedly:

```javascript
void import('../../achievements-runtime.mjs')
  .then((m) => m.emitAchievementEvent('labs.procesar'))
  .catch(() => {});
```

- [ ] **Step 1: Tour chapter / fundamentos / branch**

After `wasNew` in `maybeMarkFundamentosChapterComplete` / guardia marker:

```javascript
emitAchievementEvent('tour.chapter_complete', { chapterId: chapter.id, branch });
emitAchievementEvent('fundamentos.module_complete', { chapterId: chapter.id }); // fundamentos only
```

On tour branch finish in lifecycle:

```javascript
emitAchievementEvent('tour.branch_complete', { branch: guidedTourBranch });
```

- [ ] **Step 2: Labs** — end of successful `finalizeBulkLabPaste`: `emitAchievementEvent('labs.procesar')`

- [ ] **Step 3: Docs** — `generateWord` `onSuccess` → `doc.note_exported`; `generateIndicaciones` `onSuccess` → `doc.indicaciones_exported`

- [ ] **Step 4: LAN** — successful `joinLanRoom` → `lan.joined`; host-ready path → `lan.host_started`

- [ ] **Step 5: Tendencias / entrega / equipos** — emit when the success site is unambiguous; otherwise leave catalog stubs unwired and note in commit message

- [ ] **Step 6: Manual smoke**

1. Aprender R+ → Logros `0 / 24`, secrets as `???`
2. Process SOME → toast Laboratoriazo → shelf updates
3. Re-process → no second toast
4. Complete a guardia chapter → matching tile
5. `npm run metrics:check` passes

- [ ] **Step 7: Commit**

```bash
git add public/js/achievements-emit.mjs \
  public/js/features/settings-help/tour-flow-chapter.mjs \
  public/js/features/settings-help/tour-flow-lifecycle.mjs \
  public/js/features/lab-panel-workbench.mjs \
  public/js/features/notes-indicaciones.mjs \
  public/js/features/lan/room-membership.mjs
# plus any other hook files actually touched
git commit -m "$(cat <<'EOF'
feat(achievements): wire workflow unlock events

EOF
)"
```

---

### Task 7: Docs + context changelog

**Files:**
- Modify: `docs/features/features-index.md`
- Modify: `.cursor/rules/project-context.mdc`

- [ ] **Step 1: Features index**

```markdown
| Logros (achievements) | Event-driven unlocks; Learn Hub shelf + quiet toast; SQLCipher per user | `data/achievements-catalog.mjs`, `public/js/achievements-*.mjs`, `features/settings-help/learn-hub-achievements.mjs`, schema v22 |
```

- [ ] **Step 2: project-context**

Prepend changelog (trim oldest if >20):

```markdown
- **2026-07-19** `achievements`: event catalog + engine, SQLCipher v22 per-user unlocks, Learn Hub Logros shelf + toast; `achievements-*.mjs`, `schema-migrate-v22-achievements.mjs`.
```

Domain index row:

```markdown
| Achievements / Logros | `data/achievements-catalog.mjs`, `public/js/achievements-engine.mjs`, `achievements-runtime.mjs`, `features/settings-help/learn-hub-achievements.mjs`, `lib/db/schema-migrate-v22-achievements.mjs` |
```

- [ ] **Step 3: metrics**

```bash
npm run metrics:check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add docs/features/features-index.md .cursor/rules/project-context.mdc
git commit -m "$(cat <<'EOF'
docs(context): achievements Logros feature map

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Catalog 20+ with secrets | Task 1 |
| Pure engine match / once / when / requireAllInSession | Task 1 |
| Schema v22 table | Task 2 |
| Per clinical user SQLCipher | Task 2–4 |
| IPC get/upsert | Task 3 |
| Quiet toast + queue | Task 4 |
| Learn Hub shelf | Task 5 |
| Event hooks | Task 6 |
| No boot-graph eager imports | Tasks 4–6 |
| Docs + project-context | Task 7 |
| No XP / streaks / LAN vanity | Global constraints |
| Mobile shelf out of scope | Not implemented |

## Self-review notes

- Guardia chapter ids use live `ch-guardia-movil` (not `mobile`).
- `users` INSERT in schema test must match live columns from existing tests.
- Prefer `achievements-emit.mjs` or dynamic import from hooks; never static-import runtime from boot hubs.
- Do not hand-edit `app.bundle.mjs`; run `npm run build:ui` after renderer changes.
