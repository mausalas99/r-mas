import { getPatients, getMedRecetaByPatient, persistClinicalState } from '../app-state.mjs';
import { esc } from '../dom-escape.mjs';
import { dayKeyFromIso } from './eventualidades-store.mjs';
import { medAdminScheduleForItem } from '../med-admin-schedule.mjs';
import { extractMedBaseName } from '../med-pharm-profile-core.mjs';
import { effectiveDiaTratamiento } from '../med-receta-dates.mjs';

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

function prnCriterion(dosisRaw) {
  return esc(String(dosisRaw || '').split('//').pop().trim());
}

export function buildMedAdminGridHtml(scheduledItems, times, medAdmin, fechaActualizacion) {
  var html =
    '<div class="med-pharm-grid-scope med-admin-panel"><div class="some-grid-wrap med-pharm-scroll">' +
    '<table class="some-grid-unified"><colgroup><col class="col-med med-admin-col-med">' +
    times.map(function () { return '<col class="col-day">'; }).join('') +
    '</colgroup><thead><tr class="hdr-row-1"><th class="col-meta-hdr col-med">Medicamento</th>' +
    times.map(function (t) { return '<th class="day-hdr">' + esc(t) + '</th>'; }).join('') +
    '</tr></thead><tbody>';

  scheduledItems.forEach(function (item) {
    var sched = medAdminScheduleForItem(item);
    var diaDisplay =
      item.diaTratamiento != null ? effectiveDiaTratamiento(item.diaTratamiento, fechaActualizacion) : null;
    html += '<tr><td class="col-med"><div class="med-admin-row-head">' +
      '<span class="med-cell-name" title="' + esc(item.nombreRaw) + '">' + esc(extractMedBaseName(item.nombreRaw)) + '</span>' +
      (diaDisplay != null
        ? '<span class="med-admin-dia-pill">Día ' + esc(String(diaDisplay)) + '</span>'
        : '') +
      '<button type="button" class="med-admin-hide-btn" data-med-admin-hide="' + esc(String(item.id)) + '" ' +
      'aria-label="Ocultar ' + esc(item.nombreRaw) + ' de la lista">×</button>' +
      '</div></td>';
    times.forEach(function (t) {
      if (sched.defaultTimes.indexOf(t) === -1) {
        html += '<td class="day-pad day-pad-empty"></td>';
        return;
      }
      var key = item.id + '|' + t;
      var given = !medAdmin.notAdmin[key];
      html += '<td class="day-pad indicated' + (given ? '' : ' not-admin') + '" tabindex="0" role="button" ' +
        'data-med-admin-key="' + esc(key) + '" aria-pressed="' + given + '" aria-label="' +
        esc(item.nombreRaw) + ', toma de las ' + esc(t) + ', ' +
        (given ? 'administrada. Activar para marcar que no se dio.' : 'no administrada. Activar para marcar que sí se dio.') +
        '"></td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';

  html += '<div class="med-admin-legend">' +
    '<span><span class="med-admin-legend-swatch med-admin-legend-swatch--on"></span>Administrado (por defecto)</span>' +
    '<span><span class="med-admin-legend-swatch med-admin-legend-swatch--off"></span>No administrado (clic en la celda)</span>' +
    '</div>';
  return html;
}

export function buildMedAdminHiddenFooterHtml(hiddenItems, expanded) {
  if (!hiddenItems.length) return '';
  var count = hiddenItems.length;
  var label = count + (count === 1 ? ' medicamento oculto' : ' medicamentos ocultos');
  var rows = hiddenItems
    .map(function (item) {
      return '<div class="med-admin-hidden-row"><span title="' + esc(item.nombreRaw) + '">' + esc(extractMedBaseName(item.nombreRaw)) + '</span>' +
        '<button type="button" class="med-admin-unhide-btn" data-med-admin-unhide="' + esc(String(item.id)) + '">Mostrar</button></div>';
    })
    .join('');
  return '<div class="med-admin-hidden-footer">' +
    '<button type="button" class="med-admin-hidden-toggle" data-med-admin-toggle-hidden aria-expanded="' + !!expanded + '">' +
    esc(label) + (expanded ? ' ▴' : ' ▾') + '</button>' +
    (expanded ? '<div class="med-admin-hidden-list">' + rows + '</div>' : '') +
    '</div>';
}

function nowHHMM() {
  var d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function buildMedAdminPrnHtml(prnItems, medAdmin) {
  if (!prnItems.length) return '';
  var log = (medAdmin && medAdmin.prnLog) || {};
  var html = '';
  prnItems.forEach(function (item) {
    var times = (log[item.id] || []).slice().sort();
    html += '<div class="med-admin-prn-row">' +
      '<div class="med-admin-prn-info">' +
      '<span class="med-admin-name">' + esc(item.nombreRaw) + '</span>' +
      '<span class="med-admin-meta">' + esc(item.viaRaw) + ' · ' + prnCriterion(item.dosisRaw) + '</span>' +
      (times.length
        ? '<div class="med-admin-prn-log">' +
          times.map(function (t) {
            return '<span class="med-admin-prn-chip">' + esc(t) +
              '<button type="button" class="med-admin-prn-chip-x" data-med-admin-prn-remove="' +
              esc(String(item.id)) + '|' + esc(t) + '" aria-label="Quitar registro de las ' + esc(t) + '">×</button></span>';
          }).join('') +
          '</div>'
        : '') +
      '</div>' +
      '<div class="med-admin-prn-add">' +
      '<input type="time" class="med-admin-prn-time" data-med-admin-prn-time="' + esc(String(item.id)) + '" value="' + esc(nowHHMM()) + '">' +
      '<button type="button" class="med-admin-prn-register" data-med-admin-prn-register="' + esc(String(item.id)) + '">Registrar</button>' +
      '</div></div>';
  });
  return html;
}

export function buildMedAdminPrnModalHtml(prnItems, medAdmin) {
  return '<div class="lab-conflict-modal med-admin-prn-modal">' +
    '<div class="med-admin-prn-modal-header">' +
    '<span class="med-admin-prn-modal-title">Registrar PRN</span>' +
    '<button type="button" class="med-admin-prn-modal-close" data-med-admin-prn-close aria-label="Cerrar">×</button>' +
    '</div>' +
    '<div class="med-admin-prn-modal-subtitle">No se marcan por defecto. Elige la hora y registra cada dosis administrada.</div>' +
    '<div class="med-admin-prn-modal-body">' + buildMedAdminPrnHtml(prnItems, medAdmin) + '</div>' +
    '</div>';
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
    mountEl.innerHTML = '';
    return;
  }
  var items = activeMedItems(String(patient.id));
  var fechaActualizacion = recetaFechaActualizacion(String(patient.id));
  if (!items.length) {
    mountEl.innerHTML = '<div class="med-admin-panel med-admin-empty">Sin medicamentos activos en la receta.</div>';
    return;
  }
  var medAdmin = ensureMedAdmin(patient);
  var scheduled = scheduledMedItems(items);
  var prn = prnMedItems(items);
  var visible = scheduled.filter(function (it) { return !medAdmin.hidden[it.id]; });
  var hiddenItems = scheduled.filter(function (it) { return !!medAdmin.hidden[it.id]; });
  var times = allDoseTimesSorted(visible);
  var expanded = mountEl.dataset.medAdminHiddenExpanded === '1';
  mountEl.innerHTML =
    (visible.length
      ? buildMedAdminGridHtml(visible, times, medAdmin, fechaActualizacion)
      : '<div class="med-admin-panel med-admin-empty">Todos los medicamentos con horario están ocultos.</div>') +
    buildMedAdminHiddenFooterHtml(hiddenItems, expanded) +
    (prn.length
      ? '<button type="button" class="med-admin-prn-fab" data-med-admin-open-prn>PRN' +
        '<span class="med-admin-prn-fab-count">' + prn.length + '</span></button>'
      : '');
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
  backdrop.innerHTML = buildMedAdminPrnModalHtml(prn, ensureMedAdmin(patient));
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
      setMedAdminHidden(hideBtn.getAttribute('data-med-admin-hide'), true, mountEl);
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
