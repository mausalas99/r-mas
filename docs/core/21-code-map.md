---
description: Living project map for R+ — read before exploring the codebase
alwaysApply: true
---

# R+ Project Context

**Read this first** for code paths. Use this map instead of broad codebase exploration. Only search or read files when this map lacks the detail you need for the task.

**Strategy & docs hub (product trade-offs):** `docs/core/00-system-index.md` → `docs/core/01-vision-north-star.md`  
**Feature / logic / DB indices:** `docs/features/features-index.md`, `docs/logic/logic-index.md`, `docs/database/database-index.md`  
**Large feature designs:** `docs/superpowers/specs/`, `docs/superpowers/plans/`

Design tokens and UI conventions: `design.md`, `public/tokens.css` (see also `docs/core/06-design-system.md`).

---

## Stack

Electron 41 desktop app (Mac arm64/x64, Windows x64). Renderer: ES modules bundled with esbuild (`public/js/app.bundle.mjs`). Main process: `main.js`. Clinical DB: SQLCipher via `better-sqlite3-multiple-ciphers` + Argon2 (`lib/db/`). Tests: `node --test` (colocated `*.test.mjs` / `*.test.js`).

---

## Entry points

| Layer | File | Role |
|-------|------|------|
| Electron main | `main.js` | Window (`app://rplus` via `lib/renderer-protocol.cjs`), auto-updater, IPC |
| Preload bridge | `preload.js` | `window.electronAPI` IPC surface |
| Renderer boot | `public/js/app.js` → `app.bundle.mjs` | Feature registration via `app-runtimes.mjs` |
| UI shell | `public/index.html` + `public/partials/` | Markup assembled by `scripts/build-ui.mjs` |
| Release | `scripts/release.js` | bump, test, build, publish |

---

## Directory map

```
lib/                  Node-side shared logic (importable from main/server)
  db/                 SQLCipher schema, crypto, clinical access, IPC handlers
  doc-generators/     Native .docx (note, indicaciones, listado)
  entrega/            Modo entrega pendientes (v2 templates + completion)
  interno/            Mobile interno/guardia board, QR, vitals, scope
  drive-import/       Google Drive HC/labs import parsers
 lab-repo/           Intrahospital lab portal scraper (ASP.NET HTML parse, PDF fetch)
  clinical-scope/     Pure clinical access domain (sala/team/guardia/cycle/evaluate)

public/js/            Renderer modules (pre-bundle)
  features/           UI feature modules (*.mjs) — primary place for new UI work
  app-state.mjs       Patient/state hydration
  clinical-access-runtime.mjs  Session + privileges (façade → clinical-access-runtime/)
  clinico-access.mjs    Thin façade → `lib/clinical-scope/` (+ unlock UI); patient shim if deep-imported
  storage.js          Legacy localStorage (non-DB paths; split helpers under storage/)

public/interno/       Mobile web client (guardia/interno board)
scripts/              build-ui, bundle-renderer, release, native rebuild, graph-memory, graph-memory
cloud/                equipos-worker (CF Worker+D1+R2), equipos-pages (static UI)
cloudflare/           setup guide + `setup.mjs` for one-command deploy
docs/
  core/               Agent hub: 00-system-index, 01-vision-north-star, architecture
  features/           features-index.md → feature domains
  logic/              logic-index.md → parsers, sync engines
  database/           database-index.md → SQLCipher schema map
  logs/               profiling / session notes
  superpowers/        Specs and implementation plans (design before big features)
```

---

## Domain index (where to look)

| Topic | Primary locations |
|-------|-------------------|
| Clinical DB / schema | `lib/db/schema.mjs`, `lib/db/db-manager.mjs`, `lib/db/ipc-handlers.mjs`, `lib/db/ipc-handlers.test.mjs` (fake `ipcMain` harness) |
| Clinical repo / commands | `lib/clinical-repo/`, `public/js/clinical-repo-client.mjs`, `clinical-repo-flag.mjs`, IPC `db:clinical-command`; eventualidades + sync projector flags (default on; opt-out `0`) |
| Roles / privileges | `lib/clinical-scope/` (pure evaluate + sala/team/guardia/cycle), thin `public/js/clinico-access.mjs` + unlock; `lib/db/clinical-privileges.mjs`, `lib/db/clinical-access-*.mjs`; `public/js/clinical-privileges.mjs`; `patient-delete-auth.mjs` (Admin/R4 any chart; others team-only); session bootstrap in `clinical-access-runtime/` (scope-ops = I/O adapter) |
| LAN LiveSync (retired) | Removed in 8.0.5; P3 fossils cleared (`lan-blob-retire`, `ci:forbid-lan`). Ward server (`server.js`) removed 2026-09-02. |
| Clinical teams / guardia | `public/js/features/clinical-teams/` (`teams-roster-{panel,manage,create,directory,submit,shell}`, `teams-roster-users-*`, `teams-invite`, `teams-guardia-bridge`), barrel `clinical-teams.mjs`, `clinical-rotation.mjs` |
| Modo entrega | `lib/entrega/` (+ `entrega-prep-checklist.mjs`), `clinical-entrega.mjs`, `entrega-prep-panel.mjs`, `entrega-modal-ui.mjs` |
| Interno mobile | `public/interno/` (Nube origin only) + `cloud/sync-worker/src/interno/` |
| Cloud sync (Nube) | `cloud/sync-worker/`, `public/js/features/cloud-sync/` (`autostart`, `mutate-bridge`, `cloud-ops-events`, `pull-apply` + `remote-patient-delete-confirm`, `sync-apply` via `features/sync-apply/`), `clinical-ops-sync.mjs`, `cloud-mobile/` | all clinical wards |
| Equipos (Lumify/EKG/US) | `lib/equipos/`, `public/equipos/`, `cloud/equipos-worker/`, `equipos-cloud-config.mjs`, `features/equipos-{board,qr-panel}.mjs` | Cloudflare Worker queue |
| Patient dashboard | `public/js/features/patient-dashboard/` |
| Estado actual / monitoreo | `public/js/features/estado-actual-*.mjs` |
| Labs / tendencias | `public/js/labs*.mjs`, `labs-default-refs.mjs` (rangos estándar / previos si SOME sin refs), `labs-reslabs-sanitize.mjs` (whitelist paneles en resLabs), `labs-panel-defs.mjs` / `labs-panel-parse.mjs` / `labs-panel-overlay*.mjs` (paneles + overlay LAN; **FEB** febriles), `lab-history-day-*.mjs` (historial por día), `cultivo-block-core.mjs`, `features/tendencias.mjs`, `lab-panel.mjs`, paste-anywhere `features/paste-smart*.mjs` |
| Lab repo scraper | `lib/lab-repo/` (`portal-client.mjs`, `portal-html.mjs`, fixtures); spec `docs/superpowers/specs/2026-06-27-lab-repo-scraper-design.md` |
| VPO (documentación) | `public/js/features/vpo.mjs`, `vpo-panel.mjs`, `vpo-data.mjs`, `vpo-text.mjs` |
| Document export | `lib/doc-generators/`, `lib/doc-export-http.js` |
| Updates / downgrade | `lib/update-downgrade.mjs`, `stable-versions.json`, `min-version.json`, `main.js`, Ajustes; opportunistic silent check `features/platform/updater/silent-check.mjs` (labs batch + patient select, 30 min throttle) |
| Debt metrics | `scripts/metrics/` (`lint-tier1.mjs`, `check.mjs`, `boot-graph.mjs`, `baseline.json`); `npm run lint:tier1` (changed paths), `npm run metrics:check` |
| Agent graph memory | `scripts/graph-memory/` (cached extract + validate + JSON graph; not shipped); `docs/core/19-agent-graph-memory.md` |
| Onboarding / tour | `clinical-onboarding*.mjs`, `tour-targets.mjs`, `features/settings-help/` (tours, help, release notes), barrel `settings-help.mjs` |
| UI shell / pase board | `app-shell.mjs` (chrome/toast/modals), `ui-physics.mjs`, `features/pase-board.mjs` + `pase-board-resumen-cache.mjs`, `patients-census-walk.mjs`, `public/styles/pase-board.css` |

---

## Build & test

```bash
npm run build:ui          # assemble index.html + bundle renderer
npm start                 # electron (prestart rebuilds natives + bundle)
npm run release:publish   # release pipeline (see README § Desarrollo)
```

**Testing policy (agents):** Do **not** run `npm test` during normal dev — it still launches ~348 files in a single `node --test` (~35s+, poor feedback loop). That monolithic full-suite run is **not** the target workflow; we are moving toward **targeted** runs and CI sharding instead.

- **Local / agent:** `npm run test:one -- path/to/changed.test.mjs` (runs under Electron's Node via `scripts/run-with-electron-node.mjs` — same SQLCipher ABI as the app). Do **not** use bare `node --test` for DB/native suites.
- **LAN kernel refactors:** gate with `orchestrator.test.mjs` + `push`/`room`/`transport` + `lan-sync-wiring.test.mjs` (see `docs/core/07-testing-strategy.md`).
- **DB IPC channels:** `lib/db/ipc-handlers.test.mjs` — fake `ipcMain` + `createUnlockedDbManager` teardown pattern.
- **CI / release:** `npm test` in `.github/workflows/ci.yml` and `scripts/release.js` — full suite gate only there.

New renderer code: edit `public/js/**/*.mjs`, then `npm run build:ui` (or `npm start` which bundles). Do not edit `app.bundle.mjs` by hand.

Packaged files list: `npm run release:sync-pack` updates electron-builder `build.files`.

---

## Conventions

- **ESM** in renderer and most `lib/` (`.mjs`); CommonJS in `main.js`.
- **Features pattern**: module exports `windowHandlers`, registered in `app-runtimes.mjs`.
- **IPC**: add channel in `preload.js` + handler in `main.js` or `lib/db/ipc-handlers.mjs`.
- **Schema changes**: bump in `lib/db/schema.mjs`, migration + test in `lib/db/schema.test.mjs`.
- **Spanish UI** copy; code/comments mix EN/ES like surrounding files.
- **No scope creep**: match existing patterns; minimal diffs.
- **Conexión / Opciones chrome (HARD):** Fix sharp corners with `border-radius` only. **Never** shrink `#connection-dropdown` / modal width (keep `min(96vw, 960px)`), padding, or Electron window size when rounding corners. Missing `.cloud-sync-inset-group` styles ≠ “make the sheet smaller.”

---

## Changelog (newest first)

Maintained incrementally — see `sync-context-on-commit.mdc`. Max ~20 entries.

- **2026-09-02** `codebase-reduction`: gitignore build mirrors + index.html; dead-code sweep; file-length ratchet replaced by total-LOC + module-count; glob test discovery; tracked code map; LAN ward server + 7.9 cutover wizard removed; Interno/Equipos origin-only (no :3738 probe).
- **2026-08-14** `agent-graph-memory`: cached extraction vs subgraph reasoning for Claude Code; validate-before-write; `scripts/graph-memory/`, `docs/core/19-agent-graph-memory.md`.
- **2026-08-14** `release-8.1.3`: warm instrument + SOME Nube `sourceText` + censo ↑/↓; Worker clinicalOps LWW union + mutation cupo; `ui-physics.mjs`, `lab-history-some-reparse.mjs`, `clinical-ops-lww.js`.
- **2026-08-13** `labs-some-sync`: Nube sends SOME `sourceText` (resLabs fallback); peers reparse locally; chips/shell ink-neutral; lab day nav uses paste settle; `cloud-op-slim.mjs`, `lab-history-some-reparse.mjs`.
- **2026-08-13** `warm-instrument`: button language + ink-neutral accent-soft + overlay bounce 0 / trigger origin + SOME settle; remove +1 día capsule; `ui-physics.mjs`, `tokens.css`.
- **2026-08-13** `release-8.1.2`: Paciente → Resumen glance + labs por día + SOAP/IV→VO SOME + K mixta + FEB + Nube session-first + silent updater; `patient-dashboard/`, `lab-history-day-*.mjs`, `med-receta-soap-some-map.mjs`, `silent-check.mjs`.
- **2026-08-13** `onboarding`: curriculum v17 — structure + alta + incompletos first; tendencias under Laboratorio; `onboarding-curriculum.mjs`, `learn-hub.mjs`.
- **2026-08-13** `guardia-wip`: SOAP dest from SOME catalog + IV→VO packs; mixed K repos; FEB panel; Nube login session-first; silent updater; `med-receta-soap-some-map.mjs`, `med-receta-iv-oral-some.mjs`, `silent-check.mjs`.
- **2026-08-13** `patient-dashboard`: Paciente → Resumen glance home; Resultados under Laboratorio; SOAP meds as N/HD/HI list (no pills); `public/js/features/patient-dashboard/`.
- **2026-08-13** `census-delete`: desktop census via Filtros (no hard team hide); patient delete gated Admin/R4 vs team; remote Nube wipe confirm; EA reclassify persists; `patient-delete-auth.mjs`, `remote-patient-delete-confirm.mjs`.
- **2026-08-12** `cloud-sync-remember`: durable Recuérdame in `userData` via IPC + quit flush + single-instance lock; `lib/cloud-sync-remember-store.cjs`.
- **2026-08-12** `tendencias-ui`: simplify eTFG card label; style detail event CTA; remove toolbar + Eventualidad; `tendencias-constants.mjs`, `tendencias-hidden.mjs`.
- **2026-08-11** `clinical-repo`: eventualidades + sync projector **default on** (SQLCipher-first + change-log drain); opt-out via LS/env `0`; `clinical-repo-flag.mjs`.

- **2026-08-11** `clinical-scope`: unified pure access domain + evaluateClinicalScope; renderer façade; interno/Worker leaf imports; `lib/clinical-scope/`, thin `clinico-access.mjs`.
- **2026-08-11** `lan-rename`: teams-roster-lan→directory/users, scope-lan→scope-ops, clinical-access-lan→directory, clinical-ops-lan shim removed.
- **2026-08-11** `lan-graveyard-p3`: forbid-lan CI + blob/prefs retire + LS key migrate + Lan*→Directory/Sync symbol sweep; `lan-blob-retire`, `lan-prefs-retire`, `cloud-room-membership`, teams directory.
- **2026-08-11** `clinical-repo-p2`: sync projector drains `clinical_change_log` → outbox; `lib/clinical-repo/sync/`, `clinical-repo-sync-drain.mjs`.
- **2026-08-11** `workbench-ui-patterns`: shared loading/approval/diff/recommendation primitives + HITL/list/sidebar/tendencias polish; `public/js/ui-*.mjs`, `public/styles/ui-patterns.css`, tendencias insight compare/Δ.
- **2026-08-11** `clinical-repo`: P1 canonical write path — schema **v23** `clinical_change_log` + `lib/clinical-repo/` commands; eventualidades behind `clinicalRepo.eventualidades` flag; `db:clinical-command` IPC.
- **2026-08-10** `release-8.1.0`: censo **cross-sala** (expediente/labs al room de la sala del equipo) + reconciliación Nube post-asignación + **Tendencias eventualidades** (marcadores + alta con categoría) + KV revision cache eliminado; `cloud-census-sala-push.mjs`, `census-nube-pull.mjs`, `tendencias-event-*.mjs`, `cloud/sync-worker`.
- **2026-08-09** `cloud-sync`: pull D1-before-KV (fix revision 3264 vs 3266) + reconcile revision + retry 503; DO notify no-await; seed único outbox; `sync.js`, `sync-runtime-cycle.mjs`.
