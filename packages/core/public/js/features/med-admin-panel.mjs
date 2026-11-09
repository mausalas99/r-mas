import { getPatients, getMedRecetaByPatient, persistClinicalState } from '../app-state.mjs';
import { dayKeyFromIso } from './eventualidades-store.mjs';
import { medAdminScheduleForItem } from '../med-admin-schedule.mjs';
import { clearMedAdminPanel, drawMedAdminEmpty, drawMedAdminPanel, drawMedAdminPrnModal } from './med-admin-view.jsx';
import { showUndoToast } from './workbench/undo-toast.mjs';

let rt = {
  getActiveId() {
    return null;
  },
};

export function registerMedAdminRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

function activePatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return getPatients().find(function (p) {
    return String(p.id) === String(id);
  });
}

/** Lazily resets the daily checklist when the local day changes; `hidden` (per-item, not per-day) survives the reset. */
export function ensureMedAdmin(patient) {
  var todayKey = dayKeyFromIso(new Date().toISOString());
  if (!patient.medAdmin || typeof patient.medAdmin !== 'object' || patient.medAdmin.day !== todayKey) {
    var prevHidden =
      patient.medAdmin && typeof patient.medAdmin === 'object' && patient.medAdmin.hidden && typeof patient.medAdmin.hidden === 'object'
        ? patient.medAdmin.hidden
        : {};
    patient.medAdmin = { day: todayKey, notAdmin: {}, hidden: prevHidden, prnLog: {} };
  }
  if (!patient.medAdmin.notAdmin || typeof patient.medAdmin.notAdmin !== 'object') {
    patient.medAdmin.notAdmin = {};
  }
  if (!patient.medAdmin.hidden || typeof patient.medAdmin.hidden !== 'object') {
    patient.medAdmin.hidden = {};
  }
  if (!patient.medAdmin.prnLog || typeof patient.medAdmin.prnLog !== 'object') {
    patient.medAdmin.prnLog = {};
  }
  return patient.medAdmin;
}

export function activeMedItems(patientId) {
  var receta = getMedRecetaByPatient()[patientId];
  var items = receta && Array.isArray(receta.items) ? receta.items : [];
  return items.filter(function (it) {
    return it && !it.suspendido;
  });
}

export function recetaFechaActualizacion(patientId) {
  var receta = getMedRecetaByPatient()[patientId];
  return receta ? receta.fechaActualizacion : null;
}

export function scheduledMedItems(items) {
  return items.filter(function (it) {
    return medAdminScheduleForItem(it).kind !== 'prn';
  });
}

export function prnMedItems(items) {
  return items.filter(function (it) {
    return medAdminScheduleForItem(it).kind === 'prn';
  });
}

export function allDoseTimesSorted(scheduledItems) {
  var set = {};
  scheduledItems.forEach(function (it) {
    medAdminScheduleForItem(it).defaultTimes.forEach(function (t) {
      set[t] = true;
    });
  });
  return Object.keys(set).sort();
}

function findMedAdminOverflowHost(el) {
  var node = el;
  while (node && node !== document.body) {
    if (node.scrollHeight - node.clientHeight > 1) return node;
    node = node.parentElement;
  }
  return null;
}

function fitMedAdminRows(mountEl) {
  var panel = mountEl.querySelector('.med-admin-panel');
  var table = panel && panel.querySelector('table.some-grid-unified');
  var bodyRows = table && table.querySelectorAll('tbody tr');
  if (!panel || !table || !bodyRows || !bodyRows.length) return;
  var host = findMedAdminOverflowHost(mountEl);
  if (!host) return;
  var overflow = host.scrollHeight - host.clientHeight;
  var current = parseFloat(getComputedStyle(panel).getPropertyValue('--some-day-band-h')) || 44;
  var next = Math.max(16, Math.floor(current - overflow / bodyRows.length));
  if (next >= current) return;
  panel.style.setProperty('--some-day-band-h', next + 'px');
}

function wireMedAdminResize(mountEl) {
  if (mountEl._medAdminResizeWired) return;
  mountEl._medAdminResizeWired = true;
  if (typeof ResizeObserver === 'undefined') return;
  var ro = new ResizeObserver(function () {
    fitMedAdminRows(mountEl);
  });
  ro.observe(mountEl);
}

export function renderMedAdminPanel(mountEl) {
  if (!mountEl) return;
  var patient = activePatient();
  if (!patient) {
    clearMedAdminPanel(mountEl);
    return;
  }
  var items = activeMedItems(String(patient.id));
  var fechaActualizacion = recetaFechaActualizacion(String(patient.id));
  if (!items.length) {
    drawMedAdminEmpty(mountEl);
    return;
  }
  var medAdmin = ensureMedAdmin(patient);
  var scheduled = scheduledMedItems(items);
  var prn = prnMedItems(items);
  var visible = scheduled.filter(function (it) { return !medAdmin.hidden[it.id]; });
  var hiddenItems = scheduled.filter(function (it) { return !!medAdmin.hidden[it.id]; });
  var times = allDoseTimesSorted(visible);
  var expanded = mountEl.dataset.medAdminHiddenExpanded === '1';
  drawMedAdminPanel(mountEl, {
    items: visible, times: times, medAdmin: medAdmin, fecha: fechaActualizacion,
    prnCount: prn.length, hiddenItems: hiddenItems, expanded: expanded,
  });
  wireMedAdminClicks(mountEl);
  wireMedAdminResize(mountEl);
  fitMedAdminRows(mountEl);
}

function toggleMedAdminCell(cell, mountEl) {
  var patient = activePatient();
  if (!patient) return;
  var key = cell.getAttribute('data-med-admin-key');
  if (!key) return;
  var medAdmin = ensureMedAdmin(patient);
  if (medAdmin.notAdmin[key]) delete medAdmin.notAdmin[key];
  else medAdmin.notAdmin[key] = true;
  persistClinicalState();
  renderMedAdminPanel(mountEl);
}

var PRN_MODAL_BACKDROP_ID = 'med-admin-prn-modal-backdrop';

export function closeMedAdminPrnModal() {
  var backdrop = document.getElementById(PRN_MODAL_BACKDROP_ID);
  if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
}

function renderMedAdminPrnModalContent() {
  var backdrop = document.getElementById(PRN_MODAL_BACKDROP_ID);
  if (!backdrop) return;
  var patient = activePatient();
  if (!patient) {
    closeMedAdminPrnModal();
    return;
  }
  var prn = prnMedItems(activeMedItems(String(patient.id)));
  if (!prn.length) {
    closeMedAdminPrnModal();
    return;
  }
  drawMedAdminPrnModal(backdrop, { prnItems: prn, medAdmin: ensureMedAdmin(patient) });
}

function registerPrnDose(itemId, time) {
  var patient = activePatient();
  if (!patient || !time) return;
  var medAdmin = ensureMedAdmin(patient);
  if (!medAdmin.prnLog[itemId]) medAdmin.prnLog[itemId] = [];
  if (medAdmin.prnLog[itemId].indexOf(time) === -1) medAdmin.prnLog[itemId].push(time);
  persistClinicalState();
}

function removePrnDose(itemId, time) {
  var patient = activePatient();
  if (!patient) return;
  var medAdmin = ensureMedAdmin(patient);
  var list = medAdmin.prnLog[itemId];
  if (!list) return;
  var idx = list.indexOf(time);
  if (idx !== -1) list.splice(idx, 1);
  persistClinicalState();
}

export function openMedAdminPrnModal() {
  closeMedAdminPrnModal();
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = PRN_MODAL_BACKDROP_ID;
  document.body.appendChild(backdrop);
  renderMedAdminPrnModalContent();
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop || e.target.closest('[data-med-admin-prn-close]')) {
      closeMedAdminPrnModal();
      return;
    }
    var registerBtn = e.target.closest('[data-med-admin-prn-register]');
    if (registerBtn) {
      var id = registerBtn.getAttribute('data-med-admin-prn-register');
      var input = backdrop.querySelector('input[data-med-admin-prn-time="' + CSS.escape(id) + '"]');
      registerPrnDose(id, input ? input.value : '');
      renderMedAdminPrnModalContent();
      return;
    }
    var removeBtn = e.target.closest('[data-med-admin-prn-remove]');
    if (removeBtn) {
      var parts = removeBtn.getAttribute('data-med-admin-prn-remove').split('|');
      removePrnDose(parts[0], parts[1]);
      renderMedAdminPrnModalContent();
    }
  });
}

function setMedAdminHidden(itemId, hide, mountEl) {
  var patient = activePatient();
  if (!patient) return;
  var medAdmin = ensureMedAdmin(patient);
  if (hide) medAdmin.hidden[itemId] = true;
  else delete medAdmin.hidden[itemId];
  persistClinicalState();
  renderMedAdminPanel(mountEl);
}

function wireMedAdminClicks(mountEl) {
  if (mountEl._medAdminWired) return;
  mountEl._medAdminWired = true;
  mountEl.addEventListener('click', function (e) {
    var openPrnBtn = e.target.closest('[data-med-admin-open-prn]');
    if (openPrnBtn) {
      openMedAdminPrnModal();
      return;
    }
    var hideBtn = e.target.closest('[data-med-admin-hide]');
    if (hideBtn) {
      var hideId = hideBtn.getAttribute('data-med-admin-hide');
      var nameEl = hideBtn.closest('tr')?.querySelector('.med-cell-name');
      setMedAdminHidden(hideId, true, mountEl);
      showUndoToast({
        message: (nameEl ? nameEl.textContent : 'Medicamento') + ' oculto',
        onUndo: function () { setMedAdminHidden(hideId, false, mountEl); },
      });
      return;
    }
    var unhideBtn = e.target.closest('[data-med-admin-unhide]');
    if (unhideBtn) {
      setMedAdminHidden(unhideBtn.getAttribute('data-med-admin-unhide'), false, mountEl);
      return;
    }
    var toggleHiddenBtn = e.target.closest('[data-med-admin-toggle-hidden]');
    if (toggleHiddenBtn) {
      mountEl.dataset.medAdminHiddenExpanded = mountEl.dataset.medAdminHiddenExpanded === '1' ? '0' : '1';
      renderMedAdminPanel(mountEl);
      return;
    }
    var cell = e.target.closest('td.day-pad.indicated[data-med-admin-key]');
    if (cell) toggleMedAdminCell(cell, mountEl);
  });
  mountEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var cell = e.target.closest('td.day-pad.indicated[data-med-admin-key]');
    if (!cell) return;
    e.preventDefault();
    toggleMedAdminCell(cell, mountEl);
  });
}
