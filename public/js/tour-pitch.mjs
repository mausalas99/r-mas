/**
 * Tour pitch (presentación): 29 pasos, scrim + spotlight, independiente del tour guiado.
 */
import { getPitchTourSteps } from './tour-pitch-steps.mjs';
import {
  getPitchTourTarget,
  pitchStepRequiresUserAction,
} from './tour-pitch-targets.mjs';
import {
  seedPitchDemo,
  clearPitchDemo,
  setPitchPatientIsolation,
  resolvePitchPersistPatients,
  markPitchTourSessionActive,
  tryRecoverPatientsFromPitchSandboxIfNeeded,
  PITCH_DEMO_PATIENT_ID,
} from './tour-pitch-demo-seed.mjs';
import { setPersistPatientsResolver } from './app-state.mjs';
import { syncPitchTourContext } from './tour-guards.mjs';
import { buildTourDemoListadoProblemas } from './tour-demo-listado-problemas.mjs';
import { isModeSala } from './mode-features.mjs';
import {
  clearPaseDetailEscape,
  setUiDensity,
  syncPaseModeHeaderChip,
} from './features/chrome.mjs';
import {
  patients,
  notes,
  indicaciones,
  labHistory,
  listadoProblemas,
  medRecetaByPatient,
  medNotaSelectionByPatient,
  recetaHuByPatient,
  saveState,
  setPatients,
} from './app-state.mjs';
import { renderNoteForm, renderIndicaForm } from './features/notes-indicaciones.mjs';
import {
  renderPatientList,
  selectPatient,
  setRoundOverviewMode,
} from './features/patients.mjs';
import {
  switchAppTab,
  renderPaseBoard,
  switchInnerTab,
  invalidatePaseBoardCache,
} from './features/pase-board.mjs';
import { refreshAllTodoUIs } from './features/todos.mjs';
import { seedPitchDemoTodos } from './tour-pitch-demo-todos.mjs';
import { limpiarReporte } from './features/lab-panel.mjs';
import { closeSesionIngresoTrendsSendModal } from './features/sesion-ingreso-trends-send-modal.mjs';
import { closeSOAPModal } from './features/soap-estado.mjs';
import { closeConnectionDropdown, openConnectionDropdown } from './features/lan-sync.mjs';
import {
  openLabSomeTablesModal,
  closeLabSomeTablesModal,
} from './features/lab-some-tables-modal.mjs';
import { windowHandlers as labPanelHandlers } from './features/lab-panel.mjs';
import { closeLabBulkPreviewModal } from './features/lab-bulk-preview-modal.mjs';
import { renderCultivosTable, invalidateCultivosTableCache } from './features/expediente.mjs';
import { closeTendGroupModal, tendenciasWindowHandlers } from './features/tendencias.mjs';
import {
  openEstadoActualPasteModal,
  closeEstadoActualPasteModal,
} from './features/estado-actual-paste-modal.mjs';
import { closeEstadoActualRegistroModal } from './features/estado-actual-registro-modal.mjs';
import {
  positionPitchTourDock,
  resetPitchTourDockPosition,
} from './tour-pitch-dock-placement.mjs';

export const PITCH_TOUR_UNLOCK_LS_KEY = 'rpc-pitch-tour-unlock';

let pitchTourActive = false;
let pitchStepId = null;
let pitchDockRepositionRaf = 0;
let pitchDockListenersBound = false;
let pitchTourIdx = 0;
/** @type {string|null} */
let pitchLabPasteText = null;

let rt = {
  getSettings() {
    return /** @type {any} */ ({});
  },
  getActiveInner() {
    return null;
  },
  getActiveId() {
    return null;
  },
  setActiveId() {},
  switchInnerTab() {},
  renderInnerTabs() {},
  renderEstadoActualButton() {},
  renderEstadoActualBar() {},
  switchAppTab() {},
  showToast() {},
  launchConfetti() {},
  closeProfileModal() {},
  openProfileModal() {},
  renderMedRecetaPanel() {},
  renderListadoForm() {},
  renderPaseBoard() {},
  renderRoundOverviewPanels() {},
  renderLabHistoryPanel() {},
  setRoundOverviewMode() {},
  applyAppModeSwitchEffects() {},
  toggleSettingsDropdown() {},
  closeSettingsDropdown() {},
  openLabBulkTourHintModal() {},
  closeLabBulkTourHintModal() {},
};

export function registerPitchTourRuntime(partial) {
  if (!partial || typeof partial !== 'object') return;
  Object.assign(rt, partial);
}

function publishPitchGuardContext() {
  document.body.classList.toggle('pitch-tour-active', pitchTourActive);
  syncPitchTourContext({ active: pitchTourActive, stepId: pitchStepId });
}

export function isPitchTourActive() {
  return pitchTourActive;
}

export function getPitchTourContext() {
  return { active: pitchTourActive, stepId: pitchStepId };
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showPitchScrim(on) {
  var el = document.getElementById('tour-pitch-scrim');
  if (!el) return;
  if (on) {
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('is-active');
  } else {
    el.classList.remove('is-active');
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
  }
}

function isPitchFullscreenSlide(stepId) {
  return (
    stepId === 'pitch_intro' ||
    stepId === 'pitch_problem_laboratoriazo' ||
    stepId === 'wrap'
  );
}

function showPitchSlideForStep(stepId) {
  var root = document.getElementById('tour-pitch-slide');
  if (!root) return;
  if (!stepId || !isPitchFullscreenSlide(stepId)) {
    root.classList.remove('is-active');
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    root.querySelectorAll('.tour-pitch-slide-panel').forEach(function (panel) {
      panel.hidden = true;
    });
    return;
  }
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');
  root.classList.add('is-active');
  root.querySelectorAll('.tour-pitch-slide-panel').forEach(function (panel) {
    var key = panel.getAttribute('data-pitch-slide');
    var show = key === stepId;
    panel.hidden = !show;
  });
}

function clearPitchSpotlightAncestors() {
  document.querySelectorAll('.tour-pitch-spotlight-ancestor').forEach(function (el) {
    el.classList.remove('tour-pitch-spotlight-ancestor');
  });
}

export function clearPitchTourVisuals() {
  showPitchScrim(false);
  showPitchSlideForStep(null);
  clearPitchSpotlightAncestors();
  var cls = [
    'tour-spotlight-pitch',
    'tour-spotlight-pitch-secondary',
    'tour-spotlight-soap',
    'tour-spotlight-action',
  ];
  cls.forEach(function (c) {
    document.querySelectorAll('.' + c).forEach(function (el) {
      el.classList.remove(c);
    });
  });
}

function querySelectorList(sel) {
  if (!sel) return [];
  return String(sel)
    .split(',')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean)
    .map(function (s) {
      return document.querySelector(s);
    })
    .filter(Boolean);
}

function elevatePitchSpotlightChain(el) {
  clearPitchSpotlightAncestors();
  var node = el;
  while (node && node !== document.body) {
    node.classList.add('tour-pitch-spotlight-ancestor');
    node = node.parentElement;
  }
}

function applyPitchSpotlights(target) {
  if (!target) return;
  var primarySel = target.selector;
  var secondarySel = target.secondarySelector;
  var mode = target.spotlight || 'primary';
  var primaries = querySelectorList(primarySel);
  var secondaries = secondarySel ? querySelectorList(secondarySel) : [];

  if (mode === 'secondary' || mode === 'both') {
    secondaries.forEach(function (el) {
      elevatePitchSpotlightChain(el);
      el.classList.add('tour-spotlight-pitch-secondary');
    });
  }
  if (mode === 'primary' || mode === 'both' || !secondarySel) {
    primaries.forEach(function (el) {
      elevatePitchSpotlightChain(el);
      el.classList.add('tour-spotlight-pitch');
    });
  }
}

function getPitchDockAnchorElements(target) {
  if (!target || !target.selector) return [];
  var mode = target.spotlight || 'primary';
  var primaries = querySelectorList(target.selector);
  var secondaries = target.secondarySelector
    ? querySelectorList(target.secondarySelector)
    : [];
  if (mode === 'secondary') return secondaries.length ? secondaries : primaries;
  if (mode === 'both') return primaries.concat(secondaries);
  return primaries.length ? primaries : secondaries;
}

function onPitchDockViewportChange() {
  if (!pitchTourActive) return;
  schedulePitchDockPlacement();
}

function ensurePitchDockListeners() {
  if (pitchDockListenersBound) return;
  pitchDockListenersBound = true;
  window.addEventListener('resize', onPitchDockViewportChange, { passive: true });
  window.addEventListener('scroll', onPitchDockViewportChange, { passive: true, capture: true });
}

function removePitchDockListeners() {
  if (!pitchDockListenersBound) return;
  pitchDockListenersBound = false;
  window.removeEventListener('resize', onPitchDockViewportChange);
  window.removeEventListener('scroll', onPitchDockViewportChange, true);
}

function schedulePitchDockPlacement() {
  if (pitchDockRepositionRaf) cancelAnimationFrame(pitchDockRepositionRaf);
  pitchDockRepositionRaf = requestAnimationFrame(function () {
    pitchDockRepositionRaf = requestAnimationFrame(function () {
      pitchDockRepositionRaf = 0;
      if (!pitchTourActive || isPitchFullscreenSlide(pitchStepId)) return;
      var dock = document.getElementById('tour-dock');
      var t = pitchStepId ? getPitchTourTarget(pitchStepId) : null;
      if (!dock || !t) return;
      var anchors = getPitchDockAnchorElements(t);
      if (!anchors.length) return;
      var placeOpts = { prefer: t.dockPrefer || '' };
      if (t.dockFixedCorner) placeOpts.fixedCorner = t.dockFixedCorner;
      positionPitchTourDock(dock, anchors, placeOpts);
    });
  });
}

function syncPitchDockPlacement() {
  schedulePitchDockPlacement();
}

/** Cierra modales/dropdowns del pitch salvo flags explícitos. */
function closePitchTourOverlays(opts) {
  opts = opts || {};
  closeLabSomeTablesModal();
  closeTendGroupModal();
  closeSesionIngresoTrendsSendModal();
  closeEstadoActualPasteModal();
  closeEstadoActualRegistroModal();
  if (typeof rt.closeLabBulkTourHintModal === 'function') rt.closeLabBulkTourHintModal();
  closeLabBulkPreviewModal();
  closeSOAPModal();
  if (!opts.keepConnection) closeConnectionDropdown();
  if (!opts.keepSettings && typeof rt.closeSettingsDropdown === 'function') {
    rt.closeSettingsDropdown();
  }
  document.body.classList.remove('pitch-tour-modal-step');
  document.body.classList.remove('pitch-tour-tend-chart-step');
  document.body.classList.remove('pitch-tour-lab-some-step');
  var dock = document.getElementById('tour-dock');
  if (dock) {
    dock.classList.remove('tour-dock--pitch-yield');
    dock.classList.remove('tour-dock--pitch-front');
  }
}

function syncPitchTourModalChrome(stepId) {
  var t = stepId ? getPitchTourTarget(stepId) : null;
  var modal = t && t.pitchModal;
  document.body.classList.toggle('pitch-tour-modal-step', !!modal);
  document.body.classList.toggle('pitch-tour-tend-chart-step', modal === 'tendChart');
  document.body.classList.toggle('pitch-tour-lab-some-step', modal === 'labSomeTables');
  var dock = document.getElementById('tour-dock');
  if (dock) {
    dock.classList.remove('tour-dock--pitch-yield', 'tour-dock--pitch-front');
    if (modal === 'tendChart' || modal === 'labSomeTables' || modal === 'estadoPaste') {
      dock.classList.add('tour-dock--pitch-front');
    }
  }
}

function runPitchLabProcess() {
  var li = document.getElementById('lab-input');
  if (!li || !pitchLabPasteText) return;
  closeLabBulkPreviewModal();
  if (typeof rt.closeLabBulkTourHintModal === 'function') rt.closeLabBulkTourHintModal();
  li.value = pitchLabPasteText;
  try {
    if (typeof labPanelHandlers.procesarReporte === 'function') {
      labPanelHandlers.procesarReporte();
    }
  } catch (_e) {}
  closeLabBulkPreviewModal();
}

function getLabWorkScroller() {
  return document.querySelector('#appcontent-lab .lab-work-scroll');
}

/** Desplaza el panel de Laboratorio hasta la tarjeta «Resultados». */
function scrollPitchLabResultsIntoView() {
  var sec = document.getElementById('lab-output-section');
  if (!sec || sec.style.display === 'none') return false;

  var scroller = getLabWorkScroller();
  if (scroller) {
    var scRect = scroller.getBoundingClientRect();
    var elRect = sec.getBoundingClientRect();
    var nextTop = scroller.scrollTop + (elRect.top - scRect.top) - 16;
    try {
      scroller.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
    } catch (_e) {
      scroller.scrollTop = Math.max(0, nextTop);
    }
  } else {
    try {
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_e2) {
      try {
        sec.scrollIntoView(true);
      } catch (_e3) {}
    }
  }
  return true;
}

function finishPitchLabReadyStep(t) {
  function tryFocus(attempt) {
    if (!pitchTourActive || pitchStepId !== 'pitch_lab_ready') return;
    if (scrollPitchLabResultsIntoView() || attempt >= 10) {
      applyPitchSpotlights(t);
      schedulePitchDockPlacement();
      return;
    }
    setTimeout(function () {
      tryFocus(attempt + 1);
    }, 100);
  }
  tryFocus(0);
}

function openPitchSomeTablesModal() {
  try {
    openLabSomeTablesModal();
  } catch (_e) {}
  var body = document.getElementById('lab-some-tables-modal-body');
  if (!body) return;
  body.querySelectorAll('.lab-some-dept-details').forEach(function (det, i) {
    if (det && i === 0) det.open = true;
  });
  var table = body.querySelector('.lab-some-table-wrap');
  if (table) {
    try {
      table.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_e) {}
  }
}

function openPitchTendChartModal() {
  var open = tendenciasWindowHandlers && tendenciasWindowHandlers.openTendGroupModal;
  if (typeof open !== 'function') return;
  try {
    open('bh');
  } catch (_e) {
    try {
      open('qs');
    } catch (_e2) {}
  }
}

function scrollPitchTendChartIntoView() {
  var modal = document.getElementById('tend-group-modal');
  if (!modal) return false;
  var plot =
    modal.querySelector('.tend-group-plot-wrap') ||
    modal.querySelector('canvas') ||
    modal.querySelector('.tend-group-modal-body');
  var target = plot || modal;
  try {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (_e) {
    try {
      target.scrollIntoView(true);
    } catch (_e2) {}
  }
  var body = modal.querySelector('.tend-group-modal-body');
  if (body) {
    try {
      body.scrollTop = 0;
    } catch (_e3) {}
  }
  return true;
}

function scrollPitchPaseBoardIntoView() {
  var host = document.getElementById('pase-board-scroll') || document.getElementById('appcontent-pase');
  if (!host) return false;
  try {
    host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (_e) {
    try {
      host.scrollIntoView(true);
    } catch (_e2) {}
  }
  return true;
}

function openPitchMonitoreoPasteModal() {
  closeEstadoActualRegistroModal();
  openEstadoActualPasteModal({ skipRegistro: true, prefillSample: true });
}

function ensureSettingsExpandedForPitch() {
  var dd = document.getElementById('settings-dropdown');
  if (!dd) return;
  if (!dd.classList.contains('open') && typeof rt.toggleSettingsDropdown === 'function') {
    rt.toggleSettingsDropdown();
  }
}

function ensureConnectionExpandedForPitch() {
  if (typeof closeSettingsDropdown === 'function') closeSettingsDropdown();
  var dd = document.getElementById('connection-dropdown');
  if (!dd) return;
  if (!dd.classList.contains('open') && typeof openConnectionDropdown === 'function') {
    openConnectionDropdown();
  }
}

function switchAppModeForPitch(mode) {
  var st = rt.getSettings();
  var target = mode === 'interconsulta' ? 'interconsulta' : 'sala';
  if ((st.appMode || 'sala') === target) return;
  st.appMode = target;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(st));
  } catch (_e) {}
  var modeRadioSala = document.getElementById('app-mode-sala');
  var modeRadioInter = document.getElementById('app-mode-inter');
  if (modeRadioSala) modeRadioSala.checked = target === 'sala';
  if (modeRadioInter) modeRadioInter.checked = target === 'interconsulta';
  if (typeof rt.applyAppModeSwitchEffects === 'function') {
    rt.applyAppModeSwitchEffects();
  } else {
    var sala = isModeSala(st);
    var inner = rt.getActiveInner();
    if (sala && (inner === 'notas' || inner === 'indica')) rt.switchInnerTab('todo');
    else if (!sala && inner === 'listado') rt.switchInnerTab('todo');
    rt.renderInnerTabs();
    rt.renderEstadoActualButton();
    rt.renderEstadoActualBar();
  }
}

function seedPitchListadoIfNeeded() {
  if (rt.getActiveId() !== PITCH_DEMO_PATIENT_ID) return;
  var today = new Date();
  var fecha =
    String(today.getDate()).padStart(2, '0') +
    '/' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '/' +
    today.getFullYear();
  var hora =
    String(today.getHours()).padStart(2, '0') + ':' + String(today.getMinutes()).padStart(2, '0');
  listadoProblemas[PITCH_DEMO_PATIENT_ID] = buildTourDemoListadoProblemas(fecha, hora);
  saveState();
}

function syncPitchTourLayoutBodyClasses(stepId) {
  document.body.classList.toggle('pitch-step-listado', stepId === 'listado_problemas');
  document.body.classList.toggle('pitch-step-pase-mode', stepId === 'pitch_modo_pase');
}

/** Paso listado: expediente normal con pestaña Listado (no resumen tipo Pase). */
function applyPitchListadoStep() {
  syncPitchTourLayoutBodyClasses('listado_problemas');
  setUiDensity('normal');
  setRoundOverviewMode(false);
  switchAppTab('nota');
  switchInnerTab('listado', { forceRender: true });
  seedPitchListadoIfNeeded();
  if (typeof rt.renderListadoForm === 'function') rt.renderListadoForm();
}

/** Paso Modo Pase: densidad pase + tablero unificado (#appcontent-pase). */
function applyPitchPaseModeStep() {
  syncPitchTourLayoutBodyClasses('pitch_modo_pase');
  clearPaseDetailEscape();
  setUiDensity('pase');
  invalidatePaseBoardCache();
  seedPitchDemoTodos();
  switchAppTab('nota');
  syncPaseModeHeaderChip();
  renderPaseBoard();
  refreshAllTodoUIs();
}

export function applyPitchTourStep(stepId) {
  var t = getPitchTourTarget(stepId);
  if (!t) return;

  if (isPitchFullscreenSlide(stepId)) {
    clearPitchSpotlightAncestors();
    document
      .querySelectorAll(
        '.tour-spotlight-pitch, .tour-spotlight-pitch-secondary, .tour-spotlight-soap, .tour-spotlight-action'
      )
      .forEach(function (el) {
        el.classList.remove(
          'tour-spotlight-pitch',
          'tour-spotlight-pitch-secondary',
          'tour-spotlight-soap',
          'tour-spotlight-action'
        );
      });
    showPitchScrim(false);
    if (stepId === 'wrap') {
      closePitchTourOverlays();
      switchAppModeForPitch('sala');
      setUiDensity('normal');
    }
    showPitchSlideForStep(stepId);
    return;
  }
  showPitchSlideForStep(null);

  closePitchTourOverlays({
    keepConnection: stepId === 'livesync_mobile',
    keepSettings: stepId === 'pitch_seguridad',
  });

  if (stepId === 'pitch_switch_interconsulta' || t.switchMode === 'interconsulta') {
    switchAppModeForPitch('interconsulta');
  } else if (stepId === 'wrap') {
    switchAppModeForPitch('sala');
    setUiDensity('normal');
  } else if (stepId !== 'pitch_modo_pase') {
    setUiDensity('normal');
  }

  if (stepId === 'listado_problemas') {
    applyPitchListadoStep();
  } else if (stepId === 'pitch_modo_pase') {
    applyPitchPaseModeStep();
  } else {
    syncPitchTourLayoutBodyClasses(stepId);
    if (t.appTab) rt.switchAppTab(t.appTab);
    if (t.innerTab) {
      if (
        typeof rt.setRoundOverviewMode === 'function' &&
        (t.innerTab === 'listado' ||
          t.innerTab === 'notas' ||
          t.innerTab === 'indica' ||
          t.innerTab === 'recetaHu' ||
          t.innerTab === 'tend' ||
          t.innerTab === 'cult')
      ) {
        rt.setRoundOverviewMode(false);
      }
      rt.switchInnerTab(t.innerTab);
      if (t.innerTab === 'notas') renderNoteForm();
      else if (t.innerTab === 'indica') renderIndicaForm();
    }
  }

  rt.closeProfileModal();
  if (t.openSettings) ensureSettingsExpandedForPitch();
  else if (typeof rt.closeSettingsDropdown === 'function') rt.closeSettingsDropdown();
  if (t.openConnection) ensureConnectionExpandedForPitch();
  else if (typeof closeConnectionDropdown === 'function') closeConnectionDropdown();

  if (stepId === 'sala_med') rt.renderMedRecetaPanel();

  if (stepId === 'sala_casiopea_trends') {
    closeSesionIngresoTrendsSendModal();
  }

  if (stepId === 'map_lab_teaser') {
    var li = document.getElementById('lab-input');
    if (li && pitchLabPasteText) li.value = pitchLabPasteText;
  }
  if (stepId === 'pitch_lab_ready') {
    if (typeof rt.renderLabHistoryPanel === 'function') rt.renderLabHistoryPanel();
    setTimeout(function () {
      if (!pitchTourActive || pitchStepId !== 'pitch_lab_ready') return;
      runPitchLabProcess();
      finishPitchLabReadyStep(t);
    }, 120);
  }
  if (stepId === 'sala_casiopea_lab') {
    var tablesBtn = document.getElementById('lab-some-tables-btn');
    if (tablesBtn) {
      tablesBtn.removeAttribute('hidden');
      tablesBtn.setAttribute('aria-hidden', 'false');
    }
    setTimeout(function () {
      if (!pitchTourActive || pitchStepId !== 'sala_casiopea_lab') return;
      openPitchSomeTablesModal();
      syncPitchTourModalChrome('sala_casiopea_lab');
      applyPitchSpotlights(t);
      schedulePitchDockPlacement();
    }, 320);
  }
  if (stepId === 'lab_bulk_separator' && typeof rt.openLabBulkTourHintModal === 'function') {
    setTimeout(function () {
      if (!pitchTourActive || pitchStepId !== 'lab_bulk_separator') return;
      rt.openLabBulkTourHintModal();
      syncPitchTourModalChrome('lab_bulk_separator');
    }, 200);
  }
  if (stepId === 'pitch_cultivos') {
    invalidateCultivosTableCache();
    if (typeof rt.renderLabHistoryPanel === 'function') rt.renderLabHistoryPanel();
    setTimeout(function () {
      if (!pitchTourActive || pitchStepId !== 'pitch_cultivos') return;
      invalidateCultivosTableCache();
      try {
        renderCultivosTable();
      } catch (_e) {}
      var wrap = document.querySelector('#cultivos-table-container .cultivos-table-wrap');
      if (wrap) {
        try {
          wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (_e2) {}
      }
      applyPitchSpotlights(t);
      schedulePitchDockPlacement();
    }, 280);
  }
  if (stepId === 'sala_tend_chart') {
    setTimeout(function () {
      if (!pitchTourActive || pitchStepId !== 'sala_tend_chart') return;
      openPitchTendChartModal();
      syncPitchTourModalChrome('sala_tend_chart');
      setTimeout(function () {
        if (!pitchTourActive || pitchStepId !== 'sala_tend_chart') return;
        scrollPitchTendChartIntoView();
        applyPitchSpotlights(t);
        schedulePitchDockPlacement();
      }, 120);
    }, 280);
  }
  if (stepId === 'pitch_modo_pase') {
    setTimeout(function () {
      if (!pitchTourActive || pitchStepId !== 'pitch_modo_pase') return;
      scrollPitchPaseBoardIntoView();
      applyPitchSpotlights(t);
      schedulePitchDockPlacement();
    }, 220);
  }
  if (stepId === 'pitch_switch_interconsulta') {
    setTimeout(function () {
      if (!pitchTourActive || pitchStepId !== 'pitch_switch_interconsulta') return;
      applyPitchSpotlights(t);
      schedulePitchDockPlacement();
    }, 360);
  }
  if (stepId === 'pitch_pegar_monitoreo') {
    setTimeout(function () {
      if (!pitchTourActive || pitchStepId !== 'pitch_pegar_monitoreo') return;
      openPitchMonitoreoPasteModal();
      syncPitchTourModalChrome('pitch_pegar_monitoreo');
      applyPitchSpotlights(t);
      schedulePitchDockPlacement();
    }, 220);
  }
  if (stepId === 'pitch_seguridad') {
    var det = document.getElementById('settings-accordion-backup-sync');
    if (det) det.open = true;
    setTimeout(function () {
      if (!pitchTourActive || pitchStepId !== 'pitch_seguridad') return;
      var acc = document.getElementById('settings-accordion-backup-sync');
      if (acc) {
        try {
          acc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (_e) {}
      }
      applyPitchSpotlights(t);
      schedulePitchDockPlacement();
    }, 280);
  }

  clearPitchTourVisuals();
  showPitchScrim(false);
  syncPitchTourModalChrome(stepId);

  if (!t.selector) return;
  if (
    stepId === 'pitch_lab_ready' ||
    stepId === 'sala_casiopea_lab' ||
    stepId === 'pitch_cultivos' ||
    stepId === 'sala_tend_chart' ||
    stepId === 'pitch_pegar_monitoreo' ||
    stepId === 'pitch_modo_pase' ||
    stepId === 'pitch_switch_interconsulta' ||
    stepId === 'pitch_seguridad'
  ) {
    return;
  }
  var delay = 180;
  setTimeout(function () {
    if (!pitchTourActive || pitchStepId !== stepId) return;
    var els = querySelectorList(t.selector);
    if (!els.length) return;
    try {
      els[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_e) {}
    applyPitchSpotlights(t);
    schedulePitchDockPlacement();
    if (t.focus && typeof els[0].focus === 'function') {
      try {
        els[0].focus({ preventScroll: true });
      } catch (_e2) {
        try {
          els[0].focus();
        } catch (_e3) {}
      }
    }
  }, delay);
}

function pitchTourBodyHtml(calloutLabel, paragraphs) {
  var html = '';
  if (calloutLabel) {
    html += '<p class="tour-pitch-callout">' + esc(calloutLabel) + '</p>';
  }
  for (var i = 0; i < paragraphs.length; i++) {
    html += '<p style="margin:0' + (i < paragraphs.length - 1 ? ' 0 8px' : '') + ';line-height:1.5;">' + paragraphs[i] + '</p>';
  }
  return html;
}

const PITCH_SLIDE_BADGE = {
  pitch_intro: 'Pitch · Intro',
  pitch_problem_laboratoriazo: 'Pitch · El problema',
  wrap: 'Pitch · Cierre',
};

export function getPitchStepBadgeText(stepId) {
  if (PITCH_SLIDE_BADGE[stepId]) return PITCH_SLIDE_BADGE[stepId];
  const t = getPitchTourTarget(stepId);
  if (t && t.calloutLabel) return String(t.calloutLabel);
  return 'Pitch';
}

export function renderPitchTourStep() {
  if (!pitchTourActive) return;
  var badge = document.getElementById('tour-step-badge');
  var bodyEl = document.getElementById('tour-dock-body');
  var nextBtn = document.getElementById('tour-btn-next');
  var dock = document.getElementById('tour-dock');
  var steps = getPitchTourSteps();
  var total = steps.length;
  var idx = pitchTourIdx + 1;
  var t = getPitchTourTarget(pitchStepId);

  if (dock && !isPitchFullscreenSlide(pitchStepId)) dock.classList.add('tour-dock-visible');
  if (dock) dock.classList.add('tour-dock--pitch');
  if (badge) badge.textContent = getPitchStepBadgeText(pitchStepId);

  var slideNext = document.querySelector('.tour-pitch-slide-next');
  if (slideNext) {
    slideNext.textContent = pitchStepId === 'wrap' ? 'Finalizar' : 'Siguiente';
  }

  if (!bodyEl || !nextBtn) return;
  nextBtn.style.display = '';
  nextBtn.disabled = false;
  nextBtn.textContent = pitchStepId === 'wrap' ? 'Finalizar' : 'Siguiente';

  var callout = t && t.calloutLabel ? t.calloutLabel : '';

  switch (pitchStepId) {
    case 'pitch_intro':
    case 'pitch_problem_laboratoriazo':
    case 'wrap':
      if (dock) dock.classList.remove('tour-dock-visible');
      break;
    case 'map_sidebar':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        '<strong>DEMO PÉREZ</strong> y <strong>DEMO GARCÍA</strong> solo existen para esta presentación.',
      ]);
      break;
    case 'map_tabs':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Arriba: <strong>Laboratorio</strong>, <strong>Expediente</strong>, <strong>Medicamentos</strong>, <strong>Agenda</strong>.',
      ]);
      break;
    case 'pitch_mode_chips':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Alterna <strong>Sala</strong> (hospitalización) e <strong>Interconsulta</strong> (consulta + Word).',
      ]);
      break;
    case 'map_lab_teaser':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Texto SOME con <strong>dos días</strong> ya cargado; en producción pegas del hospital.',
      ]);
      break;
    case 'lab_bulk_separator':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Entre pacientes distintos usa el <strong>separador</strong> (botón gris). Ventana opcional.',
      ]);
      break;
    case 'pitch_lab_ready':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'El reporte se <strong>procesa aquí</strong>: diagramas, tabla y bloques de cultivos en el panel.',
      ]);
      break;
    case 'sala_casiopea_lab':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Tablas del reporte SOME: estudios en filas, valores y referencia. El botón <strong>Tablas</strong> en Laboratorio abre esta vista.',
        'Se cierra con <strong>Siguiente</strong>. Neo no se abre en el pitch.',
      ]);
      break;
    case 'sala_expediente_tabs':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Expediente en cuatro pestañas: <strong>Paciente</strong>, <strong>Clínico</strong>, <strong>Resultados</strong>, <strong>Salida</strong>.',
      ]);
      break;
    case 'pitch_cultivos':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Tabla con <strong>S / I / R</strong> y comentarios <strong>ESBL</strong> — como en producción.',
      ]);
      break;
    case 'sala_tend':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Mini-gráficas cuando hay varios laboratorios en el tiempo.',
      ]);
      break;
    case 'sala_tend_chart':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Gráfica a pantalla completa abierta para la audiencia. <strong>Siguiente</strong> la cierra.',
      ]);
      break;
    case 'sala_casiopea_trends':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        '<strong>Enviar a Neo</strong> desde tendencias; en el pitch no se envían datos.',
      ]);
      break;
    case 'estado_actual':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Signos vitales, glucometrías, balance <strong>I/O</strong> y gráficas de <strong>3 días</strong>.',
      ]);
      break;
    case 'pitch_pegar_monitoreo':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Texto de monitoreo de ejemplo ya cargado; en uso real pegas del hospital.',
      ]);
      break;
    case 'sala_med':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Receta hospitalaria demo con dos fármacos para SOAP / tratamiento.',
      ]);
      break;
    case 'listado_problemas':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Exporta listado de problemas a Word (ejemplo peritonitis con incisos A–C).',
      ]);
      break;
    case 'pitch_modo_pase':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Vista <strong>Pase</strong>: resumen de ronda en una columna. También <strong>⌘/Ctrl+P</strong>.',
      ]);
      break;
    case 'pitch_switch_interconsulta':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Cambia a <strong>Interconsulta</strong> (chip arriba) para nota, indicaciones y Receta HU.',
      ]);
      break;
    case 'ic_expediente_tabs':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        '<strong>Nota</strong>, <strong>Indicaciones</strong>, <strong>Resultados</strong> y <strong>Salida</strong> (Receta HU).',
      ]);
      break;
    case 'ic_nota':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Genera <strong>Nota (.docx)</strong> (evolución prellenada) o continúa sin Word.',
      ]);
      nextBtn.textContent = 'Siguiente (sin generar)';
      break;
    case 'ic_indica':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Exporta <strong>Indicaciones (.docx)</strong> o continúa sin generar.',
      ]);
      nextBtn.textContent = 'Siguiente (sin generar)';
      break;
    case 'pitch_receta_hu':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Receta HU oficial <strong>PDF</strong> con medicamentos y labs demo.',
      ]);
      break;
    case 'pitch_agenda':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Agenda con procedimientos y estudios programados para DEMO PÉREZ.',
      ]);
      break;
    case 'livesync_desktop':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Icono <strong>⇄</strong>: sala en vivo entre <strong>dispositivos</strong> del equipo (pacientes, labs, agenda).',
      ]);
      break;
    case 'livesync_mobile':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        '<strong>Copiar enlace móvil</strong> para iPad/Safari en la misma Wi‑Fi.',
      ]);
      break;
    case 'pitch_seguridad':
      bodyEl.innerHTML = pitchTourBodyHtml(callout, [
        'Respaldos JSON, sync y recuperación en <strong>Ajustes</strong>.',
      ]);
      break;
    default:
      bodyEl.innerHTML = '';
  }

  syncPitchDockPlacement();
}

function showTourDock() {
  var d = document.getElementById('tour-dock');
  if (d) d.classList.add('tour-dock-visible');
}

function hideTourDockPitch() {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  resetPitchTourDockPosition(d);
  d.classList.remove('tour-dock-visible');
  d.classList.remove('tour-dock-collapsed');
  d.classList.remove('tour-dock-pos-left');
  d.classList.remove('tour-dock--pitch');
}

function getPitchDemoState() {
  return {
    patients,
    notes,
    indicaciones,
    labHistory,
    listadoProblemas,
    medRecetaByPatient,
    medNotaSelectionByPatient,
    recetaHuByPatient,
    setPatients,
    saveState,
    renderPatientList,
    selectPatient,
    getActiveId: function () {
      return rt.getActiveId();
    },
    setActiveId: function (id) {
      rt.setActiveId(id);
    },
  };
}

export function recoverPitchTourPatientsOnBoot() {
  var state = getPitchDemoState();
  var recovered = false;
  try {
    if (sessionStorage.getItem('rpc-pitch-tour-active') === '1') {
      setPersistPatientsResolver(null);
      setPitchPatientIsolation(false);
      clearPitchDemo(state);
      recovered = true;
    }
  } catch (_e) {}
  if (!recovered && tryRecoverPatientsFromPitchSandboxIfNeeded(state)) {
    recovered = true;
  }
  if (!recovered) return false;
  renderPatientList();
  if (rt.getActiveId()) selectPatient(rt.getActiveId());
  else if (patients.length) selectPatient(patients[0].id);
  return true;
}

export function stopPitchTour(opts) {
  var celebrate = opts && opts.celebrate;
  closePitchTourOverlays();
  removePitchDockListeners();
  if (pitchDockRepositionRaf) {
    cancelAnimationFrame(pitchDockRepositionRaf);
    pitchDockRepositionRaf = 0;
  }
  setPersistPatientsResolver(null);
  setPitchPatientIsolation(false);
  clearPitchTourVisuals();
  pitchTourActive = false;
  pitchStepId = null;
  pitchTourIdx = 0;
  publishPitchGuardContext();
  hideTourDockPitch();
  setUiDensity('normal');
  switchAppModeForPitch('sala');
  clearPitchDemo(getPitchDemoState());
  markPitchTourSessionActive(false);
  document.body.classList.remove('pitch-tour-active', 'pitch-step-listado', 'pitch-step-pase-mode');
  limpiarReporte();
  if (typeof rt.closeLabBulkTourHintModal === 'function') rt.closeLabBulkTourHintModal();
  if (typeof rt.closeSettingsDropdown === 'function') rt.closeSettingsDropdown();
  closeConnectionDropdown();
  var pv = document.getElementById('patient-view');
  var es = document.getElementById('empty-state');
  if (!rt.getActiveId()) {
    if (pv) pv.style.display = 'none';
    if (es) es.style.display = 'flex';
  } else {
    selectPatient(rt.getActiveId());
  }
  if (celebrate && typeof rt.launchConfetti === 'function') rt.launchConfetti();
}

export function skipPitchTour() {
  stopPitchTour();
  rt.showToast('Tour pitch cerrado', 'info');
}

export function startPitchTour() {
  if (pitchTourActive) return;
  setUiDensity('normal');
  switchAppModeForPitch('sala');
  setPersistPatientsResolver(resolvePitchPersistPatients);
  markPitchTourSessionActive(true);
  var seeded = seedPitchDemo(getPitchDemoState());
  pitchLabPasteText = seeded.labPasteText;
  invalidateCultivosTableCache();

  pitchTourActive = true;
  pitchTourIdx = 0;
  pitchStepId = getPitchTourSteps()[0];
  ensurePitchDockListeners();
  publishPitchGuardContext();
  var pv = document.getElementById('patient-view');
  var es = document.getElementById('empty-state');
  if (pv) pv.style.display = '';
  if (es) es.style.display = 'none';
  applyPitchTourStep(pitchStepId);
  if (!isPitchFullscreenSlide(pitchStepId)) showTourDock();
  renderPitchTourStep();
}

export function pitchTourClickNext() {
  if (!pitchTourActive) return;
  var steps = getPitchTourSteps();
  if (pitchStepId === 'wrap') {
    stopPitchTour({ celebrate: true });
    rt.showToast('Tour pitch completado', 'success');
    return;
  }

  if (pitchStepId === 'pitch_modo_pase') {
    document.body.classList.remove('pitch-step-pase-mode');
    setUiDensity('normal');
    invalidatePaseBoardCache();
    if (typeof rt.renderRoundOverviewPanels === 'function') rt.renderRoundOverviewPanels();
  }
  closePitchTourOverlays();

  if (pitchTourIdx + 1 >= steps.length) return;
  pitchTourIdx += 1;
  pitchStepId = steps[pitchTourIdx];
  publishPitchGuardContext();
  closeLabBulkPreviewModal();
  applyPitchTourStep(pitchStepId);
  if (!isPitchFullscreenSlide(pitchStepId)) showTourDock();
  renderPitchTourStep();
}

export function pitchTourAdvanceAfter(actionStep) {
  if (!pitchTourActive || pitchStepId !== actionStep) return;
  var steps = getPitchTourSteps();
  var i = steps.indexOf(actionStep);
  if (i < 0 || i + 1 >= steps.length) return;
  pitchTourIdx = i + 1;
  pitchStepId = steps[pitchTourIdx];
  publishPitchGuardContext();
  applyPitchTourStep(pitchStepId);
  renderPitchTourStep();
}

export function unlockPitchTour() {
  try {
    localStorage.setItem(PITCH_TOUR_UNLOCK_LS_KEY, '1');
  } catch (_e) {}
  syncPitchTourUnlockButton();
  rt.showToast('Tour pitch desbloqueado', 'success');
}

export function syncPitchTourUnlockButton() {
  var btn = document.getElementById('btn-start-pitch-tour');
  if (!btn) return;
  var unlocked = false;
  try {
    unlocked = localStorage.getItem(PITCH_TOUR_UNLOCK_LS_KEY) === '1';
  } catch (_e) {}
  btn.style.display = unlocked ? '' : 'none';
}

/** ⌥⌘⇧P — usa e.code: con Option, macOS suele cambiar e.key (≠ "p"). */
export function isPitchTourUnlockShortcut(e) {
  if (!e || !e.altKey || !e.shiftKey) return false;
  if (!(e.metaKey || e.ctrlKey)) return false;
  if (e.code === 'KeyP') return true;
  return String(e.key || '').toLowerCase() === 'p';
}

export function initPitchTourUnlockShortcut() {
  if (initPitchTourUnlockShortcut._bound) return;
  initPitchTourUnlockShortcut._bound = true;
  if (typeof window !== 'undefined') {
    window.unlockPitchTour = unlockPitchTour;
  }
  document.addEventListener(
    'keydown',
    function (e) {
      if (!isPitchTourUnlockShortcut(e)) return;
      var tag = e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target && e.target.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      unlockPitchTour();
    },
    true
  );
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initPitchTourUnlockShortcut();
    });
  } else {
    initPitchTourUnlockShortcut();
  }
}
