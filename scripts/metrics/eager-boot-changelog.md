# Eager boot budget changelog

Ratchet **down only**. Raising `EAGER_BOOT_BUDGET_BYTES` or `EAGER_BOOT_BUDGET_FILES` requires deleting eager weight in the same change.

Measured by `collectEagerBundleSet` in `app-boot-imports.test.mjs` (unminified `build:ui`).

| Date | Version | Bytes | Files | Why |
|------|---------|------:|------:|-----|
| 2026-09-03 | 8.3.0 | 3,259,824 | 128 | Guardia board (+ hand-off/entrega modal cluster it pulls in) moved behind `ensureGuardiaBoardLoaded`; boot chrome now gets `syncGuardiaModeButtonVisibility` from a new tiny `guardia-mode-button.mjs` instead of the full module (−187 KB). File count rose because the removed shared chunk re-split into smaller pieces shared by the remaining lazy features. |
| 2026-09-02 | 8.2.9 prune | 3,430,001 | 112 | username copy restored (no lib chunk); labs refs stay in labs.js (−686 B) |
| 2026-09-02 | 8.2.9 prune | 3,430,687 | 112 | cutover wizard + flags dropped from eager graph (−394 B) |
| 2026-09-02 | 8.2.9 prune | 3,431,081 | 112 | highlights prune + dead-code deletes (bytes only; files stay 112) |
| 2026-09-02 | 8.2.9 prune | 3,431,680 | 112 | first measure after highlights prune |
| 2026-08 | 8.2.9 | 3,573,090 | 113 | Prior committed budget (lab-clipboard + backlog) |

Older per-release justifications lived as comments in `app-boot-imports.test.mjs` (8.1.4–8.2.9). They are retired; the table above is the record going forward.
