# UI Map 01 — Shell and Navigation

Scope: top bar, patient sidebar, tabs, command palette, shortcuts, overlays, empty/loading states.
UI labels are in Spanish, exactly as in code. Text is in simple English.
All paths are under `packages/core/public/` (root symlink `public/`). Format: `path:line`.
"not found" = not seen in the files read for this map.
Live marks (checked 2026-10-05 on the running app, light theme, Sala): `✔ live` = matches; `✘ fixed` = was wrong, text corrected; `not reachable` = cannot show in the test app; `+ live` = new row from the live app.
**Big change since the first draft:** the app now uses ONE top bar (area pill + sub-tab row in the header, `js/features/top-bar.mjs`) and a Sala card view (`js/features/sala-view-variants.mjs`). Sections 0, 1, 2 and 3 are corrected for this.

## 0. Full navigation tree

```
R+ window                                                  ✘ fixed (live layout)
├─ Top bar = body > header (top-bar.mjs; html.rpc-topbar)
│  ├─ "R+" brand -> Mi Perfil
│  ├─ Area pill (shows current area) -> menu: Paciente 1 | Laboratorio 2 | Manejo 3 | Agenda 4
│  ├─ Sub-tab row of the current area (moved into the header)
│  │    Paciente (Sala): Resumen | Estado actual | Eventualidades | Medicamentos | Listado | VPO | Pendientes
│  │    Paciente (IC):   Resumen | Estado | Nota | Indic. | VPO | Pendientes  (+ Datos del paciente icon)
│  │    Laboratorio: Labs | Tendencias | Cultivos      Manejo: Manejo actual | Perfil histórico
│  │    Agenda: no row
│  ├─ (icons) Importar desde Drive (Estado actual only) | Datos del paciente | Ir a… search (⌘K)
│  ├─ Censo (Sala only)
│  ├─ Mode switch: shows only the current mode + 3 dots; click -> Sala | IC | Guardia
│  ├─ Conexión (wifi icon) | Mi Perfil (person icon) | Ayuda (?) | Ajustes (gear) | Tema (sun)
│  └─ Hidden in this layout: date chip, context text, Estado meta, Atajos button, Aprender button, Tareas pill
├─ Sala view (Sala mode, default "cards"; localStorage rplus-sala-view)
│  ├─ Home: card grid "Pacientes · 9 en sala" + buttons "Archivados (n)", "Barra lateral", "Actualizar labs"
│  └─ Patient open: bed rail "Camas" (IC: "Tablero") on the left; "‹ Camas" back button; Esc returns to home
├─ Patient sidebar (only if view = "barra lateral", or IC/other modes)
│  ├─ Header: auto-hide, "+ Agregar"
│  ├─ Search "Buscar" + filters + cards-view button + multi-select
│  ├─ List: Fijados / Pacientes / Archivados
│  └─ Bulk bar: Eliminar | Cancelar
└─ Main area
   ├─ Banners (hidden by default)
   ├─ Area panels: Paciente, Laboratorio, Manejo, Agenda
   ├─ IC home: "Interconsultas" board (Guardia / Equipo Interconsultas / Activo / Post-guardia / Por asignar)
   └─ Guardia board "CENSO · n PACIENTES" (replaces area panels; no area pill, no sub-tabs, no sidebar)
```

Old tree (first draft) had: separate main tab row, Clínico/Salida pill groups, header date/context. Those are not what the live app shows.

Sources: tabs `partials/layout/app-body.html:61-76`; lab inner `:96-99`; med inner `:217-226`;
nota pills `:348-396,410-419`; Sala/IC lists `js/expediente-tabs.mjs:7-8,61-64,133-144`;
labels `js/expediente-group-row.mjs:24-47`.

## 1. Top bar

Live result per row (the code table below keeps the source refs):

| Row | Live | Note |
|---|---|---|
| Brand "R+" | ✔ live | Title "Abrir Mi Perfil", aria "R+, abrir Mi Perfil". Click opens "Mi Perfil" modal; Esc closes |
| Date chip `#today-date` | not reachable | Present in DOM ("lunes, 5 de octubre de 2026") but width 0 in the top-bar layout |
| `#estado-actual-meta` | not reachable | display none, empty |
| Header context | not reachable | Present in DOM, width 0. Gap closed: it is not shown in the top-bar layout |
| `#btn-header-cmdk` | ✔ live | Search icon, title "Ir a… o acción (⌘K)". Opens palette |
| `#btn-header-shortcuts` | ✘ fixed | display none. Replaced by the "Ayuda" (?) icon menu: "Atajos de teclado", "Aprender R+" (`top-bar.mjs` help menu) |
| `#btn-open-learn` | ✘ fixed | display none; reached via Ayuda menu |
| `#btn-export-censo-header` | ✔ live | Text "Censo", title as in table. Visible in Sala and in Paciente/Laboratorio/Manejo/Agenda; hidden in IC and Guardia. Click not run (starts a PDF export) |
| Mode switch | ✘ fixed | Collapsed: only current mode and 3 dots. Click on it expands to "Sala", "IC", "Guardia". Visible text of Interconsulta is "IC" (aria "Interconsulta") |
| `#pending-jobs-pill` | not reachable | display none, empty (no jobs) |
| `#btn-header-team-sync` | ✘ fixed | Wifi icon. Title is a long LiveSync text; aria "Abrir conexión LAN y LiveSync (salas)". Opens dropdown "Conexión · R+ Cloud" (status Sala 1, Nube al día, user, "Cerrar sesión", join/create room, Equipo/Cuenta/Administración/Sistema rows) |
| `#profile-toggle-btn` | ✔ live | Person icon; label "Mi Perfil" is hidden text |
| `#btn-open-settings` | ✔ live | Gear. Opens Ajustes dropdown (sections TÚ: Apariencia; DATOS: Respaldos, Laboratorio, Documentos, Plantillas; EQUIPO Y APP: Seguridad, Aplicación, Nube y equipo ↗; Zona de peligro; update channel Estable/Pre-releases; "R+ 8.4.8") |
| `#theme-toggle` | ✔ live | Sun icon, title "Cambiar tema" (not clicked) |
| Area pill | + live | Button with area name, aria "Área: Paciente". Menu rows: Paciente 1, Laboratorio 2, Manejo 3, Agenda 4 (digit hints). Menu stayed open after Esc when focus was not inside it |
| "Ayuda" icon | + live | Title "Ayuda", aria-haspopup menu: "Atajos de teclado", "Aprender R+" |
| Drive import icon | + live | Cloud-download icon appears in header on Paciente > Estado actual (title "Importar desde Drive") |
| Datos icon `#btn-exp-datos-open` | + live | Id-card icon in header, title "Datos del paciente" (visible on every Paciente section in Sala and IC) |
| Short labels | + live | Below 1440 px: IC tabs read "Estado", "Nota", "Indic."; full name in title/aria. When mode switch is expanded the last tab ("Pendientes") is clipped |
| Mode switch in Guardia | + live | Header shows only search icon, "Guardia", and right cluster. No area pill |


| Control | Label / title (Spanish) | Icon | Action | Source |
|---|---|---|---|---|
| Brand `#app-brand` | "R+", title "Abrir Mi Perfil" | text | Opens Mi Perfil (`openProfileFromHeader`) | header.html:2 |
| Date `#today-date` | aria "Abrir calendario", title "Calendario" | none (date text) | Opens date popover (`openHeaderDatePopoverFromChrome`) | header.html:4 |
| Estado meta `#estado-actual-meta` | no label | none | Text slot. Content: not found in files read | header.html:5 |
| Header context | patient line + path | none | Patient line shows only when sidebar is auto-hidden; path = tab name (e.g. "Laboratorio", "Clínico › Estado actual"). Patient line: name · cuarto · dx (max 48 chars) | header.html:6-9; js/features/header-context.mjs:20-45,60-79 |
| `#btn-header-cmdk` | title "Ir a… o acción (⌘K)", aria "Ir a sección, paciente o acción" | search glyph | `openCommandPalette` | header.html:13 |
| `#btn-header-shortcuts` | title "Atajos de teclado (⌘/)" | keyboard | `openShortcutsModal` | header.html:16 |
| `#btn-export-censo-header` | "Censo", title "PDF de guardia con todos los pacientes activos" | file | `exportCensoPdfFromHelp`. Visible only in Sala and not mobile web | header.html:20; js/censo-export.mjs:51-56 |
| Mode switch `#header-mode-seg` | aria "Modo de trabajo" | 3 buttons + dots | `setWorkModeFromHeader(mode)` | header.html:24-33 |
| ... "Sala" | title "Modo Sala — Estado actual, Historia, Listado de problemas" | | Sets appMode sala | header.html:25 |
| ... "Interconsulta" | title "Modo Interconsulta — Nota de evolución, Indicaciones" | | Sets appMode interconsulta | header.html:26 |
| ... "Guardia" | title "Guardia — censo, entrega y turno activo" | | Toggles Guardia mode | header.html:27; js/features/profile-app-mode.mjs:109-137 |
| `#pending-jobs-pill` | title "Tareas en curso" | none | Status pill, filled by code. Content: not found | header.html:35 |
| `#btn-header-team-sync` | title "Conexión · Nube" (set from i18n, hidden by default) | sync | `toggleConnectionDropdown`. Hidden on mobile web | header.html:37; js/mobile-web.mjs:95 |
| `#profile-toggle-btn` | "Mi Perfil" | person | `openProfileModal` | header.html:40 |
| `#btn-open-learn` | "Aprender R+" (hidden by default) | | `openLearnHub` | header.html:42 |
| `#btn-open-settings` | title "Ajustes", aria "Abrir ajustes" | gear | `toggleSettingsDropdown` | header.html:43 |
| `#theme-toggle` | title "Cambiar tema" | | `toggleTheme` (light/dark) | header.html:44 |

Mode switch behavior: pressing the active mode toggles expand/collapse of the switch; pressing another mode switches and collapses (`profile-app-mode.mjs:111-137`). Guardia is a toggle, not a stored appMode.

## 2. Patient sidebar

**Live: in Sala the default view is the card view, not the sidebar** (`sala-view-variants.mjs`, localStorage `rplus-sala-view` = `cards` | `bar`, default cards). The sidebar width is 0 in card view. Use "Barra lateral" (home button) to get the sidebar; the grid button `#btn-sala-view-cards` (title "Ver pacientes como tarjetas") in the sidebar returns to cards. Switching view shows one-time hints ("Nuevo: vuelve a la barra lateral cuando quieras", "Vuelve a las tarjetas aquí"; keys `rplus-sala-hint-bar/cards`).

### 2.0 Sala card view (+ live)

| Part | Live text | Note |
|---|---|---|
| Home title | "Pacientes" + "9 en sala" | + live |
| Buttons | "Archivados (n)", "Barra lateral", "Actualizar labs" | + live. "Actualizar labs" opens the lab update modal |
| Card `.sv-card` | "Cto. 300 · Cama 01", name, "DIAGNÓSTICOS" (or "Sin diagnóstico"), "INTERCONSULTAS" (or "Ninguna"), archive icon (title "Archivar paciente") | + live. Tags: red "Lab crítico", "Ingreso incompleto" (warn). Click opens patient on the last section |
| Bed rail `#sala-view-rail` | aria "Camas"; top button "Camas" (title "Ver todas las camas (Esc)"); one button per bed "300-1" (title = patient name) | + live. In IC the rail label is "Tablero" |
| Back from patient | "‹ Camas" button; Esc also returns to home | + live |
| Empty | "Sin pacientes aún." | not reachable (9 patients) |
| Archived view | "‹ Sala" + "Archivados" + count; restore icon title "Restaurar a sala" | not reachable (opened only code path) |

### 2.0b Live check of the sidebar (view = Barra lateral)

| Row | Live | Note |
|---|---|---|
| Auto-hide button | ✔ live | Title as in table (not clicked: it hides the sidebar) |
| Title "Pacientes" | ✘ fixed | Not visible; the visible list header is the group label "PACIENTES" + count |
| Add button | ✘ fixed | Text "+ Agregar", title "Agregar paciente". Opens modal "Agregar por registro" (also ⌘N). In IC with an incomplete patient the modal title is "Completar ingreso" |
| Search | ✘ fixed | Placeholder is only "Buscar" (aria "Buscar paciente" label not visible). "300" and "rosa" give 1 card; no match gives "Ningún paciente coincide con la búsqueda" (✔) |
| Filters button | ✘ fixed | Visible, with a dot when a filter is active (live: Sala 1 + Equipo Sala 1 active, so 9 of 17 patients show). Popover: "Sala" select (Todas, Sala 1, Sala 2, Sala E, Torre HU, Área A/Pensionistas, Interconsultas, UX, Eme), "Equipo" select (Todos los equipos, Sin equipo asignado, Equipo Sala 1), "Servicio" text "Filtrar…" |
| Multi-select | ✔ live | aria-pressed true; bar "0 seleccionados" + "Eliminar" + "Cancelar"; click on a card selects ("1 seleccionado"); Cancelar hides the bar. Eliminar not clicked |
| Ronda hint | ✔ live | In DOM; not visible in the screenshot (hidden) |
| Groups | ✔ live | "FIJADOS 1" appears after pin; "PACIENTES 8"; "ARCHIVADOS (1)" with a dot icon. Archived section is expanded by default (toggle collapses it; key `rpc-archived-section-collapsed`) |
| Pin chip | ✔ live | Title "Fijar paciente" -> "Quitar de fijados" (aria-pressed). Card gets `.patient-card--pinned` and moves to Fijados |
| Archive chip | ✔ live | Title "Archivar paciente"; card moves to Archivados, no toast. Archived card shows "↩" (title "Restaurar del archivo"); restored OK. Archived card has no special style (same bg, opacity 1) |
| Delete "×" | ✔ live | aria "Eliminar". Not clicked |
| Card text | ✔ live | Name, "Cto. 300", "Cama 01"; no servicio in Sala; IC shows servicio ("Torre HU") and "Sin servicio" |
| Active card | ✔ live | `.patient-card.active` = "Rosa Delgado" (also `rpc-last-patient-id=ui-test-1`) |
| `.patient-card--incomplete` | not reachable | No incomplete patient shown in the Sala 1 list (incomplete ones are in IC board with "Ingreso incompleto") |
| ↓ / ↑ | ✔ live | Rosa -> Ignacio -> Marta -> Ignacio |
| Empty / loading texts | not reachable | "Sin pacientes aún", "Descargando pacientes…", "Sincronizando equipo…" need other data states |


### 2.1 Controls

| Control | Label / title | Action | Source |
|---|---|---|---|
| `#btn-sidebar-auto-hide` | title "Ocultar barra de pacientes (reaparece al acercar el mouse)" | `toggleSidebarAutoHide`. Adds `html.sidebar-auto-hide`; sidebar width 0 until mouse enters a 36px left strip (`.sidebar-reveal`) | app-body.html:4-8; styles/sidebar.css:18-31,48-57 |
| Title | "Pacientes" | static | app-body.html:9 |
| `#btn-patient-filters` | title "Filtros de pacientes"; badge `#btn-patient-filters-badge` | `togglePatientCensusFilters`. Hidden by default; popover mount `#clinical-census-filters-sidebar-mount` | app-body.html:11-22 |
| `#btn-patient-bulk-select` | title "Seleccionar varios pacientes" | `togglePatientBulkSelect`; aria-pressed | app-body.html:17 |
| Add button | "+ Agregar", title "Agregar paciente" | `openAddModal` (also ⌘N) | app-body.html:19-21; js/features/patients-modal.mjs:328 |
| Search `#patient-search` | label "Buscar paciente", placeholder "Buscar por nombre, registro, cuarto…" | `onPatientSearchInput`. Matches nombre, registro, cuarto, cama, servicio, area (accent-folded) | app-body.html:26; js/features/patients-scope.mjs:46-52 |
| Ronda hint `#sidebar-ronda-hint` | "↑ / ↓ · paciente siguiente / anterior" | hint only (aria-hidden) | app-body.html:28 |
| Bulk bar `#patient-bulk-bar` | "0 seleccionados", "Eliminar", "Cancelar" | `confirmBulkDeletePatients` / `cancelPatientBulkSelect`. Hidden until bulk mode | app-body.html:33-39 |

### 2.2 List groups (top to bottom)

| Group | Label | Notes | Source |
|---|---|---|---|
| Pinned | "Fijados" + count (aria "Pacientes fijados") | Shown only if any pinned | js/features/patients-card-html.mjs:156-163; patients-list.mjs:348-356 |
| Active | "Pacientes" + count (aria "Lista de pacientes") | Shown only if any active. Virtualized when long | patients-card-html.mjs:169-171; patients-list.mjs:357-371 |
| Archived | Toggle button "Archivados (n)" | Collapsed state kept in localStorage key `rpc-archived-section-collapsed` | patients-card-html.mjs:176-183; patients-list.mjs:48,381-393 |

### 2.3 Card

Card = toolbar + body. Body: name (or "Sin nombre · registro" if empty), meta line "Cto. x", "Cama y", and servicio (servicio shown only outside Sala). On mobile web the "Cto."/"Cama" prefixes are removed. (`js/patient-sidebar-card.mjs:36-48,72,83-100`)

| Card part | Label / title | Condition | Source |
|---|---|---|---|
| Pin chip | "Fijar paciente" / "Quitar de fijados" | Hidden in Interconsulta mode | patients-card-html.mjs:66,85-99 |
| Archive chip | "Archivar paciente" / "Restaurar del archivo" (icon ↩ when archived) | not in bulk mode | patients-card-html.mjs:67-112 |
| Delete "×" | aria "Eliminar" | Only if `canDeletePatientChart` allows | patients-card-html.mjs:71-80 |
| Bulk check | ✓ box | Bulk mode only | patients-card-html.mjs:31-41,58-65 |

| Card state (CSS class) | Look | Source |
|---|---|---|
| `.active` | tinted bg, 2.5px left border | styles/sidebar.css:438-443; patients-card-html.mjs:139 |
| `.patient-card--pinned` | accent border | sidebar.css:432; card-html:140 |
| `.patient-card--archived` | class set; style: not found in skimmed lines | card-html:141 |
| `.patient-card--bulk-selected` | class set (style at sidebar.css:325) | card-html:142 |
| `.patient-card--incomplete` | warn border + text " · incompleto" after name. Set when `isPatientAdmissionIncomplete` | sidebar.css:444-453; card-html:135,143 |
| `.patient-card--svc-tint` | hue by requesting service | card-html:136,144-148 |

Which patient is selected at start: active id, else last id in localStorage `rpc-last-patient-id`, else first pinned non-archived, else first non-archived, else first (`js/features/patients-default-id.mjs:3,33-45`).

## 3. Tab hierarchy

**Live: the main "tab row" is now the area pill menu in the top bar.** Rows below marked per live check.

| Live row | Result |
|---|---|
| Area order, ids, default | ✔ live: Paciente (`apptab-nota`), Laboratorio, Manejo, Agenda. Default on start = Paciente |
| ⌘1..⌘4 | ✔ live (see section 5) |
| Sala Paciente sub-tabs | ✘ fixed: flat row Resumen, Estado actual, Eventualidades, Medicamentos, Listado, VPO, Pendientes (no separate "Clínico"/"Salida" pills visible; those names live only as ⌘1 cycle steps and `itab-*` hidden buttons) |
| IC Paciente sub-tabs | ✘ fixed: Resumen, Estado, Nota, Indic., VPO, Pendientes (short labels; full: Estado actual, Nota de evolución, Indicaciones) |
| "Resultados" pill | not reachable (hidden `itab-resultados`) |
| Lab sub-tabs | ✔ live: Labs, Tendencias, Cultivos (ids as in 3.3) |
| Manejo sub-tabs | ✔ live: "Manejo actual", "Perfil histórico" |
| Agenda | ✔ live: no sub-tabs. Header "Agenda de procedimientos", "Lun 5 oct — dom 11 oct 2026", "← Semana ant.", "Semana sig. →", "+ Nuevo procedimiento"; grid Lun..Dom, hours 06:00 to 21:00; no empty-state text |
| Pendientes view | + live: "Volver al resumen", chips "Todos 0" / "Entrega 0", "+ Pendiente"; empty: "Sin pendientes" / "Los pendientes que agregues aparecen aquí." |
| Resumen view (Sala) | + live: patient name, "+ Agregar" chip, "Actualizar labs", "SIGNOS VITALES" (T/A, FC, FR, Temp, SatO₂ %, I/O) with "Registro completo", "LABS" ("Sin labs de hoy · últimos: 03/10/2026") |
| Estado actual view | + live: "ESTADO ACTUAL", "Ver gráficas", "Registro manual", "SIGNOS VITALES", "GLUCOMETRÍAS", "BALANCE HÍDRICO", "ESTADO CLÍNICO GENERAL", "+ Categoría", "HISTORIAL RECIENTE"; floating copy button bottom right |
| Laboratorio view | + live: patient header, "Aún no hay labs de hoy · último 03/10 · 09:42", "Actualizar labs", "RESULTADOS · 5 ALTERADOS DE 60" |
| Manejo view | + live: "Medicamentos del turno", "Egreso", "Importar SOME"; empty: "Aún no hay medicamentos. Pulsa Importar SOME, pega el bloque del hospital y procesa la receta." |
| Tab memory | ✔ live: after ⌘↩ and switching area, returning to Paciente restores the last section; last patient key `rpc-last-patient-id` ✔ |
| IC home board | + live: "Interconsultas" with chips "Asignar" / "Mi equipo", rows "Guardia", "Equipo Interconsultas", "Activo 2", "Post-guardia" ("No presencial hoy — pacientes repartidos al resto del equipo."), drop text "Suelta un paciente aquí", "Sin equipo asignado.", "Sin equipo.", "Por asignar 17" ("Arrastra cada tarjeta a un equipo"), "ARCHIVADOS (1)" |
| Guardia board | + live: "CENSO · 9 PACIENTES", buttons "Cambiar", "Con pendiente · 0", "Todos", "Ingresos"; group "▾EQUIPO SALA 1 · 9"; patient tiles "300 · 01 Rosa Delgado" (hourglass icon on some); footer "9 pacientes sin alterados ni pendientes". This closes the Guardia empty-state gap |


### 3.1 Main tabs

| Order | Label | id | Shortcut | Panel | Source |
|---|---|---|---|---|---|
| 1 | Paciente | `apptab-nota` | ⌘1 | `appcontent-nota` | app-body.html:62-65; app-tabs.mjs:35-40 |
| 2 | Laboratorio | `apptab-lab` | ⌘2 | `appcontent-lab` | app-body.html:66-69 |
| 3 | Manejo | `apptab-med` | ⌘3 / ⌘M | `appcontent-med` | app-body.html:70-73 |
| 4 | Agenda | `apptab-agenda` | ⌘4 | `appcontent-agenda` | app-body.html:74-77 |

- Choosing: click (`switchAppTab`), arrow keys on the tablist (Left/Right/Up/Down wrap, Home, End), shortcuts, command palette. (`js/features/app-tabs.mjs:256-273,310-328`)
- Mobile web: order is only Paciente, Laboratorio (`app-tabs.mjs:314`).
- Alias: tab `'lan'` is mapped to `'lab'` (`app-tabs.mjs:276`).
- Default: `activeAppTab = 'nota'` (Paciente), `activeInner = 'resumen'` (`js/app.js:288-289`).
- Guardia mode: the 4 panels are hidden, `#appcontent-guardia` (region "Modo Guardia — censo de pacientes") is shown, tablist is aria-hidden (`app-tabs.mjs:79-95,224-233`).
- Leaving Medicamentos tab closes the med paste modal (`app-tabs.mjs:278`). Entering Manejo clears its attention dot (`:294`).
- Entering Laboratorio loads the lab chunk lazily; on failure a toast "No se pudo cargar Laboratorio. Reintenta o reinicia la app." (error) (`app-tabs.mjs:112-129`).
- Gliding pill under the active tab: `js/features/nav-glide.mjs:1-41` (follows `.active` class changes).

### 3.2 Paciente sub-tabs (expediente)

| Mode | Visible top pills | Source |
|---|---|---|
| Sala | `paciente`, `clinico`, `salida` (+ Pendientes button) | expediente-tabs.mjs:7 |
| Interconsulta | `paciente`, `clinico` (+ Pendientes) | expediente-tabs.mjs:8 |
| Mobile web | `salida` removed | expediente-tabs.mjs:46-50 |

Pill labels: paciente = "Resumen", clinico = "Clínico", resultados = "Resultados", salida = "Salida" (`expediente-group-row.mjs:24-29`); Pendientes = "Pendientes" (`:36,82-89`).

| Group | Sections (label) | Source |
|---|---|---|
| Clínico, Sala | Estado actual, Eventualidades, Medicamentos | expediente-tabs.mjs:62,133-136; app-body.html:391-393 |
| Clínico, Interconsulta | Estado actual, Nota de evolución, Indicaciones, VPO | expediente-tabs.mjs:138; labels group-row:37-43 |
| Salida (Sala) | Listado, VPO | expediente-tabs.mjs:64; app-body.html:418-419 |
| Resultados (bar exists in HTML, not in Sala/IC top list) | Tendencias, Cultivos | app-body.html:410-412; expediente-tabs.mjs:63. Reached from Laboratorio instead |
| Datos | Opens a modal (`openPatientDatosModal`), not a pane. Button title "Datos del paciente" | expediente-navigation.mjs:203-205; app-body.html:376 |

Defaults when a pill is clicked (`defaultGranularForConsolidatedTab`): Resumen -> resumen; Clínico -> estadoActual in Sala, notas in Interconsulta; Resultados -> tend; Salida -> listado (mobile: estadoActual in Sala, todo otherwise) (`expediente-tabs.mjs:178-193`).

Clicking a pill that is already active but showing a different section returns to its default section (`expediente-navigation.mjs:94-99`).
Opening `tend`/`cult` forces the Laboratorio main tab; other expediente sections force Paciente (`expediente-navigation.mjs:131-139`).

### 3.3 Laboratorio sub-tabs
`Labs` (`lab-inner-labs-btn`), `Tendencias` (`lab-inner-tend-btn`), `Cultivos` (`lab-inner-cult-btn`), aria "Secciones de laboratorio" (`app-body.html:96-99`). Order: `js/expediente-group-row.mjs:31`. Inside Tendencias study view: "Gráficas" / "Tabla" tabs, and a pivot view "Tabla" / "Gráficas" (`app-body.html:486-489,512-515`).

### 3.4 Manejo sub-tabs
"Manejo actual" (`med-itab-receta`) and "Perfil histórico" (`med-itab-perfil`), aria "Vista de manejo" (`app-body.html:217-226`).

### 3.5 Tab memory
- Active main tab and inner tab: kept in memory only (`js/app.js:288-289`). No localStorage key for them: not found.
- Last selected patient: persisted, `rpc-last-patient-id`; demo ids ("demo-") are not saved (`patients-default-id.mjs:3-25`).
- On same-patient re-select in Sala, inner `notas`/`indica`/empty goes back to Resumen; in Interconsulta, `listado` goes to Resumen (`js/features/patients-select.mjs:128-136`).
- Entering Paciente from another main tab re-renders the remembered inner section if its mount is empty or stale (`app-tabs.mjs:42-55`).
- Mode change re-maps the inner tab via `migrateGranularInner` (`expediente-tabs.mjs:174-176`; details in `expediente-tabs-migrate.mjs`: not read).

## 4. Command palette

Live: ✔ opens from the header search icon `#btn-header-cmdk` and with ⌘K; Esc closes. Panel `.cmdk` in `#cmdk-backdrop`, aria "Ir a sección, paciente o acción". ✔ placeholder text. ✔ Empty query lists 11 actions in this order, each hint "Acción": Procesar SOME, Actualizar labs, Labs externos, Abrir laboratorio, Abrir eventualidades, Abrir estado actual, Exportar nota, Nuevo pendiente, Copiar labs SOAP, Inicio de turno, Ajustes. ✔ No match: "Sin coincidencias" / "Prueba con una acción (exportar, labs), el nombre del paciente o una sección." Query "estado": "Estado actual" (hint "Clínico") then one row "Estado actual — <paciente> · <cuarto>" per patient.
✘ fixed: patient rows show cuarto number only ("Rosa Delgado · 300"); section rows read "VPO — Rosa Delgado · 300". ✘ fixed: palette searches ALL patients (also Diana Rios 306, Carlos Peña 305, who are not in the Sala 1 sidebar filter). The "empty input" text ("Atajos del workbench") did not show: not reachable (empty query shows the action list). "Unified search" modal exists (title "Búsqueda unificada", placeholder as below); trigger still not found.

| Item | Detail | Source |
|---|---|---|
| Open | ⌘K / Ctrl+K, or header button "Ir a…". No-op on mobile web | js/app-shell-keyboard.mjs:143-148; js/features/command-palette.mjs:254-256 |
| Close | Esc, click on backdrop, or choosing an item | command-palette.mjs:113,145-148,230-231 |
| Input | placeholder "Ir a… o acción (ej. “exportar”, “labs”)"; panel aria "Ir a sección, paciente o acción" | command-palette.mjs:120-125 |
| Keys inside | ArrowDown / ArrowUp (wrap), Enter run, Esc close; mouse hover selects | command-palette.mjs:135-149,159-163,201-205 |
| Max results | 12 | command-palette.mjs:178 |
| Result types | action, section, app-tab, patient, patient-section | js/command-palette-model.mjs:126-165 |

Actions (hint "Acción"): Procesar SOME, Actualizar labs, Labs externos, Abrir laboratorio, Abrir eventualidades, Abrir estado actual, Exportar nota, Nuevo pendiente, Copiar labs SOAP, Inicio de turno, Ajustes (`command-palette-model.mjs:20-93`; handlers `command-palette.mjs:61-100`).
Main tabs: Paciente, Laboratorio, Manejo, Agenda (`command-palette-model.mjs:11-14`).
Sections: one per expediente section of the current mode, hint = group label (`:97-117,139`).
Patients: one row per named patient, hint = cuarto, or "cuarto · fijado" / "Fijado"; plus one row "section — patient name" per section (`:144-163`).
Empty query: ranking by `emptyPaletteRanking` (details not read). No results text: "Sin coincidencias" / "Prueba con una acción (exportar, labs), el nombre del paciente o una sección." Empty input state: "Atajos del workbench" / "Escribe para buscar acciones, pacientes o secciones del expediente." (`command-palette.mjs:211-226`)

Separate "unified search" modal exists: placeholder "Buscar por nombre, registro, nota o indicación…" (`partials/modals/root.html:521-529`). Its trigger: not found (only the window handler `openUnifiedSearch`, `js/features/productivity.mjs:230`).

## 5. Keyboard shortcuts

Live result per key (keys sent over CDP as Cmd+key; app took them in the page):

| Keys | Live | Result seen |
|---|---|---|
| ⌘1 | ✔ live | Sala: Resumen -> Estado actual -> Listado -> Resumen (Clínico and Salida steps land on their default section). IC: Resumen -> Estado -> Nota -> Indic. -> VPO -> Pendientes -> Resumen. On IC home board (no patient) no effect |
| ⌘2 | ✔ live | Labs -> Tendencias -> Cultivos -> Labs |
| ⌘3 / ⌘M | ✔ live | ⌘3 Manejo actual; again Perfil histórico; ⌘M toggles back to Manejo actual |
| ⌘4 and ⌘5 | ✔ live | Both open Agenda. ⌘5 is not in the shortcuts sheet or the area menu |
| ⌘⇧3 | ✔ live | Goes to Manejo > Manejo actual. Format toggle not visible (no toast) |
| ⌘[ / ⌘] | ✔ live | ⌘] = next week (12 oct — 18 oct), ⌘[ = back to 5 oct — 11 oct |
| ⌘↩ | ✔ live | Back to Paciente > Resumen (from Pendientes, from Manejo) |
| ⌘E | ✔ live | Sala: Estado actual -> Eventualidades -> Medicamentos -> Estado actual. IC: Estado -> Nota -> Indic. -> VPO -> Estado |
| ⌘T | ✔ live | From Paciente: Tendencias -> Cultivos -> Labs -> Tendencias |
| ⌘D | ✔ live | Opens "Datos del paciente" modal (`exp-datos-modal-backdrop`); Esc closes |
| ⌘G / ⌘I / ⌘S | ✔ live | Guardia board / IC board / Sala. Toasts: "Modo cambiado a Interconsulta", "Modo cambiado a Sala"; ⌘G no toast |
| ⌘N | ✔ live | Opens modal "Agregar por registro". Esc closes |
| ⌘⇧S | ✔ live | Toast "Estado guardado ✓" (success). The "Selecciona un paciente primero" case: not reachable (patient always active) |
| ⌘C | not reachable | No visible toast or change; clipboard not readable by this test |
| ⌘⇧C | ✔ live | On Estado actual with no pinned patients: info toast "No hay estado actual en los pacientes fijados." (sheet says "Solo pacientes fijados") |
| ⌘/ | ✔ live | Opens "Atajos de teclado" (`shortcuts-backdrop`) |
| ⌘K | ✔ live | Opens palette |
| ⌘, | ✔ live | Opens Ajustes dropdown (`settings-dropdown-backdrop`); Esc closes |
| ⌘⇧, | ✘ fixed | Toast on: "Importación: conflictos → sobrescribir (⌘⇧, o Ctrl+Shift+, de nuevo para apagar)." (success). Toast off: "Importación: conflictos → se preguntará en cada conflicto." (info) |
| ⌘⇧P | ✔ live | Opens "Mi Perfil"; Esc closes |
| ↓ / ↑ | ✔ live | Next / previous patient (Rosa -> Ignacio -> Marta -> Ignacio) |
| F6 | ✘ fixed | Toggles focus mode. Toasts: "Modo enfoque activado · F6 para salir" and "Modo enfoque desactivado". F6 is not in the shortcuts sheet |
| Esc | ✔ live | Closes palette, modals, dropdowns. In Sala patient view with nothing open it returns to the card home ("Ver todas las camas (Esc)"). In "Completar ingreso" modal Esc does NOT close; the × asks "¿Cerrar sin guardar?" with "Seguir editando" / "Cerrar sin guardar" |
| ⌘T naming mismatch | ✔ live | Sheet row says "Tendencias / Cultivos". Behavior is Tendencias -> Cultivos -> Labs. The Electron menu name "Tratamiento" is a native menu: not reachable over CDP; code ref `im/main.js:1274` unchanged |
| Shortcuts sheet text | + live | Groups: PESTAÑAS PRINCIPALES, MODOS DE TRABAJO, PACIENTE Y ACCIONES, APLICACIÓN. Header line "⌘/ abre esta hoja · también el botón del encabezado". Subtexts: ⌘1 "Repite Resumen → Clínico → Salida"; ⌘↩ "Volver a Resumen — Desde cualquier sitio"; ⌘3 "Repite Manejo ↔ Perfil"; ⌘4 "Repite semana actual"; ⌘⇧3 "Manejo: Completa ↔ Nombre+Día"; ⌘C "Copiar página del paciente — Labs o Estado actual, sin texto seleccionado". Footer "Centro de ayuda completo" |


`⌘` = Cmd on Mac, Ctrl elsewhere. Keys use `e.code`, so they work on any layout (`app-shell-keyboard.mjs:34-69`). Shell shortcuts are ignored while any modal is open (`:252`), except ⌘↩ which closes some overlays first (`app-shell-tab-shortcuts.mjs:78-95`). Menu accelerators for ⌘1-5, ⌘E, ⌘T are forwarded by Electron main (`packages/im/main.js:1268-1274`).

| Keys | Action | Source |
|---|---|---|
| ⌘1 | Go to Paciente; if already there: cycle Resumen -> Clínico -> Salida (Sala) or cycle `resumen, estadoActual, notas, indica, vpo, todo` (Interconsulta) | app-shell-tab-shortcuts.mjs:25-31,102-121,146-171 |
| ⌘2 | Go to Laboratorio; if there: cycle Labs -> Tendencias -> Cultivos | tab-shortcuts:147-171 |
| ⌘3 / ⌘M | Go to Manejo; if there: toggle Manejo actual <-> Perfil histórico | tab-shortcuts:159-161,188-191; keyboard.mjs:169-178 |
| ⌘4 and ⌘5 | Go to Agenda; if there: reset to current week | tab-shortcuts:25-31,163-166 |
| ⌘⇧3 | Manejo: switch egreso text format "Completa" <-> "Nombre+Día" (goes to Manejo / Manejo actual first) | tab-shortcuts:173-186; shortcuts-data.mjs:23 |
| ⌘[ / ⌘] | Agenda previous / next week (goes to Agenda first) | tab-shortcuts:198-207; keyboard.mjs:220-227 |
| ⌘↩ | Back to Paciente > Resumen from anywhere | tab-shortcuts:88-95; keyboard.mjs:237-245 |
| ⌘E | Estado actual; repeat cycles Clínico pills of the mode | app-shell-expediente-shortcuts.mjs:31-43,64-90 |
| ⌘T | Tendencias; repeat: Cultivos -> Labs -> Tendencias | expediente-shortcuts:44-52 |
| ⌘D | Datos del paciente (modal) | expediente-shortcuts:53,69-72 |
| ⌘G / ⌘I / ⌘S | Work mode Guardia / Interconsulta / Sala | keyboard.mjs:71-75,136-141,193-197 |
| ⌘N | Nuevo paciente (`openAddModal`) | js/features/productivity.mjs:574-579 |
| ⌘⇧S | Guardar paciente activo. Toast "Selecciona un paciente primero" (error) if none, else "Estado guardado ✓" (success) | productivity.mjs:580-590 |
| ⌘C | With no selection and no field focus: copy page (Estado actual or Laboratorio) | keyboard.mjs:283-301 |
| ⌘⇧C | Copy team labs (or team Estado actual when on it) | keyboard.mjs:150-160 |
| ⌘/ (also ⌘? or NumpadDivide) | Open "Atajos de teclado" | keyboard.mjs:93-117 |
| ⌘K | Command palette | keyboard.mjs:143-148 |
| ⌘, | Toggle Ajustes (ignored while typing in a field) | keyboard.mjs:119-123,202-209 |
| ⌘⇧, | Toggle "import: overwrite conflicts". Toasts: "Importación: conflictos → sobrescribir (…)" (success) / "Importación: conflictos → se preguntará en cada conflicto." (info) | keyboard.mjs:126-134,206-207 |
| ⌘⇧P | Toggle Mi Perfil | keyboard.mjs:162-167 |
| ↓ / ↑ | Next / previous patient. Not while typing, in widgets, modals, focus mode, or with modifiers | js/features/patients-census-walk.mjs:27-31,69-81 |
| F6 | Toggle focus mode (`toggleFocusMode`) | productivity.mjs:598-603 |
| Esc | Close top modal/popover/dropdown | js/modal-dismiss.mjs:284; app-shell-modals.mjs:120-135 |

Other shortcuts keys shown in the sheet exactly: `shortcuts-data.mjs:14-62` (4 groups: "Pestañas principales", "Modos de trabajo", "Paciente y acciones", "Aplicación").
Mismatch to note: the Electron menu names ⌘T "Tratamiento" (`im/main.js:1274`), the sheet names it "Tendencias / Cultivos".

## 6. Overlays, toasts, pop-ups

Live: banners in 6.1 are in the DOM but `display:none` (none shown): not reachable. Modals opened live and confirmed: "Atajos de teclado", "Datos del paciente", "Mi Perfil", "Agregar por registro" (✘ fixed: old doc called it `.modal`; id `modal`), Ajustes dropdown, Conexión dropdown ("Conexión · R+ Cloud"). + live: "Completar ingreso" (same `#modal`, opens in IC when a patient has incomplete admission; fields Servicio solicitante (Traumatología, Cirugía general, Ginecología, Neurocirugía, Cirugía plástica), Motivo de consulta, FI, FIMI, Cuarto, Cama, Equipo, button "Agregar Paciente"). The close confirm "¿Cerrar sin guardar?" is + live. Other modals in 6.2: not reachable / not opened.
Toasts live: ✔ container, ✔ max 3 (oldest dropped), ✔ error toast with no auto-hide (red "Copia un reporte SOME al portapapeles primero" stayed until closed), ✔ success toasts hide after a few seconds. + live: toast marks: ✓ success, · info, ✕ error; each has "×". Seen texts: "Modo cambiado a Interconsulta", "Modo cambiado a Sala", "Estado guardado ✓", "Modo enfoque activado · F6 para salir", "Modo enfoque desactivado", "No hay estado actual en los pacientes fijados.".

### 6.1 Banners (not modal)

| Name | Text / label | Trigger | Source |
|---|---|---|---|
| `#rpc-offline-banner` (alert) | "Sin conexión con el servidor local. No podrás generar documentos hasta reiniciar R+ o recuperar el servicio en segundo plano." | Local RPC offline. Show logic: not found | header.html:50-52 |
| `#lan-connection-banner` | "Sin conexión a R+ Cloud. La sincronización de sala puede estar limitada hasta reconectar en ⇄." + "×" ("Ocultar aviso") | Cloud disconnect. Show logic: not found | app-body.html:49-52 (inside main column) |
| `#update-banner` | "Descargando actualización…", buttons "Instalar y reiniciar", "Más tarde" | App update | partials/chrome/overlays.html:5-14 |
| `#rpc-mobile-boot-banner` | empty live region | mobile boot | overlays.html:3 |
| Tour dock `#tour-dock` | "Anterior", "Pausar y salir", "Omitir tutorial", "Siguiente", collapse "–" | Guided tour | header.html:169-184 |

### 6.2 Modals (title, trigger)

| Title (`id`) | Trigger | Source |
|---|---|---|
| "Atajos de teclado" (`shortcuts-backdrop`); footer "Centro de ayuda completo" | ⌘/ or header button | header.html:54-71 |
| "Centro de ayuda" (`help-quick-backdrop`) with search "Buscar en la ayuda…" and learn hub | From shortcuts footer / help | header.html:73-117 |
| "Aprender R+" (`learn-hub-backdrop`) | Header book button | header.html:119-127 |
| "Novedades" (`release-notes-backdrop`), button "Entendido" | After install of new version; closes with Esc | header.html:129-143 |
| "Bienvenido a R+" (`onboarding-intro-backdrop`): "Omitir tutorial", "Empezar · Sala", "Empezar · Interconsulta" | First run / tutorial restart | header.html:145-167 |
| "Nueva versión" (`update-modal-backdrop`) | Update available | overlays.html:16-19 |
| "Actualización requerida" (`min-version-backdrop`, alertdialog, no close) | App below minimum version | overlays.html:38-41 |
| "Analitos ocultos" | Lab tendencias | overlays.html:54-57 |
| "Vista de laboratorio" | Lab | overlays.html:70-73 |
| "Pegar SOME / Procesar" | Lab paste | overlays.html:108-111 |
| "Diagramas", "Tablas del reporte" | Lab | overlays.html:132-147 |
| "Gráficas de monitoreo", "Historial", "Registro completo", "Pegar monitoreo" | Estado actual | overlays.html:157-188 |
| "Importar desde Drive" | Clínico drive button (title "Importar desde Drive") | overlays.html:205-208; app-body.html:373 |
| "Labs externos", "Actualizar labs", "Confirmar laboratorios", "Varios días y varios pacientes" | Lab flows | overlays.html:280-379 |
| "Importar desde SOME", "Pegar mes SOME" (+ `med-pharm-modal-one`, `-full`) | Manejo | overlays.html:394-453 |
| "Guía clínica de orientación" (`clinico-unlock-backdrop`) | Clínico unlock | overlays.html:471-474 |
| Buscar (unified search) | trigger not found | partials/modals/root.html:521 |
| Add patient modal (`.modal`), Profile modal, Templates, Extra templates, SOAP, Entrega, Wipe data, Procedure agenda modal | Registered for Esc/backdrop close; content not read | js/app-shell-modals.mjs:120-187 |
| Dynamic: `lab-dedupe`, `soap-confirm`, `dup-confirm`, `lab-conflict`, `exp-advice`, `tend-gaso-ext` backdrops | Created in code | app-shell-modals.mjs:41-48 |

Dropdown/popover layers: Conexión dropdown (`connection-dropdown-backdrop`), Ajustes dropdown (`settings-dropdown-backdrop`), header date popover (`isRpcDatePopoverOpen`). Content: not read (`app-shell-modals.mjs:210-279`).
While a `body > .modal-backdrop.open` exists (except a "peek" backdrop), the header and app are `inert` (`app-shell-modals.mjs:342-366`).
Dismiss: Esc and backdrop click through one registry; the "×" with `data-wb-close` clicks the dialog's `[data-wb-cancel]` first (`app-shell-modals.mjs:293-302`).

### 6.3 Toasts (`js/ui-toast.mjs`)

| Item | Detail | Source |
|---|---|---|
| Container | `#toast-stack`, role status, aria-live polite | ui-toast.mjs:27-35 |
| Types | success, error, warn, info, ok | ui-toast.mjs:265 |
| Auto-hide | 3500 ms; warn 5500 ms; error and toasts with an action never auto-hide | ui-toast.mjs:7-8,199-205 |
| Max visible | 3 (oldest removed) | ui-toast.mjs:6,183-186 |
| Dismiss | click, "×" (aria "Cerrar aviso"), swipe (if motion allowed). Hover/focus pauses timer; hidden window pauses | ui-toast.mjs:128-130,300-327 |
| Optional | action button, `onClick` | ui-toast.mjs:116-121,268-310 |

## 7. Empty / loading / error states

| Screen | State | Text / behavior | Source |
|---|---|---|---|
| Paciente (no patient) | Empty | "Elige un paciente para ver el expediente" / "Selecciona uno en la lista de la izquierda o pulsa + Agregar. También puedes crear un paciente al procesar un reporte de laboratorio." Buttons "Buscar en la lista", "Agregar paciente" | app-body.html:336-343 |
| Manejo (no patient) | Empty | "Selecciona un paciente para Manejo" / "Elige uno en la lista de la izquierda o agrega un paciente con + Agregar. Después podrás importar el listado SOME y procesar la receta." Same 2 buttons | app-body.html:207-213 |
| Laboratorio | Loading | Skeleton `#lab-panel-loading`, class `is-lab-chunk-loading`, aria-busy while the lab chunk loads | js/lazy-feature-routes.mjs:355-369; app-tabs.mjs:112-114 |
| Laboratorio | Error | Toast "No se pudo cargar Laboratorio. Reintenta o reinicia la app." | app-tabs.mjs:124-128 |
| Agenda | Header | "Agenda de procedimientos", range, "← Semana ant.", "Semana sig. →", "+ Nuevo procedimiento". Empty/loading text: not found | app-body.html:318-324 |
| Guardia | Board | Strips and census grid; empty text: not found | app-body.html:83-92 |
| Sidebar list | Empty | "Sin pacientes aún" | patients-list.mjs:451 |
| Sidebar list | Loading (first cloud pull) | "Descargando pacientes…" | patients-list.mjs:224-228,442-443 |
| Sidebar list | Syncing team (team mirror, scope not ready) | "Sincronizando equipo…" | patients-list.mjs:420-430 |
| Sidebar list | Mobile cloud, empty | "Censo vacío en la nube. Deja R+ abierto en el Mac del turno unos segundos y recarga." (boot) / "Sin pacientes en la nube. En el Mac del turno deja R+ abierto ~20 s y recarga esta página." | patients-list.mjs:423-425,445-449 |
| Sidebar list | No search match | "Ningún paciente coincide con la búsqueda" | patients-list.mjs:458-460 |
| Command palette | Empty / no match | see section 4 | command-palette.mjs:211-226 |
| Local server offline | Error banner | see 6.1 | header.html:50 |

## Live verification (2026-10-05)

Method: CDP on port 9223 (isolated test app, 9 synthetic patients in Sala 1, 17 in total). Keys sent with `Input.dispatchKeyEvent`, DOM read with `Runtime.evaluate`, screenshots checked.

Counts (rows marked in the live tables above): about 41 `✔ live`, 15 `✘ fixed`, 15 `not reachable`, 22 `+ live` (counted by row; marks in legends and this section excluded). Rows in the old source tables that carry no mark were not re-checked (6.1 banners, most 6.2 modals, mobile web, `.patient-card--svc-tint`).

Biggest corrections:
1. Navigation is now ONE top bar: area pill menu (1-4) plus a flat sub-tab row in the header. There is no separate main tab row, and no "Clínico"/"Salida" pills in Sala.
2. Sala mode opens a card view with a bed rail ("Camas" / IC: "Tablero"), not the sidebar. Sidebar needs "Barra lateral".
3. Header: date chip, context text, Atajos, Aprender and the Tareas pill are hidden; Ayuda (?) menu replaces Atajos/Aprender; mode switch is collapsed (shows current mode, "IC" label).
4. Sidebar: search placeholder is "Buscar"; filter popover = Sala + Equipo + Servicio; filter button is visible; Archivados is expanded by default.
5. Palette searches all patients (not only the sidebar filter). IC add modal becomes "Completar ingreso" and Esc does not close it.
6. Toast texts for ⌘⇧, and F6 differ from the draft; ⌘5 and F6 are not in the shortcuts sheet.

Left open (not reachable in the test app): date popover, native Electron menu names, update/offline/Cloud banners, Guardia "Cambiar" flow, empty sidebar and "Sin pacientes aún", Paciente/Manejo no-patient empty states, ⌘C copy result, Censo PDF, unified search trigger.

State left: Sala mode, light theme, Paciente > Resumen of Rosa Delgado, no modal open, Sala card view restored. All pin/archive tests were reverted.

## Gaps (not found in files read)
- Date popover, Mi Perfil modal body, add-patient modal body (Ajustes and Conexión dropdowns are now read live: see section 1).
- Show/hide logic for `#rpc-offline-banner`, `#lan-connection-banner`, `#pending-jobs-pill`, `#estado-actual-meta`.
- Agenda has no empty text (grid only, live). Guardia board texts are listed in section 3 (live). `.patient-card--archived` has no visible style (live: same bg, opacity 1).
- Trigger for the unified search modal; `expediente-tabs-migrate.mjs` rules; `emptyPaletteRanking` order.
