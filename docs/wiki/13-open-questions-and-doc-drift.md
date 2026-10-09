# 13 · Open questions & doc drift

> Writing this wiki meant reading the code against the existing docs. This page records **what didn't line up**. Each item says how sure it is: **verified** means someone read the code at v8.4.9 (`291a02b`). **Reported** means a research pass found it and nobody has double-checked it yet.
>
> Treat this as a to-do list. When you fix something, delete its row.

---

## A. Questions that need a decision

| # | Finding | Status | Why it matters | Where |
|---|---|---|---|---|
| A1 | **The local DB has no encryption key.** `ensureUnlockedImpl` opens it with no `keyHex`, and `PRAGMA key` is only sent when a key exists. The unit test title says *"encryption deferred"*. | verified | `15-security.md` ("Argon2id + SQLCipher. Strong at-rest"), `db-encryption.md` and the vision's "offline device unlock (local SQLCipher only)" all describe protection that isn't running. Patient data on disk is protected only by the OS account and disk encryption. | `lib/db/db-manager-auth-unlock-flows.mjs`, `db-manager-auth-internals.mjs` |
| A2 | **An old encrypted DB gets wiped at boot.** If a DB exists, the meta file has `kdf_salt`, no key is remembered, and the open fails with "not a database", the code deletes the DB and meta file and creates a new empty DB. | verified | Patients sync back from Nube, but an offline-only user's local data would be lost without any prompt. The intent isn't recorded anywhere I could find. | `ensureUnlockedImpl` |
| A3 | **"Exportar copia cifrada" is not encrypted.** It uses `VACUUM INTO`, which copies the live DB as-is, and the live DB has no key (A1). | verified | The dialog promises an encrypted copy, so users may trust the backup more than they should. | `lib/db/ipc-handlers-register-core.mjs` (`db:backup-export-db`) |
| A4 | **`users.encrypted_private_key` holds a plaintext RSA PEM.** | verified | The column name is misleading. | `lib/db/clinical-access-users.mjs` |
| A5 | **Any room member can set the room's first DEK, not only the owner.** `handlePutRoomDek` checks membership only, but the client comment says a non-owner "would 403". The key is write-once, so the first member to set it wins. | verified | A member can claim the room key before the owner does. The comment and the server should agree either way. | `cloud/sync-worker/src/room-dek.js`, `features/cloud-sync/room-dek-migrate.mjs` |
| A6 | **The legacy recovery code `r+123` is still accepted** for `recovery_version < 2`. | verified | It's a universal code. It doesn't matter today because nothing is encrypted (A1), but it would if encryption came back. | `lib/db/crypto.mjs` |
| A7 | **`db:admin-code-verify` has no rate limit**, unlike passphrase unlock (5 tries per 15 min). | reported | Someone with local access can brute-force the admin code. | `lib/db/ipc-handlers-register-profile.mjs` |
| A8 | **It's unclear how Interno phones decrypt content.** Phones get `HKDF(DEK, "rplus-interno-v1")`, but `encryptOpsForPush` uses the full DEK, and no code was found that encrypts anything with the subkey. | reported — unclear | The board may only show plaintext fields (name, bed, service), or a code path was missed. | `features/cloud-sync/crypto.mjs`, `interno-crypto-board.mjs` |
| A9 | **`checkForModuleUpdate` is exposed in preload but no UI source calls it.** | verified (non-bundled sources) | Live module updates may be dormant code. | `packages/im/preload.js`, `lib/module-update-fetch.mjs` |

---

## B. Docs that disagree with the code

| Doc | What's stale | Correct (per code) |
|---|---|---|
| `docs/core/04-directory-structure.md` | Lists `lan-squad/`. Doesn't mention `packages/` or the symlinks. Links `19-agent-graph-memory.md`, which is gitignored and missing. | `lan-squad/` was removed in 8.0.5. The code lives in `packages/{core,im,shared-signing}`. |
| `docs/core/08-core-architecture.md` | "Main = `main.js`". No mention of `packages/im` or signed module updates. | [02](./02-how-the-app-is-built.md), [11](./11-releases-and-updates.md) |
| `docs/core/21-code-map.md` | Says `cloud/` holds "equipos-worker, equipos-pages", and that document export goes through `lib/doc-export-http.js`. | `cloud/` holds `sync-worker`, `equipos-worker`, `update-worker` and `landing`. Desktop export goes through `doc-export-service.js` over IPC. |
| `docs/core/03-user-journey.md` | The turn-sync section describes the LiveSync host and *PIN del turno*. | Nube monthly rooms with a join code ([10](./10-nube-sync.md)). |
| `docs/core/15-security.md` | "Strong at-rest" and "device unlock is required". Cites `lib/db/audit-hooks.mjs` and `lib/clinical-safety-rules/`, which don't exist. | See A1. |
| `docs/db-encryption.md` | The `.db` backup "permanece cifrada" (stays encrypted). | See A3. |
| `docs/database/database-index.md` | Schema "v22". Cites `audit-hooks.mjs` and `host-store.js`, which don't exist. Omits `cloud_outbox`, `clinical_change_log` and `equipos_*`. | `SCHEMA_VERSION = 31` in `schema-primitives.mjs` ([09](./09-storage-and-security.md)) |
| `cloud/sync-worker/README.md` | "HTTP push/pull only (no WebSockets)", "plaintext JSON… not E2EE", "new writes are plaintext". | The Durable Object WebSocket hub exists, the server encrypts at rest with `WORKER_DATA_KEY`, and clients encrypt content end to end ([10](./10-nube-sync.md)). |
| `docs/core/18-knowledge-capture.md`, row 2026-08-14 | "Nube V1 crypto is accepted: D1 holds plaintext JSON… Not E2EE." | Superseded by client E2EE for content in 8.2.8 and for registro/diagnoses in 8.4.0. The row should be struck through like the older superseded ones. |
| `docs/core/16-glossary-of-terms.md` | Only 9 terms, marked in-progress. | [12 · Glossary](./12-glossary.md) |
| `.dependency-cruiser.cjs` | `lan` rules point at folders that no longer exist. | Delete them or replace them with `forbid-lan-imports.mjs`. |
| `features/cloud-sync/crypto.mjs` comment | Says the wrapping key comes from the "Nube password". | It comes from the room join code. |

---

## C. How to keep this wiki honest

- These pages name **files and functions**, not line numbers, so they survive refactors. If a name stops matching, grep for it.
- When you change something these pages describe, update the page in the same PR. The `codebase-wiki` skill (`.claude/skills/codebase-wiki/`) can re-run the whole research-and-verify pass.
- If you settle an item in section A, add a row to `docs/core/18-knowledge-capture.md` saying what you decided and why.
