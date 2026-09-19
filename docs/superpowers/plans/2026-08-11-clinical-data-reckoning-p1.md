# P1 Canonical Clinical Store — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.


**Status:** Completed (2026-08-11) — tip `d44d702e` on `feat/p1-clinical-repo`.
**Completion note:** Schema implemented as **v23** (not v16). Persist-repo tests are source-characterization (ESM mock limits). Flag remains default off; sync still via `scheduleCloudSyncPush` until P2.

**Goal:** Make eventualidades writes go through typed `clinical-repo` commands that commit SQLCipher first (behind a flag), appending `clinical_change_log` for P2, without breaking Nube sync.

**Architecture:** Pure transforms update the `patients` clinical blob in memory; SQLCipher adapter persists atomically; change log records the commit; renderer IPC client calls `db:clinical-command`. Flag off = today’s `saveState` path. Flag on = repo write + update in-memory patient + keep `scheduleCloudSyncPush()` until P2 (no sync regression).

**Tech Stack:** Electron + SQLCipher (`better-sqlite3-multiple-ciphers`), ESM `lib/clinical-repo/`, IPC via `preload.js`, `node --test` via `npm run test:one`.

**Spec:** `docs/superpowers/specs/2026-08-11-p1-canonical-clinical-store-design.md`  
**Note:** Spec said schema v16; repo is already at **v22** → implement as **v23**.

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/db/schema-primitives.mjs` | `SCHEMA_VERSION = 23` |
| `lib/db/schema-migrate-v23-clinical-change-log.mjs` | Create `clinical_change_log` |
| `lib/db/schema-migrate-v15-v17.mjs` | Call v23 after v22 |
| `lib/db/schema.mjs` | Re-export migrate |
| `lib/db/schema-v23-clinical-change-log.test.mjs` | Migration tests |
| `lib/clinical-repo/transforms/eventualidades.mjs` | Pure patients-blob transforms |
| `lib/clinical-repo/transforms/eventualidades.test.mjs` | Pure transform tests |
| `lib/clinical-repo/adapters/sqlcipher.mjs` | get/set patients blob |
| `lib/clinical-repo/adapters/memory.mjs` | In-memory adapter for tests |
| `lib/clinical-repo/change-log.mjs` | Append change log rows |
| `lib/clinical-repo/commands/eventualidades.mjs` | Command handlers |
| `lib/clinical-repo/commands/eventualidades.test.mjs` | SQLCipher integration |
| `lib/clinical-repo/index.mjs` | `executeClinicalCommand` dispatcher |
| `lib/db/ipc-handlers-register-clinical-repo.mjs` | `db:clinical-command` |
| `lib/db/ipc-handlers.mjs` | Register new handlers |
| `preload.js` | `dbClinicalCommand` |
| `public/js/clinical-repo-client.mjs` | Renderer IPC wrapper |
| `public/js/clinical-repo-flag.mjs` | Flag read/write |
| `public/js/features/eventualidades-render.mjs` | Flag-on persist path |
| `public/js/features/eventualidades-store.test.mjs` | Flag on/off coverage (extend) |
| `package.json` `scripts.test` | Register new test paths |

---

### Task 1: Schema v23 — `clinical_change_log`

**Files:**
- Create: `lib/db/schema-migrate-v23-clinical-change-log.mjs`
- Create: `lib/db/schema-v23-clinical-change-log.test.mjs`
- Modify: `lib/db/schema-primitives.mjs` (`SCHEMA_VERSION = 23`)
- Modify: `lib/db/schema-migrate-v15-v17.mjs` (invoke after v22)
- Modify: `lib/db/schema.mjs` (re-export)
- Modify: `package.json` (add test path to `scripts.test`)
- Modify: any test that hardcodes `SCHEMA_VERSION === 22` (e.g. `schema-v20-equipos-push.test.mjs`, `schema-v21-clinical-sala-check.test.mjs`, `schema-v22-user-activity-log.test.mjs`)

- [ ] **Step 1: Write failing migration test**

```js
// lib/db/schema-v23-clinical-change-log.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

describe('schema v23 clinical_change_log', () => {
  it('creates clinical_change_log and bumps SCHEMA_VERSION to 23', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 23);
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(Number(v.value), 23);
    const cols = db.prepare('PRAGMA table_info(clinical_change_log)').all().map((c) => c.name);
    for (const name of [
      'id', 'change_id', 'command_type', 'blob_keys', 'patient_id', 'actor_id', 'created_at', 'synced_at',
    ]) {
      assert.ok(cols.includes(name), `missing column ${name}`);
    }
    db.close();
  });
});
```

- [ ] **Step 2: Run test — expect fail** (`SCHEMA_VERSION` still 22)

```bash
npm run test:one -- lib/db/schema-v23-clinical-change-log.test.mjs
```

- [ ] **Step 3: Implement migration**

```js
// lib/db/schema-migrate-v23-clinical-change-log.mjs
export function migrateToV23ClinicalChangeLog(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clinical_change_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      change_id TEXT NOT NULL UNIQUE,
      command_type TEXT NOT NULL,
      blob_keys TEXT NOT NULL,
      patient_id TEXT,
      actor_id TEXT,
      created_at TEXT NOT NULL,
      synced_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_clinical_change_log_unsynced
      ON clinical_change_log(synced_at, id);
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '23');
}
```

Wire: `SCHEMA_VERSION = 23`; after v22 block in `schema-migrate-v15-v17.mjs`:

```js
if (readSchemaVersion(db) < 23) {
  db.transaction(() => migrateToV23ClinicalChangeLog(db))();
}
```

Update hardcoded `assert.equal(SCHEMA_VERSION, 22)` → `23` in existing schema version tests.

Register new test in `package.json` `scripts.test` (alphabetical near other `schema-v2*`).

- [ ] **Step 4: Run tests**

```bash
npm run test:one -- lib/db/schema-v23-clinical-change-log.test.mjs lib/db/schema.test.mjs lib/db/schema-v22-user-activity-log.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema-primitives.mjs lib/db/schema-migrate-v23-clinical-change-log.mjs \
  lib/db/schema-migrate-v15-v17.mjs lib/db/schema.mjs \
  lib/db/schema-v23-clinical-change-log.test.mjs package.json \
  lib/db/schema-v20-equipos-push.test.mjs lib/db/schema-v21-clinical-sala-check.test.mjs \
  lib/db/schema-v22-user-activity-log.test.mjs
git commit -m "$(cat <<'EOF'
feat(db): schema v23 clinical_change_log for clinical-repo

EOF
)"
```

---

### Task 2: Pure eventualidades transforms (patients blob)

**Files:**
- Create: `lib/clinical-repo/transforms/eventualidades.mjs`
- Create: `lib/clinical-repo/transforms/eventualidades.test.mjs`
- Modify: `package.json` (register test)

Reuse existing pure helpers from `public/js/features/eventualidades-store.mjs` (`appendEventualidad`, `updateEventualidad`, `removeEventualidad`, `setEventualidadesLabsText`, `mergeEventualidadesLabsText`) by importing them into `lib/` (that path already imports `lib/clinical-text.mjs` — verify no `window` usage in the store functions used). If bundling/`window` blocks Node import, **duplicate minimal pure logic** in `lib/clinical-repo/transforms/` instead of pulling renderer code — prefer import if clean.

- [ ] **Step 1: Write failing tests** for:
  - `applyEventualidadUpsert(patientsArr, { patientId, entry })` → patient.eventualidades updated
  - `applyEventualidadDelete(patientsArr, { patientId, entryId })` → entry removed + deletedIds
  - `applyEventualidadesLabsSet` / `applyEventualidadesLabsMerge`
  - unknown patientId → returns `{ ok: false, error: 'patient_not_found' }` shape used by commands

- [ ] **Step 2: Run — expect fail**

```bash
npm run test:one -- lib/clinical-repo/transforms/eventualidades.test.mjs
```

- [ ] **Step 3: Implement transforms** — pure only; no DB. Operate on parsed `patients` array; return `{ ok, patients, store? }` or throw-free error object.

- [ ] **Step 4: Tests pass + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(clinical-repo): pure eventualidades transforms on patients blob

EOF
)"
```

---

### Task 3: Repo core — adapters, change-log, dispatcher, commands

**Files:**
- Create: `lib/clinical-repo/adapters/sqlcipher.mjs`
- Create: `lib/clinical-repo/adapters/memory.mjs`
- Create: `lib/clinical-repo/change-log.mjs`
- Create: `lib/clinical-repo/commands/eventualidades.mjs`
- Create: `lib/clinical-repo/commands/eventualidades.test.mjs`
- Create: `lib/clinical-repo/index.mjs`
- Modify: `package.json`

**Command types (exhaustive switch):**
- `eventualidad.upsert` — `{ type, patientId, entry }` where entry has `text`, optional `at`, `kind`, `transfusionProduct`, optional `id` for update
- `eventualidad.delete` — `{ type, patientId, entryId }`
- `eventualidades.labs.set` — `{ type, patientId, text }`
- `eventualidades.labs.merge` — `{ type, patientId, text }`

**Return:** `{ ok, error?, changedKeys?: ['patients'], changeId?, patients? }`

**Rules:**
- One transaction: load patients blob → transform → upsertBlob → append change_log
- `meta.actorId`, `meta.source` (`'ui' | 'sync-apply' | 'import'`)
- `change_id` = crypto random UUID / `chg_` + random
- Memory adapter for unit tests without SQLCipher when useful; primary integration test uses `createUnlockedDbManager` or `:memory:` + `applyMigrations` like other db tests

- [ ] **Step 1: Failing command integration test** — upsert eventualidad → blob contains entry + change_log row with `synced_at` null

- [ ] **Step 2: Implement adapters + change-log + commands + `executeClinicalCommand`**

- [ ] **Step 3: Tests pass**

```bash
npm run test:one -- lib/clinical-repo/commands/eventualidades.test.mjs lib/clinical-repo/transforms/eventualidades.test.mjs
```

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(clinical-repo): executeClinicalCommand for eventualidades slice

EOF
)"
```

---

### Task 4: IPC + preload + renderer client

**Files:**
- Create: `lib/db/ipc-handlers-register-clinical-repo.mjs`
- Modify: `lib/db/ipc-handlers.mjs`
- Modify: `preload.js` — add `dbClinicalCommand(payload)`
- Create: `public/js/clinical-repo-client.mjs`
- Create: `public/js/clinical-repo-client.test.mjs` (mock electronAPI)
- Optionally extend: `lib/db/ipc-handlers.test.mjs` with one happy-path invoke if harness is cheap
- Modify: `package.json`

**IPC:**
- Channel `db:clinical-command` → `{ command, meta? }` → `{ ok, error?, changedKeys?, changeId? }`
- Require unlocked DB; reuse forensic audit pattern from other clinical handlers if a single-line audit exists (`clinical.command` event) — do not invent a large audit subsystem

- [ ] **Step 1: Failing client test** — `executeClinicalCommand` calls `window.electronAPI.dbClinicalCommand`

- [ ] **Step 2: Implement register + preload + client**

- [ ] **Step 3: Tests pass + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(clinical-repo): IPC db:clinical-command + renderer client

EOF
)"
```

---

### Task 5: Feature flag `clinicalRepo.eventualidades`

**Files:**
- Create: `public/js/clinical-repo-flag.mjs`
- Create: `public/js/clinical-repo-flag.test.mjs`
- Modify: `package.json`

**Behavior:**
- Default **off**
- Read order: `process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES === '1'` (main/tests) OR `localStorage` key `rpc-clinical-repo-eventualidades` === `'1'` OR settings blob if trivial; keep it simple — **localStorage + optional env** is enough for P1
- Export `isClinicalRepoEventualidadesEnabled()` and `setClinicalRepoEventualidadesEnabled(bool)` for tests

- [ ] **Step 1–4:** TDD flag module, commit

```bash
git commit -m "$(cat <<'EOF'
feat(clinical-repo): flag clinicalRepo.eventualidades (default off)

EOF
)"
```

---

### Task 6: Wire eventualidades persist path

**Files:**
- Modify: `public/js/features/eventualidades-render.mjs` (`persistEventualidades` and/or `savePatientEventualidad` / labs saves)
- Modify: `public/js/features/eventualidades-store.test.mjs` and/or new `eventualidades-persist-repo.test.mjs`
- Modify: `package.json` if new test file

**Flag off:** unchanged — `saveState({ immediate: true })` + `scheduleCloudSyncPush()`.

**Flag on:**
1. Call `clinical-repo-client` with appropriate command
2. On `ok`, set `patient.eventualidades` from result or local transform (UI must update)
3. **Do not** call `saveState` (assert via spy in test)
4. Still call `scheduleCloudSyncPush()` so Nube keeps working until P2
5. Keep tendencias refresh + session activity touch

Web client without IPC: if `!electronAPI.dbClinicalCommand`, fall back to legacy path even if flag on.

- [ ] **Step 1: Failing test** — flag on + mock `dbClinicalCommand` → no `saveState` call; command invoked

- [ ] **Step 2: Implement wire**

- [ ] **Step 3: Also run existing eventualidades tests**

```bash
npm run test:one -- public/js/features/eventualidades-store.test.mjs public/js/features/eventualidades-panel.test.mjs public/js/clinical-repo-flag.test.mjs public/js/clinical-repo-client.test.mjs
```

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(eventualidades): optional clinical-repo write path behind flag

EOF
)"
```

---

### Task 7: Docs + metrics gate

**Files:**
- Modify: `.cursor/rules/project-context.mdc` changelog (schema v23 + clinical-repo)
- Modify: `docs/superpowers/specs/2026-08-11-p1-canonical-clinical-store-design.md` — note v23 (not v16); mark goals in progress
- Run: `npm run metrics:check` (or `lint:tier1` on touched paths if full metrics slow)

- [ ] **Step 1:** Update project-context changelog entry for P1 start
- [ ] **Step 2:** Fix any Tier-1 budget issues on new files
- [ ] **Step 3:** Commit

```bash
git commit -m "$(cat <<'EOF'
docs(context): P1 clinical-repo + schema v23 changelog

EOF
)"
```

---

### Task 8: P1 acceptance smoke

- [ ] Run full P1 test set:

```bash
npm run test:one -- \
  lib/db/schema-v23-clinical-change-log.test.mjs \
  lib/clinical-repo/transforms/eventualidades.test.mjs \
  lib/clinical-repo/commands/eventualidades.test.mjs \
  public/js/clinical-repo-flag.test.mjs \
  public/js/clinical-repo-client.test.mjs \
  public/js/features/eventualidades-store.test.mjs
```

- [ ] Confirm acceptance mentally:
  1. Flag on → blob+change_log before toast path (unit-proven)
  2. Flag off → legacy
  3. Sync still via `scheduleCloudSyncPush`
  4. Metrics clean

- [ ] Final commit only if leftover fixes; otherwise stop for controller review

---

## Out of scope (do not do in P1)

- Removing `scheduleCloudSyncPush` / mutate-bridge (P2)
- Migrating census/labs/notes
- Removing `app-state`
- Worker changes
- Defaulting flag on
