/**
 * Paint and wire the Paciente Resumen glance.
 */
import { getPatients, getLabHistory, persistClinicalState } from '../../app-state.mjs';
import { storage } from '../../storage.js';
import { openPatientDatosModal } from '../../patient-datos-modal.mjs';
import { parseMedFieldItems } from '../estado-actual-med-ui.mjs';
import { MED_FIELD_KEYS } from '../estado-actual-data-constants.mjs';
import { sortEntriesDesc, resolveEventualidadEntryText } from '../eventualidades-store.mjs';
import { toggleInterconsultId } from './interconsult-catalog.mjs';
import { buildDashboardModel } from './dashboard-model.mjs';
import { renderDashboardHtml } from './dashboard-html.mjs';
import { openInterconsultModal } from './ic-modal.mjs';

var rt = {
  getActiveId() {
    return null;
  },
  getActiveInner() {
    return 'resumen';
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

function buildEaInputFromPatient(patient) {
  var ec = patient && patient.monitoreo && patient.monitoreo.estadoClinico;
  if (!ec || typeof ec !== 'object') return {};
  var soap = {};
  MED_FIELD_KEYS.forEach(function (key) {
    var items = parseMedFieldItems(ec[key]);
    if (items.length) soap[key] = items;
  });
  var bombaOn = !!(
    patient.monitoreo &&
    Array.isArray(patient.monitoreo.historial) &&
    patient.monitoreo.historial.some(function (row) {
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

function collectDashboardModel(inner) {
  var patient = activePatient() || {};
  var pid = patient.id;
  return buildDashboardModel({
    patient: patient,
    inner: inner || rt.getActiveInner(),
    labSets: pid ? getLabHistory()[pid] || [] : [],
    eaInput: buildEaInputFromPatient(patient),
    eventualidades: collectEventualidades(patient),
    pendientes: collectPendientes(pid),
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

function handleDashboardAction(action, el) {
  if (action === 'datos') {
    openPatientDatosModal();
    return;
  }
  if (action === 'actualizar-labs') {
    if (typeof rt.openLabRepoBatchModal === 'function') rt.openLabRepoBatchModal();
    else if (typeof window.openLabRepoBatchModal === 'function') window.openLabRepoBatchModal();
    return;
  }
  if (action === 'ic-add') {
    var p = activePatient();
    openInterconsultModal({
      assignedIds: (p && p.interconsultServiceIds) || [],
      onToggle: persistIcToggle,
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
  if (action === 'estadoActual') {
    if (typeof rt.navigateToEstadoActualPanel === 'function') rt.navigateToEstadoActualPanel();
    else if (typeof rt.switchInnerTab === 'function') rt.switchInnerTab('estadoActual');
    return;
  }
  if (action === 'eventualidades') {
    if (typeof rt.switchInnerTab === 'function') rt.switchInnerTab('eventualidades');
    return;
  }
  if (action === 'pendientes') {
    if (typeof rt.switchInnerTab === 'function') rt.switchInnerTab('todo');
  }
}

var dashWiredHosts = new Set();
var dashBackWired = false;

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
  wireDashboardHost(document.getElementById('patient-dashboard-mount'));
  wireDashboardHost(document.getElementById('patient-ronda-dashboard-host'));
  if (dashBackWired) return;
  dashBackWired = true;
  var back = document.getElementById('btn-volver-al-resumen');
  if (back) {
    back.addEventListener('click', function () {
      if (typeof rt.switchInnerTab === 'function') rt.switchInnerTab('resumen');
    });
  }
}

export function resolveDashboardPaintTargets(opts) {
  opts = opts || {};
  if (opts.hostEl) return [opts.hostEl];
  var inner = opts.inner || 'resumen';
  var targets = [];
  if (opts.classic && inner === 'resumen') targets.push(opts.classic);
  if (opts.ronda) targets.push(opts.ronda);
  return targets;
}

export function renderPatientDashboard(hostEl) {
  wireDashboardOnce();
  var inner = rt.getActiveInner() || 'resumen';
  syncPacienteCompositeVisibility(inner);
  var targets = resolveDashboardPaintTargets({
    hostEl: hostEl || null,
    classic: document.getElementById('patient-dashboard-mount'),
    ronda: document.getElementById('patient-ronda-dashboard-host'),
    inner: inner,
  });
  if (!targets.length) return;
  var html = renderDashboardHtml(collectDashboardModel(inner));
  targets.forEach(function (mount) {
    wireDashboardHost(mount);
    mount.innerHTML = html;
  });
}

export const windowHandlers = {
  renderPatientDashboard: renderPatientDashboard,
};

export { persistIcToggle };
