# Eager boot budget changelog

Ratchet **down only**. Raising `EAGER_BOOT_BUDGET_BYTES` or `EAGER_BOOT_BUDGET_FILES` requires deleting eager weight in the same change.

Measured by `collectEagerBundleSet` in `app-boot-imports.test.mjs` (unminified `build:ui`).

| Date | Version | Bytes | Files | Why |
|------|---------|------:|------:|-----|
| 2026-09-16 | #ls-slim Stage 4 | 3,327,000 | 128 | Owner-approved raise (measured 3,326,546; ~450 B headroom). `#ls-slim` plan Stage 4: `warnIfLocalStorageNearFull()` (new, small) added to `storage-quota.mjs` and called once from `bootHydrateFromDb()` in `app-state.mjs` — both already core eager boot modules, so this is pure new weight, not a new module reached. File count unchanged. |
| 2026-09-16 | #ls-slim Stage 1-2 | 3,326,000 | 128 | Owner-approved raise (measured 3,325,827; ~200 B headroom). `#ls-slim` plan (`docs/superpowers/plans/2026-09-16-localstorage-slim.md`): `sweepLegacyClinicalLocalStorage()` + `getBlobCache()` wired into `app.js`'s boot auto-unlock path (Stage 1, clears dead `rpc-*` clinical keys), and new shared `idb-kv.mjs` (Stage 2, extracted from `productivity.mjs`'s undo-stack helpers, now also used by `preimport.mjs`'s pre-import-backup-to-IndexedDB move) reached eagerly through `features/platform/import-backup.mjs`, an already-known eager/lazy-only conflict (see `KNOWN_EAGER_LAZY_ONLY`) predating this change. No offsetting eager deletion available in this change: the deleted duplicate IDB helpers lived in `productivity.mjs`, which is lazy, not eager. File count unchanged (127, under the 128 cap). |
| 2026-09-16 | 8.3.8 prep | 3,325,000 | 128 | Owner-approved raise (measured 3,322,785; ~2.2 KB headroom). New `cloud-sync/idb-index-store.mjs` (2.6 KB) backs the echo-guard/fingerprint index with IndexedDB instead of `localStorage`, plus a small size-bounded eviction pass in `cloud-sync-echo-guard.mjs` — both read synchronously on the push/pull hot path, so a dynamic `import()` was not viable. File count unchanged (125, under the 128 cap). |
| 2026-09-06 | 8.3.2 prep | 3,320,000 | 128 | Owner-approved raise with margin (measured 3,279,383 after the deletion below; ~40 KB headroom). Same change moved the new Medicamentos admin panel (`med-admin-panel.mjs` + its `renderMedAdminPanel` call) from a static import in `expediente-inner-cache.mjs` to a dynamic `import()`, matching the existing `renderTendInnerTab` lazy pattern (−15 KB, 128→127 files pre-raise). Remaining growth (I/O turnos, hemodiálisis reminder, Stanford Solution grouping, Pendientes-from-parsed-receta) sits in `medications-actions.mjs`, `estado-actual-panel-registro.mjs`, `estado-actual-io.mjs`, `estado-actual-meds-receta-buckets.mjs`, `todos-mutations.mjs`, `storage-todo-normalize.mjs` — all already-eager core Sala/Manejo modules; splitting them further is the declined Stage B.2 rework (see PLAN.md `#ui`), not attempted here. |
| 2026-09-03 | 8.3.0 | 3,259,824 | 128 | Guardia board (+ hand-off/entrega modal cluster it pulls in) moved behind `ensureGuardiaBoardLoaded`; boot chrome now gets `syncGuardiaModeButtonVisibility` from a new tiny `guardia-mode-button.mjs` instead of the full module (−187 KB). File count rose because the removed shared chunk re-split into smaller pieces shared by the remaining lazy features. |
| 2026-09-02 | 8.2.9 prune | 3,430,001 | 112 | username copy restored (no lib chunk); labs refs stay in labs.js (−686 B) |
| 2026-09-02 | 8.2.9 prune | 3,430,687 | 112 | cutover wizard + flags dropped from eager graph (−394 B) |
| 2026-09-02 | 8.2.9 prune | 3,431,081 | 112 | highlights prune + dead-code deletes (bytes only; files stay 112) |
| 2026-09-02 | 8.2.9 prune | 3,431,680 | 112 | first measure after highlights prune |
| 2026-08 | 8.2.9 | 3,573,090 | 113 | Prior committed budget (lab-clipboard + backlog) |

Older per-release justifications lived as comments in `app-boot-imports.test.mjs` (8.1.4–8.2.9). They are retired; the table above is the record going forward.
