# Keep local storage small and the census safe

## Goal

Stop the desktop app from hitting the localStorage 10 MB ceiling, without putting clinical data at risk.

## What the code says today (verified)

- Desktop with DB unlocked: the 12 clinical keys go to SQLCipher (`clinical_blob`, one row per key, transactional). `storage-core.mjs:50 skipClinicalLocalPersist()` blocks all clinical writes to localStorage. Zero unguarded clinical writes found.
- iPad/PWA: memory only (audit M2). No local persistence by design.
- So "move clinical data to IndexedDB" is the wrong fix in all three modes. IndexedDB is plaintext on disk; SQLCipher is encrypted. Moving PHI from SQLCipher to IndexedDB would be a security regression and wasted work.

What fills localStorage instead (the likely 11 MB):

1. Dead legacy copies of the 12 `rpc-*` clinical keys. `lib/db/migration-probe.mjs:141-144` only returns `clearKeys` when the migration actually ran (`clinical_blob` count was 0). Any install where the DB already had rows keeps the old keys forever. Worse: `storage-core.mjs:98-102` reads those stale keys whenever `_blobCache` is null (DB locked, hydrate failed). That is a correctness hazard, not only a size problem.
2. `rpc-preimport-backup` — a full clinical snapshot written on every full-backup import (`import-handlers.mjs:155`), never deleted (`preimport.mjs` has no `removeItem`). Single key, can be many MB.
3. `rpc-undo-stack` — already moved to IndexedDB with a one-time LS clear (`productivity.mjs:134-153`). Good precedent.
4. `rpc-cloud-sync-echo-index` / `lab-fp-index` — already moved to IndexedDB in 8.3.8 prep.
5. Small and bounded, ignore: `rpc-audit-log` (capped 200, `audit.mjs:77`), `rpc-cloud-sala-rooms` (tiny map), `rpc-auto-backup-index` (metadata only, capped 14), ~40 prefs. No cloud outbox in localStorage (`cloud-push-direct.mjs:200`).

One more defect: `storage-save-all.mjs:91-96` runs `estimateRpcPersistBytes` (JSON.stringify of the whole census into a Blob) on every save, then compares it against `navigator.storage.estimate()`. That quota is the origin quota (gigabytes in Chromium), not the 10 MB localStorage ceiling. The warn/block never trips, and the CPU is wasted on the SQLCipher path.

Note: the 11 MB on disk is leveldb (`Local Storage/`) which keeps old log/ldb files until compaction. Live bytes may be less. Measure live before deciding anything else.

## Constraints

- Medical data: no stage may delete a copy unless SQLCipher is confirmed the source of truth for that install.
- Nube/cloud-sync is closed. Do not touch it.
- Web/PWA stays memory-only. Do not add IndexedDB there.
- No new dependency. Reuse the IndexedDB helpers already in `productivity.mjs`.
- Colocated tests + `test:one` in the same turn. `build:ui` after renderer edits. Verify live in the running app.

## Chosen approach

Keep SQLCipher as the clinical store. Make localStorage prefs-only on desktop: sweep dead clinical copies after every successful unlock, move the one remaining bulk blob (pre-import backup) to IndexedDB, cut the useless quota estimate, and add one loud warning so a full localStorage is never silent again (MISTAKES.md 2026-08-29).

Rejected: full IndexedDB migration of clinical blobs. Reason: the data is already durable and encrypted in SQLCipher; IDB would only add a plaintext copy and a second write path.

## Stages

### Stage 0 — Measure in the running app (no code)

DevTools on the `npm start` Electron process:

```js
JSON.stringify(localStorage).length
Object.entries(localStorage).map(([k,v])=>[k,v.length]).sort((a,b)=>b[1]-a[1]).slice(0,15)
!!window.electronAPI?.dbClinicalLoadAll
await window.electronAPI.dbStatus()
```

Branch point:
- Top keys are `rpc-patients`/`rpc-notes`/`rpc-labHistory`/`rpc-preimport-backup` and `dbStatus` is `unlocked` → expected case. Run Stages 1-4.
- Clinical keys are large AND their content is newer than the SQLCipher copy (patient count in LS > patient count in app) → stop. That is a hydrate/unlock bug, not a storage move. Hand to senior-dev with the numbers.
- Neither → the 11 MB is leveldb slack. Still run Stages 3-4; skip 1-2 unless keys are present.

Also before Stage 1 ships: export a full backup (Ajustes → Exportar respaldo). This is the rollback for every stage below.

### Stage 1 — Sweep dead clinical copies after unlock

Change: add `sweepLegacyClinicalLocalStorage()` to `public/js/features/db-unlock-migration.mjs` (it already owns `CLINICAL_LS_KEYS` and `clearMigratedLocalStorageKeys`). Call it at the end of `applyClinicalDbUnlockCompletion()` in `db-unlock-completion.mjs`, after `hydrateAppStateFromDb()`.

Safety guard, must all be true or the sweep does nothing and logs a warning:
- `getBlobCache()` is non-null (hydrate from SQLCipher succeeded).
- SQLCipher `patients` has ≥ 1 row, OR the localStorage `rpc-patients` copy is empty.

Verify: new colocated `db-unlock-migration.test.mjs` (3 cases: clears when DB has patients; refuses when DB empty and LS has patients; no-op when no keys). Add to `package.json scripts.test`. Update `db-unlock-completion.test.mjs`. `test:one` both. Live: unlock, DevTools shows the 12 keys gone, patient count unchanged, close/reopen app once, count still unchanged.

Risk: deleting the only copy. Mitigated by the guard plus the exported backup and the existing `clinical-localStorage-export.migrated.backup.json` in userData (present only if migration ran there).
Rollback: revert one commit; keys are not regenerated, restore from exported backup if ever needed.

### Stage 2 — Pre-import backup to IndexedDB

Change: extract `openDb/idbGet/idbPut/idbDelete` from `productivity.mjs:81-132` into `public/js/idb-kv.mjs` (~35 lines, parametrised by db name + store). `productivity.mjs` imports it (net deletion). `import-handlers.mjs:155` and `preimport.mjs:13,33` store the pre-import payload under key `preimport` in the same `rplus-undo` database, and remove any leftover `rpc-preimport-backup` from localStorage once on first read (same one-time pattern as `migrateLegacyUndoStackOnce`). `syncPreimportBackupUi` becomes async; check its callers.

Not a security change: today the same payload sits plaintext in leveldb; the undo stack (5 full census copies) already sits in IndexedDB.

Verify: update `preimport.test.mjs`, `import-handlers-quota.test.mjs` (now asserts IDB write path, not LS warn), `productivity-confirm.test.mjs`. Live: import a synthetic backup, "Restaurar copia previa a importación" still appears and restores; localStorage has no `rpc-preimport-backup`.

Risk: async read changes UI timing on the Ajustes panel. Low.
Rollback: revert commit; old LS key is gone but the feature only matters after the next import, which rewrites it.

### Stage 3 — Cut the useless quota estimate on the SQLCipher path

Change in `public/js/storage/storage-save-all.mjs`: compute `pending`/`level` only when `!isDbMode()`. In DB mode go straight to `persistSaveAllToDb(dbFields, 'ok')`. Two to four lines removed, no new code.

Verify: `storage.legacy.test.mjs` and `storage-prefs-only.test.mjs` via `test:one`. Live: save a note, confirm persisted after restart.

Risk: none for data; it only removes a check that could never trip in DB mode.

### Stage 4 — Never silent again

Change: `warnIfLocalStorageNearFull()` in `public/js/storage-quota.mjs` (measure `JSON.stringify(localStorage).length * 2` against 8 MB; `console.warn` + one Spanish toast per session: "Almacenamiento local casi lleno. Exporta un respaldo y avisa a soporte."). Call once from `bootHydrateFromDb()` in `app-state.mjs`.

Verify: colocated test on the threshold function. Live: seed a 9 MB dummy key in DevTools, reload, toast appears; remove it, reload, no toast.

Risk: none.

Optional later, not now: `rplus.labVerifyCache.v1` grows per patient with no cap. Small today. Cap to 500 entries if Stage 0 shows it in the top 15.

## Task list

Lead (Sonnet):
1. Stage 0 measurement (computer-use on running R+, or paste the four DevTools lines). Record numbers in the handoff row. Decide branch.
2. Stage 1 sweep + guard + tests.
3. Stage 2 `idb-kv.mjs` extraction and pre-import move.
4. Stage 3 and Stage 4.
5. One commit per stage. `build:ui` after each. Live check after each. Update `docs/core/20-claude-code-handoff.md` row the same turn.

Dev (Haiku), spawned by Lead:
- Find all callers of `syncPreimportBackupUi` and `restorePreimportBackupPrompt`; report whether they can await.
- Add new test files to `package.json scripts.test`; run `test:one` on each touched test; report failures verbatim.
- Grep for any other `localStorage.setItem` whose value is `buildFullBackupPayload()` or a whole clinical getter; report paths.

## Files to touch (smallest set)

- `/Users/mauriciosalas/R+/public/js/features/db-unlock-migration.mjs` (+ new `.test.mjs`)
- `/Users/mauriciosalas/R+/public/js/features/db-unlock-completion.mjs` (+ existing test)
- `/Users/mauriciosalas/R+/public/js/idb-kv.mjs` (new, ~35 lines)
- `/Users/mauriciosalas/R+/public/js/features/productivity.mjs` (deletion, use idb-kv)
- `/Users/mauriciosalas/R+/public/js/features/platform/import-backup/preimport.mjs` (+ test)
- `/Users/mauriciosalas/R+/public/js/features/platform/import-backup/import-handlers.mjs` (+ `import-handlers-quota.test.mjs`)
- `/Users/mauriciosalas/R+/public/js/storage/storage-save-all.mjs`
- `/Users/mauriciosalas/R+/public/js/storage-quota.mjs` (+ test)
- `/Users/mauriciosalas/R+/public/js/app-state.mjs` (one call)
- `/Users/mauriciosalas/R+/package.json` (scripts.test entries)
- `/Users/mauriciosalas/R+/docs/core/20-claude-code-handoff.md` (row)

Do not touch: `lib/db/*` (no schema change), `public/js/features/cloud-sync/*`, `storage-core.mjs`, anything under `public/interno/`.

## Owner decision

2026-09-16: Owner picked plan A (this plan) over a full IndexedDB migration of clinical data. Rejected B because clinical data is already safe and encrypted in SQLCipher; IndexedDB is plaintext, so moving PHI there would be a security regression.

Side note, out of scope: `clinical-localStorage-export.migrated.backup.json` in `~/Library/Application Support/r-plus/` is a plaintext PHI export left by the old migration. Consider deleting it by hand after Stage 1 is verified.
