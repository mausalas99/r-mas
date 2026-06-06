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
  getTourStepsForChapter,
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
import {
  applyTourDemoIngresoDates,
  buildTourDemoDates,
  buildTourDemoLabPasteBoth,
} from '../../tour-demo-dates.mjs';
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
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { getUiDensity, setUiDensity, isGuardiaMode } from '../chrome.mjs';
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
  TOUR_STEPS_USE_DEMO_PEREZ,
  ensureTourPrimaryDemoPatientActive,
  ensureTourDemoLabInputBoth,
  findTourDemoPerezPatient,
  getDemoTourLabPaste,
  getTourDemoDateBundle,
  tourDemoLabPasteHasBoth,
} from './tour-demo-seed.mjs';

import { tourState, publishTourGuardContext, GUIDED_TOUR_LS_KEY } from './tour-state.mjs';
import { tourBridge } from './tour-bridge.mjs';

const rt = getSettingsHelpRuntime();


/** Tour intro, dock, step targets */
function parseSemverCoreParts(versionLabel) {
  var s = normalizeTourVersionLabel(versionLabel);
  if (s === 'dev') return null;
  var core = s.split('-')[0].split('+')[0];
  var parts = core.split('.');
  var nums = [];
  for (var i = 0; i < parts.length; i++) {
    var n = parseInt(parts[i], 10);
    if (isNaN(n)) return null;
    nums.push(n);
  }
  return nums.length ? nums : null;
}

/** >0 si a mayor que b; <0 si menor; 0 si igual. */
function compareSemverNumericArrays(a, b) {
  var len = Math.max(a.length, b.length);
  for (var i = 0; i < len; i++) {
    var ai = a[i] || 0;
    var bi = b[i] || 0;
    if (ai !== bi) return ai > bi ? 1 : -1;
  }
  return 0;
}

/** Mostrar bienvenida solo en primera ejecución o tras actualizar a una versión más nueva (semver). */
export function shouldShowGuidedTourIntro(currentVersion, storedDoneVersionRaw) {
  var cur = normalizeTourVersionLabel(currentVersion);
  if (storedDoneVersionRaw == null || String(storedDoneVersionRaw).trim() === '') return true;
  var done = String(storedDoneVersionRaw).trim();
  if (cur === done) return false;
  var pc = parseSemverCoreParts(cur);
  var pd = parseSemverCoreParts(done);
  if (pc && pd) return compareSemverNumericArrays(pc, pd) > 0;
  return cur !== done;
}

function resolveAppVersionForTour() {
  if (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
    return window.electronAPI.getAppVersion().catch(function() { return 'dev'; });
  }
  return Promise.resolve('dev');
}

export function normalizeTourVersionLabel(v) {
  var s = String(v == null ? '' : v).trim();
  return s || 'dev';
}

function shouldDeferGuidedTourForRegistration() {
  try {
    var settingsRaw = localStorage.getItem('rpc-settings');
    var settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    if (settings && settings.clinicalRegistered !== true) return true;
    if (settings && settings.clinicalLocalOnly !== true && settings.clinicalLocalOnly !== false) {
      return true;
    }
    if (document.documentElement.classList.contains('clinical-onboarding-active')) return true;
  } catch (_e) {}
  return false;
}

export async function tryShowPostRegistrationEducationIfNeeded() {
  if (isMobileWeb() || shouldDeferGuidedTourForRegistration()) return;
  const { needsClinicalOnboarding } = await import('../clinical-onboarding.mjs');
  if (needsClinicalOnboarding()) return;

  const cur = normalizeTourVersionLabel(window.__RPC_APP_VERSION__);
  const prev = normalizeTourVersionLabel(window.__RPC_PREV_APP_VERSION__ || '');
  let stored = '';
  try {
    stored = localStorage.getItem(GUIDED_TOUR_LS_KEY) || '';
  } catch (_ls) {}
  const { isGuardiaV7TrackComplete } = await import('../../guardia-v7-progress.mjs');
  const { shouldOfferGuardiaV7Education, shouldShowFundamentosTourIntro } = await import(
    '../../guardia-v7-gating.mjs'
  );

  if (shouldOfferGuardiaV7Education({
    prevVersion: prev,
    curVersion: cur,
    needsOnboarding: false,
    trackComplete: isGuardiaV7TrackComplete(),
  })) {
    const { maybeShowGuardiaV7UpgradeCard } = await import('./guardia-v7-upgrade-card.mjs');
    maybeShowGuardiaV7UpgradeCard({ delayMs: 2000 });
    return;
  }
  if (shouldShowFundamentosTourIntro({ curVersion: cur, storedDoneVersion: stored, needsOnboarding: false })) {
    markGuidedTourVersionDone();
    setTimeout(() => {
      void import('./learn-hub.mjs').then((hub) => {
        if (typeof hub.openLearnHub === 'function') hub.openLearnHub({ focusTrack: 'fundamentos' });
      });
    }, 80);
  }
}

export function tryShowGuidedTourIntroIfNeeded() {
  void tryShowPostRegistrationEducationIfNeeded();
}

function initGuidedTourGate() {
  if (isMobileWeb()) return;
  void import('./learn-hub.mjs').then(function (hub) {
    if (typeof hub.syncLearnAprenderChrome === 'function') hub.syncLearnAprenderChrome();
  });
  resolveAppVersionForTour()
    .then(function (v) {
      window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
      void tryShowPostRegistrationEducationIfNeeded();
    })
    .catch(function () {
      window.__RPC_APP_VERSION__ = 'dev';
      void tryShowPostRegistrationEducationIfNeeded();
    });
}

export function showTourIntroModal() {
  var el = document.getElementById('onboarding-intro-backdrop');
  if (!el) return;
  try { settingsHelpBridge.closeReleaseNotes(); } catch (_e) {}
  var ver = normalizeTourVersionLabel(window.__RPC_APP_VERSION__);
  var h2 = document.getElementById('intro-modal-title');
  if (h2) h2.textContent = ver && ver !== 'dev' ? ('R+ · versión ' + ver) : 'Bienvenido a R+';
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
}

/** Resolve app version then open Learn Hub (Fundamentos track). */
export function openTutorialIntroFromSettings() {
  return resolveAppVersionForTour()
    .then(function (v) {
      window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
      return import('./learn-hub.mjs').then((hub) => {
        if (typeof hub.openLearnHub === 'function') hub.openLearnHub({ focusTrack: 'fundamentos' });
      });
    })
    .catch(function () {
      window.__RPC_APP_VERSION__ = 'dev';
      return import('./learn-hub.mjs').then((hub) => {
        if (typeof hub.openLearnHub === 'function') hub.openLearnHub({ focusTrack: 'fundamentos' });
      });
    });
}

export function hideTourIntroModal() {
  var el = document.getElementById('onboarding-intro-backdrop');
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
}

function markGuidedTourVersionDone() {
  try {
    localStorage.setItem(GUIDED_TOUR_LS_KEY, normalizeTourVersionLabel(window.__RPC_APP_VERSION__));
  } catch (_e) {}
}

function guidedTourIntroSkip() {
  markGuidedTourVersionDone();
  hideTourIntroModal();
}

function launchGuidedTourBranch(branch) {
  hideTourIntroModal();
  tourState.guidedTourMode = 'base';
  void import('./tour-flow.mjs').then((mod) => {
    if (typeof mod.startOnboarding === 'function') mod.startOnboarding(branch);
  });
}

function guidedTourIntroChooseSala() {
  launchGuidedTourBranch('sala');
}

function guidedTourIntroChooseInterconsulta() {
  launchGuidedTourBranch('interconsulta');
}

export function syncLearnHubContinueVisibility() {
  var btn = document.getElementById('btn-learn-continue');
  if (btn) {
    var p = loadTourProgress();
    btn.style.display = p && !tourState.guidedTourActive ? '' : 'none';
  }
  var hubBd = document.getElementById('learn-hub-backdrop');
  if (hubBd && hubBd.classList.contains('open')) {
    void import('./learn-hub.mjs').then(function (hub) {
      if (typeof hub.renderLearnHubBody === 'function') hub.renderLearnHubBody('guardia-v7');
    });
  }
}

function resolveTourBranch() {
  if (tourState.guidedTourBranch === 'interconsulta') return 'interconsulta';
  if (tourState.guidedTourBranch === 'guardia-v7') return 'guardia-v7';
  if (tourState.guidedTourBranch === 'quick-route') return 'quick-route';
  return 'sala';
}

function persistTourProgressDebounced() {
  if (!tourState.guidedTourActive || !tourState.tourStepId) return;
  if (tourState.persistTourProgressTimer) clearTimeout(tourState.persistTourProgressTimer);
  tourState.persistTourProgressTimer = setTimeout(function () {
    tourState.persistTourProgressTimer = null;
    var branch = resolveTourBranch();
    var ch = getChapterForStep(tourState.tourStepId, branch);
    saveTourProgress({
      branch: branch,
      track: branch,
      stepId: tourState.tourStepId,
      chapterId: ch.id,
      mode: tourState.guidedTourMode,
    });
    syncLearnHubContinueVisibility();
  }, 300);
}

function resetTourUiBeforeResume() {
  clearAllTourSpotlights();
  clearTourSoapButtonHighlight();
  if (typeof closeSettingsDropdown === 'function') closeSettingsDropdown();
  if (typeof closeConnectionDropdown === 'function') closeConnectionDropdown();
  rt.closeProfileModal();
  closeLabSomeTablesModal();
  closeLabBulkTourHintModal();
  closeSesionIngresoTrendsSendModal();
  closeTendGroupModal();
  closeSOAPModal();
  hideTourIntroModal();
  settingsHelpBridge.closeQuickHelp();
}

function showTourDock() {
  document.getElementById('tour-dock').classList.add('tour-dock-visible');
}

function hideTourDock() {
  clearTourActionPoll();
  var d = document.getElementById('tour-dock');
  if (!d) return;
  d.classList.remove('tour-dock-visible');
  d.classList.remove('tour-dock-collapsed');
  d.classList.remove('tour-dock-pos-left');
  d.classList.remove('tour-dock--guardia');
  d.classList.remove('tour-dock--fundamentos');
  d.classList.remove('tour-dock--quick-route');
  var btn = document.getElementById('btn-tour-collapse');
  if (btn) { btn.textContent = '–'; btn.setAttribute('aria-label', 'Minimizar tutorial'); }
}

// Colapsa el dock a sólo el encabezado (badge + acciones) para que el
// tour deje de bloquear el contenido. Se reexpande con el mismo botón.
function toggleTourDockCollapsed() {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  setTourDockCollapsed(!d.classList.contains('tour-dock-collapsed'));
}

function setTourDockCollapsed(collapsed) {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  if (collapsed) d.classList.add('tour-dock-collapsed');
  else d.classList.remove('tour-dock-collapsed');
  var btn = document.getElementById('btn-tour-collapse');
  if (btn) {
    btn.textContent = collapsed ? '+' : '–';
    btn.setAttribute('aria-label', collapsed ? 'Expandir tutorial' : 'Minimizar tutorial');
  }
}

// Click en cualquier parte del dock colapsado lo expande (excepto en
// los botones del encabezado, que ya tienen su propio handler).
function onTourDockClick(ev) {
  var d = document.getElementById('tour-dock');
  if (!d || !d.classList.contains('tour-dock-collapsed')) return;
  var t = ev && ev.target;
  if (t && t.closest && t.closest('.btn-tour-skip, .btn-tour-collapse, .btn-tour-next, .btn-tour-prev, .btn-tour-pause')) return;
  setTourDockCollapsed(false);
  ev.stopPropagation();
}

function openLabBulkTourHintModal() {
  ensureTourDemoLabInputBoth();
  var backdrop = document.getElementById('lab-bulk-tour-hint-backdrop');
  var sample = document.getElementById('lab-bulk-tour-hint-sample');
  var leads = backdrop ? backdrop.querySelectorAll('.lab-bulk-tour-hint-lead') : [];
  var insertBtn = backdrop
    ? backdrop.querySelector('button[onclick*="insertLabTourSecondPatientExample"]')
    : null;
  if (sample) {
    sample.textContent =
      LAB_BULK_PATIENT_SEPARATOR +
      '\n\n' +
      getTourDemoDateBundle().demoGarciaLabReport.trim();
  }
  if (leads[0]) {
    leads[0].innerHTML =
      'En el cuadro <strong>ya están cargados</strong> dos días de <strong>DEMO PÉREZ</strong> y, tras el separador, el reporte de <strong>DEMO GARCÍA</strong>. R+ los distingue por paciente y por fecha al procesar.';
  }
  if (leads[1]) {
    leads[1].textContent =
      'En el siguiente paso pulsa Procesar: verás la tabla multi-paciente. Si pegas más reportes, usa el separador (botón gris) entre pacientes distintos.';
  }
  if (insertBtn) {
    insertBtn.style.display = tourDemoLabPasteHasBoth(
      document.getElementById('lab-input') && document.getElementById('lab-input').value
    )
      ? 'none'
      : '';
  }
  if (!backdrop) return;
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
}

export function closeLabBulkTourHintModal() {
  var backdrop = document.getElementById('lab-bulk-tour-hint-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
}

function insertLabTourSecondPatientExample() {
  if (ensureTourDemoLabInputBoth()) {
    rt.showToast('Ejemplo completo (PÉREZ + GARCÍA) ya está en el cuadro', 'info');
    closeLabBulkTourHintModal();
    return;
  }
  var ta = document.getElementById('lab-input');
  if (!ta) return;
  ta.value = getDemoTourLabPaste();
  closeLabBulkTourHintModal();
  rt.showToast('Ejemplo de laboratorio insertado ✓', 'success');
}

function seedDemoTrendHistory(ref) {
  try {
    var bundle = getTourDemoDateBundle(ref);
    var older = procesarLabs(bundle.olderDemoSomeLabReport).resLabs;
    var newer = procesarLabs(bundle.demoSomeLabReport).resLabs;
    labHistory[DEMO_PATIENT_ID] = [
      {
        id: 'tour-trend-1',
        fecha: bundle.labFechaOlder,
        hora: '',
        resLabs: older,
        parsed: extractParsedValues(older),
      },
      {
        id: 'tour-trend-2',
        fecha: bundle.labFechaNewer,
        hora: '',
        resLabs: newer,
        parsed: extractParsedValues(newer),
      },
    ];
  } catch (e) {
    delete labHistory[DEMO_PATIENT_ID];
  }
}

function seedDemoMonitoreoOnActivePatient() {
  ensureTourPrimaryDemoPatientActive();
}

function seedDemoListadoProblemas() {
  if (!tourState.guidedTourActive) return;
  if (!ensureTourPrimaryDemoPatientActive()) return;
  var perez = findTourDemoPerezPatient();
  if (!perez) return;
  var demoId = perez.id;
  var today = new Date();
  var fecha =
    String(today.getDate()).padStart(2, '0') + '/'
    + String(today.getMonth() + 1).padStart(2, '0') + '/'
    + today.getFullYear();
  var hora =
    String(today.getHours()).padStart(2, '0') + ':'
    + String(today.getMinutes()).padStart(2, '0');
  listadoProblemas[demoId] = buildTourDemoListadoProblemas(fecha, hora);
  saveState();
}

function ensureProfileExpandedForTour() {
  // Desde 3.0 el perfil vive en un modal centrado; lo abrimos directamente.
  rt.openProfileModal();
}

function ensureSettingsExpandedForTour() {
  var dd = document.getElementById('settings-dropdown');
  if (!dd) return;
  if (!dd.classList.contains('open')) toggleSettingsDropdown();
}

function ensureConnectionExpandedForTour() {
  if (typeof closeSettingsDropdown === 'function') closeSettingsDropdown();
  var dd = document.getElementById('connection-dropdown');
  if (!dd) return;
  if (!dd.classList.contains('open') && typeof openConnectionDropdown === 'function') {
    openConnectionDropdown();
  }
}

function clearTourSoapButtonHighlight() {
  var b = document.getElementById('btn-soap-template');
  if (b) b.classList.remove('tour-spotlight-soap');
}

function syncTourSoapButtonHighlight() {
  clearTourSoapButtonHighlight();
  if (!tourState.guidedTourActive || tourState.tourStepId !== 'sala_soap') return;
  setTimeout(function () {
    var btn = document.getElementById('btn-soap-template');
    if (btn && tourState.guidedTourActive && tourState.tourStepId === 'sala_soap') {
      btn.classList.add('tour-spotlight-soap');
    }
  }, 120);
}

function getGuidedTourSteps() {
  if (tourState.guidedTourMode === 'neo') return getNeoCompanionSteps();
  const branch = resolveTourBranch();
  if (tourState.guidedTourModuleOnly && tourState.guidedTourChapterScope) {
    const scoped = getTourStepsForChapter(tourState.guidedTourChapterScope, branch);
    if (scoped.length) return scoped;
  }
  return getTourSteps(branch);
}

function demoLabAlreadyProcessedForTour() {
  if (tourState.tourDemoLabSessionProcessed) return true;
  if (!tourState.guidedTourActive) return false;
  return tourDemoLabCompleteForTour(patients, labHistory);
}

function seedDemoEventualidadesOnActivePatient() {
  ensureTourPrimaryDemoPatientActive();
}

function openTourEstadoActualRegistroDemo() {
  var now = new Date();
  var atShift = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
  openEstadoActualRegistroModal();
  applyEstadoActualParsedToForm(getTourRegistroFormSample());
  var recorded = document.getElementById('ea-recorded-at');
  if (recorded && 'value' in recorded) {
    recorded.value = toDatetimeLocalValue(atShift);
  }
}

function isEstadoActualPostRegistroTourStep(id) {
  return id === 'estado_actual_review';
}

function prepareEstadoActualPanelForTour(onPanelReady) {
  ensureTourPrimaryDemoPatientActive();
  closeEstadoActualRegistroModal();
  invalidateEaPanelCache();
  try {
    renderEstadoActualPanel({
      onReady: function () {
        if (typeof onPanelReady === 'function') onPanelReady();
      },
    });
  } catch (err) {
    console.error('prepareEstadoActualPanelForTour:', err && err.message);
    if (typeof onPanelReady === 'function') onPanelReady();
  }
}

function isConnectionDropdownOpenForTour() {
  var dd = document.getElementById('connection-dropdown');
  if (dd && dd.classList.contains('open')) return true;
  var syncBtn = document.getElementById('btn-header-team-sync');
  return !!(syncBtn && syncBtn.getAttribute('aria-expanded') === 'true');
}

function isMobileInviteExpandedForTour() {
  var details = document.querySelector('details.lan-invite-collapsible--mobile');
  if (details && details.open) return true;
  var pairing = document.getElementById('lan-pairing-display-mobile');
  return !!(pairing && !pairing.hidden);
}

function isGuardiaEntregasFilterActiveForTour() {
  if (clinicalSessionContext && clinicalSessionContext.guardiaMode) return true;
  var boardBtn = document.getElementById('btn-guardia-mode-toggle');
  return !!(
    boardBtn &&
    (boardBtn.getAttribute('aria-pressed') === 'true' || boardBtn.classList.contains('is-active'))
  );
}

function clearTourActionPoll() {
  if (tourState.tourActionPollTimer) {
    clearInterval(tourState.tourActionPollTimer);
    tourState.tourActionPollTimer = null;
  }
  if (tourState.tourActionClickHandler) {
    document.removeEventListener('click', tourState.tourActionClickHandler, true);
    document.removeEventListener('toggle', tourState.tourActionClickHandler, true);
    tourState.tourActionClickHandler = null;
  }
}

function armTourActionPoll() {
  clearTourActionPoll();
  if (!tourState.guidedTourActive || !stepRequiresUserAction(tourState.tourStepId)) return;
  tourState.tourActionPollTimer = setInterval(syncTourActionNextButton, 300);
  tourState.tourActionClickHandler = function () {
    syncTourActionNextButton();
  };
  document.addEventListener('click', tourState.tourActionClickHandler, true);
  document.addEventListener('toggle', tourState.tourActionClickHandler, true);
}

function syncTourActionNextButton() {
  var nextBtn = document.getElementById('tour-btn-next');
  if (!nextBtn || !tourState.guidedTourActive) return;
  if (tourState.tourStepId === 'lab_parse' && demoLabAlreadyProcessedForTour()) {
    nextBtn.style.display = '';
    nextBtn.disabled = false;
    nextBtn.textContent = 'Siguiente';
  }
  if (tourState.tourStepId === 'servicio_default') {
    var st = rt.getSettings();
    if (st && String(st.defaultServicio || '').trim()) {
      nextBtn.style.display = '';
      nextBtn.textContent = 'Siguiente';
    }
  }
  if (
    (tourState.tourStepId === 'gv7_lan_wifi' || tourState.tourStepId === 'livesync_desktop') &&
    isConnectionDropdownOpenForTour()
  ) {
    nextBtn.style.display = '';
    nextBtn.disabled = false;
    nextBtn.textContent = 'Siguiente';
  }
  if (tourState.tourStepId === 'gv7_mobile_link' && isMobileInviteExpandedForTour()) {
    nextBtn.style.display = '';
    nextBtn.disabled = false;
    nextBtn.textContent = 'Siguiente';
  }
  if (tourState.tourStepId === 'gv7_guardia_toggle' && isGuardiaEntregasFilterActiveForTour()) {
    nextBtn.style.display = '';
    nextBtn.disabled = false;
    nextBtn.textContent = 'Siguiente';
  }
}

function guidedTourStepIndex() {
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourState.tourStepId);
  return i < 0 ? 0 : i;
}

// Quita cualquier resaltado del paso anterior antes de pintar el siguiente.
function clearAllTourSpotlights() {
  var cls = ['tour-spotlight-soap', 'tour-spotlight-action'];
  cls.forEach(function (c) {
    document.querySelectorAll('.' + c).forEach(function (el) { el.classList.remove(c); });
  });
}

// Pasos donde el botón resaltado suele estar arriba a la derecha: dock abajo-derecha lo tapa.
var TOUR_DOCK_LEFT_STEPS = {
  ic_nota: 1,
  ic_indica: 1,
  estado_actual_registro: 1,
  listado_problemas: 1,
  sala_casiopea_lab: 1,
  sala_casiopea_trends: 1,
  livesync_desktop: 1,
  livesync_mobile: 1,
  gv7_lan_wifi: 1,
  gv7_lan_pin: 1,
  gv7_mobile_link: 1,
  gv7_mobile_scope: 1,
  gv7_mobile_vs_sala: 1,
};

function syncTourDockPlacement() {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  var useLeft = false;
  if (tourState.guidedTourActive && tourState.tourStepId && TOUR_DOCK_LEFT_STEPS[tourState.tourStepId]) useLeft = true;
  if (tourState.miniTourActive && tourState.miniTourSteps && tourState.miniTourSteps[tourState.miniTourIdx] && tourState.miniTourSteps[tourState.miniTourIdx].dockLeft) {
    useLeft = true;
  }
  if (useLeft) d.classList.add('tour-dock-pos-left');
  else d.classList.remove('tour-dock-pos-left');
}

function tourApplySpotlightForStep(id, t, scrollDelayMs) {
  if (!t || !t.selector) return;
  var scrollDelay = scrollDelayMs != null ? scrollDelayMs : 140;
  setTimeout(function () {
    if (!tourState.guidedTourActive || tourState.tourStepId !== id) return;
    if (id === 'listado_problemas') rt.renderListadoForm();
    var el = document.querySelector(t.selector);
    if (!el) return;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    var spotlightCls = t.spotlightClass || (stepRequiresUserAction(id) ? 'tour-spotlight-soap' : null);
    if (spotlightCls) el.classList.add(spotlightCls);
    if (t.focus && typeof el.focus === 'function') {
      try { el.focus({ preventScroll: true }); } catch (e2) { try { el.focus(); } catch (e3) {} }
    }
  }, scrollDelay);
}

// Lleva al usuario al elemento del paso actual: cambia tab/tab interno,
// abre Mi Perfil/Ajustes si aplica, hace scroll y aplica spotlight para
// que la zona de avance sea inequívoca.
function applyGuardiaTourLayoutForStep(stepId) {
  void import('../../tour-guards.mjs').then((guards) => {
    if (!guards.isGuidedTourRunning()) return;
    if (guards.shouldShowGuardiaBoardWithoutEntrega(stepId)) {
      void Promise.all([
        import('../clinical-entrega.mjs'),
        import('../entrega-roster-panel.mjs'),
      ]).then(([entrega, roster]) => {
        entrega.endEntregaPhase();
        roster.closeEntregaRosterPanel();
        roster.deactivateTurnoActivo();
        document.documentElement.classList.remove('guardia-entrega-roster-open');
        if (typeof rt.renderGuardiaBoard === 'function') {
          rt.renderGuardiaBoard(rt.getSettings());
        }
      });
      return;
    }
    if (guards.shouldOpenEntregaRosterForTour(stepId)) {
      void import('../clinical-entrega.mjs').then((entrega) => {
        if (!entrega.isEntregaPhaseActive()) {
          void entrega.beginEntregaPhaseFlow({
            settings: rt.getSettings(),
            renderGuardiaBoard: rt.renderGuardiaBoard,
          });
          return;
        }
        void import('../entrega-roster-panel.mjs').then((roster) => {
          if (!roster.isEntregaRosterOpen()) {
            roster.openEntregaRosterPanel(rt.getSettings());
            rt.renderGuardiaBoard?.(rt.getSettings());
          }
        });
      });
    }
  });
}

function applyTourTargetForStep(id) {
  var tourBranch = resolveTourBranch();
  var t = getTourTarget(id, tourBranch);
  if (tourState.guidedTourActive && !t?.openGuardiaDensity) {
    setUiDensity('normal');
  }
  if (!t) return;

  if (t.openGuardiaDensity) {
    if (!isGuardiaMode()) {
      setUiDensity('guardia');
      if (typeof rt.renderGuardiaBoard === 'function') rt.renderGuardiaBoard(rt.getSettings());
    }
    applyGuardiaTourLayoutForStep(id);
  }
  if (t.exitGuardiaDensity && isGuardiaMode()) {
    setUiDensity('normal');
  }

  if (TOUR_STEPS_USE_DEMO_PEREZ[id]) {
    ensureTourPrimaryDemoPatientActive();
  }

  if (id === 'listado_problemas') {
    seedDemoListadoProblemas();
  }
  if (
    id === 'estado_actual' ||
    id === 'estado_actual_registro' ||
    isEstadoActualPostRegistroTourStep(id)
  ) {
    seedDemoMonitoreoOnActivePatient();
  }
  if (id === 'eventualidades') {
    seedDemoEventualidadesOnActivePatient();
  }
  if (t.appTab) rt.switchAppTab(t.appTab);
  if (t.innerTab) {
    if (id === 'listado_problemas') {
      rt.switchInnerTab('listado', { forceRender: true });
      rt.renderListadoForm();
    } else {
      rt.switchInnerTab(t.innerTab);
    }
    if (t.appTab === 'nota') {
      if (t.innerTab === 'notas') renderNoteForm();
      else if (t.innerTab === 'indica') renderIndicaForm();
    }
  }
  // Si el paso anterior abrió Mi Perfil o Ajustes y el siguiente no los
  // necesita, ciérralos para que no queden flotando encima del nuevo
  // objetivo (p. ej. servicio_default → lab_parse).
  if (t.openProfile) ensureProfileExpandedForTour();
  else rt.closeProfileModal();
  if (t.openConnection) ensureConnectionExpandedForTour();
  else if (t.openSettings) ensureSettingsExpandedForTour();
  else {
    if (typeof closeSettingsDropdown === 'function') closeSettingsDropdown();
    if (typeof closeConnectionDropdown === 'function') closeConnectionDropdown();
  }
  if (id === 'sala_med') rt.renderMedRecetaPanel();
  if (id === 'estado_actual' && tourState.guidedTourBranch !== 'interconsulta') {
    setTimeout(function () {
      if (!tourState.guidedTourActive || tourState.tourStepId !== 'estado_actual') return;
      prepareEstadoActualPanelForTour();
    }, 160);
  }
  if (id === 'estado_actual_registro' && tourState.guidedTourBranch !== 'interconsulta') {
    setTimeout(function () {
      if (!tourState.guidedTourActive || tourState.tourStepId !== 'estado_actual_registro') return;
      prepareEstadoActualPanelForTour(function () {
        if (!tourState.guidedTourActive || tourState.tourStepId !== 'estado_actual_registro') return;
        openTourEstadoActualRegistroDemo();
      });
    }, 160);
  }
  if (isEstadoActualPostRegistroTourStep(id) && tourState.guidedTourBranch !== 'interconsulta') {
    clearAllTourSpotlights();
    if (!t.selector) return;
    var postRegStepId = id;
    var spotlightDelay = 400;
    setTimeout(function () {
      if (!tourState.guidedTourActive || tourState.tourStepId !== postRegStepId) return;
      prepareEstadoActualPanelForTour(function () {
        tourApplySpotlightForStep(postRegStepId, t, spotlightDelay);
      });
    }, 160);
    return;
  }
  if (id === 'map_lab_teaser' || id === 'lab_parse') {
    ensureTourDemoLabInputBoth();
  }

  if (id === 'sala_casiopea_lab') {
    closeLabSomeTablesModal();
  }
  if (id === 'sala_casiopea_trends') {
    closeTendGroupModal();
    closeSesionIngresoTrendsSendModal();
  }
  if (id === 'sala_med' || id === 'listado_problemas') {
    closeSOAPModal();
  }

  clearAllTourSpotlights();
  if (!t.selector) return;
  var scrollDelay = id === 'listado_problemas' ? 280 : 140;
  tourApplySpotlightForStep(id, t, scrollDelay);
}

// Compatibilidad hacia atrás (otras partes pueden invocar este nombre).
function applyTourNavigationForStep(id) { applyTourTargetForStep(id); }


export {
  parseSemverCoreParts,
  compareSemverNumericArrays,
  resolveTourBranch,
  resolveAppVersionForTour,
  initGuidedTourGate,
  markGuidedTourVersionDone,
  guidedTourIntroSkip,
  guidedTourIntroChooseSala,
  guidedTourIntroChooseInterconsulta,
  persistTourProgressDebounced,
  resetTourUiBeforeResume,
  showTourDock,
  hideTourDock,
  toggleTourDockCollapsed,
  onTourDockClick,
  insertLabTourSecondPatientExample,
  seedDemoTrendHistory,
  applyTourDemoIngresoDates,
  seedDemoMonitoreoOnActivePatient,
  seedDemoListadoProblemas,
  ensureProfileExpandedForTour,
  ensureSettingsExpandedForTour,
  ensureConnectionExpandedForTour,
  clearTourSoapButtonHighlight,
  syncTourSoapButtonHighlight,
  getGuidedTourSteps,
  demoLabAlreadyProcessedForTour,
  seedDemoEventualidadesOnActivePatient,
  openTourEstadoActualRegistroDemo,
  isEstadoActualPostRegistroTourStep,
  prepareEstadoActualPanelForTour,
  syncTourActionNextButton,
  armTourActionPoll,
  clearTourActionPoll,
  guidedTourStepIndex,
  clearAllTourSpotlights,
  syncTourDockPlacement,
  tourApplySpotlightForStep,
  applyTourTargetForStep,
  openLabBulkTourHintModal,
};
