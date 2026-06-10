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
  isClinicalSyncModeChosen,
  readRpcSettings,
  setClinicalSyncModeLocalOnly,
} from '../../clinical-settings.mjs';
import { hideMainClinicalOnboarding } from '../clinical-onboarding-main.mjs';
import {
  closeSettingsDropdown,
  toggleSettingsDropdown,
  ensureSettingsDropdownOpen,
  expandSettingsAccordionBackupSync,
} from './settings-dropdown.mjs';

import {
  getGuidedTourSteps,
  resolveTourBranch,
  applyTourTargetForStep,
  clearAllTourSpotlights,
  syncTourDockPlacement,
  syncTourSoapButtonHighlight,
  syncTourActionNextButton,
  armTourActionPoll,
  guidedTourStepIndex,
  persistTourProgressDebounced,
  showTourDock,
  hideTourDock,
  resetTourUiBeforeResume,
  hideTourIntroModal,
  markGuidedTourVersionDone,
  closeLabBulkTourHintModal,
  openLabBulkTourHintModal,
  openTutorialIntroFromSettings,
  clearTourSoapButtonHighlight,
  syncLearnHubContinueVisibility,
} from './tour-engine.mjs';
import {
  purgeTourDemoPatientsFromState,
  applyTourDemoPatientBundle,
  ensureTourPrimaryDemoPatientActive,
} from './tour-demo-seed.mjs';

import { tourState, publishTourGuardContext, GUIDED_TOUR_LS_KEY } from './tour-state.mjs';
import { tourBridge } from './tour-bridge.mjs';

const rt = getSettingsHelpRuntime();

const MOBILE_SCOPE_COPY =
  'La app móvil (iPad/Safari) muestra tablero de guardia y expediente esencial; no incluye Ajustes, exportaciones Word ni todas las pestañas de escritorio.';

const LIVESYNC_BTN_COPY =
  '<strong>LiveSync</strong> (icono <strong>Wi‑Fi</strong> junto a Ajustes)';

function getClinicalRankForTour() {
  try {
    const st = rt.getSettings();
    return String(st?.clinicalRank || 'R1').trim().toUpperCase();
  } catch (_e) {
    return 'R1';
  }
}

const GV7_HELP_ARTICLE = {
  gv7_guardia_chip: 'modo-guardia',
  gv7_guardia_tab: 'modo-guardia',
  gv7_guardia_scope: 'modo-guardia',
  gv7_guardia_toggle: 'modo-guardia',
  gv7_guardia_exit: 'modo-guardia',
  gv7_censo_r1: 'modo-guardia',
  gv7_censo_r4: 'modo-guardia',
  gv7_censo_sync: 'modo-guardia',
  gv7_entrega_phase: 'modo-entrega',
  gv7_entrega_patient: 'modo-entrega',
  gv7_entrega_roster: 'modo-entrega',
  gv7_entrega_pendientes: 'modo-entrega',
  gv7_lan_wifi: 'lan-pin-turno',
  gv7_lan_pin: 'lan-pin-turno',
  gv7_lan_directorio: 'lan-pin-turno',
  gv7_lan_rotacion: 'lan-pin-turno',
  gv7_mobile_link: 'lan-pin-turno',
  gv7_mobile_scope: 'lan-pin-turno',
  gv7_mobile_vs_sala: 'lan-pin-turno',
};

const GV7_ACTION_HINT = {
  gv7_guardia_toggle:
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa el botón resaltado; aparece <strong>Siguiente</strong> al activar el filtro.</p>',
  gv7_lan_wifi:
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa el icono <strong>Wi‑Fi</strong> de LiveSync para continuar.</p>',
  gv7_mobile_link:
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Despliega <strong>iPad / R+ Móvil</strong> en el panel LiveSync.</p>',
};

function buildGv7CensoR1Copy(rank) {
  if (rank === 'R4') {
    return (
      '<p style="margin:0;line-height:1.5;">Como <strong>R4</strong>, el censo lateral puede mostrar toda la sala. ' +
      'En el siguiente paso verás la grilla agrupada por equipo.</p>'
    );
  }
  if (rank === 'R1') {
    return (
      '<p style="margin:0;line-height:1.5;">Como <strong>R1</strong>, el censo lateral lista pacientes de <strong>tu equipo</strong>. ' +
      'En guardia, <strong>Solo mis entregas</strong> puede acotar aún más.</p>'
    );
  }
  return (
    '<p style="margin:0;line-height:1.5;">Según tu rango (<strong>' +
    escapeTourHtml(rank) +
    '</strong>), el censo lateral muestra tu equipo o un subconjunto de la sala.</p>'
  );
}

function buildGv7CensoR4Copy(rank) {
  if (rank === 'R4') {
    return (
      '<p style="margin:0;line-height:1.5;">En la grilla de guardia, los <strong>divisores por equipo</strong> (colapsables) permiten ver toda la sala sin ruido.</p>'
    );
  }
  return (
    '<p style="margin:0;line-height:1.5;">En rangos <strong>R1–R3</strong> la grilla se acota a tu equipo. ' +
    'Los divisores colapsables por equipo son propios de <strong>R4</strong>.</p>'
  );
}

function getGuardiaV7StepBody(stepId) {
  const rank = getClinicalRankForTour();
  const bodies = {
    gv7_guardia_chip:
      '<p style="margin:0;line-height:1.5;">El botón <strong>Guardia</strong> en la barra superior abre el tablero de turno: censo, entrega y monitoreo. No bloquea el resto de R+.</p>',
    gv7_guardia_tab:
      '<p style="margin:0;line-height:1.5;">En <strong>Modo Guardia</strong> el centro muestra el panel de guardia: fases del turno, métricas y grilla de pacientes.</p>',
    gv7_guardia_scope:
      '<p style="margin:0;line-height:1.5;">La <strong>barra de contexto</strong> resume sala y fase del turno. Quién ves en el censo depende de tu rango — lo revisamos en el módulo <strong>Censo y alcance</strong>.</p>',
    gv7_guardia_toggle:
      '<p style="margin:0;line-height:1.5;"><strong>Solo mis entregas</strong> filtra la grilla a pacientes que te entregaron en este turno, sin cambiar el modo Entrega.</p>',
    gv7_guardia_exit:
      '<p style="margin:0;line-height:1.5;">Pulsa de nuevo <strong>Guardia</strong> para volver a la vista Normal (Laboratorio, Expediente, etc.).</p>',
    gv7_entrega_phase:
      '<p style="margin:0;line-height:1.5;">Pulsa <strong>Entrega</strong> en la barra del censo para abrir el listado de handoff por paciente antes del turno activo.</p>',
    gv7_entrega_patient:
      '<p style="margin:0;line-height:1.5;">En cada paciente, <strong>Entrega</strong> documenta handoff, equipo entrante y pendientes. La grilla resalta críticos y entrantes.</p>',
    gv7_entrega_roster:
      '<p style="margin:0;line-height:1.5;">El <strong>roster de entrega</strong> lista pacientes pendientes de documentar antes de pasar al turno activo.</p>',
    gv7_entrega_pendientes:
      '<p style="margin:0;line-height:1.5;"><strong>Pendientes de entrega</strong>: plantillas por servicio, handoff estructurado y seguimiento entre turnos.</p>',
    gv7_lan_wifi:
      '<p style="margin:0;line-height:1.5;">' +
      LIVESYNC_BTN_COPY +
      ': estado de red local, sala y sincronización del turno en la Wi‑Fi del hospital.</p>',
    gv7_lan_pin:
      '<p style="margin:0;line-height:1.5;">El <strong>PIN del turno</strong> (válido ~12 h) permite reconectar otras Mac en otra red del hospital sin reconfigurar la sala.</p>',
    gv7_lan_directorio:
      '<p style="margin:0;line-height:1.5;">El <strong>directorio LAN</strong> muestra quién está en la sala. El anfitrión conserva el roster aunque un cliente aún no haya sincronizado.</p>',
    gv7_lan_rotacion:
      '<p style="margin:0;line-height:1.5;"><strong>Mi rotación</strong> (barra superior): @usuario, equipos persistentes, sala y entregas. Distinto del censo del sidebar.</p>',
    gv7_mobile_link:
      '<p style="margin:0;line-height:1.5;">Copia el <strong>enlace permanente para iPad/móvil</strong> desde el panel LiveSync. Sirve para guardar en Safari; no caduca como el ticket de otra Mac.</p>',
    gv7_mobile_scope:
      '<p style="margin:0;line-height:1.5;">' + MOBILE_SCOPE_COPY + '</p>',
    gv7_mobile_vs_sala:
      '<p style="margin:0;line-height:1.5;">En LiveSync, <strong>iPad/móvil</strong> (identidad) vs <strong>otra Mac/sala</strong> (ticket de un solo uso) son invitaciones distintas.</p>',
    gv7_censo_r1: buildGv7CensoR1Copy(rank),
    gv7_censo_r4: buildGv7CensoR4Copy(rank),
    gv7_censo_sync:
      '<p style="margin:0;line-height:1.5;">La sincronización LAN es más silenciosa en 7.x: avisos discretos en el encabezado; el directorio se actualiza en segundo plano.</p>',
  };
  return bodies[stepId] || '<p style="margin:0;line-height:1.5;">Sigue el resaltado en pantalla.</p>';
}

function getGuardiaV7StepHtml(stepId) {
  let base = getGuardiaV7StepBody(stepId);
  if (GV7_ACTION_HINT[stepId] && stepRequiresUserAction(stepId)) {
    base += GV7_ACTION_HINT[stepId];
  }
  const articleId = GV7_HELP_ARTICLE[stepId];
  if (!articleId) return base;
  return (
    base +
    '<p style="margin:10px 0 0;">' +
    '<button type="button" class="help-tour-btn" onclick="openQuickHelp(\'' +
    articleId +
    "')\">Más en ayuda</button></p>"
  );
}

function escapeTourHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function syncTourDockBranchClass(branch) {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  d.classList.toggle('tour-dock--guardia', branch === 'guardia-v7');
  d.classList.toggle('tour-dock--fundamentos', branch === 'sala' || branch === 'interconsulta');
  d.classList.toggle('tour-dock--quick-route', branch === 'quick-route');
}

function renderQuickRouteStepCopy(bodyEl, nextBtn) {
  var id = tourState.tourStepId;
  if (id === 'map_lab_teaser') {
    bodyEl.innerHTML =
      '<p style="margin:0;line-height:1.5;">Ruta rápida: primero <strong>laboratorio</strong>. El cuadro trae <strong>DEMO PÉREZ</strong> y <strong>DEMO GARCÍA</strong>. En el siguiente paso pulsa <strong>Procesar</strong> y agrega ambos al censo.</p>';
    nextBtn.textContent = 'Siguiente';
    return true;
  }
  if (id === 'lab_parse') {
    bodyEl.innerHTML =
      '<p style="margin:0;line-height:1.5;">Pulsa <strong>Procesar</strong> y agrega ambos pacientes demo al censo.</p>' +
      '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Sin <strong>Siguiente</strong> hasta que ambos tengan laboratorio en historial.</p>';
    nextBtn.style.display = 'none';
    return true;
  }
  if (id.indexOf('gv7_') === 0) {
    bodyEl.innerHTML = getGuardiaV7StepHtml(id);
    nextBtn.textContent = 'Siguiente';
    return true;
  }
  return false;
}

function renderTourDockBadge(tourBranch, prog, idx, total) {
  var badge = document.getElementById('tour-step-badge');
  if (!badge) return;
  if (tourBranch === 'quick-route') {
    badge.innerHTML =
      '<span class="tour-dock-badge-line tour-dock-badge-kicker">Ruta rápida</span>' +
      '<span class="tour-dock-badge-line tour-dock-badge-step">Paso ' +
      prog.stepInChapter + ' de ' + prog.chapterSteps + '</span>';
    return;
  }
  if (tourBranch === 'guardia-v7') {
    badge.innerHTML =
      '<span class="tour-dock-badge-line tour-dock-badge-kicker">Guardia 7.x</span>' +
      '<span class="tour-dock-badge-line tour-dock-badge-module">Módulo ' +
      prog.chapterIndex + '/5 · ' + escapeTourHtml(prog.chapterTitle) + '</span>' +
      '<span class="tour-dock-badge-line tour-dock-badge-step">Paso ' +
      prog.stepInChapter + ' de ' + prog.chapterSteps + '</span>';
    return;
  }
  var branchLabel = tourBranch === 'interconsulta' ? 'Interconsulta' : 'Sala';
  var sub = prog.isCompanion
    ? 'Extensión Neo · paso ' + prog.stepInChapter + ' de ' + prog.chapterSteps
    : 'Cap. ' + prog.chapterIndex + '/' + prog.chapterCount + ' · ' + prog.chapterTitle +
      ' · paso ' + prog.stepInChapter + '/' + prog.chapterSteps;
  badge.innerHTML =
    '<span class="tour-dock-badge-line tour-dock-badge-module">Paso ' + idx + ' de ' + total +
    ' · ' + escapeTourHtml(branchLabel) + '</span>' +
    '<span class="tour-dock-badge-line tour-dock-badge-step">' + escapeTourHtml(sub) + '</span>';
}

function clearGuidedTourModuleScope() {
  tourState.guidedTourChapterScope = null;
  tourState.guidedTourModuleOnly = false;
}

function maybeMarkFundamentosChapterComplete(stepId) {
  const branch = tourState.guidedTourBranch;
  if (branch !== 'sala' && branch !== 'interconsulta') return;
  const tourBranch = branch === 'interconsulta' ? 'interconsulta' : 'sala';
  const chapter = getChapterForStep(stepId, tourBranch);
  if (!chapter?.id || chapter.id === 'unknown' || chapter.id === 'ch-neo') return;
  const stepsInChapter = getChapterProgressLabel(stepId, tourBranch);
  if (stepsInChapter.stepInChapter !== stepsInChapter.chapterSteps) return;
  void import('../../fundamentos-progress.mjs').then((m) => {
    if (!m.isFundamentosChapterId(chapter.id)) return;
    const result = m.markFundamentosChapterComplete(chapter.id);
    if (!result.wasNew) return;
    if (chapter.id === 'ch-patient-lab') {
      rt.showToast('Listo: DEMO PÉREZ ya tiene laboratorio en R+.', 'success');
    } else {
      rt.showToast(`Módulo completado: ${chapter.title}`, 'success');
    }
  });
}

function maybeMarkGuardiaV7ChapterComplete(stepId) {
  if (tourState.guidedTourBranch !== 'guardia-v7') return;
  const branch = 'guardia-v7';
  const chapter = getChapterForStep(stepId, branch);
  if (!chapter || !chapter.id || chapter.id === 'unknown') return;
  const stepsInChapter = getChapterProgressLabel(stepId, branch);
  if (stepsInChapter.stepInChapter !== stepsInChapter.chapterSteps) return;
  void import('../../guardia-v7-progress.mjs').then((m) => {
    const result = m.markGuardiaV7ChapterComplete(chapter.id);
    if (!result.wasNew) return;
    rt.launchConfetti();
    rt.showToast(`Módulo completado: ${chapter.title}`, 'success');
    syncLearnHubContinueVisibility();
    if (m.isGuardiaV7TrackComplete()) {
      window.setTimeout(() => {
        rt.showToast('¡Guía de guardia 7.x completada!', 'success');
      }, 500);
    }
  });
}

/** Tour step render and onboarding flow */
function finalizeTourStepRender(prevBtn) {
  syncTourDockPlacement();
  syncTourSoapButtonHighlight();
  syncTourActionNextButton();
  armTourActionPoll();
  if (prevBtn) prevBtn.disabled = guidedTourStepIndex() <= 0;
}

function renderTourStep() {
  if (!tourState.guidedTourActive) return;
  var badge = document.getElementById('tour-step-badge');
  var bodyEl = document.getElementById('tour-dock-body');
  var nextBtn = document.getElementById('tour-btn-next');
  var prevBtn = document.getElementById('tour-btn-prev');
  var steps = getGuidedTourSteps();
  var total = steps.length;
  var idx = guidedTourStepIndex() + 1;
  var tourBranch = resolveTourBranch();
  syncTourDockBranchClass(tourBranch);
  var prog = getChapterProgressLabel(tourState.tourStepId, tourBranch);
  renderTourDockBadge(tourBranch, prog, idx, total);
  var neoOptionalLine =
    '<p style="margin:0 0 8px;font-size:13px;color:var(--text-muted);">R+ funciona sin Neo; módulo opcional.</p>';
  nextBtn.style.display = '';
  nextBtn.disabled = false;
  nextBtn.setAttribute('onclick', 'guidedTourClickNext()');

  if (tourBranch === 'guardia-v7' || tourBranch === 'quick-route') {
    if (tourBranch === 'quick-route' && tourState.tourStepId === 'quick_wrap') {
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Listo. Explora más en <strong>Aprender R+</strong>: módulos de guardia 7.x o el tutorial completo en <strong>Fundamentos</strong>.</p>';
      nextBtn.textContent = 'Finalizar';
      nextBtn.style.display = '';
      nextBtn.setAttribute('onclick', 'guidedTourFinish()');
      finalizeTourStepRender(prevBtn);
      return;
    }
    if (tourBranch === 'quick-route') {
      var quickHandled = renderQuickRouteStepCopy(bodyEl, nextBtn);
      if (quickHandled) {
        if (stepRequiresUserAction(tourState.tourStepId)) {
          nextBtn.style.display = 'none';
        }
        finalizeTourStepRender(prevBtn);
        return;
      }
    }
    bodyEl.innerHTML = getGuardiaV7StepHtml(tourState.tourStepId);
    var gv7Steps = getGuidedTourSteps();
    var gv7Idx = gv7Steps.indexOf(tourState.tourStepId);
    nextBtn.textContent =
      gv7Idx >= 0 && gv7Idx >= gv7Steps.length - 1 ? 'Finalizar módulo' : 'Siguiente';
    if (stepRequiresUserAction(tourState.tourStepId)) {
      nextBtn.style.display = 'none';
    }
    finalizeTourStepRender(prevBtn);
    return;
  }

  switch (tourState.tourStepId) {
    case 'map_sidebar':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">La <strong>columna izquierda</strong> es tu censo. En este tour <strong>no hay pacientes precargados</strong>: registrarás a <strong>DEMO PÉREZ</strong> al procesar el laboratorio de ejemplo.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'map_tabs':
      bodyEl.innerHTML =
        getUiDensity() !== 'normal'
          ? '<p style="margin:0;line-height:1.5;">En <strong>Pase</strong> el centro es un <strong>resumen</strong> del paciente. Pulsa un bloque o usa <strong>Ctrl/⌘ + 1…4</strong> para abrir el detalle en vista <strong>Normal</strong>.</p>'
          : tourState.guidedTourBranch === 'interconsulta'
            ? '<p style="margin:0;line-height:1.5;">Arriba: <strong>Laboratorio</strong>, <strong>Expediente</strong>, <strong>Medicamentos</strong> y <strong>Agenda</strong>. Las pestañas internas del expediente vienen en el siguiente paso.</p>'
            : '<p style="margin:0;line-height:1.5;">Arriba: <strong>Laboratorio</strong>, <strong>Expediente</strong>, <strong>Medicamentos</strong> y <strong>Agenda</strong>. El mapa del expediente lo verás al entrar en esa pestaña.</p>';
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
        '<p style="margin:0;line-height:1.5;">Revisa diagramas y tabla de resultados. En <strong>Resultados</strong>, el menú <strong>⋯</strong> incluye <strong>Consolidar</strong> para juntar envíos del mismo día (mismo tipo de dato).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Siguiente</strong> para continuar el tour.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_casiopea_lab':
      bodyEl.innerHTML =
        neoOptionalLine +
        '<p style="margin:0;line-height:1.5;">Abre <strong>Tablas SOME</strong> (botón resaltado arriba a la derecha del laboratorio). Dentro verás <strong>Enviar a Neo</strong> para el paso <strong>Paraclínicos</strong> en la app Neo (instalada aparte).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">El recuadro del tutorial se movió a la izquierda para no tapar el botón. Pulsa <strong>Siguiente</strong> cuando lo hayas visto.</p>';
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
    case 'estado_actual_review':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Tras registrar, revisa tres zonas en esta pestaña: el <strong>snapshot</strong> (resumen del turno), las <strong>gráficas</strong> por familia con alertas, y el <strong>historial</strong> con texto compilado copiable a la nota.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Desplázate si hace falta. <strong>Siguiente</strong>: <strong>Eventualidades</strong>.</p>';
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
        '<p style="margin:0;line-height:1.5;">' +
        LIVESYNC_BTN_COPY +
        ' abre la sala en vivo: activa la red del turno y luego <strong>creas una sala</strong> o <strong>te unes</strong> a una existente. En iPad u otra Mac pegas el enlace de invitación.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa el icono Wi‑Fi para abrir el panel; aparece <strong>Siguiente</strong> cuando esté visible.</p>';
      if (stepRequiresUserAction('livesync_desktop')) nextBtn.style.display = 'none';
      break;
    case 'livesync_mobile':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En LiveSync usa <strong>Copiar enlace móvil</strong> y ábrelo en Safari (misma Wi‑Fi). ' +
        MOBILE_SCOPE_COPY +
        '</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">El Mac anfitrión debe tener R+ abierto y la <strong>misma sala LiveSync</strong> que el equipo de escritorio.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'wrap':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Listo. Repite el tutorial desde <strong>Mi Perfil</strong> o <strong>Ajustes</strong>. Para el equipo en vivo usa <strong>LiveSync</strong> y, si hace falta, el enlace móvil.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);"><strong>Modo Pase</strong> (resumen de ronda): prueba el atajo <strong>' +
        (navigator.platform && /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl') +
        '+P</strong> o <strong>Ajustes → Modo de vista → Pase</strong> cuando quieras ver pendientes, labs y meds en una sola columna.</p>';
      nextBtn.textContent = 'Finalizar';
      nextBtn.setAttribute('onclick', 'guidedTourFinish()');
      break;
    default:
      hideTourDock();
  }
  // Si el paso requiere acción del usuario en un botón concreto,
  // ocultamos "Siguiente" para que el avance venga del propio botón.
  if (stepRequiresUserAction(tourState.tourStepId) && tourState.tourStepId !== 'servicio_default') {
    nextBtn.style.display = 'none';
  }
  finalizeTourStepRender(prevBtn);
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
  var branch = resolveTourBranch();
  var ch = getChapterForStep(tourState.tourStepId, branch);
  saveTourProgress({
    branch: branch,
    track: branch,
    stepId: tourState.tourStepId,
    chapterId: ch.id,
    moduleOnly: tourState.guidedTourModuleOnly,
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
  tourState.guidedTourBranch =
    p.branch === 'interconsulta' ? 'interconsulta'
      : p.branch === 'guardia-v7' ? 'guardia-v7'
        : p.branch === 'quick-route' ? 'quick-route'
          : 'sala';
  tourState.guidedTourMode = p.mode === 'neo' ? 'neo' : 'base';
  tourState.guidedTourModuleOnly = !!p.moduleOnly;
  tourState.guidedTourChapterScope = p.moduleOnly ? p.chapterId || null : null;
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
  if (tourState.tourStepId === 'wrap' || tourState.tourStepId === 'quick_wrap') {
    finishGuidedTour();
    return;
  }
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourState.tourStepId);
  if (i < 0) return;
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
  maybeMarkFundamentosChapterComplete(tourState.tourStepId);
  maybeMarkGuardiaV7ChapterComplete(tourState.tourStepId);
  if (tourState.guidedTourMode === 'neo') {
    void import('../../neo-companion-progress.mjs').then((m) => {
      if (m.isNeoCompanionStepId(tourState.tourStepId)) {
        const result = m.markNeoCompanionStepComplete(tourState.tourStepId);
        if (result.wasNew) syncLearnHubContinueVisibility();
      }
    });
  }
  if (i + 1 >= steps.length) {
    finishGuidedTour();
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

/** Set when guided tour ends; consumed by handlePostGuidedTourOnboardingResume. */
let postTourResumeBranch = null;

/** Sala tour implies LAN; dismiss sync-mode overlay before guided-tour-running is cleared. */
function prepareSalaGuidedTourExitSync() {
  if (!isClinicalSyncModeChosen(readRpcSettings())) {
    setClinicalSyncModeLocalOnly(false);
  }
  hideMainClinicalOnboarding();
}

export async function handlePostGuidedTourOnboardingResume() {
  const branch = postTourResumeBranch;
  postTourResumeBranch = null;

  if (branch === 'sala') {
    prepareSalaGuidedTourExitSync();
    await promptMiRotacionAfterSalaTourIfNeeded('sala');
    return;
  }

  const main = await import('../clinical-onboarding-main.mjs');
  if (main && typeof main.refreshMainClinicalOnboardingIfNeeded === 'function') {
    await main.refreshMainClinicalOnboardingIfNeeded();
  }
}

async function promptMiRotacionAfterSalaTourIfNeeded(branch) {
  if (branch !== 'sala') return;
  const { isClinicalLocalOnlyMode, readRpcSettings } = await import('../../clinical-settings.mjs');
  if (isClinicalLocalOnlyMode(readRpcSettings())) return;
  const { needsTeamOnboarding } = await import('../clinical-onboarding.mjs');
  if (!needsTeamOnboarding()) return;

  rt.showToast(
    'Únete a un equipo en Mi rotación. El nombre del equipo es el nombre completo de tu R2 (ej. Dr. Gutiérrez).',
    'info'
  );

  const { ensureClinicalPanelSession } = await import('../clinical-panel-host.mjs');
  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    rt.showToast('Cuando la sesión esté lista, abre Mi rotación en la barra superior.', 'warning');
    return;
  }

  try {
    const { wireClinicalTeamsModalChrome } = await import(
      '../clinical-teams/teams-roster-modal-chrome.mjs'
    );
    wireClinicalTeamsModalChrome();
    const { openClinicalTeamsPanel } = await import('../clinical-teams/teams-roster.mjs');
    await openClinicalTeamsPanel({ skipProfileGate: true });
  } catch (err) {
    console.warn('[R+] Mi rotación tras tutorial Sala:', err && err.message);
    const { openMiRotacion } = await import('../clinical-rotation-entry.mjs');
    await openMiRotacion();
  }
}

function completeGuidedTourWithCelebration() {
  const completedBranch = tourState.guidedTourBranch;
  if (tourState.tourStepId) {
    if (completedBranch === 'guardia-v7') maybeMarkGuardiaV7ChapterComplete(tourState.tourStepId);
    if (completedBranch === 'sala' || completedBranch === 'interconsulta') {
      maybeMarkFundamentosChapterComplete(tourState.tourStepId);
    }
  }
  clearTourSoapButtonHighlight();
  clearTourProgress();
  markGuidedTourVersionDone();
  tourState.guidedTourActive = false;
  tourState.tourStepId = null;
  postTourResumeBranch = completedBranch;
  tourState.guidedTourBranch = null;
  tourState.guidedTourMode = 'base';
  clearGuidedTourModuleScope();
  if (completedBranch === 'sala') prepareSalaGuidedTourExitSync();
  publishTourGuardContext();
  hideTourDock();
  if (completedBranch !== 'guardia-v7') {
    rt.launchConfetti();
    rt.showToast('Tutorial completado', 'success');
  }
  if (completedBranch !== 'guardia-v7') safeDestroyDemoAndClose();
  syncLearnHubContinueVisibility();
}

function safeDestroyDemoAndClose() {
  try {
    destroyDemoAndClose();
  } catch (err) {
    console.error('[R+] destroyDemoAndClose:', err && err.message);
    tourState.guidedTourActive = false;
    tourState.tourStepId = null;
    tourState.guidedTourBranch = null;
    publishTourGuardContext();
    hideTourDock();
  }
}

export function finishGuidedTour() {
  if (tourState.miniTourActive) {
    tourBridge.endMiniTour();
    return;
  }
  if (!tourState.guidedTourActive) return;
  try {
    completeGuidedTourWithCelebration();
  } catch (err) {
    console.error('[R+] finishGuidedTour:', err && err.message);
    clearTourProgress();
    markGuidedTourVersionDone();
    tourState.guidedTourActive = false;
    tourState.tourStepId = null;
    tourState.guidedTourBranch = null;
    tourState.guidedTourMode = 'base';
    clearGuidedTourModuleScope();
    publishTourGuardContext();
    hideTourDock();
    safeDestroyDemoAndClose();
    rt.showToast('Tutorial finalizado', 'success');
    syncLearnHubContinueVisibility();
  }
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
  clearGuidedTourModuleScope();
  publishTourGuardContext();
  hideTourDock();
  safeDestroyDemoAndClose();
  syncLearnHubContinueVisibility();
}

function startOnboarding(branch, opts) {
  opts = opts || {};
  if (opts.resumeStepId) resetTourUiBeforeResume();
  tourState.guidedTourBranch =
    branch === 'interconsulta' ? 'interconsulta'
      : branch === 'guardia-v7' ? 'guardia-v7'
        : branch === 'quick-route' ? 'quick-route'
          : 'sala';
  var isGuardiaV7 = tourState.guidedTourBranch === 'guardia-v7';
  if (!opts.resumeStepId) {
    tourState.guidedTourChapterScope = null;
    tourState.guidedTourModuleOnly = false;
  }
  if (!isGuardiaV7) {
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
  }
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
    applyTourTargetForStep(tourState.tourStepId);
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
  if (findTourDemoPatientByRegistro(patients, reg)) return null;
  return (
    blocks.find(function (b) {
      if (!b || !b.okReportCount) return false;
      if (String(b.primaryExpediente || '').trim() !== reg) return false;
      return b.status === 'no-patient' || !b.patient;
    }) || null
  );
}

var tourLabRegistrationTimer = null;

function getTourLabPasteTextForRegistration() {
  var ta = document.getElementById('lab-input');
  var text = ta ? String(ta.value || '').trim() : '';
  if (text) return text;
  if (typeof rt.getBulkLabPreviewSourceText === 'function') {
    return String(rt.getBulkLabPreviewSourceText() || '').trim();
  }
  return '';
}

function runTourDemoPatientRegistrationFromLab() {
  if (!tourState.guidedTourActive || tourState.tourStepId !== 'lab_parse') return;
  if (tourDemoPatientsBothInCensus(patients)) return;
  if (typeof rt.openAddModalFromLabPatient !== 'function') return;
  var text = getTourLabPasteTextForRegistration();
  if (!text) return;
  var blocks = buildBulkLabPreview(text, { findPatientByRegistro: rt.findPatientByRegistro });
  openNextTourDemoPatientFromBlocks(blocks);
}

function scheduleTourDemoPatientRegistrationFromLab() {
  if (tourLabRegistrationTimer) clearTimeout(tourLabRegistrationTimer);
  tourLabRegistrationTimer = setTimeout(function () {
    tourLabRegistrationTimer = null;
    runTourDemoPatientRegistrationFromLab();
  }, 280);
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
        scheduleTourDemoPatientRegistrationFromLab();
      },
    });
    return;
  }
}

function onboardingAdvanceAfterParse() {
  if (!tourState.guidedTourActive || tourState.tourStepId !== 'lab_parse') return;
  if (!tourDemoLabCompleteForTour(patients, labHistory)) {
    syncTourActionNextButton();
    return;
  }
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
  if (!tourDemoPatientsBothInCensus(patients)) {
    if (typeof rt.isBulkLabPreviewModalOpen === 'function' && rt.isBulkLabPreviewModalOpen()) {
      return;
    }
    scheduleTourDemoPatientRegistrationFromLab();
    return;
  }
  onboardingAdvanceAfterParse();
  syncTourActionNextButton();
}

export function tourOnBulkPreviewPatientSaved() {
  if (!tourState.guidedTourActive || tourState.tourStepId !== 'lab_parse') return;
  if (tourDemoPatientsBothInCensus(patients)) {
    rt.showToast('Pacientes demo listos. Pulsa Procesar todo en la vista previa.', 'success');
    return;
  }
  rt.showToast('Registra al otro paciente con Agregar paciente en la tabla.', 'info');
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
  else {
    var pv = document.getElementById('patient-view');
    var es = document.getElementById('empty-state');
    if (pv) pv.style.display = 'none';
    if (es) es.style.display = 'flex';
  }
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
  void openTutorialIntroFromSettings();
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
