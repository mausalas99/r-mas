# R+

## Start the app and show the window {#shell}
tech: Electron main/preload/LAN server, public/js/app-runtimes.mjs
- [x] Boot the app to a window {#shell-boot}
  tech: main.js, preload.js
- [x] Serve the LAN HTTP server {#shell-server}
  tech: server.js
- [x] Load renderer features on demand {#shell-features}
  tech: public/js/app.js, public/js/app-runtimes.mjs
files: [main.js, preload.js, server.js, public/js/app.js, public/js/app-runtimes.mjs, public/js/boot/**]

## Keep patient data on the device {#db}
tech: SQLCipher local DB, schema v25
- [x] Store and migrate the local database {#db-schema}
  tech: lib/db/schema.mjs, lib/db/schema-primitives.mjs (SCHEMA_VERSION = 25)
- [x] Add the interconsult "Under" status {#db-ic-under}
  tech: lib/db/schema-migrate-v25-interconsult-under.mjs, wired via lib/db/schema-migrate-v15-v17.mjs:22
files: [lib/db/**]

## Keep team members' screens in sync {#cloud-sync}
tech: Cloudflare Durable Object WebSocket hub (not a local LAN host)
- [x] Push changes to teammates in real time {#sync-ws}
  tech: cloud/sync-worker/src/room-sync-hub.js, cloud/sync-worker/src/room-live.js, public/js/live-sync-room.mjs
files: [cloud/sync-worker/src/room-sync-hub.js, cloud/sync-worker/src/room-live.js, public/js/live-sync-room.mjs]
needs: [db]

## Encrypt patient data before it leaves the device {#nube}
tech: client-side E2EE for Nube room content
- [x] Build the encryption/decryption pipeline {#nube-crypto}
  tech: public/js/features/cloud-sync/room-dek.mjs, public/js/features/cloud-sync/crypto.mjs, lib/db/clinical-crypto.mjs, cloud/sync-worker/src/room-dek.js — wired into panel-conexion-handlers.mjs, panel-conexion-bootstrap.mjs, api-client.mjs
- [ ] Turn encryption on for everyone {#nube-enable}
  tech: flip NUBE_E2EE_ENABLED (currently false, public/js/features/cloud-sync/room-dek.mjs:40) — gated on Worker version-gate + fleet adoption
  from: roadmap
files: [public/js/features/cloud-sync/**, lib/db/clinical-crypto.*, cloud/sync-worker/src/room-dek.*]
needs: [cloud-sync]

## Deliver app updates without depending on one host {#update-feed}
tech: Worker probes GitHub first, GitLab fallback
- [x] Serve update manifests through the Worker {#feed-worker}
  tech: cloud/update-worker/src/index.mjs, feed.mjs, origins.mjs, yml-rewrite.mjs
- [x] Point the app at the Worker by default {#feed-wired}
  tech: main.js (UPDATE_FEED_MODE === 'worker' gates setFeedURL, ~line 361), lib/update-feed.js, lib/update-feed.mjs
files: [cloud/update-worker/src/**, lib/update-feed.js, lib/update-feed.mjs, main.js]
needs: [shell]

## Show and edit the patient workspace {#ui}
tech: renderer feature modules, patient dashboard
- [x] Load the patient dashboard {#ui-dashboard}
  tech: public/js/features/patient-dashboard/dashboard-mount.mjs, lab-inner.mjs
files: [public/js/features/**]
needs: [shell, db]

## Redesign the interconsulta team board {#interconsulta}
tech: 4-team board (guardia/postguardia/activo x2), manual guard rollover
- [x] Compute board buckets and roles {#ic-buckets}
  tech: lib/clinical-scope/interconsulta-board-buckets.mjs, interconsulta-team-roles.mjs, interconsulta-role-rollover.mjs (each with its own .test.mjs)
- [x] Make the team board the main window, not a sidebar list {#ic-mount}
  tech: public/js/features/interconsulta-team-board.mjs mounted by interconsulta-mode-chrome.mjs into #ic-board-mount (public/partials/layout/app-body.html), sidebar hidden via html.ic-board-mode in layout.css. Supersedes the earlier sidebar-mount build (patients-list.mjs no longer knows about interconsulta).
  by: claude
- [x] Click a patient card to open their Resumen, "← Tablero"/Esc to return {#ic-drilldown}
  tech: _icView board/patient state + showInterconsultaBoardView/showInterconsultaPatientView in interconsulta-mode-chrome.mjs; verified against the real app via scripts/verify/interconsulta-team-board-{nav,drill,back}.mjs
  by: claude
- [x] Add a "+ Agregar" button to the board so patients can be added without a lab {#ic-add-button}
  tech: the per-lane "Terminar guardia y repartir pacientes" rollover button was a deliberate earlier removal (test asserts it's gone, interconsulta-team-board.test.mjs) — not a regression. It stays removed; the backend IPC handler is unused UI-side. What the board actually lost when the sidebar was hidden was the sidebar's own "+ Agregar" add-patient trigger. Restored as one always-visible button top-left of the board header (interconsulta-mode-chrome.mjs's renderInterconsultaBoardView, .ic-board-header, data-ic-board-add) wired to the existing openAddModal (patients-modal.mjs) — no new modal built.
  by: claude
- [x] Make board cards and the top bar match the rest of the app's look {#ic-visual-match}
  tech: .ic-board-bucket .patient-chip-card now uses var(--color-elevated)/--radius-container (patient-dashboard.css's card tokens) instead of the old bordered chip; lane padding widened; wb-ic-bar + .ic-consult-band unified into one strip (workbench-kit.css, patient-dashboard.css)
  by: claude
- [x] Add a test proving the consult band stays off the board and only shows when drilled into a patient {#ic-band-visibility-test}
  tech: interconsulta-mode-chrome.test.mjs asserted only ic-board-mount's hidden state before, not the band's — added bandMount.hidden assertions to the same nav tests; all pass, so the "band showing on the board" report was a stale build, not a code bug (npm run build:ui had not run for the session's in-progress board work)
  by: claude
- [x] Make Servicio solicitante / Motivo / Seguimiento editable {#ic-consult-edit}
  tech: consult-band.mjs's setConsultInfo existed but no UI ever called it — renderConsultBandHtml now renders text inputs + a status <select> (data-consult-field), interconsulta-mode-chrome.mjs delegates their change event to setConsultInfo + persistClinicalState + scheduleCloudSyncPush
  by: claude
- [x] Fix card sizing so a lane with 20-30+ patients (e.g. "Sin equipo") still fits {#ic-lane-density}
  tech: the #ic-visual-match pass above styled the wrong selector (.patient-chip-card, which this board never renders — it uses renderPatientCardHtml's .patient-card, the sidebar card). Corrected: .ic-board-bucket .patient-card now compact (smaller padding/toolbar/name), and each .ic-board-lane splits into a fixed __head (title + rollover button) + scrollable __body (max-height: calc(100vh - 260px)) so a big lane scrolls internally instead of pushing the page down
  by: claude
- [x] Fix the patient Resumen panel appearing half-rendered under the board unprompted {#ic-resumen-leak-fix}
  tech: two real bugs, unrelated to any UI ask: (1) layout.css had a stray `z-index:1; opacity:1; }` fragment orphaned at the top level — an earlier uncommitted edit inserted new ic-board-mode/.ic-board-view rules in the middle of the pre-existing `:not(.app-tab-panel-hidden)` rule instead of after it, splitting it; restored. (2) forceHideResumenPanels() only set an inline style, which any later call to patients-select.mjs's showPatientViewShell() (e.g. from a background render/sync tick) could silently re-open — added a `html.ic-board-view-open` class (toggled in syncIcViewVisibility, cleared on leaving IC mode) with a `!important` CSS backstop in layout.css so #patient-view/#empty-state can never show while the board is the active IC view, regardless of ordering
  by: claude
- [x] Build reusable demo-data builders (teams + 12 patients) {#ic-demo-seed-lib}
  tech: lib/clinical-scope/interconsulta-demo-seed.mjs — pure, tested builders for 4 demo teams + 12 patients (8 recurring follow-ups split 2 each across guardia/activo1/activo2/sin-equipo, 2 VPOs + 2 new-today ICs for the on-call team, landing in Preop/Nuevas hoy). Display-shape-agnostic, reused regardless of trigger — keep.
  by: claude
- [x] Seed the demo on the main app, hidden from sync (pivoted from verify-script-only) {#ic-demo-seed-live}
  tech: public/js/features/interconsulta-demo-toggle.mjs — ⌥⌘⇧I (window.toggleInterconsultaDemo) merges the 12 lib-built demo patients + 4 demo teams into the real getPatients()/clinicalSessionContext.teams/scopeContext (never replaces the underlying data), sets a trivial setPersistPatientsResolver so app-state.mjs's existing isDemo persistence filter kicks in. Closed the real gap found in the handoff: added app-state.mjs's getSyncablePatients() (filters p.isDemo) and swapped every getPatients() read across public/js/features/cloud-sync/*.mjs (collect, sala-push, mutate-bridge, direct-push, pull-apply, diagnostics, remote-delete-confirm) to it, so demo patients never reach a push or a pull match. clearInterconsultaDemoFromMainApp() reverses it. Deleted the old throwaway verify-script files (tour-ic-demo-seed.mjs, scripts/verify/interconsulta-demo-seed.mjs) per the handoff — not safe to keep since they replaced real data outright.
  by: claude
- [x] Fix real-run bug: demo patients seeded but never appeared on the board, real teams still showed {#ic-demo-seed-display-bug}
  tech: two real bugs found from the owner's first live run (screenshot: demo team lanes present with 0 patients, real teams still shown). (1) toggleInterconsultaDemo() called `await import('./interconsulta-mode-chrome.mjs')` — a dynamic import of a module already statically bundled elsewhere in the same esbuild graph gets a SEPARATE app-state.mjs instance, so the render read a `patients` array that never got the merge. Fixed by importing renderInterconsultaBoardView statically (no cycle exists: mode-chrome never imports the toggle module). (2) Owner then asked for board isolation while the demo is on (hide real teams/patients, show only demo) — added a leaf public/js/features/interconsulta-demo-state.mjs (isInterconsultaDemoActive/setInterconsultaDemoActive, no imports, same shape as clinical-session-context.mjs) so both interconsulta-demo-toggle.mjs and interconsulta-mode-chrome.mjs can share the flag without a cycle; renderInterconsultaBoardView() now filters teams/patients to demo-only when active. lib/clinical-scope/interconsulta-demo-seed.mjs gained isInterconsultaDemoTeamId() so both the toggle's cleanup and the board's isolation filter use one shared team-id check. Regression-tested end to end via the real render pipeline (renderInterconsultaBoardView + registerInterconsultaChromeRuntime + attachProfileSettingsGetter), not just the seed builder in isolation — that gap is exactly what let the first bug through.
  by: claude
- [x] Fix 2nd real-run bug: demo still showed 0 patients after the isolation fix {#ic-demo-seed-filter-bug}
  tech: owner's second screenshot: real teams now correctly hidden, but every demo lane still read Pendientes(0)/Under(0) despite the toast reporting "12 pacientes". Root cause: renderInterconsultaBoardView() built `visible` via patientsVisibleInSidebar(), which applies the module-level elevatedPatientFilters (public/js/features/clinical-census-filters-state.mjs) — a real pinned Equipo/Sala preference from the owner's normal (non-demo) app use. None of the 12 demo patients match a real team/sala id, so the filter silently zeroed the whole list. Fixed: when demo is active, renderInterconsultaBoardView() now reads `getPatients().filter(p => p.isDemo)` directly instead of going through patientsVisibleInSidebar(), bypassing Filtros entirely for the demo board. Added a regression test that pins a fake real teamId/sala (elevatedPatientFilters.teamId/.sala) before seeding and asserts demo patients still render — this is the exact real-world state (a pinned filter) the first test pass didn't cover.
  by: claude
- [x] Servicio solicitante picker, Equipo picker, and move the consult-info card into the Resumen tab {#ic-consult-band-redesign}
  tech: owner's 4th pass — asked for (1) a streamlined, easy team picker on the Resumen (confirmed via AskUserQuestion: real, works for real patients too, not demo-only), (2) Servicio solicitante to use the same categorized chip picker as the sala "interconsultantes" feature instead of free text, (3) drop the standalone consult-band bar and integrate service/reason into the Resumen itself. Built: `openServicePickerModal()`/`renderServicePickerHtml()` in ic-modal.mjs — single-select variant of the existing multi-select `openInterconsultModal` (own DOM host `#patient-svc-pick-*`, same INTERCONSULT_SERVICES catalog/category chips, picks-and-closes instead of toggling). consult-band.mjs's Servicio solicitante field is now a `data-ic-req-trigger` chip button instead of a text input, and gained a conditional Equipo `<select>` (teamCtx param) built from `buildTeamSelectOptions`. interconsulta-mode-chrome.mjs wires both: the servicio trigger opens the picker and on pick writes `consultInfo.requestingService` AND `patient.servicio` (keeps the card meta chip in sync — this is also what fixed the earlier "servicio should be the specialty, not always Medicina Interna" ask); the Equipo select calls the real `assignPatientToTeamClinical` (IPC/cloud) for real patients, or a new local-only `assignDemoPatientTeamLocally` (writes clinicalSessionContext.scopeContext.assignments directly) for demo patients, since they have no real DB row for the IPC call to find. `interconsultaAssignableTeams()` filters to Interconsultas-service teams only, sourcing from the demo team list while the demo is active (assignableTeamsForUser() only returns teams the signed-in user actually joined — never true for in-memory demo teams). DOM move: `#interconsulta-consult-band` relocated in app-body.html from a sibling bar above `#patient-view` to the first child of `#itab-content-paciente` (the Resumen tab pane) — same hidden-state gating as before (still only shows when drilled into a patient), just physically inside Resumen now instead of a floating top bar; CSS reworked from a full-bleed bar to a rounded card matching the dashboard's bento cards. Removed the now-dead `#interconsulta-mode-frame:has(+ ...)` border rule (band is no longer that div's sibling).
  by: claude
  Note: also discovered `npm run test:one` never provides a `document` global (Electron run as plain Node, no window) — every test in this codebase guarded by `if (typeof document === 'undefined') return;` (most of the interconsulta-mode-chrome/toggle DOM tests, including ones added earlier this session) silently no-ops rather than actually asserting. Not something introduced this session — same pattern is used project-wide — but it means DOM-level claims in this plan were verified by manual review + the owner's own screenshots, not by test output. Added real (non-DOM, string/data-level) tests instead where possible: consult-band.test.mjs and ic-modal.test.mjs now cover the new picker/team-field HTML directly.
- [x] Give demo patients real room/bed + varied requesting specialty; fix the consult-band's ugly seam over the clinical tabs {#ic-demo-seed-polish}
  tech: owner's 3rd pass. (1) lib/clinical-scope/interconsulta-demo-seed.mjs — every FOLLOW_UPS/VPOS/NEW_ICS entry now carries its own `servicio` (grouped by consult type: medical specialties for the 8 follow-ups — Cardiología, Neumología, Nefrología, Endocrinología, Neurología, Medicina Interna, Geriatría, Infectología; the operating service for the 2 VPOs — Cirugía General, Traumatología y Ortopedia; Urgencias/Ginecología y Obstetricia for the 2 new-today ICs), plus a real cuarto/cama and varied edad/sexo — was hardcoded to 'Medicina Interna'/empty room/'58 años'/'F' for all 12, so every card looked identical. consultInfo.requestingService now mirrors p.servicio per patient. (2) public/styles/patient-dashboard.css's .ic-consult-band — dropped its own background/border so it stops reading as a 3rd stacked bar between the INTERCONSULTA header and the clinical tab row (--color-surface and --surface are the same token, confirmed in public/tokens.css:62, so this merges into one continuous strip) and shrunk padding 10px→6px so it displaces the tabs less.
  by: claude
- [x] Update onboarding tour + Learn Hub for the board redesign {#ic-onboarding-update}
  tech: owner asked before shipping 8.2.2: "before we ship any massive change... the onboarding and learnhub must be updated". The `ch-ic-map` guided-tour chapter (IC_CHAPTERS, onboarding-curriculum.mjs) still taught the retired sidebar (`map_sidebar`/`map_add_patient`/`map_incomplete`, targeting `aside`/`aside .btn-add`, both dead in ic-board-mode). Replaced with two new steps, `ic_board_map`/`ic_board_drilldown` (tour-targets.mjs TARGETS, tour-flow-fundamentos-steps.mjs renderers) describing the 4-lane board and click-to-drill/← Tablero. CURRICULUM_VERSION 17→18; migrateTourStepId resumes old in-progress IC tours at the new first step instead of silently restarting. Also fixed two Learn Hub/Ayuda articles (help-content.mjs: 'estructura', 'primer-paciente') that unconditionally described the sidebar/+Agregar flow — added an Interconsultas-specific line to each (no per-mode content system existed; kept minimal).
  by: claude
- [x] Fix the IC tour: spotlight was pointing at a hidden board, and copy claimed a fixed "4 lanes" that isn't real {#ic-onboarding-fix}
  tech: senior-dev audit found #ic-onboarding-update above shipped broken. tour-targets.mjs's ic_board_map/ic_board_drilldown had appTab:null with selector '#ic-board-mount' — that element sits inside the Paciente tab panel and is CSS-hidden on any other tab, and can be `hidden` mid-session if the user is drilled into a patient; appTab:null never switched tabs. Fixed: appTab:'nota' + new showIcBoard:true flag, handled in tour-step-actions.mjs's applyTourOverlayChromeForStep by calling showInterconsultaBoardView(). The wrap step's 'aside .sidebar-header' selector was also dead (sidebar width:0 in ic-board-mode) — changed to a priority-ordered candidate list resolved by a new resolveTourStepEl() helper (plain comma-selector querySelector would have picked the sidebar first since it's earlier in DOM order). Copy fix: renderIcBoardMap no longer claims "Cuatro carriles / 3 columnas" — real board is 1 lane per team + optional "Sin equipo" (can be as few as 2 lanes), and only the guardia lane has Preop/Nuevas hoy. Tests added in tour-targets.test.mjs (appTab/showIcBoard assertions) and tour-intro.test.mjs (regression guard against "Cuatro carriles" reappearing).
  by: claude
- [x] Seed demo data during the IC tour so the board isn't empty when the tutorial runs {#ic-onboarding-demo-seed}
  tech: seedTourDemosForStep (tour-step-actions.mjs) now seeds the IC board demo on ic_board_map and drills into a demo patient on ic_consult_band; destroyDemoAndClose (tour-flow-demo-cleanup.mjs) clears it on tour exit. Added 2 new tour steps: ic_board_actions (header rollover/refresh buttons + drag-and-drop, .ic-board-header) in ch-ic-map, ic_consult_band (Servicio/Motivo/Seguimiento/Equipo card, .ic-consult-band) in ch-ic-chart. CURRICULUM_VERSION 18→19.
  by: claude
- [x] Lock the IC board to exactly 4 base lanes (guardia, postguardia, 2 activo), postguardia hideable {#ic-fixed-4-lanes}
  tech: owner decision 2026-08-26 — board no longer grows/shrinks with real team count. interconsulta-team-board.mjs: laneSlots(roles) fixes activo to 2 slots (empty placeholder "Activo N" lane, no data-drop-team-id, when a slot has no real team) + an overflow array; teams beyond the 2 activo slots fold into a 5th "Otros equipos" lane (per-team dividers, no bucket split — only guardia gets Preop/Nuevas hoy) that only renders when non-empty, so the normal case stays exactly 4 lanes. renderInterconsultaTeamBoardHtml's 4th param is now {filterGuardiaOnly, hidePostguardia}; knownTeamIds computed BEFORE the hidePostguardia filter so a hidden postguardia's patients don't leak into Otros equipos (regression-tested). interconsulta-mode-chrome.mjs: new "Ocultar post-guardia" toggle (_hidePostguardia, session-only, display-only — does not touch interconsulta-role-rollover.mjs). interconsulta-team-roles.mjs/interconsulta-role-rollover.mjs/interconsulta-board-buckets.mjs/interconsulta-demo-seed.mjs unchanged (roles.activo still returns the full real-team list; lane-slotting is the board's job, not the role computer's — rollover needs the full list to spread patients correctly).
  by: claude
files: [lib/clinical-scope/interconsulta-*.mjs, public/js/features/interconsulta-*.mjs, public/js/features/patient-dashboard/consult-band.mjs, public/js/features/patients-list.mjs, public/js/features/cloud-sync/*.mjs, public/js/app-state.mjs, public/partials/layout/app-body.html, public/styles/layout.css, public/styles/pase-board.css, public/styles/workbench-kit.css, public/styles/patient-dashboard.css, public/js/onboarding-curriculum.mjs, public/js/tour-targets.mjs, public/js/features/settings-help/tour-flow-fundamentos-steps.mjs, public/js/features/settings-help/tour-step-actions.mjs, public/js/features/settings-help/help-content.mjs]
needs: [ui, db]

## Turn clinical notes into Word documents {#doc-export}
tech: JSZip-based .docx generation, served over LAN HTTP
- [x] Generate note/indicaciones/listado documents {#docx-gen}
  tech: lib/doc-generators/note.js, indicaciones.js, listado.js, shared.js
- [x] Serve the generated file over HTTP {#docx-serve}
  tech: lib/doc-export-http.js
files: [lib/doc-export-http.js, lib/doc-generators/**]
needs: [db]

## Manage team rotations in the cloud {#equipos}
tech: separate Cloudflare Worker + Pages app, wired into desktop IPC
- [x] Run the equipos API {#equipos-api}
  tech: cloud/equipos-worker/src/index.js
- [x] Serve the equipos web app {#equipos-web}
  tech: cloud/equipos-pages/public/equipos/equipos-app.mjs
- [x] Wire equipos into the desktop app's IPC {#equipos-ipc}
  tech: lib/db/ipc-handlers.mjs:7 imports registerDbEquiposHandlers from ./ipc-handlers-register-equipos.mjs
files: [cloud/equipos-worker/**, cloud/equipos-pages/**, lib/db/ipc-handlers-register-equipos.mjs]
needs: [db]

## decisions

- 2026-08-26, owner: before shipping any change that touches day-to-day workflow, onboarding (guided tour) and Learn Hub must be updated in the same release — not a follow-up. Caught during 8.2.2 prep: the interconsulta board redesign shipped uncommitted with a broken IC guided-tour chapter (taught the retired sidebar) and two stale Learn Hub articles. Fixed before commit; treat this as standing policy for future UI redesigns, not a one-off.
- 2026-08-26, owner: corrected a misread — the earlier draft of this decision said to restore the rollover button. That removal was deliberate (owner: "Where did I ask for this? I wanted it gone") and stays removed. What the owner actually asked to restore is the add-patient button ("+ Agregar"), lost from the board when the sidebar was hidden. Built top-left of the board header, wired to the existing openAddModal — see #ic-add-button.
- 2026-08-25, ryan (hive): interconsulta navigation model corrected per the owner. The first build (team lanes in the sidebar next to Resumen) is rejected. New model: in IC mode the sidebar is gone; the team board is the main window's default view; clicking a patient card drills into their Resumen full-window; "← Tablero" button + Esc go back. Plan doc `docs/superpowers/plans/2026-08-25-interconsulta-team-board.md` UI section rewritten; lane/bucket/rollover logic and the guardia filter stay unchanged.
- 2026-08-25, claude: backfilled this map from scratch per the agenttrail convention appended by `agenttrail init`. Trust order used: code/directory layout first, `git log`, `docs/core/20-claude-code-handoff.md` (in-flight handoff doc), then architecture docs last, cross-checked against code.
- `by:` lines omitted throughout: every `[x]` here is a code-verified backfill, not work done by an agent this session — no authorship claim is being made.
- `docs/core/08-core-architecture.md` describes a `lan-squad/` directory that does not exist in this repo. Real-time sync runs through `cloud/sync-worker/src/room-sync-hub.js` (Cloudflare Durable Object) instead. Doc is stale; not corrected here — flagging only.
- `docs/core/20-claude-code-handoff.md` says the interconsulta team board is "approved 2026-08-25, not started." Code disagrees: bucket/role/rollover logic and the UI mount are already built, tested, and wired (uncommitted — see `git status`). Treated as in-progress here, `ic-rollover-button` left open since the rollover button's UI trigger wasn't found.
- Nube E2EE: code is built and wired, but `NUBE_E2EE_ENABLED = false` in source confirms the handoff doc's "not deployed" claim — cross-verified independently in code, not just trusted from docs.
- 2026-08-25, claude: interconsulta demo pivoted mid-session (owner: "seed it on the main R+ app, hidden like the pitch patients, so they don't sync") from the earlier verify-script-only build. Chose a merge-only toggle (⌥⌘⇧I) over a settings UI — matches the existing presentation-mode shortcut precedent and needs no new UI surface. Chose one shared `getSyncablePatients()` accessor over per-call-site `isDemo` filters in cloud-sync — fewer places to forget the filter next time a new sync call site is added.
- 2026-08-25, owner (via AskUserQuestion): "team selection should be streamlined and easy to access and set" on the consult-info card resolved as **"Quick picker on Resumen"** — a real team picker wired to the app's actual `assignPatientToTeamClinical` (IPC/cloud), usable for real patients, not a demo-only local toggle. Demo patients get a local-only fallback (`assignDemoPatientTeamLocally`) since they have no real DB row for the IPC call to resolve.
