# 4 · The feature map

> **You'll learn:** the 20 feature domains of R+, what each one is for, what data it reads and writes, and, most importantly, **how they feed each other**. This is the page to keep open when you wonder "if I change X, what else moves?"
>
> **Prereqs:** [03](./03-shared-state-and-wiring.md) (how features talk), [01](./01-the-big-picture.md)

---

## How to read the map

Every arrow below was **verified in the code**: someone found the import or the call, and the "where" column names the file. Arrows come in three kinds:

| Kind | Meaning | Example |
|---|---|---|
| **data** | one domain's data flows into, or is written by, another | Laboratorio → Nota: lab sets rebuild the note's *estudios* |
| **sync** | to or from the Nube room | Estado actual → Nube: `entries/{pid}/monitoreo` |
| **navigation / UI** | one domain opens, re-renders or routes to another; no data changes hands | Censo → Expediente: selecting a patient re-renders the chart |

In the interactive artifact, **click a domain** to see only its arrows and its card. In this Markdown version, the full lists are below.

<!-- MAP:features -->

## The shape in one paragraph

Data enters on the **left** (labs, cultures, meds, Estado actual, eventualidades). It lands on the **patient record** (Censo, Expediente, Resumen). It comes out as **work and documents** (note, pendientes, agenda, interconsultas) and as the **shift view** (guardia board, entrega, interno phones). **Nube** sits underneath and touches every domain twice, once to push and once to apply pulls. **Teams & access** sits above everything as a filter: it never changes clinical content, but it decides **who sees which patient** and **which room their data goes to**.

### The five busiest crossroads
1. **Censo & pacientes**: the most arrows in; almost every domain contributes a census column.
2. **Laboratorio**: the most arrows out; lab sets feed the note, trends, cultures, census, Resumen, EA and guardia.
3. **Estado actual**: feeds the note, census, guardia, Resumen and pendientes.
4. **Medicamentos**: feeds EA, note, pendientes, census and Dx.
5. **Nube**: touches everything (sync arrows).

### Surprising connections worth knowing
- **Meds → Pendientes:** pasting a receta creates to-dos from its ESTUDIOS / PROCEDIMIENTO rows.
- **Estado actual → Pendientes:** «No se realizó hoy» on dialysis marks the dialysis to-do skipped.
- **Labs → Guardia:** the newest lab date drives the "probable discharge" hint on the guardia board.
- **Guardia → Interno:** entrega pendientes appear on the intern's phone board (via `lib/entrega/`).
- **Labs → Meds:** smart paste notices that a SOME *indicaciones* block isn't labs and routes it to receta parsing.
- **Labs → Eventualidades:** an autosend call exists but is **disabled** (returns `skipped: 'disabled'`), so nothing flows today.
- **Settings → Censo:** pitch tours inject demo patients. `getSyncablePatients()` keeps them out of Nube, and `patientsForPersistence()` keeps them off disk.

### Naming traps
- **"Equipos"** means three things: clinical **teams** (*Equipos & acceso*), the **device-loan queue** (*Interno & equipos*), and in `panel-admin-equipos-*` it means team admin.
- **«Solo este equipo»** means *this computer*.
- **"alta"** means **admitting** to the census, not discharge.
- **`applyLanPatientEntries`** and **`live-sync-room.mjs`** are LAN-era names for code that now serves Nube.

---

## The domains
| Domain | What the resident does | Main files | State | Nube path |
|---|---|---|---|---|
| **Laboratorio** | Paste or import SOME / portal / PDF lab reports; parsed into lab sets. | labs.js · labs-*.mjs · lab-bulk-paste.mjs · features/lab-panel*.mjs · features/paste-smart*.mjs | reads/writes labHistory; writes notes[pid].estudios | labSidecars/{pid}/{setId} |
| **Cultivos** | Culture results, antibiograms, and a follow-up queue for cultures awaiting an ATB decision. | labs-cultivo*.mjs · cultivo-block-core.mjs · features/cultivo-queue-*.mjs · features/expediente/expediente-cultivos-*.mjs | reads labHistory (culture chunks); queue refresh writes labHistory | rides on labSidecars |
| **Tendencias** | Lab trend charts and tables; add eventualidades from a chart. | tend-*.mjs · features/tendencias*.mjs · features/lab-trend-arrows.mjs | reads labHistory, eventualidades; writes eventualidades | indirect (eventualidades) |
| **Eventualidades** | Dated events per patient (transfusions, procedures, incidents) as a timeline. | features/eventualidades-*.mjs · lib/clinical-repo/commands/eventualidades.mjs | reads/writes patient.eventualidades (via db:clinical-command) | entries/{pid}/eventualidades |
| **Medicamentos** | SOME receta → items with SOAP destinations; pharm profile, administration, VPO. | features/medications*.mjs · med-receta-*.mjs · med-pharm-profile-*.mjs · vpo-*.mjs · potassium-repos-*.mjs | reads/writes medReceta, medPharmProfile, vpo; writes monitoreo proposals, note tratamiento, todos | entries/{pid}/medReceta · /vpo · /medPharmProfile |
| **Estado actual** | Vitals, glucose, I/O, ventilation, diet and confirmed meds per shift. | features/estado-actual-*.mjs (~70) · note-from-estado-actual.mjs · soap-estado.mjs | reads/writes patient.monitoreo; reads medReceta, labHistory, todos; writes note evolución | entries/{pid}/monitoreo |
| **Expediente** | The per-patient tab shell: Datos, Dx, accesos, listado de problemas, Drive import. | features/expediente*.mjs · patient-diagnosticos.mjs · listado-problemas-*.mjs · features/drive-import-*.mjs | writes listadoProblemas, diagnosticos, accesos; Drive import writes patients, labs, eventualidades | entries/{pid}/listadoProblemas |
| **Censo & pacientes** | Sidebar census: add (alta), filter, edit bed data, delete, export the census PDF. | features/patients*.mjs · censo-*.mjs · patient-*.mjs · app-shell-patient-update.mjs | reads nearly everything for columns; writes patients | entries/{pid}/fields · admit · tombstones |
| **Resumen** | One-screen patient glance: EA, labs of the day, cultures to follow, overdue pendientes. | features/patient-dashboard/*.mjs · resumen-glance-cache.mjs | reads monitoreo, labHistory, medReceta, todos; writes interconsultServiceIds | entries/{pid}/fields |
| **Nota & documentos** | Evolution note and indicaciones; Word export and output folder. | features/notes-indicaciones.mjs · document-export-client.mjs · clinical-quick-export*.mjs · lib/doc-generators/* | reads/writes notes, indicaciones; reads diagnosticos | entries/{pid}/note · /indicaciones |
| **Pendientes** | Per-patient to-dos with priority, due date, reminders and handoff filter. | features/todos*.mjs · todos-*.mjs · censo-pendientes-format.mjs | reads/writes todos (storage) | todos/{id} |
| **Agenda** | Weekly procedure calendar linked to patients. | features/agenda*.mjs · procedure-agenda-week.mjs | reads/writes scheduledProcedures | agenda/{id} |
| **Interconsultas** | Consult mode: 4-team board, consult band, assign consults to teams. | features/interconsulta-*.mjs · lib/clinical-scope/interconsulta*.mjs | reads patients; writes consultInfo, team assignment | entries/{pid}/fields |
| **Equipos & acceso** | Registration, teams, rotations, privileges; scope decides who sees which patient. | features/clinical-teams/ · clinical-onboarding*.mjs · clinical-access-runtime/ · lib/clinical-scope/* · lib/db/clinical-access-*.mjs | reads/writes clinicalOps tables (users, teams, membership, assignments) | clinicalOps |
| **Guardia & entrega** | Guardia board, handoff (entrega) with pendientes and vitals plan, Inicio de turno. | features/guardia-*.mjs · features/clinical-entrega/ · features/inicio-turno/ · lib/entrega/* | reads patients, monitoreo, todos, labs; writes active_guardias, guardia marks, eventualidades | clinicalOps · entries/{pid}/fields |
| **Interno & equipos** | Interno phone QR/tokens and the medical-device loan queue. | features/cloud-sync/panel-interno-qr.mjs · features/equipos-*.mjs · lib/interno/* · lib/equipos/* | interno access rows; equipos queue (Worker) | internoAccessUpsert |
| **Admin** | Program admin: bulk provisioning, user purge, admin code, lab-portal check. | features/cloud-sync/panel-admin*.mjs · lib/admin-*.mjs | writes clinicalOps users and memberships | clinicalOps |
| **Ajustes & ayuda** | Settings, profile formats, Learn Hub, tours with demo patients, release notes. | features/settings-help/ · features/profile*.mjs · onboarding-*.mjs · tour-*.mjs | settings, tour progress; tours inject demo patients (never synced) | none |
| **Nube sync** | Pushes local changes as ops and applies pulled changes to every domain. | features/cloud-sync/ (~130) · features/sync-apply/ · features/cloud-mobile/ | reads all domains to push; writes all domains on pull | owns every path |
| **Plataforma** | Shell, ⌘K, tabs, undo, updater, backup, DB unlock, persistence. | app.js · app-shell*.mjs · app-state.mjs · storage/ · features/platform/ · features/command-palette.mjs | owns the in-memory maps and persistence | none of its own |

---

## Every connection, by source domain

### Laboratorio →

| To | Kind | What flows | Where |
|---|---|---|---|
| Nota & documentos | data | lab sets rebuild the note’s estudios text | `lab-history-maint.mjs rebuildEstudiosFromLabHistory` |
| Tendencias | data | lab sets feed the trend series index | `features/tendencias-render.mjs → lab-history-cache.mjs` |
| Cultivos | data | culture chunks split out of lab sets | `labs-cultivo.mjs parseCultivo_` |
| Censo & pacientes | data | Labs column; critical-lab badge; stub patient admitted from a paste | `censo-labs-format.mjs · sala-view-variants.mjs · lab-bulk-stub-admit.mjs` |
| Resumen | data | labs-of-the-day glance; re-render on lab revision | `dashboard-model.mjs · dashboard-mount.mjs onLabHistoryRevision` |
| Estado actual | data | latest gasometría for the ventilatory clause | `features/estado-actual-ventilatorio-labs.mjs` |
| Medicamentos | navigation / UI | a SOME indicaciones paste is routed to receta parsing | `features/paste-smart.mjs → procesarRecetaFromText` |
| Guardia & entrega | data | newest lab date drives the "probable discharge" hint | `features/guardia-census-table.mjs isProbableDischargeCandidate` |
| Censo & pacientes | navigation / UI | smart paste matches/selects a patient by registro | `features/paste-smart.mjs findPatientByRegistro` |
| Nube sync | sync | labSidecars/{pid}/{setId} | `lab-panel-workbench-store.mjs enqueueCloudLabSidecarsForPatient` |

### Cultivos →

| To | Kind | What flows | Where |
|---|---|---|---|
| Censo & pacientes | data | Cultivos census column | `censo-cultivo-format.mjs formatCultivosForCenso` |
| Resumen | data | cultures awaiting an ATB decision | `cultivo-queue-model.mjs extractCultivoFollowUpCandidates` |
| Laboratorio | data | follow-up queue re-fetches pending cultures from the portal | `features/cultivo-queue-refresh.mjs` |

### Tendencias →

| To | Kind | What flows | Where |
|---|---|---|---|
| Eventualidades | data | create / edit / delete an eventualidad from a chart | `features/tendencias-event-compose.mjs` |
| Laboratorio | navigation / UI | ↑ / ↓ trend arrows in the lab output | `features/lab-trend-arrows.mjs buildLabTrendLookup` |

### Eventualidades →

| To | Kind | What flows | Where |
|---|---|---|---|
| Tendencias | data | event markers on charts; re-render | `features/tendencias-event-context.mjs · eventualidades-render.mjs` |
| Nube sync | sync | entries/{pid}/eventualidades (via change-log projector) | `eventualidades-render.mjs drainClinicalSyncProjector` |

### Medicamentos →

| To | Kind | What flows | Where |
|---|---|---|---|
| Estado actual | data | «Llevar a SOAP» proposals → pendienteReceta; insulin-pump algorithm | `estado-actual-meds.mjs applyRecetaProposalForce` |
| Nota & documentos | data | «Añadir a tratamiento» appends lines to the note | `medications-receta-processing.mjs mediAnadirATratamiento` |
| Pendientes | data | ESTUDIOS / PROCEDIMIENTO rows become to-dos | `addPendientesFromParsedReceta` |
| Censo & pacientes | data | ATB (with day count) and Meds columns | `censo-meds-format.mjs` |
| Expediente | data | VPO diagnoses pushed to the patient | `vpo-panel.mjs → pushDiagnosticosToPatient` |
| Resumen | data | med classification for the EA glance | `ea-glance-meds.mjs → med-receta-soap.mjs` |
| Nube sync | sync | entries/{pid}/medReceta · /vpo · /medPharmProfile | `medications-actions.mjs · vpo-panel.mjs` |

### Estado actual →

| To | Kind | What flows | Where |
|---|---|---|---|
| Nota & documentos | data | «Traer de Estado actual» fills Evolución + empty vitals; SOAP template | `estado-actual-send-note.mjs · note-from-estado-actual.mjs · soap-estado.mjs` |
| Censo & pacientes | data | Signos / I-E-B column | `censo-signos-format.mjs deriveSnapshot · balanceTurno` |
| Guardia & entrega | data | «Alterados» column; Inicio de turno «Toma de signos» | `guardia-census-table.mjs isVitalKeyAltered · inicio-turno-summary.mjs` |
| Resumen | data | EA glance (KPIs, SOAP columns) | `ea-glance-model.mjs buildEaGlance` |
| Pendientes | data | «No se realizó hoy» marks the dialysis to-do skipped | `estado-actual-panel-registro.mjs → setTodoDialysisSkippedToday` |
| Medicamentos | navigation / UI | re-render med panel and SOAP bar after an EA edit | `estado-actual-panel-actions.mjs` |
| Nube sync | sync | entries/{pid}/monitoreo (field-wise merge) | `estado-actual-panel-actions.mjs scheduleCloudSyncPush` |

### Expediente →

| To | Kind | What flows | Where |
|---|---|---|---|
| Nota & documentos | data | «Desde censo» syncs diagnoses into the note; listado → Word | `patient-diagnosticos.mjs syncNoteDxFromPatient · expediente-listado.mjs` |
| Censo & pacientes | data | Dx text in census; Drive import creates & selects a patient | `diagnosticosTextForCenso · drive-import-apply.mjs` |
| Guardia & entrega | data | Dx on guardia cards | `guardia-board-chrome.mjs` |
| Laboratorio | data | Drive import writes lab sets | `drive-import-apply.mjs applyDriveImportLabSets` |
| Eventualidades | data | Drive import writes eventualidades | `drive-import-apply.mjs` |
| Resumen | navigation / UI | hosts and renders the patient tabs (Resumen, EA, Nota, Pendientes…) | `features/expediente-inner-cache.mjs` |
| Nube sync | sync | entries/{pid}/listadoProblemas | `expediente-listado.mjs` |

### Censo & pacientes →

| To | Kind | What flows | Where |
|---|---|---|---|
| Nota & documentos | data | a new patient gets the note scaffold | `patients.mjs applyNotaFormatScaffoldIfEmpty` |
| Expediente | navigation / UI | selecting a patient re-renders the chart and header | `patients-select.mjs selectPatient` |
| Medicamentos | navigation / UI | unsaved med / VPO drafts stashed on patient switch | `patients-select.mjs stashPatientDraftsOnChange` |
| Laboratorio | data | registro tunnel fetches portal labs for a new patient | `patient-registro-tunnel.mjs` |
| Nube sync | sync | admit, fields, delete tombstones | `patients-modal-commit.mjs · patient-delete-batch.mjs` |

### Resumen →

| To | Kind | What flows | Where |
|---|---|---|---|
| Interconsultas | data | toggle interconsult services on the patient | `dashboard-mount.mjs · ic-modal.mjs` |
| Laboratorio | navigation / UI | jump into the lab tab | `lab-inner.mjs switchLabInner` |

### Pendientes →

| To | Kind | What flows | Where |
|---|---|---|---|
| Censo & pacientes | data | Pend. column (top-priority open items) | `censo-pendientes-format.mjs` |
| Guardia & entrega | data | open / overdue counts; «Heredas pendientes» | `guardia-census-table.mjs · inicio-turno-summary.mjs` |
| Resumen | data | overdue pendientes | `dashboard-mount.mjs` |
| Estado actual | data | dialysis to-do drives the registro hint | `estado-actual-panel-registro.mjs` |
| Plataforma | navigation / UI | reminder toasts + OS notification | `todos-reminder-scheduler.mjs` |
| Nube sync | sync | todos/{id} | `todos-mutations.mjs enqueueCloudTodoUpsert` |

### Agenda →

| To | Kind | What flows | Where |
|---|---|---|---|
| Nube sync | sync | agenda/{id} | `agenda.mjs enqueueCloudAgendaUpsert` |
| Plataforma | navigation / UI | included in the undo snapshot | `features/productivity.mjs` |

### Interconsultas →

| To | Kind | What flows | Where |
|---|---|---|---|
| Censo & pacientes | data | consult info and service hue on cards and census | `patients-card-html.mjs · consult-band.mjs` |
| Equipos & acceso | data | assign a consult patient to a team | `patient-team-assign-ui.mjs → db:clinical-assign-patient-to-team` |
| Nube sync | sync | consultInfo on entries/{pid}/fields | `interconsulta-mode-chrome.mjs` |

### Equipos & acceso →

| To | Kind | What flows | Where |
|---|---|---|---|
| Censo & pacientes | data | scope filters which patients the census shows | `patients-clinical-filter.mjs · clinico-access.mjs` |
| Guardia & entrega | data | guardia census grid built from DB scope | `clinical-access-runtime/guardia-grid.mjs → db:guardia-census` |
| Resumen | navigation / UI | clinical context bar | `clinical-context-bar.mjs` |
| Nube sync | sync | clinicalOps after roster changes (pull, merge, push) | `teams-guardia-bridge.mjs publishClinicalTeamsAfterChange` |

### Guardia & entrega →

| To | Kind | What flows | Where |
|---|---|---|---|
| Eventualidades | data | the action sheet saves an eventualidad | `guardia-patient-action-sheet.mjs` |
| Censo & pacientes | data | guardia marks on the patient; entrega markers on grid chips | `guardia-patient-action-sheet.mjs · lib/entrega/entrega-chip-markers.mjs` |
| Equipos & acceso | data | entrega vitals plan drives background vitals alerts | `session-manager.mjs BackgroundVitalsMonitorLoop` |
| Interno & equipos | data | entrega pendientes shown on the intern board | `lib/interno/interno-board.mjs → lib/entrega/*` |
| Nube sync | sync | entrega → active_guardias → clinicalOps | `clinical-entrega-submit.mjs pushCloudClinicalOpsNow` |

### Interno & equipos →

| To | Kind | What flows | Where |
|---|---|---|---|
| Guardia & entrega | data | intern vitals banner on guardia chips | `lib/interno/vitals-banner.mjs calcVitalsBanner` |
| Nube sync | sync | internoAccessUpsert op (QR token) | `interno-access-sync.mjs` |

### Admin →

| To | Kind | What flows | Where |
|---|---|---|---|
| Equipos & acceso | data | bulk provisioning and membership | `panel-admin-equipos-row-persist.mjs → db:clinical-teams-member-add` |
| Laboratorio | data | lab-portal verification | `panel-admin-labs-verify.mjs → lab-repo-check` |
| Nube sync | sync | publishes clinicalOps after admin edits | `panel-admin-equipos-actions.mjs` |

### Ajustes & ayuda →

| To | Kind | What flows | Where |
|---|---|---|---|
| Nota & documentos | data | changing app mode / estudios format rebuilds estudios | `profile-app-mode.mjs` |
| Censo & pacientes | data | pitch tour seeds demo patients (never synced); census PDF from Ayuda | `tour-pitch-seed-core.mjs · settings-help/index.mjs` |
| Equipos & acceso | navigation / UI | Learn Hub gates on clinical onboarding | `learn-hub.mjs needsClinicalOnboarding` |

### Nube sync →

| To | Kind | What flows | Where |
|---|---|---|---|
| Censo & pacientes | sync | pulled entries merged into patients; list re-renders | `pull-apply.mjs → sync-apply/patient-entries.mjs` |
| Laboratorio | sync | pulled lab sets merged; revision bumped | `pull-apply.mjs applyLanLabSetsToExistingPatients` |
| Nota & documentos | sync | pulled note / indicaciones merged | `sync-apply/patient-entries.mjs` |
| Estado actual | sync | pulled monitoreo merged field-wise | `mergePatientMonitoreoFromImported` |
| Pendientes | sync | pulled to-dos saved; UIs refreshed | `pull-apply.mjs → todos-refresh.mjs` |
| Agenda | sync | pulled agenda saved | `pull-apply.mjs saveScheduledProcedures` |
| Equipos & acceso | sync | pulled clinicalOps applied to scope and teams | `pull-apply.mjs hydrateClinicalTeamsAfterCloudPull` |

### Plataforma →

| To | Kind | What flows | Where |
|---|---|---|---|
| Censo & pacientes | navigation / UI | ⌘K, tabs, backup import replaces all state | `command-palette.mjs · productivity.mjs` |
| Guardia & entrega | navigation / UI | ⌘K «Inicio de turno» | `command-palette.mjs openInicioTurnoPanel` |

---

## Check yourself

1. You change how lab sets are stored. List the domains that read them.
2. Which domain would you touch to add a column to the census PDF for "dieta"?
3. A resident says a procedure to-do appeared "by itself". Where did it come from?
4. Which domain has no say over clinical content but decides who sees it?

<details><summary>Answers</summary>

1. Nota (estudios), Tendencias, Cultivos, Censo, Resumen, Estado actual (gasometría), Guardia (discharge hint), Nube (sidecars).
2. Censo (`censo-build-sections.mjs`), reading from Estado actual (`monitoreo.estadoClinico.dieta`).
3. From a pasted receta: its ESTUDIOS / PROCEDIMIENTO rows became pendientes.
4. Equipos & acceso (team scope).
</details>

**Next:** [05 · The codebase map →](./05-codebase-map.md)
