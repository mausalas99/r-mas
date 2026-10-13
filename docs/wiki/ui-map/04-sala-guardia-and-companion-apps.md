# UI map 04 — Team/ward surfaces and companion web apps

Scope: Sala views, Guardia, Interconsulta board, Eventualidades, Modo Entrega, VPO, Censo export, R+ Móvil (mobile + join), Interno app, Equipos app.

Rules for this doc: facts come from code only. Each claim has a `path:line` cite. Paths are under `packages/core/public/` unless noted (root `public/` is a symlink to it). UI labels stay in Spanish exactly as shown in code. "not found" means the code does not show it. No patient data is used.

Short map of the four work modes in the header: `Sala`, `Interconsulta`, `Guardia` (`index.html:570-573`). Guardia button shows only in DB mode (`js/features/guardia-mode-button.mjs:8-14`).

---

## 1. Sala views (cards vs sidebar)

**Purpose.** Show all beds as cards ("Camas") instead of the sidebar list. Default is cards. (`js/features/sala-view-variants.mjs:1-5`, `:25`, `:48-50`)

**Who.** Any user in Modo Sala. Cards are on only when work mode is `sala` and storage `rplus-sala-view` is not `bar` (`:48-50`).

**Entry.** Sala mode in header. Sidebar has a button, title `Ver pacientes como tarjetas` (`:196`). Hint after switching to bar: `Vuelve a las tarjetas aquí` (`:202`; hint keys `:26-27`).

**Home screen (`renderHome`, `:147`).**
- Title `Pacientes` and count `N en sala`.
- Buttons: `Barra lateral` (`:165`), `Actualizar labs` (`:166`), card corner button to archive (`Archivar paciente`) or restore (`Restaurar a sala`, `:98`).
- Archived view: `‹ Sala` back button, title `Archivados`, count (`:157`).
- Card parts: bed line `Cto. … · Cama …` or `Sin cama` (`:88-91`); tags `No RCP`, `Ingreso incompleto`, `Lab crítico` (`:105-113`); labels `Diagnósticos` / `Sin diagnóstico`, `Interconsultas` / `Ninguna` (`:118-146`); ventilation tier names `Alto flujo`, `VMNI`, `VM` (`:19`).
- Empty: `Sin pacientes aún.` (`:171`).

**Patient open state.** A thin rail named `Camas` (`aria-label`) shows one button per bed. First button `Camas` with title `Ver todas las camas (Esc)` (`:175-180`). `Esc` returns to cards unless an input, modal or dialog uses the key (`:241-247`).

**Actions.**
| Control | Result | Cite |
|---|---|---|
| Card click | open patient (`data-sv-open`) | `:162-239` |
| `Barra lateral` | store `bar`, show sidebar | `:52-57`, `:165` |
| `Actualizar labs` | lazy-load labs module, run labs update | `:147-158` (`openLabsUpdate` `:206`) |
| Archive/restore corner | move patient in/out of archived | `:98` |
| Rail `Camas` | back to home | `:180`, `:233-235` |

**States.** Empty: see above. Loading, error, offline: not found in this file. Storage failures are caught and logged (`:34-46`).

**Links.** Patient view (Resumen). Labs update flow. Interconsulta board reuses `bedLine`, `cardTagsHtml`, `cornerBtnHtml` from this file (`js/features/interconsulta-team-board.mjs:16`).

**Live check, Sala views (2026-10-05, CDP 9224).**
- ✔ live: default is cards; title `Pacientes`, count `9 en sala`; card shows `Cto. 300 · Cama 01`, `Lab crítico`, `DIAGNÓSTICOS` / `Sin diagnóstico`, `INTERCONSULTAS` / `Ninguna`, corner archive icon; `Barra lateral` stores `rplus-sala-view=bar` and shows the sidebar; sidebar button `btn-sala-view-cards` (title `Ver pacientes como tarjetas`) returns to cards; hint bubble `Vuelve a las tarjetas aquí` shows after the switch; `Esc` and `‹ Camas` return to cards.
- ✘ fixed: the home header has THREE more controls than the doc lists: `Archivados N` (data-sv-arch, first in row), `Barra lateral`, `Actualizar labs`, and primary `+ Agregar` (`openAddModal()`, `sala-view-variants.mjs:167`). Doc listed only the middle two.
- ✘ fixed: the patient-open view has a back pill `‹ Camas` next to the name (not only the rail), plus `+ Agregar` and `Actualizar labs`. Rail labels are `cuarto-cama` (`300-1`, `301-2` ...), the patient name is only the title; first rail button is `Camas` (grid icon). Rail is a `Camas` rail only in cards mode.
- ✘ fixed: archived view: back `‹ Sala`, title `Archivados`, count; the corner button text is `Restaurar` (no `a sala`).
- + live: the mode switcher in Sala shows toast `Modo cambiado a Sala` and, on first use, the bubble `Nuevo: vuelve a la barra lateral cuando quieras` (persists until dismissed, overlaps card corners). Top bar in Sala: area pill `Paciente` + sub-tabs `Resumen`, `Estado actual`, `Eventualidades`, `Medicamentos`, `Listado`, `VPO`, `Pendientes`, header button `Censo`, mode pill `Sala`.
- + live: with NO patient open, clicking sub-tab `Eventualidades` (or any sub-tab) only highlights the tab; the card home stays on screen. A patient must be opened first.
- + live: card tags depend on data: `Ingreso incompleto` shows only for patients with incomplete admission; synthetic complete patients show just `Lab crítico`.
- Loading/error/offline for cards: none seen live (not found).

**CSS.** `styles/sala-views.css:1` says all rules hang from `body[data-sala-view]`; bar view applies nothing. Sections: Inicio `:12`, rail `:184`, interconsulta chip `:250`, sidebar button `:265`, onboarding bubble `:281`, Archivados `:307`.

---

## 2. Guardia (census board)

**Purpose.** Night/call census for the ward the user covers. Opens the Entrega modal per patient. (`js/features/guardia-board-render.mjs:150-170`)

**Who.** Residents on call and R4/admin. Auto-enters Guardia mode when the user is the on-call receiver today (`js/features/guardia-board-chrome.mjs:46-67`). Rank for the grid: R4 for elevated users (`:38-43`).

**Entry.** Header button `Guardia` (title `Guardia — censo, entrega y turno activo`, `index.html:573`). Root panel `#appcontent-guardia` (`index.html:816-824`) holds three blocks: `guardia-incoming-strip` (aria-label `Pacientes entrantes (preview)`), `guardia-orphan-entregas-strip` (`Entregas sin expediente local`), and the census section (`Censo de pacientes`).

**Phase bar: not found (removed).** The old phase bar, roster panel and grid-view toggle were removed 2026-09-24 (`js/features/clinical-entrega/clinical-entrega-phase.mjs:2-4`). The Help text still says `Barra de fase` (`js/features/settings-help/help-content.mjs:31`) — this text is out of date with the code.

**Render steps (`renderGuardiaBoard`, `guardia-board-render.mjs:203-253`).**
1. If not Guardia mode: clear the board.
2. Loading skeleton until first load is done (`:222`); text `Cargando censo…` (`guardia-census-empty.mjs:146`).
3. Sala step: use 24 h override, else home sala, else the picker (`:232`, picker `:192`).
4. Build census, mount table, wire incoming and orphan strips (`:243-244`).

**Sala picker.** Title `Activar guardia`; text says the profile has no sala; select `Sala`; button `Empezar guardia` (`guardia-census-empty.mjs:75-85`).

**Census table (`guardia-census-table.mjs`).**
- Header: `Censo · N paciente(s)` (`:428`); button `Cambiar` (id `guardia-btn-cambiar-sala`, `:433`) clears the sala and shows the picker again (`guardia-board-chrome.mjs:83-97`).
- Filter chips: `Con pendiente · N`, `Todos`, `Ingresos` (`:400-402`).
- Chip/row marks: `Crítico` (`:246`), `Sin laboratorios en 7 días: posible alta` (`:242`), esfuerzo values such as `Reanimar` / `No reanimar` (`:24-26`).
- Row click opens the Entrega modal (`guardia-board-render.mjs:149-165`).
- Groups by team; groups are `details` elements that remember collapse (`guardia-census-table.mjs:455-480`).

**Counters band (3 cells) — ✘ not reachable live.** Code mounts it into `#guardia-summary` (`guardia-board-chrome.mjs:303`), but `index.html` has no element with that id; live DOM confirms `getElementById('guardia-summary') === null` and no band shows. Treat as dead. Original text: `Toma de signos · 08:00` (shows `N de M recibidos` or `Sin plan de signos`), `Pendientes` (`N abierto(s)`, `N vencido(s)`), `Ingresos` (`N nuevo(s)`, `N en valoración`) (`guardia-board-chrome.mjs:257-297`).

**Filter hint.** When the "solo entregados" filter is on: `Solo pacientes que te entregaron en este turno.` (`:333`).

**States.**
- Loading: skeleton (`guardia-census-empty.mjs:142-157`).
- Empty with filter: `No hay pacientes en este alcance` + button `Ver censo completo` (`:14-17`).
- Empty without filter: `No hay pacientes visibles` (`:22`).
- Orphan entregas strip: buttons `Abrir`, `Eliminar del servidor` (`guardia-orphan-entregas.mjs:66-69`); toasts `Expediente recuperado del anfitrión.` (`:116`), `Base clínica no disponible.` (`:226`), `Entrega liberada.` (`:243`).
- Offline/error beyond these: not found.

**Live check, Guardia (2026-10-05).**
- ✔ live: mode pill `Guardia`; in Guardia the top bar has no sub-tabs, only `Censo` + mode pill. Board = `CENSO · 9 PACIENTES` header with `Cambiar`, chips `Con pendiente · 0`, `Todos`, `Ingresos`; one group `EQUIPO SALA 1 · 9` (collapsible `▾`); footer `9 pacientes sin alterados ni pendientes` (`guardia-census-table.mjs:390`, was missing in doc). Rows are `gct-card` buttons: `300 · 01  Rosa Delgado` (name, not full name; tooltip carries full name); hourglass mark `⏳` (`Sin laboratorios en 7 días: posible alta`) on patients with no labs.
- ✔ live: `Cambiar` opens `Activar guardia`: text `Tu perfil no tiene sala. Elige la que cubres esta noche. Para no ver este paso, pon tu sala en Mi rotación.` (doc had only the first part), select `Sala` with options Sala 1, Sala 2, Sala E, Torre HU, Área A/Pensionistas, Interconsultas, UX, Eme; `Empezar guardia` returns to the census.
- ✘ fixed: the empty state of `Con pendiente` and `Ingresos` with 0 matches is a blank body (no `No hay pacientes en este alcance` text, no `Ver censo completo` button). Those texts need the "solo entregados" filter, which has no control live.
- ✔ live: phase bar, roster and `Finalizar turno` are NOT in the UI. They are still named in Help: `Centro de ayuda` (header `?` → `Aprender R+` → `Buscar en el centro de ayuda`, search `Modo Entrega`) shows `Modo Entrega y pendientes` with bullets `Barra de fase`, `Por paciente`, `Roster`, `Pendientes v2`, `Finalizar turno`. Help text is stale. Help menu items: `Atajos de teclado`, `Aprender R+`; the center also has `Reiniciar tutorial · Sala`, `Tutorial · Interconsulta`, `Ver pistas de nuevo` and module buttons.
- ✔ live: incoming strip and orphan strip exist hidden (`hidden` attr) and stay hidden with no data.
- ✘ fixed: rotation: `btn-rotation-config-open` is not in the DOM for this profile (R2, no admin); the rotation modal ids exist but stay hidden. Not reachable for non-admin.
- Cloud-download icon appears in the top bar after some actions (update/sync hint); not documented.

**Patient action sheet (unreachable — ✔ confirmed).** Grep of `public/js` finds `openGuardiaPatientActionSheet` only in its own file; row click opens Entrega live. Original note: `openGuardiaPatientActionSheet` (`guardia-patient-action-sheet.mjs:359`) offers `Abrir expediente` and `Registrar eventualidad` (`:261-265`), a note field `Nota de guardia` and `Esfuerzo terapéutico` / `Pronóstico` marks (`:142-146`). No caller was found in `js/` (grep of `.mjs`), and the row click goes to Entrega instead. Treat as dead code until a caller is shown.

**Live refresh.** The event `rpc-interno-vitals-synced` reloads the census (`js/features/guardia-board.mjs:21-26`).

**Rotation controls.** Modal `Configuración rotación`: fields `Fin de mes (referencia)`, `Vigencia (effective_at)`, `Días de preview`; buttons `Cancelar`, `Guardar ciclo` (`index.html:2104-2140`). Open button id `btn-rotation-config-open` (`js/features/clinical-rotation.mjs:268-272`). Per `CLAUDE.md` note in `styles/pase-board.css:4693`, Guardia has no `Mi rotación` in the top bar.

**CSS.** `styles/pase-board.css` (5722 lines) is mostly Guardia: census grid `:2`, cards `:54`, skeleton `:134`, "Modo Guardia (full dashboard)" `:261`, vitals `:950`, "Hallmark · guardia dashboard" `:1941`. The file name says "pase" but the content is Guardia/Entrega.

**Links.** Entrega modal (section 4). Interno app gets the same entregas (section 9). Rotation and teams modals.

---

## 3. Interconsulta board

**Purpose.** Board of consult patients from other services, sorted by team lane. Mode `Interconsulta`: sidebar is hidden on the board, the board fills the window, a card click opens the patient, `← Tablero` or `Esc` goes back (`js/features/interconsulta-mode-chrome.mjs:1-24`). ✔ live (sidebar hidden on board; `Esc` from a patient returns to the board).

**Who.** Interconsulta teams (guardia, activo, post-guardia). Entry ✘ fixed: there is no header button `Interconsulta`. Entry is the mode switch in the top bar, group `Modo de trabajo` (`#header-mode-seg`): `Sala` | `IC` | `Guardia`. It shows only the current mode as a pill with three dots under it and opens on hover/focus. `IC` has title `Modo Interconsulta — Nota de evolución, Indicaciones` and aria-label `Interconsulta`. Click shows toast `Modo cambiado a Interconsulta` (to Sala: `Modo cambiado a Sala`). + live.

**Mode switch effects (+ live).**
| | Sala | IC |
|---|---|---|
| Area pill menu (`Área: Paciente`, digits 1-4) | `Paciente`, `Laboratorio`, `Manejo`, `Agenda` | same four items |
| Sub-tabs of `Paciente` | `Resumen`, `Estado actual`, `Eventualidades`, `Medicamentos`, `Listado`, `VPO`, `Pendientes` | `Resumen`, `Estado`, `Nota`, `Indic.`, `VPO`, `Pendientes` |
| Top bar, right side | patient-card icon (`Datos del paciente`), search, `Censo` button, mode pill `Sala` | patient-card icon only inside a patient, search, no `Censo`, mode pill `IC` |
| Sidebar | `Barra lateral` button shows it | board: hidden. Patient view: narrow rail with `Tablero` button and chips `300-1`, `301-2`... (cuarto-cama) |
| Main screen | `Pacientes` cards, `9 en sala` | `Interconsultas` board, `17 pacientes` |
- `Medicamentos` has no tab in IC. It lives under area `Manejo` (sub-tabs `Manejo actual`, `Perfil histórico`; page `Medicamentos del turno`, buttons `Egreso`, `Importar SOME`). `Agenda` is one page, `Agenda de procedimientos`, week grid `Lun 5 oct — dom 11 oct 2026`, no sub-tabs. `Laboratorio` sub-tabs `Labs`, `Tendencias`, `Cultivos`.
- The board lists 17 consult patients; the rail inside a patient lists 8 patients (the Sala set), not the board set.

**Top bar on the board (`buildInterconsultaBarHtml`, `interconsulta-mode-chrome.mjs:121-150`).** ✘ fixed: on the live board the top bar has only the area pill `Paciente`, search, mode pill, LAN, profile, help, settings, theme. These rows from the code are not visible: `Solo guardia de hoy`, `Ocultar post-guardia`, `⋯ → Generar nota (.docx)`, `⌘/` (the shortcuts button exists in the DOM but is hidden). `← Tablero` is not in the top bar; it is a page button inside the patient view (title `Volver al tablero de equipos`) and the rail button `Tablero` (aria `Volver al tablero`). `Actualizar labs` is in the board header, not the top bar. The two toggles may need a guardia team (`Sin equipo de guardia hoy.`): not reachable here.

**Board header (`icHeaderHtml`, `:584-611`).** ✔ live: `Interconsultas`, count `17 pacientes`, segment `Asignar` | `Mi equipo`, `+ Agregar`, `Actualizar labs`. ✔ live: in `Mi equipo` a select `Mi equipo` appears with one option here, `Equipo Interconsultas`. Mode and team stay in local storage (`:508-551`, not checked).

**Mode `Asignar` (`interconsulta-team-board.mjs:158-198`).** ✘ fixed lanes, top to bottom: `Guardia` (pill `Guardia`, empty text `Sin equipo de guardia hoy.`); `Equipo Interconsultas` (count badge `0`, empty text `Suelta un paciente aquí`) (+ live, a named team lane); `Activo 2` (`Sin equipo asignado.`; no `Activo 1` lane in this data); `Post-guardia` (pill, note `No presencial hoy — pacientes repartidos al resto del equipo.`, `Sin equipo.`). Below: tray `Por asignar` with count badge and note `Arrastra cada tarjeta a un equipo` (✔ live). Drag-drop onto a lane: a drop on the lane gave toast `Equipo actualizado` and the card left the tray (17 → 16); the lane still read `0` and `Mi equipo` showed `Sin pacientes en este equipo.` (open: tested with synthetic drag events, not a real mouse drag). Bucket names `Preop / Nuevas hoy`, `Pendientes`, `Under`: not seen (no data in lanes).

**Mode `Mi equipo`.** ✔ live empty state: `0 pacientes`, `Sin pacientes en este equipo.`. Full cards by bucket: not reached.

**Card (Asignar tray).** ✘ fixed: mono line `Cto. 300 · Cama 01`; red chips `Ingreso incompleto` and `Lab crítico`; name; `Sin servicio` or a colored service chip (`Cirugía general`, `Traumatología`; or the area name, `Sala`, `Torre HU`); archive icon bottom right. No `Diagnósticos` or `Servicio solicitante` labels on this card. Clicking a card opens the patient (`Resumen`). A card with `Ingreso incompleto` opens the `Completar ingreso` modal at once. When the request is saved the chip `Ingreso incompleto` goes away and the service chip appears.

**Request → answer flow (+ live).**
1. Modal `Completar ingreso`: `Servicio solicitante *` (5 chips: `Traumatología`, `Cirugía general`, `Ginecología`, `Neurocirugía`, `Cirugía plástica`), `Motivo de consulta` (textarea), `FI · Fecha de ingreso` and `FIMI · Fecha de interconsulta MI` (date pickers `Elegir fecha`), `Cuarto *` and `Cama *` (prefilled `302`, `01`), `Equipo` (`— Sin asignar —`, `Equipo Sala 1`; hint `Asigna al equipo que cubrirá el caso en ⇄.`), button `Agregar Paciente`. `Esc` does not close it; `×` asks `¿Cerrar sin guardar?`.
2. `Agregar Paciente` with no service: red toast `Ingresa servicio` (stays on screen and stacks on repeat); the modal stays open.
3. With service + motivo: modal closes, toast `Ubicación guardada`; header shows the band.
4. Consult band: `Servicio` button (aria `Servicio solicitante`) opens a panel `Servicio solicitante` with the 5 chips and `Cerrar` (`Esc` also closes it); `Motivo` input (aria `Motivo de consulta`, placeholder `Agregar`); `Seguimiento` select `Sin definir`, `Pendiente`, `En curso`, `Resuelta` (✔ live).
5. ✘ fixed: the band has NO team select. The team is set only in the modal `Equipo` select or by drag on the board.
6. Answer is written in `Nota` / `Indic.` (see `02-patient-workspace.md`, IC live check) and exported as `.docx`; `Resuelta` archives the patient (from code, not run).

**States.**
- Empty lane: `Suelta un paciente aquí` (✔ live); no guardia team: `Sin equipo de guardia hoy.` (✔); `Sin equipo asignado.` (✔); `Sin equipo.` (✔); tray empty `Todos tienen equipo.` (not reached).
- Archivados section ✘ fixed: footer toggle `ARCHIVADOS (2)` (collapsed by default, counts include patients archived in Sala). Open: rows `Nombre ·incompleto` with `Cto. 315 · Cama 02 · Área A/Pensionistas` and a round icon (archive or `↩` restore). A patient is archived if `archived` or `interconsult_status === 'Resolved'` (`:552-575`, code).
- Toast after refresh `Pacientes actualizados` (`:442`): `Actualizar labs` not clicked, no network.
- Staged teams (`rotation_active = 0`) are kept off the board (code only).
- Offline: toasts `Sin conexión con el servidor local. No podrás generar documentos hasta reiniciar R+ o recuperar el servicio en segundo plano.` and `Sin conexión a R+ Cloud. La sincronización de sala puede estar limitada hasta reconectar en ⇄.` exist (+ live, shown in the test app).

**Demo.** Shortcut ⌥⌘⇧I: not run (would change data).

**Links.** Patient Resumen (card click, `openIcPatient` `:501`) ✔ live. Add-patient modal (`+ Agregar`, titled `Agregar por registro`, field `Registro(s)` placeholder `REGISTRO 1`, `Equipo` select, `Agregar Paciente`) ✔ live. `Ir a Medicamentos` in VPO leads to area `Manejo`.

### Live verification, Interconsulta (2026-10-05)
Counts: about 62 claims checked on the board, band, VPO. ✔ live about 30; ✘ fixed 14; + live 20; not reachable 6.
Biggest corrections:
1. No `Interconsulta` header button: mode is a `Sala | IC | Guardia` pill group; IC board top bar has none of the listed toggles; `Actualizar labs` lives in the board header.
2. Consult band has no team select; only `Servicio`, `Motivo`, `Seguimiento`.
3. Lanes are `Guardia`, `Equipo Interconsultas`, `Activo 2`, `Post-guardia` (no `Activo 1`); the card shows `Ingreso incompleto` / `Lab crítico` chips, not `Diagnósticos` / `Servicio solicitante`.
4. Missed: auto-opened `Completar ingreso` flow with toasts `Ingresa servicio` and `Ubicación guardada`; `Medicamentos` is under `Manejo` in IC; `Tomar de SOME` in VPO needs a processed receta.
5. Open: drop on a lane toasts `Equipo actualizado` but the lane count and `Mi equipo` stay `0`.

---

## 4. Modo Entrega and the pase board

**Name check.** "Pase board" has no own screen in code. The CSS file `styles/pase-board.css` holds Guardia and Entrega styles. The surface is the Entrega modal opened from the Guardia census. Help calls it `Modo Entrega y pendientes` (`help-content.mjs:26`). "Modo Entrega" as a full mode (roster, phase bar, `Finalizar turno`) is described in Help (`:29-35`) but removed in code (`clinical-entrega-phase.mjs:2-4`).

**Entry.** Click a census row (`guardia-board-render.mjs:149-165`). The modal is `#entrega-modal` (`index.html:2021-2087`).

**Modal layout.**
- Top nav: `Paciente anterior` / `Paciente siguiente`, patient name and dx, active badge, counter, `Cerrar` (`index.html:2023-2041`).
- Title by context: `Nueva entrega`, `Actualizar entrega`, `Pendientes de guardia`, `Entrega / pendientes` (`js/features/clinical-entrega/clinical-entrega-modal.mjs:309-318`).
- Fields: `R1 de guardia` (hint: `Residente de guardia que asumirá la cobertura nocturna de este paciente.`, `:227`), `Equipo del paciente` (`index.html:2048-2055`).
- Handoff panel (`js/features/entrega-modal-ui/entrega-modal-handoff.mjs`): `Estado general`, marker chips (`Crítico`, `Negativas firmadas`, `Esfuerzo terapéutico`, `Pronóstico`, `:198-206`), `Notas breves de entrega` (`:211-212`), `Soporte · Signos vitales` with `Vasopresor`, `Ventilación / soporte resp.`, `Modalidad`, `FiO₂ / flujo`, `Parámetros` (`:216-256`), infusion fields `Agente`, `Infusión`.
- Vitals plan (`entrega-modal-vitals-render.mjs`): `Atajos`, `Cada` N h, `Veces` per shift, `Parámetros`, `Frecuencia`; modes `Intervalo`, `Por turno`, `Sin signos` (`:34-103`). Note: `No aparece en internos para signos vitales…` (`:63`).
- `Procedimientos y estudios` with `+ Procedimiento` (`index.html:2068-2073`); sub-form `Nuevo procedimiento`: `Tipo` (`Imagen`, `Otro`), `Descripción`, `Hora`, `Estado` (`Comentado`, `Autorizado`, `Agendado`), `Requiere` (`Familiar`, `Consentimiento`, `Anestesia`), buttons `Cancelar`, `Añadir` (`entrega-modal-procedures.mjs:166-207`). List empty: `Sin procedimientos. Usa + Agregar.` (`:58`). Delete confirm `Eliminar` (`:127-134`).
- Footer: `Cancelar`, `Guardar paciente` (`index.html:2084-2085`). Success toast `Paciente guardado.` (`clinical-entrega-modal.mjs:103`).

**Live check, Entrega modal (2026-10-05).**
- ✔ live: row click opens `#entrega-modal`: prev/next arrows, title `Rosa Delgado · Cama —` with badge `SALA`, close `×`; hidden heading `Nueva entrega`. Footer `Cancelar`, `Guardar paciente`.
- ✘ fixed: `R1 de guardia`, `Equipo del paciente` and `Estado general` labels are in the DOM but NOT visible (hidden) for a Sala-profile user in this state. Visible fields are the chips `Crítico`, `Negativas firmadas`, `Show`; `Esfuerzo terapéutico` with emoji buttons `Reanimar`, `Show`, `No reanimar`; `Pronóstico` `Bueno` / `Malo`; `Notas breves de entrega` (placeholder `Antecedentes relevantes para la guardia...`). Marker chip `Show` was missing in doc.
- ✘ fixed: `Soporte · Signos vitales` and `Procedimientos y estudios` are collapsed sections (chevron). Opened: `Vasopresor` (+ `Agente`, `Infusión` when on), `Ventilación / soporte resp.` (`Modalidad`, `FiO₂ / flujo`), `Parámetros` chips `TA FC FR Temp Sat O₂ Glucometría`, `Frecuencia` segmented `Intervalo` / `Por turno` / `Sin signos` (default `Sin signos`, note `No aparece en internos para signos vitales. Si agregas un estudio pendiente, sí se listará ahí.`), `Detener a las` fields.
- ✔ live: `+ Procedimiento` opens `Nuevo procedimiento` with `Tipo` (`Imagen`, `Otro`), `Descripción`, `HORA` as H/M selects (H 00-23, M step 5), `Estado` (`Comentado`, `Autorizado`, `Agendado`), `Requiere` (`Familiar`, `Consentimiento`, `Anestesia`), `Cancelar`, `Añadir`. Empty list `Sin procedimientos. Usa + Agregar.` ✔.
- ✘ fixed: save toast live is `Entrega registrada.` (`clinical-entrega-submit.mjs:96`), not `Paciente guardado.` (that text is another path, `clinical-entrega-modal.mjs:103`). Modal closes after save; census stays on screen with same rows.
- Handoff flow: ✔ the Guardia → row → modal → save → census path works live. The "Interno app sees it" and "R1 filter" legs are not checkable here (no interno peer); the phase bar / `Finalizar turno` legs are ✔ absent.

**States.** Switching patient with unsaved form is guarded (`:346`). Loading/error: modal loads context async (`:382-452`); specific error text not found.

**Covering R1.** `resolveR1GuardiaCovering` picks the on-call R1 for the sala (`clinical-entrega-phase.mjs:13-30`).

**Flow — shift handoff (Modo Entrega as built)**

```
Day team            Guardia tab (census)                Entrega modal               Night side
-----------         ------------------------            ----------------            -----------------------
open Guardia  --->  pick sala (Activar guardia)         
                    census table: Censo · N paciente(s)
                    click patient row ----------------> R1 de guardia + Equipo
                                                        Estado general, marcas,
                                                        Notas breves, Soporte
                                                        Vitals plan (Cada/Veces)
                                                        Procedimientos y estudios
                                                        [Guardar paciente] ------> toast "Paciente guardado."
                    census reloads (refreshGuardiaCensusFromDb)
                                                                                   R1 sees patient in census
                                                                                   (filter: solo entregados)
                                                                                   Interno app lists the patient
                                                                                   (SV chip, Estudios) -> section 9
Not found: "turno activo", "Finalizar turno", phase bar (removed 2026-09-24)
```

Cites: row click `guardia-board-render.mjs:149-165`; save and reload `:160-162`; interno sees only patients with entrega to the on-call R1 (`interno/interno-app.mjs:256-257`).

---

## 5. Eventualidades

**Purpose.** Manual chronological log of events during the stay, grouped by day. Labs are not auto-written; one-shot cleanup removes old auto-dumped lab text (`js/features/eventualidades-strip-auto-labs.mjs:1-4`, `eventualidades-panel-html.mjs:1-4`).

**Entry.** Paciente area → segment `Eventualidades` (`index.html:1128`, mount `#exp-pane-eventualidades` `:1137`).

**Controls (`eventualidades-panel-html.mjs`).**
- Intro: `Bitácora cronológica de la hospitalización, agrupada por día.` (`:153`).
- Per-entry buttons `Editar` / `Eliminar` (`:46-49`).
- Compose: title `Nueva eventualidad` or `Editar eventualidad`, date field `Fecha de la eventualidad`, text placeholder `Describe lo ocurrido…`, hint `Puedes cambiar la fecha y el texto` / `Elige una fecha anterior si aplica`, buttons `Cancelar`, `Agregar` or `Guardar` (`:105-124`).
- Keys: `Ctrl/Cmd+Enter` saves, `Esc` cancels an edit (`eventualidades-render.mjs:533-538`). Text is forced to upper case (`:~wireEventualidadesUppercase`, used `:565`).

**States.** Empty: `Aún no hay eventualidades. Agrégalas abajo.` (`panel-html:142`, `:188`). No patient: `Selecciona un paciente.` (`render:549`). Validation: `Escribe la eventualidad antes de agregar.` (`:475`, `:493`). Toasts: `Eventualidad guardada.` / `Eventualidad actualizada.` (`:470`), `Eventualidad eliminada.` (`:423`), `No se pudo eliminar la eventualidad.` (`:425`).

**Live check, Eventualidades (2026-10-05).** ✔ live: needs an open patient (card home shows nothing for this tab); intro text; empty `Aún no hay eventualidades. Agrégalas abajo.`; compose `Nueva eventualidad` + date button `05/10/2026` (calendar) + textarea `Describe lo ocurrido…` + hint `Elige una fecha anterior si aplica` + `Agregar`; empty add → red toast `Escribe la eventualidad antes de agregar.` (this error toast stayed on screen over later dialogs); text upper-cased on input (`prueba sintetica` → `PRUEBA SINTETICA`); add → toast `Eventualidad guardada.`, entry grouped under `Hoy` / `lunes 5 de oct` / `1 registro` with `Editar` / `Eliminar`; `Editar` → `Editar eventualidad`, hint `Puedes cambiar la fecha y el texto`, `Cancelar` / `Guardar`; `Eliminar` deletes at once, NO confirm, toast `Eventualidad eliminada.` (test entry removed). Tab is also reachable from the sub-tab row `Eventualidades`, not a `segment` in `Paciente area` only. Not checked: Ctrl+Enter key, Drive import.

**Imports.** Drive import mode `Solo eventualidades` (`index.html:275`); merge skips duplicates and returns added/skipped counts (`eventualidades-drive.mjs:9-22`).

**Links.** Guardia action sheet has a second entry (`Registrar eventualidad`, `Nota breve visible para equipo mañana`, `guardia-patient-action-sheet.mjs:264-266`) but that sheet has no caller (section 2). Saves persist and push to Nube when sync is active (`eventualidades-drive.mjs:18-20`).

---

## 6. VPO (valoración preoperatoria)

**Purpose.** Templates for EKG and Rx, manually documented risk scales, perioperative drugs, diagnoses, and copy buttons (`js/features/vpo-panel.mjs:1-3`). ✔ live.

**Entry.** ✘ fixed: `VPO` is a sub-tab of area `Paciente`, in both modes (Sala row: `... Listado`, `VPO`, `Pendientes`; IC row: `Estado`, `Nota`, `Indic.`, `VPO`, `Pendientes`). There are no "segment buttons". Mount `#vpo-container`.

**Sections (`vpo-panel-helpers.mjs:45-115`), live order.** ✔ live: `RIESGO PREOPERATORIO`, `DIAGNÓSTICOS`, `EKG Y RX TÓRAX`, `FÁRMACOS PERIOPERATORIOS`.
| Section | Controls (live) |
|---|---|
| `Riesgo preoperatorio` | `Copiar riesgos`; disclaimer `R+ no calcula puntajes ni porcentajes de riesgo preoperatorio. Usa calculadoras médicas oficiales validadas (institucional o publicadas) para RCRI (Lee), Gupta MICA, ARISCAT, Caprini y clasificación ASA antes de documentar riesgo en la nota.` (+ live); text `Introducción (texto previo a escalas)` prefilled `SE REALIZA VALORACIÓN PREOPERATORIA. SE…`; `Resultado por escala (calculadora externa)` with 5 inputs `Resultado…` for `ASA`, `RCRI (índice de Lee)`, `Gupta MICA`, `ARISCAT`, `Caprini` (+ live names) |
| `Diagnósticos` | `Tomar de la nota`, `Enviar a Datos`, list input `Diagnóstico 1` + `+ Agregar diagnóstico` (+ live), paste box `Pegar lista con «+» entre diagnósticos` (placeholder `DX1 + DX2 + DX3…`), button `Separar por +` |
| `EKG y Rx tórax` | `Copiar EKG`, `Copiar Rx` (+ live: placed in the section header), `FC (lpm)`, `Tomar de Estado actual`, `EKG` and `Rx tórax` text boxes prefilled (`ELECTROCARDIOGRAMA DE 12 DERIVACIONES, R…`, `RADIOGRAFÍA DE TÓRAX AP, SIN ROTACIÓN, A…`); one icon-only button without label or title (+ live, purpose not found) |
| `Fármacos perioperatorios` | `Tomar de SOME`, `Ir a Medicamentos`, `Copiar` |
| footer | `Copiar valoración completa` |

**Messages (live results).**
- ✔ `Nada que copiar en Fármacos` (red; here with no drugs). Format `Nada que copiar en <sección>`.
- ✘ fixed: copy success toast is `<Sección> copiado`: `EKG copiado`, `Rx tórax copiado`, `Riesgos copiado`, `Valoración completa copiado` (grammar as in the app).
- ✔ `Diagnósticos importados` (`Tomar de la nota` with a diagnosis in the nota).
- + `Sin diagnósticos en VPO para enviar` (`Enviar a Datos` with an empty list).
- + `Sin FC o SpO₂ en Estado actual` (`Tomar de Estado actual` with no vitals).
- + `Procesa la receta en Medicamentos primero` (`Tomar de SOME` with no processed receta). `Ir a Medicamentos` in IC switches area to `Manejo` (page `Medicamentos del turno`, empty text `Aún no hay medicamentos. Pulsa Importar SOME, pega el bloque del hospital y procesa la receta.`).
- ✔ `Sin fármacos en VPO. Usa «Tomar de SOME».` shown in the section when empty.
- `Separar por +` with an empty box: no toast seen (the code string `Pega diagnósticos separados por +` not shown). Not confirmed. `Sin diagnósticos en la nota`, `Diagnósticos ya editados — no se sobrescriben`, `No se pudo copiar`, `Selecciona un paciente para valoración preoperatoria.`: not reached.

**Data links.** Pulls vitals from monitoring, drugs from med receta, diagnoses from the nota (`:4-9`). Scales are not computed in R+: results are typed by hand (✔ live; disclaimer shown). Nota -> VPO diagnoses link works (`Tomar de la nota`).

**States.** Loading, offline: not found.

---

## 7. Censo export (PDF)

**Purpose.** Print the ward census as PDF, with a preview where columns can be hidden and cells edited (`js/censo-export.mjs`, `js/censo-preview-html.mjs:120-128`).

**Who / visibility.** Sala mode only and never on mobile web (`censo-export.mjs:51-53`).

**Entry points.** Header button `btn-export-censo-header` (title `PDF de guardia con todos los pacientes activos`, `index.html:566`); Help button `Exportar censo (PDF)` (`:655`); Settings row `Exportar censo` with button `Exportar PDF…` (hint `Todos los pacientes activos. Incluye pancenso.`, `:2509-2515`).

**Dialog `Censo` (`censo-export.mjs:101-121`).** Date and month labels; switches `Incluir archivados`, `Pancenso` (hint `Todos los equipos de la rotación.`), `Labs como diagramas`; note `En la vista previa eliges columnas, editas celdas y generas el PDF.`; buttons `Cancelar`, `Vista previa`.

**Preview modal (`censo-preview-html.mjs:120-151`).** Title `Vista previa del censo`; text `Así se verá el PDF. Haz clic en una celda para editarla.`; `Columnas visibles`; buttons `Cerrar`, `Imprimir`, `Generar PDF`; `Esc` closes. Hidden columns are remembered (`loadCensoHiddenCols`, `:27`).

**Columns/sections** (`censo-build.mjs:54-63`, `censo-preview-html-render.mjs:98-164`): `Diagnósticos`, `Antibióticos`, `Medicamentos`, `Laboratorios`, `Accesos`, `Cultivos`, `Pendientes`. Header title for pancenso is `Pancenso de Sala` (`censo-export.mjs:~276`). Default file names `Censo.pdf` / `Pancenso.pdf` (`:283`).

**Live check, Censo export (2026-10-05).** ✔ live: header button `Censo` (visible in Sala and Guardia, hidden in IC per `censo-export.mjs:51`); dialog `Censo` with date `05/10/2026 · Octubre 2026`, switches `Incluir archivados`, `Pancenso` (`Todos los equipos de la rotación.`), `Labs como diagramas`, note and `Cancelar` / `Vista previa`. Preview `Vista previa del censo` + `Así se verá el PDF. Haz clic en una celda para editarla.` + `COLUMNAS` chips; footer `Cerrar`, `Imprimir`, `Generar PDF`; `Cerrar` goes back to the `Censo` dialog. ✘ fixed: column names live are `Cama`, `Paciente`, `Dx`, `ATB`, `Meds`, `Labs`, `Signos / I-E-B`, `Accesos`, `Cultivos`, `Pend.` (not `Diagnósticos` / `Antibióticos` / `Medicamentos` / `Laboratorios`). Sheet title `Censo de Sala`; with Pancenso on it is `Pancenso de Sala` and each patient gets a line `Equipo: Equipo Sala 1`. Rows show name, `UITEST-000N`, age. Settings row `Exportar censo` exists (`btn-export-censo-settings-row`) but is `display:none` unless `censo-export.mjs:63` shows it; not seen in Ajustes → Documentos / Respaldos live. PDF generate / folder pick not run (writes a file).

**PDF.** Posted to `/generate-censo` (`censo-export.mjs:~182`); user must pick a folder: `Selecciona una carpeta para guardar el PDF.` / `No se guardó el PDF: no se eligió carpeta.` (`:~200-203`).

**States.** Empty: toast `Sin pacientes para el pancenso` / `Sin pacientes para el censo` (`:272`). Errors: `Error: …`, `Error de conexión al generar el …` (`:206-210`). Loading: not found.

**Census data edits.** Per-patient census lines are edited in the `Datos` tab (`js/patient-data-censo-ui.mjs`): placeholder `Diagnóstico · pegar DX1 + DX2` (`:39`), `Sin antibióticos · clic para agregar`, `Sin medicamentos · clic para agregar` (`:57-58`), buttons to strike (`Tachar …`), restore, edit.

---

## 8. R+ Móvil (mobile) and join

**Purpose.** Phone/iPad web view of the same app, limited to the `lab` and `nota` areas, no Word export (`js/mobile-web.mjs:1`, `:31-39`).

**Entry.** URL `/mobile/` (`mobile/index.html`). The Worker serves `/mobile` and `/mobile/join` from `mobile/index.html` (`cloud/sync-worker/src/worker-app.mjs:45-51`; `/?auth=` redirects to `/mobile/`, `:66`). Desktop creates the link in the Conexión panel: row `iPad / R+ Móvil` with `QR y enlace permanente` (`js/features/cloud-sync/panel-conexion-views.mjs:~246`), body text "Enlace permanente ligado a tu @usuario… Ábrelo en Safari → Añadir a pantalla de inicio", buttons `Copiar enlace móvil (Nube)`, `Copiar QR` (`panel-mobile-invite.mjs:88-110`).

**Boot (`mobile/index.html:8-51`).** Sets `rpc-mobile-mode`, reads `token`/`code`, `room`, `sala`, `user`, `name`, `rank`, saves `rpc-lan-config`, then redirects to `/?rpc-mobile=1&…`. Placeholder text `Abriendo R+ Móvil…` (`:49`). Real logic: `initCloudMobileBoot` (`js/features/cloud-mobile/boot.mjs:144`, called from `js/app-shell-mobile-boot.mjs:13-15`). Cloud mobile only; ward LAN mobile was retired in 8.0.5 (`app-shell-mobile-boot.mjs:2`).
✔ live: `/mobile/index.html` has title `R+ Móvil` and redirects at once to `/?rpc-mobile=1`; the page sets `rpc-mobile-mode` in localStorage (and body class `rpc-mobile-web`).

**Join page.** `mobile/join.html` shows `Conectando a R+…` and loads `/js/lan-join-boot.mjs` (`:6-9`). That script does **not exist** in `js/` (searched). ✘ fixed (live 2026-10-05): opening `/mobile/join.html` on a static server shows only `Conectando a R+…` forever; `GET /js/lan-join-boot.mjs` returns 404 and the console logs the failed load. `join.html` is a dead page: no redirect, no controls. The Worker serves `/mobile/join` from `mobile/index.html` (`worker-app.mjs:45-51`), so users never see `join.html` through that route.

**Login shell (`login-ui.mjs`).** not reachable: on a static server (no Nube worker, no token) the login shell did not appear after 5 s; the app shell showed instead (see `+ live` below). Strings below are code-only.
- Gate text `R+ Móvil` / `Conectando al turno…` (`:96-97`).
- Tabs (`Cuenta Nube`): `Entrar` | `Crear cuenta` (`:114-116`). Fields: `Usuario (@usuario)` (placeholder `ej. drmendoza`), `Contraseña`, `Nombre en guardia` (placeholder `ej. Dr. Mendoza`) (`:120-142`). Title `R+ Móvil · Nube`, sub `Inicia sesión para sincronizar el censo.`
- Join step: title `Unirse al turno`, sub `Sesión iniciada — une tu iPad al turno.`; text `Ingresa el código que compartió el equipo en escritorio.`; field `Código de sala` (placeholder `ABC123`); button `Unirse al turno` (`:151-174`).
- Toasts: `Sesión nube iniciada.` / `No se pudo iniciar sesión.` (`:265-271`); `Unido a la sala <código>.` / `No se pudo unir a la sala.` (`:227-231`); `Inicia sesión primero.` (`:297`).

**Mobile chrome.** Hidden: export censo, profile, settings, Salida tab, `Manejo` and `Agenda` areas, labs input, tour and learn hub (`js/mobile-web.mjs:90-117`). Labs show as read-only reference (`:160-190`).
+ live (`/?rpc-mobile=1`, no backend, empty list): top bar `R+`, tabs `Sala` | `Interconsulta` | `Guardia`, buttons `Cambiar tema claro u oscuro` and `Filtros de pacientes`, search `Buscar paciente`, area tabs `Paciente` | `Laboratorio` only (no `Salida`, `Manejo`, `Agenda`: ✔ hidden). Empty state: `Elige un paciente para ver el expediente`, text `Selecciona uno en la lista de la izquierda o pulsa + Agregar. También puedes crear un paciente al procesar un reporte de laboratorio.`, buttons `Buscar en la lista`, `Agregar paciente`. No toast and no cloud banner appeared. Word export is blocked with toast `En R+ Móvil no se generan documentos (.docx). Usa la app de escritorio para Word y salida rápida.` (`:31-33`).

**States.**
- All states in this list: not reachable (need a Nube worker, token and room). Texts are code-only.
- Loading: gate `Conectando al turno…`.
- Offline/timeout: toast `No se pudo contactar la nube. Revisa la red e intenta de nuevo.` then login shell (`boot.mjs:186-195`; timeout label `room_resolve_timeout` `:191`).
- Boot error: `No se pudo iniciar R+ Móvil. Recarga la página.` (`:207`).
- Sync error: `No se pudo sincronizar con la nube. Revisa la red e intenta de nuevo.` (`:110`).
- Empty census: toast `Censo vacío en la nube. En Mac abre ⇄ → Conexión y confirma que la sala tenga pacientes sincronizados.` (`resolve-active-room.mjs:93-99`) and banner `Sin pacientes en la nube. En el Mac del turno deja R+ abierto unos 20 s (misma cuenta ⇄) y recarga aquí.` (`:117-119`).
- Privacy: session clinical storage is wiped on boot and exit (`boot.mjs:~153-156`).

**Flow — mobile join**

```
Desktop (Mac)                                 iPad / phone
---------------------------                   ----------------------------------------
⇄ Conexión -> "iPad / R+ Móvil"
 Copiar enlace móvil (Nube) / Copiar QR  ---> open /mobile/?auth=<token>&user=<@usuario>
 (permanent link, tied to @usuario)            mobile/index.html: store config, redirect /?rpc-mobile=1
                                               initCloudMobileBoot
                                                 |-- has token? --yes--> resolveCloudMobileActiveRoom
                                                 |      room found --> post-connect: pull census, labs
                                                 |      timeout/none --> login shell
                                                 '-- no token --> login shell
                                               login shell: Entrar / Crear cuenta
                                                 -> if no room: "Unirse al turno" + Código de sala
                                                 -> toast "Unido a la sala <código>."
                                               post-connect: sync cycle, clinical ops for sala,
                                                 patient list + labs; event rpc-cloud-mobile-ready
                                               empty census -> toast + banner (see States)
```

Cites: `panel-mobile-invite.mjs:50-110`; `invite-url.mjs:29-56`; `mobile/index.html:8-46`; `boot.mjs:63-114`, `:144-210`; `login-ui.mjs:114-231`.

---

## 9. Interno app (MIP / pregrado vitals)

**Purpose.** Phone page where interns see patients handed to the on-call R1, record vitals and mark studies done. Nube only (`interno/host-discovery.mjs:1-3`).

**Who / entry.** Interns scan a QR from the desktop: Conexión → `QR Internos` (`Vitales desde el celular por sala`, `js/features/cloud-sync/panel-conexion-views.mjs:249`, `:277`). URL `/interno/<slug>` with `?t=<token>` and the key in the `#k=` fragment (`interno-app.mjs:69-87`). Worker serves `interno/index.html` for valid slugs (`worker-app.mjs:53-60`). Slugs: `sala-1`, `sala-2`, `sala-e`, `torre-hu`, `area-a-pensionistas`, `interconsultas`, `ux`, `eme` (`host-discovery.mjs:8-19`). Page title `R+ Interno — Guardia` (`index.html:8`); skip link `Saltar al contenido principal` (`:14`).

+ live: raw `interno/interno-app.mjs` does not load from a plain static server because `interno-crypto-board.mjs` imports `../../lib/interno/*`, `lib/entrega/*` and `cloud-sync/crypto.mjs`; the page stays blank (only the skip link). The shipped page is an esbuild bundle (`scripts/build-cloud-interno.mjs`). Checked with a local esbuild bundle of the same entry. ✔ live: page title `R+ Interno — Guardia`, skip link `Saltar al contenido principal`.

**Board.** not reachable (needs board API + valid key). Header `<sala> · Internos`, summary `N pac · N SV · N vencidos`, refresh button `↻` (`aria-label` `Actualizar`) (`interno-app.mjs:248-251`). Each row: bed, short name, vitals chip, markers (`Consent`, `Anest`, `Familiar`, `Crítico`, `Negativas`, `Show`, `:21-28`), pending tags `SV` and studies (`:324-343`). Row click expands the detail (`:262-290`).

**Detail (`renderDetail`, `:382-410`).** `Signos vitales` with button banner `Registrar signos vitales` (`Registrar`); `Estudios y procedimientos` rows with `Hecho` button (`:418`). Study sheet: `Hora`, `Tipo`, `Estado` (`Realizado`/`Pendiente`), `Requisitos`, field `Tu nombre (opcional)`, buttons `Marcar realizado`, `Cerrar` (`:459-475`).

**Vitals modal (`:570-660`).** Fields by plan: `TAS`, `TAD`, `FC`, `FR`, `TEMP`, `SAT %` (`:544-553`); `Glucometrías` rows (`mg/dL`, `HH:MM`, remove `×`); `Tu nombre (opcional)`; `Cancelar`, `Guardar`. Toasts: `Ingresa al menos un dato` (`:696`), `Registrado ✓` or `Registrado · signos alterados` (`:717`), `No se pudo guardar` (`:711`), `Error de conexión` (`:719`). Data is encrypted on the device before sending (`interno-crypto-board.mjs:1-25`).

**Refresh.** Poll every 30 s (`POLL_MS`, `:15`), WebSocket `/api/interno/v1/ws` reconnects after 5 s and refreshes on `board-changed` (`:213-234`).

**States.**
- Link problems ✔ live (red text, centered, no buttons): `Enlace inválido. Escanea el QR de tu sala.` (path without slug), `Falta el código de acceso. Escanea el QR completo de la sala.` (slug, no `?t=`/`#k=`), `El código de acceso no es válido. Escanea el QR de nuevo.` (bad `#k=`) (`:97`, `:102`, `:109`).
- Loading ✔ live: `Conectando…` (`:113`) shows briefly with a valid-format key.
- + live: server error with no backend: `No se pudo cargar el tablero.`, text `Nube respondió con un error. Revisa Conexión en la Mac.`, `Código: fetch_failed`, button `Reintentar` (fetch to the static server failed). `fetch_failed` is the fallback code and is not in the hint list below.
- Inactive: not reachable. `Acceso de internos desactivado o guardia no iniciada.` (`:240`).
- Empty: not reachable. `Sin pacientes entregados al R1 de guardia.` plus tip to use `Entrega` on the Mac (`:256-257`).
- Detail, vitals modal, study sheet, WebSocket, 30 s poll: not reachable (need decrypted board).
- Server error: `No se pudo cargar el tablero.` with hint by code and `Código: …`, button `Reintentar` (`:176-198`; hints: `db_unavailable`, `invalid_token`, `interno_inactive`, `auth_required`).
- Offline on first load: `No se pudo conectar a Nube.` `Revisa el enlace del QR y la red…` (`:200-210`). After a first load, fetch errors keep the old board silently (`:166-172`).

**Links.** Desktop Entrega (provides patients, vitals plan, studies); Guardia census reloads on `rpc-interno-vitals-synced` (`guardia-board.mjs:21-26`).

---

## 10. Equipos app (`R+ Lista de espera`)

**Purpose.** Queue to borrow shared devices: `Lumify`, `EKG`, `Ultrasonido` (`equipos/equipos-rotaciones.mjs:13-17`; `equipos/index.html:27`, `:44-47`). Installable web app (manifest `index.html:10`, iOS tip banner `equipos-ios-install.mjs`, push `equipos-push.mjs`).

**Who / entry.** Residents on any rotation. Link or QR with `?t=<token>`; token saved in storage and cookie (`index.html:11-24`, `equipos-token.mjs`). In Nube mode the token is fetched from the invite endpoint (`equipos-app.mjs:121-135`). Desktop side: card `R+ Lista de espera` in the ⇄ dropdown with `Abrir móvil`, `Historial de uso`, `Purgar cola`, `Purgar todo` (`js/features/equipos-board.mjs:19-131`).

**Top bar.** `R+ Lista de espera` / `Lumify · EKG · Ultrasonido`; buttons `Admin` (hidden until allowed, `index.html:50`), `Ayuda`, `Inicio` (`:51-52`). ✔ live (no token): header `R+ Lista de espera` / `Lumify · EKG · Ultrasonido`, buttons `Ayuda`, `Inicio`; `Admin` stays hidden. ✘ fixed: `Ayuda` opens `equipos/ayuda.html` (title `Cómo usar la cola — R+ Lista de espera`, link `Volver a la cola`), a 7-step guide (the old text said 6 but listed 7), with static demo cards (Lumify, EKG, Ultrasonido, no live data) and a closing `Consejo`: `Identifícate`, `Agrega R+ Cola a Inicio`, `Entra en cola`, `Revisa tu posición y avisos`, `Toma el equipo`, `Entrega al terminar`, `Reporta un problema` (`ayuda.html:46-233`).

**Identity (`renderIdentityForm`, `equipos-app.mjs:248-262`).** Live form not reachable (board fetch fails first). The same fields (`Tu nombre`, `Rotación`, default `Sala 1`, hint `Completa esto antes de cualquier acción en la cola.`) ✔ appear in the static demo in `ayuda.html`. `Identificación`: `Tu nombre` and `Rotación` (select of 8 values: `Sala 1`, `Sala 2`, `Sala E`, `Torre HU`, `Área A/Pensionistas`, `Interconsultas`, `UX`, `Eme`, `equipos-rotaciones.mjs:2-11`). Any action first checks: name at least 2 letters (`Escribe tu nombre.`) and a rotation (`Elige tu rotación.`) (`:264-276`); saved in storage (`NAME_KEY`, `ROT_KEY`, `:35-36`).

**Device card (`deviceCard`, `:428`).** Shows `En uso: <name> (<rotación>)` or `Nadie lo tiene` (`:434-435`), chip `Cola estancada` after 4 h (`:432`). Buttons: `Entrar en cola`, `Tomar`, `Entregar`, `Reportar problema`, badge `En cola · #N`. Queue panel (details): list with position, name, rotation; `Nadie en cola todavía.` (`:396`); `Tu posición: N`; `Ceder turno`, `Salir de cola`, `Activar avisos` / `Agregar a Inicio` (`:370-420`). Alerts list shows `Falla` or `Material faltante` with `Entendido` (`:484-500`).

**Modals.**
- `Tomar dispositivo`: photo `Foto al recoger` (Lumify and EKG), optional `Carga de tablet % (opcional)` for Lumify (`:649-690`).
- `Fuera de turno`: warns when taking a device without being next; `Se notificará a quienes esperan. ¿Tomarlo de todos modos?` (`:357-370`, `:697`).
- `Entregar dispositivo`: `Carga de tablet % (obligatoria)`, `Foto al entregar` (`:712-748`).
- `Reportar problema`: `Tipo` (`Material faltante` / `Falla del dispositivo`), `Detalle (opcional)`, `Foto del problema`; toast `Reporte enviado al equipo.` (`:757-786`).
- Common buttons `Cancelar`, `Confirmar` (`:186-187`). Photo missing: `Se requiere foto.`

**Admin (`equipos-admin.mjs`).** Gate `Acceso admin` with field `Clave` and `Entrar`; wrong key `Clave incorrecta.` (`:373-397`). Panel `Panel admin` with `Salir` and tabs `Historial`, `Reportes`, `Personas` (`:326-332`); buttons `Exportar CSV`, `Borrar todo el historial y fotos` (`:163-164`, `:194`). Empty: `Sin sesiones en los últimos 14 días.`, `Sin reportes en los últimos 14 días.`, `Sin actividad en los últimos 14 días.` (`:159`, `:190`, `:218`).

**Refresh.** Poll `/board/stamp` and board every 30 s (`POLL_MS`, `:37`; `pollBoardStamp` `:812`), WebSocket `connectWs` (`:793`).

**States.**
- Loading: `Cargando cola de equipos…` (`:902`); not seen live (replaced too fast).
- No token ✔ live: `La lista de espera no está disponible. Pide al R4 que active el enlace.` (`:155-168`; in PWA adds a Safari hint).
- + live: token `?t=…` but no backend: `Error de red.` (plain text under the header; no retry button).
- Device cards, queue, modals, Admin gate and panel: not reachable (need a board API and token).
- Cloud error (not reachable): `Acceso inválido` (link expired) or `Servicio no disponible` (`:229-241`).
- LAN-style error: `Sin anfitrión de equipos` (`:243-245`).
- Load error: message or `Error al cargar.` (`:930`, `:969`).

**Flow — equipos rotation (queue and device cycle)**

```
Resident opens link (?t=token)
  |
  v
Identificación: Tu nombre + Rotación  (required before any action)
  |
  v
Board: Lumify | EKG | Ultrasonido        <-- poll 30 s + stamp + WebSocket
  |
  |-- device free -----> "Tomar" -----> modal (photo; Lumify charge optional)
  |                                      if not next in queue: "Fuera de turno" warning
  |                                      -> "Dispositivo tomado."
  |
  |-- device busy -----> "Entrar en cola" -> position "Tu posición: N" + "Activar avisos"
  |                       "Ceder turno" (skip) | "Salir de cola"
  |                       when #1 and free -> "Tomar"
  |
  '-- holder done -----> "Entregar" -> modal (photo; charge % required for Lumify)
                          -> "Dispositivo entregado." -> next in queue is notified (push)
Any time: "Reportar problema" (photo required) -> alert on board -> "Entendido" -> "Reporte atendido."
Admin (R4 key): Historial / Reportes / Personas, CSV export, wipe
```

Cites: identity `:248-276`; join/skip/leave `:539-630`; take `:632-690`; return `:700-748`; alert `:757-790`; ack `:547-551`. "Rotación" here is the resident's service (the 8 sala names), not the monthly team rotation of Guardia (section 2).

### Live verification, companion apps (2026-10-05)

Method: static server (python, localhost) over `public/`; interno also through a local esbuild bundle; built-in browser; no backend, synthetic key/token only.
- ✔ live: 11 (join.html text, mobile redirect + title, mobile hidden tabs, interno 3 link-error texts + `Conectando…` + title/skip link, equipos no-token text, top bar, `Admin` hidden).
- ✘ fixed: 3 (join.html is dead/404; Ayuda has 7 steps not 6; interno raw source needs a bundle).
- + live added: 3 (mobile app-shell empty state, interno `fetch_failed` error, equipos `Error de red.`).
- not reachable: mobile login shell and all mobile states; interno board, detail, vitals modal, inactive, empty, WS; equipos identity form, cards, modals, admin, `Acceso inválido` / `Servicio no disponible`. Reason: need Nube worker, valid token/room, push.

---

## Live verification, Sala/Guardia (2026-10-05)

Method: CDP port 9224 only, synthetic data, light theme. About 60 claims checked in sections 1, 2, 4, 5, 7.
Counts (approx.): 31 ✔ live, 13 ✘ fixed in place, 4 not reachable or hidden (counters band, action sheet, rotation button, settings export row), 9 + live additions, about 6 not checkable (Interno leg, Drive import, PDF save, Ctrl+Enter, offline/loading states, filtered-empty texts).
Biggest corrections: (1) Guardia counters band has no host element, never shows; (2) Sala home header also has `Archivados N` and `+ Agregar`; (3) Entrega modal hides `R1 de guardia` / `Equipo` / `Estado general`, uses collapsible Soporte and Procedimientos, adds `Show` chip, and saves with `Entrega registrada.`; (4) Censo columns have short names (`Dx`, `ATB`, `Meds`, `Labs`...); (5) Help center still lists `Barra de fase`, `Roster`, `Finalizar turno`; (6) Eventualidades delete has no confirm and the empty-filter texts in Guardia do not show for `Con pendiente` / `Ingresos`.
Note: the test window started in IC mode, not Sala; switched to Sala via the mode pill. State left: Sala, patient 301 open on Eventualidades, cards view, no modal open.

## Gaps (not found or unclear)

- Phase bar, `Finalizar turno`, roster: removed in code, still in Help text (`help-content.mjs:26-35`; `guardia-v7-upgrade-card.mjs:70`).
- `guardia-patient-action-sheet.mjs` has no caller found.
- `mobile/join.html` loads `/js/lan-join-boot.mjs`, which does not exist in `js/` (✔ confirmed live 2026-10-05: 404, page stuck on `Conectando a R+…`).
- Mobile CSS (`styles/mobile.css`, `mobile-surfaces.css`) and Equipos push internals (`equipos-push*.mjs`, service workers) were not read in depth.
- No offline queue/banner text was found for Guardia, Eventualidades, VPO, Sala cards.
- Some cites for strings inside long lines are approximate (marked with `~`).
