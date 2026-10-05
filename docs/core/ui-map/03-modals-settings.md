# UI map 03 - Modals, dialogs, Ajustes, Mi perfil, Datos, Nube, unlock

Scope: every modal/dialog, the Ajustes area, Mi perfil, Datos, Nube and LAN, first run and unlock.
UI labels stay in Spanish as in code. All paths are under `packages/core/` (the root `public/` is a symlink to it).
Cites are `path:line`. "not found" means the code did not show it. No PHI.

Important finding: the LAN shift-PIN connect is retired. See section 5.

## 1. Modal table

Common pattern: a `.modal-backdrop` wrapper, a `.wb-modal` box, a close X (`data-wb-close`), `Cancelar` = `data-wb-cancel`.
"Opened by" is only given when the code showed it. Otherwise "not found" (opened by JS I did not trace).

### 1a. `public/partials/modals/root.html`

| id (line) | Title | Opened by | Fields | Buttons | Live (2026-10-05) |
|---|---|---|---|---|---|
| `modal` (1) | Nuevo Paciente | not found | Nombre, Registro, Edad *, Unidad, Sexo * (prefilled block, 9-30); manual block: Nombre completo *, Registro (many rows), Edad, Unidad, Sexo, Servicio solicitante *, Motivo de consulta, FI, FIMI, Area/Departamento *, Servicio *, Cuarto *, Cama *, Sala, Equipo (30-97) | `+ Agregar registro` (40), `Separar en cajas` (48), `Agregar Paciente` = `savePatient` (100) | ✘ fixed: live title is "Agregar por registro". Fields: Registro(s) (`Registro 1` + `Eliminar`, add more rows), Equipo select (`— Sin asignar —` / `Equipo Sala 1`, hint "Asigna al equipo que cubrirá el caso en ⇄."), `Agregar Paciente`. Opened by `+ Agregar` in the Pacientes list. The manual block (Nombre completo, Servicio solicitante...) did not show. DOM also has `Elegir fecha` x2 |
| `procedure-agenda-modal` (105) | Procedimiento agendado | not found | Paciente, Procedimiento, Lugar, Inicio (fecha y hora), 2 checkboxes (131,135) | `Eliminar` = `deleteProcedureAgendaFromModal` (144), `Guardar` = `saveProcedureAgendaFromModal` (145) | ✔ live DOM (title, `Elegir fecha`, `Eliminar`, `Guardar`); trigger not reachable |
| `exp-datos-modal-backdrop` (150) | Datos del paciente | not found | body mounted by JS (`exp-datos-modal-mount`, 156) | close X only | ✘ fixed: opened by header button `btn-exp-datos-open` (`openPatientDatosModal`, aria "Datos del paciente"). Body: bed-id, name, age/sex/registro, "Sin fecha de ingreso", Equipo select `— Cambiar equipo —`, blocks `Censo`, `Cama e ingreso`, `Identidad`, Diagnóstico (paste DX), Antibióticos, Medicamentos with `+ Agregar` and `↻ Tomar de lista`. Close X only |
| `todo-due-modal-backdrop` (160) | Fecha limite | not found | preset chips, `datetime-local` (187), checkbox remind (190) | `Restablecer` (172), `Editar` (173), `+ Relativo` (180), `+ Hora fija` (181), `Cancelar` (196), `Quitar fecha` (197), `Guardar` (199) | ✔ live DOM (`Restablecer`, `Editar`, `+ Relativo`, `+ Hora fija`, `Cancelar`, `Quitar fecha`, `Guardar`); trigger not reachable (palette "Nuevo pendiente" did not open it) |
| `templates-modal` (207) | Formatos clinicos en blanco | Ajustes > Plantillas > `Editar...` (`openNoteFormatsFromProfile`, `public/partials/modals/settings-dropdown.html:380-ish`; exact opener not traced) | Evolucion (N/V/HD/HI/NM), Estudios auxiliares, Dieta, Cuidados, Medicamentos, Estudios, Interconsultas (220-247) | `Cancelar` = `closeTemplatesModal` (264), `Guardar formatos` = `saveTemplates` (265) | ✘ fixed: `Editar...` no longer opens this modal. `openNoteFormatsFromProfile` (`profile-formats.mjs:70`) closes the profile, switches to Interconsulta mode and edits the formats inline in Paciente > Nota / Indicaciones. `templates-modal` is in the DOM but stays hidden (not reachable; `openTemplatesModal` only redirects) |
| `soap-modal-backdrop` (272) | Plantilla de Evolucion | not found | not read | not read | + live: DOM buttons `Insertar en evolución`, `Guardar`, `Guardar y copiar`; trigger not reachable |
| `unified-search-backdrop` (521) | Busqueda unificada | not found | search input "Buscar por nombre, registro, nota o indicacion..." (`unified-search-input`) | close X; results list filled by `updateUnifiedSearchResults` | not reachable: no UI trigger. The header search icon (`btn-header-cmdk`, `openCommandPalette`) opens the command palette instead (see new rows) |
| `extra-templates-modal` (538) | Plantillas guardadas | Ajustes > Plantillas > `Administrar...` = `openExtraTemplatesManager` | Nombre, Dieta, Cuidados, Medicamentos | `+ Nueva plantilla` = `startNewExtraTemplate`, `Cancelar` = `cancelExtraTemplateEdit`, `Guardar plantilla` = `saveExtraTemplateFromEditor` | ✔ live: `Administrar...` opens it. Live shows "Sin plantillas" and `+ Nueva plantilla`, close X. `Cancelar`/`Guardar plantilla` are in the editor view (DOM) |
| `rpc-db-unlock-overlay` (564) | "Recuperar acceso a la base" in HTML, rewritten by JS to "Desbloquear base de datos" / "Protege tus datos clinicos" / "Instalacion incompleta" (`public/js/features/db-unlock-overlay.mjs:159-166,196`) | boot / onboarding when DB is locked (`ensureClinicalDbUnlocked`, `public/js/features/db-unlock-boot.mjs:82`) | contrasena maestra + confirm (JS built), `Codigo de recuperacion` (recovery mode) | `Desbloquear` or `Crear contrasena y continuar` (`db-unlock-overlay.mjs:185`), `Recuperar acceso` = `submitRecoveryCode` (root.html:584), `Ya lo guarde, continuar` = `dismissRecoveryCodeReveal` | not reachable: app is past unlock (auto-unlock). DOM static title "Recuperar acceso a la base" and buttons `Recuperar acceso`, `Ya lo guardé, continuar` ✔ live |
| `rpc-idle-lock-overlay` (592) | R+ esta bloqueado | idle timer, or `Bloquear ahora` (`public/js/features/platform/offline.mjs:211-222,279`) | PIN (password, 4-8 digits, `maxlength=8`) | `Desbloquear` = `submitIdleLockPin` | ✔ live DOM ("R+ está bloqueado", `Desbloquear`); not reachable live (no PIN set). ✘ fixed: `Bloquear ahora` with no PIN opens a prompt first (see new rows) |
| `entrega-modal-backdrop` (604) | Entrega de paciente (header shows patient name, prev/next arrows 607/621) | not found | procedures/studies list (652) | `+` add procedure (`btn-entrega-add-proc`, 656), `Cancelar` (667), `Guardar paciente` (668) | ✘ fixed: add button is `+ Procedimiento` (not `+`). `Cancelar`, `Guardar paciente` ✔ live DOM; trigger not reachable |
| `guardia-patient-action-backdrop` (674) | Paciente | not found | body by JS | `Cancelar` | ✔ live (DOM: title and buttons match); trigger not reachable live |
| `guardia-rotation-config-backdrop` (687) | Configuracion rotacion | R4/Admin; not traced | Fin de mes (referencia), Vigencia (effective_at), Dias de preview (0-14, default 2) | `Cancelar`, `Guardar ciclo` (submit) | ✔ live (DOM: title and buttons match); trigger not reachable live |
| `inherit-patients-backdrop` (717) | Heredar pacientes | after joining a team (`teams-roster-inherit-patients-modal.mjs`) | body by JS | `Mas tarde`, `Atras`, `Continuar` | ✔ live (DOM: title and buttons match); trigger not reachable live |
| `rotation-rejoin-backdrop` (732) | Nueva rotacion | R4/Admin starts a new rotation, or peers get `rotationNuevaAt` via Nube (`public/js/features/clinical-rotation-rejoin-modal.mjs:2`) | `Tu sala este mes` select | `Mas tarde`, `Confirmar sala y elegir equipo` | ✔ live (DOM: title and buttons match); trigger not reachable live |
| `connection-dropdown-backdrop` (755) | Conexion - R+ Cloud | header button `btn-header-team-sync` = `toggleConnectionDropdown` (`public/partials/chrome/header.html:~40`); also `openNubeLogin` (`public/js/features/cloud-sync/session-expired-prompt.mjs:58`) | see section 5 | back `‹ Conexion` (`nav-back`, 73), close X | ✘ fixed: visible heading is "Conexión guardia" (the "Conexión · R+ Cloud" text is the hidden dialog title). Opened by `btn-header-team-sync` ✔ live and by Ajustes > `Nube y equipo ↗` + live. Section 5 has the live views |
| `equipos-lista-backdrop` (778) | R+ Lista de espera | not found | body by JS | not found | ✔ live DOM title "R+ Lista de espera"; trigger not reachable |
| `clinical-teams-backdrop` (788) | Mi rotacion | `openMiRotacion` from `btn-sidebar-mi-rotacion` (`public/partials/layout/app-body.html:48-50`) or `open-rotation` in Nube | body by JS (`clinical-teams/*`) | not read | ✔ live DOM title "Mi rotación"; trigger not reachable (no `Mi rotación` button visible for this R2 user) |
| `clinical-directory-users-backdrop` (798) | Directorio de usuarios | not found | body by JS | not found | ✔ live DOM title; trigger not reachable |
| `clinical-admin-code-backdrop` (808) | Privilegios de administracion | admin flow (`cloud-sync/admin-prompt-modal.mjs`) | Codigo (130-133), Nuevo codigo (min 6) (136), Repite el nuevo codigo (140) | `Cancelar` (146), `Activar` (147) | ✘ fixed: opened live by Mi perfil > checkbox "Privilegios de administración". With no code set it shows "Aún no hay código de administración. Crea uno." with `Nuevo código (mínimo 6 caracteres)`, `Repite el nuevo código`, `Cancelar`, `Guardar y activar`. DOM also has the `Activar` variant (code already exists) |
| `clinical-registration-backdrop` (839) | Registro de guardia | clinical gate (`clinical-registration.mjs`) | Usuario (@usuario) * (`[a-z][a-z0-9_]{2,31}`, 163), Nombre en guardia * (168), Rango R1-R4/Admin (173), Rotacion (183), PIN del turno (⇄) (880, hidden by JS, see 5) | `Continuar` (submit) | ✔ live DOM title "Registro de guardia", `Continuar`; not reachable (user already registered) |
| `rpc-wipe-modal` (895) | Borrar datos de R+ en este equipo (3 steps) | Ajustes > Zona de peligro > `Borrar...` = `openWipeDataModal` | step 3: type `BORRAR` (`rpc-wipe-full-input`) | step 1: `Solo cache y temporales` = `wipeCacheConfirmed`, `Borrado completo` = `wipeAllConfirmed`, `Cancelar`; step 2: `Volver`, `Continuar`; step 3: `Volver`, `Borrar todo` | ✔ live: `Borrar...` opens it. Step 1 shows close X, `Solo caché y temporales`, `Borrado completo`, `Cancelar`. Steps 2-3 not run (destructive) |

### 1b. `public/partials/modals/settings-dropdown.html`

| id (line) | Title | Opened by | Content | Live (2026-10-05) |
|---|---|---|---|---|
| `settings-dropdown-backdrop` (1) | Ajustes | header button `btn-open-settings` = `toggleSettingsDropdown` (`header.html`, near line 41) | head links `Tutoriales` (6), `Ayuda` (7), search `Buscar en ajustes...` (14), 8 accordions. See section 2. | ✘ fixed: Ajustes is a sidebar-nav page (groups TÚ / DATOS / EQUIPO Y APP + `Zona de peligro`), not 8 accordions. Opened by `btn-open-settings` ✔ live. Head: `Tutoriales`, `Centro de ayuda · atajos y tours` (doc said `Ayuda`), search `Buscar en ajustes…`, close X. See section 2 |

### 1c. `public/partials/chrome/overlays.html`

| id (line) | Title | Fields / buttons | Live (2026-10-05) |
|---|---|---|---|
| `update-modal-backdrop` (16) | Nueva version (+ pills version/Pre-release) | notes, progress bar, actions filled by JS. Banner (11-12): `Instalar y reiniciar`, `Mas tarde` | ✔ live DOM title; trigger not reachable |
| `min-version-backdrop` (38) | Actualizacion requerida (cannot be closed: `data-wb-no-close`) | `Descargar desde GitHub` (48), `Buscar actualizacion` (49) | ✔ live DOM title and buttons; trigger not reachable |
| `tend-hidden-modal-backdrop` (54) | Analitos ocultos | `Mostrar todos` (65) | ✔ live DOM title and `Mostrar todos`; trigger not reachable |
| `lab-display-prefs-backdrop` (70) | Vista de laboratorio | not read | ✔ live DOM title "Vista de laboratorio"; trigger not reachable |
| `lab-paste-modal-backdrop` (108) | Pegar SOME / Procesar | `Procesar` (`procesarReporte`, 120), `Labs externos` (`openLabManualEntryModal`, 124), `Separador de paciente` (125), `Limpiar` (126) | ✔ live DOM (`Procesar`, `Labs externos`, `Separador de paciente`, `Limpiar`); trigger not reachable (no "Pegar" button for a patient with no labs; palette "Procesar SOME" showed no modal) |
| `lab-diagrams-backdrop` (132) | Diagramas | not read | ✔ live DOM title; trigger not reachable |
| `lab-some-tables-backdrop` (144) | Tablas del reporte | body by JS | ✔ live DOM title; trigger not reachable |
| `ea-charts-backdrop` (157) | Graficas de monitoreo | body by JS | ✔ live DOM title; trigger not reachable |
| `ea-vital-history-backdrop` (168) | Historial | body by JS | ✔ live DOM title; trigger not reachable |
| `ea-registro-backdrop` (178) | Registro completo; nested `ea-paste-backdrop` (185) "Pegar monitoreo" | nested: `Cancelar` (197), `Aplicar al formulario` (198) | ✔ live DOM (`Cancelar`, `Aplicar al formulario` on both the modal and the nested paste); trigger not reachable |
| `drive-import-backdrop` (205) | Importar desde Drive | `Cambiar texto` (239), review `Anterior` (273), `Importar lo aprobado` (274) | ✘ fixed: DOM also has `Importar sin revisar`, `Revisar secciones…` and a second `Cancelar` (first step). Trigger not reachable |
| `lab-manual-entry-modal` (280) | Labs externos | `Cancelar` (305), `Guardar` (306) | ✔ live: opened live via command palette "Labs externos". Header "Rosa Delgado · Reg. …", "Tipo de estudio" chips (Biometría BH, Química QS, Electrolitos ESC, PFH, Gasometría...), date field, value inputs, `Cancelar`, `Guardar` |
| `lab-repo-batch-modal` (311) | Actualizar labs | Rango, Pacientes; `Todos`, `Solo activo`, `Ninguno` (342-344), `Cancelar` (353), `Actualizar` (354) | ✔ live: opened live by `Actualizar labs` (Pacientes header). Text "Mi equipo · mismo rango para todos"; Desde/Hasta default last 3 days; one checkbox per patient; `Todos`, `Solo activo`, `Ninguno`, `Cancelar`, `Actualizar · 9`. ✘ fixed: submit label carries the count |
| `lab-bulk-preview-backdrop` (359) | Confirmar laboratorios | `Cancelar` (370), `Procesar todo` (371) | ✔ live DOM title and buttons; trigger not reachable |
| `lab-bulk-tour-hint-backdrop` (376) | Varios dias y varios pacientes | `Insertar ejemplo en el cuadro` (388), `Entendido` (389) | ✔ live DOM title and buttons; trigger not reachable |
| `med-receta-paste-modal` (394) | Importar desde SOME | `Limpiar` (408), `Cancelar` (409), `Procesar receta` (410) | ✔ live DOM; trigger not reachable |
| `med-pharm-paste-modal` (415) | Pegar mes SOME | `Cancelar` (429), `Importar mes` (430) | ✔ live DOM; trigger not reachable |
| `med-pharm-modal-one` (435) / `med-pharm-modal-full` (453) | title set by JS | body by JS | ✔ live DOM exists, title empty until JS sets it; not reachable |
| `clinico-unlock-backdrop` (471) | Guia clinica de orientacion | `Cancelar` (485), `Activar guia clinica` (486) | ✔ live DOM title and buttons; trigger not reachable |

### 1d. `public/partials/chrome/header.html` and `public/partials/layout/app-body.html`

| id (line) | Title | Notes | Live (2026-10-05) |
|---|---|---|---|
| `shortcuts-backdrop` (header:54) | Atajos de teclado | `Centro de ayuda completo` (68); opened by `btn-header-shortcuts` (⌘/) | ✘ fixed: no visible header button (`btn-header-shortcuts` has zero size). Opened live by Ayuda menu (? icon) > `Atajos de teclado`; `Centro de ayuda completo` ✔ live |
| `help-quick-backdrop` (header:73) | Centro de ayuda | "Aprender R+": `Continuar tutorial`, `Reiniciar tutorial · Sala`, `Tutorial · Interconsulta`, `Ver pistas de nuevo`, 6 module tours (95-105); `Exportar censo (PDF)`, `Modo presentacion (DEMO PEREZ)`, `Importar DEMO PEREZ (JSON incluido)` (109-111) | ✘ fixed: opened live by `Centro de ayuda completo` (in Atajos) or Ajustes head `Centro de ayuda · atajos y tours`. Has search "Buscar en la ayuda…", topic list (Modo Guardia, Modo Entrega y pendientes, R+ Cloud, equipos y móvil, ... Privacidad de datos), `Reiniciar tutorial · Sala`, `Tutorial · Interconsulta`, `Ver pistas de nuevo`, module tours, collapsed `Avanzado` (Exportar censo, DEMO PÉREZ). `Continuar tutorial` hidden. `Reiniciar tutorial · Sala` opens Aprender R+ |
| `learn-hub-backdrop` (header:119) | Aprender R+ | opened by `btn-open-learn` | ✘ fixed: `btn-open-learn` has zero size. Opened live by Ayuda menu > `Aprender R+`, by Mi perfil > `Ver tutorial de inicio`, and by help-quick `Reiniciar tutorial · Sala`. Shows "0 de 10 módulos"; groups `Guardia y R+ Cloud` (0 de 4), `Fundamentos` (0 de 6); lists SALA (6 modules) and INTERCONSULTA (5 modules) |
| `release-notes-backdrop` (header:129) | Novedades | `Entendido` (140) | ✔ live DOM title "Novedades" and `Entendido`; trigger not reachable |
| `intro-modal` (header:147) | Bienvenido a R+ | `Omitir tutorial`, `Empezar · Sala`, `Empezar · Interconsulta` (150-163) | ✘ fixed: no element with id `intro-modal`. It is `.onboarding-intro-modal` inside `onboarding-intro-backdrop`. Buttons `Omitir tutorial`, `Empezar · Sala`, `Empezar · Interconsulta` ✔ live DOM; trigger not reachable |
| tour bar (header:179-182) | guided tour | `Anterior`, `Pausar y salir`, `Omitir tutorial`, `Siguiente` | not reachable (tour not started) |
| `profile-modal` (app-body:583) | Mi Perfil | see section 3 | ✔ live: opened live by `profile-toggle-btn` (aria "Mi Perfil") and brand `R+`. Blocks differ, see section 3 |

### 1e. Modals and overlays found live, missing above (2026-10-05)

| Element | What it is | Live |
|---|---|---|
| `fh-choice-backdrop` (title `fh-choice-title`) | "Nuevo: pistas en pantalla" with `Desactivar pistas` / `Activar pistas`. Shown on first load after an update | + live |
| `fh-choice-backdrop` (second state) | "Pistas desactivadas ... Ajustes → Apariencia → Pistas en pantalla" with `Mostrarme dónde`, `Entendido`. Shown after `Desactivar pistas` and after each Ajustes action | + live |
| Coach tip | Teal bubble "Nuevo: vuelve a la barra lateral cuando quieras" near `Barra lateral` (stays after pistas are off) | + live |
| Command palette `.cmdk` | Opened by header search icon `btn-header-cmdk`. Input "Ir a… o acción (ej. “exportar”, “labs”)". Actions seen: Procesar SOME, Actualizar labs, Labs externos, Abrir laboratorio, Abrir eventualidades, Abrir estado actual, Exportar nota, Nuevo pendiente, Copiar labs SOAP, Inicio de turno, Ajustes; then patients | + live |
| Export patients modal | "Exportar pacientes": checklist `300-01 — Nombre • registro`, "N paciente(s) seleccionado(s)", `Quitar todos`, `Seleccionar todos`, `Cancelar`, `Exportar JSON...`. Built by JS; opened by Ajustes > Respaldos > Varios pacientes > `Elegir…` | + live |
| `wb-scrim` confirm | Generic confirm "¿Continuar?" with `Cancelar` / `Continuar`. Seen for Base cifrada (.db) `Exportar…`: "Se copiará el archivo .db cifrado. Protégelo como datos clínicos sensibles." | + live |
| Prompt dialog | Small prompt with text field, `Cancelar`, `Siguiente`. Seen: "Ingresa un nuevo PIN de 4 a 8 dígitos para el bloqueo:" (Cambiar PIN…) and "Elige un PIN de 4 a 8 dígitos para el bloqueo por inactividad:" (`Bloquear ahora` with no PIN) | + live |
| Ayuda menu | `?` icon (aria "Ayuda", `aria-haspopup=menu`) opens a menu: `Atajos de teclado`, `Aprender R+` | + live |
| Mode chips | Header chips `Sala` / `IC` (aria "Modo Sala — Estado actual, Historia, Listado de problemas"). Toast "Modo cambiado a Sala" | + live |
| Toasts | "Verificando cadena de integridad…" then "Bitácora forense íntegra (verificación completa)."; "Buscando duplicados en 18 pacientes…" then "No se encontraron duplicados ni coincidencias por fecha/valores" | + live |

## 2. Ajustes settings tree

File: `public/partials/modals/settings-dropdown.html`. Wiring: `public/js/features/settings-help/settings-dropdown.mjs`, `public/js/features/profile-prefs.mjs`, `public/js/features/profile-save.mjs`.
Banner at line 15-18: if "solo este equipo" mode, text "R+ esta en modo solo este equipo..." and button `Activar guardia con R+ Cloud...` = `enableClinicalLanFromSettings` (`public/js/features/clinical-sync-mode-settings.mjs`).

```
Ajustes
|- Apariencia (24)
|   |- Tema: Claro / Oscuro (29-30)            setThemeMode
|   |- Tamano de letra: Normal 100 / Grande 110 / Mas grande 125 (36-38)   setFontZoom
|   |- Densidad: Normal (+ other options not listed in grep) (44)         setUiDensity
|   |- Alto contraste: Desactivado / Activado (50-51)                     setHighContrast
|   |- Movimiento: Sobrio / Mixto / Expresivo (57-59)                     setMotionMode
|   `- Rendimiento (63)
|       |- Aceleracion por hardware (checkbox, 71)   onHardwareAccelerationChange
|       `- Pistas en pantalla (checkbox, 83)         setFeatureHintsEnabledFromSettings
|- Respaldos (92)   [id settings-accordion-backup-sync]
|   |- status card + `Respaldar ahora` (100)         runAutoBackupNow
|   |- Copia automatica antes de importar todo + `Restaurar esa copia...` (105)
|   |- Exportar (107): Todo / Paciente actual / Varios pacientes (`Elegir...`) / Por rango
|   |- Importar (144): Copia completa / Un paciente / Por rango
|   |- Auto-respaldo (172): Frecuencia (Desactivado, Diario, Semanal, ...) (179), Retencion (3/7/14 archivos...) (187), Deshacer ultima operacion (`Deshacer`, 196)
|   |- Base cifrada (201): Copia cifrada (.db) `Exportar...` (209), Copia en texto (JSON, sin cifrar) `Exportar...` (218)
|   `- Herramientas (224, nested <details>): Duplicados en historial de labs `Revisar...`; Recuperar censo desde base `Exportar...`; Bitacora `Exportar`; Paquete sync `Exportar...`/`Importar...`; Catalogo de medicamentos `Exportar...`/`Importar...`
|- Laboratorio (276)
|   `- Direccion del portal de laboratorio (url input, 285; saved on blur `onLabPortalUrlBlur`; local only)
|- Documentos (293)
|   |- Carpeta de salida: `Cambiar...` = chooseOutputDir (301)
|   |- Salida rapida: DOCX / HTML / ... (309)
|   |- Ocultar "Copiar prompt IA" (checkbox, 318)
|   `- Censo PDF (323): Sala en el titulo (— / Sala 1 / Sala 2 / Sala E / Torre HU), Etiqueta de ingreso (FIMI, max 24), `Exportar PDF...` (btn-export-censo-settings)
|- Plantillas (355)
|   |- Plantillas de indicaciones: `Administrar...`
|   |- Formatos de nota: `Editar...`
|   |- Formatos de indicaciones: `Editar...`
|   `- Restablecer formatos: `Restablecer en blanco` (resetProfileTemplates)
|- Seguridad (398)
|   |- status card + `Bloquear ahora` = lockScreenNow
|   |- Bloqueo (408): Bloquear tras (Nunca, 5 minutos, 10 minutos, ...; `settings-idle-lock`), PIN de bloqueo `Cambiar PIN...` (changeIdleLockPin)
|   `- Datos en este equipo (429): Revisar la bitacora `Verificar` (verifyForensicAuditChain); Carpeta de datos `Abrir` (desktop only, hint 'Solo disponible en la aplicacion de escritorio.')
|- Aplicacion (455)
|   |- `Buscar actualizaciones...` (463)
|   |- Actualizaciones (465): Canal (Estable / Pre-releases, 473), Enviar telemetria anonima de actualizacion (checkbox, 485)
|   |- Si algo falla (489): Reinstalar esta version `Reinstalar...`; Restaurar version estable (select, `Restaurar version seleccionada...`, `Abrir instalador en GitHub...`)
|   `- (hidden file inputs, 554-563: backup, patient backup, range backup, sync bundle, med catalog)
`- Zona de peligro (535)
    |- Borrar datos de R+ en este equipo `Borrar...` -> rpc-wipe-modal
    `- `Ir a Respaldos primero` (549, jumps to settings-accordion-backup-sync)
```

Notes:
- Mi perfil is a separate modal, not an Ajustes accordion. Two profile fields live inside Ajustes: `profile-censo-sala`, `profile-censo-fimi-label` (settings-dropdown.html:328,338).
- Accordion has no explicit "Nube" or "LAN" section. Not found. The `chrome.mjs:82` help string mentions "Ajustes → LAN · servidor en esta computadora" but no such section is in the HTML.
- `saveSettings({silent})` writes `localStorage["rpc-settings"]` (`public/js/features/profile-save.mjs:37-52`).

### Live check, Ajustes (2026-10-05)
- ✘ fixed: layout is a left-nav page, not 8 accordions. Groups: TÚ (`Apariencia`), DATOS (`Respaldos`, `Laboratorio`, `Documentos`, `Plantillas`), EQUIPO Y APP (`Seguridad`, `Aplicación`, `Nube y equipo ↗`), then `Zona de peligro` (red, bottom). Pane ids stay `settings-accordion-*`. Opens on Apariencia.
- ✘ fixed: `Nube y equipo ↗` EXISTS. It closes Ajustes and opens the Conexión panel. The note "no Nube section" above is wrong.
- ✔ live: head `Tutoriales`, search `Buscar en ajustes…`, close X. ✘ fixed: second head button is `Centro de ayuda · atajos y tours` (not `Ayuda`).
- ✔ live: Apariencia `Tema` Claro / Oscuro; `Alto contraste` Desactivado / Activado; `Rendimiento` > `Aceleración por hardware` (toggle, "Pide reiniciar R+"), `Pistas en pantalla` (toggle, "Globos junto a los botones...").
- ✘ fixed: `Tamaño de texto` (not "Tamano de letra") shows Normal / Grande / Más grande with no 100/110/125 numbers. `Modo de vista` (not "Densidad") shows only `Normal`. `Animaciones` (not "Movimiento") shows Sobrio / Mixto / Expresivo.
- ✔ live: Respaldos has status card ("Sin respaldos todavía", "Auto-respaldo desactivado · Descargas"), `Respaldar ahora`, Exportar (Todo, Paciente actual, Varios pacientes `Elegir…`, Por rango), Importar (Copia completa, Un paciente, Por rango), Auto-respaldo (`Frecuencia` Desactivado / Diario / Semanal; `Retención` 3 / 7 / 14 archivos), Base cifrada, Herramientas.
- ✘ fixed: the undo button is the full text `Deshacer última operación` (hint "Usa una copia en memoria del momento previo."). "Copia automática antes de importar todo" + `Restaurar esa copia…` are in the DOM but hidden live (no copy yet): not reachable.
- ✔ live: Herramientas (nested, collapsed): `Revisar…` duplicados (live toast: no duplicates), Recuperar censo `Exportar…`, Bitácora `Exportar`, Paquete sync `Exportar…` / `Importar…`, Catálogo de medicamentos `Exportar…` / `Importar…`.
- ✔ live: Laboratorio has `Dirección del portal de laboratorio` + hint "Se guarda solo en esta computadora. Necesaria para «Actualizar labs», la actualización masiva de equipo y el alta por registro."
- ✔ live: Documentos has Carpeta de salida ("Descargas (predeterminado)", `Cambiar…`), Salida rápida DOCX / HTML / Texto, `Ocultar «Copiar prompt IA»`, Censo PDF Sala en el título (— / Sala 1 / Sala 2 / Sala E / Torre HU), `Exportar PDF…`. ✘ fixed: Etiqueta de ingreso hint is "Va bajo el título del PDF. FIUX es fijo." (not FIMI).
- ✔ live: Plantillas has `Administrar…` (opens Plantillas guardadas), `Restablecer en blanco`. ✘ fixed: both `Editar…` rows open inline editors (Interconsulta mode, Nota / Indicaciones tab), not `templates-modal`. See 1a.
- ✔ live: Seguridad status "Datos cifrados en este equipo / Sin bloqueo automático · Sin PIN", `Bloquear ahora`, `Bloquear tras` Nunca / 5 / 10 / 30 minutos, `Cambiar PIN…`, `Verificar` bitácora, Carpeta de datos (path + `Abrir`). ✘ fixed: `Bloquear tras` has 30 minutos; with no PIN, `Bloquear ahora` and `Cambiar PIN…` open a PIN prompt (see 1e).
- ✔ live: Aplicación shows "R+ 8.4.8", `Buscar actualizaciones…`, `Canal de actualizaciones` Estable / Pre-releases, telemetry toggle, `Reinstalar versión actual (v8.4.8)…`, `Restaurar versión seleccionada…` (select 8.4.6 ... 8.4.2), `Abrir instalador en GitHub…`. `Buscar actualizaciones…` and `Reinstalar…` showed no visible dialog (not pursued).
- ✔ live: Zona de peligro has `Borrar…` and `Ir a Respaldos primero`.
- not reachable: banner "R+ está en modo solo este equipo..." + `Activar guardia con R+ Cloud…`. The button is in the DOM; the banner is not visible live (Nube account exists). Search typing was not exercised.

## 3. Mi perfil

Modal `profile-modal` (`public/partials/layout/app-body.html:583`). Opened by header button `profile-toggle-btn` or by clicking the brand `app-brand` (`openProfileFromHeader`) (`public/js/features/profile-modal.mjs:16-45`). Disabled on mobile web (`profile-modal.mjs:17`).
Saves automatically; a chip shows "Guardando..." then "Guardado" (`profile-modal.mjs:~137-142`). `saveSettings` shows toast "Perfil guardado ✓" unless silent (`profile-save.mjs:51`).

| Block | Fields / buttons (app-body.html line) |
|---|---|
| Identity header | name `data-perfil-name`, meta "@usuario · sala" (595-596; `profile-modal.mjs:129`) |
| Cuenta Nube (602, hidden unless session expired) | text "Tu sesion expiro. Tus cambios se guardan en este equipo, pero no se comparten con tu equipo."; `Entrar a Nube →` = `openNubeLogin` (606). Shown by `cloud-sync/session-expired-prompt.mjs:7-14` |
| Modo de trabajo (615) | radio Sala / Interconsulta (`onAppModeChange`, 624-625); Servicio predeterminado (631-636, warning about short names) |
| Firma en documentos (640) | Medico tratante (select from Nube team, 644-649, plus free text), Profesor en nota (653), Grado / servicio en nota (657) |
| Equipo en el censo (664) | `Llenar desde mi equipo` (665); Profesor, R4, R2, R1, R1 (2) (668-672) |
| Footer | `Ver tutorial de inicio` = `resetAndStartOnboarding` (676) |
| Sala / rango / @usuario / admin | built by JS "same form Cuenta used to host" (`profile-modal.mjs:161`); details not read |

### Live check, Mi perfil (2026-10-05)
- ✔ live: opens from `profile-toggle-btn` and from brand `R+`. Chip "Se guarda solo". Identity header "UT / Dra. UI Test / @uitest · Sala 1".
- ✘ fixed: live block order: Sala de guardia, Equipo, Mi cuenta, Modo de trabajo, Firma en documentos, Equipo en el censo, footer.
- + live: `Sala de guardia` chips Sala 1, Sala 2, Sala E, Torre HU, Área A/Pensionistas, Interconsultas, UX, Eme. Hint "Al cambiar de sala se guarda tu perfil y pasas a la sala en Nube."
- + live: `Equipo` filter chips (Todas + rooms), team chip `Equipo Sala 1`, `+ Crear equipo`, `Tengo un código`.
- + live: `Mi cuenta` has Usuario (`@usuario en minúsculas, sin espacios.`), Nombre en guardia, `Rango clínico` select (R1 / R2 / R3 only for this user), checkbox `Privilegios de administración` (opens admin-code modal), `Guardar perfil` (submit).
- ✘ fixed: doc says it saves only automatically. Live has chip "Se guarda solo" AND a `Guardar perfil` submit in Mi cuenta.
- ✔ live: `Modo de trabajo` radios Sala / Interconsulta, `Servicio predeterminado` (value MEDICINA INTERNA, hint "Se llena solo al agregar pacientes.").
- ✘ fixed: `Firma en documentos` shows only `Médico tratante` select ("Dra. UI Test · R2" / "Otro…", hint "Elige de tu equipo en Nube."). Fields `Profesor en nota` and `Grado / servicio en nota`: not reachable (not seen, maybe behind "Otro…").
- ✔ live: `Equipo en el censo` has `Llenar desde mi equipo`, Profesor, R4, R2, R1, R1 (2).
- ✘ fixed: footer `Ver tutorial de inicio` opens the Aprender R+ hub, not an onboarding reset.
- not reachable: `Cuenta Nube` card + `Entrar a Nube →` (in DOM; hidden because session is valid).
- ✘ fixed: the doc line "Sala / rango / @usuario / admin built by JS" is now plain visible blocks: Sala de guardia, Mi cuenta.

## 4. Datos (backup, export, import, DB unlock, SQLCipher)

UI: Ajustes > Respaldos (section 2). Handlers named in `data-onclick`; implementations not read in full (`public/js/features/*backup*`, not traced).
- Export all: `exportDataBackup`. Active patient: `exportActivePatientBackup`. Many: `openExportPatientsModal`. Range: `exportRangeBackupPrompt` (settings-dropdown.html:115-140).
- Import uses hidden file inputs, JSON only (554-563): `onBackupFileChosen`, `onPatientBackupFileChosen`, `onRangeBackupFileChosen`, `onSyncBundleFileChosen`, `onMedCatalogFileChosen`.
- Auto backup: `updateAutoBackupSettingsFromUi`, `runAutoBackupNow`; pre-import copy: `restorePreimportBackupPrompt`.
- Encrypted DB export: `.db` copy "Segura para guardar fuera"; JSON copy "Sin cifrar. Solo en medios seguros." (205-218).

DB unlock (SQLCipher) - `public/js/features/db-unlock*.mjs`:
- Overlay mode text (`db-unlock-overlay.mjs:149-156`): migration "Elige una contrasena maestra (minimo 8 caracteres)"; first time "crea una contrasena maestra ... No es la contrasena de Mi Perfil"; later "Ingresa la contrasena maestra...". The master password is not the Mi perfil password and not the idle-lock PIN.
- Auto-unlock is tried first at boot (`tryAutoUnlockDb`, `db-unlock-completion.mjs:92`; `db-unlock-boot.mjs:24-31`). Boot retry delays are longer on Windows (`db-unlock-native.mjs:15-23`).
- Payload has `passphrase`, `remember`, `setup`, and a localStorage snapshot when migration is needed (`db-unlock-submit.mjs:106-112`).
- Recovery code: toggle to recovery mode (`toggleRecoveryMode`, `db-unlock-submit.mjs:62`); `submitRecoveryCode` (127). After setup, a "Guarda tu codigo de recuperacion" screen shows the code; button `Ya lo guarde, continuar` (root.html:584-590).
- Errors (`db-unlock-errors.mjs`): rate limit "Demasiados intentos fallidos. Espera unos minutos..." (40); wrong code "Codigo de recuperacion incorrecto." (51); native module missing (6-12, 34) points to Ajustes > Aplicacion > `Restaurar version estable`.
- After unlock: hydrate state, init clinical runtime, refresh onboarding, flush pending ops (`db-unlock-completion.mjs:10-68`).
- Change master password: code exists (`openChangeMasterPasswordModal`, `db-unlock-change-pass.mjs:38`; min 8 chars, new != current, lines 30-34; toast "Contrasena maestra actualizada" line 78) and is exported in `db-unlock.mjs:24,42,64`. The DOM `rpc-db-change-pass-overlay` is not in any partial and no button calls it. UI trigger: not found.
- Idle lock PIN is separate: 4-8 digits (`public/js/features/platform/offline.mjs:62-73`), hash kept in localStorage (`IDLE_LOCK_HASH_LS_KEY`, offline.mjs:3).
- Wipe: `wipeCacheConfirmed` / `wipeAllConfirmed` (`public/js/lazy-feature-routes-handlers.mjs:26`). Texts in root.html:895-948.

### Live check, Datos (2026-10-05)
- ✔ live: all export/import labels in Ajustes > Respaldos match section 4 (see Ajustes check). `Varios pacientes > Elegir…` opens "Exportar pacientes" (1e). `Exportar…` of the .db copy asks a confirm (1e).
- ✔ live: texts "Segura para guardar fuera." and "Sin cifrar. Solo en medios seguros." match.
- ✔ live: `rpc-db-change-pass-overlay` is absent from the DOM; no UI trigger for change master password.
- ✔ live: idle-lock PIN is 4 to 8 digits (prompt text confirms).
- not reachable: DB unlock overlay modes, recovery code screen, rate limit and error texts (app is already unlocked by auto-unlock). Hidden file inputs not exercised. Wipe steps 2 and 3 not run.

## 5. Nube and LAN

Entry: header button `btn-header-team-sync` opens `connection-dropdown` "Conexion · R+ Cloud" (root.html:755-777; subtitle "Red local del hospital. Conectate a la sala de guardia y administra tu equipo." (line ~81, old LAN wording still in HTML)).
Header status words (`cloud-sync/cloud-sync-header-chrome.mjs:25-32`): Todo al dia, Enviando..., Cambios en espera, Reconectando, Sin conexion Nube, Hay un problema con Nube.
Banner `lan-connection-banner` (`app-body.html:43-46`): "Sin conexion a R+ Cloud. La sincronizacion de sala puede estar limitada hasta reconectar en ⇄." with `×` = `dismissLanDisconnectBanner`.

### Signed out (`cloud-sync/panel-steps-html.mjs`)
- Login tab "Entra a tu cuenta": Usuario, Contrasena, switch "Recuerdame en este dispositivo · no en una Mac compartida", `Entrar`, links `Crear cuenta`, `¿Olvidaste tu contrasena?` (45-62).
- Register tab "Crea tu cuenta": Usuario (hint "Minusculas, sin espacios ni acentos. Sin «Dr.»."), Nombre en guardia, Contrasena, Recuerdame, `Crear cuenta` (65-80). Validation: usuario 3-32 lowercase; nombre required; password required (`panel-conexion-handlers.mjs:108-122`).
- Recover tab "Recupera tu cuenta": Usuario, Codigo de recuperacion (`R+XXXX-XXXX-XXXX`), Nueva contrasena, Confirmala, `Recuperar cuenta` (83-100). Password min 10 and must match (handler toasts, `panel-conexion-handlers.mjs:309-346`). Old code stops working; a new one is shown.
- "Tu sala" waits greyed ("Se conecta al entrar"); `Avanzado` > URL del servicio.

### Signed in (`cloud-sync/panel-conexion-views.mjs`)
Views: Conexion (status), Opciones (list), Equipo, iPad / R+ Movil, QR Internos, Cuenta, Administracion (admin only), Diagnostico Nube, Avanzado (`panel-conexion-views.mjs:~245-290`).
- Tu sala (`panel-conexion-html.mjs:128`): Codigo para invitar + `Copiar` (137-146), `Salir de la sala` (148, `handleLeaveRoom`).
- Join form (`roomActionsHtml`, `panel-conexion-html.mjs:309-318`): "Unirse a una sala del turno", Nombre de la sala (opcional), `Crear sala`, Codigo de sala (`ABC123`), `Unirse con codigo`.
- Cuenta view: `Codigo de recuperacion` = `regenerate-recovery`, `Cerrar sesion Nube` (`panel-conexion-views.mjs:186-187`).
- Recovery-code modal (`cloud-sync/recovery-modal.mjs:5-9`): title "Codigo de recuperacion", "Guarda este codigo de recuperacion. No lo volveremos a mostrar.", `Copiar`, checkbox "Lo guarde en un lugar seguro", `Continuar` (disabled until checked).
- Admin (`panel-admin-html.mjs`): `Guardar clave` (128), Resumen `Actualizar` (193), Salas: `Ver detalle`, `Cambiar codigo`, `Copiar invitacion` (288-293), Red: `Archivar`, `Eliminar...` (685-686), room detail `Cerrar detalle`, `Purgar...` (904, 1100); Usuarios/equipos: `Guardar seleccionados`, purge (`panel-admin-equipos-html.mjs:74-75`).
- Expired session: requests with a dead token get 403 `auth_required`; Mi perfil shows "Cuenta Nube" card; panel opens login once per expired token (`session-expired-prompt.mjs:1-14`, `openNubeLogin` 58-62).

### LAN / ⇄ / PIN del turno
- Field `PIN del turno (⇄)` still exists in HTML (root.html:880-883, 6 digits). Code hides it: `clinical-registration.mjs:99-100`.
- Connect functions are empty stubs: "LAN shift-pin connect retired — Nube is authority." (`clinical-registration-submit.mjs:100-102`; `clinical-onboarding-handlers.mjs:157-159`). URL params `pin`/`shiftPin` are still read for prefill (`clinical-registration.mjs:41-48`).
- Onboarding code still has legacy names: mode `'lan'` is treated like Nube (`clinical-onboarding-sync-mode.mjs:46-48`).
- "Conectar al turno" in Mi rotacion (mentioned in root.html:883): not found in code read.
- Host reconnect for LAN: not found (retired). Reconnect now = Nube websocket (see flow 3).

### Live check, Nube (2026-10-05; mock Nube at localhost:8799, test account `@uitest` created)
- ✔ live: header button `btn-header-team-sync` and Ajustes > `Nube y equipo ↗` open the panel. ✘ fixed: visible heading "Conexión guardia"; button aria says "Abrir conexión LAN y LiveSync (salas)"; the subtitle "Red local del hospital..." was not seen.
- + live: panel header stepper Internet / Sesión / Sala / En vivo with states (Conectado, Entra abajo, Sala 1, En espera).
- ✘ fixed: signed-out login is one card "Entra a tu cuenta", not tabs. Fields `Usuario` (placeholder drdemo), `Contraseña`, switch "Recuérdame en este dispositivo · no en una Mac compartida", `Entrar`, links `Crear cuenta`, `¿Olvidaste tu contraseña?`. Status "Sin sesión: Tus cambios se guardan en este equipo, pero no llegan a tu sala."
- ✔ live: register "Crea tu cuenta" with `‹ Entrar` back, Usuario (hint "Minúsculas, sin espacios ni acentos. Sin «Dr.».", id `cloud-sync-reg-user`), Nombre en guardia (hint "Así te ven en el censo y las entregas."), Contraseña, Recuérdame (hint "Luego te damos un código de recuperación. Guárdalo."), `Crear cuenta`.
- ✔ live: recover view has Usuario, Código (`R+XXXX-XXXX-XXXX`), Nueva contraseña, Confírmala, `Recuperar cuenta`, text "Te damos un código nuevo; el anterior deja de servir."
- ✔ live: "Tu sala" greyed "Se conecta al entrar"; `Avanzado` > `URL del servicio` (+ `Guardar`; live value `http://localhost:8799` in the test app).
- ✔ live: recovery-code modal after register: "Código de recuperación", "Guarda este código de recuperación. No lo volveremos a mostrar.", code, `Copiar`, checkbox "Lo guardé en un lugar seguro", `Continuar` disabled until checked.
- ✘ fixed: signed-in main view shows "Sala 1", status "Nube al día" (doc listed "Todo al dia"), avatar, name, `@uitest`, `Cerrar sesión`, join form, then a row `Equipo y administración` and a row `Detalles técnicos`.
- ✔ live: join form "Unirse a una sala del turno", `Nombre de la sala (opcional)` (placeholder "Turno Sala 1"), `Crear sala`, `Código de sala` (`ABC123`), `Unirse con código`. Join/create not run.
- ✘ fixed: `Equipo y administración` > Opciones list: iPad / R+ Móvil, Equipo, Cuenta, Administración, Sistema > Diagnóstico Nube, Avanzado. There is no separate "QR Internos" view; the iPad view has `Copiar enlace móvil (Nube)` and `Copiar QR` ("Enlace permanente ligado a tu @usuario...").
- ✔ live: Equipo view: "Estás en Equipo Sala 1", `Invitar`, INTEGRANTES, `Mi ciclo en este equipo`, `Invitar y agregar integrantes`, `Salir del equipo`, `Crear equipo`, `Tengo un código`. + live.
- ✔ live: Cuenta view: `Código de recuperación`, `Cerrar sesión Nube`.
- ✘ fixed: Administración opens for a non-admin R2 user with tabs Resumen / Salas / Pacientes / Usuarios / Registro / Zona de peligro, "Clave de sesión", `Guardar clave`, `Promover a admin`, and the note "Fuera del alcance del modo de pruebas de UI." Admin buttons listed above (`Ver detalle`, `Cambiar codigo`, `Purgar...`, ...): not reachable.
- + live: Diagnóstico Nube: "Hay problemas de sincronización", `Reintentar ahora`, status steps, "EN ESPERA DE ENVÍO", "QUÉ PUEDES HACER" (3 steps), `Copiar informe`, "PROBLEMAS DETECTADOS" (live: "Sync local no enlazado", "Sync no está activo", each `Cómo arreglar`), "HERRAMIENTAS DE REPARACIÓN" `Forzar` / `Reenviar`, `Informe técnico (soporte)`. The mock has no sync engine, so these errors are expected here.
- not reachable: "Tu sala" invite code + `Salir de la sala` (no sala joined). Banner `lan-connection-banner` is in the DOM (`×`) but hidden. Header status words other than "Nube al día" and "Reconectando". LAN / PIN del turno field not checked.

## 6. First run, onboarding, unlock screens

- Gate order in `showMainClinicalOnboardingBody` (`public/js/features/clinical-onboarding-main.mjs:338`): sync-mode choice > reload teams > resume stored Nube token > DB unlock (`ensureOnboardingDbUnlockedAndFlushed`, 276) > clinical panel session (`ensureOnboardingPanelSession`, 301) > registration form (`renderOnboardingRegistrationForm`, 315).
- Screen 1 "¿Como usaras R+?" (`clinical-onboarding-sync-mode.mjs:26-28`): 3 cards (`clinical-onboarding-shell.mjs:137-148`): `Guardia con R+ Cloud`, `Ya tengo cuenta`, `Solo este equipo`. Shown when not registered, no team, no trusted Nube remember-me, no mode chosen (`clinical-onboarding-gates.mjs:66-74`).
- Screen "Preparando R+" with progress ("Preparando almacenamiento local...", "Cargando formulario...") (`clinical-onboarding-main.mjs:276-330`). If DB or session fails, a session-block HTML with recovery is shown (`buildOnboardingSessionBlockHtml`, 136).
- Profile form, 3 sub-steps (`clinical-onboarding-render.mjs:136-175`): Usuario *, Nombre en guardia *, Rango + Rotacion * ("— Seleccionar —"); buttons `Atras`, `Guardar perfil`; links `Ya tengo cuenta Nube`, `Recuperar mi usuario`, `Cambiar modo` (179-181). Nube password field is added by `clinical-onboarding-nube.mjs`.
- "Ya tengo cuenta": Usuario (@usuario) *, Contrasena Nube *, Recuerdame (hint "No uses esto en una Mac compartida."), Rotacion *; `Entrar y sincronizar`, `Cambiar modo` (`clinical-onboarding-existing-login.mjs:61-89`).
- "Solo este equipo": confirm screen with `Entrar a R+` and `Cambiar modo` (`clinical-onboarding-render.mjs:195-196`). Local user id is a `local_<tail>` handle (`clinical-onboarding-sync-mode.mjs:21`).
- Onboarding done when joined a team, or profile ready and (team picked / elevated rank / local only) (`clinical-onboarding-gates.mjs:245-264`). R4/Admin need no team (`clinical-onboarding-gates.mjs:59-64`).
- Product tutorial: `intro-modal` "Bienvenido a R+" (header.html:147).

### Live check, first run (2026-10-05)
- not reachable: every screen in this section. The test app was already onboarded when the walk began (user `uitest`, Sala 1, rank R2, 9 synthetic patients seeded, DB unlocked by auto-unlock), and the task forbids relaunch or wipe. Sync-mode cards, "Preparando R+", the profile sub-steps, "Ya tengo cuenta" and "Solo este equipo" were not shown.
- ✔ live: `onboarding-intro-backdrop` ("Bienvenido a R+") exists in the DOM with `Omitir tutorial`, `Empezar · Sala`, `Empezar · Interconsulta`; not reachable live.
- ✔ live: `Ver tutorial de inicio` (Mi perfil) leads to Aprender R+ (see 1d).

## 7. Flows

### Flow 1: first run -> unlock -> register @usuario
```
App start
  -> DB gate: tryAutoUnlockDb (db-unlock-completion.mjs:92)
       ok -> continue
       fail -> rpc-db-unlock-overlay
            first time: "Protege tus datos clinicos" -> master password + confirm
                        -> "Crear contrasena y continuar"
                        -> recovery code screen -> "Ya lo guarde, continuar"
            later:      "Desbloquear base de datos" -> "Desbloquear"
            forgot:     toggle recovery -> "Codigo de recuperacion" -> "Recuperar acceso"
            native missing: "Instalacion incompleta" (restore stable version)
  -> needsClinicalSyncModeChoice? (gates:66)
       yes -> "¿Como usaras R+?"
            Solo este equipo -> "Entrar a R+" (local profile, no Nube)
            Ya tengo cuenta  -> Usuario + Contrasena Nube + Rotacion -> "Entrar y sincronizar"
            Guardia con R+ Cloud -> profile form
  -> profile form: Usuario * -> Nombre en guardia * -> Rango + Rotacion *
       "Guardar perfil" (clinical-onboarding-handlers.mjs ~200-260)
         1. claimUsernameIfNeeded (dbClinicalUsernameClaim)
              "ya esta en uso" -> tryResumeExistingUsername
         2. upsertClinicalProfile
         3. finishOnboardingCloud: if sala is a cloud sala ->
              registerCloudDuringOnboarding (Nube account, remember=true)
              error -> inline error, stay on form
         4. refreshClinicalUserProfile, refresh shell, toast "Perfil guardado."
  -> resident without team: Mi rotacion opens in background to pick a team
```

### Flow 2: join sala via Nube
```
Header ⇄ -> "Conexion · R+ Cloud"
  signed out -> Entrar (or Crear cuenta -> recovery-code modal -> Continuar)
     -> afterAuthSuccess (panel-conexion-handlers.mjs:134):
          bridge identity to local + tryAutoEnsureTurnRoom (auto join of this month's sala)
          backfill room key for owner
          hydrate teams; if no team -> open Mi rotacion
  manual join -> field "Codigo de sala" -> "Unirse con codigo"
     -> empty code: toast "Ingresa el codigo de sala."
     -> joinRoomByCode: flush outbox, joinRoom API, persist room (revision 0 = full pull),
        render connected, load room key
          key fails -> toast "Unido, pero no se pudo cargar la llave de cifrado de la sala."
     -> not_found -> "No hay ninguna sala con ese codigo. Revisalo; si un admin lo cambio, pide el nuevo."
     -> ok -> toast "Unido a la sala <code>."
  create: "Crear sala" (name optional) -> toast "Sala creada: <code>"
  leave: "Salir de la sala" -> remembers left sala+month so auto ensure-turn does not re-add
         (panel-conexion-handlers.mjs:429-468; ensure-turn-room.mjs)
```

### Flow 3: reconnect a lost host
LAN host reconnect is retired (section 5). The live equivalent is Nube reconnect:
```
Connection drops
  -> WebSocket onclose / liveness watchdog (room-sync-ws-internals.mjs:7-9,144)
  -> backoff retry: 1 s start, x1.5 each time, max 30 s (room-sync-ws-internals.mjs:3-4,246-252)
  -> header state "Reconectando" (amber) / "Sin conexion Nube" (red)
  -> banner "Sin conexion a R+ Cloud ... reconectar en ⇄." (dismiss with ×)
  -> queued ops wait: "Se enviara al reconectar." (sync-runtime-cycle.mjs:267)
  -> socket opens: delay reset to 1 s (room-sync-ws-internals.mjs:234); revision gap -> pull
Token dead (403 auth_required)
  -> sync stops, Mi perfil shows "Cuenta Nube" card -> "Entrar a Nube →" -> login form
       (session-expired-prompt.mjs:58-62)
Manual: ⇄ panel -> "Sincronizar ahora" (panel-conexion-html.mjs:253)
```

## 8. Gaps
- Openers for many modals (nuevo paciente, entrega, exp-datos, soap, equipos-lista, directory) not traced.
- Contents of `soap-modal`, `lab-display-prefs`, `lab-diagrams`, `clinical-teams` bodies not read.
- Datos handlers (`exportDataBackup` etc.) implementations not read.
- Master-password change UI trigger not found. "Conectar al turno" not found. Autostart of Nube sync (`cloud-sync/autostart.mjs`) not read.
- Line numbers marked `~` are approximate.

## 9. Live verification (2026-10-05)

Method: isolated test window over CDP (fresh userData, mock Nube, synthetic roster). Marks used above: `✔ live` matches, `✘ fixed` text corrected, `not reachable` cannot show, `+ live` found live but missing.
Counts of marks (before this section): ✔ 66, ✘ 32, not reachable 45, + 18. A row with two marks counts in both.
Limit: the app was already onboarded and unlocked, so first run, unlock and onboarding (sections 6, 7 flow 1) could not be walked. Many modal openers need patient data or a joined sala.

Biggest corrections:
1. Ajustes is a left-nav page (TÚ / DATOS / EQUIPO Y APP + Zona de peligro), not accordions, and it has `Nube y equipo ↗` that opens the Conexión panel.
2. Ajustes labels changed: "Tamaño de texto" (Normal / Grande / Más grande), "Modo de vista", "Animaciones"; Auto-respaldo and Seguridad details differ (30 minutos, "FIUX es fijo").
3. `Editar...` for note and indication formats no longer opens `templates-modal`. It switches to Interconsulta mode and edits inline. `templates-modal` is dead.
4. Mi perfil blocks differ: Sala de guardia, Equipo, Mi cuenta (with `Guardar perfil`), then Modo de trabajo, Firma, Equipo en el censo. `Ver tutorial de inicio` opens Aprender R+.
5. Conexión panel heading is "Conexión guardia", login/register/recover are one card with links (not tabs), there is no "QR Internos" view, and status reads "Nube al día".
6. New nameless UI: command palette (header search), pistas modals, prompt and confirm dialogs, "Exportar pacientes", Ayuda menu (Atajos / Aprender R+). `unified-search` has no trigger. `intro-modal` id is really `onboarding-intro-backdrop`.
