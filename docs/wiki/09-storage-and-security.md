# 9 · Storage & security on the device

> **You'll learn:** where a patient record physically lives, how the database opens at boot, the schema/migration system, the crypto building blocks in the code — and, importantly, **which of them are actually switched on today**.
>
> **Prereqs:** [02](./02-how-the-app-is-built.md) (main vs renderer, IPC)

---

## The short answer

A patient record lives as **JSON inside one SQLite file**:

```
<userData>/rplus-clinical.db        ← the database (+ -wal / -shm side files)
<userData>/rplus-clinical.meta.json ← small plaintext bootstrap info (salts, wrapped keys)
```

`<userData>` is Electron's per-user app folder (macOS: `~/Library/Application Support/R+/`; Windows: `%APPDATA%\R+\`).

The library is **`better-sqlite3-multiple-ciphers`** — SQLite with optional whole-file encryption (the "SQLCipher" the docs talk about). Optional is the key word; see [§ 5](#5-what-is-actually-on-today).

---

## 1. Saving a patient, hop by hop

```
Renderer (patient JSON in memory)
   │ persistClinicalState()  — 400 ms debounce
   ▼
window.electronAPI.dbClinicalSaveAll(...)      preload.js
   │ IPC  'db:clinical-save-all'
   ▼
Main: dbManager.withTransaction(fn)            lib/db/db-manager.mjs
   │  • throws DB_LOCKED unless unlocked
   │  • serialized write queue (one writer at a time)
   │  • same transaction appends an audit hash-chain row
   ▼
clinical_blob row  (namespace, blob_key='patients', json=…)
   inside rplus-clinical.db
```

So the "database" is mostly a **key → JSON blob store** (`clinical_blob`). Blob keys are listed in `lib/db/clinical-blob-keys.mjs`: `patients`, `notes`, `indicaciones`, `labHistory`, `medRecetaByPatient`, `listadoProblemas`, `vpoByPatient`, `todos`, `scheduledProcedures`, …

### Other tables worth knowing

| Table | Holds |
|---|---|
| `app_meta` | key/value: `schema_version`, `kdf_salt`, `wrapped_dek`, `recovery_*`, `admin_access_code_hash` |
| `clinical_blob` | **the patient data** (JSON per key) |
| `forensic_audit_chain` | SHA-256 hash-chained event log — detects tampering, doesn't hide data |
| `users`, `teams`, `team_membership`, `active_guardias`, `rotation_cycles`, `patient_team_assignment` | clinical-ops roster: who's on which team, guardia, assignments |
| `cloud_outbox` | Nube changes not yet sent (survives a crash) |
| `user_activity_log`, `clinical_change_log` | activity bookkeeping |
| `lan_*`, `equipos_*` | legacy LAN host state; equipment-loan queue |

---

## 2. What happens at boot

From `main.js` → `dbManager.ensureUnlocked()` → `ensureUnlockedImpl` (`lib/db/db-manager-auth-unlock-flows.mjs`):

1. `loadNativeDatabase()` — load the compiled native module. Failure = "R+ no pudo iniciar" and quit.
2. **Try a remembered key** (`tryUnlockRememberedImpl`) — only if a `wrapped_dek` was saved earlier (unwrapped with the OS keychain via Electron `safeStorage`).
3. Otherwise **open with no key** (`openDatabaseConnection(ctx)`).
4. On open (`lib/db/db-manager-auth-internals.mjs`): `PRAGMA key` *only if a key exists*, then `journal_mode=WAL`, `foreign_keys=ON`, **run migrations**, probe-read, prune activity log, release archived-team patients (that's the *"Unlock frees team patients"* toast from commit `a899362`).

### Native module rebuilds
`better-sqlite3-multiple-ciphers` is C code compiled for an exact Electron/Node **ABI**. `scripts/rebuild-native-db.mjs` runs on `postinstall` / `prestart` and tries: cached binary → `@electron/rebuild` → fetch a prebuilt one. If `npm start` complains about the DB module, this script is the place to look (`npm run rebuild:db-native`).

---

## 3. Schema & migrations

- `SCHEMA_VERSION = 31` lives in `lib/db/schema-primitives.mjs` (`schema.mjs` just re-exports). Current version is stored in `app_meta.schema_version`.
- `applyMigrations` runs v1–v10 in one transaction, then each later step in its own (`schema-migrate-*.mjs`). Example: v30/v31 widened the `sala` CHECK constraint for UCI/PostQx/Subespecialidad (`schema-migrate-v30-rotacion-sala.mjs`).
- A failed migration closes the DB and raises `DB_SCHEMA_MIGRATION_FAILED`.

**Adding a migration:** bump `SCHEMA_VERSION`, add a `schema-migrate-vNN-*.mjs` step, wire it into the runner. Migrations only run forward — an older app can't open a newer DB.

---

## 4. The crypto toolbox (what exists in code)

| Building block | Where | Plain meaning |
|---|---|---|
| **Argon2** KDF (64 MiB, 3 passes, 4 lanes → 32-byte key) | `lib/db/crypto.mjs` `deriveSqlcipherKeyHex` | turns a passphrase + salt into the DB key; slow on purpose so guessing is expensive |
| **`safeStorage` wrap** | `crypto.mjs` | "Remember me": DB key encrypted by the OS keychain (macOS Keychain / Windows DPAPI) |
| **Recovery code** `R+XXXXXXXX` | `crypto.mjs`, `db-manager-auth-internals.mjs` | AES-256-GCM copy of the DB key, unlockable with a one-time code |
| **Legacy recovery `r+123`** | `crypto.mjs` `LEGACY_RECOVERY_CODE` | still accepted for `recovery_version < 2` |
| **Rate limit** | 5 failures / 15 min | slows passphrase guessing |
| **Admin code** | `lib/admin-access-code.mjs` | ≥ 6 chars, stored as `scrypt$salt$hash`, constant-time compare; gates promoting someone to program admin |
| **Admin rescue key** (ECDH P-256) | `lib/admin-rescue-key.mjs` | lets an admin recover Nube room keys ([10](./10-nube-sync.md)) |
| **Forensic hash chain** | `lib/db/forensic-audit.mjs` | each event includes the previous hash; editing history breaks the chain |
| **Signed renderer bundle** (ECDSA P-256) | `packages/shared-signing`, `module-update-pubkey.pem` | the UI code that reads patient data must be the code you shipped ([11](./11-releases-and-updates.md)) |

Renderer isolation (`contextIsolation: true`, `nodeIntegration: false`) means the UI can only reach the DB through the whitelisted `db:*` IPC channels.

---

## 5. What is actually on today

> ⚠️ **This section is the most important thing on the page.** It was verified in the code at v8.4.9, and it disagrees with `docs/core/15-security.md` and `docs/db-encryption.md`.

**The local database is currently opened without an encryption key.**

- `ensureUnlockedImpl` falls through to `openDatabaseConnection(ctx)` with no `keyHex`, and `PRAGMA key` is only issued `if (keyHex)`. A fresh install therefore creates an **ordinary, unencrypted SQLite file**.
- The unit test says so in its title: `lib/db/db-manager.test.mjs` → *"ensureUnlocked opens db without passphrase (encryption deferred)"*.
- The UI agrees: `openChangeMasterPasswordModal()` is an empty stub — *"Master password removed — DB unlocks automatically on this device"* (`public/js/features/db-unlock-change-pass.mjs`).
- So Argon2, the recovery code and `wrapped_dek` are **dormant code** — present, tested, unreachable from the UI.

| Protection layer | Designed | Running today |
|---|---|---|
| OS account / disk encryption (FileVault, BitLocker) | ✅ | ✅ (if the user turned it on) |
| DB file encryption (Argon2 → key) | ✅ | ❌ no key is set |
| Recovery code wrap | ✅ | ❌ |
| Forensic hash chain | ✅ | ✅ |
| Signed renderer bundle | ✅ | ✅ |

### Knock-on effects
- **"Exportar copia cifrada"** (`db:backup-export-db`) uses `VACUUM INTO`, which copies the DB *as it is* — so today the "encrypted copy" is **unencrypted**, despite the dialog title.
- `users.encrypted_private_key` stores a **plaintext** RSA PEM (`lib/db/clinical-access-users.mjs`) — the column name is aspirational.
- `cloud-sync-remember.json` in `userData` holds the Nube bearer token and room keys (file mode 0600).

### ⚠️ An edge case to look at
In `ensureUnlockedImpl`, if (a) the DB file exists, (b) the meta file has a `kdf_salt` (i.e. it was **encrypted by an older version**), (c) there's no remembered key, and (d) opening without a key fails with *"file is not a database"* — the code **deletes the DB and meta file and creates a fresh empty one**:

```js
lockDb(ctx);
removeClinicalDbFiles(deps.userDataPath);
removeUnlockMetaFile(deps.userDataPath);
await openDatabaseConnection(ctx);
```

This runs at startup, before any passphrase prompt could appear. It may be intentional (Nube repopulates ward patients; the old key is unrecoverable anyway), but for an **offline-only** user on an old encrypted install, local-only data would be gone. The shallow git history in this checkout doesn't show why it was added — worth a deliberate decision in `docs/core/18-knowledge-capture.md` either way.

---

## Glossary for this page

- **SQLite** — a whole database in one file.
- **SQLCipher / SQLite3MultipleCiphers** — SQLite add-ons that encrypt the whole file; without the key it reads as noise.
- **`PRAGMA key` / `rekey`** — SQL commands to supply / change that key.
- **KDF** — key-derivation function: password → fixed-size key. **Argon2** (here), **scrypt** (admin code), **PBKDF2** (Nube).
- **Salt** — random, non-secret bytes mixed into a KDF so equal passwords give different keys.
- **DEK** — data-encryption key, the key that actually encrypts data. **Wrapping** = encrypting a key with another key.
- **AES-256-GCM** — standard symmetric cipher with built-in tamper detection.
- **WAL** — SQLite's write-ahead log side file (`-wal`).
- **ABI** — the binary interface a native module is compiled against; must match Electron's.
- **PHI** — protected health information.

## Check yourself

1. Where would you look to see every blob key the app stores?
2. A user says "my DB backup is encrypted, right?" — what's the honest answer today?
3. You need a new column on `patients`. Which constant changes?

<details><summary>Answers</summary>

1. `lib/db/clinical-blob-keys.mjs`.
2. No — `VACUUM INTO` copies the live DB, which has no key. Rely on disk encryption.
3. `SCHEMA_VERSION` in `lib/db/schema-primitives.mjs`, plus a new migration step.
</details>

**Next:** [10 · Nube cloud sync →](./10-nube-sync.md)
