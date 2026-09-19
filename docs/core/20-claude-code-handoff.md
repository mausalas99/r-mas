---
type: "core"
name: "Claude Code Handoff"
status: "done"
description: "update-feed Worker (GitHub first, GitLab fallback) is built and tested. GitHub account lock 2026-08-14."
---

## SESSION HANDOFF — 2026-08-24 (later), pain-point fixes from live walkthrough (READ THIS FIRST)

Continuation of the per-patient tab routing session below — that bug is now fixed and verified live (both directions, hospitalized + outpatient). After the fix, did a full computer-use walkthrough of both test patients across every screen (Resumen, Clínico, Manejo, Laboratorio, Salida, Pendientes, Agenda) to find UX pain points. User approved fixing all of them.

**Done and verified this session:**

1. **Pendiente "Hoy 18:00" born overdue.** `public/js/todos-due.mjs` `dueDateFromPresetDef()` — a `dayTime` preset with `dayOffset: 0` (today) now rolls to tomorrow if the computed time is already past `now`. New test added: `todos-due.test.mjs` "hoy-18 after 18:00 rolls to tomorrow (never born overdue)". 36/36 pass.
2. **VPO removed entirely.** VPO (Med-Interna preop clearance calculator) doesn't belong in a cardiology HF app — was still reachable as a Clínico pill (Consulta Externa mode) and under Salida (Sala mode, though already filtered by `filterSalidaSectionsForHf`). Removed: all tab-routing references in `expediente-tabs.mjs`/`expediente-tabs-migrate.mjs`, boot wiring in `app-runtimes.mjs`, mount cache in `expediente-inner-cache.mjs`, patient-select stash in `patients-select.mjs`, label in `expediente-group-row.mjs`. Deleted the whole dedicated panel/data file cluster: `features/vpo.mjs`, `features/vpo-panel*.mjs` (4 files), `vpo-data.mjs`, `vpo-display.mjs`, `vpo-lookups.mjs` (+test), `vpo-text.mjs` (+test) — removed the two deleted test files from `package.json`'s `scripts.test`. **Deliberately kept**: the `vpoByPatient` storage/sync field and `migratePatientDiagnosticosFromVpo()` (in `patient-diagnosticos.mjs`) — these protect diagnósticos data already saved in patient records inherited from the R+ (Med-Interna) fork; they're now unreachable from the UI (nothing can create new VPO data) but still valid for reading/migrating old data. Verified live: VPO pill gone from both Clínico (outpatient) and Salida (hospitalized). Tests updated (`expediente-tabs.test.mjs`, `expediente-group-row.test.mjs`) — 156/156 pass across all touched suites.
3. **Sidebar patient-list hidden-by-mode — could NOT reproduce.** User reported that toggling the "Consulta Externa"/"Hospitalización" header mode hides patients of the other type from the sidebar. Traced every filter in the patient-list chain (`patients-scope.mjs`, `patients-clinical-filter.mjs`, `patients-list.mjs`, `patient-list-incremental.mjs`) — none filter by área/appMode for a local (non-Nube) session, confirmed this install has no cloud user logged in. Live-reproduced the user's exact steps (toggled to Hospitalización with Filtros set to "Todas"/"Todos los equipos") — both patients stayed visible. Likely explanation: this was a symptom of the per-patient tab-routing bug fixed earlier this session (root cause: `expediente-tabs-migrate.mjs` reading the global-only `isModeSala`, already fixed and rebuilt before this was reported) — not a separate bug. **Needs user confirmation**: ask them to check on the current build; if it still happens, get exact repro steps (Nube logged in? search filter active? specific patients?).

`npm run metrics:check` → 933 vs baseline 0. Pre-existing debt from the large uncommitted tree (152+ files across teal-workbench remediation, HF objective-forms, cardio fork — see rows above), not introduced by tonight's 3 fixes.

**All files from both sessions today remain uncommitted** — user has not yet said to commit.

---

## SESSION HANDOFF — 2026-08-24, per-patient tab routing (READ THIS FIRST — mid-debug, do not commit yet)

**Task in progress:** user asked to (1) fill both test patients ("Paciente IC" / hospitalized, "PACIENTE EXTERNA" / outpatient) with full sample data, (2) use the app end-to-end as a clinician in both Hospitalización and Consulta Externa modes, (3) report UX pain points/optimizations. Before starting (1)-(3), live testing surfaced real pre-existing bugs in how the expediente tabs pick Sala vs. Consulta Externa content per patient — those had to be fixed first since a broken tab would corrupt the walkthrough. Steps (1)-(3) themselves are **not started.**

**Original trigger (separate, already fixed):** outpatient ("Paciente Externa") patients were forced through the "Completar ingreso" cuarto/cama modal like ward patients. Fixed in `public/js/patient-admission-incomplete.mjs` (`isOutpatient()` skips the requirement when área contains "CONSULTA EXTERNA"). User explicitly chose the "per-patient, not per-app" architecture: tabs/sections must follow each patient's own área, not the app's global Hospitalización/Consulta Externa toggle, because real sessions mix both patient types.

### Done and verified this session (tests pass, rebuilt, confirmed live)

1. **New shared module** `public/js/features/active-patient-area.mjs` — single source of truth for "what does the active patient's área say about mode" (`activePatientModeSala()`: `true`/`false`/`null` when área is empty → caller falls back to the global toggle). Wired via `setActivePatientAreaGetter` from `app-runtimes.mjs`.
2. `public/js/expediente-tabs.mjs`'s local `isModeSala(settings)` now fully defers to the active patient's área when set (both directions — outpatient forces Consulta Externa tabs, ward forces Sala tabs — the first pass only had the outpatient direction, which itself was a bug found and fixed this session).
3. `public/js/features/interconsulta-mode-chrome.mjs`'s `isInterconsultaModeActive()` (gates the Resumen "Consulta Externa" band) now uses the same per-patient check — previously it only read the global toggle directly, so the outpatient band kept showing on the Resumen tab for the *hospitalized* patient whenever the global toggle happened to be on Consulta Externa.
4. `public/js/expediente-tabs-migrate.mjs`'s `migrateGranularInner`/`migrateGranularSala` now swap `estadoActual` ↔ `consultaIC` explicitly when the per-patient mode disagrees with whatever granular tab was last active — needed because both tab ids are unconditionally present in `granularToConsolidatedMap`, so the old map-presence guard never caught a stale tab surviving a patient switch.
5. Tests: `expediente-tabs.test.mjs` 33/33, `interconsulta-mode-chrome.test.mjs` 6/6, `patient-admission-incomplete.test.mjs` 4/4. All rebuilt via `npm run build:ui`.

### NOT done — confirmed live bug, root cause not yet found

**Symptom:** for the hospitalized patient ("Paciente Simulado IC", área CARDIOLOGÍA, confirmed `isModeSala` = `true`), clicking the real "Estado actual" pill leaves the Clínico pane blank (or stuck on Resumen) instead of showing the Estado Actual form.

**Confirmed via live debug (temporary `console.log` still in the code — see below):** `switchInnerTab('estadoActual')` is called correctly (verified the exact bundled function body via devtools), but by the time `syncConsolidatedPaneVisibility` runs inside it, the `granularTab` value has become `'consultaIC'` instead of `'estadoActual'` — even though `isModeSala` is `true` at that exact moment (logged alongside it). Static reading of `migrateGranularInner`/`migrateGranularSala` (both source and the built chunk, `chunk-RSX26UOH.js`) says this swap should be a no-op when `isModeSala` is `true` and the input is already `'estadoActual'`. The actual flip point between the `switchInnerTab` param and the `syncConsolidatedPaneVisibility` call has **not** been located yet.

**Debugging gotcha, worth saving future time:** this app renders the visible Clínico segment pills ("Estado actual", "Eval. inicial", "Eventualidades", "Consulta IC"…) two different ways. There is a **legacy static bar** with stable ids (`#exp-segment-estadoActual` etc.) that is `display:none` in the current layout — clicking it via `document.getElementById(...).click()` fires real handlers but does **not** reflect what a user actually sees, and gave misleading results during this session. The **real, currently-visible** pills are built fresh on every render by `public/js/features/expediente-group-row-ui.mjs` with no stable id — select them as `document.querySelector('.exp-group-section[data-section="estadoActual"]')` (swap the `data-section` value). Always test against the group-row selector, never the old `#exp-segment-*` ids.

**Temporary debug code left in the tree — remove before shipping:** `public/js/expediente-tabs.mjs`, inside `syncConsolidatedPaneVisibility`, has one line:
```js
console.log('[DEBUG syncConsolidatedPaneVisibility]', { granularTab, target, isModeSala: isModeSala(settings), area: activePatientModeSala() });
```
Remove it (and re-run `npm run build:ui`) once the real bug is found and fixed — don't ship it, and don't let it survive into a commit.

**Recommended next step:** add the same style of `console.log` directly inside `switchInnerTab` in `public/js/features/expediente-navigation.mjs` — once for the raw `tab` parameter as received, and once immediately after `tab = migrateGranularInner(tab, settings);` — to see the exact point the value changes. Also worth checking, not yet ruled out: `lazy-feature-routes.mjs`'s `patchWindowHandlers(mod.windowHandlers)` calls (used when heavy panels lazy-load) could in theory be replacing `window.switchInnerTab` with a different implementation after first paint — grep every module whose `windowHandlers` export includes a `switchInnerTab` key, not just `expediente-navigation.mjs`'s.

**Live app state:** an Electron dev instance may still be running from this session (`npm start`, background). Two test patients exist in the local DB: "Paciente IC" / "Paciente Simulado IC" (registro `SIM-0001`, hospitalized, Cto. 304 / Cama A, área CARDIOLOGÍA) and "PACIENTE EXTERNA" / "PACIENTE DEMO EXTERNA" (registro `TESTHF001`, área CONSULTA EXTERNA, servicio CARDIOLOGIA). Both are local-only test/sample patients — not real PHI.

**Files touched this session** (all uncommitted, do not commit until the bug above is fixed and the debug `console.log` is removed): `public/js/patient-admission-incomplete.mjs`, `public/js/expediente-tabs.mjs` (has the debug log — see above), `public/js/expediente-tabs-migrate.mjs`, `public/js/expediente-tabs.test.mjs`, `public/js/features/active-patient-area.mjs` (new), `public/js/features/expediente-navigation.mjs`, `public/js/features/interconsulta-mode-chrome.mjs`, `public/js/features/interconsulta-mode-chrome.test.mjs`, `public/js/app-runtimes.mjs`. Note: `public/js/features/expediente/expediente-datos.mjs`, `public/js/patient-delete-auth.mjs`, `public/js/patient-delete-auth.test.mjs` also show as modified in `git status` but were **already dirty before this session started** — not part of this work, do not assume they're related.

---

# Handoff — update feed (GitHub lock) — DONE

Worker, `lib/update-feed.mjs`/`.js`, `main.js` wiring, and worker-first `min-version`/`stable-versions` fetchers were already built and committed in `b895b96f` ("chore(release): prepare 8.1.4"), before this session started. 32/32 related tests pass (`npm run test:one -- cloud/update-worker/src/feed.test.mjs cloud/update-worker/src/index.test.mjs lib/update-feed.test.mjs public/js/min-version-fetch.test.mjs public/js/stable-downgrade-ui.test.mjs main-update-feed.test.mjs`). See spec acceptance checklist for details.

**Date:** 2026-08-15  
**From:** Cursor (Grok 4.6)  
**To:** Claude Code  
**Branch:** `main` (local 8.1.4; `origin/main` may match)  
**Worktree:** `/Users/mauriciosalas/R+`

---

## Start Claude Code

```bash
cd /Users/mauriciosalas/R+
claude --model sonnet --effort medium
```

First prompt (paste once):

```
Read CLAUDE.md and docs/core/20-claude-code-handoff.md only.
Then read docs/superpowers/specs/2026-08-15-update-feed-worker-design.md.
Do not read the docs hub or project-context yet.
UI bugs, Nube crypto, and graph-memory tests are closed. Do not reopen them.
Task: implement the update-feed Worker + UPDATE_FEED_MODE per the spec.
GitHub first. GitLab fallback. Easy revert = upload to GitHub; do not drop the Worker.
Do not change the baked-in feed inside the already-built 8.1.4 dist.
Do not create a second GitHub account.
```

Plan a hard task: new session `claude --agent ceo-fable --effort high` (or `/model fable` then `/plan`). Then `/clear` and execute on Sonnet.

---

## Active plans

| Plan | Path |
|------|------|
| **Update feed Worker (this job)** | `docs/superpowers/specs/2026-08-15-update-feed-worker-design.md` |
| Port R+ upstream fixes into R+ HF | `docs/superpowers/plans/2026-09-14-port-rplus-upstream-fixes.md` — **approved + built 2026-09-14, all 4 parts done.** All Tier-1 items ported and tested (quota bug, lab-set sharding, team-vanish fixes + new v27 index migration, SOME-parser O(n²) bound, IPC fetch timeout, medReceta LWW sync gap, patient-merge tiebreak, echo-guard, admin DEK rescue reconcile), plus T1/T2/T3 fluid balance in Estado Actual and Tendencias' Tablas Dinámicas builder, plus the confirmed-safe dead-code deletion pass. Skipped upstream's event-tag-chips feature — a concurrent session is deliberately removing that exact code path as part of the already-approved Eventualidades wizard plan. `npm run build:ui` clean; full `npm test` has 56 pre-existing failures unrelated to this work (caused by a concurrent session's in-progress `rank` enum schema rework in `schema-migrate-v24-rank-team.mjs`, confirmed via root-cause trace, not touched). `npm run metrics:check` fails pre-existing on `main` (debt gate unrelated to this session). Original context: Full diff report first: `docs/core/2026-09-14-rplus-vs-hf-diff.md` (161 upstream commits since fork, sorted into tiers). Part 1: 10 Tier-1 fixes (Nube 50→300 patient quota bug, per-lab-set sync-worker sharding, 3 team-vanish merge bugs, new v27 index migration, SOME-parser O(n²) bound, IPC fetch timeout, medReceta LWW sync gap, patient-merge tiebreak, echo-guard resend loop, admin DEK rescue reconcile). Part 2: T1/T2/T3 shift-split fluid balance in Estado Actual (feeds existing `lib/cardio/balance-historico.mjs` transparently, no schema change). Part 3: Tendencias "Tablas Dinámicas" cross-section table builder + event-tag chips. Part 4: dead-code deletion (upstream already ran this cleanup; HF forked before it — confirmed-safe list only, several upstream-deleted files are still live in HF and must stay). Working tree has large pre-existing uncommitted WIP (equipos deletion, admin-rescue-key/room-dek partial port) — CEO decision: build on top, don't stash. |
| Eventualidades/Consulta IC history lock + image attachments | `docs/superpowers/plans/2026-08-31-eventualidades-consulta-history-lock-images.md` — **approved 2026-08-31, implementation starting.** Part A: picking a past date in Eventualidades or Consulta IC now locks the form (read-only) instead of silently allowing edits to history; today's entry stays editable; new phrase-gated "Editar" unlock (in-memory only, re-locks on next visit), separate from the existing dead `clinico-access-unlock.mjs` gate (different purpose — reused as a template, not the same instance). Part B: image attachments (Rx tórax, POCUS, EKG) — new `cardioImages` blob key (per-patient map shape, matches `ENTRY_MAP_KEYS`), jimp-compressed (≤1600px, JPEG ~72%, 1.2MB hard cap/image) via new main-process IPC (same pattern as `lab-photo-ocr`), manual-prune "Imágenes" usage view (no silent auto-delete of clinical images). Cloud sync for images explicitly deferred (needs `cloud/sync-worker` Worker-side changes — separate deploy/review). |
| Eventualidades → structured follow-up wizard | `docs/superpowers/plans/2026-08-27-eventualidades-wizard.md` — **approved 2026-08-27, implementation starting.** Replaces the free-text Eventualidades tab (day-grouped note log) with a repeatable step wizard (`patient.cardio.eventualidadesSeguimiento[]`), mirroring Eval. inicial's clinical sections and Consulta IC's array-of-dated-entries mechanism. Confirmed with user: old free-text entries orphaned (not migrated), Drive-import-to-Eventualidades dropped, Tendencias quick-add tagging dropped. Also folded into this session: Consulta IC blank-render bug fixed (`granularMountIsEmpty` missing a case), "Consulta IC" tab renamed to "Consulta", and Eval. inicial's Exploración step reworked into US pulmonar/Rx tórax card+modal with side-tabs and chip checkboxes (already shipped, reused by this plan). |
| HF streamlining: fit-in-one-window screens + single-rotation census + citas agenda | `docs/superpowers/plans/2026-08-26-hf-streamlining.md` — **CEO-reviewed 2026-08-26 (approve with changes, findings folded in), scroll audit complete, implementation starting in sequence 4/5→2→3→1 per CEO recommendation (sala simplification last — it needs a real DB migration, not just a list edit).** North star rewritten same day around Dr. Dani's meeting. Scope grew past the original no-scroll fix after follow-up: (1) no-scroll audit/compression on cardio screens, unchanged; (2) Clinical Teams/Rotations turned out to be the real rotation-access mechanism (not dead IM code) — simplify to a single fixed team for HF instead of the 8-sala IM picker; (3) new `hospitalizado` patient flag splits the sidebar into small Hospitalizados + Agenda-de-hoy zones, with the full ~200-patient outpatient roster moved to a search-only Directorio screen instead of an endless sidebar; (4) `agenda.mjs`'s existing week-grid procedure board gets repurposed into a Citas (appointments) view with a new day-focus mode and card-click-opens-patient-file behavior. Background audit agent already running against the live dev build for the scroll-overflow check.
| LAN plumbing + dead code cleanup | `docs/superpowers/plans/2026-08-26-lan-and-dead-code-cleanup.md` — **approved 2026-08-26, Phase 1 done, Phase 2/3 running.** Phase 1 (done): removed Equipos LAN subnet scanner (dead in every real deployment path), the dead LAN-peer dev tool, the orphaned host-merge/promote-temporary-host IPC+HTTP surface, and a dead `build:cloud-interno` script entry. Phase 2 (Equipos track DONE 2026-08-26): deleted the Equipos device-checkout module — `lib/equipos/`, `public/equipos/`, `cloud/equipos-worker/`, `cloud/equipos-pages/`, `cloudflare/README.md` + `cloudflare/setup.mjs`, the 3 `ipc-handlers-register-equipos*` files, the `equipos-qr-panel`/`equipos-board`/`equipos-history`/`equipos-cloud-config` UI chain, schema migrations v18/v19/v20 (SCHEMA_VERSION stays **24** — not renumbered, so existing DBs keep inert orphan `equipos_*` tables), the `/equipos` + `/api/equipos/v1` server routes, 6 preload bindings, the `equipos-lista` modal, ~475 lines of dead CSS, and 17 test entries in `package.json`. **NOTE:** `public/js/features/cloud-sync/panel-admin-equipos-*` is NOT this module — it is the clinical users/teams admin tab (imports `clinical-teams/teams-guardia-bridge.mjs`), kept intact; separately, mechanical cleanup of ~20 confirmed zero-caller dead exports across `lib/entrega`, `lib/cardio`, `lib/db`, `lib/drive-import`. Phase 3 (running alongside Phase 2's second track): simplify 3 unused `clinical-repo-flag.mjs` toggles and a dead `/sync` route in `cloud/sync-worker/src/routes.js`. `scripts/verify/*.mjs` (32 one-off screenshot scripts) explicitly kept — still used by hand for manual QA. Runs alongside the unrelated "On-call/rank redesign" row below (different files — Equipos ≠ clinical-teams/rotation roster, verified not to overlap). |
| Full IM wipe/adapt | `docs/superpowers/plans/2026-08-25-im-wipe.md` — **approved 2026-08-25, Tiers 0-2 built + tested 2026-08-25, Tier 3 partial.** Removes/rewords leftover Internal-Medicine-only strings/defaults. Done: deleted hardcoded IM ward roster with real doctors' names (`lib/clinical-rotation/agosto-2026-teams.mjs` + seed button); CIRUGÍA GENERAL/R3·Medicina Interna placeholders → CARDIOLOGÍA/R3·Cardiología; "ajeno a medicina interna" copy reworded (3 spots); Guardia-v7 tour copy stripped of R1/R4/sala text; "Equipo en el censo" flattened to a member list + "Jefe de servicio" (kept old data keys — they feed `template_listado.docx`, unsafe to rename blind); `censoFiuxLabel` added mirroring `censoFimiLabel`; CSV export now Admin-only gated (net-new, was previously ungated); Mi Perfil sala dropdown deleted. `npm test` 4349/4364 (12 pre-existing unrelated failures), `build:ui`/`build:ui:check` clean. Previously blocked on the `users.rank`/`teams.service` schema migration — **unblocked 2026-08-25, design done, see the row below.** `lib/clinical-salas.mjs`, `sala-slug.mjs`, and the sidebar Sala filter still pending, now scoped as step 5 of the row below. Also still open: Agenda "+Nuevo procedimiento" checklist wording, blocked on user input (unchanged).
| On-call/rank redesign (R1-R4 → Admin/Team) | `docs/superpowers/plans/2026-08-25-oncall-rank-redesign.md` — **planned 2026-08-25, updated same day three times (Guardia mode, then the Interno board, then Entrega — all fully removed, not reduced), not yet implemented.** Answers the IM-wipe Tier 3 blocker: no on-call rotation, no cycle-letter math, no Guardia mode/session flag/UI, no Interno board (QR/tokenless phone view, `lib/interno/*` + `cloud/sync-worker/src/interno/*`), no Entrega (shift-handoff) feature at all; patient visibility simplifies to "any `Team`-rank user sees every patient, always." Because Entrega was the last surviving consumer of the coverage table, **`active_guardias` (and its `entrega_template_user`/`entrega_template_team` companions) are dropped from the schema entirely** — confirmed via dependency check that every remaining reference was Entrega coverage logic or its sync/export/merge plumbing, nothing independent. One line to preserve during cleanup: `clinical-access-rotation.mjs:57`'s `DELETE FROM active_guardias` sits inside `archiveRotationAndTeams`, a genuinely separate monthly team-roster-reset function that survives — only that one line goes. Open item flagged to the user, not resolved by this plan: `session-manager.mjs`'s vitals-monitor loop is keyed to a covering user that no longer exists — needs a decision (Team-wide replacement vs. drop) during implementation. Scopes: `schema-migrate-v24-rank-team.mjs` (CHECK constraints + `DROP TABLE active_guardias`/Entrega template tables), deleting the rank+guardia evaluator files in `lib/clinical-scope/evaluate/` plus `cycle-letters.mjs`/`guardia-coverage.mjs`/`entrega-phase.mjs`, deleting the whole Interno board and the whole Entrega feature, a full rewrite (not patch) of `tests/clinico-access.test.mjs`, and collapsing 4+ duplicate `CLINICAL_RANKS` allow-lists into one shared constant. Full 7-step execution order and verification checklist in the plan file.
| OCR outside-lab photo import (Consulta Externa) | `docs/superpowers/plans/2026-08-23-ocr-lab-photo-import.md` — **approved 2026-08-23, not yet implemented.** Upload a photo of an outside-lab report (SaludDigna, Chopo, etc. — not SOME), local OCR via `tesseract.js` (no cloud, no PHI leaves device), review/edit modal, then reuses the existing manual-entry `resLabs` pipeline (`pushExternalLabHistory`) with a new `origin: 'foto'` badge. Deliberately does not touch/reuse `parseSomeReportTables` (SOME-specific column layout). No new "Consulta Externa" screen — button lands in the existing expediente lab toolbar. |
| IC research registry (.csv) bulk export | `docs/superpowers/plans/2026-08-24-ic-registry-csv-export.md` — **approved 2026-08-24, in progress.** Fills the 1716-column "BASE DE DATOS UNIDAD INSUFICIENCIA CARDIACA.xlsx" research-registry column format from app data (label-driven mapper, exact-date echo/labs matching, blank when no source). New button in the existing "Exportar pacientes…" modal, plain Blob download — no new dependency, no server route. |
| Shard room_state.labSidecars (D1 2MB row cap fix) | `docs/superpowers/plans/2026-08-21-shard-room-state-labs.md` — **built + tested 2026-08-21.** Fixes real prod `D1_ERROR: string or blob too big: SQLITE_TOOBIG`. Yesterday's payload-cap raise (`a488d032`) fixed app-level rejection but not D1's own 2MB hard row cap — room_state stored the whole room as one blob. New `room_state_labs` table (`schema/008-shard-room-state-labs.sql`) shards `labSidecars` one row per patient; core `room_state` row keeps everything else. Read shape unchanged for every consumer (client included) — `sync.js loadRoomState()` reassembles transparently, legacy rooms self-migrate on next write. `interno/room-resolve.js` and `pase-labs.js` deduped onto the same reader instead of hand-rolling their own SQL. New per-shard hard cap `QUOTAS.labShardMaxBytes` (1.9MB) turns any future overflow into a clean `payload_too_large` instead of a raw D1 crash. 77/77 sync-worker tests pass (`npm run test:one -- cloud/sync-worker/src/sync-room-state-shard.test.mjs cloud/sync-worker/src/mutation-guard.test.mjs cloud/sync-worker/src/crypto-at-rest.test.js cloud/sync-worker/src/admin.test.js cloud/sync-worker/src/interno/routes.test.js cloud/sync-worker/src/pase-labs.test.js cloud/sync-worker/src/rooms.test.js cloud/sync-worker/src/lww.test.js cloud/sync-worker/src/mobile-lab-window.test.js`). Not yet deployed — needs `npm run db:migrate:remote` inside `cloud/sync-worker` before the code ships (local migrate hit a pre-existing, unrelated stale `.wrangler` local-D1 cache — verified migration 008 applies cleanly standalone via `sqlite3`). |
| Mixed-expediente lab guard (patient safety) | `docs/superpowers/plans/2026-08-20-mixed-expediente-lab-guard.md` — **built + tested 2026-08-20.** Lab paste with 2+ distinct expediente bases in one block now blocks entirely (`canProcess:false`, nothing saved), shows a Spanish toast naming both expedientes, keeps raw text in `#lab-input`. Covers main paste (`lab-panel-parse.mjs`), paste-anywhere (`paste-smart-model.mjs`/`paste-smart.mjs`), and repo-import/stub-admit (inherit via `canProcess`/status gates, unchanged). Same-patient variants (`1087426` vs `1087426-2`) still pass via base-registro normalization. Follow-on same day: "Actualizar labs" (`lab-repo-batch-import.mjs`/`lab-repo-import.mjs`) now passes `{ replaceOnMatch: true }` through `finalizeBulkLabPaste` → `storeBulkLabBlocks` → `upsertLabHistory`, so a re-fetched set at the exact same fecha+hora fully replaces the stored set instead of merging/accumulating rows — closes the dedup gap and means a correction actually corrects instead of appending. Scoped strictly to `matchKind:'datetime'` (exact-time match); complementary same-day merges (Biometría + Química arriving at different times, same study) are untouched. Normal manual paste keeps the old merge behavior (no `opts` passed). `npm run metrics:check` fails but pre-existing (374→384 before this session's changes even; whole-repo debt, not from this fix). |
| Nube client-encryption compliance review | `docs/superpowers/plans/2026-08-14-nube-client-encryption-compliance.md` |
| Nube E2EE implementation | `docs/superpowers/plans/2026-08-17-nube-e2ee.md` — **built + tested 2026-08-17, by explicit user request overriding the "do not start" below. NOT DEPLOYED.** Content fields (notes/labs/indicaciones/monitoreo/clinicalOps) encrypt client-side; patient identity (name/bed/service) stays plaintext — Interno redesign deferred. Password iteration versioning (schema/007) also built, not deployed. See `docs/core/15-security.md` "Deploy status". Before deploying: resolve the personal-Cloudflare-account + no-DPA gaps in the compliance review above, and re-verify PBKDF2 iteration values against a real D1 migration — the 2026-08-14 incident that broke Nube login for two days was exactly this kind of change. |
| Nube E2EE — existing-room backfill | `docs/superpowers/plans/2026-08-17-nube-e2ee-existing-room-backfill.md` — **approved 2026-08-17, not yet implemented.** Closes the gap where the above only encrypts NEW rooms. Owner's device auto-generates + backfills the DEK and re-encrypts already-stored plaintext content on next login, zero user action. Depends on the E2EE implementation above shipping first. |
| Nube E2EE blind-relay spec | `docs/nube-e2ee-blind-relay-spec.md` — **draft, not built, not adopted.** Bigger alternative redesign (server never sees any metadata, merge moves client-side). Explicitly shelved in favor of the two rows above — do not implement unless the user revisits this decision. |
| Startup lag optimization | `docs/superpowers/plans/2026-08-15-startup-lag-optimization.md` — **do not start** |
| Teal workbench UI redesign | `docs/superpowers/plans/2026-08-17-teal-workbench-ui-redesign.md` — **phase 1 shipped 2026-08-17, pendientes vencido + empty-state follow-up also shipped 2026-08-17.** New design handoff replaces Hybrid H / Warm instrument as source of truth (teal accent, not ink). Tokens + fonts + animations + docs done. Pilot screen (`patient-dashboard/`) now has: vencido (overdue) row styling on the Pendientes card, and a dashed-border box style for the shared empty-state copy. Counters band is confirmed out of scope for this screen (it's a Guardia/Pase pattern) — moved to roadmap items 2/3. Superseded for all remaining scope by the row below. |
| **Teal workbench — full rollout to 8.1.6** | `docs/superpowers/plans/2026-08-19-teal-workbench-full-rollout.md` — **approved 2026-08-19, not yet executed. Blocks 8.1.6 ship.** Single plan for all 11 remaining screens (supersedes the roadmap above), written by CEO after 3 prior redesign failures logged in `MISTAKES.md` (done-on-tests-only, plan fragmentation, no full-surface pass). Three hard gates: human-visible screenshot proof, no sub-plan fragmentation, full-surface style diff per phase. Phase 0 (commit checkpoint + 12-screen screenshot inventory) blocks all other phases — ~152 files of remediation work are uncommitted since `670d4e93`. 5 open decisions (D1–D5) need user answers before their phases start — see the plan's Open decisions table. |
| Labs token cleanup | `docs/superpowers/plans/2026-08-17-labs-token-cleanup.md` — **shipped 2026-08-17.** Roadmap item 1 ("Labs") turned out to be two very different sizes of work once scoped: dead hex fallbacks in `lab.css` cleaned up (done, no visual change), trend arrows + grid layout pushed back to a future plan — needs a design decision on how per-analyte history lookup should work for short-code core panels (BH/QS/ESC/PFHs), which `tend-core.mjs`'s existing catalog doesn't cover. |
| Guardia census table | `docs/superpowers/plans/2026-08-17-guardia-census-table.md` — **shipped 2026-08-17.** Roadmap item 2 ("Guardia"). Card-chip census grid replaced with a Cama/Paciente/Alterados/Pendiente/Estado table (`guardia-census-table.mjs`), vencido/abierto/listo status, Signos + Pendientes counters wired to real census-wide data. Scoped down from the full 6-section mockup: Ingresos counter + 4 right-column panels (Signos recibidos, Pendientes vencidos, Ingresos, Eventualidades, Movimientos) need new data (admission-date schema field, movements tracking) — not built, own future plan. EN CURSO status dropped (no in-progress flag in the todo model). |
| Pilot screen — remove card boxes | `docs/superpowers/plans/2026-08-17-pilot-remove-card-boxes.md` — **shipped 2026-08-17.** Found by directly comparing the running app's dark Resumen screen against mockup `1b` (mockup wants no boxes, single-column reading layout for Signos vitales + Labs). CSS-only change in `patient-dashboard.css`: dropped the `.card` background/border-radius, stacked `.bento.vitals-labs` into one column. `.bento.rest` and `.bento.meds-band` already matched the mockup, untouched. Labs card's internal content shape (envio-grouped vs. mockup's fuera-de-rango/en-rango split) is a separate future plan, not part of this pass. |
| **Teal workbench — full fidelity (active, IN REMEDIATION)** | `docs/superpowers/plans/2026-08-18-teal-workbench-full-fidelity.md` — see the SESSION HANDOFF section immediately below before touching this. Phases 0-10 shipped uncommitted but failed a real visual check by the user; a REMEDIATION punch list is now in progress inside that same plan file. |
| **R+ HF — cardiology HF fork (active)** | `docs/superpowers/plans/2026-08-22-cardio-hf-fork.md` — **approved 2026-08-22 by CEO (Fable) review, not yet implemented.** Turns this repo (fresh R+ clone) into a cardiology heart-failure fork: two modules (Hospitalización, Consulta Externa), Guardia dropped, sala/team partitioning dropped, LAN/sync gated off (not excised), Manejo tab gets cardio meds cards, Resumen tab reorganized for HF at-a-glance reading, Salida drops only VPO (keeps Receta HU), adds Hoja IC docx export + Seguimiento xlsx export (column layout pending client template). Domain logic/export pipeline/icon ported from `/Users/mauriciosalas/Cardionotas`; panel markup built fresh against this repo's own live UI. Branding done so far: `package.json`, `main.js` title, `public/min-version.json` (unrelated stale-version bug fixed along the way, blocked all local testing). Task 1 (icon, red accent, gates module, Guardia removal) still open; Tasks 2-9 not started. |
| **Objective data-entry + real HF forms (active)** | `docs/superpowers/plans/2026-08-22-hf-objective-forms.md` — **approved 2026-08-22, Parts A/B1/B2 and Part C Phases 1-5 shipped 2026-08-22 (all uncommitted).** Toast fix, dropdown conversions (rank/sala, date/time, drug-name selects, dieta references left un-forced per no-catalog finding), shared field kit (`hf-field-kit.mjs`), fenotipo/etiología/ritmo/llenadoCapilar converted to enum selects with legacy-value fallback, INTERCONSULTA band replaced with an HF follow-up band (seeded from last inpatient ronda), and the two new Clínico segments "Consulta IC" (outpatient, Consulta Externa mode) and "Eval. inicial" (ER/admission intake, Hospitalización mode) both built and wired, including the "Abrir consulta de hoy" band button. All new/touched tests pass (schema 47/47, field kit 16/16, navigation 92/92, band 24/24). Two stale pre-existing test assertions (VPO dropped from Salida sections, per the separate cardio-fork plan below) fixed along the way. Remaining: Part C Phase 6 (extend Estado Actual cardio panel for daily inpatient "nota IC" fields — days internamiento, per-day US pulmonar grid, llenadoCapilar/edemaMi migration) and Phase 7 (Resumen chips + export headers). `npm run metrics:check` shows debt 578 vs baseline 0 — pre-existing, this fork has no committed metrics baseline yet, not caused by this work. Three parts: (A) fix mode-switch toast still saying "Interconsulta" instead of "Consulta Externa" (`profile-app-mode.mjs:77`). (B) app-wide: convert every clinical field with a fixed answer set from free-typed text to a dropdown/select (doctor directive — typing skews data), inventoried by file:line in the plan; keep free text only for genuinely unbounded fields (narrative, names, doses), and enlarge any textarea that stays. (C) build three real cardiology HF forms from doctor-supplied paper forms (Consulta de seguimiento, Evaluación inicial, Seguimiento intrahospitalario) as new schema (`lib/cardio/hf-*.mjs`, JSON under `patient.cardio.*`, no SQL migration) + new Clínico segments/screens, replacing the wrong "INTERCONSULTA / Servicio solicitante / Motivo de consulta" band still shown in Consulta Externa mode. CEO (Fable) full plan for Part C is in the plan file's Part C section, phased 1-7. |

---

## SESSION HANDOFF — 2026-08-18

**This is a new session start. No code was changed in this session — this is a status check only, to orient whoever works next.**

**Repo state, verified just now:** 152 changed paths (97 modified, 46 untracked, 5 added, 4 added+modified). Same uncommitted pile described in the remediation section right below this one. Nothing has been committed since `670d4e93` (2026-08-17, teal palette phase 1).

**Remediation plan status:** `docs/superpowers/plans/2026-08-18-teal-workbench-full-fidelity.md` has a "REMEDIATION" section header and the new screenshot-verification rule, but **no punch list yet.** Nobody has re-run `scripts/verify/screenshot.mjs` against each of the six-plus mismatched screens named in `MISTAKES.md`'s 2026-08-18 entry (Laboratorio, Texto de egreso, Nota de evolución, Pendientes, calendar-popover wiring) to confirm current state or build an actual fix list.

**Known blocker, unresolved:** the DEMO PÉREZ fixture used by the screenshot tool is stale and renders an empty dashboard (~2365 chars, no real vitals/labs/meds). A `lead-dev` agent was dispatched to fix this last session and was killed mid-task, before making changes. Fixing this fixture is the next concrete step — without it, the screenshot tool can't verify Laboratorio/Manejo/Resumen with real data.

**Next action for the next session:** re-dispatch a `lead-dev` agent to fix the DEMO PÉREZ fixture (compare its data shape against what `dashboard-model.mjs` / `labs-glance-model.mjs` / `dashboard-html.mjs` read today), then use `scripts/verify/screenshot.mjs` to screenshot each of the six named screens against the mockup and turn that into a real punch list in the plan file's REMEDIATION section — one item per confirmed mismatch, each closed only after a fresh screenshot proves it.

---

## SESSION HANDOFF — 2026-08-18, teal workbench remediation (READ THIS FIRST)

**Context is high in the session that wrote this — it is being handed off. Read this whole section, then `docs/superpowers/plans/2026-08-18-teal-workbench-full-fidelity.md`'s "REMEDIATION" section, then `MISTAKES.md`'s 2026-08-18 entry, before doing anything else.**

**What happened, short version:** A CEO-planned, 12-phase full UI redesign (phases 0-10) was implemented and each phase was marked "Done" on unit tests + clean build alone — nobody opened the running app next to the design mockup. The user did that themselves and found six-plus screens did not actually match. Full accountability writeup and root cause: `MISTAKES.md` → "2026-08-18 — ran a 10-phase, ~100-file UI redesign to 'done' on unit tests alone, never opened the app". **New standing rule from that entry: no phase/screen counts as Done until a screenshot of the actual running app is compared directly against the mockup — not inferred from a subagent's self-report.**

**Working tree state:** ~152 files changed, ALL UNCOMMITTED, across `public/js` (121), `public/styles` (14), `public/partials`, `lib/nota-evolucion`, `main.js`, `docs/core`, `scripts/verify` (new), `MISTAKES.md`, `design.md`. This is 10 phases of wanted, real work — **do not `git reset`/`git checkout`/discard any of it.** `npm run build:ui` is clean and the full test suite passes as of the last check this session. `npm run metrics:check` score is 74 (down from 114 after this session's own cleanup) — the remaining 74 is pre-existing Nube/cloud-sync debt, not from this redesign; do not chase it here.

**New verification tool, built this session (user explicitly approved installing it):** `scripts/verify/screenshot.mjs` uses Playwright's Electron driver (`playwright` was added as a devDependency) to launch a fully isolated, throwaway copy of R+ — separate `--user-data-dir`, so it never touches the user's real running app or data — and takes a screenshot. Usage:

```bash
node scripts/verify/screenshot.mjs <output.png> [--wait=2500] [--eval=path/to/script.mjs]
```

The `--eval` script exports a default `async (page) => {...}` that runs before the screenshot (e.g. `scripts/verify/goto-demo.mjs`'s `setupDemo(page)` clicks through onboarding — "Solo este equipo" → `clinical-onboard-local-confirm-btn` — and triggers `#btn-start-presentation` ("Modo presentación DEMO PÉREZ") to load fake patient data; `clickTopTab`/`clickSubTab` helpers are exported from the same file for navigating to a specific screen). `scripts/verify/debug-dom.mjs` is a template for dumping DOM state (innerHTML length, computed style, bounding rects) when a screenshot looks wrong and you need to know why, rather than guessing.

**IMPORTANT — the window never appears on screen, by design, per explicit user request ("don't take over my screen" / "disrupts my flow").** `screenshot.mjs` moves every BrowserWindow to `(-32000, -32000)` and calls `setSkipTaskbar(true)` right after launch. This requires `main.js`'s `backgroundThrottling` to be conditionally disabled when `R_PLUS_VERIFY_MODE=1` is set (see the small, scoped diff in `main.js` — search for `R_PLUS_VERIFY_MODE`), otherwise Chromium treats the off-screen window as occluded and pauses the renderer's timers/rAF, so nothing actually mounts. This env var is never set in normal usage; it is safe.

**Known unresolved problem with the verification tool itself:** the built-in "DEMO PÉREZ" presentation-mode fixture (`public/js/pitch-demo-export-perez.mjs` / `-data.mjs`) is stale — last updated months ago, predates several current schema/renderer expectations. When triggered, the patient name and shell render, but `#patient-dashboard-mount .patient-dash` collapses to ~17px tall with almost no real vitals/labs/meds content (innerHTML ~2365 chars, way short of a real populated dashboard). **This must be fixed before the screenshot tool is useful for verifying the Laboratorio/Manejo/Resumen screens with real-looking data.** A `lead-dev` agent was dispatched to fix this but was killed mid-task by the user before making any changes — it is not started. Re-dispatch it (see prompt pattern used in this session: compare the demo data shape against what `dashboard-model.mjs`/`labs-glance-model.mjs`/`dashboard-html.mjs` actually read from a patient today, and update the demo fixture, not the renderer).

**REMEDIATION punch list status** (full detail in the plan file's REMEDIATION section):

| # | Item | Status |
|---|------|--------|
| — | DEMO PÉREZ stale fixture (blocks visual verification of items below) | **Fixed 2026-08-18.** Root cause: lab entry dates in `tour-pitch-labs.mjs` / `tour-pitch-cultivos-some.mjs` were hardcoded to May 2026, so the "hoy" (today) filter in `labs-glance-model.mjs` never matched real "today" — the Resumen Labs card and Laboratorio tab always showed empty/wrong-day data. Changed to `dayOffset`-relative-to-today (same pattern `tour-pitch-monitoreo.mjs` already used). Verified via `scripts/verify/screenshot.mjs`: Resumen Labs card and Laboratorio tab both now show real, correctly-dated data. Note: the task brief pointed at `pitch-demo-export-perez.mjs`/`-data.mjs` — those are a separate JSON-export code path, NOT what "Modo presentación" actually seeds; fixed the real seed files instead (also patched the export file's call site for API consistency). |
| 1 | Nota de evolución must become the primary tab, not a hidden secondary button | **User clarified 2026-08-18: Nota de evolución is only visible in Modo interconsultas, by design.** Not a bug — drop from punch list. |
| 2 | Laboratorio — still a flat text blob, only trend arrows added; mockup wants a structured card/table | Confirmed still true via fresh screenshot 2026-08-18 (post-fixture-fix). Not started. |
| 3 | Pendientes — old checkbox-list UI, needs the PRIOR/PENDIENTE/QUIÉN/VENCE `wb-table.mjs` layout | Not started (not re-screenshotted this session). |
| 4 | "Texto de egreso" (Manejo) — inline paragraphs, needs to become the compact modal from the mockup | **User dropped from scope 2026-08-18: not needed.** |
| 5 | Calendario popover — `workbench/date-popover.mjs` built in Phase 3 but never wired to any real screen | Confirmed still true 2026-08-18: `grep -rln "openDatePopover(" public/js` returns only the component's own file — zero call sites anywhere else. Not started. |
| 6 | Pase gaps — Manejo-within-Pase needs categorized columns; Cultivos + Eventualidades panels missing | Not started (not re-screenshotted this session). |
| 7 | Movimiento (11c) — loading-skeleton / single-pulse-alert / inline-progress-button states | Not started (not re-screenshotted this session). |

**Recommended next action for the fresh session:** the fixture blocker is cleared, so items 2, 3, 5, 6, 7 (each its own multi-file build) can now be verified and worked one at a time with `scripts/verify/screenshot.mjs` — direct `document.getElementById(id).click()` inside the `--eval` script is more reliable than the `clickTopTab`/`clickSubTab` text-locator helpers in `goto-demo.mjs`, which can match a hidden same-text element elsewhere on the page (e.g. a settings-dropdown entry) instead of the real tab.

---

## What happened (do not re-investigate)

| When | Fact |
|------|------|
| 2026-08-14 morning | `v8.1.3` GitHub Release existed and was Latest |
| ~11h before lock | Failed login `189.175.111.234` Monterrey |
| ~9h before evening | GitHub staff: `user.suspend` → password randomized → revoke all OAuth (CLI, Cursor, Copilot, …) → `user.unsuspend` |
| Email | Standard “suspicious login / force password reset”. Mentions infostealer as a common cause. Not a ToS/malware-in-Releases letter |
| After lock | Releases page empty. **Tags remain** (`v8.1.4` … `v8.0.8`). Unauthenticated `github.com/mausalas99/r-mas` **404** (private or hidden) |
| This machine `gh` | Keyring token was dead; Mauricio re-authed and added SSH `SHA256:aYBWi+4xbr5okYzL0desqwOiBCoLFUqC2U1B417xsX0` |
| Local scan | No AMOS/Atomic persistence. No AV. Only old `curl\|sh` was June FCC installer. Not a proof of clean — Malwarebytes still recommended |
| Support | Ticket open (`djsalas99@gmail.com`). First reply was **intake template** (asked username/email again). Saturday unsuspend possible, not likely |
| GitLab | Public project under **rmas-group1** / slug **rmas**. Release **8.1.4** notes exist. Web UI cannot upload binaries — use `glab release upload` |

`scripts/release.js` does **not** delete other Releases. This machine’s `gh` could not have wiped them (token invalid). Staff lock + missing Release objects; tags are git and stayed.

---

## What still works locally

All 8.1.4 artifacts are in `/Users/mauriciosalas/R+/dist`. Upload **these** names (GitHub or GitLab):

- `R+-8.1.4-Mac-Apple-Silicon.dmg`
- `R+-8.1.4-Mac-Intel.dmg`
- `R+-8.1.4-Windows.exe`
- `R+-8.1.4-autoupdate-mac-arm64.zip` + `.blockmap`
- `R+-8.1.4-autoupdate-mac-x64.zip` + `.blockmap`
- `R+-8.1.4-x64.exe` + `.blockmap`
- `latest-mac.yml` (points at `autoupdate-mac-*` zips)
- `latest.yml`
- Notes: `GITHUB_RELEASE_NOTES_8.1.4.md`

Do **not** upload `R+-8.1.4-arm64.dmg`, `*-x64.dmg`, `*-arm64.zip`, `*-x64.zip`, or `*.dmg.blockmap`.

GitHub tag already exists: **`v8.1.4`**. Recreate the Release on that tag. Do not make a new tag.

---

## Constraints (hard)

1. **Old apps** (8.1.2 / 8.1.3 / 8.1.4 already installed) only check `mausalas99/r-mas`. GitLab and the Worker do not reach them until they install a new build **or** GitHub Releases are public again.
2. Do **not** open a second GitHub account.
3. Do **not** put the feed Worker on `cloud/sync-worker` (Nube / PHI rooms).
4. Do **not** proxy 140 MB zips through Cloudflare.
5. Do **not** put a GitHub PAT in the Worker.
6. Dual Electron providers: **no**. One generic URL → Worker. Worker fails over.
7. This weekend residents get the Silicon DMG **by hand**. Auto-update of old copies waits for GitHub.

---

## Implement (this session)

Spec is the contract: `docs/superpowers/specs/2026-08-15-update-feed-worker-design.md`.

1. `cloud/update-worker/` — probe GitHub then GitLab; rewrite yml URLs to absolute; `/health`.
2. `lib/update-feed.mjs` — `UPDATE_FEED_MODE = 'worker' | 'github'` and `UPDATE_WORKER_URL`. Default for **new** builds: `worker`.
3. Wire default `setFeedURL` in `main.js` from that module. Leave downgrade generic-on-GitHub until GitHub is back unless the spec’s optional step is cheap.
4. Point `min-version-fetch.mjs` and `STABLE_VERSIONS_RAW_URL` at the Worker first.
5. Tests via `npm run test:one`. Register new `*.test.mjs` in `package.json` `scripts.test`.
6. Do not run full `npm test`. Do not `build:ui` unless you edit `public/js`.
7. Do not publish. Do not `gh release`. Do not refresh metrics baseline.

**Revert path (document in code comment + README of the Worker):**

```
GitHub public again
  → upload v8.1.4 assets to existing tag
  → old apps update
  → Worker /health using=github
  → optional later: UPDATE_FEED_MODE=github
```

---

## Closed (do not reopen)

- Paciente Resumen pills, hide-sidebar, ⌘1/⌘E/⌘T, census Filtros
- Nube V1 crypto (plaintext D1 accepted)
- Graph-memory pipeline (landed 2026-08-14). Do not ingest PHI. Do not add it to the Electron app
- Mac App Store as a weekend ship
- Changing 8.1.4 dist feed

## Dirty / local (do not fold into this commit unless they are the feed work)

`min-version.json`, `scripts/write-release-yml.js`, `scripts/graph-memory/`, `.mcp.json.example` may be dirty. Only stage files you change for the Worker + feed module.

---

## Test plan

```bash
npm run test:one -- cloud/update-worker/src/feed.test.mjs
npm run test:one -- lib/update-feed.test.mjs
# plus any colocated test you add
```

Pass: GitHub 200 → yml uses GitHub absolute URLs. GitHub 404 + GitLab 200 → GitLab URLs. Both fail → 502. `UPDATE_FEED_MODE=github` does not call the Worker.
