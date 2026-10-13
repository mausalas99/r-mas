# UI map 02 — Patient workspace

Scope: the main window after a patient exists. Spanish labels are kept exactly as in the code.
All paths are under `public/` (symlink to `packages/core/public`) unless stated. Format: `path:line`.
Source of truth for layout: `public/partials/layout/app-body.html` (cited as `app-body.html:N`).
Facts from code, then checked live on 2026-10-05 (isolated test app, CDP, synthetic patients, Sala mode, light theme).
Marks: `✔ live` = matches the live app. `✘ fixed` = was wrong, text corrected. `not reachable` = could not reach it in the live app. `+ live` = seen live, missing in the first draft.

## 0. Frame

### 0.1 Top bar: 4 app tabs
`app-body.html:60-79` (tablist `Secciones principales`).

| Tab label | id | Panel id | What it is |
|---|---|---|---|
| Paciente | `apptab-nota` | `appcontent-nota` | Patient file (expediente). Default tab (`aria-selected=true`, `app-body.html:62`). |
| Laboratorio | `apptab-lab` | `appcontent-lab` | Paste SOME, lab history, Tendencias, Cultivos. |
| Manejo | `apptab-med` | `appcontent-med` | Current meds (receta) and pharmacy profile. |
| Agenda | `apptab-agenda` | `appcontent-agenda` | Weekly procedure agenda. |

✘ fixed: the live top bar is one pill `Paciente` (area menu, digits 1-4) plus a flat sub-tab row. Tabs `Laboratorio`, `Manejo`, `Agenda` show as their own area pills; each area has its own sub-tab row. In Sala the row is `Resumen`, `Estado actual`, `Eventualidades`, `Medicamentos` | `Listado`, `VPO` | `Pendientes` (no `Clínico`/`Salida` labels). Clicking the `Paciente` pill returns to the `Camas` card view.
+ live: right side of the bar: `Ir a sección, paciente o acción` (search), `Censo`, mode switch `Sala` / `IC` / `Guardia`, LAN/cloud status, `Mi Perfil`, `Ayuda`, `Abrir ajustes`, `Cambiar tema claro u oscuro`. The `Camas` view shows `Pacientes · N en sala`, buttons `Barra lateral`, `Actualizar labs`, `+ Agregar`. Cards show `Cto. N · Cama N`, name, `DIAGNÓSTICOS`, `INTERCONSULTAS`, badges `Lab crítico`, `Sin cama`, `Ingreso incompleto`, and an archive icon (archives at once, no confirm).

A fifth panel `appcontent-guardia` (`Censo de pacientes`) exists but has no tab button here (`app-body.html:83`). Not covered.
Tab switch: `switchAppTab` (`js/features/app-tabs.mjs:276`). Leaving Manejo closes the receta paste modal (`app-tabs.mjs:278`).

### 0.2 Left sidebar (patient list)
✘ fixed: by default no mode shows the full list. In **Sala**, the home screen is a card view, and a narrow `Camas` rail (bed codes like `300-1`) appears once a patient is open. In **IC**, the left side is hidden on the `Interconsultas` board, and a narrow `Tablero` rail appears once a patient is open (see the IC live check at the end of this file; an earlier draft of this section said IC shows the full list, which that check contradicts). The full list sidebar (below) appears only when the view is set to «Barra lateral» (button on the Sala card view; saved in `localStorage` `rplus-sala-view`). Live labels: header `PACIENTES` with `+`, search placeholder `Buscar paciente` (not the text below), per-row `Archivar paciente` and `Eliminar`, `Ocultar barra de pacientes`, `Ver pacientes como tarjetas`, section `ARCHIVADOS (N)` with restore `↩`. `+ Agregar` in the `Camas` view opens `Agregar por registro`.
`app-body.html:1-46`.
- `+ Agregar` button: opens add-patient modal (`data-onclick="openAddModal"`, `app-body.html:20`).
- Search input `#patient-search`, placeholder `Buscar por nombre, registro, cuarto…` (`app-body.html:23` area).
- `Filtros de pacientes` button (hidden until census filters apply, `app-body.html:12`).
- `Seleccionar varios pacientes` toggle; then bar `N seleccionados` with `Eliminar` and `Cancelar` (`app-body.html:17, 36-37`).
- Empty state: `Sin pacientes aún` (`js/features/patients-list.mjs:451`); Nube first pull: `Sin pacientes en la nube. En el Mac del turno deja R+ abierto ~20 s y recarga esta página.` (`patients-list.mjs:447`).
- Banner `Sin conexión a R+ Cloud. La sincronización de sala puede estar limitada hasta reconectar en ⇄.` with dismiss `×` (`app-body.html:45`).
- Context bar: button `Mi rotación` (opens `openMiRotacion`) (`app-body.html:51-54`).

### 0.3 Two app modes change the Paciente tab
`isModeSala(settings)` (Sala vs Interconsulta) decides which sections exist (`public/js/expediente-tabs.mjs:7-8, 100-145`):
- Sala: groups `Resumen`, `Clínico`, `Salida`. Clínico = `Estado actual`, `Eventualidades`, `Medicamentos`. Salida = `Listado`, `VPO` (`expediente-tabs.mjs:64, 134-137`).
- Interconsulta: groups `Resumen`, `Clínico`. Clínico = `Estado actual`, `Nota de evolución`, `Indicaciones`, `VPO` (`expediente-tabs.mjs:139-140`).
- `Pendientes` is a separate always-visible pill in both modes (`public/js/expediente-group-row.mjs:83-84`).
- Mobile web hides `Salida` (`expediente-tabs.mjs:50-52`).

Important: in Sala the sections `Nota de evolución` and `Indicaciones` are not in the row. ✔ live. Answer to the old gap: they are NOT reachable in Sala. Only IC mode shows them. IC sub-tabs live (short labels): `Resumen`, `Estado`, `Nota`, `Indic.`, `VPO` | `Pendientes`, plus `← Tablero`. ✘ fixed: IC opens an `Interconsultas` board first (`Asignar` / `Mi equipo`, teams, `Por asignar`). A patient with `Ingreso incompleto` first opens modal `Completar ingreso` (see 5).

---

## 1. Paciente tab (`appcontent-nota`)

### 1.0 Shell and states
- No patient selected: `Elige un paciente para ver el expediente` + text `Selecciona uno en la lista de la izquierda o pulsa + Agregar. También puedes crear un paciente al procesar un reporte de laboratorio.` + buttons `Buscar en la lista` (focus search) and `Agregar paciente` (`app-body.html:337-342`).
- Section row `#exp-group-row` (`nav` `Secciones del expediente`) is built by `renderExpedienteGroupRow` (`js/features/expediente-group-row-ui.mjs:47-94`). Labels: `Resumen`, `Clínico`, `Resultados`, `Salida`, `Datos`, `Labs`, `Pendientes`, `Nota de evolución`, `Indicaciones`, `Historia Clínica`, `Estado actual`, `Eventualidades`, `Medicamentos`, `VPO`, `Tendencias`, `Cultivos`, `Listado` (`expediente-group-row.mjs:24-38`).
- `Resultados` (Tendencias / Cultivos) is not in the top row; it lives in Laboratorio (`expediente-group-row.mjs` comment line ~61).
- ✔ live: empty state not tested (patient always selected). Header `Datos del paciente` button exists (`#btn-exp-datos-open`) and patient name opens the same modal. `Importar desde Drive`: not reachable (not seen).
- Header buttons: `Importar desde Drive` (`btn-drive-import`, `app-body.html:~385`), `Datos del paciente` (`btn-exp-datos-open`, opens `openPatientDatosModal`).
- Inner nav is `switchConsolidatedTab` / `switchInnerTab` (`js/features/expediente-navigation.mjs:86, 198`).

### 1.1 Resumen (dashboard)
Purpose: one-screen glance of the patient. Mount `#patient-dashboard-mount` (`app-body.html:~361`). Built by `renderDashboardHtml` (`js/features/patient-dashboard/dashboard-html.mjs:667-680`).

Blocks, top to bottom:
| Block | Controls and labels | Does | Cite |
|---|---|---|---|
| Identity row | `‹ Camas` (back to all beds, Esc); patient name button; diagnosis chips; interconsulta chips; `+ Agregar` (service chip); `Actualizar labs` | Name opens Datos modal. `+ Agregar` opens interconsult-service picker. `Actualizar labs` opens the repo batch modal (see 2.4). | `dashboard-html.mjs:256-277`; `dashboard-mount.mjs:195-225` |
| Context row | Pills from care plan (soporte, dieta, `Bomba de insulina`) and accesos with `día N` | Care pills go to Estado actual. Acceso pills open Datos. Row hidden if both empty. | `dashboard-html.mjs:196-228` |
| Signos vitales card | Quick inputs `T/A`, `FC`, `FR`, `Temp`, `SatO₂ %` (placeholder `—`); read-only `Glu`, `I/O`; button `Registro completo` | Typing saves vitals (`quickSaveVitals`). `Registro completo` opens the Estado actual registro modal. Altered values get class `hi`. Empty card gets `vitals-card--empty`. | `dashboard-html.mjs:46-60, 118-127, 158-182`; `dashboard-mount.mjs:190-200` |
| Labs card | Header `Labs: fuera de rango`; draw rows; empty text `Sin labs de hoy · últimos: <fecha>` | Click opens Laboratorio on that draw (`openLabs`). | `dashboard-html.mjs:464-512`; `dashboard-mount.mjs:224-227` |
| Cultivos strip | `Cultivos`, `+N más`, tag `ATB pendiente` | Click opens Laboratorio > Cultivos (`switchLabInner('cult')`). | `dashboard-html.mjs:434-452`; `dashboard-mount.mjs:220-223` |
| Medicamentos card | `Medicamentos` (SOAP groups from Estado actual) | Click goes to Clínico > Estado actual. Card is omitted when no SOAP data. | `dashboard-html.mjs:566-580` |
| Pendientes card | `Pendientes`, count or `+N más`, tag `Vencido` | Click goes to Pendientes. Card omitted when list is empty. | `dashboard-html.mjs:636-660`; `dashboard-mount.mjs:228-229` |

✔ live: identity row, vitals card, labs card. ✘ fixed: with data the labs header is `LABS: FUERA DE RANGO` with `corte 07:15 · N en rango · vs 03/10` and tiles (`Hto 32.1 / antes 38.4 ↓`); empty is `LABS` + `Sin labs de hoy · últimos: 03/10/2026` (IC without history: `Sin labs de hoy`). `Glu` tile does not show when no glucose. After a quick save the card shows `toma 12:00 a.m. · 1 fuera de rango` and the changed field shows the range (`88–135`). `Medicamentos` card shows SOAP letters (`N Neuro`, `HD Hemo`, `HI Infeccioso`, `NM`, `Soporte`) with `día 3` for antibiotics. Context row shows `Soporte Aire ambiente`, `Dieta Blanda`. Pendientes/Cultivos cards: omitted when empty ✔ live.
+ live: `+ Agregar` opens `Servicios interconsultantes` picker (groups `Médicas`, `Quirúrgicas`, `Soporte`; button `Listo`). IC header chips: `Servicio`, `Motivo Agregar`, `Seguimiento · Sin definir`.
Loading/error states: not reachable (no loading state seen; quick save is instant).
Links next: Datos modal, Laboratorio (labs, cultivos), Estado actual, Pendientes.

### 1.2 Pendientes (todo)
Purpose: patient to-do list. Pane `#itab-content-todo` > `#todo-form` (`app-body.html:545`). Back link in Resumen mode: `Volver al resumen` (`btn-volver-al-resumen`).
Controls (`public/js/features/todos-list-render.mjs`):
- Filter chips `Todos` and `Entrega` with counts (`todos-list-render.mjs:333-339`). `Entrega` = open items from the previous shift.
- Button `+ Pendiente` opens the add modal (`todos-list-render.mjs:367-373`).
- Add modal `Nuevo pendiente`: `Qué hay que hacer` (placeholder `Describe el pendiente`), `Prioridad`, `Vence`, buttons `Cancelar`, `Agregar pendiente` (`todos-add-modal.mjs:40-61`). Due-date editor has `Fecha límite`, quick dates, `Restablecer`, `Editar`, `+ Relativo`, `+ Hora fija`, `Quitar fecha` (`app-body` modal `partials/modals/root.html:164-199`; `todos-due-composer.mjs:12, 96`).
- Table columns `Prior.`, `Pendiente`, `Quién`, `Vence` (`todos-list-render.mjs:39`). Groups: `Vencidos`, `Próximos`, `Sin fecha`, `Cerrados · últimas 24 h` (`todos-list-render.mjs:42-46`).
- Row actions: priority chip (click cycles; `todos-priority-ui.mjs:30-31`), `En curso` toggle (`todos-list-render.mjs:188-196`), mark done (`Marcar como resuelto`, toast `Pendiente marcado como listo` with `Deshacer`, `:210-221`), `Recibido` for handoff items (`:231-232`), delete with confirm `¿Eliminar este pendiente?` (`:240-247`). Row text is editable (placeholder `Descripción del pendiente`, `:260`).
- Tab badge shows open count (`updateExpPendientesTabBadge`).
✔ live: empty text, filter chips `Todos`/`Entrega` with counts, `+ Pendiente`, modal `Nuevo pendiente` (`Qué hay que hacer`, `Prioridad` Media, `Vence` quick dates `Hoy 18:00`, `Mañana 08:00`, `En 3 h`, `En 24 h`, `Cancelar`, `Agregar pendiente`). Table columns `Prior.`, `Pendiente`, `Quién` (`@uitest`), `Vence`; row buttons `Clic: cambiar prioridad`, `Marcar como en curso`, `Marcar como resuelto`, `Eliminar`. ✘ fixed: group `HOY · N` exists (not listed above); closed rows move to `CERRADOS · ÚLTIMAS 24 H` and show no buttons. Resolve toast and `Deshacer`: not reached (toast gone before capture). `Volver al resumen`: not shown in Sala.
Empty: `Sin pendientes` / `Los pendientes que agregues aparecen aquí.`; with `Entrega` filter: `Sin pendientes del turno anterior` (`todos-list-render.mjs:466-472`). No patient: `Elige un paciente para ver pendientes` (`:615`).
Also fed by the receta import (`pendientes` from SOME, `medications-receta-processing.mjs:352`).

### 1.3 Clínico > Estado actual
Purpose: vitals, glucose, balance, diet, support and meds-by-SOAP for the shift. Mount `#exp-pane-estado-actual` (`app-body.html:~400`). Built in `estado-actual-panel-render.mjs:165-196`.
- ✔ live: title, `Ver gráficas` (+ live: button, summary `Registra al menos 2 mediciones para ver gráficas.`), `Registro manual`. `Enviar a nota` absent in Sala ✔ live, present in IC ✔ live.
- ✘ fixed: the registro modal title is `Registro completo` (opened by `Registro manual`). Fields: date/hour pickers, `TAS`, `TAD`, `FC`, `FR`, `Temp`, `Saturación`; `GLUCOMETRÍAS` (`Bomba`, `+ Agregar hora`, 08:00/16:00/00:00); `BALANCE HÍDRICO CC` (Matutino/Vespertino/Nocturno/Total, `Ingresos`, `Egresos`, `Evacuaciones`, `+ Otra fuente`, `+ Evento`); buttons `Pegar monitoreo`, `Cancelar`, `Registrar`; hint `Basta un dato para registrar · ⌘↵`. Live save worked: `120/80`, `1200 CC` in, `DIURESIS 900 CC`, `+300 CC` balance.
- + live: `+ Categoría` (category picker), per-proposal buttons `Confirmar`, `Descartar`, `Reclasificar categoría` + `Aplicar reclasificación`, sources `+ Receta` / `+ Manual`, toast `Propuestas confirmadas`, text `Dieta importada desde SOME — revisa los valores y confirma o descarta.`.
- Title `Estado actual`, saved label (`#ea-meta-guardado`), charts summary, action bar (`estado-actual-panel-render.mjs:172-181`).
- Buttons: `Registro manual` (always, opens registro modal); `Enviar a nota` only in Interconsulta (`estado-actual-panel-render.mjs:40-45`). `Enviar a nota` runs `commitEstadoActualToNote` (`estado-actual-panel-actions.mjs:374-382`).
- Sections: snapshot zones with `Balance hídrico` (`estado-actual-panel-snapshot.mjs:25-37`), `Estado clínico general` (collapsible, `estado-actual-panel-clinico.mjs:190`), `Historial reciente` (`estado-actual-panel-snapshot.mjs:56`).
- Clínico fields seen: `Soporte respiratorio`, `Modo`, `FiO₂ (%)`, `Flujo (L/min)`, `Litros O₂`, `PEEP / EPAP`, `PS (cmH₂O)`, `VT (mL)`, `P meseta`, `Flujo insp.`, `Esferas`, `FOUR (/16)`, `Kcal total`, `Kcal/kg`, `Proteína (g/día)` (`estado-actual-panel-clinico-html.mjs`).
- Diet and med proposals from the receta: `Confirmar dieta`, `Descartar`, `Confirmar todas las propuestas` (`estado-actual-panel-clinico-html.mjs:416-417, 447`). Toast when meds are sent: `Propuesta en Estado Actual — confirma en Estado clínico general` (`medications-receta-processing.mjs:166`).
- Registro modal sections: `Signos vitales`, `Glucometrías`, `Balance hídrico cc` (`estado-actual-panel-registro.mjs:548, 562, 822`). Vital history modal button `Capturar turnos o evento` (`estado-actual-panel-snapshot-html.mjs:583`).
- Floating button `Copiar estado actual al portapapeles` (`#ea-copy-fab`, `app-body.html:201`), only on Estado actual (`estado-actual-panel-actions.mjs:~395`).
- Empty: `Selecciona un paciente para monitoreo` / `Elige uno en el censo de la izquierda. Ahí podrás registrar signos, balance hídrico y dieta.` (`estado-actual-panel-render.mjs:63-64`).
- Soap text modal: `Guardar`, `Guardar y copiar`, `Insertar en evolución` (`partials/modals/root.html:509-511`); toasts `Estado Actual guardado ✓`, `Estado Actual guardado y copiado ✓` (`soap-estado.mjs:265, 295`); confirm `¿Reemplazar evolución?` if the note evolution has text (`soap-estado.mjs:154`).

### 1.4 Clínico > Medicamentos (Sala only)
✔ live: grid `Medicamento` + hour columns (`06:00 14:00 18:00 22:00`), legend `Administrado (por defecto)` / `No administrado (clic en la celda)`, `PRN` button with count, modal `Registrar PRN` with the exact text below. + live: per-row `×` (`Ocultar … de la lista`), notice `Propuestas confirmadas` with `Cerrar aviso`. `Mostrar`: not reached.
Pane `#exp-pane-medAdmin` (`js/features/med-admin-panel.mjs`). Grid of active receta meds by hour: column `Medicamento` + hour headers (`:92-93`). Button `PRN` opens modal `Registrar PRN` (text: `No se marcan por defecto. Elige la hora y registra cada dosis administrada.`, `:185-188, 252`). Hidden meds list has `Mostrar` (`:139`). Empty: `Sin medicamentos activos en la receta.` (`:236`).

### 1.5 Clínico > Eventualidades (Sala only)
Pane `#exp-pane-eventualidades`. Compose box placeholder `Describe lo ocurrido…` (`eventualidades-panel-html.mjs:112`). ✔ live: pane text `Bitácora cronológica de la hospitalización, agrupada por día.`; empty `Aún no hay eventualidades. Agrégalas abajo.`; `Nueva eventualidad` with date field (`Elige una fecha anterior si aplica`) and `Agregar`. Empty add -> toast `Escribe la eventualidad antes de agregar.`; saved -> toast `Eventualidad guardada.`, entry grouped under `Hoy`, `1 registro`, buttons `Editar`/`Eliminar`.

### 1.6 Clínico > Nota de evolución (Interconsulta)
✔ live in IC. + live: button `Anteriores (0)` (copies saved on print/generate), hint `Se guarda una copia cada vez que imprimes o generas el documento`. `Traer de Estado actual` with empty Estado: no toast. Preview opened with `Cerrar`, `Imprimir`, `Generar .docx`, `Generar PDF` ✔ live.
Pane `#note-form` (`app-body.html:543`), rendered by `renderNoteForm` (`js/features/notes-indicaciones.mjs:79-158`).
Controls:
- `Fecha` (`DD/MM/AAAA`), `Hora` (`HH:MM`).
- `Traer de Estado actual` (fills Evolución and vitals from Estado actual; title `Llena Evolución y Signos vitales con el Estado actual`, `:~115`).
- `Salida rápida` (`quickExportCurrentPatient`).
- `Generar Nota` (opens preview).
- Blocks: `Interrogatorio, exploración y estado mental` (placeholder `Refiere / niega…`), `Evolución · N / V / HD / HI / NM`, `Estudios auxiliares` (`Fecha, luego un estudio por renglón`), `Diagnósticos` with `Desde censo` and `+ Agregar diagnóstico`, `Tratamiento e indicaciones` with `+ Agregar indicación`, `Signos vitales` (`T.A.`, `F.R.`, `F.C.`, `Temp`, `Peso`), `Firma` (`Médico tratante`, `Profesor responsable`).
- Edits save on each input (`updateNote` -> `persistClinicalState`, `:159`).
- `Desde censo` toasts: `No hay diagnósticos en el censo de este paciente.` / `Diagnósticos del censo en la nota ✓` (`:192, 198`).
- `Estudios auxiliares` is rebuilt from lab history by `rebuildEstudiosFromLabHistory` (`js/lab-history-maint.mjs:198-215`).
- Preview modal (`Vista previa de la nota`): `Cerrar`, `Imprimir`, `Generar .docx`, `Generar PDF` (`doc-preview-html.mjs:~224-227`; `notes-indicaciones.mjs:497-512`).
- Errors: `Sin conexión con el servidor local. Reinicia R+ para generar documentos.` (`document-export-client.mjs:244`); mobile: `En R+ Móvil no se generan documentos (.docx). Usa la app de escritorio para Word y salida rápida.` (`mobile-web.mjs:32`).

### 1.7 Clínico > Indicaciones (Interconsulta)
✔ live in IC: fields `Fecha`, `Hora`, `Médicos`, selector `Predeterminados…`, `Anteriores (0)`, sections `Dieta`, `Cuidados`, `Estudios`, `Medicamentos`, `Interconsultas`, `Otros` + `+ Agregar sección`, text `Sin secciones extra.`, buttons `Salida rápida`, `Generar Indicaciones`. `Generar Indicaciones` produced no file and no toast in the test (empty form): not confirmed.
Pane `#indica-form`, `renderIndicaForm` (`notes-indicaciones.mjs:259-306`). Fields: `Fecha`, `Hora`, `Médicos`; sections for dieta / cuidados / estudios / medicamentos / interconsultas (areas map `:282`), `Otros` with `+ Agregar sección`; extra-template selector (toasts `Elige una plantilla`, `Plantilla aplicada: …`, `:381-393`). Buttons `Salida rápida`, `Generar Indicaciones`. Export file `Indicaciones_<nombre>_<fecha>.docx` (`lib/doc-export-service.js:48`).

### 1.8 Clínico / Salida > VPO
Pane `#vpo-container` (`js/features/vpo-panel.mjs`). ✘ fixed: VPO = Valoración PreOperatoria (pane title `RIESGO PREOPERATORIO`, intro placeholder `SE REALIZA VALORACIÓN PREOPERATORIA…`). Live labels: `Copiar riesgos`; note `R+ no calcula puntajes ni porcentajes de riesgo preoperatorio…`; scales `ASA`, `RCRI (índice de Lee)`, `Gupta MICA`, `ARISCAT`, `Caprini` (field `Resultado…`); `DIAGNÓSTICOS` with `Tomar de la nota`, `Enviar a Datos`, `+ Agregar diagnóstico`, `Separar por +`; `EKG Y RX TÓRAX` (`Copiar EKG`, `Copiar Rx`, `FC (lpm)`, `Tomar de Estado actual`); `FÁRMACOS PERIOPERATORIOS` (`Tomar de SOME`, `Ir a Medicamentos`, `Copiar`, empty `Sin fármacos en VPO. Usa «Tomar de SOME».`); `Copiar valoración completa`. In Sala the VPO tab is in the second group (next to `Listado`); in IC it is in the main row.
Meaning of "VPO" (old note, answered above): Actions and toasts: take FC and SpO₂ from Estado actual (`:156-161`), import diagnoses from the note (`:167-176`), save diagnoses to Datos del paciente (`:188-195`), update drugs from SOME (`:201-207`; needs a processed receta: `Procesa la receta en Medicamentos primero`). Diagnosis paste placeholder `DX1 + DX2 + DX3…` (`:327`). Copy toast `<label> copiado` / `Nada que copiar en <label>`.

### 1.9 Salida > Listado (Sala)
✔ live: `ACTIVOS (0)` / `INACTIVOS (0)` groups with `Sin problemas activos.`, `+ Agregar problema activo` / `inactivo`, header line `Nombre · Reg. · edad/sexo · Cto`, `FECHA Y HORA`, `MÉDICOS (FIRMA)` (`Pre-llena desde Mi Perfil`; `Profesor`, `R4`, `R2`, `R1 (1)`, `R1 (2)`), `Salida rápida`, `Generar Listado (.docx)`. Live result: file `Listado_Problemas_Rosa_Delgado_05_10_2026_12-55-32.docx` saved, toast `Listado guardado: <archivo>`. In Sala `Salida rápida` also made a Listado .docx.
Pane `#listado-form` (`js/features/expediente/expediente-listado.mjs`). Fecha and Hora inputs (`:218-219`), problem rows (placeholder `Descripción del problema`, `:95`), button `Generar Listado (.docx)` (`:228`, file `Listado_Problemas_…docx`, `lib/doc-export-service.js:65`).

### 1.10 Datos del paciente (modal) — "Expediente" data
✔ live. ✘ fixed: header shows bed code, name, `72 años · F · Reg. …`, `Sin fecha de ingreso — Agrégala en Cama e ingreso`, selector `Equipo` (`— Cambiar equipo —`). Chips `Censo` (default: `DIAGNÓSTICOS`, `ANTIBIÓTICOS`, `MEDICAMENTOS` with `+ Agregar` and `↻ Tomar de lista`), `Cama e ingreso` (`Cuarto · Cama`, `Sala` select, `Servicio`, `Área`; `INGRESO` `FIUX`, `FIMI`, `+ Acceso` with `Vía` list `EV periférica`, `CVC`, `PICC`, `Sonda Foley`, `Fecha Acceso`), `Identidad`. Close button is `Cerrar` (icon).
Button `Datos del paciente` / name click. Modal `closePatientDatosModal` (`js/patient-datos-modal.mjs:79-111`). Chips `Censo`, `Cama e ingreso`, `Identidad` (`expediente-datos.mjs:84-86`).
- Identidad: `Nombre`, `Registro`, `Edad · Sexo` (M/F), `Peso · Talla` kg/m (`expediente-datos.mjs:59-67`).
- Cama: `Cuarto · Cama`, `Sala`, `Servicio`, `Área` (`:71-75`). Ingreso: dates + accesos with `+ Acceso` (`:76-78`).
- Summary shows `Sin nombre`, `Día N` or `Sin fecha de ingreso` (`:187-189`).
- Edits save per field (`updatePatient`).

### 1.11 Cultivos and Tendencias inside Paciente
`Resultados` composite holds `Tendencias` and `Cultivos` (`app-body.html:410-412`). Same content as section 2.2 and 2.3.

---

## 2. Laboratorio tab (`appcontent-lab`)
✔ live: inner tabs `Labs`, `Tendencias`, `Cultivos`. `Copiar resultados al portapapeles` FAB was hidden in the test (not reachable). ✘ fixed: top of Labs shows patient name, `Cto. N · Cama N`, status (`Aún no hay labs de hoy · último 03/10 · 09:42`), `Actualizar labs`; results header `RESULTADOS · 5 ALTERADOS DE 60`, `1 DE 2`, `DÍA` select, `ALTERADOS` chips, study blocks `BH`, `QS`, `ESC`, `PFHs` each with `✕` (`Quitar BH de este día`).
Inner tabs (`app-body.html:96-99`): `Labs`, `Tendencias`, `Cultivos` (`switchLabInner`, `js/features/patient-dashboard/lab-inner.mjs`).
Floating button `Copiar resultados al portapapeles` (`#lab-copy-fab`, `app-body.html:198`).

### 2.1 Labs
Purpose: load SOME reports, see structured results per day.
Top card buttons (`app-body.html:104-136`):
- `Actualizar labs` (primary): opens repo batch modal (2.4).
- ✔ live (menu seen: `DATOS`: `Pegar SOME`, `Diagramas`, `Copiar varios días…`; `VISTA`: `BH extendida`, `Salida rápida`; `Eliminar este día`, `Eliminar todos los estudios`). ✘ fixed: `Tablas del reporte` and `Gasometría extendida` were not shown; `Diagramas` WAS shown (history existed). `Buscar estudio` ✔ live.
- `...` menu (`Más acciones de laboratorio`): group `Datos`: `Pegar SOME`, `Diagramas`, `Tablas del reporte`, `Copiar varios días…`. Group `Vista`: switches `BH extendida`, `Salida rápida` (a hidden `Gasometría extendida` switch exists). Danger items `Eliminar este día`, `Eliminar todos los estudios` (shown only when history exists, `data-lab-needs-history`).
- `Diagramas`, `Tablas del reporte` are hidden until a report is loaded (`app-body.html:115-116`).
✘ fixed: an unknown patient is auto-created (see 2.2); the `Paciente detectado` banner did not show in the test. Banner when the pasted patient is not in the list: `Paciente detectado` + name/meta + button `Agregar Paciente` (`openAddModalFromLab`, `app-body.html:141-156`).
Results card `Resultados` (`app-body.html:158-192`): search `Buscar estudio` (Enter = previous day with that study; prev/next/clear buttons, Esc clears), `Día` selector with `Día anterior` / `Día siguiente`, hint line, altered chips, output box.
Empty state before any paste: results card hidden (`display:none`, `app-body.html:158`). Text for a specific empty message: not found.
Loading: class `is-lab-chunk-loading` on the lab root while chunks load (`lab-panel-parse.mjs:~170`); paste uses `runWithPasteLoader` (`lab-panel-parse.mjs:70`).

### 2.2 Pegar SOME / Procesar (modal)
✔ live. Synthetic paste (BH + QS, registro of Rosa) worked: modal closed, new day `05/10/2026` added, `RESULTADOS · 7 ALTERADOS DE 22`, `eTFG` computed; no `Confirmar laboratorios` modal for one report. Empty `Procesar` -> `Pega el texto del reporte primero` ✔ live. Junk text -> `No parece un reporte de SOME. Copia desde «Expediente:» hasta el final del reporte.` ✔ live. Open: menu `Pegar SOME` -> `openLabPasteModal` (`js/features/lab-paste-modal.mjs:12-21`). Global paste and drag a PDF also work (`js/features/paste-smart.mjs:77-120, 198-235`; PDF max 15 MB: `PDF muy grande (máx. 15 MB)`, `:208`).
Modal `Pegar SOME / Procesar` (`partials/chrome/overlays.html:108-130`):
- Label `Pega reportes SOME o Reumatología, o suelta un PDF (uno o varios días; separador entre pacientes distintos)`; textarea `#lab-input`.
- Buttons `Procesar` (`procesarReporte`), `Labs externos` (manual entry), `Separador de paciente`, `Limpiar`.
`procesarReporte` (`lab-panel-parse.mjs:67-122`) and errors:
- Empty: `Pega el texto del reporte primero`.
- No SOME found: `No se detectaron reportes SOME en el texto pegado`.
- Mixed expedientes: warning toast (`mixedExpedienteWarning`).
- No lab values: `No se encontraron resultados de laboratorio en el texto pegado` or `No parece un reporte de SOME. Copia desde «Expediente:» hasta el final del reporte.`
- Exception: `Error al procesar el reporte`.
- Several reports or no quick mode: modal `Confirmar laboratorios` (`Cancelar`, `Procesar todo`, `overlays.html:362-371`) then `runFinalizeWithFreshBlocks`.
- ✔ live unknown patient: stub auto-created, toasts `1 paciente agregado al censo — completa ubicación` and `Paciente: <nombre> · Exp <n>`; card shows `Sin cama`, `Ingreso incompleto`. (test patient archived afterwards)
- Unknown patient: stub patient auto-created, toast `N paciente(s) agregado(s) al censo — completa ubicación` (`lab-panel-parse.mjs:40-49`).
- After store: toasts such as `Laboratorio procesado ✓`, `Resultado ya registrado en historial`, `Labs actualizados en el mismo horario ✓`, `Laboratorio formateado · salida rápida ✓`, `Paciente: <nombre> · Exp <n>`; none matched: `Ningún expediente del pegado coincide con pacientes en la lista` (`lab-panel-workbench-finalize.mjs:32-135`).
- Output drawn by `renderOutput` (`lab-panel-parse.mjs:125-173`): shows results section and syncs history.

### 2.3 Actualizar labs (repo batch modal)
✘ fixed: hint is `Mi equipo · mismo rango para todos · progreso en la barra lateral`; patient list shows name, `Reg. …`, bed; counter `9 seleccionados`; buttons `Cancelar`, `Actualizar · 9`. Not run (needs repository).
`partials/chrome/overlays.html:311-340`. Old text: Hint `Mi equipo · rango compartido · la cola queda en la barra lateral`. `Rango` `Desde` / `Hasta`; `Pacientes` with `Todos`, `Solo activo`, `Ninguno`; `Cancelar`, `Actualizar`. Queue widget `Actualizar labs` with `Detener`, `Cerrar` (`app-body.html:555-583`). Toasts: `Selecciona al menos un paciente con registro`, `Revisa el rango de fechas (Desde no puede ser posterior a Hasta)`, `Actualización masiva solo en la app de escritorio`, `No se pudo conectar al repositorio de laboratorio (revisa red hospital)`, `Ya hay una actualización en curso — mira la cola en la barra lateral`, `Deteniendo actualización…` (`js/features/lab-repo-batch-import.mjs:269-412`).

### 2.4 Tendencias
Container `#tendencias-container` + side pane `#tend-pane` (`Detalle de tendencias`) (`app-body.html:~425-440`). Renders in `js/features/tendencias-render.mjs`.
- ✔ live toolbar: chips `Todos 14`, `Fuera de rango 8`, `Ocultos`, `Tablas dinámicas`, `Buscar analito`; summary `5 oct 2026 · 8 fuera de rango de 14 · el cambio compara con el 3 oct`; study groups collapsible (`Biometría hemática · 6 analitos · 4 fuera de rango`) with `Gráfica` (`Abrir gráfica y tabla del estudio`); columns and row buttons (`Ver tendencia de Hb`, `Ocultar analito`) ✔ live. Detail pane live: `▼ −12% desde el 03/10`, `Rango de referencia`, table `FECHA / VALOR / CAMBIO`, `Esc para cerrar`, pills ✔ live. `Gasometría extendida` toggle not shown. `Comparar con`: not reached.
- Toolbar: filter `Todos` / `Fuera de rango`, `Ocultos`, `Gasometría extendida`, `Tablas dinámicas`, search `Buscar analito` (`tendencias-series.mjs:377-420`).
- Columns `Analito`, `Último`, `Estado`, `Rango`, `Cambio`, `Últimos 5 días` (`tendencias-render.mjs:278`).
- Detail pane: `Fecha / Valor / Cambio`, `Comparar con` / `Sin comparar`, `Sin rango de referencia` (`tendencias-ui-detail.mjs:447-562`). Pills `Agregar evento este día`, `Copiar valores`, `Ocultar analito`, `Agregar a tabla dinámica` (`app-body.html:456-459`).
- Group modal: tabs `charts` / `table`, `Quitar rango`, `‹ Analitos`, `Copiar tabla`, `Copiar como texto` (`app-body.html:469-497`). Dynamic table: `Tabla dinámica`, tabs `Tabla` / `Gráficas`, `Copiar`, `Copiar como texto` (`:508-534`).
- Empty: `Selecciona un paciente.`, `Agrega al menos 2 sets de laboratorio para ver tendencias.` (`tendencias-render.mjs:302-307`), `No hay parámetros con suficientes datos para graficar.` (`:83`), filter-empty messages (`:76, 80`).

### 2.5 Cultivos
`#cultivos-table-container` (`app-body.html:543`), `js/features/expediente/expediente-cultivos-table.mjs`. Group `Sin aislamientos` (`:373`). ATB sub-UI in `expediente-cultivos-atb-ui.mjs`. Empty: `Selecciona un paciente.` (`:401`); `No hay cultivos en el historial. Aparecen urocultivos, hemocultivos, tinción Gram y cultivos de catéter enviados desde Laboratorio.` (`:407`). Column headers: not reachable (no cultivo data in the test patient). ✔ live empty text: `No hay cultivos en el historial. Aparecen urocultivos, hemocultivos, tinción Gram y cultivos de catéter enviados desde Laboratorio.`

---

## 3. Manejo tab (`appcontent-med`) — receta and meds

### 3.0 States
No patient: `Selecciona un paciente para Manejo` + `Elige uno en la lista de la izquierda o agrega un paciente con + Agregar. Después podrás importar el listado SOME y procesar la receta.` Buttons `Buscar en la lista`, `Agregar paciente` (`app-body.html:207-213`).
Inner tabs `Manejo actual` and `Perfil histórico` ✔ live (`Perfil histórico` content not opened: not reached). Empty state ✔ live: `Medicamentos del turno` + `Aún no hay medicamentos. Pulsa Importar SOME, pega el bloque del hospital y procesa la receta.`

### 3.1 Manejo actual (receta)
✔ live with 6 meds: title `Medicamentos del turno · 6`, diet chip `DIETA BLANDA`, date `05/10/2026` (no `Última importación SOME:` prefix seen: ✘ fixed), buttons `Egreso`, `Importar SOME`, lead text ✔ live. Groups are named by SOAP category with count (`ANALGÉSICOS / ANTIPIRÉTICOS · 1`, `NM (SOPORTE, CRÓNICOS, ETC.) · 1`); `SOLO EGRESO · 1` with `PRN y apoyo · no van a la nota` ✔ live; `Falta destino` did not appear (all auto-classified). Antibiotic chip `Día 3` ✔ live. Exclude (`⊘`) then `Restaurar` ✔ live. Footer order live: `Añadir a Tratamiento`, `Enviar a Estado Actual`, `Limpiar`.
+ live: `Enviar a Estado Actual` first opens modal `Días de antibiótico sin registro` (`SOME trae días que R+ no tiene registrados…`, field `Día`, `Cancelar`, `Guardar`), then toast `Propuesta en Estado Actual — confirma en Estado clínico general` ✔ live. Parser note: furosemide `VIA INTRAVENOSA` in SOME showed as `VO` in the list; omeprazole IV was listed as NM and as oral capsule in `Egreso` (not verified as bug).
Header: title `Medicamentos del turno · N` (`medications-panel-rows.mjs:433`), diet chip, last-import date (`Última importación SOME: …`, `medications-panel-render.mjs:112`), buttons `Egreso` (`openMedEgresoModal`) and `Importar SOME` (`openMedRecetaPasteModal`) (`app-body.html:239-243`).
Lead text: `Nota envía a Estado actual. ⊘ quita de Estado actual y del egreso.` (`app-body.html:~253`).
Row controls (`medications-panel-rows.mjs`): `Nota` chip (title `Incluir en Estado Actual (nota)`, `:108`), `⊘` exclude (`Excluir de Estado actual y egreso`, `:109`), `Restaurar` (`:135`), destination picker `Cambiar destino` / `Elegir destino…` (`:154-159`, labels in `public/js/med-receta-soap.mjs:202+`, e.g. `Analgésicos / antipiréticos`, `Antieméticos`), antibiotic day button `Cambiar día de antibiótico` (`:264`).
Groups: `Falta destino` (`no sale en la nota hasta que elijas uno`), `Reposiciones`, `Solo egreso`, `Excluidos` (`:299-303`).
Footer (`medications-soap-footer.mjs:10-17`): `Enviar a Estado Actual` (`mediLlevarASOAP`), `Añadir a Tratamiento` (Sala only), `Limpiar`.
Empty: `Aún no hay medicamentos. Pulsa Importar SOME, pega el bloque del hospital y procesa la receta.` (`medications-panel-render.mjs:83-84`); no patient: `Selecciona un paciente en la columna izquierda para ver su manejo.` (`:71`).

### 3.2 Importar desde SOME (modal)
`partials/chrome/overlays.html:394-412`: text `Pega el bloque de medicamentos y dietas copiado del hospital (columnas con tabulador). Cuidados y estudios se omiten.`; textarea `Texto del hospital` (placeholder `MEDICAMENTOS, MEDICAMENTOS P2, DIETAS…`); buttons `Limpiar`, `Cancelar`, `Procesar receta`.
`Live: block with 6 meds + 1 diet -> toast `Manejo actualizado (6 medicamento(s) · 1 dieta(s))` (no pendientes part when 0) ✔ live; modal closed ✔ live. ✘ fixed: bad text gives `No parece el bloque de SOME. Copia desde Fecha/hora con tabuladores (medicamentos, dietas…) y pégalo aquí.` (`el`, not `un`).
`procesarRecetaMed` (`medications-receta-processing.mjs:432-452`): parse -> failure toasts -> `reviewAguaInyectableAlerts` -> `commitProcessedReceta` -> toast `Manejo actualizado (N medicamento(s) · N dieta(s) · N pendiente(s))` plus `Omitidas N líneas (…)` (`:222-235`) -> close modal.
Errors: `Selecciona un paciente primero`; `No parece un bloque de SOME. Copia desde Fecha/hora con tabuladores (medicamentos, dietas…) y pégalo aquí.`; `No se encontraron filas MEDICAMENTOS, DIETAS, ESTUDIOS ni PROCEDIMIENTO válidas`; `No se pudo procesar la receta. Si persiste, reinicia la app (⌘R) y vuelve a pegar desde SOME.` (`:208-218, 448-451`).
Side effects: items repeated in `pendientes` are skipped with `N pendiente(s) ya estaban en la lista, no se repitieron` (`:352`).

### 3.3 Egreso (modal)
✔ live: tabs `Completa` / `Nombre + Día`, numbered list, footer `6 van a la receta de egreso. Los excluidos no.`, `Copiar` -> toast `Medicamentos copiados al portapapeles ✓`. `Texto de egreso`; tabs `Completa` / `Nombre + Día`; button `Copiar` (`medications-egreso-modal.mjs:49-100`). Toasts `No hay medicamentos procesados`, `No hay medicamentos activos para copiar`, `Medicamentos copiados al portapapeles ✓`, `Error al copiar al portapapeles`.

### 3.4 Perfil histórico (pharmacy profile)
`app-body.html:~255-305`. Filter `Filtrar` (`TODOS`), checkbox `Mostrar ocultos (N)`, buttons `Importar mes SOME`, `Vista SOME` (full-screen calendar), menu with `Eliminar mes visible`, `Borrar perfil completo`. Month nav `Mes anterior` / `Mes siguiente`. Columns `Medicamento`, `Acciones`, `Freq`, `Vía`; legend `Indicado (administrado por defecto)`, `No administrado (clic en calendario)`, `Hoy`. Paste modal `Pegar mes SOME` (`Matriz SOME`, `overlays.html:416-425`). Code: `js/features/med-pharm-profile-*.mjs`.

---

## 4. Agenda tab (`appcontent-agenda`)
✔ live: title, `Lun 5 oct — dom 11 oct 2026`, `← Semana ant.`, `Semana sig. →`, `+ Nuevo procedimiento`, grid days x hours 06:00-21:00. Empty week: no text, only the empty grid (gap answered). Modal ✔ live: `Paciente` select (lists 18 names, more than the 9 in the census), `Procedimiento`, `Lugar`, `Inicio`, `Material aprobado`, `Anestesio agendado`, `Guardar`. Empty save -> `Indica el procedimiento.`; saved -> `Procedimiento guardado`, block `Toracocentesis … 12:55 · Sala 3`; edit modal has `Eliminar` + confirm dialog (`Cancelar`/`Eliminar`) -> `Eliminado de la agenda` ✔ live.
`Agenda de procedimientos` (`app-body.html:318`), week range label, buttons `← Semana ant.`, `Semana sig. →`, `+ Nuevo procedimiento` (`app-body.html:322-324`). Grid mount `#procedure-agenda-grid-mount`; blocks are buttons labelled `Editar procedimiento para <paciente>` (`js/features/agenda-panel-render.mjs:114`).
Modal `Procedimiento agendado` (`partials/modals/root.html:106-146`): `Paciente`, `Procedimiento` (`Ej. IQ programada`), `Lugar` (`Quirofano / sala…`), `Inicio (fecha y hora)`, checkboxes `Material aprobado`, `Anestesio agendado`, buttons `Eliminar` (edit only), `Guardar`, error area `#pa-modal-error`.
Toasts: `Procedimiento guardado`, `Eliminado de la agenda` (`js/features/agenda.mjs:208, 228`); validation errors shown in the modal and as toast (`:176-181`). Empty-week text: not found.

---

## 5. Add patient
Entry points: sidebar `+ Agregar`; empty-state `Agregar paciente`; Laboratorio banner `Agregar Paciente`; Resumen/Manejo empty states.
Modal title and mode (`js/features/patients-modal.mjs`):
- ✘ fixed live: `+ Agregar` opens `Agregar por registro` with one field `Registro(s)` (placeholder `REGISTRO 1`), `×` row remove, `Equipo` select (`— Sin asignar —`, `Equipo Sala 1`) and button `Agregar Paciente` (not `Buscar registros`). Empty -> `Indica el registro` ✔ live. With `UITEST-0099` -> `Consultando repositorio…` then error `Falta la dirección del portal de laboratorio — pégala en Ajustes → Laboratorio.` (new; the mock has no portal) and the modal closes; no patient added.
- `openAddModal` -> title `Agregar por registro` (registro "tunnel"), `:328-348`. Fields: `Registro(s)` rows, `+ Agregar registro`, `Pegar varios (uno por línea)` + `Separar en cajas`, plus `Equipo`/`Sala` selects. Save button label `Buscar registros` (`:178`).
- `openAddModalFullManual` -> `Nuevo Paciente`: not reachable (only called from the guided tour, `tour-step-actions.mjs:522`; no normal button).
- (old) `openAddModalFullManual` -> `Nuevo Paciente` (`:350`). Fields: `Nombre completo *`, `Registro`, `Edad *`, `Unidad` (años...), `Sexo *`, `Área / Departamento *`, `Servicio *`, `Cuarto *`, `Cama *`, `Sala`, `Equipo` (`partials/modals/root.html:12-95`). Save button `Agregar Paciente`.
- `openAddModalFromLab` -> `Agregar Paciente del Lab`, prefilled block `Del reporte de laboratorio` (`:405`).
- ✔ live `Completar ingreso` (opened from an `Ingreso incompleto` card in IC): `Servicio solicitante *` buttons (`Traumatología`, `Cirugía general`, `Ginecología`, `Neurocirugía`, `Cirugía plástica`), `Motivo de consulta`, `FI · Fecha de ingreso`, `FIMI · Fecha de interconsulta MI`, `Cuarto *`, `Cama *`, `Equipo`; ✘ fixed: the button is `Agregar Paciente` (not `Guardar ubicación`). Empty service -> `Ingresa servicio`; saved -> toast `Ubicación guardada`. Close with edits -> `¿Cerrar sin guardar?` (`Seguir editando` / `Cerrar sin guardar`) ✔ live. In Sala this modal did not show.
- `openCompleteAdmissionModal` -> `Completar ingreso`, button `Guardar ubicación` (`:271, 316`).
- Interconsulta mode adds `Servicio solicitante *`, `Motivo de consulta`, `FI · Fecha de ingreso`, `FIMI · Fecha de interconsulta MI` (`root.html:63-73`).
`savePatient` (`patients-modal.mjs:554-622`):
- Registro mode: empty -> toast `Indica el registro`; else `admitPatientsViaRegistroTunnel` (`js/patient-registro-tunnel.mjs:206`).
- Manual: `validatePatientForSave` (`js/patient-validation.mjs:4-18`): `Falta el nombre del paciente.`; `La edad debe ser un número válido.`; missing registro = warning -> advice dialog (`showExpedienteAdvice`) before commit.
- Duplicate registro -> warning dialog, user may continue.
- Close with edits -> confirm `¿Cerrar sin guardar?` (`Cerrar sin guardar` / `Seguir editando`, `:506-508`).
- Success: `Paciente agregado` (`patients-modal-commit.mjs:175, 195`), patient selected. Failures: `No se pudo completar el alta`; team assign fail `Paciente guardado, pero no se pudo asignar al equipo`; demo duplicate `<nombre> ya está en el censo`.
Registro tunnel toasts: `Consultando repositorio…`, `Reg. N ya está en el censo`, `Consulta por registro solo en la app de escritorio`, `Error al consultar el repositorio`, `Paciente agregado al censo — completa ubicación` (`patient-registro-tunnel.mjs:118-197`).

---

## 6. .docx export (all places)
| Where | Button | Flow | File name |
|---|---|---|---|
| Nota de evolución | `Generar Nota` -> preview -> `Generar .docx` | `previewNota` -> `openDocPreview` -> `generateWord` -> POST `/generate` (`notes-indicaciones.mjs:206-248, 449-515`) | `Nota_Evolucion_<nombre>_<fecha>.docx` (`lib/doc-export-service.js:41`) |
| Indicaciones | `Generar Indicaciones` | `generateIndicaciones` (`notes-indicaciones.mjs:397-435`) | `Indicaciones_…` (`doc-export-service.js:48`) |
| Listado | `Generar Listado (.docx)` | `generateListado` (`expediente-listado.mjs:228`) | `Listado_Problemas_…` (`doc-export-service.js:65`) |
| Any | `Salida rápida` | `quickExportCurrentPatient` picks by setting `quickOutputFormat`: html, txt, listado, indicaciones (`js/clinical-quick-export.mjs:107-135`). Toasts `Salida .txt descargada`, `Salida .html descargada`. | n/a |
✔ live .docx: with a saved folder the file is written at once (Listado ✔, Nota ✔: `Nota_Evolucion_Manuel_Ibarra_.docx`). ✘ fixed: when `Fecha` is empty the name ends with `_` and has no date. Toast text for the nota not captured. `Generar Indicaciones` gave no file in the test. Output folder: if none saved, Electron folder picker; toasts `Nota guardada: <archivo>`, `Selecciona una carpeta para guardar el documento.`, `No se guardó el documento: no se eligió carpeta.`, `Error: …`, `Error de conexión` (`notes-indicaciones.mjs:236-248`). Generator code: `lib/doc-generators/note.js`.
PDF alternative: `Generar PDF` -> `/generate-html-pdf` (`notes-indicaciones.mjs:450-478`). `Imprimir` archives a copy.
Loading: button shows `Generando…` with elapsed time (`setAsyncButtonLoading`, `:212`).

---

## 7. Flow diagrams

### 7.1 Paste SOME -> labs -> .docx
```
[Laboratorio tab]  (or paste anywhere / drop PDF: paste-smart.mjs:77-235)
   |
   v  menu "..." > "Pegar SOME"  (lab-paste-modal.mjs:12)
[Modal "Pegar SOME / Procesar"]  textarea #lab-input
   |  click "Procesar"  -> procesarReporte (lab-panel-parse.mjs:67)
   v
 text empty?            -> toast "Pega el texto del reporte primero"  (stop)
 no SOME blocks?        -> toast "No se detectaron reportes SOME..."   (stop)
 no lab values?         -> toast "No parece un reporte de SOME..."     (stop)
   |
   +-- many reports / preview needed --> modal "Confirmar laboratorios" --> "Procesar todo"
   |
   +-- patient not in census --> stub patient created
   |        toast "N paciente(s) agregado(s) al censo — completa ubicación"
   v
 finalizeBulkLabPaste: store in lab history, select matching patient
   toast "Laboratorio procesado ✓" / "Paciente: <nombre> · Exp <n>"
   v
[Labs: card "Resultados"]  pick day, search, "Copiar resultados" FAB
   |-- tab "Tendencias"  (needs >= 2 lab sets)
   |-- tab "Cultivos"
   v
 history rebuilds note.estudios  (lab-history-maint.mjs:198)
   v
[Paciente > Clínico > Nota de evolución]   (Interconsulta mode)
   "Traer de Estado actual" (optional), edit blocks
   v  "Generar Nota"
[Vista previa de la nota]  -> "Generar .docx"
   v  POST /generate  -> folder (saved or picker)
 toast "Nota guardada: Nota_Evolucion_<nombre>_<fecha>.docx"
```
Live result: steps up to the lab modal, results, Tendencias ✔ live; confirm modal not shown for one report; Cultivos empty ✔ live; Nota only in IC ✔ live; .docx works (Nota in IC, Listado in Sala) ✔ live. Gap confirmed: in Sala mode there is no `Nota de evolución` (see 0.3). Docx from Sala: `Listado` or `Salida rápida`.

### 7.2 Add patient
Live: registro path stops at `Falta la dirección del portal de laboratorio…` in the test app (needs portal URL). Manual form not reachable. Lab-paste path works as a way to add a patient (stub). Diagram otherwise as drawn except button names (`Agregar Paciente`).
```
"+ Agregar" (sidebar) / "Agregar paciente" (empty states) / "Agregar Paciente" (lab banner)
   |
   +-- openAddModal -> "Agregar por registro"
   |      enter registro(s) -> "Buscar registros"
   |      savePatient: empty -> "Indica el registro" (stop)
   |      admitPatientsViaRegistroTunnel -> "Consultando repositorio…"
   |         already in census -> "Reg. N ya está en el censo"
   |         ok -> "Paciente agregado al censo — completa ubicación"
   |         fail -> "Error al consultar el repositorio"
   |
   +-- openAddModalFullManual -> "Nuevo Paciente"
   |      fill Nombre, Edad, Sexo, Área, Servicio, Cuarto, Cama
   |      "Agregar Paciente" -> validate (nombre, edad)
   |         no registro -> advice dialog -> continue
   |         duplicate   -> warning dialog -> continue
   |
   +-- from lab -> "Agregar Paciente del Lab" (prefilled)
   v
 commitPatientFromModal -> defaults for nota + indicaciones -> assign team
   toast "Paciente agregado" -> patient selected -> Paciente > Resumen
 stub patient: "Completar ingreso" -> "Guardar ubicación"
```

### 7.3 Write nota de evolución
```
Select patient -> Paciente tab -> Clínico -> "Nota de evolución"  (Interconsulta)
   |
   +-- optional: Clínico > "Estado actual" -> "Enviar a nota"
   |       or in note: "Traer de Estado actual" (fills Evolución + Signos vitales)
   |       if Evolución has text: confirm "¿Reemplazar evolución?"
   +-- optional: "Desde censo" (diagnósticos)
   v
 edit: Interrogatorio, Evolución (N/V/HD/HI/NM), Estudios auxiliares, Diagnósticos,
       Tratamiento e indicaciones, Signos vitales, Firma
   (every input saves: updateNote -> persistClinicalState)
   v
 "Generar Nota" -> "Vista previa de la nota"
   |-- "Imprimir"      (archives a copy)
   |-- "Generar PDF"   (/generate-html-pdf)
   |-- "Generar .docx" (/generate) -> toast "Nota guardada: <archivo>"
 or "Salida rápida" (txt/html/listado/indicaciones by setting)
```

### 7.4 Edit receta
Live: works as drawn, with extra step `Días de antibiótico sin registro` before the proposal.
```
Manejo tab -> select patient -> "Manejo actual"
   |
   v  "Importar SOME"
[Modal "Importar desde SOME"]  paste block -> "Procesar receta"
   |  parse fails -> toast (stop)   |  "Limpiar" clears textarea
   v
 reviewAguaInyectableAlerts -> commitProcessedReceta
 toast "Manejo actualizado (N medicamento(s) · N dieta(s) · N pendiente(s))"
   v
[List "Medicamentos del turno · N"]  groups: Falta destino / Reposiciones / Solo egreso / Excluidos
   per row:  "Nota" chip (include in Estado actual)
             "⊘" (exclude)  -> "Restaurar"
             destination picker ("Elegir destino…")
             antibiotic day button
   v
 footer: "Enviar a Estado Actual" -> proposal in Estado actual
         (confirm in Estado clínico general: "Confirmar dieta" / "Confirmar todas las propuestas")
         "Añadir a Tratamiento" (Sala) / "Limpiar"
 "Egreso" -> "Texto de egreso" (Completa | Nombre + Día) -> "Copiar"
 Sala: Paciente > Clínico > "Medicamentos" shows the hourly grid + "PRN"
```

---

## 8. Gaps (not found or not read)
- Answered live: `VPO` = Valoración PreOperatoria; `Eventualidades` and `VPO` controls listed above.
- Still open: `Cultivos` column headers and ATB UI labels (no cultivo data).
- Answered live: Agenda empty week has no text. Labs results card before any paste: not reached (patient had labs).
- Answered live: not reachable in Sala; IC mode only.
- Resumen loading/error states.
- `appcontent-guardia` panel and `Mi rotación` flows (out of scope).
- Exact line numbers marked `~` were taken from partial reads.

---

## Live verification (2026-10-05)
Isolated test app (CDP), synthetic patients, Sala mode then IC mode for Nota and Indicaciones. Marks in this file: about       49 x `✔ live`, 18 x `✘ fixed`, 8 x `+ live`, 8 x `not reachable` (counts by text mark, not by row).

Biggest corrections:
1. Navigation is a top-bar area pill plus a flat sub-tab row, and Sala opens a `Camas` card view (not a left list). IC has its own board and short tab names (`Estado`, `Nota`, `Indic.`).
2. `Nota de evolución` and `Indicaciones` are not reachable in Sala. IC only. `VPO` = Valoración PreOperatoria.
3. Add patient: modal is `Agregar por registro` with button `Agregar Paciente`. The registro path ends at `Falta la dirección del portal de laboratorio…` in the test app. The manual form (`Nuevo Paciente`) is only called by the guided tour. A lab paste of an unknown registro still makes a stub patient.
4. Text fixes: `No parece el bloque de SOME…`; `Actualizar labs` hint; registro modal is titled `Registro completo`; no `Última importación SOME:` prefix; `Completar ingreso` button is `Agregar Paciente`.
5. Missing in first draft: `Días de antibiótico sin registro` modal, per-proposal `Confirmar`/`Descartar`/`Reclasificar categoría`, `HOY` group in Pendientes, `Anteriores (0)`, `Predeterminados…`, card archive icon (instant), `Ver gráficas`.

Flow results:
- 7.1 Paste SOME -> labs -> .docx: works. Paste, Procesar, results, Tendencias OK. .docx works from Listado (Sala) and Nota (IC, file name ends `_` when `Fecha` is empty). Preview shows `Generar .docx`.
- 7.2 Add patient: partly. Registro path blocked by missing portal address (error shown). Manual form not reachable. Lab-paste stub path works.
- 7.3 Write nota de evolución: works in IC only (fill, `Generar Nota`, preview, `Generar .docx`).
- 7.4 Edit receta: works as drawn (plus the antibiotic-day modal).

Not checked / open: `Perfil histórico` content, `Importar mes SOME`, Cultivos with data and column headers, `Generar Indicaciones` file, `Deshacer` toast of a done pendiente, `Copiar resultados` FAB, `Mi rotación`, `Importar desde Drive`, `Filtros de pacientes` and bulk select.

### IC mode live check (2026-10-05)

What IC mode shows that the Sala-mode check missed. Synthetic patient `Marta Solis`. + live unless marked.

- **Mode switch.** Header group `Modo de trabajo` (`Sala | IC | Guardia`, collapsed pill with 3 dots). Toast `Modo cambiado a Interconsulta`. Top bar sub-tabs change to `Resumen`, `Estado`, `Nota`, `Indic.`, `VPO`, `Pendientes`; `Censo` button and `Eventualidades`/`Medicamentos`/`Listado` tabs disappear. Sidebar is hidden on the board and becomes a narrow rail (`Tablero`, `300-1`...) in a patient. `Medicamentos` moves to area `Manejo` (`Manejo actual`, `Perfil histórico`). Details: `04-sala-guardia-and-companion-apps.md` section 3.
- **Open a patient.** A patient with chip `Ingreso incompleto` opens the modal `Completar ingreso` at once (service, motivo, `FI`, `FIMI`, `Cuarto`, `Cama`, `Equipo`, button `Agregar Paciente`). `Esc` does not close it; `×` asks `¿Cerrar sin guardar?` with `Seguir editando` / `Cerrar sin guardar`. No service: toast `Ingresa servicio`. Saved: toast `Ubicación guardada`. Then the band shows `Servicio`, `Motivo`, `Seguimiento` (`Sin definir`, `Pendiente`, `En curso`, `Resuelta`).
- **`Resumen`.** `Signos vitales` and `Labs: fuera de rango` / `Labs` (empty: `Sin labs de hoy · últimos: 03/10/2026`), `Medicamentos` groups (`N Neuro`, `HD Hemo`, `HI Infeccioso`, `NM Soporte`, antibiotic `día 3`), `Registro completo`, `Actualizar labs`, `+ Agregar` (tags).
- **`Estado`.** Page `ESTADO ACTUAL` with `Ver gráficas`, `Registro manual`, `Enviar a nota`, blocks `SIGNOS VITALES`, `GLUCOMETRÍAS`, `BALANCE HÍDRICO` (`Ingresos`, `Egresos`, `Turno ›`, `Global`), `ESTADO CLÍNICO GENERAL` (`FOUR (/16)`, `Esferas`, `Soporte respiratorio`, `Dieta`, `Kcal/kg`, `Proteína (g/día)`, hint `Peso para cálculo: — (captura peso en Datos del paciente)`, `+ Categoría` with drug groups), `HISTORIAL RECIENTE`, copy button `Copiar estado actual al portapapeles`. Same page as Sala `Estado actual`; only the tab name is shorter.
- **`Nota` (`NOTA DE EVOLUCIÓN`).** Header: `Fecha` (`DD/MM/AAAA`), `Hora` (`HH:MM`), `Anteriores (N)` (0 before the first export, 1 after), `Traer de Estado actual`, `Salida rápida`, `Generar Nota` (`#btn-gen`). Boxes: `Interrogatorio, exploración y estado mental` (placeholder `Refiere / niega…`), `Evolución · N / V / HD / HI / NM` (placeholder `Estructura N / V / HD / HI / NM. Edita los formatos en Mi Perfil.`), `Diagnósticos` (`Desde censo`, input `Diagnóstico 1`, `+ Agregar diagnóstico`), `Estudios auxiliares` (prefilled `FECHA (DD/MM/AA) / QS / BH / EGO`), `Tratamiento e indicaciones` (numbered, `+ Agregar indicación`), `Signos vitales` (`T.A.` mmHg, `F.R.` rpm, `F.C.` lpm, `Temp` °C, `Peso` kg), `Firma` (`Médico tratante`, `Profesor responsable`, placeholder `Nombre completo`). Autosave: toast `Se guarda solo`. Diagnoses are shown in capitals.
- **Nota preview and .docx.** `Generar Nota` opens `Vista previa de la nota` (`Así se verá el documento. Para cambiar algo, cierra y edítalo.`): hospital header, patient box (name, registro, edad, sexo, área, servicio, cuarto, cama), `NOTA DE EVOLUCIÓN`. Buttons: `Cerrar`, `Imprimir`, `Generar .docx`, `Generar PDF` (✘ fixed: the earlier note listed only `Generar .docx`). `Generar .docx` closes the preview and saves with no dialog to the user's Downloads folder: toast `Nota guardada: Nota_Evolucion_Marta_Solis_.docx` (name ends `_` because `Fecha` is empty). Note for test runs: the file lands in `~/Downloads`, not in a chosen folder. `Se guarda una copia cada vez que imprime` shows as a button hint; `Llena Evolución y Signos vitales con el…` (hint text, cut) next to `Salida rápida`.
- **`Indic.` (`INDICACIONES`).** Header: `Fecha`, `Hora`, `Médicos` (`Grado y nombre`), `Predeterminados…` (hint `Formatos en blanco. Plantillas guardadas: Ajustes → Plantillas.`), `Anteriores (0)`, `Salida rápida`, `Generar Indicaciones` (`#btn-gen-ind`). Sections: `Dieta`, `Cuidados`, `Estudios`, `Medicamentos`, `Interconsultas`, `Otros` (placeholders such as `Escriba la dieta (una indicación por línea)`, `BH, QS, EGO, imágenes…`, `Fármaco, dosis, vía y horario…`, `Servicio y motivo de interconsulta…`), `+ Agregar sección`, empty text `Sin secciones extra.`. An empty form still generates: preview `Vista previa de las indicaciones`, header `INDICACIONES MÉDICAS`, `FECHA 05/10/2026 13:05 HORAS`, patient box with `DIAGNÓSTICO:` blank (it did not take the nota diagnosis). Same buttons as the nota preview. `.docx`: toast `Indicaciones guardadas: Indicaciones_Marta_Solis_05_10_2026.docx`. `Salida rápida` not run.
- **`VPO`.** Same screen as Sala; see `04-...md` section 6. `Tomar de SOME` and `Ir a Medicamentos` lead to `Manejo` in IC.
- **`Pendientes` (IC).** Empty state `Sin pendientes` / `Los pendientes que agregues aparecen aquí.`; filter chips `Todos 0`, `Entrega 0`; `+ Pendiente`; `Volver al resumen`.
- **Side effects of this check.** Two `.docx` files were moved from `~/Downloads` to the test scratchpad. Marta Solis was filled in (service `Cirugía general`) in the test userData only.
