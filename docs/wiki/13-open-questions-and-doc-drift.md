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
| A11 | **The Worker's monitoreo merge has drifted from the client's.** The Worker knows 12 med fields (the client knows 17: it is missing vasop, anticoagulacion, antiarritmicos, estatinas and nm). It picks historial winners by `recordedAt` instead of `savedAt`, and it has no `manualMeds` union. | verified | On plaintext rooms, confirmations of those 5 med groups don't merge on the server, and a back-dated edit can lose to an older one. | `cloud/sync-worker/src/monitoreo-lww.js` vs `features/estado-actual-data-merge.mjs`, `estado-actual-data-constants.mjs` |
| A17 | **CI on `main` has been red since 8.4.9.** `metrics:check` reports `MODULE-COUNT REGRESSION: 1299 > baseline 1297`. Releases 8.4.8 and 8.4.9 added modules without raising the baseline. The `claude/codebase-wiki` branch raises it to 1300 (those two, plus the new drift guard). | verified (CI log of run 37512037761) | While `metrics:check` fails, CI stops there and the unit tests never run on `main`. | `packages/core/scripts/metrics/baseline.json` |

---

## B. Docs that disagree with the code

| Doc | What's stale | Correct (per code) |
|---|---|---|
| `docs/core/15-security.md` | "Strong at-rest" and "device unlock is required". Cites `lib/db/audit-hooks.mjs` and `lib/clinical-safety-rules/`, which don't exist. | See A1. |
| `docs/db-encryption.md` | The `.db` backup "permanece cifrada" (stays encrypted). | See A3. |
| `docs/core/16-glossary-of-terms.md` | Only 9 terms, marked in-progress. | [12 · Glossary](./12-glossary.md) |

---

## C. Guarded by CI now

`scripts/ci/mirror-drift.mjs` (part of `npm run metrics:check`) fails when the hand-kept copies listed in [05](./05-codebase-map.md#hidden-connections-mirrored-and-repeated-code) drift apart. A11 is listed there as known drift until it's fixed.

## D. How to keep this wiki honest

- These pages name **files and functions**, not line numbers, so they survive refactors. If a name stops matching, grep for it.
- When you change something these pages describe, update the page in the same PR. The `codebase-wiki` skill (`.claude/skills/codebase-wiki/`) can re-run the whole research-and-verify pass.
- If you settle an item in section A, add a row to `docs/core/18-knowledge-capture.md` saying what you decided and why.
