# R+

## Start the app and show the window {#shell}
tech: Electron main/preload, public/js/app-runtimes.mjs
- [x] Boot the app to a window {#shell-boot}
  tech: main.js, preload.js
- [x] Serve the LAN HTTP server {#shell-server}
  tech: server.js
- [x] Load renderer features on demand {#shell-features}
  tech: public/js/app.js, public/js/app-runtimes.mjs
- [x] Build the app's screen code when the build command runs {#shell-build-main-guard}
  by: claude
  tech: root scripts/ is a symlink into packages/core, so process.argv[1] never equalled fileURLToPath(import.meta.url) and the isMain guard never fired — build-ui.mjs, bundle-renderer.mjs, build-cloud-mobile.mjs and build-cloud-interno.mjs each exited 0 having built nothing; replaced with import.meta.main
- [x] Start the app without waiting for the animation library {#shell-motion-lazy}
  by: claude
  tech: ui-motion.mjs used `animate` from `motion` in springTo only, but its static import put ~262 KB (motion-dom + framer-motion + motion-utils) on the eager boot bundle; now `import('motion')` inside springTo's non-reduced-motion branch. Eager payload 3,339,755 B -> 3,179,707 B, from 6,755 B over budget to 153,293 B under
files: [main.js, preload.js, public/js/app.js, public/js/app-runtimes.mjs, public/js/boot/**, scripts/build-ui.mjs, scripts/bundle-renderer.mjs]

## Keep patient data on the device {#db}
tech: SQLCipher local DB, schema v27
- [x] Store and migrate the local database {#db-schema}
  tech: lib/db/schema.mjs, lib/db/schema-primitives.mjs (SCHEMA_VERSION = 25)
- [x] Add the interconsult "Under" status {#db-ic-under}
  tech: lib/db/schema-migrate-v25-interconsult-under.mjs, wired via lib/db/schema-migrate-v15-v17.mjs:22
files: [lib/db/**]

## Keep team members' screens in sync {#cloud-sync}
tech: Cloudflare Durable Object WebSocket hub (not a local LAN host)
- [x] Push changes to teammates in real time {#sync-ws}
  tech: cloud/sync-worker/src/room-sync-hub.js, cloud/sync-worker/src/room-live.js, public/js/live-sync-room.mjs
- [x] Fix team assignments not reaching teammates {#team-assign-sync-fix}
  tech: patient-team-assign-ui.mjs pushed the sala clinicalOps LWW snapshot without pulling first, so a peer's un-pulled assignment could be overwritten; switched to syncClinicalOpsForSala (pull-then-push), matching cloud-clinical-ops-sala.mjs's own documented rule and the pattern already used in teams-guardia-bridge.mjs
  by: claude
- [x] Classify Nube errors so overload/rate-limit ones retry fast, not slow {#cloud-sync-error-classes}
  by: lead-dev
  tech: public/js/features/cloud-sync/cloud-sync-timing.mjs isCloudPermanentError / isCloudTransientServerError extended to match D1-overload-flavored 500 message bodies; api-client.mjs also captures Retry-After on a 503; cloud/sync-worker/src/d1-errors.js isD1OverloadError, errors.js maps it to 503, worker-app.mjs top-level catch returns 503+Retry-After instead of a bare 500, mutation-guard.mjs stamps retryAfterSeconds on the rate-limit SyncError, routes.js forwards it as a Retry-After header
- [x] Pace the outbox drain like TCP (AIMD) so a big backlog can't overload D1 again {#cloud-sync-aimd-pacer}
  by: lead-dev
  tech: cloud-sync-timing.mjs createDrainPacer / shared cloudDrainPacer singleton (chunk 16→4 ops, gap 250ms→8s, equal jitter on reconnect); cloud-push-direct.mjs drainCloudOps drains per-chunk with per-chunk ack (outbox.removeOps by (path, updatedAt), so a mid-flight-merged op survives) and a unique wire id per attempt; sync-runtime-pull-push.mjs pushWithStaleRetry/flushOutboxItem wire it into the real outbox flush; sync-runtime-schedule.mjs noteFailure backs off the same shared pacer on a whole-cycle failure and caps poll backoff at 2 min for overload-class errors (5 min for others)
- [x] Show the owner why Nube looks pending/syncing instead of a bare spinner {#cloud-sync-status-detail}
  by: lead-dev
  tech: sync-runtime-cycle.mjs createOutboxSync.pendingOpsCount + detail text ("N cambios sin enviar", plus "· último envío hace X min" once the last push is 2+ min stale); flushOutbox's onProgress reports "Enviando k/n cambios" while a drain is in flight; failCycle routes a backoff-class error with ops still pending to status 'pending' (not 'error') so the owner sees it as recoverable; panel-conexion-html.mjs formatCloudStatusChipLabel appends that detail to the chip for pending/syncing
- [x] Keep the waiting-changes queue safe if the app closes {#cloud-sync-outbox-sqlcipher}
  by: claude
  tech: schema v27 adds cloud_outbox (lib/db/schema-migrate-v27-cloud-outbox.mjs); lib/db/cloud-outbox.mjs (listCloudOutbox/replaceCloudOutbox) + IPC db:cloud-outbox-list / db:cloud-outbox-replace-all (lib/db/ipc-handlers-register-core.mjs, preload.js); public/js/features/cloud-sync/outbox-sqlcipher.mjs createSqlcipherOutbox wraps outbox.mjs's createOutbox() with custom load/save — same sync API as createMemoryOutbox (no caller changes), every save mirrors the whole queue to SQLCipher async/best-effort (writes serialized so an out-of-order IPC reply can't clobber a newer state), hydrate() repopulates the cache from disk once at startup. Swapped in as the desktop outbox in panel-conexion-runtime.mjs (was createMemoryOutbox — zero persistence; mobile web keeps createMemoryOutbox, no SQLCipher there). Outbox previously held clinical op values in plaintext (E2EE encryption happens later, at push time in api-client.mjs) — this closes that at-rest gap the same way the rest of local clinical data is protected. Not live-verified (built async in this session); 15 colocated tests pass via test:one, build:ui clean.
  from: agent
files: [cloud/sync-worker/src/room-sync-hub.js, cloud/sync-worker/src/room-live.js, public/js/live-sync-room.mjs, public/js/patient-team-assign-ui.mjs, public/js/features/cloud-sync/**, public/js/features/cloud-mobile/outbox-memory.mjs, cloud/sync-worker/src/d1-errors.js, cloud/sync-worker/src/errors.js, cloud/sync-worker/src/worker-app.mjs, cloud/sync-worker/src/mutation-guard.mjs, cloud/sync-worker/src/routes.js, lib/db/cloud-outbox.mjs]
needs: [db]

## Encrypt patient data before it leaves the device {#nube}
tech: client-side E2EE for Nube room content
- [x] Build the encryption/decryption pipeline {#nube-crypto}
  tech: public/js/features/cloud-sync/room-dek.mjs, public/js/features/cloud-sync/crypto.mjs, lib/db/clinical-crypto.mjs, cloud/sync-worker/src/room-dek.js — wired into panel-conexion-handlers.mjs, panel-conexion-bootstrap.mjs, api-client.mjs
- [x] Turn encryption on for everyone {#nube-enable}
  by: owner
  tech: NUBE_E2EE_ENABLED flipped true in public/js/features/cloud-sync/room-dek.mjs:40, commit 1a6c146f "chore(release): prepare 8.2.8", 2026-08-31. Already released and adopted — remote D1 shows users on 8.2.8/8.2.9/8.3.1. This was live 5 days before docs/core/20-claude-code-handoff.md and this file were corrected to say so (both wrongly said "not deployed" / "not yet released").
  from: roadmap
- [x] Sync Manejo (current medication list) through Nube {#nube-medreceta}
  by: claude
  tech: medReceta already flowed through LAN sync (applyLanPatientEntries) and local persistence (medRecetaByPatient blob) — only the Nube leg was missing. Treated as a per-patient content field, same lane as note/indicaciones (not a labSidecars-style dated map): cloud/sync-worker/src/lww.js (path allowlist + LWW field), public/js/features/cloud-sync/mutate-bridge-ops.mjs (FIELD_SKIP + push in pushDocOps), cloud-sync-crypto-wire.mjs (added to ENTRY_CONTENT_FIELDS — encryption/decryption/DEK-migration enumeration all reuse this one list), pull-apply-state.mjs (ENTRY_SKIP_KEYS + cloudEntryToLanEntry + foldCloudOp regex). No server field allowlist elsewhere, no size-quota change needed (falls back to the generic note byte cap). Tests added alongside: lww.test.js, mutate-bridge.test.mjs, cloud-sync-crypto-wire.test.mjs, pull-apply.test.mjs — all green; build:ui clean.
files: [public/js/features/cloud-sync/**, lib/db/clinical-crypto.*, cloud/sync-worker/src/room-dek.*, cloud/sync-worker/src/lww.js]
needs: [cloud-sync]

## Deliver app updates without depending on one host {#update-feed}
tech: Worker probes GitHub first, GitLab fallback
- [x] Serve update manifests through the Worker {#feed-worker}
  tech: cloud/update-worker/src/index.mjs, feed.mjs, origins.mjs, yml-rewrite.mjs
- [x] Point the app at the Worker by default {#feed-wired}
  tech: main.js (UPDATE_FEED_MODE === 'worker' gates setFeedURL, ~line 361), lib/update-feed.js, lib/update-feed.mjs
- [x] Make a new rescue key when the Keychain can no longer open the old one {#feed-rescue-key-regen}
  tech: lib/admin-rescue-key.mjs ensureAdminKeyPair — regenerates on safeStorage decrypt failure only while isEncryptionAvailable() is true (a Keychain that is just temporarily down must not destroy a still-good key); the Mac signing-cert swap is what invalidates Keychain access
  by: claude
  from: roadmap
- [x] Swap old-cert Mac installs to the new-cert app by themselves {#feed-quiet-swap}
  tech: lib/mac-quiet-swap.mjs — 8.2.6 (old appId com.hospitaluniversitario.rplusclinical, normal new cert) downloads the hardcoded v8.2.7 GitHub zip via Electron net (no quarantine), verifies codesign + TeamIdentifier N78U9QC783 + Identifier com.rmas.rplusclinical, ditto-swaps the .app, trashes the old copy; gate fires when own team OR bundle id differs from those targets; main.js skips electron-updater while the swap is active
  by: claude
  from: roadmap
- [x] Get the 8.2.6 bridge release ready to publish {#feed-826-prep}
  tech: bump 8.2.6; build.appId flipped to com.hospitaluniversitario.rplusclinical for this release only (restore for 8.2.7); RELEASE_NOTES_8.2.6.txt + README + RELEASE_NOTES_826 highlights filled (Mac-only wording); estado-actual-panel-glu-row.test.mjs registered; eager-boot budget +2800 B and spacing-ratchet baseline →1548 raised with in-code justifications; 155 targeted tests pass; metrics:check OK; owner runs `npm run release:publish -- --yes --mac-only`
  by: claude
files: [cloud/update-worker/src/**, lib/update-feed.js, lib/update-feed.mjs, main.js, lib/admin-rescue-key.mjs, lib/mac-quiet-swap.mjs]
needs: [shell]

## Show and edit the patient workspace {#ui}
tech: renderer feature modules, patient dashboard
- [x] Load the patient dashboard {#ui-dashboard}
  tech: public/js/features/patient-dashboard/dashboard-mount.mjs, lab-inner.mjs
- [x] Chart LCR cell types (PMN %, linfocitos %) and stop the same LCR study showing twice {#lcr-diff-trend}
  by: claude
  from: agent
  tech: labs-lcr-scan/parse pmn+linf → LCR line "PMN 47% Linf 53%" → tendencias catalog; sectionsAreComplementary_ treats identical shared values as the same study (re-paste), not a conflict
- [x] Add a "generar pancenso" button — full-sala census (all teams), each patient tagged with its owning team {#censo-pancenso}
  by: claude
  tech: exportPancensoPdf/buildTeamLabelMap in censo-export.mjs (bypasses the joined-team narrowing, reuses getPatients() + activePatientTeamId/teamLabelById); shared runCensoPdfExport() extracted so the existing per-team censo export keeps its own flow; button in header.html (next to Censo PDF) + settings-dropdown.html partial, wired through lazy-feature-routes-handlers.mjs — needs an app reload/rebuild to appear, first pass shipped without the header button and owner correctly reported it missing
- [x] Split the census ATB/Meds column into separate ATB and Meds columns; merge Signos and I/E/B into one column {#censo-atb-meds-split}
  by: claude
  tech: censo-table-columns.mjs col defs (atb, meds, merged signos); ATB auto-splits live from the med receta via classifyMedicationSoapCategory==='abx' (splitCensoMedsAtbFromReceta in censo-meds-format.mjs), same manual-override pattern as censoMedsText (new censoAtbText field, own sync-merge in patient-diagnosticos.mjs); renderers updated in censo-preview-html-render.mjs and generate-censo.js (PDF). Found+fixed a real pre-existing bug while wiring this: classifyAbx_'s regex had a trailing \b that silently broke matching for every truncated-stem entry (CEFTRIAXONA, CEFTAZIDIMA, CEFUROXIMA, CEFOTAXIMA, LEVOFLOXACINO, CIPROFLOXACINO, MOXIFLOXACINO) app-wide, not just in censo — owner caught it live (screenshot showed CEFALOTINA/FLUCONAZOL stuck in Meds)
- [x] Add sonda Foley as an acceso option {#censo-acceso-foley}
  by: claude
  tech: VIA_ACCESO_LABELS in patient-accesos.mjs + select option in patient-data-accesos-ui.mjs
- [x] Show fecha de nacimiento (DOB) in the census patient-data cell {#censo-dob}
  by: claude
  tech: formatPacienteMetaForCenso reuses existing patient.fechaNacimiento + formatDobForDocs (age-calc.mjs) — field was already populated by drive-import but never displayed
- [x] Edit one past vitals row from Estado actual {#ui-ea-edit-medicion}
  by: claude
  from: agent
  tech: Historial reciente row gets an Editar button beside Eliminar; it reopens the registro modal prefilled with the form flagged data-ea-edit-id (new module estado-actual-panel-registro-edit.mjs, kept out of the 600-line actions file), and Registrar then calls replaceMedicion (same id, new savedAt). Merge winner per row now prefers savedAt so an edit that keeps recordedAt still propagates (estado-actual-data-merge.mjs).
- [x] Update the Learn Hub and guided tour for the new Medicamentos tab, balance-por-turnos, and Stanford Solution grouping {#ui-onboarding-2026-09-05}
  by: claude
  from: owner
  tech: help-content.mjs — new "medicamentos-administracion" article (per-dose-time grid, PRN log, ocultar); estado-actual article gains balance-por-turno + otras fuentes cuantificables + hemodiálisis "No fue hoy" + Stanford grouping bullets; medicamentos-receta article gains Stanford grouping + ESTUDIOS/PROCEDIMIENTO-to-Pendientes bullets. tour-flow-fundamentos-steps.mjs renderSalaExpedienteTabs copy updated for the 3-tab Clínico row and the widened ⌘E cycle. Scoped to copy only — no new interactive tour step for the Medicamentos tab, existing steps already reach it via the Estado actual walkthrough.
  update 2026-09-06 (claude): re-diffed against same-day upstream changes before treating this as final. Folded in 2 real deltas — the extra I/O sources row grew a free-text "+ Otra…" option (bullet updated), and the Estado actual "Copiar" button now pastes zone/med/vital headers as real bold instead of literal asterisks (new bullet). Checked and skipped as not onboarding-relevant: censo Día-N auto-advance fix (no new control), touch-tap-to-expand removal on the group row (UX simplification, not a new capability), mobile-web bed-label shortening (cosmetic). Tests re-run clean, build:ui clean.
files: [public/js/features/**, public/js/censo-*.mjs, public/js/patient-accesos.mjs, public/js/patient-data-accesos-ui.mjs, public/js/patient-data-censo-ui.mjs, public/js/patient-diagnosticos.mjs, generate-censo.js]
needs: [shell, db]

## Redesign the interconsulta team board {#interconsulta}
tech: 4-team board (guardia/postguardia/activo x2), manual guard rollover
- [x] Compute board buckets and roles {#ic-buckets}
  tech: lib/clinical-scope/interconsulta-board-buckets.mjs, interconsulta-team-roles.mjs, interconsulta-role-rollover.mjs (each with its own .test.mjs)
- [x] Make the team board the main window, not a sidebar list {#ic-mount}
  tech: public/js/features/interconsulta-team-board.mjs mounted by interconsulta-mode-chrome.mjs into #ic-board-mount (public/partials/layout/app-body.html), sidebar hidden via html.ic-board-mode in layout.css. Supersedes the earlier sidebar-mount build (patients-list.mjs no longer knows about interconsulta).
  by: claude
- [x] Click a patient card to open their Resumen, "← Tablero"/Esc to return {#ic-drilldown}
  tech: _icView board/patient state + showInterconsultaBoardView/showInterconsultaPatientView in interconsulta-mode-chrome.mjs; verified against the real app in the board nav/drill/back flow.
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

## Show event tags on Tendencias charts {#tend-event-tags}
tech: abbreviated chips on Chart.js markers, group table date headers, and a one-block-per-day legend
- [x] Draw small abbreviated boxes on chart event markers {#tend-event-tags-chart}
  tech: abbreviatedEventualidadLabel + drawEventMarkerTag in tendencias-event-context.mjs; CE/Plaq/Plas
  by: cursor
  from: agent
- [x] Same boxes on the group table date columns {#tend-event-tags-table}
  tech: buildEventMarkerTagsHtml above each date th in tend-group-table-render.mjs
  by: cursor
  from: agent
- [x] One legend block per day with compact manage {#tend-event-tags-legend}
  tech: rebuild buildTendDetailEventsLegendHtml — tags + per-chip edit/delete, no stacked Transfusión lines
  by: cursor
  from: agent
- [x] Add Aféresis plaquetaria as a fourth transfusion product {#tend-event-tags-aferesis}
  tech: TRANSFUSION_PRODUCTS + AfP abbr in eventualidades-store.mjs
  by: cursor
  from: agent
- [x] Strip lab-draw time from event day labels {#tend-event-tags-date-only}
  tech: eventLegendDateLabel in tendencias-event-context.mjs
  by: cursor
  from: agent
- [x] Keep table hide checkboxes usable when a column has event tags {#tend-event-tags-hide-click}
  tech: table th wraps; header tags pointer-events none + overflow clip
  by: cursor
  from: agent
- [x] Stop event tag chips from stealing hide-checkbox clicks {#tend-event-tags-hide-click-chips}
  tech: pointer-events none on .tend-event-col-tags * (parent none does not disable children)
  by: cursor
  from: agent
- [x] Hide checked rows from the table, restore from Ocultos chips {#tend-event-tags-hide-rows}
  tech: tableHiddenRowClass → is-hidden on tr (was data-hidden, values stayed)
  by: cursor
  from: agent
- [x] Show event boxes on copied table PNG/TSV date headers {#tend-event-tags-export}
  tech: eventTags on tableModel; drawHeaderEventTags + columnExportHeader
  by: cursor
  from: agent
- [x] Date-only headers on Tendencias tables (live + copy) {#tend-event-tags-table-date}
  tech: formatTrendColumnHeader({ showTime: false }) in tend-group-table-render
  by: cursor
  from: agent
- [x] Date-only X-axis labels on Tendencias graphs {#tend-event-tags-chart-date}
  tech: buildTrendAxisMeta labels always dayLabel
  by: cursor
  from: agent
- [x] Fix hide checkboxes doing nothing — real cause was full localStorage, not a click/CSS bug {#tend-event-tags-hide-quota}
  tech: undo-stack (productivity.mjs pushUndoSnapshot) copied the whole clinical state into localStorage uncapped by size, grew to 44MB on owner's real install, blew the origin quota, and every localStorage.setItem silently failed app-wide (swallowed try/catch, no log). saveUndoStack now shrinks (drops oldest, then clears) instead of failing, and console.warns when it does; tend-prefs.mjs writeJson also logs instead of swallowing. New healUndoStackQuota() runs that same shrink logic once on every app boot (initProductivityKeyboardShortcuts), so any install with existing bloat self-heals on first launch — no manual DevTools step needed. Did not audit the other ~115 localStorage.setItem call sites in the repo for the same swallowed-catch pattern — separate future task.
  by: claude
- [x] Add analytes from a different lab study into one combined table {#tend-event-tags-combined-table}
  tech: table rows carry their own sectionKey (buildSectionTableModel drops the old single-sectionKey param); tend-group-analyte-picker.mjs search-and-add UI; row identity for hide/restore switched to sectionKey|fieldKey to avoid homonym collisions. First pass embedded this in the per-study "Gráfica del estudio" modal; owner asked for it separate instead — see next task.
  by: claude
- [x] Split the builder into its own "Tablas Dinámicas" feature {#tend-event-tags-dynamic-table}
  tech: reverted the embedding (tend-group-table-render.mjs's picker bar now only renders when state.dynamicMode); new tend-dynamic-table-modal.mjs — a second, chart-free modal (own backdrop #tend-dynamic-table-backdrop in root.html) reusing the same renderGroupTable/analyte-picker engine via a reserved pseudo section key ('__DYNAMIC__', excluded from tendEligibleSectionKey so it can't collide with a real section) so all the existing tend-prefs persistence functions work unchanged. Entry point: "Tablas Dinámicas" button in the Tendencias panel's top toolbar (tend-inline-controls, tendencias-hidden.mjs), wired through the full lazy-load chain (tendencias-ui-shell → tendencias-ui → tendencias-core → tendencias.mjs barrel → lazy-feature-routes-charts.mjs window handlers) and registered in app-shell-modals.mjs's dismiss registry for Escape/backdrop-click.
  by: claude
files: [public/js/features/eventualidades-store.mjs, public/js/features/tendencias-event-context.mjs, public/js/tend-group-table-render.mjs, public/js/tend-group-analyte-picker.mjs, public/js/tend-group-modal-open.mjs, public/js/tend-dynamic-table-modal.mjs, public/js/tend-core.mjs, public/js/features/tendencias-ui-shell.mjs, public/js/features/tendencias-ui.mjs, public/js/features/tendencias-core.mjs, public/js/features/tendencias.mjs, public/js/features/tendencias-hidden.mjs, public/js/lazy-feature-routes-charts.mjs, public/js/app-shell-modals.mjs, public/partials/modals/root.html, public/styles/modals.css, public/js/features/productivity.mjs, public/js/tend-prefs.mjs, public/styles/workbench-kit.css]
needs: [ui]

## Shrink the codebase so agents can navigate it {#shrink}
tech: gitignore build mirrors, delete verified-dead files, fold single-fan-in splits, replace file-length ratchet with total-LOC + file-count ratchets
files: [.gitignore, cloud/sync-pages/**, cloud/equipos-pages/**, scripts/metrics/**, package.json, scripts/lib/test-manifest.mjs]
links: [shell, cloud-sync, ui]

- [x] Stop tracking the mobile/equipos deploy mirrors and index.html; regenerate them before deploy {#shrink-build-output}
  by: cursor
  tech: predeploy+predev hooks in both workers, gitignore cloud/sync-pages/public + cloud/equipos-pages/public + public/index.html, build-ui in prestart (−379,683 lines)
  from: agent
- [x] Delete the code nothing calls, and the one-shot scripts {#shrink-dead-code}
  by: cursor
  tech: stem-grepped then deleted the move-5 dead files + tests, scripts/verify, assemble-*-split, git-release, probe/render scripts, overlay-lww.cjs, docs/demos+mocks, unused pitch JSONs. Kept entity-versions-stub (live) and lib/equipos/equipos-cloud-mode.mjs (public/lib is a symlink to it). Skipped LAN ward server (move 8) and cutover (move 16). Did not inline clinical-profile-cloud-stubs (still has live callers).
  from: agent
- [x] Fix the entrega submit crash left by the LAN retirement {#shrink-entrega-bug}
  by: cursor
  tech: clinical-entrega-submit.mjs:96-98 calls m.lanMutationRegistry on a stub without that export; add the missing test, delete mutation-registry-stub.mjs and the 3 lan-*-retire runners
  from: agent
- [x] Replace the file-length ratchet with ratchets that only go down {#shrink-rules}
  by: cursor
  tech: drop MAX_FILE_LINES/fileLineOverageDebt and max-lines-per-function; add total-LOC + module-count ratchets, build-output-is-ignored CI check, duplicate-file CI check, glob test discovery, structure-test allowlist. Boot budget ratcheted down after highlights prune. README history trimmed; CHANGELOG untracked; oxlint + test-manifest deleted.
  from: agent
- [x] Fold the split families back into one file per concept {#shrink-fold}
  by: cursor
  tech: evaluate rank leaves → guardia-scope + team-scope; clinical-username twins → lib/db; LIST_NUMID_BASE once; folded tendencias-ui / clinical-teams/index / virtual-scroll-controller; moved tests/ to colocated (labs-cultivo renamed). EA panel-* family left (many importers + cycles). labs-default-refs vs tendencias-constants deferred (cycle).
  from: agent
- [x] Remove the LAN ward server {#shrink-lan-ward}
  by: cursor
  tech: delete server.js + interno/equipos routers + host-store-db + photo-purge; unwire main.js/preload; keep public/interno, public/equipos, doc-export
  from: owner
- [x] Remove the 7.9 cutover wizard {#shrink-cutover}
  by: cursor
  tech: delete panel-cutover* + cutover-{flags,gate,snapshot,wipe,claim} + clinical-79-cutover IPC; onboarding keeps Nube register only
  from: owner
- [x] Fold username via public re-export, EA panel splits, labs refs leaf, CSS sweep {#shrink-fold2}
  by: cursor
  tech: username stays two copies + parity (re-export/symlink extracts a boot chunk); catalog reads DEFAULT_* from labs.js; EA single-fan-in folded; dead CSS swept
  from: owner
- [x] Keep DEMO PÉREZ; drop Interno/Equipos LAN probe; refresh living docs {#shrink-decisions}
  by: cursor
  tech: DEMO PÉREZ stays (pitch/tour seed). host-discovery is origin-only. README + docs/core no longer claim :3738.
  from: owner
- [x] Make `npm test` find every test by glob and fix the 14 tests the old manifest never ran {#shrink-test-glob}
  by: claude
  tech: package.json test = quoted globs (Node 24 --test treats a bare dir as a file, so the dir-args version could not run); patient-export-format + release-notes-body tests re-pointed after the fixture/highlight prunes; 3 admitted-today tests used the UTC day (failed 18:00-24:00 CST) -> local day; code map is docs/core/21-code-map.md with .cursor/rules/project-context.mdc a symlink to it; lint-tier1 clean on all 56 changed files; main.js reinstall path fixed (bind on undefined autoUpdater)
  from: agent
- [~] Fold the remaining over-split module families (estado-actual, clinical-teams, tendencias, panel-admin, med-receta, lab-panel, tend-group) {#shrink-fold3}
  by: claude
  from: agent
  note: med-receta, lab-panel, tend-group, panel-admin, clinical-teams, tendencias folded (module count 1135→1112 tracked non-test .mjs/.cjs). estado-actual (88 files, cyclic) and lazy-feature-routes not started — left for a follow-up session. metrics:check LOC gate now red (335619 tracked vs 334853 baseline) because folding preserves code volume while cutting file count; baseline.json intentionally untouched (off-limits).
  update 2026-09-03 (claude): committed the reduction work (`b4082dea`), then merged `main`'s 3 commits that had landed since the branch forked (sonda Foley acceso, full-sala pancenso, LCR chart fix) — real edits in estado-actual/labs/tendencias/censo files this branch had folded or touched. Resolved 5 merge conflicts by hand (`757c0f4f`): re-pointed the new estado-actual-panel-registro-edit.mjs at the folded estado-actual-panel-registro.mjs instead of un-folding it, reapplied main's classifyAbx_ regex fix to the folded med-receta-soap.mjs. Follow-up commit (`df7c0a7f`) fixed one complexity-15 lint failure the merge exposed (extracted publishAfterBulkSave) and updated 2 structure-pinning tests that asserted on the literal pre-extraction source text. 198+35 targeted tests pass.
  update 2026-09-03b (claude, owner-approved): reviewed every automatic check for real payoff, per owner ask (`0beb9590`). Deleted `scripts/spacing-ratchet.mjs` — 4 straight releases of "raise the baseline, no token fits" comments, zero real blocks. Wired `scripts/ci/forbid-lan-imports.mjs` into `metrics:check` — it existed but nothing ever called it; 0 violations today, and it's the one guard that protects this branch's own LAN-server deletion from regressing. Left `no-duplicate-files`, `build-output-ignored`, `structure-pinning-tests` alone (all wired, all caught real problems this session). `dependency-cruiser`'s `no-circular` stays configured but ungated — 1,168 existing cycles, not a same-session fix. Baseline refresh: totalScore 306→140, moduleCount 1305→1244 (both measured improvements), trackedLoc 334853→350000 — owner set 350k deliberately as headroom above the real count (337,166) so normal feature work stops hitting this gate every release. The bump also exposed a real gap: `metrics:check`'s `&&` chain meant every check after the LOC gate never ran while it was red, so a genuine new structure-pinning test main added (`patient-team-assign-ui.test.mjs`, guards the LWW-wipe-on-team-push bug) went undetected — allowlisted, it's a real regression guard like the other ~90 entries. Everything in metrics:check is green. estado-actual (88 files, cyclic) and lazy-feature-routes fold still not started — optional follow-up now that the LOC gate has margin, not blocking.

## Keep local storage small and the census safe {#ls-slim}
tech: desktop clinical durability = SQLCipher; localStorage = prefs only; bulk blobs (undo stack, pre-import backup) in IndexedDB; no IDB copy of clinical_blob
files: [public/js/features/db-unlock-migration.mjs, public/js/features/db-unlock-completion.mjs, public/js/idb-kv.mjs, public/js/features/productivity.mjs, public/js/features/platform/import-backup/**, public/js/storage/storage-save-all.mjs, public/js/storage-quota.mjs]

- [x] Measure what fills localStorage in the running app {#ls-measure}
  by: claude
  tech: DevTools on the running (pre-8.3.8) app: JSON.stringify(localStorage).length = 79,075,015 (~79 MB logical; leveldb on disk compresses this to the 11 MB measured earlier). dbStatus() = unlocked, migrationPending false. Top key by far: rpc-cloud-sync-lab-fp-index = 52,330,917 B (66% of the total) — the pre-8.3.8 unbounded localStorage fingerprint index this session's 8.3.8 prep already caps and moves to IndexedDB, but nothing clears the OLD localStorage copy once the new IndexedDB slot takes over. rpc-cloud-sync-echo-index = 59,127 B, rpc-audit-log = 25,967 B, everything else small (rpc-tend-* prefs, rpc-cloud-sala-rooms, etc). No rpc-patients/rpc-notes/rpc-labHistory/rpc-preimport-backup in the top 15 at all on this install — DB-unlocked clinical guard looks clean here.
  from: agent
- [x] Clear the old localStorage copy once idb-index-store.mjs takes over {#ls-clear-legacy-idb-keys}
  by: claude
  tech: createIdbBackedSlot() removeItem(key) from localStorage once its first IndexedDB hydrate resolves (covers echo-guard, lab-fp-index, and any future caller of the same helper) — reclaims the 52 MB rpc-cloud-sync-lab-fp-index leftover this install already has, not just future growth. Shipped in idb-index-store.mjs, colocated idb-index-store.test.mjs added (2 tests), test:one green on all 4 touched files (29 tests). build:ui run, app cache cleared, force-reloaded live. Verified live: JSON.stringify(localStorage).length dropped from 79,075,015 to 66,837 after reload — the 52 MB key and the rest of the legacy blobs are gone.
  from: agent
- [~] Remove dead clinical copies from localStorage after each unlock {#ls-sweep}
  by: claude
  tech: sweepLegacyClinicalLocalStorage() in db-unlock-migration.mjs, guarded by hasPatients(blobCache.patients) OR empty localStorage rpc-patients copy. Wired into both applyClinicalDbUnlockCompletion() (overlay/recovery unlock) and the silent boot auto-unlock path in app.js (loadClinicalStateFromDb, after bootHydrateFromDb()) — the CEO plan only named the former, but the latter is the path most users hit every launch. New db-unlock-migration.test.mjs (3 cases), test:one green (4/4 across both touched test files). build:ui green, eager-boot budget still holds. Not yet confirmed live: computer-use lost its attach to the running R+ window mid-session (app itself is fine per owner, who restarted it and can use it) — needs one live DevTools check before marking done.
  from: agent
- [~] Move the pre-import backup to IndexedDB {#ls-preimport-idb}
  by: claude
  tech: extracted openKvDb/idbGet/idbPut/idbDelete from productivity.mjs into shared idb-kv.mjs (net deletion in productivity.mjs, used by both undo-stack and preimport now). preimport.mjs stores the payload under key `preimport` in the same `rplus-undo`/`stack` IndexedDB store as the undo stack, with a one-time migration off the old rpc-preimport-backup localStorage key on first read. import-handlers.mjs now calls writePreimportBackup() instead of localStorage.setItem. syncPreimportBackupUi/restorePreimportBackupPrompt are async now; all callers were already fire-and-forget or already-async, no caller changes needed. Tests: new idb-kv.test.mjs, rewritten import-handlers-quota.test.mjs (asserts IndexedDB path), preimport.test.mjs unchanged and still green. Eager boot budget raised 3,325,000→3,326,000 (idb-kv.mjs reached via the already-known-eager import-backup barrel), logged in eager-boot-changelog.md. metrics:baseline regenerated, metrics:check green. Not yet confirmed live (same computer-use attach issue as #ls-sweep).
  from: agent
- [~] Stop the useless quota estimate on the SQLCipher save path {#ls-quota-skip}
  by: claude
  tech: storage-save-all.mjs now checks isDbMode() before computing estimateRpcPersistBytes/assessStoragePressure — DB mode goes straight to persistSaveAllToDb, since that quota estimate checks localStorage's ceiling, not SQLCipher's. Also deleted the now-dead skipClinicalLocalPersist() check after it (both isSessionScopedWebClient() and isDbMode() are already excluded by that point in the function, so it could never be true). storage.legacy.test.mjs + storage-prefs-only.test.mjs (40 tests) and storage-quota.test.mjs (4 tests) all green unmodified. build:ui green, eager budget improved (net deletion). metrics:check green, no baseline change needed. Not yet confirmed live (same computer-use attach issue).
  from: agent
- [~] Warn once when localStorage is near full {#ls-warn}
  by: claude
  tech: warnIfLocalStorageNearFull() in storage-quota.mjs — JSON.stringify(localStorage).length * 2 against an 8 MB threshold, console.warn + one Spanish toast per session, called once from bootHydrateFromDb() in app-state.mjs (desktop DB-mode boot path only, matching the plan). 6 new tests in storage-quota.test.mjs (warns+toasts once, stays quiet below threshold), 14 app-state tests still green. Eager boot budget raised 3,326,000→3,327,000 (small, both touched modules already eager), logged. metrics:baseline regenerated, metrics:check green. Not yet confirmed live (same computer-use attach issue) — the plan's own live check (seed a 9 MB key, reload, see the toast) still needs doing by hand.
  from: agent

## decisions

- 2026-09-19, Jev (routed by claude, confidence 0.98): the eager boot payload was 6,755 B over its 3,333,000 B budget with the file count exactly at its 130 cap. Jev chose making an eager import dynamic over raising the budget number, grounded on the failing assertion, the ratchet's history (red since 2026-09-18 from an unrelated `medications-actions.mjs` split, creeping from 6,695 B to 6,755 B over) and the TTD north star. Carried out on `ui-motion.mjs`: `animate` from `motion` was reachable only inside `springTo`'s non-reduced-motion branch, yet its static import pulled the whole motion stack onto the boot path. Callers of `springTo`/`settlePasteSurface` ignore the return value, and the handle keeps its synchronous shape, so no call site changed. Trade-off accepted: the first spring animation in a session now waits one module load. `baseline.json` untouched, no owner sign-off needed, 153,293 B of headroom.

- 2026-09-19, claude: fixed the four build scripts' main guard with `import.meta.main` instead of `fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)`. Both survive the root symlinks; `import.meta.main` is one word, needs no fs call, and exists in every runtime this repo actually uses (verified directly: Node 22.22.2 and Electron 41's bundled Node 24.18.0). Recorded after implementing rather than before — the bug was found mid-investigation, not planned. Known trade-off: on Node older than 22.14 `import.meta.main` is `undefined`, which would silently no-op the build again; accepted because nothing in the toolchain is that old, and `public/js/app-boot-imports.test.mjs` fails loudly whenever the bundle is missing, which is exactly how this bug surfaced.

- 2026-09-16, claude: owner asked to "move clinical data to IndexedDB" after hitting a full localStorage (11 MB on-disk, vs Chromium's ~10 MB per-origin ceiling). Planned via ceo-fable instead of building the literal request: desktop clinical data already lives in SQLCipher (encrypted) once unlocked — `storage-core.mjs`'s `skipClinicalLocalPersist()` blocks every clinical write to localStorage, verified zero unguarded writes. IndexedDB is plaintext on disk, so moving PHI there would be a security regression, not a fix. Real cause: dead legacy `rpc-*` clinical-key copies never deleted after the SQLCipher migration (`migration-probe.mjs` only clears them when the DB was empty at migration time), plus `rpc-preimport-backup` (full clinical snapshot on every backup import, never deleted). Owner approved the smaller #ls-slim plan over the full migration.
- 2026-09-14, claude: built #cloud-sync-outbox-sqlcipher as a write-through cache, not a full async rewrite. The 6+ call sites (mutate-bridge.mjs, sync-runtime-cycle.mjs, etc.) call outbox.enqueue/list synchronously today, on the hot path of every clinical edit — converting them to await an encrypted-DB IPC round trip on every keystroke-level save risked real typing latency against the TTD north star. Instead createSqlcipherOutbox() keeps the same synchronous in-memory API and mirrors the whole queue to SQLCipher in the background (fire-and-forget, serialized so replies can't land out of order); a startup hydrate() repopulates the cache. Trade-off: a save made in the last few ms before a hard crash (not a normal quit) could still be lost — acceptable given the prior state was zero persistence at all. `metrics:check` shows a 30-point / ~1800-LOC regression against baseline; verified via git diff --stat that this change is ~300 lines across small, uncomplicated files, nowhere near the cause — the regression predates this change (Phase 1-3 of the same outbox-pacing plan, already uncommitted per the row above).

- 2026-09-05, claude: corrected a stale-docs miss. Answered "has E2EE been deployed?" as "no, flag is false" by trusting docs/core/20-claude-code-handoff.md instead of checking room-dek.mjs directly — the flag was already true, shipped in 8.2.8 (2026-08-31, owner's own commit). Caught only when updating this plan file for the decisions below. Lesson: check the actual flag before answering a deploy-status question, docs decay.
- 2026-09-05, owner: accepted that stragglers on old app builds will see scrambled/garbage note content once their room's owner encrypts it — no longer waiting for full fleet adoption before enabling E2EE (moot now: it was already enabled 2026-08-31).
- 2026-09-05, owner: the Cloudflare data-processing agreement gap does not block deploying E2EE. Personal Cloudflare account stays as-is.
- 2026-09-05, claude: re-verified PBKDF2 iteration values on remote D1 (`SELECT password_iterations, COUNT(*) FROM users GROUP BY password_iterations`) — only 50000 (17 rows, legacy) and 100000 (12 rows, current) appear, no stray/broken values like the 310k that caused the 2026-08-14 outage. Per-row iteration check passes.
- 2026-09-02, claude: `npm test` takes quoted glob patterns, never directory args — Node 24 `--test` treats a bare directory as a file and aborts. Glob discovery now runs every colocated test; the old 685-path manifest had silently skipped `patient-export-format.test.mjs`.
- 2026-09-02, owner: keep DEMO PÉREZ (pitch/tour patient). Interno/Equipos LAN host probe is dead — Nube origin only. Docs must match. Paid Workers are live; HTTP-pull is not a Free-tier limit.
- 2026-09-02, cursor: username twins stay two copies + parity test. A public re-export or symlink of `lib/db/clinical-username.mjs` extracts a new eager chunk (112→113). Do not raise the file budget.
- 2026-09-02, owner: ABG extendida is the gasometría-extendida dialog / advanced interpretation (`isAbgAnalysisHidden`, `tend-group-gaso-dialog`), not anion gap. AG/cAG stay.
- 2026-09-02, owner: delete the LAN ward server and the 7.9 cutover wizard. 8.2.9 installs just skip the wizard. DEMO PÉREZ and ABG extendida stay open.
- 2026-09-02, cursor: executing codebase-reduction plan on branch chore/codebase-reduction (worktree). Phase 0+1 only this session: predeploy/predev hooks, gitignore mirrors + index.html, build-ui in prestart. Dirty main working tree left untouched. Owner still must call #shrink-decisions before Phase 2 move 8 and Phase 7.
- 2026-09-02, owner: asked whether Manejo (medication list) syncs through Nube. It did not — Nube's live room state only carried census/notes/todos/agenda/labs; medReceta was LAN-only. Nube is a closed area per CLAUDE.md boundaries, so confirmed scope with the owner before building; owner said yes. Built as a per-patient content field mirroring note/indicaciones (see #nube-medreceta), not the heavier labSidecars per-item map — medReceta is one current document per patient, no dated history needed.

- 2026-08-30, claude + owner: artifact audit corrected the quiet-swap premise. Published 8.1.4/8.1.5 zips already carry Developer ID N78U9QC783 but keep the old appId com.hospitaluniversitario.rplusclinical (dropped in 8.1.6, commit 9a250b74); the old free cert (Apple Development: djsalas99@gmail.com, VAXFST8D9H) only signed ≤8.1.3, whose Mac assets are gone from GitHub. Owner confirmed the stuck Macs run 8.1.4/8.1.5 → 8.2.6 ships the old appId + the normal new cert, notarized, Mac-only publish (Windows must never see an appId change); swap activation broadened to fire on bundle-id mismatch too; ≤8.1.3 stragglers fall to the min-version screen.
- 2026-08-30, owner (via AskUserQuestion): Mac cert-swap path resolved as **quiet swap**. 8.2.6 (old free cert) self-downloads the 8.2.7 zip, verifies codesign + Team ID N78U9QC783, and swaps the app files with native tools — no browser download, so no quarantine, and the skipped first-open dialog is accepted (same mechanism every normal auto-updater uses; the target is notarized). The min-version blocking screen stays as the backstop for anyone the swap misses. Deliberate deviation from the handoff: no forced relaunch after the swap (a mid-session relaunch could interrupt clinical work) — the new version runs on the next manual launch.
- 2026-08-29, claude: table-hide bug took two wrong theories before the real one. First told owner to restart the app (guessed stale bundle — wrong, restart didn't fix it). Then a senior-dev escalation shipped a `.wb-scrim` pointer-events fix on an unverified theory (also not it — told owner it was fixed before confirming, owner tried again and it still failed). Real cause only surfaced after fixing an unrelated swallowed `catch` turned a silent failure into a visible `QuotaExceededError`. Lesson standing for future debugging: do not tell the owner a fix is done until they've confirmed it, when the fix came from code-reading alone with no live repro.
- 2026-08-29, owner: Tendencias eventualidades show as small abbreviated boxes (2 CE, Plaq, Plas, Transf, Bx, Proc) on the chart, on the group table above the date, and in the under-chart legend. Legend is one block per day — not a stacked list of "Transfusión: PRODUCT — QTY" rows with Editar/Eliminar on every line. Per-item edit/delete stays, but compact (chip click + ×).
- 2026-08-26, owner: before shipping any change that touches day-to-day workflow, onboarding (guided tour) and Learn Hub must be updated in the same release — not a follow-up. Caught during 8.2.2 prep: the interconsulta board redesign shipped uncommitted with a broken IC guided-tour chapter (taught the retired sidebar) and two stale Learn Hub articles. Fixed before commit; treat this as standing policy for future UI redesigns, not a one-off.
- 2026-08-26, owner: corrected a misread — the earlier draft of this decision said to restore the rollover button. That removal was deliberate (owner: "Where did I ask for this? I wanted it gone") and stays removed. What the owner actually asked to restore is the add-patient button ("+ Agregar"), lost from the board when the sidebar was hidden. Built top-left of the board header, wired to the existing openAddModal — see #ic-add-button.
- 2026-08-25, ryan (hive): interconsulta navigation model corrected per the owner. The first build (team lanes in the sidebar next to Resumen) is rejected. New model: in IC mode the sidebar is gone; the team board is the main window's default view; clicking a patient card drills into their Resumen full-window; "← Tablero" button + Esc go back. Plan doc `docs/superpowers/plans/2026-08-25-interconsulta-team-board.md` UI section rewritten; lane/bucket/rollover logic and the guardia filter stay unchanged.
- 2026-08-25, claude: backfilled this map from scratch per the agenttrail convention appended by `agenttrail init`. Trust order used: code/directory layout first, `git log`, `docs/core/20-claude-code-handoff.md` (in-flight handoff doc), then architecture docs last, cross-checked against code.
- `by:` lines omitted throughout: every `[x]` here is a code-verified backfill, not work done by an agent this session — no authorship claim is being made.
- `docs/core/08-core-architecture.md` describes a `lan-squad/` directory that does not exist in this repo. Real-time sync runs through `cloud/sync-worker/src/room-sync-hub.js` (Cloudflare Durable Object) instead. Doc is stale; not corrected here — flagging only.
- `docs/core/20-claude-code-handoff.md` says the interconsulta team board is "approved 2026-08-25, not started." Code disagrees: bucket/role/rollover logic and the UI mount are already built, tested, and wired (uncommitted — see `git status`). Treated as in-progress here, `ic-rollover-button` left open since the rollover button's UI trigger wasn't found.
- Nube E2EE: code is built and wired, but `NUBE_E2EE_ENABLED = false` in source confirms the handoff doc's "not deployed" claim — cross-verified independently in code, not just trusted from docs. SUPERSEDED 2026-09-10: `NUBE_E2EE_ENABLED` flipped `true` in commit `1a6c146f` (2026-08-31, released 8.2.8) — see `{#nube-enable}` above for the current, live state.
- 2026-08-25, claude: interconsulta demo pivoted mid-session (owner: "seed it on the main R+ app, hidden like the pitch patients, so they don't sync") from the earlier verify-script-only build. Chose a merge-only toggle (⌥⌘⇧I) over a settings UI — matches the existing presentation-mode shortcut precedent and needs no new UI surface. Chose one shared `getSyncablePatients()` accessor over per-call-site `isDemo` filters in cloud-sync — fewer places to forget the filter next time a new sync call site is added.
- 2026-08-25, owner (via AskUserQuestion): "team selection should be streamlined and easy to access and set" on the consult-info card resolved as **"Quick picker on Resumen"** — a real team picker wired to the app's actual `assignPatientToTeamClinical` (IPC/cloud), usable for real patients, not a demo-only local toggle. Demo patients get a local-only fallback (`assignDemoPatientTeamLocally`) since they have no real DB row for the IPC call to resolve.
