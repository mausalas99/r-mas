/** Settings dropdown, guided tours, help center, release notes. */
import {
  getTourSteps,
  getTourTarget,
  stepRequiresUserAction,
} from '../tour-targets.mjs';
import {
  getChapterProgressLabel,
  getChapterForStep,
  getFirstStepIdForChapter,
  getNeoCompanionSteps,
} from '../onboarding-curriculum.mjs';
import {
  loadTourProgress,
  saveTourProgress,
  clearTourProgress,
} from '../onboarding-progress.mjs';
import { syncGuidedTourContext } from '../tour-guards.mjs';
import {
  isPresentationModeActive,
  startPresentationMode,
  stopPresentationMode,
  registerPresentationRuntime,
} from '../presentation-mode.mjs';
import { exportCensoPdfFromHelp } from '../censo-export.mjs';
import { applyAppModeSwitchEffects } from './profile.mjs';
import { LAB_BULK_PATIENT_SEPARATOR } from '../lab-bulk-paste.mjs';
import { buildTourDemoListadoProblemas } from '../tour-demo-listado-problemas.mjs';
import {
  buildTourMonitoreoHistorial,
  getTourRegistroFormSample,
} from '../tour-demo-monitoreo.mjs';
import { buildTourDemoDates, buildTourDemoLabPasteBoth } from '../tour-demo-dates.mjs';
import { seedTourDemoTodos, clearTourDemoTodos } from '../tour-demo-todos.mjs';
import { buildTourDemoEventualidades } from '../tour-demo-eventualidades.mjs';
import { buildBulkLabPreview, extractLabPatientFromBulkBlock } from '../lab-bulk-paste.mjs';
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
} from '../tour-demo-patient.mjs';
import {
  renderEstadoActualPanel,
  applyEstadoActualParsedToForm,
  toDatetimeLocalValue,
  invalidateEaPanelCache,
} from './estado-actual-panel.mjs';
import {
  closeEstadoActualRegistroModal,
  openEstadoActualRegistroModal,
} from './estado-actual-registro-modal.mjs';
import { isMobileWeb } from '../mobile-web.mjs';
import { isModeSala } from '../mode-features.mjs';
import { getUiDensity, setUiDensity, isPaseMode } from './chrome.mjs';
import {
  openConnectionDropdown,
  closeConnectionDropdown,
} from './lan-sync.mjs';
import { renderPatientList, selectPatient } from './patients.mjs';
import { renderNoteForm, renderIndicaForm } from './notes-indicaciones.mjs';
import { renderPaseBoard } from './pase-board.mjs';
import { setRoundOverviewMode } from './patients.mjs';
import { renderRoundOverviewPanels } from './patients.mjs';
import { renderLabHistoryPanel } from './lab-panel.mjs';
import { limpiarReporte } from './lab-panel.mjs';
import { closeLabSomeTablesModal } from './lab-some-tables-modal.mjs';
import { closeTendGroupModal } from './tendencias.mjs';
import { closeSesionIngresoTrendsSendModal } from './sesion-ingreso-trends-send-modal.mjs';
import { closeSOAPModal } from './soap-estado.mjs';
import { procesarLabs } from '../labs.js';
import { extractParsedValues } from './diagrams-parse.mjs';
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
} from '../app-state.mjs';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const GUIDED_TOUR_LS_KEY = 'rpc-guided-tour-done-for-version';

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
  syncPreimportBackupUi() {},
  syncSettingsLanHostDiskSection() {},
  closeProfileModal() {},
  openProfileModal() {},
  renderMedRecetaPanel() {},
  renderListadoForm() {},
  openAddModalFromLabPatient() {},
  refreshAllTodoUIs() {},
  refreshExpedienteAfterPatientSelect() {},
};

export function registerSettingsHelpRuntime(partial) {
  if (!partial || typeof partial !== 'object') return;
  Object.assign(rt, partial);
  registerPresentationRuntime({
    getActiveId: rt.getActiveId,
    setActiveId: rt.setActiveId,
    showToast: rt.showToast,
  });
}

var TEND_SECTION_EXPANDED_LS = 'rpc-tend-sections-expanded';
var TEND_HIDDEN_SERIES_LS = 'rpc-tend-hidden-series';
var TEND_ABNORMAL_ONLY_LS = 'rpc-tend-abnormal-only';
var guidedTourActive = false;
/** @type {'sala'|'interconsulta'|null} */
var guidedTourBranch = null;
/** @type {'base'|'neo'} */
var guidedTourMode = 'base';
/** @type {string|null} paso actual del tour guiado (null = inactivo) */
var tourStepId = null;
var persistTourProgressTimer = null;

function publishTourGuardContext() {
  syncGuidedTourContext({
    active: guidedTourActive,
    stepId: tourStepId,
  });
}

publishTourGuardContext();

/** true tras Procesar en lab_parse durante este arranque del tour */
var tourDemoLabSessionProcessed = false;

function getTourDemoPatientId() {
  return resolveTourDemoPatientId(patients);
}

function purgeTourDemoPatientsFromState() {
  setPatients(
    patients.filter(function (p) {
      return (
        p.id !== DEMO_PATIENT_ID &&
        p.id !== DEMO_PATIENT_ID_2 &&
        !p.isDemo
      );
    })
  );
  delete notes[DEMO_PATIENT_ID];
  delete notes[DEMO_PATIENT_ID_2];
  delete indicaciones[DEMO_PATIENT_ID];
  delete indicaciones[DEMO_PATIENT_ID_2];
  delete labHistory[DEMO_PATIENT_ID];
  delete labHistory[DEMO_PATIENT_ID_2];
  delete medRecetaByPatient[DEMO_PATIENT_ID];
  delete listadoProblemas[DEMO_PATIENT_ID];
  if (medNotaSelectionByPatient[DEMO_PATIENT_ID]) {
    delete medNotaSelectionByPatient[DEMO_PATIENT_ID];
  }
  clearTourDemoTodos();
}

var TOUR_STEPS_USE_DEMO_PEREZ = {
  servicio_default: true,
  sala_expediente_tabs: true,
  historia_clinica: true,
  estado_actual: true,
  estado_actual_registro: true,
  estado_actual_snapshot: true,
  estado_actual_charts: true,
  estado_actual_historial: true,
  eventualidades: true,
  listado_problemas: true,
  sala_med: true,
  sala_tend: true,
  sala_tend_chart: true,
  sala_vpo: true,
  sala_receta_hu: true,
};

function findTourDemoPerezPatient() {
  return (
    patients.find(function (x) {
      return x && x.id === DEMO_PATIENT_ID;
    }) ||
    findTourDemoPatientByRegistro(patients, DEMO_REGISTRO)
  );
}

/** Monitoreo, eventualidades, pendientes y notas demo para DEMO PÉREZ (idempotente). */
function seedTourDemoPerezClinicalData() {
  var p = findTourDemoPerezPatient();
  if (!p) return false;
  var pid = p.id;
  var today = new Date();
  var tourDates = getTourDemoDateBundle(today);
  var fecha = tourDates.fecha;
  var hora = tourDates.hora;
  applyTourDemoIngresoDates(p, tourDates);
  var hist = p.monitoreo && Array.isArray(p.monitoreo.historial) ? p.monitoreo.historial : [];
  if (!hist.length) {
    p.monitoreo = buildTourMonitoreoHistorial(today);
  }
  var ev =
    p.eventualidades && Array.isArray(p.eventualidades.entries) ? p.eventualidades.entries : [];
  if (!ev.length) {
    p.eventualidades = buildTourDemoEventualidades(today);
  }
  if (!notes[pid] || !String((notes[pid].diagnosticos || [])[0] || '').trim()) {
    notes[pid] = {
      fecha: fecha,
      hora: hora,
      interrogatorio: '',
      evolucion: '',
      estudios: '',
      diagnosticos: ['DM2, IRC estadio 3, HAS'],
      tratamiento: [''],
      ta: '',
      fr: '',
      fc: '',
      temp: '',
      peso: '',
      medico: '',
      profesor: '',
    };
  }
  if (!indicaciones[pid]) {
    indicaciones[pid] = {
      fecha: fecha,
      hora: hora,
      medicos: '',
      dieta: '',
      cuidados: '',
      estudios: '',
      medicamentos: '',
      interconsultas: '',
      otros: [],
    };
  }
  if (!medRecetaByPatient[pid]) {
    medRecetaByPatient[pid] = {
      fechaActualizacion: fecha,
      items: [
        {
          id: 'tour-med-1',
          nombreRaw: 'PARACETAMOL 1 G SOL INY (*)',
          viaRaw: 'VIA INTRAVENOSA',
          dosisRaw: '1 G //',
          frecuenciaRaw: 'CADA 8 HORAS',
          suspendido: false,
          diaTratamiento: null,
        },
        {
          id: 'tour-med-2',
          nombreRaw: 'CEFTRIAXONA 1 G SOL INY (*)',
          viaRaw: 'VIA INTRAVENOSA',
          dosisRaw: '1 G // *DIA# 2*',
          frecuenciaRaw: 'CADA 24 HORAS',
          suspendido: false,
          diaTratamiento: 2,
        },
      ],
    };
    medNotaSelectionByPatient[pid] = { 'tour-med-1': true, 'tour-med-2': true };
  }
  seedTourDemoTodos(DEMO_PATIENT_ID);
  saveState();
  if (typeof rt.refreshAllTodoUIs === 'function') rt.refreshAllTodoUIs();
  return true;
}

function ensureTourPrimaryDemoPatientActive() {
  if (!guidedTourActive || guidedTourBranch === 'interconsulta') return false;
  var p = findTourDemoPerezPatient();
  if (!p) return false;
  var changed = rt.getActiveId() !== p.id;
  if (changed) {
    selectPatient(p.id);
  }
  seedTourDemoPerezClinicalData();
  if (changed && typeof rt.refreshExpedienteAfterPatientSelect === 'function') {
    rt.refreshExpedienteAfterPatientSelect();
  }
  return true;
}

function applyTourDemoPatientBundle(patientId, registro) {
  var reg = String(registro || '').trim();
  var today = new Date();
  var tourDates = getTourDemoDateBundle(today);
  var fecha = tourDates.fecha;
  var hora = tourDates.hora;
  var p = patients.find(function (x) {
    return x && x.id === patientId;
  });
  if (p) {
    applyTourDemoIngresoDates(p, tourDates);
    if (patientId === DEMO_PATIENT_ID) {
      p.monitoreo = buildTourMonitoreoHistorial(today);
    }
  }
  if (patientId === DEMO_PATIENT_ID) {
    seedTourDemoPerezClinicalData();
  } else if (patientId === DEMO_PATIENT_ID_2 || reg === DEMO_REGISTRO_2) {
    notes[patientId] = {
      fecha: fecha,
      hora: hora,
      interrogatorio: '',
      evolucion: '',
      estudios: '',
      diagnosticos: ['DM2 descompensada'],
      tratamiento: [''],
      ta: '',
      fr: '',
      fc: '',
      temp: '',
      peso: '',
      medico: '',
      profesor: '',
    };
    indicaciones[patientId] = {
      fecha: fecha,
      hora: hora,
      medicos: '',
      dieta: '',
      cuidados: '',
      estudios: '',
      medicamentos: '',
      interconsultas: '',
      otros: [],
    };
  }
  saveState();
}

function getTourDemoDateBundle(ref) {
  return buildTourDemoDates(ref || new Date());
}

function getDemoTourLabPaste(ref) {
  return buildTourDemoLabPasteBoth(ref);
}

function tourDemoLabPasteHasBoth(text) {
  var v = String(text || '');
  return (
    v.indexOf(DEMO_REGISTRO) !== -1 &&
    v.indexOf(DEMO_REGISTRO_2) !== -1 &&
    v.indexOf(LAB_BULK_PATIENT_SEPARATOR) !== -1
  );
}

/** Rellena el cuadro de lab con Pérez (2 días) + separador + García durante el tour. */
function ensureTourDemoLabInputBoth() {
  if (!guidedTourActive) return false;
  var li = document.getElementById('lab-input');
  if (!li) return false;
  if (!tourDemoLabPasteHasBoth(li.value)) {
    li.value = getDemoTourLabPaste();
  }
  return true;
}

/** Plantilla BH de referencia (p. ej. tour guiado). El cuadro de laboratorio no se rellena solo al iniciar. */
var LAB_INPUT_DEFAULT_REPORT =
  'BIOMETRÍA HEMÁTICA\n' +
  'Hemoglobina: 7.44 g/dL\n' +
  'Hematocrito: 24%\n' +
  'VCM: 97 fL\n' +
  'HCM: 30.2 pg\n' +
  'Leucocitos: 29.1 x10³/µL\n' +
  'Neutrófilos: 25.8 x10³/µL\n' +
  'Eosinófilos: 0 x10³/µL\n' +
  'Plaquetas: 163 x10³/µL\n';

function toggleSettingsSection() {
  toggleSettingsDropdown();
}


function syncSettingsDropdownA11y(open) {
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (!dd) return;
  dd.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (bg) bg.setAttribute('aria-hidden', open ? 'false' : 'true');
  var trigger = document.getElementById('btn-open-settings');
  if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function focusSettingsDropdownEntry() {
  var dd = document.getElementById('settings-dropdown');
  if (!dd) return;
  var target =
    dd.querySelector('.btn-settings-help-primary') ||
    dd.querySelector('button, summary, [href], input, select, textarea');
  if (target && typeof target.focus === 'function') target.focus();
}

function toggleSettingsDropdown() {
  closeConnectionDropdown();
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (!dd) return;
  var open = dd.classList.contains('open');
  var nextOpen = !open;
  dd.classList.toggle('open', nextOpen);
  if (bg) bg.classList.toggle('open', nextOpen);
  syncSettingsDropdownA11y(nextOpen);
  if (nextOpen) {
    rt.syncPreimportBackupUi();
    rt.syncSettingsLanHostDiskSection();
    focusSettingsDropdownEntry();
  }
}
export function closeSettingsDropdown() {
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  var trigger = document.getElementById('btn-open-settings');
  if (dd) dd.classList.remove('open');
  if (bg) bg.classList.remove('open');
  syncSettingsDropdownA11y(false);
  if (trigger && typeof trigger.focus === 'function') trigger.focus();
}

/** Abre el desplegable de Ajustes y la sección «Respaldos, sync y recuperación» (mismos controles que en ⚙). */
function expandSettingsAccordionBackupSync() {
  var det = document.getElementById('settings-accordion-backup-sync');
  if (det) det.open = true;
}


function syncTeamSyncHeaderButton() {
  var btn = document.getElementById('btn-header-team-sync');
  if (!btn) return;
  var desktop = !!(window.electronAPI && typeof window.electronAPI.getAppVersion === 'function');
  btn.style.display = desktop || isMobileWeb() ? 'flex' : 'none';
}

// ── Tour guiado (modal intro + panel por pasos) ───────────────────
// Persistencia: localStorage sobrevive al cerrar la app (Electron). La clave guarda
// la última versión para la que el usuario omitió o completó el tutorial; al
// actualizar a una versión mayor (semver), la bienvenida vuelve a mostrarse.

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
function shouldShowGuidedTourIntro(currentVersion, storedDoneVersionRaw) {
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

function initGuidedTourGate() {
  if (isMobileWeb()) return;
  resolveAppVersionForTour()
    .then(function (v) {
      window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
      var cur = window.__RPC_APP_VERSION__;
      var stored = '';
      try {
        stored = localStorage.getItem(GUIDED_TOUR_LS_KEY);
      } catch (_ls) {}
      if (shouldShowGuidedTourIntro(cur, stored)) setTimeout(showTourIntroModal, 80);
    })
    .catch(function () {
      window.__RPC_APP_VERSION__ = 'dev';
      var stored = '';
      try {
        stored = localStorage.getItem(GUIDED_TOUR_LS_KEY);
      } catch (_ls2) {}
      if (shouldShowGuidedTourIntro('dev', stored)) setTimeout(showTourIntroModal, 80);
    });
}

function showTourIntroModal() {
  var el = document.getElementById('onboarding-intro-backdrop');
  if (!el) return;
  try {
    closeReleaseNotes();
  } catch (_e) {}
  var ver = normalizeTourVersionLabel(window.__RPC_APP_VERSION__);
  var h2 = document.getElementById('intro-modal-title');
  if (h2) h2.textContent = ver && ver !== 'dev' ? ('R+ · versión ' + ver) : 'Bienvenido a R+';
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
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

function guidedTourIntroChooseSala() {
  hideTourIntroModal();
  guidedTourMode = 'base';
  startOnboarding('sala');
}

function guidedTourIntroChooseInterconsulta() {
  hideTourIntroModal();
  guidedTourMode = 'base';
  startOnboarding('interconsulta');
}

function syncLearnHubContinueVisibility() {
  var btn = document.getElementById('btn-learn-continue');
  if (!btn) return;
  var p = loadTourProgress();
  btn.style.display = p && !guidedTourActive ? '' : 'none';
}

function persistTourProgressDebounced() {
  if (!guidedTourActive || !tourStepId) return;
  if (persistTourProgressTimer) clearTimeout(persistTourProgressTimer);
  persistTourProgressTimer = setTimeout(function () {
    persistTourProgressTimer = null;
    var branch = guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala';
    var ch = getChapterForStep(tourStepId, branch);
    saveTourProgress({
      branch: branch,
      stepId: tourStepId,
      chapterId: ch.id,
      mode: guidedTourMode,
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
  closeQuickHelp();
}

function showTourDock() {
  document.getElementById('tour-dock').classList.add('tour-dock-visible');
}

function hideTourDock() {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  d.classList.remove('tour-dock-visible');
  d.classList.remove('tour-dock-collapsed');
  d.classList.remove('tour-dock-pos-left');
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

function closeLabBulkTourHintModal() {
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

function applyTourDemoIngresoDates(patient, bundle) {
  if (!patient || !bundle) return;
  patient.fiuxFecha = bundle.fiuxFecha;
  patient.fimiFecha = bundle.fimiFecha;
}

function seedDemoMonitoreoOnActivePatient() {
  ensureTourPrimaryDemoPatientActive();
}

function seedDemoListadoProblemas() {
  if (!guidedTourActive) return;
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
  if (!guidedTourActive || tourStepId !== 'sala_soap') return;
  setTimeout(function () {
    var btn = document.getElementById('btn-soap-template');
    if (btn && guidedTourActive && tourStepId === 'sala_soap') {
      btn.classList.add('tour-spotlight-soap');
    }
  }, 120);
}

function getGuidedTourSteps() {
  if (guidedTourMode === 'neo') return getNeoCompanionSteps();
  return getTourSteps(guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala');
}

function demoLabAlreadyProcessedForTour() {
  if (tourDemoLabSessionProcessed) return true;
  if (!guidedTourActive) return false;
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
  return (
    id === 'estado_actual_snapshot' ||
    id === 'estado_actual_charts' ||
    id === 'estado_actual_historial'
  );
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

function syncTourActionNextButton() {
  var nextBtn = document.getElementById('tour-btn-next');
  if (!nextBtn || !guidedTourActive) return;
  if (tourStepId === 'lab_parse' && demoLabAlreadyProcessedForTour()) {
    nextBtn.style.display = '';
    nextBtn.disabled = false;
    nextBtn.textContent = 'Siguiente';
  }
  if (tourStepId === 'servicio_default') {
    var st = rt.getSettings();
    if (st && String(st.defaultServicio || '').trim()) {
      nextBtn.style.display = '';
      nextBtn.textContent = 'Siguiente';
    }
  }
}

function guidedTourStepIndex() {
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourStepId);
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
};

function syncTourDockPlacement() {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  var useLeft = false;
  if (guidedTourActive && tourStepId && TOUR_DOCK_LEFT_STEPS[tourStepId]) useLeft = true;
  if (miniTourActive && miniTourSteps && miniTourSteps[miniTourIdx] && miniTourSteps[miniTourIdx].dockLeft) {
    useLeft = true;
  }
  if (useLeft) d.classList.add('tour-dock-pos-left');
  else d.classList.remove('tour-dock-pos-left');
}

function tourApplySpotlightForStep(id, t, scrollDelayMs) {
  if (!t || !t.selector) return;
  var scrollDelay = scrollDelayMs != null ? scrollDelayMs : 140;
  setTimeout(function () {
    if (!guidedTourActive || tourStepId !== id) return;
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
function applyTourTargetForStep(id) {
  if (guidedTourActive) {
    setUiDensity('normal');
  }
  var t = getTourTarget(id, guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala');
  if (!t) return;

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
  if (id === 'estado_actual' && guidedTourBranch !== 'interconsulta') {
    setTimeout(function () {
      if (!guidedTourActive || tourStepId !== 'estado_actual') return;
      prepareEstadoActualPanelForTour();
    }, 160);
  }
  if (id === 'estado_actual_registro' && guidedTourBranch !== 'interconsulta') {
    setTimeout(function () {
      if (!guidedTourActive || tourStepId !== 'estado_actual_registro') return;
      prepareEstadoActualPanelForTour(function () {
        if (!guidedTourActive || tourStepId !== 'estado_actual_registro') return;
        openTourEstadoActualRegistroDemo();
      });
    }, 160);
  }
  if (isEstadoActualPostRegistroTourStep(id) && guidedTourBranch !== 'interconsulta') {
    clearAllTourSpotlights();
    if (!t.selector) return;
    var postRegStepId = id;
    var spotlightDelay = postRegStepId === 'estado_actual_charts' ? 520 : 340;
    setTimeout(function () {
      if (!guidedTourActive || tourStepId !== postRegStepId) return;
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

function renderTourStep() {
  if (!guidedTourActive) return;
  var badge = document.getElementById('tour-step-badge');
  var bodyEl = document.getElementById('tour-dock-body');
  var nextBtn = document.getElementById('tour-btn-next');
  var prevBtn = document.getElementById('tour-btn-prev');
  var steps = getGuidedTourSteps();
  var total = steps.length;
  var idx = guidedTourStepIndex() + 1;
  var branchLabel = guidedTourBranch === 'interconsulta' ? 'Interconsulta' : 'Sala';
  var tourBranch = guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala';
  var prog = getChapterProgressLabel(tourStepId, tourBranch);
  var sub = prog.isCompanion
    ? 'Extensión · Neo · Paso ' + prog.stepInChapter + ' de ' + prog.chapterSteps
    : 'Cap. ' + prog.chapterIndex + '/' + prog.chapterCount + ' · ' + prog.chapterTitle
      + ' · Paso ' + prog.stepInChapter + '/' + prog.chapterSteps;
  badge.textContent = 'Paso ' + idx + ' de ' + total + ' · ' + branchLabel + (sub ? ' · ' + sub : '');
  var neoOptionalLine =
    '<p style="margin:0 0 8px;font-size:13px;color:var(--text-muted);">R+ funciona sin Neo; módulo opcional.</p>';
  nextBtn.style.display = '';
  nextBtn.disabled = false;

  switch (tourStepId) {
    case 'map_sidebar':
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">La <strong>columna izquierda</strong> es tu censo. En este tour <strong>no hay pacientes precargados</strong>: registrarás a <strong>DEMO PÉREZ</strong> al procesar el laboratorio de ejemplo.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'map_tabs':
      bodyEl.innerHTML =
        getUiDensity() !== 'normal'
          ? '<p style="margin:0;line-height:1.5;">En <strong>Pase</strong> el centro es un <strong>resumen</strong> del paciente (pendientes, laboratorio, cultivos, medicamentos). Pulsa el título de cada bloque o usa <strong>Ctrl/⌘ + 1…4</strong> para abrir el detalle en vista <strong>Normal</strong>.</p>'
          : guidedTourBranch === 'interconsulta'
            ? '<p style="margin:0;line-height:1.5;">Arriba: <strong>Laboratorio</strong>, <strong>Expediente</strong>, <strong>Medicamentos</strong>, <strong>Agenda</strong>. En <strong>Expediente</strong> verás las pestañas internas en el siguiente paso.</p>'
            : '<p style="margin:0;line-height:1.5;">Arriba: <strong>Laboratorio</strong>, <strong>Expediente</strong>, <strong>Medicamentos</strong> y <strong>Agenda</strong> (procedimientos del turno). En <strong>Expediente</strong>: <strong>Clínico</strong> (Historia → Estado actual → Eventualidades), <strong>Resultados</strong> (tendencias) y <strong>Salida</strong> (Listado, <strong>VPO</strong>, <strong>Receta HU</strong>).</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'map_lab_teaser':
      bodyEl.innerHTML =
        guidedTourBranch === 'interconsulta'
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
        (guidedTourBranch === 'interconsulta'
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
  if (stepRequiresUserAction(tourStepId) && tourStepId !== 'servicio_default') {
    nextBtn.style.display = 'none';
  }
  syncTourDockPlacement();
  syncTourSoapButtonHighlight();
  syncTourActionNextButton();
  if (prevBtn) prevBtn.disabled = guidedTourStepIndex() <= 0;
}

function guidedTourClickPrev() {
  if (!guidedTourActive || miniTourActive) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourStepId);
  if (i <= 0) return;
  clearAllTourSpotlights();
  tourStepId = steps[i - 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourStepId);
  renderTourStep();
  persistTourProgressDebounced();
}

function guidedTourPause() {
  if (!guidedTourActive) return;
  var branch = guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala';
  var ch = getChapterForStep(tourStepId, branch);
  saveTourProgress({
    branch: branch,
    stepId: tourStepId,
    chapterId: ch.id,
    mode: guidedTourMode,
  });
  guidedTourActive = false;
  publishTourGuardContext();
  hideTourDock();
  rt.showToast('Tutorial pausado. Continúa desde Aprender R+.', 'info');
  syncLearnHubContinueVisibility();
}

export function resumeGuidedTourFromProgress() {
  var p = loadTourProgress();
  if (!p) return false;
  guidedTourBranch = p.branch === 'interconsulta' ? 'interconsulta' : 'sala';
  guidedTourMode = p.mode === 'neo' ? 'neo' : 'base';
  resetTourUiBeforeResume();
  startOnboarding(guidedTourBranch, { resumeStepId: p.stepId, skipIntro: true });
  return true;
}

export function startNeoCompanionTour(startStepId) {
  if (guidedTourActive) {
    rt.showToast('Finaliza el tutorial actual primero.', 'error');
    return;
  }
  guidedTourMode = 'neo';
  guidedTourBranch = 'sala';
  startOnboarding('sala', { resumeStepId: startStepId || 'sala_casiopea_lab', skipIntro: true });
}

function guidedTourClickNext() {
  if (miniTourActive) { miniTourNext(); return; }
  if (!guidedTourActive) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourStepId);
  if (i < 0) return;
  if (tourStepId === 'wrap') {
    completeGuidedTourWithCelebration();
    return;
  }
  if (tourStepId === 'servicio_default' && guidedTourMode === 'base' && guidedTourBranch !== 'interconsulta') {
    rt.showToast('Listo: pacientes demo con laboratorio en R+.', 'success');
  }
  if (tourStepId === 'sala_casiopea_lab') {
    closeLabSomeTablesModal();
  }
  if (tourStepId === 'sala_casiopea_trends') {
    closeSesionIngresoTrendsSendModal();
  }
  if (tourStepId === 'lab_bulk_separator') {
    closeLabBulkTourHintModal();
  }
  if (tourStepId === 'estado_actual' || tourStepId === 'estado_actual_registro') {
    closeSOAPModal();
  }
  if (i + 1 >= steps.length) {
    if (guidedTourMode === 'neo') completeGuidedTourWithCelebration();
    return;
  }
  clearAllTourSpotlights();
  tourStepId = steps[i + 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourStepId);
  renderTourStep();
  persistTourProgressDebounced();
}

// Avance automático cuando el usuario ejecuta una acción real
// (Procesar, Copiar resultados, Generar Nota/Indicaciones, etc.).
export function getGuidedTourContext() {
  return { active: guidedTourActive, stepId: tourStepId };
}

export function guidedTourAdvanceAfter(actionStep) {
  if (!guidedTourActive || tourStepId !== actionStep) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(actionStep);
  if (i < 0 || i + 1 >= steps.length) return;
  clearAllTourSpotlights();
  tourStepId = steps[i + 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourStepId);
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
  guidedTourActive = false;
  tourStepId = null;
  guidedTourBranch = null;
  guidedTourMode = 'base';
  publishTourGuardContext();
  hideTourDock();
  rt.launchConfetti();
  destroyDemoAndClose();
  rt.showToast('Tutorial completado', 'success');
  syncLearnHubContinueVisibility();
}

function skipGuidedTour() {
  if (miniTourActive) { endMiniTour(); return; }
  clearTourSoapButtonHighlight();
  clearTourProgress();
  markGuidedTourVersionDone();
  guidedTourActive = false;
  tourStepId = null;
  guidedTourBranch = null;
  guidedTourMode = 'base';
  publishTourGuardContext();
  hideTourDock();
  destroyDemoAndClose();
  syncLearnHubContinueVisibility();
}

function startOnboarding(branch, opts) {
  opts = opts || {};
  if (opts.resumeStepId) resetTourUiBeforeResume();
  guidedTourBranch = branch === 'interconsulta' ? 'interconsulta' : 'sala';
  setUiDensity('normal');
  // Alinear el modo de la app con la rama del tutorial. Si el usuario
  // elige "Interconsulta" pero la app está en Sala, los pasos de
  // ic_nota / ic_indica apuntarían a una pestaña oculta. Cambiamos el
  // modo y refrescamos la UI; el usuario puede volver a Sala desde Mi
  // Perfil cuando termine.
  var st = rt.getSettings();
  var prevMode = st.appMode;
  st.appMode = guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala';
  if (st.appMode !== prevMode) {
    try { localStorage.setItem('rpc-settings', JSON.stringify(st)); } catch (e) {}
    applyAppModeSwitchEffects();
    rt.renderEstadoActualBar();
  }
  tourDemoLabSessionProcessed = false;
  purgeTourDemoPatientsFromState();
  guidedTourActive = true;
  var steps = getGuidedTourSteps();
  var resumeId = opts.resumeStepId;
  if (resumeId && steps.indexOf(resumeId) >= 0) {
    tourStepId = resumeId;
  } else {
    tourStepId = steps[0] || 'map_sidebar';
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
    applyTourNavigationForStep(tourStepId);
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
  if (!guidedTourActive || tourStepId !== 'lab_parse') return;
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
  if (!guidedTourActive || tourStepId !== 'lab_parse') return;
  if (!tourDemoLabCompleteForTour(patients, labHistory)) return;
  tourDemoLabSessionProcessed = true;
  ensureTourPrimaryDemoPatientActive();
  clearAllTourSpotlights();
  tourStepId = 'lab_view';
  publishTourGuardContext();
  applyTourTargetForStep(tourStepId);
  renderTourStep();
  persistTourProgressDebounced();
  syncTourActionNextButton();
}

function onboardingAdvanceAfterSend() {
  if (!guidedTourActive) return;
  if (tourStepId === 'lab_view') {
    clearAllTourSpotlights();
    tourStepId = 'sala_casiopea_lab';
    publishTourGuardContext();
    applyTourTargetForStep(tourStepId);
    renderTourStep();
  }
}

export function tourAfterBulkLabParse(blocks) {
  if (!guidedTourActive || tourStepId !== 'lab_parse') return;
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
  guidedTourActive = false;
  tourStepId = null;
  guidedTourBranch = null;
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
    guidedTourActive = false;
    tourStepId = null;
    guidedTourBranch = null;
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

// ── Bloque L · Centro de ayuda embebido ────────────────────────────
var HELP_ARTICLES = [
  {
    id: 'primer-paciente',
    title: 'Tu primer paciente',
    keywords: 'agregar paciente nuevo registro edad sexo cuarto cama duplicado',
    html:
      '<p>Agrega un paciente desde la barra lateral con <strong>+ Agregar</strong> o directamente desde un reporte de laboratorio procesado (<strong>Agregar paciente del lab</strong>).</p>' +
      '<ul>' +
      '<li>Puedes capturar nombre, registro, edad, sexo, área / servicio, cuarto y cama.</li>' +
      '<li>R+ avisa si detecta un paciente con el mismo nombre o registro para evitar duplicados.</li>' +
      '<li>El paciente queda guardado solo en esta computadora; no se sube a la nube.</li>' +
      '</ul>'
  },
  {
    id: 'lan-vs-respaldo',
    title: 'LAN en vivo vs respaldos entre equipos',
    keywords: 'lan wifi sala equipo respaldo sync paquete red wifi sincronizar vivo copia snapshot exportar',
    html:
      '<p>R+ usa dos ideas distintas que no compiten; sirven para cosas diferentes:</p>' +
      '<ul>' +
      '<li><strong>Sala en vivo (LAN / ⇄):</strong> trabajar en <strong>sesión</strong> con colegas en la <strong>misma red local</strong>. Es colaboración en tiempo real sobre la misma sala; no es una copia permanente de tu historial para llevar a otro equipo. Si el anfitrión cierra R+, otra <strong>Mac o Windows</strong> con R+ de escritorio (unida con invitación) puede ser <strong>anfitrión suplente</strong> hasta que vuelva el equipo original.</li>' +
      '<li><strong>Respaldos y sync (Ajustes → Respaldos, sync y recuperación):</strong> exportar/importar <strong>JSON</strong>, auto‑respaldos y <strong>paquete sync</strong> para mover o recuperar el contenido clínico entre computadoras o después del turno.</li>' +
      '</ul>' +
      '<p style="font-size:13px;color:var(--text-muted);margin:0;">¿Continuar el mismo caso en otro equipo físico? Usa <strong>exportar/importar</strong> o el paquete sync. ¿Ver en vivo lo que hace el equipo en sala? Usa <strong>LAN</strong>.</p>'
  },
  {
    id: 'laboratorio',
    title: 'Laboratorio: procesar',
    keywords: 'lab laboratorio procesar reporte diagrama gamble bh quimica copiar',
    html:
      '<p>Pega el reporte del laboratorio en el cuadro de texto de la pestaña <strong>Laboratorio</strong> y pulsa <strong>Procesar</strong>. R+ reconoce biometría, química, electrolitos, gasometría, pruebas hepáticas y más.</p>' +
      '<ul>' +
      '<li>Cada diagrama tiene un botón <strong>Copiar</strong> para pegarlo como texto en otro sistema.</li>' +
      '<li>Los valores fuera de rango se resaltan en rojo.</li>' +
      '<li>En <strong>Historial de labs</strong> ves cada envío guardado; puedes <strong>Ver en Laboratorio</strong> para recuperar diagramas o <strong>Eliminar</strong> un conjunto si fue un error.</li>' +
      '</ul>'
  },
  {
    id: 'nota-evolucion',
    title: 'Nota de evolución',
    keywords: 'nota evolucion docx generar expediente soap vitales diagnosticos plantilla',
    html:
      '<p>En <strong>Expediente → Notas</strong> completa fecha, hora, signos vitales, interrogatorio, evolución, estudios, diagnósticos y tratamiento.</p>' +
      '<ul>' +
      '<li>La <strong>plantilla SOAP</strong> (modal) concentra subjetivo/objetivo breve, GCS, analgesia, antibióticos, antiHTA, vasopresores, temperatura, dieta, balance hídrico y glucometrías. <strong>Insertar en evolución</strong> pega el párrafo en el cuadro de texto.</li>' +
      '<li>Desde <strong>Medicamentos</strong> puedes marcar fármacos para SOAP y abrir el modal ya relleno en analgesia / ABX / antiHTA / vasopresores.</li>' +
      '<li><strong>Generar Nota (.docx)</strong> crea el documento con membrete (generador nativo en Node); la carpeta de salida está en <strong>Ajustes</strong>.</li>' +
      '<li><strong>Salida rápida</strong> exporta el paciente activo en docx, html o txt según el formato elegido.</li>' +
      '<li>Los datos se guardan por paciente en este equipo.</li>' +
      '</ul>'
  },
  {
    id: 'historia-clinica',
    title: 'Historia Clínica (Sala)',
    keywords: 'historia clinica ingreso app ahf apnp ipas lectura narrativa antecedentes padecimiento sala',
    html:
      '<p>En modo <strong>Sala</strong>, <strong>Expediente → Clínico → Historia Clínica</strong> captura el ingreso con formato institucional.</p>' +
      '<ul>' +
      '<li><strong>Captura</strong> — Tres pasos: identificación y motivo; antecedentes (APP con catálogo, AHF por familiar, APNP, género/reproducción); padecimiento, datos negados e IPAS por sistemas.</li>' +
      '<li><strong>Lectura</strong> — Vista que compila secciones en prosa; <strong>Copiar texto</strong> al portapapeles.</li>' +
      '<li><strong>Labs de ingreso</strong> — Ancla creatinina, eTFG y estudios recientes desde el historial del paciente.</li>' +
      '<li><strong>Sala en vivo</strong> — Se sincroniza por paciente cuando el equipo usa ⇄.</li>' +
      '</ul>'
  },
  {
    id: 'eventualidades',
    title: 'Eventualidades (Sala)',
    keywords: 'eventualidades bitacora intercurrencia dia clinico sala registro',
    html:
      '<p><strong>Expediente → Clínico → Eventualidades</strong> guarda hechos clínicos del turno con fecha y texto libre (orden cronológico).</p>' +
      '<p style="font-size:13px;color:var(--text-muted);margin:0;">Complementa <strong>Estado actual</strong> (monitoreo estructurado) y <strong>Historia Clínica</strong> (ingreso). No sustituye la nota de evolución en Interconsulta.</p>'
  },
  {
    id: 'estado-actual',
    title: 'Estado actual y monitoreo (Sala)',
    keywords: 'estado actual monitoreo vitales glu glucometria insulina balance hidrico entradas salidas io tendencias medicamentos confirmacion sala clinico segmento',
    html:
      '<p>En modo <strong>Sala</strong>, <strong>Expediente → Clínico → Estado actual</strong> concentra el <strong>monitoreo</strong> del turno antes de pasar todo a la nota.</p>' +
      '<ul>' +
      '<li><strong>Signos vitales</strong> estructurados con resaltado si salen del rango esperado.</li>' +
      '<li><strong>Glucometrías / insulina</strong>: registro y lectura rápida en el mismo panel.</li>' +
      '<li><strong>Balance hídrico (I/O)</strong>: entradas y salidas para el párrafo de estado.</li>' +
      '<li><strong>Tendencias</strong>: vista compacta cuando hay historia de laboratorio útil.</li>' +
      '<li><strong>Medicamentos</strong>: propuesta desde la receta hospitalaria para <strong>confirmar</strong> dosis vigentes antes de cerrar texto.</li>' +
      '</ul>' +
      '<p style="font-size:13px;color:var(--text-muted);margin:0;"><strong>Copiar</strong> lleva el texto al portapapeles; <strong>Guardar y copiar</strong> conserva snapshot por paciente. El botón verde del encabezado abre también la plantilla SOAP <em>solo objetivo/plan</em>.</p>'
  },
  {
    id: 'indicaciones',
    title: 'Indicaciones médicas',
    keywords: 'indicaciones dieta cuidados medicamentos estudios interconsultas otros docx',
    html:
      '<p>En <strong>Expediente → Indicaciones</strong> arma la hoja por secciones (dieta, cuidados, medicamentos, estudios, interconsultas y otros).</p>' +
      '<ul>' +
      '<li>Define <strong>plantillas por defecto</strong> en Mi Perfil para prellenar dieta, cuidados y medicamentos.</li>' +
      '<li><strong>Generar Indicaciones (.docx)</strong> produce la hoja final con el membrete del hospital.</li>' +
      '<li>La <strong>Salida rápida</strong> (Ajustes) exporta el paciente activo en docx, html o txt de un solo clic.</li>' +
      '</ul>'
  },
  {
    id: 'medicamentos-receta',
    title: 'Medicamentos (receta hospitalaria)',
    keywords: 'medicamentos receta tsv hospital soap tratamiento analgesia abx antihta vasopresores copiar',
    html:
      '<p>En la pestaña <strong>Medicamentos</strong> pegas el listado copiado del sistema hospitalario (columnas separadas por tabulador) y pulsas <strong>Receta</strong>.</p>' +
      '<p>En <strong>SOME</strong>, para reutilizar el mismo bloque, copia normalmente <strong>desde la columna Fecha y hora</strong> hasta el <strong>final de la sección</strong> de medicamentos y pégalo en R+.</p>' +
      '<ul>' +
      '<li><strong>Excl.</strong> excluye el fármaco del texto de egreso; <strong>SOAP</strong> marca qué filas se volcarán a la plantilla SOAP o al tratamiento.</li>' +
      '<li>La vista previa inferior agrupa por categoría (analgésicos, antiHTA, antibióticos, vasopresores, otros).</li>' +
      '<li><strong>Añadir a Tratamiento</strong> inserta líneas en la nota; <strong>Abrir plantilla SOAP</strong> rellena los campos del modal según esa clasificación.</li>' +
      '<li><strong>Copiar</strong> en la tarjeta inferior genera texto tipo nota de egreso.</li>' +
      '</ul>'
  },
  {
    id: 'respaldo',
    title: 'Respaldo y portabilidad',
    keywords: 'respaldo backup copia seguridad exportar importar paciente rango sync pasarela equipos auditoria',
    html:
      '<p><strong>¿LAN o respaldo?</strong> Lee primero <strong>LAN en vivo vs respaldos entre equipos</strong> en este centro de ayuda.</p>' +
      '<p>R+ ofrece varias vías para mover o resguardar datos desde <strong>Ajustes</strong>:</p>' +
      '<ul>' +
      '<li><strong>Copia de seguridad</strong>: JSON completo de pacientes, notas, indicaciones y labs.</li>' +
      '<li><strong>Exportar paciente actual</strong> o por <strong>rango de fechas</strong> para mover casos específicos.</li>' +
      '<li><strong>Copia automática</strong> guarda hasta 14 snapshots locales rotativos.</li>' +
      '<li><strong>Paquete sync</strong> cifrado con passphrase para combinar datos entre equipos sin pisar los del otro lado.</li>' +
      '<li><strong>Registro de auditoría</strong>: descarga un JSON con exportaciones e importaciones relevantes.</li>' +
      '</ul>'
  },
  {
    id: 'actualizacion',
    title: 'Actualizar R+',
    keywords:
      'actualizacion actualizar update instalar reiniciar rollback version downgrade restaurar estable reparacion 6.5.5 native binding',
    html:
      '<p>R+ busca nuevas versiones al iniciar. Cuando hay una disponible, la app muestra un modal con el progreso de descarga.</p>' +
      '<ul>' +
      '<li>Puedes buscar manualmente desde <strong>Ajustes → Buscar actualizaciones…</strong> o el menú nativo (Mac: R+; Windows: Aplicación).</li>' +
      '<li><strong>Reinstalar actualización de reparación (6.5.5)</strong>: si quedaste en <strong>6.5.4</strong> con errores nativos, usa este botón (canal Estable). Instala el parche lateral sin borrar datos.</li>' +
      '<li><strong>Restaurar versión estable</strong>: en Ajustes → Aplicación, elige una versión anterior curada y confirma. R+ intenta instalarla como una actualización; si falla (p. ej. firma en Mac), abre el instalador correcto en GitHub. Tus datos locales no se borran.</li>' +
      '<li>Si la versión elegida está por debajo del mínimo soportado, R+ bloquea la restauración automática.</li>' +
      '<li>Al detectar una versión nueva instalada, R+ muestra una ventana de <strong>Novedades</strong> con los cambios relevantes.</li>' +
      '</ul>'
  },
  {
    id: 'atajos',
    title: 'Atajos de teclado',
    keywords: 'atajos shortcuts teclado ctrl cmd escape tab',
    html:
      '<p>Ahorra tiempo con estos atajos:</p>' +
      '<ul>' +
      '<li><strong>Ctrl/⌘ + 1</strong> — Laboratorio · <strong>2</strong> — Expediente · <strong>3</strong> — Medicamentos · <strong>4</strong> — Agenda (<strong>Pase</strong>: abre la sección en vista Normal)</li>' +
      '<li><strong>Ctrl/⌘ + ,</strong> — Ajustes</li>' +
      '<li><strong>Ctrl/⌘ + N</strong> — Nuevo paciente</li>' +
      '<li><strong>Ctrl/⌘ + S</strong> — Guardar estado del paciente activo</li>' +
      '<li><strong>Ctrl/⌘ + K</strong> — Búsqueda unificada (pacientes, notas, indicaciones)</li>' +
      '<li><strong>Ctrl/⌘ + P</strong> — Alternar vista Normal ↔ Pase</li>' +
      '<li><strong>Ctrl/⌘ + Shift + P</strong> — Abrir/cerrar Mi Perfil</li>' +
      '<li><strong>Ctrl/⌘ + Shift + ,</strong> — Activa/desactiva <strong>sobrescribir</strong> en conflictos al importar JSON (sin preguntar)</li>' +
      '<li><strong>Esc</strong> o clic fuera — Cerrar ventana modal, menús o el centro de ayuda</li>' +
      '<li>Dentro del centro de ayuda: <strong>↓</strong> desde el buscador enfoca la lista; <strong>↑ / ↓</strong> navegan artículos.</li>' +
      '</ul>'
  },
  {
    id: 'privacidad',
    title: 'Privacidad de datos',
    keywords: 'privacidad datos locales electron userdata carpeta no subir nube sensibles',
    html:
      '<p>R+ guarda toda la información en el <strong>almacenamiento local</strong> de Electron en esta computadora. No envía pacientes ni notas a ningún servidor externo.</p>' +
      '<ul>' +
      '<li>En Ajustes, <strong>Abrir carpeta…</strong> muestra la ruta exacta del perfil de la app.</li>' +
      '<li>No compartas esa carpeta ni los archivos JSON exportados si contienen información sensible sin cifrado.</li>' +
      '<li>Los paquetes <strong>sync</strong> y las exportaciones pueden cifrarse con una passphrase para intercambio seguro entre equipos.</li>' +
      '</ul>'
  }
];

var helpCurrentArticleId = null;

function openQuickHelp(preselectId) {
  var el = document.getElementById('help-quick-backdrop');
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  closeSettingsDropdown();
  var input = document.getElementById('help-search-input');
  if (input) input.value = '';
  renderHelpArticles('');
  var pickId =
    preselectId && HELP_ARTICLES.some(function (a) { return a.id === preselectId; })
      ? preselectId
      : null;
  if (pickId) selectHelpArticle(pickId);
  else if (!helpCurrentArticleId || !HELP_ARTICLES.some(function(a){ return a.id === helpCurrentArticleId; })) {
    selectHelpArticle(HELP_ARTICLES[0].id);
  } else {
    selectHelpArticle(helpCurrentArticleId);
  }
  syncLearnHubContinueVisibility();
  setTimeout(function(){ if (input) input.focus(); }, 40);
}

export function closeQuickHelp() {
  var el = document.getElementById('help-quick-backdrop');
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
}

function onHelpSearchInput(value) {
  renderHelpArticles(value);
}

function onHelpSearchKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    var list = document.getElementById('help-articles-list');
    var first = list && list.querySelector('.help-article-item');
    if (first) first.focus();
  } else if (e.key === 'Enter') {
    var list2 = document.getElementById('help-articles-list');
    var first2 = list2 && list2.querySelector('.help-article-item');
    if (first2) {
      e.preventDefault();
      selectHelpArticle(first2.getAttribute('data-article-id'));
      first2.focus();
    }
  }
}

function onHelpListKeydown(e) {
  var target = e.target;
  if (!target || !target.classList || !target.classList.contains('help-article-item')) return;
  var items = Array.prototype.slice.call(document.querySelectorAll('#help-articles-list .help-article-item'));
  var idx = items.indexOf(target);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    var next = items[Math.min(items.length - 1, idx + 1)];
    if (next) { next.focus(); selectHelpArticle(next.getAttribute('data-article-id')); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (idx <= 0) {
      var input = document.getElementById('help-search-input');
      if (input) input.focus();
    } else {
      items[idx - 1].focus();
      selectHelpArticle(items[idx - 1].getAttribute('data-article-id'));
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectHelpArticle(target.getAttribute('data-article-id'));
  } else if (e.key === 'Home') {
    e.preventDefault();
    if (items[0]) { items[0].focus(); selectHelpArticle(items[0].getAttribute('data-article-id')); }
  } else if (e.key === 'End') {
    e.preventDefault();
    var last = items[items.length - 1];
    if (last) { last.focus(); selectHelpArticle(last.getAttribute('data-article-id')); }
  }
}

function renderHelpArticles(query) {
  var list = document.getElementById('help-articles-list');
  if (!list) return;
  var q = String(query || '').toLowerCase().trim();
  var filtered = HELP_ARTICLES.filter(function(a) {
    if (!q) return true;
    var haystack = (a.title + ' ' + a.keywords + ' ' + a.html.replace(/<[^>]+>/g, ' ')).toLowerCase();
    return haystack.indexOf(q) !== -1;
  });
  list.innerHTML = '';
  if (filtered.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'help-empty';
    empty.textContent = 'Sin resultados para “' + q + '”.';
    list.appendChild(empty);
    return;
  }
  filtered.forEach(function(a) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'help-article-item';
    btn.setAttribute('data-article-id', a.id);
    btn.setAttribute('role', 'option');
    btn.tabIndex = 0;
    btn.textContent = a.title;
    btn.addEventListener('click', function() { selectHelpArticle(a.id); btn.focus(); });
    if (a.id === helpCurrentArticleId) btn.classList.add('active');
    list.appendChild(btn);
  });
  if (helpCurrentArticleId && !filtered.some(function(a){ return a.id === helpCurrentArticleId; })) {
    selectHelpArticle(filtered[0].id);
  }
}

function selectHelpArticle(id) {
  var article = HELP_ARTICLES.find(function(a){ return a.id === id; });
  if (!article) return;
  helpCurrentArticleId = id;
  var contentEl = document.getElementById('help-article-content');
  if (contentEl) {
    contentEl.innerHTML = '<h4>' + esc(article.title) + '</h4>' + article.html;
  }
  var list = document.getElementById('help-articles-list');
  if (list) {
    Array.prototype.forEach.call(list.querySelectorAll('.help-article-item'), function(btn) {
      if (btn.getAttribute('data-article-id') === id) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }
}

// ── Bloque L · Novedades in-app (release notes) ────────────────────
/** TEMP: true = mostrar novedades en cada arranque (pruebas UX). Poner false antes de publicar. */
export var RELEASE_NOTES_DEV_FORCE_SHOW = false;
var RELEASE_NOTES_SEEN_PREFIX = 'rpc-release-notes-seen-';
var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = [
  {
    title: 'Copia automática programada',
    body: 'R+ puede generar snapshots locales (hasta 14 rotativos) y restaurarlos desde Ajustes → Copias de seguridad.'
  },
  {
    title: 'Exportar por paciente o por rango de fechas',
    body: 'Respalda solo al paciente activo, o selecciona un rango de fechas (ingreso / última nota) para mover casos acotados entre equipos.'
  },
  {
    title: 'Paquete sync cifrado con passphrase',
    body: 'Intercambia datos entre equipos sin pisar los del otro lado: el paquete combina cambios y se cifra con una frase que tú eliges.'
  },
  {
    title: 'Registro de auditoría ligero',
    body: 'Exporta un JSON con exportaciones, importaciones y borrados recientes desde Ajustes, útil para rastrear movimientos.'
  },
  {
    title: 'Salida rápida en varios formatos',
    body: 'Elige docx, html o txt como formato de la Salida rápida para exportar el contenido clínico del paciente activo de un solo clic.'
  }
];

var RELEASE_NOTES_HIGHLIGHTS = {
  '6.6.2': [
    {
      title: 'LAN ward-ready',
      body:
        '<strong>Clinical-ops</strong> y directorio ya no dependen de subir el bundle completo del turno. La cola offline se drena con avisos claros si algo queda pendiente.',
    },
    {
      title: '⇄ sin errores al sincronizar',
      body:
        'Correcciones al abrir expediente y al fusionar <strong>eventualidades</strong>. El anfitrión sirve historia clínica del censo cuando aún no hay registro <code>hc:</code> dedicado.',
    },
    {
      title: 'Actualiza todo el turno',
      body:
        'Instala <strong>6.6.2 en todas</strong> las Macs y PCs el mismo día. No mezcles <strong>6.6.1</strong> o anterior en la misma guardia.',
    },
  ],
  '6.6.1': [
    {
      title: 'LiveSync más fiable',
      body:
        'El censo y datos de sala se publican por <strong>HTTP</strong> con menos bundles duplicados por Wi‑Fi. La cola offline vive en la <strong>base cifrada</strong> cuando está desbloqueada. Al guardar <strong>@usuario</strong> ya no se corta el WebSocket en vivo.',
    },
    {
      title: '⇄ diagnóstico y anfitrión',
      body:
        'Panel <strong>Estado de sincronización</strong> en ⇄. Puedes <strong>fijar el anfitrión</strong> del turno. Si la sala solo se infiere de Ajustes, R+ pide confirmación antes de unirte.',
    },
    {
      title: 'Actualiza todo el turno',
      body:
        'Instala <strong>6.6.1 en todas</strong> las Macs y PCs del turno el mismo día. No mezcles <strong>6.6.0</strong> y <strong>6.6.1</strong> en la misma guardia — el censo puede no verse en equipos viejos.',
    },
  ],
  '6.6.0': [
    {
      title: '@usuario sin depender de ⇄',
      body:
        'Puedes <strong>registrar @usuario</strong> y guardar tu perfil <strong>sin sala en vivo</strong> si no hay red. Cuando vuelva el Wi‑Fi, abre <strong>⇄</strong>, únete a tu sala y guarda de nuevo para publicar en el directorio del turno.',
    },
    {
      title: 'Directorio LAN e iPad',
      body:
        'Mejoras de <strong>directorio</strong> y sync de perfiles (6.5.9 + cloud). Al <strong>copiar enlace para iPad</strong> se genera un ticket nuevo. En <strong>labs</strong>, copia varios días desde el menú del historial.',
    },
    {
      title: 'Recomendación de turno',
      body:
        'Actualiza <strong>todas</strong> las Macs y PCs del turno a <strong>6.6.0</strong>. En Windows, permite R+ en el firewall (puerto <strong>3738</strong>) la primera vez en sala.',
    },
  ],
  '6.5.9': [
    {
      title: 'Directorio y sync LAN (Mac y Windows)',
      body:
        'El <strong>directorio LAN</strong> muestra usuarios de <strong>todas las salas</strong>, carga sin quedarse en «Cargando…», y al sincronizar ⇄ <strong>no se pierden</strong> los @usuario entre versiones o PCs Windows.',
    },
    {
      title: '@usuario publicado al guardar',
      body:
        'Si ya tienes LAN, debes tener la sala <strong>⇄</strong> activa (o unirte por invitación) <strong>antes</strong> de registrar @usuario. Al guardar perfil, R+ lo <strong>publica al turno</strong> de inmediato — no solo en tu Mac.',
    },
    {
      title: 'Entrega, equipos y Windows',
      body:
        '<strong>Modo Entrega</strong>: plantillas y + procedimiento. <strong>Mi rotación</strong>: eliminar equipo corregido. En <strong>Windows</strong>, todo el turno en 6.5.9 y firewall (3738) la primera vez en sala.',
    },
  ],
  '6.5.8': [
    {
      title: 'Interno móvil (QR de sala)',
      body:
        'Admin/R4 generan un <strong>QR por sala</strong> para que los MIP registren signos y glucometrías en el celular. Los datos llegan a <strong>Estado actual</strong> y al <strong>Modo Guardia</strong> del residente.',
    },
    {
      title: 'Entrega y rollback',
      body:
        '<strong>Modo Entrega</strong> con pendientes estructurados (estudios/procedimientos y plantillas). Si una actualización falla, en <strong>Ajustes → Aplicación</strong> puedes <strong>restaurar una versión estable anterior</strong> sin perder tu base clínica.',
    },
  ],
  '6.5.7': [
    {
      title: 'Sync LAN de equipos',
      body:
        'Al conectar la sala ⇄ se sincronizan <strong>equipos</strong>, <strong>usuarios LAN</strong> y <strong>eventualidades</strong> entre Macs. Compatible con una Mac en 6.5.6 (stubs de usuario hasta el perfil completo).',
    },
    {
      title: 'Eventualidades en vivo',
      body:
        'Las eventualidades de ambas Macs se fusionan por paciente; al guardar una se dispara sync ⇄ además del host REST.',
    },
  ],
  '6.5.6': [
    {
      title: 'Mi rotación',
      body:
        'Equipos por sala, <strong>tu ciclo</strong> en cada equipo (R1/R2), agregar integrantes por usuario LAN e <strong>invitación por código</strong> para la app del Mac (no Safari).',
    },
    {
      title: 'Conflictos de sincronización',
      body:
        'Al refrescar ya no se abre el comparador una y otra vez: el conflicto queda en <strong>Ajustes → LAN</strong>. Si el texto se ve igual, R+ se alinea con la sala; si no, el modal es más claro y ancho.',
    },
  ],
  '6.5.5': [
    {
      title: 'Reparación para 6.5.4',
      body:
        'Si tras actualizar a <strong>6.5.4</strong> ves «native binding» o la base no abre, usa <strong>Ajustes → Reinstalar actualización de reparación (6.5.5)</strong> en canal <strong>Estable</strong>. Tus datos locales se conservan.',
    },
    {
      title: 'Instalador corregido',
      body:
        'Esta versión repite las novedades de 6.5.4 (identidad LAN, equipos, arranque sin contraseña) con el empaquetado nativo completo en Mac Intel y Apple Silicon.',
    },
  ],
  '6.5.4': [
    {
      title: 'Arranque sin contraseña',
      body:
        'R+ ya <strong>no pide contraseña maestra</strong> al abrir. El almacén clínico se abre solo en este equipo. Si antes quedaste atascado en la pantalla de desbloqueo, actualiza a esta versión.',
    },
    {
      title: 'Configura tu rotación',
      body:
        'Al abrir la base verás el asistente en el <strong>centro de la pantalla</strong>: usuario LAN, equipos de tu sala y unirte o crear equipo. También en la barra lateral y en <strong>Mi Perfil</strong> → <strong>Mi rotación</strong>.',
    },
    {
      title: 'Equipos sin “Guardia hoy”',
      body:
        'Los <strong>equipos</strong> son unidades persistentes de sala/ciclo: créalos o únete sin marcar guardia del día en el equipo. Los pacientes se asocian por <strong>coincidencia estructural</strong>.',
    },
    {
      title: 'R4 / Admin: filtros censo',
      body:
        '<strong>R4</strong> y <strong>Admin</strong> ven filtros <strong>Sala / Equipo / Servicio</strong> en la barra lateral (colapsables). <strong>R1–R3</strong> no ven ese bloque; su lista sigue el alcance clínico.',
    },
  ],
  '5.6.3': [
    {
      title: 'Laboratorio y pacientes',
      body:
        'Al cambiar de paciente el laboratorio se limpia y el historial se expande. Orden de tarjetas por <strong>arrastre</strong> (SortableJS) y vista de ronda más compacta.',
    },
    {
      title: 'Modo Pase y receta',
      body:
        'Vista <strong>Pase</strong> con agenda y pendientes en fila; dosis de medicación solo antes de <code>//</code>; chips compactos en UI grandes.',
    },
    {
      title: 'Actualizaciones',
      body:
        'Canal <strong>Estable</strong> por defecto; pre-releases solo si lo activas en Ajustes.',
    },
  ],
  '6.5.2': [
    {
      title: 'Recuperación de contraseña',
      body:
        'Si olvidas tu contraseña maestra, haz clic en <strong>¿Olvidaste tu contraseña?</strong> en la pantalla de desbloqueo e ingresa el <strong>código de recuperación</strong> que R+ te mostró al configurar la base (es único de esta instalación).',
    },
    {
      title: 'Llave de respaldo automática',
      body:
        'Cada vez que desbloqueas la base, se guarda automáticamente una copia cifrada (AES-256-GCM) de tu llave; no requiere configuración manual.',
    },
    {
      title: 'Modo Guardia (prototipo)',
      body:
        'El <strong>Modo Guardia</strong> está en desarrollo y <strong>aún no funciona</strong> para uso clínico real. Es un prototipo funcional. No lo uses para decisiones clínicas.',
    },
  ],
  '6.5.1': [
    {
      title: 'Perfil farmacoterapéutico',
      body:
        'En <strong>Medicamentos → Perfil histórico</strong>: calendario mensual SOME, marcas <strong>no administrado</strong>, adherencia por fila y merge desde <strong>Receta</strong>.',
    },
    {
      title: 'Datos clínicos cifrados',
      body:
        'En escritorio, pacientes y expediente viven en una base <strong>SQLCipher</strong> con contraseña maestra; migración automática la primera vez que desbloqueas.',
    },
    {
      title: 'Auditoría y respaldos',
      body:
        '<strong>Verificar cadena</strong> de integridad en Ajustes; export/import del almacén cifrado desde <strong>Respaldos, sync y recuperación</strong>.',
    },
    {
      title: 'Sala en vivo',
      body:
        'El perfil se sincroniza en <strong>⇄</strong>; <strong>borradores de conflicto</strong> en el panel LAN hasta resolver cambios simultáneos.',
    },
  ],
  '6.5.0': [
    {
      title: 'Historia Clínica (Sala)',
      body:
        'Formulario institucional en <strong>3 pasos</strong> con catálogos APP, AHF e IPAS; vista <strong>Lectura</strong> con narrativa compilada; ancla de labs de ingreso y sync en <strong>⇄</strong>.',
    },
    {
      title: 'Eventualidades y Clínico reorganizado',
      body:
        'En <strong>Sala</strong>, <strong>Clínico</strong> agrupa <strong>Historia Clínica → Estado actual → Eventualidades → Manejo</strong>. Bitácora clínica por día en <strong>Eventualidades</strong>.',
    },
    {
      title: 'Word sin Python',
      body:
        '<strong>Nota</strong>, <strong>Indicaciones</strong> y <strong>Listado</strong> se generan en Node; el instalador ya no depende de Python para esos <code>.docx</code>.',
    },
    {
      title: 'Sala en vivo más robusta',
      body:
        'Fusión por <strong>versión</strong> de entidad, cola de escritura en el anfitrión y panel de <strong>conflictos</strong> con borrador local hasta resolver.',
    },
  ],
  '6.4.2': [
    {
      title: 'Censo PDF en instalador',
      body:
        'La exportación de <strong>censo PDF</strong> vuelve a incluirse correctamente en el build de escritorio.',
    },
    {
      title: 'Arranque',
      body: 'Corrección menor que impedía abrir la app en algunos instaladores recientes.',
    },
  ],
  '6.4.1': [
    {
      title: 'Misma base que 6.4.0',
      body:
        'VPO, formatos en Nota/Indicaciones, censo PDF y el resto de <strong>6.4.0</strong> sin pantallas nuevas; versión de mantenimiento.',
    },
    {
      title: 'Publicación más segura',
      body:
        '<code>release:publish</code> comprueba tag y release en GitHub antes del build para evitar repetir <strong>6.4.0</strong> por error.',
    },
    {
      title: 'Tests al publicar',
      body: 'Corrección en censo PDF para que la batería de tests pase en Node durante el release.',
    },
  ],
  '6.4.0': [
    {
      title: 'Valoración preoperatoria (VPO)',
      body:
        'Nueva pestaña <strong>VPO</strong> con calculadora ASA, RCRI, Gupta, ARISCAT y Caprini; EKG/Rx editables; fármacos perioperatorios desde la receta SOME y bloques para copiar.',
    },
    {
      title: 'Procedimiento y diagnósticos',
      body:
        'Catálogo <strong>Gupta</strong> con búsqueda; diagnósticos importables desde la nota; botones para tomar labs y signos del expediente sin pisar lo escrito.',
    },
    {
      title: 'Formatos en Nota e Indicaciones',
      body:
        'Desde <strong>Mi Perfil</strong>, edita plantillas en blanco en las pestañas del expediente (misma vista que al atender) y pulsa <strong>Guardar</strong> al final.',
    },
  ],
  '6.3.6': [
    {
      title: 'Cultivos multipaciente',
      body:
        'Varios <strong>MICROORGANISMO</strong> en un informe SOME: <strong>una fila por aislamiento</strong> en Cultivos, con cuenta y antibiograma (R/I/S) por germen.',
    },
    {
      title: 'Preliminar y resistencia',
      body:
        'Cabecera <strong>Preliminar</strong> sin ATB; marcas <strong>BLEE</strong>, <strong>Carb-R</strong> y <strong>BLAC</strong> por aislamiento; alertas en <strong>Manejo → ATB</strong>.',
    },
    {
      title: 'Sala en vivo — anfitrión suplente',
      body:
        'Si el anfitrión cierra R+ o deja de responder, otra <strong>Mac o Windows</strong> con R+ de escritorio (enlace de invitación) asume el servidor hasta que vuelva; el equipo reconecta solo cuando puede.',
    },
  ],
  '6.3.5': [
    {
      title: 'Bomba de insulina (switch)',
      body:
        'Interruptor como en <strong>Vista de laboratorio</strong>: activado solo filas con <strong>unidades</strong>; apagado, glucometrías normales.',
    },
    {
      title: 'Sala en vivo — Unirse',
      body:
        'Corregido <strong>Unirse</strong> en la lista de salas: el botón vuelve a responder al primer clic.',
    },
  ],
  '6.3.4': [
    {
      title: 'Estado Actual — multilectura',
      body:
        'Hasta <strong>4 lecturas</strong> del mismo signo vital en el turno con botón <strong>+1</strong> en T°, TA, FC, FR y SatO₂; hora opcional por lectura.',
    },
    {
      title: 'Bomba de insulina',
      body:
        'Registro opcional de glu + unidades + hora; el texto SOAP incluye <strong>BOMBA DE INSULINA</strong> cuando aplica.',
    },
    {
      title: 'Expediente y Sala en vivo',
      body:
        'Al cambiar de paciente conservas la pestaña (<strong>Estado actual</strong>, Tendencias…). Corregido <strong>Copiar invitación</strong> en ⇄.',
    },
  ],
  '6.3.3': [
    {
      title: 'Guía clínica',
      body:
        '<strong>Manejo</strong> oculto hasta confirmar con la frase del modal; <strong>Nota</strong> e <strong>Indicaciones</strong> siguen en Clínico.',
    },
    {
      title: 'Modales',
      body:
        '<strong>Esc</strong> y clic en el fondo vuelven a cerrar ayuda, laboratorio, perfil, Estado Actual y capas anidadas.',
    },
    {
      title: 'Tendencias y gasometría',
      body:
        'Interpretación extendida con <strong>razonamiento</strong> y tooltips; sparks ligeros; filtro <strong>Solo fuera de rango</strong>.',
    },
  ],
  '6.3.2': [
    {
      title: 'Pegar monitoreo',
      body:
        'En <strong>Estado Actual</strong>, pega T°, FC, TA, DXT, I, E y EVAC; el balance resta todas las salidas en cc (ignora <strong>B:</strong>).',
    },
    {
      title: 'Egresos en el SOAP',
      body:
        'Diuresis, drenajes y nefrostomías se listan por separado en el texto; evacuaciones con <strong>NC</strong> o frase libre.',
    },
    {
      title: 'Receta y pendientes',
      body:
        'Receta hospitalaria por paciente; pendientes <strong>Repo</strong> eliminados o hechos no reaparecen tras reiniciar ni con LiveSync.',
    },
  ],
  '6.3.1': [
    {
      title: 'Cultivos y micobacterias',
      body:
        'Secreción de herida con paréntesis en el nombre, reportes <strong>MYCOBACTERIAS</strong> (baciloscopia + cultivo) y muestra desde <strong>OBSERVACIONES</strong> vuelven a reflejarse bien en <strong>Cultivos</strong>.',
    },
    {
      title: 'Gasometría venosa / mixta',
      body:
        'pH, PCO2 y HCO3 aunque los flags A/B vayan en líneas separadas; la interpretación puede incluir trastorno metabólico concomitante.',
    },
    {
      title: 'Estado Actual',
      body: 'Cuadritos de signos vitales sin artefactos en las esquinas.',
    },
  ],
  '6.3.0': [
    {
      title: 'Sala en vivo más simple',
      body:
        'En Mac: sin pestañas Anfitrión/Cliente; <strong>Activar sala en vivo</strong>, crear o unirse a salas y compartir el enlace. Opción para unirse a la sala de otra computadora.',
    },
    {
      title: 'Reconexión estable',
      body:
        'Corregido el estado <strong>reconectando…</strong> que podía quedarse fijo al reconectar LiveSync en la misma sala.',
    },
    {
      title: 'Sesiones guardadas',
      body: 'Si ya estás en una sala, el botón muestra <strong>En sala</strong> en lugar de <strong>Unirse</strong>.',
    },
  ],
  '6.2.1': [
    {
      title: 'Expediente más fluido',
      body:
        'Menos pausa al cambiar de paciente y al volver a <strong>Estado actual</strong> o <strong>Resultados</strong>. La app carga el frontend en un solo bundle y reutiliza paneles ya pintados.',
    },
    {
      title: 'Ocultar solo Manejo',
      body:
        'En <strong>Mi Perfil → Expediente</strong>, <strong>Ocultar Manejo en Clínico</strong> deja visibles Nota e Indicaciones en Interconsulta; solo quita el segmento Manejo.',
    },
    {
      title: 'Corrección Sala',
      body:
        'En modo Sala, la pestaña <strong>Resultados</strong> ya no muestra el formulario de Nota encima de Tendencias.',
    },
  ],
  '6.2.0': [
    {
      title: 'Estado Actual en Sala',
      body:
        'Nueva pestaña <strong>Estado actual</strong> en el expediente: signos vitales, glucometrías, balance hídrico, historial, gráficas y texto clínico copiable. Botón verde en el encabezado para abrir el panel.',
    },
    {
      title: 'Laboratorio — salida rápida',
      body:
        'En <strong>Vista de laboratorio</strong> (engranaje) puedes activar <strong>Salida rápida</strong> para formatear SOME sin tener al paciente en tu lista.',
    },
    {
      title: 'Expediente más ágil',
      body:
        'Menos lag al cambiar pestañas: carga diferida de Manejo, Tendencias y gráficas; precarga al pasar el mouse y caché al volver a una pestaña ya visitada.',
    },
  ],
  '6.1.0': [
    {
      title: 'Manejo: Infusiones, ATB y CAD/EHH',
      body:
        'Expediente → Clínico → <strong>Manejo</strong> ahora incluye cuatro sub-pestañas. <strong>Infusiones</strong> (vasopresores, sedación y calculadoras), <strong>ATB</strong> (catálogo con sugerencias según cultivos) y <strong>CAD/EHH</strong> (checklist ADA con lectura de laboratorio), además de <strong>Electrolitos</strong>.',
    },
    {
      title: 'ATB asistido',
      body:
        'Filtra por familia o indicación, revisa dosis y ajuste renal desde laboratorios recientes, y copia la indicación SOME sin +Pendiente.',
    },
    {
      title: 'Pestañas clínicas unificadas',
      body:
        'Nota, Indicaciones y las sub-pestañas de Manejo comparten la misma barra subrayada para navegar el expediente con menos fricción.',
    },
  ],
  '6.0.1': [
    {
      title: 'Laboratorio: entrada masiva',
      body:
        'Pega varios reportes SOME en el mismo cuadro. Varios días del mismo paciente van seguidos; entre pacientes distintos usa Separador de paciente. Al procesar pegados masivos, la vista previa muestra pacientes, días y errores antes de guardar.',
    },
    {
      title: 'Receta HU → PDF',
      body:
        'Exportación PDF con plantilla oficial HU 000-061-R-06-12 desde el servidor local de R+.',
    },
    {
      title: 'Tutorial actualizado',
      body:
        'El tour usa dos días de laboratorio de DEMO PÉREZ (alta en el censo al procesar) y explica el separador multi-paciente con ejemplo DEMO GARCÍA.',
    },
  ],
  '6.0.0': [
    {
      title: 'Expediente en 4 pestañas',
      body:
        'Paciente, Clínico, Resultados y Salida — en Sala (Manejo; Salida: Listado + Receta HU) e Interconsulta (Nota, Indicaciones, Manejo + Receta HU). Datos del paciente en bloque colapsable.',
    },
    {
      title: 'Modo Pase sin cambios en el resumen',
      body:
        'El tablero de ronda se ve igual que antes. Al abrir el detalle en pestañas (vista Normal) entras al expediente reorganizado.',
    },
    {
      title: 'Manejo clínico',
      body:
        'Expediente → Clínico → <strong>Manejo</strong>: cuatro sub-pestañas — <strong>Electrolitos</strong> (alteraciones con SOME copiable), <strong>Infusiones</strong> (infusiones y sedación con calculadoras), <strong>ATB</strong> (catálogo con sugerencias según cultivos positivos) y <strong>CAD/EHH</strong> (checklist ADA con lectura de laboratorio). Receta HU exporta PDF oficial; en Sala e Interconsulta está en Expediente → Salida.',
    },
  ],
  '5.2.1': [
    {
      title: 'Interfaz Arc',
      body:
        'Cáscara flotante con esquinas radiales, paneles unificados y rail discreto cuando ocultas la barra de pacientes.',
    },
    {
      title: 'Correcciones UX',
      body:
        'Agenda con un solo panel; pestaña Datos sin perder el foco al escribir; esquinas alineadas con sidebar auto-oculto.',
    },
  ],
  '5.2.0': [
    {
      title: 'Integración Neo',
      body:
        'Envía tablas SOME y tendencias a la app Neo (antes Sesión de Ingreso) con los botones Enviar a Neo.',
    },
    {
      title: 'Tutorial Sala',
      body:
        'El tour señala dónde enviar laboratorio y gráficas; durante el tutorial no se abre Neo.',
    },
  ],
  '5.1.0': [
    {
      title: 'Tablas del reporte SOME',
      body:
        'Tras procesar un SOME, abre el modal desde Resultados: cada departamento en tabla con flags de alerta y secciones plegables.',
    },
    {
      title: 'Copiar TSV o PNG por departamento',
      body:
        'Desde el modal, copia una sección entera al portapapeles como tabla (TSV) o imagen (PNG) para pegar en notas o mensajes.',
    },
    {
      title: 'Parser SOME más fiable',
      body:
        'Mejor lectura de EGO, citoquímico de líquidos y química; menos filas basura. Historial de labs más estable al restaurar respaldos.',
    },
  ],
  '5.0.4': [
    {
      title: 'Historial de labs reparado',
      body:
        'Corrige respaldos con historial mal formado que impedían abrir Laboratorio (error forEach en sets corruptos).',
    },
  ],
  '5.0.3': [
    {
      title: 'Copiar labs en Windows',
      body:
        'Tras procesar un reporte verás Copiar en Resultados y el botón flotante; en Windows queda por encima de la barra de tareas.',
    },
    {
      title: 'Tendencias al estilo SOME',
      body:
        'Las gráficas de BH y química sanguínea siguen el orden del informe; más parámetros de diferencial listos para mostrar.',
    },
  ],
  '5.0.2': [
    {
      title: 'Código más modular',
      body:
        'La app arranca desde un bootstrap liviano; laboratorio, pacientes, Pase y ajustes viven en módulos separados para mantener y probar más fácil.',
    },
    {
      title: 'Pase y pacientes corregidos',
      body:
        'Tras el refactor: selección en la lista, guardado de pacientes y resumen Modo Pase vuelven a mostrarse al elegir un expediente.',
    },
  ],
  '5.0.1': [
    {
      title: 'Diferencial manual y BH legible',
      body:
        'SOME con diferencial manual: Segmentados, bandas y coagulación en salida clara (Dif. / Coag.), sin confundir con biometría automática ni EGO.',
    },
    {
      title: 'Tendencias BH y gráfica fullscreen',
      body:
        'Panel Diferencial manual en gráficas y tablas con nombres del reporte. Modal Gráfica del estudio a pantalla completa.',
    },
    {
      title: 'LiveSync: borrados en la sala',
      body:
        'Al quitar un pendiente o eliminar un paciente en la sala ⇄, el cambio se aplica en todos los equipos conectados.',
    },
  ],
  '3.5.0': [
    {
      title: 'Gráfica y tabla por estudio',
      body:
        'En Tendencias, pulsa «Gráfica» en un estudio (BH, QS, gases…): tendencias agrupadas por panel y tabla copiable (PNG o TSV).',
    },
    {
      title: 'Paneles, títulos y cierre unificado',
      body:
        'Reordena u oculta paneles; edita el título de cada gráfica con un clic. Todas las ventanas se cierran con Esc o clic fuera (sin botones × / Cerrar).',
    },
  ],
  '3.4.1': [
    {
      title: 'Sugerencias clínicas desde laboratorio',
      body:
        'Al procesar labs, R+ puede agregar un pendiente automático si Hb < 7 g/dL (transfusión). Las reposiciones electrolíticas no se agregan solas: usa Manejo → Electrolitos y el botón + Pendiente. Sin duplicar la misma regla el mismo día.',
    },
    {
      title: 'Medicamentos: +1 día (DIA#)',
      body:
        'Botón +1 día en Medicamentos para incrementar el día de tratamiento sin volver a pegar del hospital (todos los ítems con DIA# activos).',
    },
  ],
  '3.4.0': [
    {
      title: 'R+ Móvil (Safari, misma Wi‑Fi)',
      body:
        'Abre el enlace móvil en iPad o teléfono: la misma interfaz R+ que en escritorio (sin generar Word). Sincroniza pacientes, labs, pendientes y agenda por sala LiveSync. Copia el enlace en ⇄ → Copiar enlace móvil.',
    },
    {
      title: 'Tutorial: LiveSync al terminar',
      body:
        'Al completar el recorrido Sala o Interconsulta, el tutorial explica ⇄, salas en vivo y la versión móvil.',
    },
  ],
  '3.3.2': [
    {
      title: 'LAN: código 1234 y expediente en sala',
      body:
        'El código de equipo por defecto es 1234. Al unirte a una sala ⇄ se fusionan pacientes, notas, laboratorios, agenda y pendientes entre el equipo, sin borrar los pacientes que solo existen en tu R+.',
    },
    {
      title: 'Copiar labs (3.3.1)',
      body:
        'Copiar en Resultados vuelve a usar el texto compacto de R+, no el informe crudo de SOME.',
    },
  ],
  '3.3.1': [
    {
      title: 'Copiar labs corregido',
      body:
        'El botón Copiar en Resultados vuelve a copiar el texto compacto de R+ (BH, QS, gases, etc.), no el informe crudo pegado desde SOME con tablas y flags sueltos.',
    },
  ],
  '3.3.0': [
    {
      title: 'LiveSync por sala',
      body:
        'Al unirte a una sala LAN (⇄), la agenda de procedimientos y los pendientes del expediente se comparten en tiempo real con el equipo en esa sala. Al salir se guarda un snapshot local para reconciliar al volver.',
    },
    {
      title: 'Copiar prompt IA (Listado)',
      body:
        'En Listado de problemas, el botón Copiar prompt IA lleva al portapapeles la plantilla para generar el listado activo/inactivo y planes iniciales en un chat externo.',
    },
  ],
  '3.2.2': [
    {
      title: 'Actualizaciones en canal Estable',
      body:
        'Con Estable seleccionado en Ajustes, la app vuelve a detectar releases oficiales en GitHub (incluido salto desde versiones 3.0.x). Al cambiar de canal se busca de nuevo. El aviso Pre-release solo aparece en borradores reales de GitHub.',
    },
    {
      title: 'Laboratorio (BH, Copiar, asteriscos)',
      body:
        'BH compacta sin línea extendida; botón Copiar en Resultados; valores alterados con * al copiar. Ver detalle en notas de 3.2.1 si vienes de 3.2.0.',
    },
  ],
  '3.2.1': [
    {
      title: 'Laboratorio: BH compacta y Copiar visible',
      body:
        'Con BH extendida apagada, la primera línea solo lleva Hb, Hto, VCM, HCM, Leu, Neu, Eos y Plt (más coag si aplica); RBC, CHCM, RDW, MPV y reticulocitos van a la segunda línea solo cuando activas la preferencia. El botón Copiar del encabezado de Resultados vuelve a verse en densidad de interfaz normal.',
    },
    {
      title: 'Alterados con asterisco al copiar',
      body:
        'El texto generado para portapapeles y nota conserva el * en valores fuera de rango. En pantalla el asterisco aparece en rojo junto al valor; se evita copiar el texto “, alterado” al seleccionar los resultados.',
    },
  ],
  '3.2.0': [
    {
      title: 'Interfaz “soft” y rendimiento',
      body:
        'Superficies sólidas (sin vidrio animado pesado para la GPU), sombras más ligeras, lista de pacientes y tarjetas sin desplazamientos costosos al hacer hover; botón principal en degradados solo violeta (--action).',
    },
    {
      title: 'Tutorial: Modo Pase en ambos flujos',
      body:
        'El recorrido guiado para Sala y para Interconsulta incluye el mismo paso de vista Pase (resumen de ronda); después el tour continúa en pestañas completas. Versión estable 3.2.',
    },
  ],
  '3.0.2': [
    {
      title: 'Gasometría e historial',
      body:
        'Delta-delta e interpretación clínica cuando hay datos. Reprocesar desde el historial usando el texto guardado y deduplicación al consolidar entradas muy similares.',
    },
    {
      title: 'Laboratorio al cambiar de paciente',
      body:
        'Se limpian los resultados del paciente anterior, el historial se expande y la vista hace scroll a la tarjeta del paciente seleccionado.',
    },
    {
      title: 'Listado de Problemas (.docx)',
      body:
        'Cada problema va en su propia tabla para evitar cortes entre páginas; el texto largo en a) b) c) se parte en párrafos más cortos con cortes en frases.',
    },
    {
      title: 'Tutorial y Mac',
      body:
        'El panel del tour queda por encima del contenido resaltado en el paso del listado. En Apple Silicon, si no hay Python embebido, se prioriza Homebrew en /opt/homebrew.',
    },
  ],
  '3.0.1': [
    {
      title: 'Procalcitonina (PCT)',
      body:
        'El bloque de Estudios Especiales se procesa: la procalcitonina aparece en QS junto a PCR y se marca cuando excede el límite de adulto (por defecto 0.05 ng/mL). Disponible también como serie en Tendencias.',
    },
    {
      title: 'Listado de Problemas en 8 pt',
      body:
        'El texto dinámico del .docx (fecha, número, descripción) ahora sale en 8 pt para que entren más problemas por hoja sin romper el template.',
    },
  ],
  '3.0.0': [
    {
      title: 'Modos Sala / Interconsulta',
      body:
        'El expediente cambia según tu rol. En Mi Perfil eliges Sala o Interconsulta. Sala oculta Nota e Indicaciones, expone Estado Actual y Listado de Problemas, y usa Servicio (con default configurable) en lugar de Área. Los datos del paciente se editan en la pestaña <strong>Datos</strong> del expediente.',
    },
    {
      title: 'Estado Actual',
      body:
        'En Sala, pestaña <strong>Estado Actual</strong>: vitales estructurados, glu, balance I/O, tendencias y confirmación frente a receta hospitalaria; <strong>Copiar</strong> / <strong>Guardar y copiar</strong>. El botón verde del encabezado sigue abriendo la plantilla sin subjetivo.',
    },
    {
      title: 'Listado de Problemas',
      body:
        'Pestaña nueva con Activos e Inactivos sin límite, drag-and-drop, fechas por problema y generador .docx con numeración a) b) c) de Word, títulos en negritas y firma editable (médicos por defecto se configuran en Mi Perfil).',
    },
    {
      title: 'Anion gap en gasometría',
      body:
        'AG (Na − (Cl + HCO3)) se calcula desde Na y Cl de Química Sanguínea o Electrolitos Séricos; si no hay química, no se muestra. Se marca cuando cae fuera de 8–12 mEq/L.',
    },
    {
      title: 'Calcio ionizado',
      body:
        'El bloque de gases extrae Ca++ ionizado desde Observaciones y lo marca según rango.',
    },
    {
      title: 'Tutorial más actionable',
      body:
        'El tour navega a la zona correcta, resalta el control y espera tu acción antes de avanzar. Dock pequeño y semitransparente en la esquina; clic en la barra colapsada para expandirlo. Aviso preventivo si guardas un paciente sin expediente.',
    },
    {
      title: 'Salida rápida ramificada',
      body:
        'En Sala exporta Listado de Problemas (.docx) si hay datos. En Interconsulta exporta Nota igual que antes.',
    },
  ],
  '2.4.1': [
    {
      title: 'Medicamentos (nombre + día) en formato compacto',
      body:
        'La salida resumida ahora usa formato corto: medicamento, dosis, vía abreviada, frecuencia abreviada y día de uso (por ejemplo: MEROPENEM 2G IV C/8H DIA 2).',
    },
    {
      title: 'Tendencias: hover del último punto',
      body:
        'En la mini-gráfica ampliada ya aparece el tooltip con la fecha y el valor cuando pasas el cursor sobre el último punto de la serie.',
    },
  ],
  '2.4.0': [
    {
      title: 'Sidebar de pacientes renovado',
      body:
        'Nueva organización del listado con Pinned/Fijados, archivado de pacientes y reordenamiento por arrastrar y soltar con animación más fluida.',
    },
    {
      title: 'Interacción y limpieza visual',
      body:
        'Mi Perfil se abre tocando R+ en el encabezado. Se simplificaron acciones de cada tarjeta para un layout más limpio y se ajustaron scrollbars translúcidos sin barras horizontales innecesarias en el sidebar.',
    },
    {
      title: 'Nuevos parsers de laboratorio',
      body:
        'R+ ahora procesa Fisicoquímico de heces y Frotis de sangre periférica para que esos resultados se integren al flujo clínico.',
    },
  ],
  '2.3.1': [
    {
      title: 'Tendencias y cultivos',
      body:
        'El panel de tendencias solo incluye analitos de laboratorio convencional (biometría, química, electrolitos, etc.). Los bloques de urocultivo, hemocultivo y similares dejan de aparecer como gráficas; siguen en la pestaña Cultivos del expediente.',
    },
  ],
  '2.3.0': [
    {
      title: 'Tendencias por tipo de estudio',
      body:
        'Las gráficas se agrupan por sección (biometría, química, gases, LCR, etc.) y puedes colapsar cada bloque. El mismo analito no se mezcla entre paneles distintos (por ejemplo hematocrito de biometría frente al de gasometría).',
    },
    {
      title: 'Catálogo amplio y series ocultas',
      body:
        'Más analitos en tendencias; puedes ocultar cada gráfica con el ícono del ojo. Los ocultos aparecen en una barra con chips, «Mostrar todos» y la barra se puede colapsar (se recuerda tu preferencia).',
    },
    {
      title: 'Gasometría',
      body:
        'Si el bloque de gases incluye hematocrito, también se extrae para tendencias en esa sección.',
    },
  ],
  '2.2.1': [
    {
      title: 'Tutorial y ayuda al día',
      body:
        'El recorrido Sala / Interconsulta incluye un paso de <strong>Modo Pase</strong> (resumen de ronda) en ambos flujos; el modal inicial y el tour explican Sincronizar y Consolidar en el historial, la pestaña Cultivos, tendencias y duplicados en Ajustes → Laboratorio. El mini-tour de Laboratorio incluye un paso sobre el historial.',
    },
    {
      title: 'Consolidar, más claro',
      body:
        'El mensaje de confirmación y el tooltip del botón Consolidar describen en lenguaje sencillo cuándo se fusionan envíos del mismo día (solo laboratorio o solo cultivos) y qué pasa con los conjuntos mixtos.',
    },
  ],
  '2.2.0': [
    {
      title: 'Pestaña Cultivos en el expediente',
      body:
        'Tabla con hemocultivo, urocultivo, catéter, Gram y fungicultivo: agrupada por tipo y ordenada del más reciente al más antiguo; arriba un resumen de cultivos negativos.',
    },
    {
      title: 'Historial y tendencias',
      body:
        'Consolidar estudios del mismo día (solo labs o solo cultivos), mejor clasificación de bloques de cultivo, tendencias sin puntos duplicados y fechas al copiar labs.',
    },
  ],
  '2.1.2': [
    {
      title: 'Duplicados en historial de labs',
      body:
        'Sincronizar desde Laboratorio o revisar todos los pacientes en Ajustes → Laboratorio; se quitan entradas repetidas y se mantiene la copia más antigua.',
    },
    {
      title: 'Expediente al pegar el reporte',
      body:
        'Si el texto trae un registro que coincide con otro paciente, R+ cambia a ese paciente. Si el registro no está en la lista, no se guarda el lab en el historial del activo por error.',
    },
  ],
  '2.1.1': [
    {
      title: 'Cultivos polimicrobianos',
      body:
        'Cuando el informe lista varios microorganismos (urocultivo u otros), cada aislamiento se resume con su antibiograma y su cuenta UFC.',
    },
  ],
  '2.1.0': [
    {
      title: 'Cultivos y antibiograma',
      body:
        'Tipo de cultivo y muestra en el resumen; marcas de resistencia (BLEE, carbapenemasas, etc.); antibiograma compacto solo con R, I y ESBL.',
    },
    {
      title: 'Citoquímico de líquidos',
      body:
        'Se procesa el bloque de líquidos corporales (Liq:) sin mezclar esos valores con la química de suero.',
    },
    {
      title: 'Barra lateral',
      body:
        'La lista de pacientes hace scroll por dentro; Mi Perfil y Guardar perfil siguen al alcance.',
    },
  ],
  '2.0.1': [
    {
      title: 'Modal de actualización',
      body:
        'Las notas de la nueva versión se muestran como texto legible dentro de la app, sin etiquetas HTML visibles.',
    },
  ],
  '2.0.0': [
    {
      title: 'Medicamentos y plantilla SOAP',
      body:
        'Nueva pestaña Medicamentos: importa la receta en TSV, copia desde SOME, vuelca a tratamiento o a la plantilla SOAP. Catálogo de clasificación exportable e importable desde Ajustes.',
    },
    {
      title: 'Ajustes y recuperación de datos',
      body:
        'Panel en secciones plegables, centro de ayuda arriba, scroll corregido. Deshacer usa copia en memoria fiable; respaldo automático antes de importar todo, restaurable desde Respaldos.',
    },
    {
      title: 'Laboratorio y tutorial',
      body:
        'Mejoras en historial de laboratorio y recorridos Sala e Interconsulta, con guías más claras en el centro de ayuda.',
    },
  ],
};

function getCuratedReleaseNotes(v) {
  if (v && RELEASE_NOTES_HIGHLIGHTS[v]) return RELEASE_NOTES_HIGHLIGHTS[v];
  return RELEASE_NOTES_HIGHLIGHTS_DEFAULT;
}

function stripHtmlFromReleaseBody(html) {
  var raw = html == null ? '' : String(html);
  if (!raw.trim()) return '';
  try {
    var el = document.createElement('div');
    el.innerHTML = raw;
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  } catch (_err) {
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/** HTML del cuerpo de novedades (solo contenido curado en RELEASE_NOTES_HIGHLIGHTS). */
function releaseNoteBodyHtml(raw) {
  return raw == null ? '' : String(raw);
}

/** Texto breve para el modal de actualización (no el changelog completo de GitHub). */
export function formatCuratedReleaseNotesPlain(version) {
  var notes = getCuratedReleaseNotes(version);
  if (!notes || !notes.length) return '';
  return notes
    .map(function (n) {
      var title = n.title ? String(n.title).trim() : '';
      var body = stripHtmlFromReleaseBody(n.body || '');
      if (title && body) return title + ' — ' + body;
      return title || body;
    })
    .filter(Boolean)
    .join('\n\n');
}

function maybeShowReleaseNotesFor(version, prevVersion) {
  if (!version || !prevVersion || prevVersion === version) return;
  try {
    if (localStorage.getItem(RELEASE_NOTES_SEEN_PREFIX + version)) return;
  } catch (_err) {
    return;
  }
  setTimeout(function(){ showReleaseNotesModal(version); }, 150);
}

/** Vista previa en desarrollo: ignora “ya visto” y abre al cargar la app. */
export function initReleaseNotesDevPreviewIfEnabled(version) {
  if (!RELEASE_NOTES_DEV_FORCE_SHOW || !version) return;
  try {
    localStorage.removeItem(RELEASE_NOTES_SEEN_PREFIX + version);
  } catch (_err) {}
  setTimeout(function () {
    showReleaseNotesModal(version);
  }, 400);
}

var releaseNotesDismissWired = false;

function wireReleaseNotesDismiss() {
  if (releaseNotesDismissWired) return;
  releaseNotesDismissWired = true;
  var bd = document.getElementById('release-notes-backdrop');
  if (!bd) return;
  bd.addEventListener('click', function (ev) {
    if (!bd.classList.contains('open')) return;
    var panel = bd.querySelector('.release-notes-modal');
    if (panel && panel.contains(ev.target)) return;
    closeReleaseNotes();
  });
  document.addEventListener(
    'keydown',
    function (ev) {
      if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
      if (!bd.classList.contains('open')) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeReleaseNotes();
    },
    true
  );
}

function showReleaseNotesModal(version) {
  wireReleaseNotesDismiss();
  var el = document.getElementById('release-notes-backdrop');
  if (!el) return;
  var title = document.getElementById('release-notes-title');
  if (title) title.textContent = 'Novedades de R+ v' + version;
  var list = document.getElementById('release-notes-list');
  if (list) {
    var notes = getCuratedReleaseNotes(version);
    list.innerHTML = '';
    notes.forEach(function(n) {
      var li = document.createElement('li');
      var strong = document.createElement('strong');
      strong.textContent = n.title;
      li.appendChild(strong);
      li.appendChild(document.createTextNode(' — '));
      var span = document.createElement('span');
      span.innerHTML = releaseNoteBodyHtml(n.body);
      li.appendChild(span);
      list.appendChild(li);
    });
  }
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  el.setAttribute('data-version', version);
  setTimeout(function () {
    var panel = el.querySelector('.release-notes-modal');
    if (panel) panel.focus();
  }, 50);
}

export function closeReleaseNotes() {
  var el = document.getElementById('release-notes-backdrop');
  if (!el) return;
  var v = el.getAttribute('data-version');
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  if (v && !RELEASE_NOTES_DEV_FORCE_SHOW) {
    try { localStorage.setItem(RELEASE_NOTES_SEEN_PREFIX + v, '1'); } catch (_err) {}
  }
}

// ── Bloque L · Tours contextuales (mini tours) ─────────────────────
var miniTourActive = false;
var miniTourSteps = null;
var miniTourIdx = 0;

var SETTINGS_MINI_TOUR_STEPS = [
  {
    badge: 'Ajustes · panel',
    body: 'Abrimos el panel de <strong>Ajustes</strong> (icono ⚙ arriba a la derecha). Desde aquí defines la <strong>carpeta de documentos</strong> y el <strong>formato de Salida rápida</strong> (docx / html / txt) para el paciente activo.',
    before: function(){ ensureSettingsDropdownOpen(); }
  },
  {
    badge: 'Ajustes · respaldo',
    body: '<strong>Copias de seguridad</strong>: exporta todo, solo al paciente activo, un rango de fechas, o activa la <strong>copia automática</strong> (hasta 14 snapshots locales rotativos).',
    before: function(){ ensureSettingsDropdownOpen(); expandSettingsAccordionBackupSync(); }
  },
  {
    badge: 'Ajustes · sync',
    body: 'Si usas R+ en más de un equipo, el <strong>Paquete sync</strong> intercambia JSON cifrados con passphrase y combina cambios sin pisar lo que ya tenías.',
    before: function(){ ensureSettingsDropdownOpen(); expandSettingsAccordionBackupSync(); }
  },
  {
    badge: 'Ajustes · datos',
    body: 'En <strong>Datos en esta computadora</strong> puedes abrir la carpeta del perfil donde Electron guarda pacientes y notas. No compartas esa carpeta si contiene información sensible.',
    before: function(){ ensureSettingsDropdownOpen(); }
  },
  {
    badge: 'Ajustes · aplicación',
    body: 'Arriba del panel está el acceso directo al <strong>centro de ayuda</strong>. En <strong>Aplicación</strong> (sección inferior) ves la versión y puedes <strong>buscar actualizaciones</strong>.',
    before: function(){ ensureSettingsDropdownOpen(); }
  }
];

var LAB_MINI_TOUR_STEPS = [
  {
    badge: 'Laboratorio · pegar',
    body: 'Estás en la pestaña <strong>Laboratorio</strong>. Pega el reporte del laboratorio en el cuadro de texto. R+ reconoce biometría, química, electrolitos, gasometría, pruebas hepáticas y más.',
    before: function(){ rt.switchAppTab('lab'); }
  },
  {
    badge: 'Laboratorio · procesar',
    body: 'Pulsa <strong>Procesar</strong>: R+ genera diagramas automáticos (Gamble, BH, Química, Coagulación…) y una tabla de resultados con los valores alterados resaltados en rojo.',
    before: function(){ rt.switchAppTab('lab'); }
  },
  {
    badge: 'Laboratorio · copiar',
    body: 'Tras procesar, usa el botón flotante <strong>Copiar</strong> o el de cada diagrama. Con paciente activo, los resultados quedan en historial y en el expediente.',
    before: function(){ rt.switchAppTab('lab'); },
    dockLeft: true,
  },
  {
    badge: 'Laboratorio · tendencias',
    body: 'Cada laboratorio procesado con paciente activo se guarda con su fecha. Con dos o más labs aparecen mini-gráficas en <strong>Expediente → Tendencias</strong>.',
    before: function(){ rt.switchAppTab('lab'); }
  },
  {
    badge: 'Laboratorio · historial',
    body: 'En la tarjeta <strong>Historial de laboratorio</strong>, <strong>Sincronizar</strong> abre el checklist para eliminar duplicados (misma fecha/hora y mismos valores). <strong>Consolidar</strong> fusiona conjuntos del mismo día si son homogéneos (solo labs o solo cultivos). Así las tendencias y la nota no arrastran repeticiones.',
    before: function(){ rt.switchAppTab('lab'); }
  },
  {
    badge: 'Evolución · SOAP y medicamentos',
    body: 'En <strong>Expediente → Notas</strong> usa la <strong>plantilla SOAP</strong> para párrafos estructurados. La pestaña <strong>Medicamentos</strong> importa la receta del hospital y puede mandar dosis a SOAP o al tratamiento.',
    before: function(){ rt.switchAppTab('nota'); }
  }
];

function ensureSettingsDropdownOpen() {
  var dd = document.getElementById('settings-dropdown');
  if (dd && !dd.classList.contains('open')) toggleSettingsDropdown();
}

function startMiniTour(kind) {
  if (guidedTourActive) {
    rt.showToast('Finaliza el tutorial actual antes de iniciar un recorrido breve.', 'error');
    return;
  }
  var steps = null;
  if (kind === 'ajustes') steps = SETTINGS_MINI_TOUR_STEPS;
  else if (kind === 'lab') steps = LAB_MINI_TOUR_STEPS;
  if (!steps || !steps.length) return;
  closeQuickHelp();
  miniTourActive = true;
  miniTourSteps = steps;
  miniTourIdx = 0;
  showTourDock();
  renderMiniTourStep();
}

function renderMiniTourStep() {
  if (!miniTourActive || !miniTourSteps) return;
  var step = miniTourSteps[miniTourIdx];
  if (!step) { endMiniTour(); return; }
  if (typeof step.before === 'function') {
    try { step.before(); } catch (_err) {}
  }
  var badge = document.getElementById('tour-step-badge');
  var body = document.getElementById('tour-dock-body');
  var nextBtn = document.getElementById('tour-btn-next');
  var skipBtn = document.querySelector('#tour-dock .btn-tour-skip');
  if (badge) {
    badge.textContent = step.badge + ' · ' + (miniTourIdx + 1) + ' / ' + miniTourSteps.length;
  }
  if (body) body.innerHTML = step.body;
  if (nextBtn) {
    nextBtn.style.display = '';
    nextBtn.disabled = false;
    nextBtn.textContent = miniTourIdx === miniTourSteps.length - 1 ? 'Finalizar' : 'Siguiente';
  }
  if (skipBtn) skipBtn.textContent = 'Cerrar recorrido';
  syncTourDockPlacement();
}

function miniTourNext() {
  if (!miniTourActive) return;
  if (miniTourIdx >= (miniTourSteps ? miniTourSteps.length : 0) - 1) {
    endMiniTour();
    return;
  }
  miniTourIdx++;
  renderMiniTourStep();
}

function endMiniTour() {
  miniTourActive = false;
  miniTourSteps = null;
  miniTourIdx = 0;
  hideTourDock();
  var skipBtn = document.querySelector('#tour-dock .btn-tour-skip');
  if (skipBtn) skipBtn.textContent = 'Omitir tutorial';
}

function startHelpTourMain() {
  if (miniTourActive) endMiniTour();
  if (isPresentationModeActive()) {
    rt.showToast('Finaliza el modo presentación antes de iniciar el tutorial guiado.', 'error');
    return;
  }
  closeQuickHelp();
  resetAndStartOnboarding();
}

function startTourModule(chapterId) {
  var branch = String(chapterId || '').indexOf('ch-ic') === 0 ? 'interconsulta' : 'sala';
  var stepId = getFirstStepIdForChapter(chapterId, branch);
  if (!stepId) return;
  if (guidedTourActive) {
    rt.showToast('Finaliza o pausa el tutorial actual primero.', 'error');
    return;
  }
  if (miniTourActive) endMiniTour();
  if (isPresentationModeActive()) {
    rt.showToast('Finaliza el modo presentación antes de iniciar un módulo.', 'error');
    return;
  }
  guidedTourMode = 'base';
  resetTourUiBeforeResume();
  startOnboarding(branch, { resumeStepId: stepId, skipIntro: true });
}

function startHelpTourInterconsulta() {
  if (guidedTourActive) {
    rt.showToast('Finaliza o pausa el tutorial actual primero.', 'error');
    return;
  }
  if (miniTourActive) endMiniTour();
  if (isPresentationModeActive()) {
    rt.showToast('Finaliza el modo presentación antes de iniciar el tutorial.', 'error');
    return;
  }
  closeQuickHelp();
  hideTourIntroModal();
  guidedTourMode = 'base';
  startOnboarding('interconsulta', { skipIntro: true });
}

function togglePresentationModeFromHelp() {
  if (guidedTourActive) {
    rt.showToast('Finaliza el tutorial guiado antes del modo presentación.', 'error');
    return;
  }
  if (miniTourActive) endMiniTour();
  closeQuickHelp();
  closeSettingsDropdown();
  if (isPresentationModeActive()) stopPresentationMode();
  else startPresentationMode();
}

export {
  DEMO_PATIENT_ID,
  isTourDemoPatientId,
  maybeShowReleaseNotesFor,
  resolveAppVersionForTour,
  markGuidedTourVersionDone,
  initGuidedTourGate,
  guidedTourAdvanceAfterNotaGenerated,
  guidedTourAdvanceAfterIndicaGenerated,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  closeLabBulkTourHintModal,
  syncTeamSyncHeaderButton,
  toggleSettingsDropdown,
};

export const settingsHelpWindowHandlers = {
  toggleSettingsSection,
  toggleSettingsDropdown,
  closeSettingsDropdown,
  expandSettingsAccordionBackupSync,
  syncTeamSyncHeaderButton,
  openQuickHelp,
  closeQuickHelp,
  onHelpSearchInput,
  onHelpSearchKeydown,
  onHelpListKeydown,
  closeReleaseNotes,
  startMiniTour,
  startHelpTourMain,
  togglePresentationModeFromHelp,
  exportCensoPdfFromHelp,
  guidedTourIntroChooseSala,
  guidedTourIntroChooseInterconsulta,
  guidedTourIntroSkip,
  skipGuidedTour,
  toggleTourDockCollapsed,
  onTourDockClick,
  guidedTourClickNext,
  guidedTourClickPrev,
  guidedTourPause,
  resumeGuidedTourFromProgress,
  startTourModule,
  startHelpTourInterconsulta,
  startNeoCompanionTour,
  resetAndStartOnboarding,
  closeLabBulkTourHintModal,
  insertLabTourSecondPatientExample,
};

registerTourDemoPatientHooks({
  isTourActive: function () {
    return guidedTourActive;
  },
  getTourStep: function () {
    return tourStepId;
  },
  applyBundle: applyTourDemoPatientBundle,
  scheduleLabPatientRegistration: scheduleTourDemoPatientRegistrationFromLab,
  switchAppTab: function (tab) {
    rt.switchAppTab(tab);
  },
  showToast: function (msg, type) {
    rt.showToast(msg, type);
  },
});
