/**
 * Paint and wire the Paciente Resumen glance.
 */
import { getPatients, getLabHistory, getMedRecetaByPatient, persistClinicalState } from '../../app-state.mjs';
import { scheduleAfterPaintThenIdle } from '../../deferred-work.mjs';
import { storage } from '../../storage.js';
import { openPatientDatosModal } from '../../patient-datos-modal.mjs';
import { resolveEaAbxFechaActualizacion } from '../estado-actual-meds-core.mjs';
import { collectEaGlanceSoap } from './ea-glance-meds.mjs';
import { sortEntriesDesc, resolveEventualidadEntryText } from '../eventualidades-store.mjs';
import { toggleInterconsultId } from './interconsult-catalog.mjs';
import { buildDashboardModel } from './dashboard-model.mjs';
import { renderDashboardHtml, renderLabsHtml } from './dashboard-html.mjs';
import { buildLabsGlanceForDay } from './labs-glance-model.mjs';
import { openInterconsultModal } from './ic-modal.mjs';
import { onLabHistoryRevision, TREND_REFRESH_DEBOUNCE_MS } from '../../lab-history-cache.mjs';

/**
 * Loaded lazily (not a top-level import) so the 10b Interconsulta chrome
 * stays out of the eager boot payload — dashboard-mount.mjs itself is
 * eager (imported by expediente-inner-cache.mjs), but
 * the interconsulta chrome only matters once a user is in that mode.
 */
function syncInterconsultaModeChrome() {
  import('../interconsulta-mode-chrome.mjs').then(function (mod) {
    mod.syncInterconsultaModeChrome();
  });
}

var rt = {
  getActiveId() {
    return null;
  },
  getActiveInner() {
    return 'resumen';
  },
  getActiveAppTab() {
    return 'nota';
  },
  switchAppTab() {},
  switchInnerTab() {},
  navigateToEstadoActualPanel() {},
  persistClinicalState: persistClinicalState,
  openLabRepoBatchModal() {},
  loadLabHistorySetIntoOutput() {},
  setLabHistorySelectedSetId() {},
};

export function registerPatientDashboardRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
  wireDashboardLabRefresh();
}

function activePatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return (
    getPatients().find(function (p) {
      return String(p.id) === String(id);
    }) || null
  );
}

export function buildEaInputFromPatient(patient, opts) {
  opts = opts && typeof opts === 'object' ? opts : {};
  var mon = (patient && patient.monitoreo) || {};
  var ec = mon.estadoClinico && typeof mon.estadoClinico === 'object' ? mon.estadoClinico : {};
  var recetaMap = opts.medRecetaByPatient || getMedRecetaByPatient();
  var receta = patient && patient.id ? recetaMap[patient.id] : null;
  var soap = collectEaGlanceSoap({
    estadoClinico: ec,
    pendienteReceta: mon.pendienteReceta,
    recetaItems: receta && receta.items,
    fechaActualizacion: resolveEaAbxFechaActualizacion(patient && patient.id, recetaMap, mon),
    refDate: opts.refDate,
  });
  var bombaOn = !!(
    Array.isArray(mon.historial) &&
    mon.historial.some(function (row) {
      return row && Array.isArray(row.bombaInsulina) && row.bombaInsulina.length;
    })
  );
  return {
    soporte: ec.soporte,
    soporteLitros: ec.soporteLitros,
    dieta: ec.dieta,
    bombaOn: bombaOn,
    soap: soap,
  };
}

function collectEventualidades(patient) {
  var entries = patient && patient.eventualidades && patient.eventualidades.entries;
  return sortEntriesDesc(entries).map(function (e) {
    return {
      at: e && e.at,
      text: resolveEventualidadEntryText(e && e.text, e && e.kind),
    };
  });
}

function collectPendientes(patientId) {
  if (!patientId) return [];
  return (storage.getTodos(patientId) || []).filter(function (t) {
    return t && !t.completed && String(t.text || '').trim();
  });
}

function collectDashboardModel(inner, opts) {
  var patient = activePatient() || {};
  var pid = patient.id;
  var skipLabs = !!(opts && opts.skipLabs);
  return buildDashboardModel({
    patient: patient,
    inner: inner || rt.getActiveInner(),
    labSets: skipLabs ? null : pid ? getLabHistory()[pid] || [] : [],
    eaInput: buildEaInputFromPatient(patient),
    eventualidades: collectEventualidades(patient),
    pendientes: collectPendientes(pid),
    skipLabs: skipLabs,
  });
}

export function syncPacienteCompositeVisibility(inner) {
  var onResumen = inner === 'resumen';
  var onTodo = inner === 'todo';
  var dash = document.getElementById('patient-dashboard-mount');
  var pend = document.querySelector('#itab-content-paciente .exp-pendientes-mount');
  var head = document.getElementById('exp-pendientes-header');
  if (dash) dash.hidden = !onResumen;
  if (pend) pend.hidden = !onTodo;
  if (head) head.hidden = !onTodo;
}

function persistIcToggle(id) {
  var patient = activePatient();
  if (!patient) return [];
  var cur = Array.isArray(patient.interconsultServiceIds) ? patient.interconsultServiceIds : [];
  var next = toggleInterconsultId(cur, id);
  patient.interconsultServiceIds = next;
  if (typeof rt.persistClinicalState === 'function') rt.persistClinicalState();
  else persistClinicalState();
  renderPatientDashboard();
  return next;
}

function openLabs(setId) {
  if (typeof rt.switchAppTab === 'function') rt.switchAppTab('lab');
  var pid = rt.getActiveId();
  if (setId && typeof rt.setLabHistorySelectedSetId === 'function' && pid) {
    rt.setLabHistorySelectedSetId(pid, setId);
  }
  if (setId && typeof rt.loadLabHistorySetIntoOutput === 'function') {
    rt.loadLabHistorySetIntoOutput(setId, { silent: true });
  }
}

function openLabsRepoModal() {
  if (typeof rt.openLabRepoBatchModal === 'function') rt.openLabRepoBatchModal();
  else if (typeof window.openLabRepoBatchModal === 'function') window.openLabRepoBatchModal();
}

function switchDashInner(tab) {
  if (tab === 'estadoActual' && typeof rt.navigateToEstadoActualPanel === 'function') {
    rt.navigateToEstadoActualPanel();
    return;
  }
  if (typeof rt.switchInnerTab === 'function') rt.switchInnerTab(tab);
}

function handleDashboardAction(action, el) {
  if (action === 'datos') {
    openPatientDatosModal();
    return;
  }
  if (action === 'actualizar-labs') {
    openLabsRepoModal();
    return;
  }
  if (action === 'ic-add') {
    var p = activePatient();
    openInterconsultModal({
      assignedIds: (p && p.interconsultServiceIds) || [],
      onToggle: persistIcToggle,
      trigger: el,
    });
    return;
  }
  if (action === 'ic-toggle') {
    persistIcToggle(el.getAttribute('data-ic-id'));
    return;
  }
  if (action === 'labs-envio' || action === 'labs-full') {
    openLabs(el.getAttribute('data-lab-set-id'));
    return;
  }
  if (action === 'estadoActual') switchDashInner('estadoActual');
  else if (action === 'eventualidades') switchDashInner('eventualidades');
  else if (action === 'pendientes') switchDashInner('todo');
}

var dashWiredHosts = new Set();
var dashBackWired = false;
var dashLabWired = false;
var dashLabTimer = null;
var dashPainting = false;

export function shouldRefreshDashboardForLabs(appTab, inner) {
  if (appTab && appTab !== 'nota') return false;
  return inner === 'resumen';
}

function paintDashboardFromLabRevision(patientId) {
  if (dashPainting) return;
  if (String(patientId || '') !== String(rt.getActiveId() || '')) return;
  var appTab = typeof rt.getActiveAppTab === 'function' ? rt.getActiveAppTab() : 'nota';
  var inner = rt.getActiveInner() || 'resumen';
  if (!shouldRefreshDashboardForLabs(appTab, inner)) return;
  dashPainting = true;
  try {
    renderPatientDashboard(null, { settle: false });
  } finally {
    dashPainting = false;
  }
}

function scheduleDashboardLabRefresh(patientId) {
  if (String(patientId || '') !== String(rt.getActiveId() || '')) return;
  if (dashLabTimer) clearTimeout(dashLabTimer);
  dashLabTimer = setTimeout(function () {
    dashLabTimer = null;
    paintDashboardFromLabRevision(patientId);
  }, TREND_REFRESH_DEBOUNCE_MS);
}

function wireDashboardLabRefresh() {
  if (dashLabWired) return;
  dashLabWired = true;
  onLabHistoryRevision(scheduleDashboardLabRefresh);
}

function wireDashboardHost(mount) {
  if (!mount || dashWiredHosts.has(mount)) return;
  dashWiredHosts.add(mount);
  mount.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || typeof t.closest !== 'function') return;
    var btn = t.closest('[data-dash-action]');
    if (!btn || !mount.contains(btn)) return;
    handleDashboardAction(btn.getAttribute('data-dash-action'), btn);
  });
}

function wireDashboardOnce() {
  wireDashboardLabRefresh();
  wireDashboardHost(document.getElementById('patient-dashboard-mount'));
  if (dashBackWired) return;
  dashBackWired = true;
  var back = document.getElementById('btn-volver-al-resumen');
  if (back) {
    back.addEventListener('click', function () {
      if (typeof rt.switchInnerTab === 'function') rt.switchInnerTab('resumen');
    });
  }
}

export function dashboardHostIsPaintable(el, wrapEl) {
  if (!el) return false;
  if (el.hidden) return false;
  if (wrapEl && (wrapEl.hidden || (wrapEl.style && wrapEl.style.display === 'none'))) {
    return false;
  }
  return true;
}

export function resolveDashboardPaintTargets(opts) {
  opts = opts || {};
  if (opts.hostEl) return [opts.hostEl];
  var inner = opts.inner || 'resumen';
  var targets = [];
  if (opts.classic && inner === 'resumen' && dashboardHostIsPaintable(opts.classic, opts.classicWrap)) {
    targets.push(opts.classic);
  }
  return targets;
}

function localTodayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function fillDashboardLabs(targets, pid) {
  if (String(rt.getActiveId() || '') !== String(pid || '')) return false;
  var html = renderLabsHtml({
    labs: pid
      ? buildLabsGlanceForDay({
          todayKey: localTodayKey(),
          orderedSets: getLabHistory()[pid] || [],
        })
      : { envios: [] },
  });
  targets.forEach(function (mount) {
    if (!mount || !mount.isConnected) return;
    var slot = mount.querySelector('[data-dash-labs]');
    if (slot) slot.outerHTML = html;
  });
  return true;
}

export function renderPatientDashboard(hostEl, opts) {
  opts = opts || {};
  wireDashboardOnce();
  var inner = rt.getActiveInner() || 'resumen';
  syncPacienteCompositeVisibility(inner);
  var targets = resolveDashboardPaintTargets({
    hostEl: hostEl || null,
    classic: document.getElementById('patient-dashboard-mount'),
    classicWrap: document.getElementById('patient-expediente-classic'),
    inner: inner,
  });
  if (!targets.length) return;
  var deferLabs = !!opts.deferLabs;
  var pid = rt.getActiveId();
  var html = renderDashboardHtml(collectDashboardModel(inner, { skipLabs: deferLabs }));
  targets.forEach(function (mount) {
    wireDashboardHost(mount);
    mount.innerHTML = html;
  });
  syncInterconsultaModeChrome();
  if (!deferLabs) {
    if (typeof opts.onLabsReady === 'function') opts.onLabsReady();
    return;
  }
  scheduleAfterPaintThenIdle(function () {
    var painted = fillDashboardLabs(targets, pid);
    if (painted && typeof opts.onLabsReady === 'function') opts.onLabsReady();
  });
}

export const windowHandlers = {
  renderPatientDashboard: renderPatientDashboard,
};

export { persistIcToggle };
