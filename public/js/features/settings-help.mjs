/** Settings dropdown, guided tours, help center, release notes. */
import {
  getTourSteps,
  getTourTarget,
  stepRequiresUserAction,
} from '../tour-targets.mjs';
import { syncGuidedTourContext } from '../tour-guards.mjs';
import {
  isPresentationModeActive,
  startPresentationMode,
  stopPresentationMode,
  registerPresentationRuntime,
} from '../presentation-mode.mjs';
import { exportCensoPdfFromHelp } from '../censo-export.mjs';
import { applyAppModeSwitchEffects } from './profile.mjs';
import { DEMO_TOUR_LAB_PASTE, DEMO_GARCIA_LAB_REPORT, DEMO_SOME_LAB_REPORT, OLDER_DEMO_SOME_LAB_REPORT } from '../tour-demo-some-lab.mjs';
import { LAB_BULK_PATIENT_SEPARATOR } from '../lab-bulk-paste.mjs';
import { buildTourDemoListadoProblemas } from '../tour-demo-listado-problemas.mjs';
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
/** @type {string|null} paso actual del tour guiado (null = inactivo) */
var tourStepId = null;

function publishTourGuardContext() {
  syncGuidedTourContext({
    active: guidedTourActive,
    stepId: tourStepId,
  });
}

publishTourGuardContext();

var DEMO_PATIENT_ID = 'demo-onboarding';
var DEMO_PATIENT_ID_2 = 'demo-onboarding-2';
var DEMO_LAB_REPORT = DEMO_TOUR_LAB_PASTE;

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


function toggleSettingsDropdown() {
  closeConnectionDropdown();
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (!dd) return;
  var open = dd.classList.contains('open');
  dd.classList.toggle('open', !open);
  if (bg) bg.classList.toggle('open', !open);
  var trigger = document.getElementById('btn-open-settings');
  if (trigger) trigger.setAttribute('aria-expanded', !open ? 'true' : 'false');
  if (!open) rt.syncPreimportBackupUi();
  if (!open) rt.syncSettingsLanHostDiskSection();
}
export function closeSettingsDropdown() {
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (dd) dd.classList.remove('open');
  if (bg) bg.classList.remove('open');
  var trigger = document.getElementById('btn-open-settings');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
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
  startOnboarding('sala');
}

function guidedTourIntroChooseInterconsulta() {
  hideTourIntroModal();
  startOnboarding('interconsulta');
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
  if (t && t.closest && t.closest('.btn-tour-skip, .btn-tour-collapse, .btn-tour-next')) return;
  setTourDockCollapsed(false);
  ev.stopPropagation();
}

function openLabBulkTourHintModal() {
  var backdrop = document.getElementById('lab-bulk-tour-hint-backdrop');
  var sample = document.getElementById('lab-bulk-tour-hint-sample');
  if (sample) {
    sample.textContent = LAB_BULK_PATIENT_SEPARATOR + '\n\n' + DEMO_GARCIA_LAB_REPORT.trim();
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
  var ta = document.getElementById('lab-input');
  if (!ta) return;
  if (String(ta.value || '').indexOf('0007755-3') !== -1) {
    rt.showToast('El ejemplo de DEMO GARCÍA ya está en el cuadro', 'info');
    closeLabBulkTourHintModal();
    return;
  }
  if (!String(ta.value || '').trim()) ta.value = DEMO_LAB_REPORT;
  ta.value = String(ta.value || '').trimEnd() + '\n' + LAB_BULK_PATIENT_SEPARATOR + '\n' + DEMO_GARCIA_LAB_REPORT;
  closeLabBulkTourHintModal();
  rt.showToast('Ejemplo de DEMO GARCÍA insertado ✓', 'success');
}

function seedDemoTrendHistory() {
  try {
    var older = procesarLabs(OLDER_DEMO_SOME_LAB_REPORT).resLabs;
    var newer = procesarLabs(DEMO_SOME_LAB_REPORT).resLabs;
    labHistory[DEMO_PATIENT_ID] = [
      { id: 'tour-trend-1', fecha: '05/03/2026', hora: '', resLabs: older, parsed: extractParsedValues(older) },
      { id: 'tour-trend-2', fecha: '11/04/2026', hora: '', resLabs: newer, parsed: extractParsedValues(newer) }
    ];
  } catch (e) {
    delete labHistory[DEMO_PATIENT_ID];
  }
}

function seedDemoListadoProblemas() {
  if (!guidedTourActive || rt.getActiveId() !== DEMO_PATIENT_ID) return;
  var today = new Date();
  var fecha =
    String(today.getDate()).padStart(2, '0') + '/'
    + String(today.getMonth() + 1).padStart(2, '0') + '/'
    + today.getFullYear();
  var hora =
    String(today.getHours()).padStart(2, '0') + ':'
    + String(today.getMinutes()).padStart(2, '0');
  listadoProblemas[DEMO_PATIENT_ID] = buildTourDemoListadoProblemas(fecha, hora);
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
  return getTourSteps(guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala');
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
var TOUR_DOCK_LEFT_STEPS = { ic_nota: 1, ic_indica: 1, estado_actual: 1 };

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

// Lleva al usuario al elemento del paso actual: cambia tab/tab interno,
// abre Mi Perfil/Ajustes si aplica, hace scroll y aplica spotlight para
// que la zona de avance sea inequívoca.
function applyTourTargetForStep(id) {
  if (guidedTourActive) {
    setUiDensity('normal');
  }
  var t = getTourTarget(id, guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala');
  if (!t) return;

  if (id === 'listado_problemas') {
    seedDemoListadoProblemas();
  }
  if (t.appTab) rt.switchAppTab(t.appTab);
  if (t.innerTab) {
    rt.switchInnerTab(t.innerTab);
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

  // Pre-pega el reporte demo cuando el siguiente click esperado es
  // "Procesar"; sin texto el botón no hace nada y bloquearía el tour.
  if (id === 'lab_parse' || id === 'map_lab_teaser') {
    var li = document.getElementById('lab-input');
    if (!li) return;
    var v = String(li.value || '').trim();
    var def = String(LAB_INPUT_DEFAULT_REPORT || '').trim();
    if (!v || v === def) li.value = DEMO_LAB_REPORT;
  }
  if (id === 'lab_bulk_separator') {
    openLabBulkTourHintModal();
  }

  clearAllTourSpotlights();
  if (!t.selector) return;
  setTimeout(function () {
    if (!guidedTourActive || tourStepId !== id) return;
    var el = document.querySelector(t.selector);
    if (!el) return;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    var spotlightCls = t.spotlightClass || (stepRequiresUserAction(id) ? 'tour-spotlight-soap' : null);
    if (spotlightCls) el.classList.add(spotlightCls);
    if (t.focus && typeof el.focus === 'function') {
      try { el.focus({ preventScroll: true }); } catch (e2) { try { el.focus(); } catch (e3) {} }
    }
  }, 140);
}

// Compatibilidad hacia atrás (otras partes pueden invocar este nombre).
function applyTourNavigationForStep(id) { applyTourTargetForStep(id); }

function renderTourStep() {
  if (!guidedTourActive) return;
  var badge = document.getElementById('tour-step-badge');
  var bodyEl = document.getElementById('tour-dock-body');
  var nextBtn = document.getElementById('tour-btn-next');
  var steps = getGuidedTourSteps();
  var total = steps.length;
  var idx = guidedTourStepIndex() + 1;
  var branchLabel = guidedTourBranch === 'interconsulta' ? 'Interconsulta' : 'Sala';
  function setBadge(sub) {
    badge.textContent = 'Paso ' + idx + ' de ' + total + ' · ' + branchLabel + (sub ? ' · ' + sub : '');
  }
  nextBtn.style.display = '';
  nextBtn.disabled = false;

  switch (tourStepId) {
    case 'map_sidebar':
      setBadge('pacientes');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">La <strong>columna izquierda</strong> es tu lista de pacientes. <strong>DEMO PÉREZ</strong> solo existe para este tour.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'map_tabs':
      setBadge('pestañas');
      bodyEl.innerHTML =
        getUiDensity() !== 'normal'
          ? '<p style="margin:0;line-height:1.5;">En <strong>Pase</strong> el centro es un <strong>resumen</strong> del paciente (pendientes, laboratorio, cultivos, medicamentos). Pulsa el título de cada bloque o usa <strong>Ctrl/⌘ + 1…4</strong> para abrir el detalle en vista <strong>Normal</strong>.</p>'
          : guidedTourBranch === 'interconsulta'
            ? '<p style="margin:0;line-height:1.5;">Arriba: <strong>Laboratorio</strong>, <strong>Expediente</strong>, <strong>Medicamentos</strong>, <strong>Agenda</strong>. En <strong>Expediente</strong> verás las pestañas internas en el siguiente paso.</p>'
            : '<p style="margin:0;line-height:1.5;">Arriba: <strong>Laboratorio</strong>, <strong>Expediente</strong>, <strong>Medicamentos</strong>, <strong>Agenda</strong>. En <strong>Expediente (Sala)</strong>: cuatro pestañas — <strong>Paciente</strong>, <strong>Clínico</strong> (<strong>Manejo</strong>), <strong>Resultados</strong> y <strong>Salida</strong> (Listado). El tour mostrará las sub-pestañas de Manejo más adelante.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'map_lab_teaser':
      setBadge('laboratorio · texto');
      bodyEl.innerHTML =
        guidedTourBranch === 'interconsulta'
          ? '<p style="margin:0;line-height:1.5;">Aquí pegas reportes SOME. Ya hay un <strong>ejemplo con dos días</strong> de DEMO PÉREZ. Pulsa <strong>Siguiente</strong>.</p>'
          : '<p style="margin:0;line-height:1.5;">Aquí van los laboratorios: el ejemplo trae <strong>dos días</strong> de DEMO PÉREZ. Después definirás tu servicio en Mi Perfil.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'lab_bulk_separator':
      setBadge('laboratorio · separador');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Lee la ventana: puedes pegar <strong>varios días</strong> del mismo paciente seguidos. Entre <strong>pacientes distintos</strong> usa el separador (botón gris). Opcional: inserta el ejemplo de <strong>DEMO GARCÍA</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'lab_parse':
      setBadge('laboratorio · procesar');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Pulsa <strong>Procesar</strong> (morado). R+ interpreta todos los reportes, agrupa por día y guarda en el historial de cada paciente.</p>';
      nextBtn.style.display = 'none';
      break;
    case 'lab_view':
      setBadge('laboratorio · revisar');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Revisa diagramas y tabla de resultados. En el historial: <strong>Sincronizar</strong> quita duplicados; <strong>Consolidar</strong> junta envíos del mismo día (mismo tipo de dato).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Siguiente</strong> para continuar el tour.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_casiopea_lab':
      setBadge('Neo · laboratorio');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Abre <strong>Tablas SOME</strong> (botón resaltado). Dentro verás <strong>Enviar a Neo</strong>: desde ahí mandas estudios al paso <strong>Paraclínicos</strong> en la app Neo (instalada aparte en este equipo).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">En el tutorial el envío no abre Neo; fuera del tour sí. Pulsa <strong>Siguiente</strong> cuando hayas visto el botón.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_manejo':
      setBadge('Manejo clínico');
      bodyEl.innerHTML =
        (guidedTourBranch === 'interconsulta'
          ? '<p style="margin:0;line-height:1.5;">En <strong>Expediente → Clínico → Manejo</strong> (pestaña resaltada) hay cuatro sub-pestañas: <strong>Electrolitos</strong>, <strong>Infusiones</strong>, <strong>ATB</strong> y <strong>CAD/EHH</strong>.</p>'
          : '<p style="margin:0;line-height:1.5;">En <strong>Sala</strong>, <strong>Expediente → Clínico</strong> abre <strong>Manejo</strong> directamente, con las mismas cuatro sub-pestañas: <strong>Electrolitos</strong>, <strong>Infusiones</strong>, <strong>ATB</strong> y <strong>CAD/EHH</strong>.</p>') +
        '<p style="margin:10px 0 0;line-height:1.5;">Tras procesar laboratorios, <strong>Electrolitos</strong> sugiere correcciones con dosis, dilución y vía; <strong>Infusiones</strong> y <strong>ATB</strong> ofrecen catálogos con texto <strong>SOME</strong> copiable; <strong>CAD/EHH</strong> lee BH/QS/gasometría para el checklist ADA.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Peso, talla y vía se toman del bloque colapsable <strong>Datos del paciente</strong> en la pestaña <strong>Paciente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'ic_expediente_tabs':
      setBadge('expediente · pestañas');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En <strong>Interconsulta</strong>, el expediente se agrupa en cuatro pestañas: <strong>Paciente</strong> (datos colapsables + pendientes), <strong>Clínico</strong> (Nota, Indicaciones, <strong>Manejo</strong>), <strong>Resultados</strong> (Tendencias, Cultivos) y <strong>Salida</strong> (Receta HU en PDF). En el siguiente paso verás <strong>Manejo</strong> con Electrolitos, Infusiones, ATB y CAD/EHH.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);"><strong>Receta HU</strong> exporta el PDF oficial 000-061-R-06-12. <strong>Nota</strong> e <strong>Indicaciones</strong> van a Word (.docx).</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_expediente_tabs':
      setBadge('expediente · pestañas');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En <strong>Sala</strong>, el expediente también usa cuatro pestañas: <strong>Paciente</strong> (datos colapsables + pendientes), <strong>Clínico</strong> (<strong>Manejo</strong>: Electrolitos, Infusiones, ATB, CAD/EHH), <strong>Resultados</strong> (Tendencias, Cultivos) y <strong>Salida</strong> (Listado de problemas).</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Los datos del paciente (peso, talla, vía) viven en el bloque colapsable de <strong>Paciente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'ic_nota':
      setBadge('énfasis · Nota .docx');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Genera la <strong>Nota (.docx)</strong> desde el botón correspondiente. Si el servidor local falla, puedes <strong>Omitir</strong> el tutorial.</p>';
      nextBtn.style.display = 'none';
      break;
    case 'ic_indica':
      setBadge('énfasis · Indicaciones .docx');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Aquí exportas las <strong>Indicaciones (.docx)</strong> para entrega o impresión.</p>';
      nextBtn.style.display = 'none';
      break;
    case 'ic_exports':
      setBadge('exportación');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En <strong>Ajustes (⚙)</strong>: carpeta de documentos, formato de <strong>salida rápida</strong>, respaldos y sync. En <strong>Laboratorio → duplicados</strong> puedes revisar todos los pacientes.</p>' +
        (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function'
          ? '<p style="margin:10px 0 0;font-size:12px;color:var(--text-muted);">Escritorio: <strong>⇄</strong> junto a Ajustes abre LAN; sync entre equipos en <strong>Respaldos, sync y recuperación</strong>.</p>'
          : '');
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_tend':
      setBadge('tendencias');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En <strong>Expediente → Tendencias</strong> ves mini-gráficas cuando hay varios laboratorios en el tiempo.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_tend_chart':
      setBadge('tendencias · gráfica');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Pulsa <strong>Gráfica</strong> en un estudio (p. ej. biometría) para ver tendencias agrupadas y una tabla copiable.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Cierra con clic fuera de la ventana o <strong>Esc</strong>. Es opcional en el demo: <strong>Siguiente</strong> para continuar.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_casiopea_trends':
      setBadge('Neo · tendencias');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Con varios laboratorios en el tiempo, <strong>Enviar a Neo</strong> (barra de Tendencias) manda gráficas agrupadas al mismo flujo de paraclínicos.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Puedes abrir el modal para ver la selección; confirmar no envía datos durante el tutorial. <strong>Siguiente</strong> para continuar.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_soap':
      setBadge('plantilla SOAP');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px;line-height:1.5;"><strong>Expediente → Nota</strong>: en la tarjeta verde de evolución, el botón <strong>Plantilla SOAP</strong> está arriba a la derecha del encabezado verde (lleva resaltado).</p>' +
        '<p style="margin:0;font-size:13px;color:var(--text-muted);">Ábrelo e inserta en evolución cuando quieras.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_med':
      setBadge('medicamentos');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Pega el bloque TSV del hospital y pulsa <strong>Receta</strong>. Marca filas para <strong>SOAP</strong> o <strong>Tratamiento</strong>; el demo ya trae dos fármacos de ejemplo.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'profile':
      setBadge('perfil');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;"><strong>Mi Perfil</strong> (nombre arriba): médico, plantillas y valores por defecto. <strong>Ajustes</strong>: carpeta, tema, respaldos y ayuda. <strong>Siguiente</strong>: sincronización en equipo (⇄) y versión móvil.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'servicio_default':
      setBadge('servicio · Sala');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Escribe tu <strong>Servicio (Sala)</strong> en Mi Perfil (nombre completo, sin abreviaturas) y sal del campo para guardar. Luego <strong>Siguiente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'estado_actual':
      setBadge('Estado Actual');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En <strong>Expediente → Estado Actual</strong> (<strong>Sala</strong>): signos vitales estructurados, <strong>glucometría</strong>, balance hídrico <strong>I/O</strong>, <strong>tendencias</strong> rápidas y confirmación contra la <strong>receta hospitalaria</strong>. Genera párrafo para la nota, <strong>Copiar</strong> o <strong>Guardar y copiar</strong>.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">El botón verde del encabezado sigue abriendo la <strong>plantilla sin subjetivo</strong>. Cambia a la pestaña resaltada o pulsa <strong>Siguiente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'listado_problemas':
      setBadge('Listado');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">Exporta el <strong>listado de problemas</strong> (activos e inactivos) a Word. Cada problema va con título y subítems <strong>A) CLÍNICA</strong>, <strong>B) EXPLORACIÓN</strong>, <strong>C) PARACLÍNICA</strong>, etc.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">El tour carga un ejemplo en ese formato (p. ej. peritonitis con incisos A–C). Pulsa <strong>Generar Listado</strong> (resaltado) o edita el texto y luego <strong>Siguiente</strong>.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'livesync_desktop':
      setBadge('LiveSync · escritorio');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">El icono <strong>⇄</strong> (junto a Ajustes) abre la sala en vivo: en escritorio se activa la red del turno y luego <strong>creas una sala</strong> o <strong>te unes</strong> a una existente. En iPad o otra Mac pegas el enlace de invitación. Ahí se sincronizan pacientes, laboratorios, agenda y pendientes entre las R+ del equipo.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Los respaldos JSON manuales siguen en Ajustes → Respaldos, sync y recuperación.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'livesync_mobile':
      setBadge('LiveSync · iPad / móvil');
      bodyEl.innerHTML =
        '<p style="margin:0;line-height:1.5;">En ⇄ usa <strong>Copiar enlace móvil</strong>. En iPad o teléfono (misma Wi‑Fi) abre ese enlace en Safari: verás <strong>la misma interfaz R+</strong> (pacientes, laboratorio, expediente, medicamentos, agenda), sin botones de Word.</p>' +
        '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">El Mac anfitrión debe tener R+ abierto. En móvil elige la <strong>misma sala LiveSync</strong> que el equipo de escritorio.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'wrap':
      setBadge('listo');
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
  if (stepRequiresUserAction(tourStepId)
      && tourStepId !== 'servicio_default'
      && tourStepId !== 'estado_actual') {
    nextBtn.style.display = 'none';
  }
  syncTourDockPlacement();
  syncTourSoapButtonHighlight();
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
  if (tourStepId === 'sala_casiopea_lab') {
    closeLabSomeTablesModal();
  }
  if (tourStepId === 'sala_casiopea_trends') {
    closeSesionIngresoTrendsSendModal();
  }
  if (tourStepId === 'lab_bulk_separator') {
    closeLabBulkTourHintModal();
  }
  if (tourStepId === 'estado_actual') {
    closeSOAPModal();
  }
  clearAllTourSpotlights();
  tourStepId = steps[i + 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourStepId);
  renderTourStep();
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
}
function guidedTourAdvanceAfterNotaGenerated() {
  guidedTourAdvanceAfter('ic_nota');
}
function guidedTourAdvanceAfterIndicaGenerated() {
  guidedTourAdvanceAfter('ic_indica');
}

function completeGuidedTourWithCelebration() {
  clearTourSoapButtonHighlight();
  markGuidedTourVersionDone();
  guidedTourActive = false;
  tourStepId = null;
  guidedTourBranch = null;
  publishTourGuardContext();
  hideTourDock();
  rt.launchConfetti();
  destroyDemoAndClose();
  rt.showToast('Tutorial completado', 'success');
}

function skipGuidedTour() {
  if (miniTourActive) { endMiniTour(); return; }
  clearTourSoapButtonHighlight();
  markGuidedTourVersionDone();
  guidedTourActive = false;
  tourStepId = null;
  guidedTourBranch = null;
  publishTourGuardContext();
  hideTourDock();
  destroyDemoAndClose();
}

function startOnboarding(branch) {
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
    var sala = isModeSala(st);
    var inner = rt.getActiveInner();
    if (sala && (inner === 'notas' || inner === 'indica')) {
      rt.switchInnerTab('todo');
    } else if (!sala && inner === 'listado') {
      rt.switchInnerTab('todo');
    }
    rt.renderInnerTabs();
    rt.renderEstadoActualButton();
    rt.renderEstadoActualBar();
    var modeRadioSala = document.getElementById('app-mode-sala');
    var modeRadioInter = document.getElementById('app-mode-inter');
    if (modeRadioSala) modeRadioSala.checked = sala;
    if (modeRadioInter) modeRadioInter.checked = !sala;
  }
  var today = new Date();
  var fecha = String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear();
  var hora  = String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
  var demoPatient = {
    id: DEMO_PATIENT_ID, nombre: 'DEMO PÉREZ', registro: '0008421-7',
    edad: '67 años', sexo: 'M', area: 'SERVICIO DEMO',
    servicio: 'SERVICIO DEMO', cuarto: '101', cama: '1',
    fromLab: false, isDemo: true
  };
  var demoPatient2 = {
    id: DEMO_PATIENT_ID_2, nombre: 'DEMO GARCÍA', registro: '0007755-3',
    edad: '54 años', sexo: 'F', area: 'SERVICIO DEMO',
    servicio: 'SERVICIO DEMO', cuarto: '102', cama: '2',
    fromLab: false, isDemo: true
  };
  notes[DEMO_PATIENT_ID] = {
    fecha:fecha, hora:hora, interrogatorio:'', evolucion:'', estudios:'',
    diagnosticos:['DM2, IRC estadio 3, HAS'], tratamiento:[''],
    ta:'', fr:'', fc:'', temp:'', peso:'', medico:'', profesor:''
  };
  indicaciones[DEMO_PATIENT_ID] = {
    fecha:fecha, hora:hora, medicos:'', dieta:'', cuidados:'',
    estudios:'', medicamentos:'', interconsultas:'', otros:[]
  };
  notes[DEMO_PATIENT_ID_2] = {
    fecha: fecha, hora: hora, interrogatorio: '', evolucion: '', estudios: '',
    diagnosticos: ['DM2 descompensada'], tratamiento: [''],
    ta: '', fr: '', fc: '', temp: '', peso: '', medico: '', profesor: ''
  };
  indicaciones[DEMO_PATIENT_ID_2] = {
    fecha: fecha, hora: hora, medicos: '', dieta: '', cuidados: '',
    estudios: '', medicamentos: '', interconsultas: '', otros: []
  };
  seedDemoTrendHistory();
  delete medRecetaByPatient[DEMO_PATIENT_ID];
  if (medNotaSelectionByPatient[DEMO_PATIENT_ID]) delete medNotaSelectionByPatient[DEMO_PATIENT_ID];
  medRecetaByPatient[DEMO_PATIENT_ID] = {
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
  medNotaSelectionByPatient[DEMO_PATIENT_ID] = { 'tour-med-1': true, 'tour-med-2': true };
  setPatients(patients.filter(function(p){ return p.id !== DEMO_PATIENT_ID && p.id !== DEMO_PATIENT_ID_2; }));
  patients.unshift(demoPatient2);
  patients.unshift(demoPatient);
  guidedTourActive = true;
  tourStepId = 'map_sidebar';
  renderPatientList();
  selectPatient(DEMO_PATIENT_ID);
  applyTourNavigationForStep('map_sidebar');
  showTourDock();
  renderTourStep();
  publishTourGuardContext();
}

function onboardingAdvanceAfterParse() {
  if (!guidedTourActive || tourStepId !== 'lab_parse') return;
  clearAllTourSpotlights();
  tourStepId = 'lab_view';
  publishTourGuardContext();
  applyTourTargetForStep(tourStepId);
  renderTourStep();
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

function destroyDemoAndClose() {
  clearTourSoapButtonHighlight();
  closeLabBulkTourHintModal();
  setPatients(patients.filter(function(p){ return p.id !== DEMO_PATIENT_ID && p.id !== DEMO_PATIENT_ID_2; }));
  delete notes[DEMO_PATIENT_ID];
  delete notes[DEMO_PATIENT_ID_2];
  delete indicaciones[DEMO_PATIENT_ID];
  delete indicaciones[DEMO_PATIENT_ID_2];
  delete labHistory[DEMO_PATIENT_ID];
  delete labHistory[DEMO_PATIENT_ID_2];
  delete medRecetaByPatient[DEMO_PATIENT_ID];
  delete listadoProblemas[DEMO_PATIENT_ID];
  if (medNotaSelectionByPatient[DEMO_PATIENT_ID]) delete medNotaSelectionByPatient[DEMO_PATIENT_ID];
  guidedTourActive = false;
  tourStepId = null;
  guidedTourBranch = null;
  publishTourGuardContext();
  hideTourDock();
  if (rt.getActiveId() === DEMO_PATIENT_ID) {
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
    setPatients(patients.filter(function (p) {
      return p.id !== DEMO_PATIENT_ID && p.id !== DEMO_PATIENT_ID_2;
    }));
    delete notes[DEMO_PATIENT_ID];
    delete notes[DEMO_PATIENT_ID_2];
    delete indicaciones[DEMO_PATIENT_ID];
    delete indicaciones[DEMO_PATIENT_ID_2];
    delete labHistory[DEMO_PATIENT_ID];
    delete labHistory[DEMO_PATIENT_ID_2];
    delete medRecetaByPatient[DEMO_PATIENT_ID];
    delete listadoProblemas[DEMO_PATIENT_ID];
    if (medNotaSelectionByPatient[DEMO_PATIENT_ID]) delete medNotaSelectionByPatient[DEMO_PATIENT_ID];
    guidedTourActive = false;
    tourStepId = null;
    guidedTourBranch = null;
    publishTourGuardContext();
    hideTourDock();
    hideTourIntroModal();
    limpiarReporte();
    saveState();
    if (rt.getActiveId() === DEMO_PATIENT_ID) {
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
      '<li><strong>Generar Nota (.docx)</strong> crea el documento con membrete; la carpeta de salida está en <strong>Ajustes</strong>.</li>' +
      '<li><strong>Salida rápida</strong> exporta el paciente activo en docx, html o txt según el formato elegido.</li>' +
      '<li>Los datos se guardan por paciente en este equipo.</li>' +
      '</ul>'
  },
  {
    id: 'estado-actual',
    title: 'Estado Actual y monitoreo (Sala)',
    keywords: 'estado actual monitoreo vitales glu glucometria insulina balance hidrico entradas salidas io tendencias medicamentos confirmacion sala',
    html:
      '<p>En modo <strong>Sala</strong>, la pestaña <strong>Estado Actual</strong> del expediente concentra el <strong>monitoreo</strong> del turno antes de pasar todo a la nota.</p>' +
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
    keywords: 'actualizacion actualizar update instalar reiniciar rollback version',
    html:
      '<p>R+ busca nuevas versiones al iniciar. Cuando hay una disponible, la app muestra un modal con el progreso de descarga.</p>' +
      '<ul>' +
      '<li>Puedes buscar manualmente desde <strong>Ajustes → Buscar actualizaciones…</strong> o el menú nativo (Mac: R+; Windows: Aplicación).</li>' +
      '<li>Al detectar una versión nueva instalada, R+ muestra una ventana de <strong>Novedades</strong> con los cambios relevantes.</li>' +
      '<li>Para volver a una versión anterior, descarga el instalador correspondiente desde la página de Releases.</li>' +
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
  '6.4.2': [
    {
      title: 'TODO',
      body: 'Completar antes de publicar.',
    },
    {
      title: 'TODO',
      body: 'Completar antes de publicar.',
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
        'El tour precarga dos días de DEMO PÉREZ y explica el separador multi-paciente con ejemplo DEMO GARCÍA.',
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
  resetAndStartOnboarding,
  closeLabBulkTourHintModal,
  insertLabTourSecondPatientExample,
};
