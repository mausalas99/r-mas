/** Guided tours, neo companion, mini tours, demo patient hooks. */
import {
  getTourSteps,
  getTourTarget,
  stepRequiresUserAction,
} from '../../tour-targets.mjs';
import {
  getChapterProgressLabel,
  getChapterForStep,
  getFirstStepIdForChapter,
  getNeoCompanionSteps,
} from '../../onboarding-curriculum.mjs';
import {
  loadTourProgress,
  saveTourProgress,
  clearTourProgress,
} from '../../onboarding-progress.mjs';
import { syncGuidedTourContext } from '../../tour-guards.mjs';
import {
  isPresentationModeActive,
  startPresentationMode,
  stopPresentationMode,
} from '../../presentation-mode.mjs';
import { applyAppModeSwitchEffects } from '../profile.mjs';
import { LAB_BULK_PATIENT_SEPARATOR } from '../../lab-bulk-paste.mjs';
import { buildTourDemoListadoProblemas } from '../../tour-demo-listado-problemas.mjs';
import {
  buildTourMonitoreoHistorial,
  getTourRegistroFormSample,
} from '../../tour-demo-monitoreo.mjs';
import { buildTourDemoDates, buildTourDemoLabPasteBoth } from '../../tour-demo-dates.mjs';
import { seedTourDemoTodos, clearTourDemoTodos } from '../../tour-demo-todos.mjs';
import { buildTourDemoEventualidades } from '../../tour-demo-eventualidades.mjs';
import { buildBulkLabPreview, extractLabPatientFromBulkBlock } from '../../lab-bulk-paste.mjs';
import {
  DEMO_PATIENT_ID,
  DEMO_PATIENT_ID_2,
  DEMO_REGISTRO,
  DEMO_REGISTRO_2,
  findTourDemoPatientByRegistro,
  isTourDemoPatientId,
  registerTourDemoPatientHooks,
  resolveTourDemoPatientId,
  tourDemoLabCompleteForTour,
  tourDemoPatientsBothInCensus,
} from '../../tour-demo-patient.mjs';
import {
  renderEstadoActualPanel,
  applyEstadoActualParsedToForm,
  toDatetimeLocalValue,
  invalidateEaPanelCache,
} from '../estado-actual-panel.mjs';
import {
  closeEstadoActualRegistroModal,
  openEstadoActualRegistroModal,
} from '../estado-actual-registro-modal.mjs';
import { isMobileWeb } from '../../mobile-web.mjs';
import { getUiDensity, setUiDensity } from '../chrome.mjs';
import {
  openConnectionDropdown,
  closeConnectionDropdown,
} from '../lan-sync.mjs';
import { renderPatientList, selectPatient } from '../patients.mjs';
import { renderNoteForm, renderIndicaForm } from '../notes-indicaciones.mjs';
import { renderPaseBoard } from '../pase-board.mjs';
import { setRoundOverviewMode } from '../patients.mjs';
import { renderRoundOverviewPanels } from '../patients.mjs';
import { renderLabHistoryPanel } from '../lab-panel.mjs';
import { limpiarReporte } from '../lab-panel.mjs';
import { closeLabSomeTablesModal } from '../lab-some-tables-modal.mjs';
import { closeTendGroupModal } from '../tendencias.mjs';
import { closeSesionIngresoTrendsSendModal } from '../sesion-ingreso-trends-send-modal.mjs';
import { closeSOAPModal } from '../soap-estado.mjs';
import { procesarLabs } from '../../labs.js';
import { extractParsedValues } from '../diagrams-parse.mjs';
import {
  patients,
  notes,
  indicaciones,
  labHistory,
  listadoProblemas,
  medRecetaByPatient,
  medNotaSelectionByPatient,
  saveState,
  setPatients,
} from '../../app-state.mjs';
import { getSettingsHelpRuntime } from './runtime.mjs';
import { settingsHelpBridge } from './bridges.mjs';
import {
  closeSettingsDropdown,
  toggleSettingsDropdown,
  ensureSettingsDropdownOpen,
  expandSettingsAccordionBackupSync,
} from './settings-dropdown.mjs';

import {
  getGuidedTourSteps,
  applyTourTargetForStep,
  clearAllTourSpotlights,
  syncTourDockPlacement,
  syncTourSoapButtonHighlight,
  syncTourActionNextButton,
  guidedTourStepIndex,
  persistTourProgressDebounced,
  showTourDock,
  hideTourDock,
  resetTourUiBeforeResume,
  hideTourIntroModal,
  markGuidedTourVersionDone,
  closeLabBulkTourHintModal,
  openLabBulkTourHintModal,
} from './tour-engine.mjs';
import {
  purgeTourDemoPatientsFromState,
  applyTourDemoPatientBundle,
  ensureTourPrimaryDemoPatientActive,
} from './tour-demo-seed.mjs';

import { tourState, publishTourGuardContext, GUIDED_TOUR_LS_KEY } from './tour-state.mjs';
import { tourBridge } from './tour-bridge.mjs';

const rt = getSettingsHelpRuntime();


/** Tour step render and onboarding flow */
function renderTourStep() {
  if (!tourState.guidedTourActive) return;
  var badge = document.getElementById('tour-step-badge');
  var bodyEl = document.getElementById('tour-dock-body');
  var nextBtn = document.getElementById('tour-btn-next');
  var prevBtn = document.getElementById('tour-btn-prev');
  var steps = getGuidedTourSteps();
  var total = steps.length;
  var idx = guidedTourStepIndex() + 1;
  var branchLabel = tourState.guidedTourBranch === 'interconsulta' ? 'Interconsulta' : 'Sala';
  var tourBranch = tourState.guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala';
  var prog = getChapterProgressLabel(tourState.tourStepId, tourBranch);
  var sub = prog.isCompanion
    ? 'Extensión · Neo · Paso ' + prog.stepInChapter + ' de ' + prog.chapterSteps
    : 'Cap. ' + prog.chapterIndex + '/' + prog.chapterCount + ' · ' + prog.chapterTitle
      + ' · Paso ' + prog.stepInChapter + '/' + prog.chapterSteps;
  badge.textContent = 'Paso ' + idx + ' de ' + total + ' · ' + branchLabel + (sub ? ' · ' + sub : '');
  var neoOptionalLine =
    '<p style="margin:0 0 8px;font-size:13px;color:var(--text-muted);">R+ funciona sin Neo; módulo opcional.</p>';
  nextBtn.style.display = '';
  nextBtn.disabled = false;

  switch (tourState.tourStepId) {
    case 'map_sidebar':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">La <strong>columna izquierda</strong> es tu censo. En este tour <strong>no hay pacientes precargados</strong>: registrarás a <strong>DEMO PÉREZ</strong> al procesar el laboratorio de ejemplo.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'map_tabs':
      bodyEl.innerHTML =
        getUiDensity() !== 'normal'
          ? '<p style="margin:0;line-height:1.5;">En <strong>Pase</strong> el centro es un <strong>resumen</strong> del paciente (pendientes, laboratorio, cultivos, medicamentos). Pulsa el título de cada bloque o usa <strong>Ctrl/⌘ + 1…4</strong> para abrir el detalle en vista <strong>Normal</strong>.</p>'
          : tourState.guidedTourBranch === 'interconsulta'
            ? '<p style="margin:0;line-height:1.5;">Arriba: <strong>Laboratorio</strong>, <strong>Expediente</strong>, <strong>Medicamentos</strong>, <strong>Agenda</strong>. En <strong>Expediente</strong> verás las pestañas internas en el siguiente paso.</p>'
            : '<p style="margin:0;line-height:1.5;">Arriba: <strong>Laboratorio</strong>, <strong>Expediente</strong>, <strong>Medicamentos</strong> y <strong>Agenda</strong> (procedimientos del turno). En <strong>Expediente</strong>: <strong>Clínico</strong> (Historia → Estado actual → Eventualidades), <strong>Resultados</strong> (tendencias) y <strong>Salida</strong> (Listado, <strong>VPO</strong>, <strong>Receta HU</strong>).</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'map_lab_teaser':
      bodyEl.innerHTML =
        tourState.guidedTourBranch === 'interconsulta'
          ? '<p style="margin:0;line-height:1.5;">El cuadro ya trae <strong>DEMO PÉREZ</strong> (dos días) y <strong>DEMO GARCÍA</strong> con el separador <strong>--- PACIENTE ---</strong>. Revisa el texto detrás y pulsa <strong>Siguiente</strong>.</p>'
          : '<p style="margin:0;line-height:1.5;">El cuadro ya trae <strong>DEMO PÉREZ</strong> (dos días) y <strong>DEMO GARCÍA</strong>. En el siguiente paso pulsa <strong>Procesar</strong>: verás la <strong>vista previa multi-paciente</strong> y podrás dar de alta a cada uno en el censo.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'lab_parse':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Pulsa <strong>Procesar</strong>: verás la tabla con <strong>dos pacientes</strong> (PÉREZ y GARCÍA). En cada fila sin registrar usa <strong>Agregar paciente</strong>; el modal trae <strong>servicio</strong> y, en el tour, <strong>cuarto y cama</strong> sugeridos (revisa y ajusta si hace falta).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">No hay <strong>Siguiente</strong> hasta que ambos tengan laboratorio en historial.</p>';
      nextBtn.style.display = 'none';
      break;
    case 'lab_view':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Revisa diagramas y tabla de resultados. En el historial: <strong>Sincronizar</strong> quita duplicados; <strong>Consolidar</strong> junta envíos del mismo día (mismo tipo de dato).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Siguiente</strong> para continuar el tour.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_casiopea_lab':
      bodyEl.innerHTML =
        neoOptionalLine +
        '<p style="margin:0;line-height:1.5;">Abre <strong>Tablas SOME</strong> (botón resaltado). Dentro verás <strong>Enviar a Neo</strong>: desde ahí mandas estudios al paso <strong>Paraclínicos</strong> en la app Neo (instalada aparte en este equipo).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">En el tutorial el envío no abre Neo; fuera del tour sí. Pulsa <strong>Siguiente</strong> cuando hayas visto el botón.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_manejo':
      bodyEl.innerHTML =
        (tourState.guidedTourBranch === 'interconsulta'
          ? '<p style="margin:0;line-height:1.5;">En <strong>Expediente → Clínico → Manejo</strong> (pestaña resaltada) hay cuatro sub-pestañas: <strong>Electrolitos</strong>, <strong>Infusiones</strong>, <strong>ATB</strong> y <strong>CAD/EHH</strong>.</p>'
          : '<p style="margin:0;line-height:1.5;">En <strong>Sala</strong>, <strong>Expediente → Clínico → Manejo</strong> (segmento resaltado) con las cuatro sub-pestañas: <strong>Electrolitos</strong>, <strong>Infusiones</strong>, <strong>ATB</strong> y <strong>CAD/EHH</strong>.</p>') +
        '<p style="margin:10px 0 0;line-height:1.5;">Tras procesar laboratorios, <strong>Electrolitos</strong> sugiere correcciones con dosis, dilución y vía; <strong>Infusiones</strong> y <strong>ATB</strong> ofrecen catálogos con texto <strong>SOME</strong> copiable; <strong>CAD/EHH</strong> lee BH/QS/gasometría para el checklist ADA.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Peso, talla y vía se toman del bloque colapsable <strong>Datos del paciente</strong> en la pestaña <strong>Paciente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'ic_expediente_tabs':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En <strong>Interconsulta</strong>, el expediente se agrupa en cuatro pestañas: <strong>Paciente</strong> (datos colapsables + pendientes), <strong>Clínico</strong> (Nota, Indicaciones), <strong>Resultados</strong> (Tendencias, Cultivos) y <strong>Salida</strong> (Receta HU en PDF).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);"><strong>Receta HU</strong> exporta el PDF oficial 000-061-R-06-12. <strong>Nota</strong> e <strong>Indicaciones</strong> van a Word (.docx).</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_expediente_tabs':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En <strong>Sala</strong>, el expediente tiene cuatro pestañas: <strong>Paciente</strong>, <strong>Clínico</strong>, <strong>Resultados</strong> y <strong>Salida</strong>.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);"><strong>Clínico</strong>: Historia Clínica → <strong>Estado actual</strong> → Eventualidades. <strong>Resultados</strong>: tendencias. <strong>Salida</strong>: Listado, <strong>VPO</strong> y <strong>Receta HU</strong>. Peso/talla en <strong>Paciente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'historia_clinica':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;"><strong>Expediente → Clínico → Historia Clínica</strong>: ingreso institucional en <strong>3 pasos</strong> (identificación, antecedentes APP/AHF/APNP/IPAS, padecimiento). Cambia a <strong>Lectura</strong> para ver el texto compilado y <strong>Copiar</strong>.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Solo en <strong>Sala</strong>. En sala en vivo (⇄) se sincroniza por paciente con el anfitrión.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'ic_nota':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Genera la <strong>Nota (.docx)</strong> desde el botón correspondiente (motor nativo en Node; no requiere Python). Si el servidor local falla, puedes <strong>Omitir</strong> el tutorial.</p>';
      nextBtn.style.display = 'none';
      break;
    case 'ic_indica':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Exporta las <strong>Indicaciones (.docx)</strong> para entrega o impresión (mismo generador nativo que la Nota).</p>';
      nextBtn.style.display = 'none';
      break;
    case 'ic_exports':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En <strong>Ajustes (⚙)</strong>: carpeta de documentos, formato de <strong>salida rápida</strong>, respaldos y sync. En <strong>Laboratorio → duplicados</strong> puedes revisar todos los pacientes.</p>' +
        (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function'
          ? '<p style="margin:10px 0 0;font-size:12px;color:var(--text-muted);">Escritorio: <strong>⇄</strong> junto a Ajustes abre LAN; sync entre equipos en <strong>Respaldos, sync y recuperación</strong>.</p>'
          : '');
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_tend':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En <strong>Expediente → Tendencias</strong> ves mini-gráficas cuando hay varios laboratorios en el tiempo.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_tend_chart':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Pulsa <strong>Gráfica</strong> en un estudio (p. ej. biometría) para ver tendencias agrupadas y una tabla copiable.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Cierra con clic fuera de la ventana o <strong>Esc</strong>. Es opcional en el demo: <strong>Siguiente</strong> para continuar.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_casiopea_trends':
      bodyEl.innerHTML =
        neoOptionalLine +
        '<p style="margin:0;line-height:1.5;">Con varios laboratorios en el tiempo, <strong>Enviar a Neo</strong> (barra de Tendencias) manda gráficas agrupadas al mismo flujo de paraclínicos.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Puedes abrir el modal para ver la selección; confirmar no envía datos durante el tutorial. <strong>Siguiente</strong> para continuar.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_soap':
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px;line-height:1.5;"><strong>Expediente → Nota</strong>: en la tarjeta verde de evolución, el botón <strong>Plantilla SOAP</strong> está arriba a la derecha del encabezado verde (lleva resaltado).</p>' +
        '<p style="margin:0;font-size:13px;color:var(--text-muted);">Ábrelo e inserta en evolución cuando quieras.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_med':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Pega el bloque TSV del hospital y pulsa <strong>Receta</strong>. Marca filas para <strong>SOAP</strong> o <strong>Tratamiento</strong>; el demo ya trae dos fármacos de ejemplo.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'profile':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;"><strong>Mi Perfil</strong> (nombre arriba): médico, plantillas y valores por defecto. <strong>Ajustes</strong>: carpeta, tema, respaldos y ayuda. <strong>Siguiente</strong>: sincronización en equipo (⇄) y versión móvil.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'servicio_default':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Escribe tu <strong>Servicio (Sala)</strong> en Mi Perfil (nombre completo, sin abreviaturas) y sal del campo para guardar. Luego <strong>Siguiente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'estado_actual':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En <strong>Clínico → Estado actual</strong> el <strong>snapshot</strong> resume el turno (SV, glu, I/O, medicamentos). Abajo, las <strong>gráficas</strong> muestran tendencias por familia (hemodinámico, respiratorio, metabólico) con puntos alterados resaltados.</p>' +
        '<p style="margin:10px 0 0;line-height:1.5;">El historial de mediciones y el texto compilado para la nota están en esta misma pestaña. El demo trae tomas de <strong>hoy</strong> (TM, TV, TN).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Siguiente</strong> para practicar un <strong>registro manual</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'estado_actual_registro':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Modal <strong>Registrar medición</strong>: <strong>signos vitales</strong> (varias capas por turno), <strong>glucometrías</strong> y bomba de insulina, <strong>I/O</strong> y evacuaciones, más campos de soporte y dieta.</p>' +
        '<p style="margin:10px 0 0;line-height:1.5;">El ejemplo trae turno matutino precargado. Revisa y pulsa <strong>Registrar</strong>; el tour te guiará por el panel actualizado.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Sin <strong>Siguiente</strong> hasta registrar.</p>';
      nextBtn.style.display = 'none';
      break;
    case 'estado_actual_snapshot':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Tras registrar, el <strong>snapshot</strong> (arriba) resume el turno actual: signos vitales, glucometrías, balance hídrico, medicamentos y alertas.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Compara con lo que acabas de capturar. <strong>Siguiente</strong>: gráficas de tendencia.</p>';
      nextBtn.textContent = 'Siguiente';
      nextBtn.style.display = '';
      break;
    case 'estado_actual_charts':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Las <strong>gráficas</strong> agrupan series por familia (hemodinámico, respiratorio, metabólico, etc.). Los puntos fuera de rango se resaltan para lectura rápida en guardia.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Desplázate si hace falta. <strong>Siguiente</strong>: historial y texto para la nota.</p>';
      nextBtn.textContent = 'Siguiente';
      nextBtn.style.display = '';
      break;
    case 'estado_actual_historial':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">El <strong>historial</strong> lista cada medición con fecha y turno; abajo, el <strong>texto compilado</strong> se puede copiar a la evolución o exportar.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);"><strong>Siguiente</strong>: <strong>Eventualidades</strong> (línea de tiempo del ingreso).</p>';
      nextBtn.textContent = 'Siguiente';
      nextBtn.style.display = '';
      break;
    case 'eventualidades':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;"><strong>Eventualidades</strong> es la línea de tiempo del ingreso: evolución subjetiva y procedimientos por día. El demo trae <strong>tres días</strong> de notas breves.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Puedes editar, agregar o borrar entradas. Pulsa <strong>Siguiente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'listado_problemas':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;"><strong>Expediente → Salida → Listado</strong>: exporta problemas activos e inactivos a Word (título + incisos <strong>A) CLÍNICA</strong>, <strong>B) EXPLORACIÓN</strong>, etc.).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">El demo trae un ejemplo. Pulsa <strong>Generar Listado</strong> (resaltado) o <strong>Siguiente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_vpo':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;"><strong>Expediente → Salida → VPO</strong>: documenta escalas de riesgo (ASA, RCRI, Gupta, ARISCAT, Caprini) con el resultado que obtengas en tu calculadora; EKG/Rx editables y texto copiable. Solo en <strong>Sala</strong>.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Completa o revisa los campos resaltados y pulsa <strong>Siguiente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_receta_hu':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;"><strong>Expediente → Salida → Receta HU</strong>: receta médica en formato oficial <strong>000-061-R-06-12</strong> (PDF). Medicamentos, estudios y cuidados; botón <strong>Exportar PDF</strong> cuando esté listo.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">En el tutorial no hace falta exportar; <strong>Siguiente</strong> para la <strong>Agenda</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_agenda':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">La pestaña <strong>Agenda</strong> (arriba) concentra <strong>procedimientos programados</strong> del servicio: cirugías, estudios y pendientes del turno, enlazados al paciente cuando aplica.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Con <strong>⇄ LiveSync</strong> la agenda se comparte en la sala. <strong>Siguiente</strong>: sincronización en equipo.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'livesync_desktop':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">El icono <strong>⇄</strong> (junto a Ajustes) abre la sala en vivo: en escritorio se activa la red del turno y luego <strong>creas una sala</strong> o <strong>te unes</strong> a una existente. En iPad o otra Mac pegas el enlace de invitación. Ahí se sincronizan pacientes, laboratorios, agenda y pendientes entre las R+ del equipo.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Los respaldos JSON manuales siguen en Ajustes → Respaldos, sync y recuperación.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'livesync_mobile':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En ⇄ usa <strong>Copiar enlace móvil</strong>. En iPad o teléfono (misma Wi‑Fi) abre ese enlace en Safari: verás <strong>la misma interfaz R+</strong> (pacientes, laboratorio, expediente, medicamentos, agenda), sin botones de Word.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">El Mac anfitrión debe tener R+ abierto. En móvil elige la <strong>misma sala LiveSync</strong> que el equipo de escritorio.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'wrap':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Listo. Repite el tutorial desde <strong>Mi Perfil</strong> o <strong>Ajustes</strong>. Para el equipo en vivo usa <strong>⇄</strong> y, si hace falta, el enlace móvil.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);"><strong>Modo Pase</strong> (resumen de ronda): prueba el atajo <strong>' +
        (navigator.platform && /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl') +
        '+P</strong> o <strong>Ajustes → Modo de vista → Pase</strong> cuando quieras ver pendientes, labs y meds en una sola columna.</p>';
      nextBtn.textContent = 'Finalizar';
      break;
    default:
      hideTourDock();
  }
  // Si el paso requiere acción del usuario en un botón concreto,
  // ocultamos "Siguiente" para que el avance venga del propio botón.
  if (stepRequiresUserAction(tourState.tourStepId) && tourState.tourStepId !== 'servicio_default') {
    nextBtn.style.display = 'none';
  }
  syncTourDockPlacement();
  syncTourSoapButtonHighlight();
  syncTourActionNextButton();
  if (prevBtn) prevBtn.disabled = guidedTourStepIndex() <= 0;
}

function guidedTourClickPrev() {
  if (!tourState.guidedTourActive || tourState.miniTourActive) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourState.tourStepId);
  if (i <= 0) return;
  clearAllTourSpotlights();
  tourState.tourStepId = steps[i - 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourState.tourStepId);
  renderTourStep();
  persistTourProgressDebounced();
}

function guidedTourPause() {
  if (!tourState.guidedTourActive) return;
  var branch = tourState.guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala';
  var ch = getChapterForStep(tourState.tourStepId, branch);
  saveTourProgress({
    branch: branch,
    stepId: tourState.tourStepId,
    chapterId: ch.id,
    mode: tourState.guidedTourMode,
  });
  tourState.guidedTourActive = false;
  publishTourGuardContext();
  hideTourDock();
  rt.showToast('Tutorial pausado. Continúa desde Aprender R+.', 'info');
  syncLearnHubContinueVisibility();
}

export function resumeGuidedTourFromProgress() {
  var p = loadTourProgress();
  if (!p) return false;
  tourState.guidedTourBranch = p.branch === 'interconsulta' ? 'interconsulta' : 'sala';
  tourState.guidedTourMode = p.mode === 'neo' ? 'neo' : 'base';
  resetTourUiBeforeResume();
  startOnboarding(tourState.guidedTourBranch, { resumeStepId: p.stepId, skipIntro: true });
  return true;
}

export function startNeoCompanionTour(startStepId) {
  if (tourState.guidedTourActive) {
    rt.showToast('Finaliza el tutorial actual primero.', 'error');
    return;
  }
  tourState.guidedTourMode = 'neo';
  tourState.guidedTourBranch = 'sala';
  startOnboarding('sala', { resumeStepId: startStepId || 'sala_casiopea_lab', skipIntro: true });
}

function guidedTourClickNext() {
  if (tourState.miniTourActive) { tourBridge.miniTourNext(); return; }
  if (!tourState.guidedTourActive) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourState.tourStepId);
  if (i < 0) return;
  if (tourState.tourStepId === 'wrap') {
    completeGuidedTourWithCelebration();
    return;
  }
  if (tourState.tourStepId === 'servicio_default' && tourState.guidedTourMode === 'base' && tourState.guidedTourBranch !== 'interconsulta') {
    rt.showToast('Listo: pacientes demo con laboratorio en R+.', 'success');
  }
  if (tourState.tourStepId === 'sala_casiopea_lab') {
    closeLabSomeTablesModal();
  }
  if (tourState.tourStepId === 'sala_casiopea_trends') {
    closeSesionIngresoTrendsSendModal();
  }
  if (tourState.tourStepId === 'lab_bulk_separator') {
    closeLabBulkTourHintModal();
  }
  if (tourState.tourStepId === 'estado_actual' || tourState.tourStepId === 'estado_actual_registro') {
    closeSOAPModal();
  }
  if (i + 1 >= steps.length) {
    if (tourState.guidedTourMode === 'neo') completeGuidedTourWithCelebration();
    return;
  }
  clearAllTourSpotlights();
  tourState.tourStepId = steps[i + 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourState.tourStepId);
  renderTourStep();
  persistTourProgressDebounced();
}

// Avance automático cuando el usuario ejecuta una acción real
// (Procesar, Copiar resultados, Generar Nota/Indicaciones, etc.).
export function getGuidedTourContext() {
  return { active: tourState.guidedTourActive, stepId: tourState.tourStepId };
}

export function guidedTourAdvanceAfter(actionStep) {
  if (!tourState.guidedTourActive || tourState.tourStepId !== actionStep) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(actionStep);
  if (i < 0 || i + 1 >= steps.length) return;
  clearAllTourSpotlights();
  tourState.tourStepId = steps[i + 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourState.tourStepId);
  renderTourStep();
  publishTourGuardContext();
  persistTourProgressDebounced();
  if (actionStep === 'lab_parse') syncTourActionNextButton();
}
function guidedTourAdvanceAfterNotaGenerated() {
  guidedTourAdvanceAfter('ic_nota');
}
function guidedTourAdvanceAfterIndicaGenerated() {
  guidedTourAdvanceAfter('ic_indica');
}

function completeGuidedTourWithCelebration() {
  clearTourSoapButtonHighlight();
  clearTourProgress();
  markGuidedTourVersionDone();
  tourState.guidedTourActive = false;
  tourState.tourStepId = null;
  tourState.guidedTourBranch = null;
  tourState.guidedTourMode = 'base';
  publishTourGuardContext();
  hideTourDock();
  rt.launchConfetti();
  destroyDemoAndClose();
  rt.showToast('Tutorial completado', 'success');
  syncLearnHubContinueVisibility();
}

function skipGuidedTour() {
  if (tourState.miniTourActive) { tourBridge.endMiniTour(); return; }
  clearTourSoapButtonHighlight();
  clearTourProgress();
  markGuidedTourVersionDone();
  tourState.guidedTourActive = false;
  tourState.tourStepId = null;
  tourState.guidedTourBranch = null;
  tourState.guidedTourMode = 'base';
  publishTourGuardContext();
  hideTourDock();
  destroyDemoAndClose();
  syncLearnHubContinueVisibility();
}

function startOnboarding(branch, opts) {
  opts = opts || {};
  if (opts.resumeStepId) resetTourUiBeforeResume();
  tourState.guidedTourBranch = branch === 'interconsulta' ? 'interconsulta' : 'sala';
  setUiDensity('normal');
  // Alinear el modo de la app con la rama del tutorial. Si el usuario
  // elige "Interconsulta" pero la app está en Sala, los pasos de
  // ic_nota / ic_indica apuntarían a una pestaña oculta. Cambiamos el
  // modo y refrescamos la UI; el usuario puede volver a Sala desde Mi
  // Perfil cuando termine.
  var st = rt.getSettings();
  var prevMode = st.appMode;
  st.appMode = tourState.guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala';
  if (st.appMode !== prevMode) {
    try { localStorage.setItem('rpc-settings', JSON.stringify(st)); } catch (e) {}
    applyAppModeSwitchEffects();
    rt.renderEstadoActualBar();
  }
  tourState.tourDemoLabSessionProcessed = false;
  purgeTourDemoPatientsFromState();
  tourState.guidedTourActive = true;
  var steps = getGuidedTourSteps();
  var resumeId = opts.resumeStepId;
  if (resumeId && steps.indexOf(resumeId) >= 0) {
    tourState.tourStepId = resumeId;
  } else {
    tourState.tourStepId = steps[0] || 'map_sidebar';
  }
  renderPatientList();
  if (isTourDemoPatientId(rt.getActiveId(), patients)) {
    rt.setActiveId(patients.length ? patients[0].id : null);
    if (rt.getActiveId()) selectPatient(rt.getActiveId());
    else {
      var pv0 = document.getElementById('patient-view');
      var es0 = document.getElementById('empty-state');
      if (pv0) pv0.style.display = 'none';
      if (es0) es0.style.display = 'flex';
    }
  }
  function finishTourStart() {
    applyTourNavigationForStep(tourState.tourStepId);
    showTourDock();
    renderTourStep();
    publishTourGuardContext();
    if (opts.resumeStepId) persistTourProgressDebounced();
  }
  if (opts.resumeStepId) {
    setTimeout(finishTourStart, 0);
  } else {
    finishTourStart();
  }
}

function findTourDemoBlockForRegistro(blocks, registro) {
  var reg = String(registro || '').trim();
  if (!reg || !blocks) return null;
  return (
    blocks.find(function (b) {
      if (!b || b.status !== 'no-patient' || !b.okReportCount) return false;
      return String(b.primaryExpediente || '').trim() === reg;
    }) || null
  );
}

function scheduleTourDemoPatientRegistrationFromLab() {
  if (!tourState.guidedTourActive || tourState.tourStepId !== 'lab_parse') return;
  if (tourDemoPatientsBothInCensus(patients)) return;
  var ta = document.getElementById('lab-input');
  if (!ta || typeof rt.openAddModalFromLabPatient !== 'function') return;
  var text = String(ta.value || '').trim();
  if (!text) return;
  var blocks = buildBulkLabPreview(text, { findPatientByRegistro: rt.findPatientByRegistro });
  openNextTourDemoPatientFromBlocks(blocks);
}

function openNextTourDemoPatientFromBlocks(blocks) {
  var regs = [DEMO_REGISTRO, DEMO_REGISTRO_2];
  for (var i = 0; i < regs.length; i++) {
    var reg = regs[i];
    if (findTourDemoPatientByRegistro(patients, reg)) continue;
    var block = findTourDemoBlockForRegistro(blocks, reg);
    if (!block) continue;
    var labPatient = extractLabPatientFromBulkBlock(block);
    if (!labPatient) continue;
    rt.openAddModalFromLabPatient(labPatient, {
      onSaved: function () {
        setTimeout(scheduleTourDemoPatientRegistrationFromLab, 220);
      },
    });
    return;
  }
}

function onboardingAdvanceAfterParse() {
  if (!tourState.guidedTourActive || tourState.tourStepId !== 'lab_parse') return;
  if (!tourDemoLabCompleteForTour(patients, labHistory)) return;
  tourState.tourDemoLabSessionProcessed = true;
  ensureTourPrimaryDemoPatientActive();
  clearAllTourSpotlights();
  tourState.tourStepId = 'lab_view';
  publishTourGuardContext();
  applyTourTargetForStep(tourState.tourStepId);
  renderTourStep();
  persistTourProgressDebounced();
  syncTourActionNextButton();
}

function onboardingAdvanceAfterSend() {
  if (!tourState.guidedTourActive) return;
  if (tourState.tourStepId === 'lab_view') {
    clearAllTourSpotlights();
    tourState.tourStepId = 'sala_casiopea_lab';
    publishTourGuardContext();
    applyTourTargetForStep(tourState.tourStepId);
    renderTourStep();
  }
}

export function tourAfterBulkLabParse(blocks) {
  if (!tourState.guidedTourActive || tourState.tourStepId !== 'lab_parse') return;
  if (tourDemoPatientsBothInCensus(patients)) return;
  openNextTourDemoPatientFromBlocks(blocks || []);
}

export function tourOnBulkPreviewPatientSaved() {
  scheduleTourDemoPatientRegistrationFromLab();
}

function destroyDemoAndClose() {
  clearTourSoapButtonHighlight();
  closeLabBulkTourHintModal();
  purgeTourDemoPatientsFromState();
  tourState.guidedTourActive = false;
  tourState.tourStepId = null;
  tourState.guidedTourBranch = null;
  publishTourGuardContext();
  hideTourDock();
  if (isTourDemoPatientId(rt.getActiveId(), patients)) {
    rt.setActiveId(patients.length ? patients[0].id : null);
  }
  limpiarReporte();
  saveState();
  renderPatientList();
  if (rt.getActiveId()) selectPatient(rt.getActiveId());
  else { document.getElementById('patient-view').style.display = 'none'; document.getElementById('empty-state').style.display = 'flex'; }
}

function resetAndStartOnboarding() {
  // El botón vive dentro del modal Mi Perfil; ciérralo antes de mostrar
  // el tour para que no se quede flotando encima.
  rt.closeProfileModal();
  closeSettingsDropdown();
  try {
    localStorage.removeItem(GUIDED_TOUR_LS_KEY);
  } catch (_e) {}
  try {
    purgeTourDemoPatientsFromState();
    tourState.guidedTourActive = false;
    tourState.tourStepId = null;
    tourState.guidedTourBranch = null;
    publishTourGuardContext();
    hideTourDock();
    hideTourIntroModal();
    limpiarReporte();
    saveState();
    if (isTourDemoPatientId(rt.getActiveId(), patients)) {
      rt.setActiveId(patients.length ? patients[0].id : null);
    }
    renderPatientList();
    if (rt.getActiveId()) selectPatient(rt.getActiveId());
    else {
      var pv = document.getElementById('patient-view');
      var es = document.getElementById('empty-state');
      if (pv) pv.style.display = 'none';
      if (es) es.style.display = 'flex';
    }
  } catch (err) {
    console.error('resetAndStartOnboarding cleanup:', err && err.message);
  }
  resolveAppVersionForTour()
    .then(function (v) {
      window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
      showTourIntroModal();
    })
    .catch(function () {
      window.__RPC_APP_VERSION__ = 'dev';

  });
}

export {
  guidedTourAdvanceAfterNotaGenerated,
  guidedTourAdvanceAfterIndicaGenerated,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  guidedTourClickNext,
  guidedTourClickPrev,
  guidedTourPause,
  skipGuidedTour,
  destroyDemoAndClose,
  resetAndStartOnboarding,
  startOnboarding,
  scheduleTourDemoPatientRegistrationFromLab,
};
