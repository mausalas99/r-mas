# 13 · Open questions & doc drift

> Writing this wiki meant reading the code against the existing docs. This page records **what didn't line up**. Each item says how sure it is: **verified** means someone read the code at v8.4.9 (`291a02b`). **Reported** means a research pass found it and nobody has double-checked it yet.
>
> Treat this as a to-do list. When you fix something, delete its row.

---

## A. Questions that need a decision

| # | Finding | Status | Why it matters | Where |
|---|---|---|---|---|
| A1 | **The local DB has no encryption key.** `ensureUnlockedImpl` opens it with no `keyHex`. | **decided 2026-10-09** — stays off for 8.5.1 | Docs corrected (`15-security.md`, `db-encryption.md`, `database-index.md`, vision). Patient data on disk is protected only by the OS account and disk encryption. Re-enabling needs its own release with a tested migration. | `lib/db/db-manager-auth-unlock-flows.mjs`, `docs/core/18-knowledge-capture.md` |
| A2 | **An old encrypted DB was wiped at boot.** | **fixed 8.5.1** | The files are now moved to `userData/rplus-clinical-encrypted-backup-<timestamp>/` and a sticky toast tells the user where. | `ensureUnlockedImpl`, `archiveClinicalDbFiles` |
| A3 | **"Exportar copia cifrada" was not encrypted.** | **fixed 8.5.1 (copy)** | Dialog, Ajustes card and confirm now say "sin cifrar". The file itself is still a plain copy (A1). | `lib/db/ipc-handlers-register-core.mjs`, `public/index.html`, `features/platform/audit.mjs` |
| A4 | **`users.encrypted_private_key` holds a plaintext RSA PEM.** | **documented 8.5.1** | Never synced (merged rows get `''`). Name kept to avoid a schema migration; a code comment explains it. | `lib/db/clinical-access-users.mjs` |
| A6 | **The legacy recovery code `r+123` is still accepted** for `recovery_version < 2`. | **kept, documented 8.5.1** | Harmless while A1 stays off: it only opens an old pre-v2 encrypted DB, e.g. an archived backup (A2). Remove it if encryption returns. | `lib/db/crypto.mjs` |
| A8 | **It's unclear how Interno phones decrypt content.** Phones get `HKDF(DEK, "rplus-interno-v1")`, but `encryptOpsForPush` uses the full DEK, and no code was found that encrypts anything with the subkey. | reported — unclear | The board may only show plaintext fields (name, bed, service), or a code path was missed. | `features/cloud-sync/crypto.mjs`, `interno-crypto-board.mjs` |
| A9 | **`checkForModuleUpdate` is exposed in preload but no UI source calls it.** | verified (non-bundled sources) | Live module updates may be dormant code. | `packages/im/preload.js`, `lib/module-update-fetch.mjs` |
| A11 | **The Worker's monitoreo merge has drifted from the client's.** The Worker knows 12 med fields (the client knows 17: it is missing vasop, anticoagulacion, antiarritmicos, estatinas and nm). It picks historial winners by `recordedAt` instead of `savedAt`, and it has no `manualMeds` union. | verified | On plaintext rooms, confirmations of those 5 med groups don't merge on the server, and a back-dated edit can lose to an older one. | `cloud/sync-worker/src/monitoreo-lww.js` vs `features/estado-actual-data-merge.mjs`, `estado-actual-data-constants.mjs` |
| A14 | **Wiring loose ends.** `rpc-app-tab-changed` is dispatched but has no listener. `rpc-interno-vitals-synced` has listeners but no dispatcher. `subscribeClinicalReadModel()` has no subscribers. Boot reads the whole DB twice. | verified | This is dead code, or a feature that was meant to be finished (intern vitals aren't singled out on desktop). | see [03](./03-shared-state-and-wiring.md#loose-ends-found-while-mapping) |
| A15 | **Built but not wired.** Entrega templates (tables, IPC and sync exist; no UI caller). Interconsulta rollover IPC (no caller found). Pase-labs Worker route returns 503 since E2EE. | verified / reported (rollover) | Code that syncs and must be maintained but doesn't serve users. | `lib/db/clinical-access-entrega.mjs`, `cloud/sync-worker/src/pase-labs.js` |
| A16 | **Smaller gaps.** The Resumen PaFi KPI is never fed. VPO risk scores (RCRI/Gupta…) are typed in by hand, and `GUPTA_INTERCEPT` is unused. | reported | Features that look automatic but aren't. | `patient-dashboard/ea-glance-*.mjs`, `vpo-*.mjs` |
| A17 | **CI on `main` has been red since 8.4.9.** `metrics:check` reports `MODULE-COUNT REGRESSION: 1299 > baseline 1297`. Releases 8.4.8 and 8.4.9 added modules without raising the baseline. The `claude/codebase-wiki` branch raises it to 1300 (those two, plus the new drift guard). | verified (CI log of run 37512037761) | While `metrics:check` fails, CI stops there and the unit tests never run on `main`. | `packages/core/scripts/metrics/baseline.json` |

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
| `docs/wiki/10-nube-sync.md` (first version) | Said clinicalOps merges "union by id" on the Worker, and that templates reach the next shift. | **Fixed.** On encrypted rooms the client merges and the Worker replaces the value; templates have no UI. |
| `features/inicio-turno/inicio-turno-panel.mjs` header comment | "R+ has no 'interno' role". | Interno MIP phones exist ([08](./08-team-layer.md#6-interconsultas-and-interno)). |
| `docs/wiki/09-storage-and-security.md` (first version) | Said saves go over `db:clinical-save-all`. | **Fixed.** Whole-record saves use `db:clinical-command` (`clinical.persistSnapshot`). |
| `features/cloud-sync/crypto.mjs` comment | Says the wrapping key comes from the "Nube password". | It comes from the room join code. |

---

## C. Guarded by CI now

`scripts/ci/mirror-drift.mjs` (part of `npm run metrics:check`) fails when the hand-kept copies listed in [05](./05-codebase-map.md#hidden-connections-mirrored-and-repeated-code) drift apart. A11 is listed there as known drift until it's fixed.

## D. How to keep this wiki honest

- These pages name **files and functions**, not line numbers, so they survive refactors. If a name stops matching, grep for it.
- When you change something these pages describe, update the page in the same PR. The `codebase-wiki` skill (`.claude/skills/codebase-wiki/`) can re-run the whole research-and-verify pass.
- If you settle an item in section A, add a row to `docs/core/18-knowledge-capture.md` saying what you decided and why.
