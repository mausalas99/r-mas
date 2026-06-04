/**
 * UI Perfil farmacoterapéutico (subvista Medicamentos). Funciones cortas, CCN bajo.
 */
import { medPharmProfileByPatient, saveState } from '../app-state.mjs';
import {
  listSomePharmFilterLabels,
  isSomePharmCategoryLabel,
  rowSomePharmCategory,
  assignSomePharmCategory,
  assignSomePharmCategories,
} from '../med-pharm-some-catalog.mjs';
import {
  parseSomePharmMonthPaste,
  looksLikeSomePharmMonthPaste,
  mergeRecetaIntoMonth,
  applySomePasteToProfile,
  getMonthFromProfile,
  ensureMonthOnProfile,
  adherenceStats,
  toggleNotAdmin,
  isMedPharmRowHidden,
  formatFreqShort,
  formatViaShort,
  splitMonthAt,
  dayValueInMap,
  monthKeyFromParts,
} from '../med-pharm-profile-core.mjs';
import { syncTabBarIndicator } from '../ui-tab-motion.mjs';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

let rt = {
  getActiveId() {
    return null;
  },
  showToast() {},
  refreshMedPanel() {},
};

let medSubview = 'receta';
let viewYear = new Date().getFullYear();
let viewMonthIndex = new Date().getMonth();
let listFilter = 'TODOS';
let showHiddenMedRows = false;
let openRowKey = null;
let uiWired = false;
let dismissWired = false;
let lastPharmPanelPatientId = null;

export function registerMedPharmProfileRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

export function getMedSubview() {
  return medSubview;
}

export function setMedSubview(mode) {
  if (mode !== 'receta' && mode !== 'perfil') return;
  medSubview = mode;
  syncSubviewVisibility();
  rt.refreshMedPanel();
}

function syncSubviewVisibility() {
  var receta = document.getElementById('med-subview-receta');
  var perfil = document.getElementById('med-subview-perfil');
  if (receta) receta.style.display = medSubview === 'receta' ? '' : 'none';
  if (perfil) perfil.style.display = medSubview === 'perfil' ? '' : 'none';
  var recetaTab = document.getElementById('med-itab-receta');
  var perfilTab = document.getElementById('med-itab-perfil');
  if (recetaTab) {
    var onReceta = medSubview === 'receta';
    recetaTab.classList.toggle('active', onReceta);
    recetaTab.setAttribute('aria-selected', onReceta ? 'true' : 'false');
  }
  if (perfilTab) {
    var onPerfil = medSubview === 'perfil';
    perfilTab.classList.toggle('active', onPerfil);
    perfilTab.setAttribute('aria-selected', onPerfil ? 'true' : 'false');
  }
  var bar = document.getElementById('med-subview-tabs-bar');
  var activeTab = medSubview === 'perfil' ? perfilTab : recetaTab;
  syncTabBarIndicator(bar, activeTab);
}

/** Enlaza botones del perfil y sincroniza tabs; llamar siempre al renderizar Medicamentos. */
export function initMedPharmSubviewUi() {
  wireUiOnce();
  syncSubviewVisibility();
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function monthLabel(year, monthIndex) {
  return MONTH_NAMES[monthIndex] + ' ' + year;
}

function todayParts() {
  var t = new Date();
  return { year: t.getFullYear(), monthIndex: t.getMonth(), day: t.getDate() };
}

function isToday(year, monthIndex, day) {
  var t = todayParts();
  return t.year === year && t.monthIndex === monthIndex && t.day === day;
}

function getProfile(pid) {
  return medPharmProfileByPatient[pid] || null;
}

function isDemoPatientId(patientId) {
  return String(patientId || '').indexOf('demo-') === 0;
}

function profileHasMonthData(profile) {
  if (!profile || !profile.months || typeof profile.months !== 'object') return false;
  return Object.keys(profile.months).some(function (k) {
    var m = profile.months[k];
    return m && Array.isArray(m.rows) && m.rows.length > 0;
  });
}

/** Guarda el pegado SOME del modal antes de cambiar de paciente. */
export function stashMedPharmPasteForPatient(patientId) {
  if (!patientId || isDemoPatientId(patientId)) return;
  var ta = document.getElementById('med-pharm-paste');
  if (!ta) return;
  var raw = (ta.value || '').trim();
  var profile = getProfile(patientId);
  if (!raw) {
    if (profile && profile.draftPaste) {
      delete profile.draftPaste;
      if (!profileHasMonthData(profile)) delete medPharmProfileByPatient[patientId];
      else saveState();
    }
    return;
  }
  if (!profile) profile = { months: {} };
  profile.draftPaste = raw;
  medPharmProfileByPatient[patientId] = profile;
  saveState();
}

function getViewMonth(pid) {
  var profile = getProfile(pid);
  if (!profile) return null;
  return getMonthFromProfile(profile, viewYear, viewMonthIndex);
}

function needsSomePharmReclassify(row) {
  if (!row || row.catOverride) return false;
  var c = String(row.cat || '').toUpperCase();
  if (!c) return true;
  if (!isSomePharmCategoryLabel(c)) return true;
  var legacy = ['ABX', 'ANALGESIA', 'VASOP', 'ANTIHTA'];
  return legacy.indexOf(c) >= 0;
}

function reclassifyMonthIfLegacy(pid, month) {
  if (!month || !month.rows) return month;
  var changed = false;
  month.rows.forEach(function (row) {
    if (!needsSomePharmReclassify(row)) return;
    var next = assignSomePharmCategory(row);
    row.cat = next.cat;
    changed = true;
  });
  if (changed) saveState();
  return month;
}

function formatAdhDayList(days) {
  if (!days.length) return '—';
  return days
    .map(function (d) {
      return String(d).padStart(2, '0');
    })
    .join(', ');
}

function adherenceDayDetail(row, daysInMonth) {
  var indicated = [];
  var missed = [];
  var limit = daysInMonth || 31;
  for (var d = 1; d <= limit; d += 1) {
    if (!(dayValueInMap(row.days, d) > 0)) continue;
    indicated.push(d);
    if (row.notAdmin && (row.notAdmin[d] || row.notAdmin[String(d)])) missed.push(d);
  }
  var administered = indicated.filter(function (x) {
    return missed.indexOf(x) < 0;
  });
  return { indicated: indicated, missed: missed, administered: administered };
}

function buildAdhPanelHtml(row, daysInMonth) {
  var detail = adherenceDayDetail(row, daysInMonth);
  var monthTitle = monthLabel(viewYear, viewMonthIndex);
  return (
    '<p class="med-pharm-adh-panel-head">' +
    esc(monthTitle) +
    '</p>' +
    '<div class="med-pharm-adh-panel-section">' +
    '<span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--ok">Administrados (por defecto)</span>' +
    '<p class="med-pharm-adh-panel-days">' +
    esc(formatAdhDayList(detail.administered)) +
    '</p>' +
    '</div>' +
    '<div class="med-pharm-adh-panel-section">' +
    '<span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--miss">No administrados</span>' +
    '<p class="med-pharm-adh-panel-days">' +
    esc(formatAdhDayList(detail.missed)) +
    '</p>' +
    '</div>' +
    '<p class="med-pharm-adh-panel-foot">' +
    esc(String(detail.administered.length)) +
    ' administrados · ' +
    esc(String(detail.missed.length)) +
    ' no · ' +
    esc(String(detail.indicated.length)) +
    ' indicados</p>'
  );
}

function buildAdhTriggerHtml(row, stats, daysInMonth) {
  if (!stats.indicated) {
    return '<span class="med-pharm-adh-trigger med-pharm-adh-trigger--empty">—</span>';
  }
  var label =
    stats.missed > 0
      ? stats.effective + ' efect. · ' + stats.missed + ' no'
      : stats.effective + ' d efectivos';
  return (
    '<span class="med-pharm-adh-wrap">' +
    '<button type="button" class="med-pharm-adh-trigger' +
    (stats.missed > 0 ? ' med-pharm-adh-trigger--miss' : '') +
    '" data-row-key="' +
    esc(row.rowKey) +
    '" aria-haspopup="dialog">' +
    esc(label) +
    '</button>' +
    '<div class="med-pharm-adh-panel" role="dialog" aria-hidden="true">' +
    buildAdhPanelHtml(row, daysInMonth) +
    '</div></span>'
  );
}

function buildMedCellInner(row, stats, daysInMonth) {
  return (
    '<div class="med-cell-name">' +
    esc(row.med) +
    '</div>' +
    '<div class="med-cell-adh">' +
    buildAdhTriggerHtml(row, stats, daysInMonth) +
    '</div>'
  );
}

var _medPharmAdhHoverWired = false;
var _medPharmAdhHideDelayMs = 140;

function medPharmAdhPanelForWrap(wrap) {
  return wrap.querySelector('.med-pharm-adh-panel') || wrap._medPharmAdhPanelEl || null;
}

function hideMedPharmAdhPanel(panel) {
  if (!panel) return;
  if (panel._medPharmAdhHideTid) {
    clearTimeout(panel._medPharmAdhHideTid);
    panel._medPharmAdhHideTid = null;
  }
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  panel.style.left = '';
  panel.style.top = '';
  panel.style.visibility = '';
  var wrap = panel._medPharmAdhOwnerWrap;
  if (wrap) wrap._medPharmAdhPanelEl = null;
  panel._medPharmAdhOwnerWrap = null;
  if (wrap && wrap.isConnected) {
    wrap.appendChild(panel);
  } else if (panel.parentNode === document.body) {
    panel.remove();
  }
}

function scheduleHideMedPharmAdhPanel(panel) {
  if (!panel) return;
  if (panel._medPharmAdhHideTid) clearTimeout(panel._medPharmAdhHideTid);
  panel._medPharmAdhHideTid = setTimeout(function () {
    panel._medPharmAdhHideTid = null;
    hideMedPharmAdhPanel(panel);
  }, _medPharmAdhHideDelayMs);
}

function positionMedPharmAdhPanel(wrap) {
  var panel = medPharmAdhPanelForWrap(wrap);
  var trigger = wrap.querySelector('.med-pharm-adh-trigger');
  if (!panel || !trigger) return;
  document.querySelectorAll('.med-pharm-adh-panel.is-open').forEach(function (p) {
    var w = p._medPharmAdhOwnerWrap;
    if (w !== wrap) hideMedPharmAdhPanel(p);
  });
  if (panel._medPharmAdhHideTid) {
    clearTimeout(panel._medPharmAdhHideTid);
    panel._medPharmAdhHideTid = null;
  }
  panel._medPharmAdhOwnerWrap = wrap;
  wrap._medPharmAdhPanelEl = panel;
  if (panel.parentNode !== document.body) document.body.appendChild(panel);
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  panel.style.visibility = 'hidden';
  panel.style.left = '-9999px';
  panel.style.top = '0';
  void panel.offsetWidth;
  var anchor = trigger.getBoundingClientRect();
  var pr = panel.getBoundingClientRect();
  var margin = 8;
  var gap = 4;
  var top = anchor.bottom + gap;
  var left = anchor.left;
  if (top + pr.height > window.innerHeight - margin) {
    top = Math.max(margin, anchor.top - pr.height - gap);
  }
  if (left + pr.width > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - pr.width - margin);
  }
  if (left < margin) left = margin;
  panel.style.left = Math.round(left) + 'px';
  panel.style.top = Math.round(top) + 'px';
  panel.style.visibility = '';
}

function wireMedPharmAdhHoverPanels(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('.med-pharm-adh-panel').forEach(function (panel) {
    if (panel._medPharmAdhPanelHoverListeners) return;
    panel._medPharmAdhPanelHoverListeners = true;
    panel.addEventListener('mouseenter', function () {
      if (panel._medPharmAdhHideTid) {
        clearTimeout(panel._medPharmAdhHideTid);
        panel._medPharmAdhHideTid = null;
      }
    });
    panel.addEventListener('mouseleave', function (ev) {
      var w = panel._medPharmAdhOwnerWrap || panel.closest('.med-pharm-adh-wrap');
      var toEl = ev.relatedTarget;
      if (toEl && w && (w.contains(toEl) || panel.contains(toEl))) return;
      scheduleHideMedPharmAdhPanel(panel);
    });
  });
}

function wireMedPharmAdhHoverOnce() {
  if (_medPharmAdhHoverWired) return;
  _medPharmAdhHoverWired = true;
  function wrapFromTarget(t) {
    if (!t || !t.closest) return null;
    return t.closest('.med-pharm-adh-wrap');
  }
  document.addEventListener('mouseover', function (ev) {
    var wrap = wrapFromTarget(ev.target);
    if (!wrap) return;
    positionMedPharmAdhPanel(wrap);
  });
  document.addEventListener('mouseout', function (ev) {
    var wrap = wrapFromTarget(ev.target);
    if (!wrap) return;
    var panel = medPharmAdhPanelForWrap(wrap);
    if (!panel) return;
    var toEl = ev.relatedTarget;
    if (toEl && (wrap.contains(toEl) || panel.contains(toEl))) return;
    scheduleHideMedPharmAdhPanel(panel);
  });
  document.addEventListener('focusin', function (ev) {
    var wrap = wrapFromTarget(ev.target);
    if (!wrap) return;
    positionMedPharmAdhPanel(wrap);
  });
  document.addEventListener('focusout', function (ev) {
    var wrap = wrapFromTarget(ev.target);
    if (!wrap) return;
    var panel = medPharmAdhPanelForWrap(wrap);
    if (!panel) return;
    var rel = ev.relatedTarget;
    if (rel && (wrap.contains(rel) || panel.contains(rel))) return;
    hideMedPharmAdhPanel(panel);
  });
  window.addEventListener(
    'scroll',
    function () {
      document.querySelectorAll('.med-pharm-adh-panel.is-open').forEach(hideMedPharmAdhPanel);
    },
    true
  );
}

function rowsMatchingCategoryFilter(month) {
  if (!month || !month.rows) return [];
  if (listFilter === 'TODOS') return month.rows;
  return month.rows.filter(function (r) {
    return rowSomePharmCategory(r) === listFilter;
  });
}

function countHiddenInCategoryFilter(month) {
  return rowsMatchingCategoryFilter(month).filter(isMedPharmRowHidden).length;
}

function displayRows(month) {
  var rows = rowsMatchingCategoryFilter(month);
  if (showHiddenMedRows) return rows;
  return rows.filter(function (r) {
    return !isMedPharmRowHidden(r);
  });
}

function setMedPharmRowHidden(pid, rowKey, hidden) {
  var month = getViewMonth(pid);
  if (!month) return;
  var row = month.rows.find(function (r) {
    return r.rowKey === rowKey;
  });
  if (!row) return;
  if (hidden) row.hidden = true;
  else delete row.hidden;
  saveState();
  renderMedPharmProfilePanel();
  var fullEl = document.getElementById('med-pharm-modal-full');
  if (fullEl && fullEl.classList.contains('open')) openMedPharmFullModal();
}

function renderFilterSelect(filtro) {
  if (!filtro) return;
  var labels = listSomePharmFilterLabels();
  var html = labels
    .map(function (lab) {
      var sel = lab === listFilter ? ' selected' : '';
      return '<option value="' + esc(lab) + '"' + sel + '>' + esc(lab) + '</option>';
    })
    .join('');
  if (filtro.innerHTML !== html) filtro.innerHTML = html;
  filtro.value = listFilter;
}

function setRowCategoryOverride(pid, rowKey, cat) {
  var month = getViewMonth(pid);
  if (!month) return;
  var row = month.rows.find(function (r) {
    return r.rowKey === rowKey;
  });
  if (!row) return;
  if (!cat || cat === row.cat) {
    delete row.catOverride;
    row.cat = assignSomePharmCategory(row).cat;
  } else {
    row.catOverride = cat;
    row.cat = cat;
  }
  saveState();
}

function padDayCells(tr, count, target, tag, padClass) {
  while (count < target) {
    var cell = document.createElement(tag);
    cell.className = padClass;
    if (tag === 'th') cell.innerHTML = '&nbsp;';
    tr.appendChild(cell);
    count += 1;
  }
}

function appendDayHeader(tr, from, to, year, monthIndex) {
  for (var d = from; d <= to; d += 1) {
    var th = document.createElement('th');
    th.className = 'day-hdr' + (isToday(year, monthIndex, d) ? ' today-col' : '');
    th.textContent = String(d).padStart(2, '0');
    tr.appendChild(th);
  }
}

function appendDayCell(tr, row, d, year, monthIndex) {
  var td = document.createElement('td');
  td.className = 'day-pad' + (isToday(year, monthIndex, d) ? ' today-col' : '');
  var v = dayValueInMap(row.days, d);
  if (!(v > 0)) {
    tr.appendChild(td);
    return;
  }
  td.classList.add('indicated');
  if (row.notAdmin && (row.notAdmin[d] || row.notAdmin[String(d)])) {
    td.classList.add('not-admin');
  }
  if (v > 1) {
    var span = document.createElement('span');
    span.className = 'x2';
    span.textContent = '×2';
    td.appendChild(span);
  }
  td.dataset.rowKey = row.rowKey;
  td.dataset.day = String(d);
  td.title = 'Día ' + d + ' — clic para marcar no administrado';
  tr.appendChild(td);
}

function wireGridDayClicks(root) {
  if (!root || root._medPharmDayClickWired) return;
  root._medPharmDayClickWired = true;
  root.addEventListener('click', function (e) {
    var dayCell = e.target.closest('td.day-pad.indicated[data-row-key]');
    if (!dayCell || !root.contains(dayCell)) return;
    e.preventDefault();
    e.stopPropagation();
    onGridDayClick(dayCell.dataset.rowKey, parseInt(dayCell.dataset.day, 10));
  });
}

function refreshOpenMedPharmGrids() {
  var pid = rt.getActiveId();
  if (!pid) return;
  var month = getViewMonth(pid);
  if (!month) return;
  var fullEl = document.getElementById('med-pharm-modal-full');
  if (fullEl && fullEl.classList.contains('open')) {
    var fullBody = document.getElementById('med-pharm-modal-full-body');
    mountSomeGrid(month, displayRows(month), fullBody);
  }
  var oneEl = document.getElementById('med-pharm-modal-one');
  if (oneEl && oneEl.classList.contains('open') && openRowKey) {
    var row = month.rows.find(function (r) {
      return r.rowKey === openRowKey;
    });
    if (row) {
      var oneBody = document.getElementById('med-pharm-modal-one-body');
      var sub = document.getElementById('med-pharm-modal-one-sub');
      mountSomeGrid(month, [row], oneBody);
      if (sub) {
        var stats = adherenceStats(row.days, row.notAdmin);
        var parts = [monthLabel(viewYear, viewMonthIndex)];
        if (row.dosis) parts.push(row.dosis);
        parts.push(formatFreqShort(row.freq) + ' · ' + formatViaShort(row.via));
        parts.push(stats.effective + ' d efectivos');
        sub.textContent = parts.join(' · ');
      }
    }
  }
}

function mountSomeGrid(month, rows, container) {
  if (!container) return;
  container.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.className = 'med-pharm-grid-scope some-grid-wrap med-pharm-scroll';
  wrap.appendChild(buildSomeGridTable(month, rows));
  container.appendChild(wrap);
  wireGridDayClicks(wrap);
  wireMedPharmAdhHoverPanels(wrap);
}

function buildSomeGridTable(month, rows) {
  var total = month.daysInMonth;
  var splitAt = splitMonthAt(total);
  var table = document.createElement('table');
  table.className = 'some-grid-unified';

  var cg = document.createElement('colgroup');
  ['col-med', 'col-dosis', 'col-freq', 'col-via'].forEach(function (cls) {
    var col = document.createElement('col');
    col.className = cls;
    cg.appendChild(col);
  });
  for (var ci = 0; ci < splitAt; ci += 1) {
    var dayCol = document.createElement('col');
    dayCol.className = 'col-day';
    cg.appendChild(dayCol);
  }
  table.appendChild(cg);

  var thead = document.createElement('thead');
  var hdr1 = document.createElement('tr');
  hdr1.className = 'hdr-row-1';
  ['Medicamento', 'Dosis', 'Freq', 'Vía'].forEach(function (label, i) {
    var th = document.createElement('th');
    th.className = 'col-meta-hdr col-' + ['med', 'dosis', 'freq', 'via'][i];
    th.rowSpan = 2;
    th.textContent = label;
    hdr1.appendChild(th);
  });
  appendDayHeader(hdr1, 1, Math.min(splitAt, total), month.year, month.monthIndex);
  padDayCells(hdr1, hdr1.querySelectorAll('th.day-hdr').length, splitAt, 'th', 'day-hdr day-hdr-empty');
  thead.appendChild(hdr1);

  var hdr2 = document.createElement('tr');
  hdr2.className = 'hdr-row-2';
  if (total > splitAt) {
    appendDayHeader(hdr2, splitAt + 1, total, month.year, month.monthIndex);
  }
  padDayCells(hdr2, hdr2.querySelectorAll('th.day-hdr').length, splitAt, 'th', 'day-hdr day-hdr-empty');
  thead.appendChild(hdr2);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  rows.forEach(function (row, rowIndex) {
    var stats = adherenceStats(row.days, row.notAdmin);
    var missCls = stats.missed > 0 ? ' has-misses' : '';
    var blockStartCls = rowIndex > 0 ? ' med-row-block-start' : '';
    var blockToneCls = rowIndex % 2 === 1 ? ' med-block-b' : ' med-block-a';

    var tr1 = document.createElement('tr');
    tr1.className = 'day-band' + missCls + blockStartCls + blockToneCls;
    var medTd = document.createElement('td');
    medTd.rowSpan = 2;
    medTd.className = 'col-med';
    medTd.innerHTML = buildMedCellInner(row, stats, total);
    tr1.appendChild(medTd);

    var dosisTd = document.createElement('td');
    dosisTd.rowSpan = 2;
    dosisTd.className = 'col-dosis';
    dosisTd.textContent = row.dosis || '';
    tr1.appendChild(dosisTd);

    var freqTd = document.createElement('td');
    freqTd.rowSpan = 2;
    freqTd.className = 'col-freq';
    freqTd.textContent = formatFreqShort(row.freq);
    tr1.appendChild(freqTd);

    var viaTd = document.createElement('td');
    viaTd.rowSpan = 2;
    viaTd.className = 'col-via';
    viaTd.textContent = formatViaShort(row.via);
    tr1.appendChild(viaTd);

    appendDayCell(tr1, row, 1, month.year, month.monthIndex);
    for (var d = 2; d <= Math.min(splitAt, total); d += 1) {
      appendDayCell(tr1, row, d, month.year, month.monthIndex);
    }
    padDayCells(tr1, tr1.querySelectorAll('td.day-pad').length, splitAt, 'td', 'day-pad day-pad-empty');
    tbody.appendChild(tr1);

    var tr2 = document.createElement('tr');
    tr2.className = 'day-band med-row-block-end' + missCls + blockToneCls;
    if (total > splitAt) {
      appendDayCell(tr2, row, splitAt + 1, month.year, month.monthIndex);
      for (var d2 = splitAt + 2; d2 <= total; d2 += 1) {
        appendDayCell(tr2, row, d2, month.year, month.monthIndex);
      }
    }
    padDayCells(tr2, tr2.querySelectorAll('td.day-pad').length, splitAt, 'td', 'day-pad day-pad-empty');
    tbody.appendChild(tr2);
  });
  table.appendChild(tbody);
  return table;
}

var MED_PHARM_MODAL_IDS = ['med-pharm-paste-modal', 'med-pharm-modal-one', 'med-pharm-modal-full'];

function closeModals() {
  MED_PHARM_MODAL_IDS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.remove('open');
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');
    }
  });
  document.body.classList.remove('rpc-med-pharm-modal-open');
  openRowKey = null;
}

function openMedPharmModal(id) {
  closeModals();
  var el = document.getElementById(id);
  if (!el) return;
  el.removeAttribute('hidden');
  el.setAttribute('aria-hidden', 'false');
  el.classList.add('open');
  document.body.classList.add('rpc-med-pharm-modal-open');
}

export function closeMedPharmModals() {
  closeModals();
}

function wireMedPharmModalDismiss() {
  if (dismissWired) return;
  dismissWired = true;
  document.addEventListener(
    'keydown',
    function (ev) {
      if (ev.key !== 'Escape') return;
      var open = false;
      MED_PHARM_MODAL_IDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.classList.contains('open')) open = true;
      });
      if (!open) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeModals();
    },
    true
  );
  MED_PHARM_MODAL_IDS.forEach(function (id) {
    var bd = document.getElementById(id);
    if (!bd) return;
    bd.addEventListener('click', function (ev) {
      if (!bd.classList.contains('open')) return;
      if (ev.target === bd) closeModals();
    });
  });
}

function onActivePatientChangedForPharm(pid) {
  if (pid === lastPharmPanelPatientId) return;
  lastPharmPanelPatientId = pid;
  closeModals();
}

export function openMedPharmPasteModal() {
  var pid = rt.getActiveId();
  if (!pid) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var ta = document.getElementById('med-pharm-paste');
  openMedPharmModal('med-pharm-paste-modal');
  if (ta) {
    var profile = getProfile(pid);
    ta.value = profile && profile.draftPaste ? profile.draftPaste : '';
    requestAnimationFrame(function () {
      ta.focus();
    });
  }
}

function onGridDayClick(rowKey, day) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var month = getViewMonth(pid);
  if (!month) return;
  var row = month.rows.find(function (r) {
    return r.rowKey === rowKey;
  });
  if (!row) return;
  row.notAdmin = toggleNotAdmin(row.days, row.notAdmin, day);
  saveState();
  refreshOpenMedPharmGrids();
  renderMedPharmProfilePanel();
}

function wireUiOnce() {
  wireMedPharmModalDismiss();
  wireMedPharmAdhHoverOnce();
  if (uiWired) return;
  uiWired = true;
  var pasteOpen = document.getElementById('med-pharm-paste-open-btn');
  if (pasteOpen) pasteOpen.addEventListener('click', openMedPharmPasteModal);
  var imp = document.getElementById('med-pharm-import-btn');
  if (imp) imp.addEventListener('click', importMedPharmMonthPaste);
  var full = document.getElementById('med-pharm-full-btn');
  if (full) full.addEventListener('click', openMedPharmFullModal);
  var prev = document.getElementById('med-pharm-month-prev');
  var next = document.getElementById('med-pharm-month-next');
  if (prev) {
    prev.addEventListener('click', function () {
      shiftViewMonth(-1);
    });
  }
  if (next) {
    next.addEventListener('click', function () {
      shiftViewMonth(1);
    });
  }
  var filtro = document.getElementById('med-pharm-filtro');
  if (filtro) {
    filtro.addEventListener('change', function () {
      listFilter = filtro.value;
      renderMedPharmProfilePanel();
    });
  }
  var showHidden = document.getElementById('med-pharm-show-hidden');
  if (showHidden) {
    showHidden.addEventListener('change', function () {
      showHiddenMedRows = !!showHidden.checked;
      renderMedPharmProfilePanel();
    });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-med-pharm-close]')) return;
    var hideBtn = e.target.closest('[data-med-pharm-hide]');
    if (hideBtn && hideBtn.dataset.medPharmHide) {
      var pidHide = rt.getActiveId();
      if (pidHide) setMedPharmRowHidden(pidHide, hideBtn.dataset.medPharmHide, true);
      return;
    }
    var unhideBtn = e.target.closest('[data-med-pharm-unhide]');
    if (unhideBtn && unhideBtn.dataset.medPharmUnhide) {
      var pidShow = rt.getActiveId();
      if (pidShow) setMedPharmRowHidden(pidShow, unhideBtn.dataset.medPharmUnhide, false);
      return;
    }
  });
}

function shiftViewMonth(delta) {
  viewMonthIndex += delta;
  if (viewMonthIndex < 0) {
    viewMonthIndex = 11;
    viewYear -= 1;
  }
  if (viewMonthIndex > 11) {
    viewMonthIndex = 0;
    viewYear += 1;
  }
  renderMedPharmProfilePanel();
}

export function renderMedPharmProfilePanel() {
  initMedPharmSubviewUi();
  if (medSubview !== 'perfil') return;
  var pid = rt.getActiveId();
  onActivePatientChangedForPharm(pid);
  var hint = document.getElementById('med-pharm-hint');
  var list = document.getElementById('med-pharm-list');
  var label = document.getElementById('med-pharm-month-label');
  if (!list) return;
  if (!pid) {
    if (hint) {
      hint.style.display = 'block';
      hint.textContent = 'Selecciona un paciente para ver el perfil farmacoterapéutico.';
    }
    list.innerHTML = '';
    return;
  }
  if (hint) hint.style.display = 'none';
  if (label) label.textContent = monthLabel(viewYear, viewMonthIndex);
  var lastPasteEl = document.getElementById('med-pharm-last-paste');
  var month = reclassifyMonthIfLegacy(pid, getViewMonth(pid));
  if (lastPasteEl) {
    var pasted = month && month.lastSomePasteAt;
    if (pasted) {
      var d = new Date(pasted);
      lastPasteEl.textContent =
        'Último pegado: ' +
        String(d.getDate()).padStart(2, '0') +
        '/' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '/' +
        d.getFullYear();
      lastPasteEl.hidden = false;
    } else {
      lastPasteEl.hidden = true;
    }
  }
  var rows = displayRows(month);
  var hiddenCount = countHiddenInCategoryFilter(month);
  var filtro = document.getElementById('med-pharm-filtro');
  renderFilterSelect(filtro);
  updateMedPharmHiddenToolbar(hiddenCount);
  var card = document.querySelector('.med-pharm-profile-card');
  var listHead = document.querySelector('.med-pharm-list-head');
  if (!month || !month.rows.length) {
    if (card) card.classList.remove('med-pharm-has-grid');
    if (listHead) listHead.style.display = '';
    list.className = 'med-pharm-list-body';
    list.innerHTML =
      '<div class="med-pharm-empty">' +
      '<p class="med-pharm-empty-title">Sin datos para ' +
      esc(monthLabel(viewYear, viewMonthIndex)) +
      '</p>' +
      '<p class="med-pharm-empty-lead">Importa la matriz SOME del hospital o procesa <strong>Receta</strong> en la pestaña Receta actual.</p>' +
      '<button type="button" class="btn-generate" data-med-pharm-open-paste>Importar mes SOME</button>' +
      '</div>';
    list.querySelector('[data-med-pharm-open-paste]').addEventListener('click', openMedPharmPasteModal);
    return;
  }
  if (!rows.length) {
    if (card) card.classList.remove('med-pharm-has-grid');
    if (listHead) listHead.style.display = hiddenCount > 0 && showHiddenMedRows ? '' : 'none';
    list.className = 'med-pharm-list-body';
    list.innerHTML =
      '<div class="med-pharm-empty med-pharm-empty--filter">' +
      '<p class="med-pharm-empty-title">Ningún medicamento visible</p>' +
      '<p class="med-pharm-empty-lead">' +
      (hiddenCount > 0
        ? 'Hay ' + hiddenCount + ' oculto(s) con este filtro. Activa <strong>Mostrar ocultos</strong> para verlos o restaurarlos.'
        : 'Prueba otro filtro de categoría.') +
      '</p>' +
      '</div>';
    return;
  }
  if (card) card.classList.remove('med-pharm-has-grid');
  if (listHead) listHead.style.display = '';
  list.className = 'med-pharm-list-body';
  renderMedPharmSummaryList(list, rows, month);
}

function updateMedPharmHiddenToolbar(hiddenCount) {
  var wrap = document.getElementById('med-pharm-show-hidden-wrap');
  var cb = document.getElementById('med-pharm-show-hidden');
  var countEl = document.getElementById('med-pharm-hidden-count');
  if (countEl) countEl.textContent = String(hiddenCount);
  if (wrap) wrap.hidden = hiddenCount < 1;
  if (cb) {
    cb.checked = showHiddenMedRows;
    cb.disabled = hiddenCount < 1;
  }
}

function renderMedPharmSummaryList(listEl, rows, month) {
  var daysInMonth =
    month && month.daysInMonth
      ? month.daysInMonth
      : new Date(viewYear, viewMonthIndex + 1, 0).getDate();
  listEl.innerHTML = '';
  rows.forEach(function (row) {
    var stats = adherenceStats(row.days, row.notAdmin);
    var missCls = stats.missed > 0 ? ' has-misses' : '';
    var isHidden = isMedPharmRowHidden(row);
    var wrap = document.createElement('div');
    wrap.className = 'med-pharm-row' + (isHidden ? ' med-pharm-row--hidden' : '');
    var summary = document.createElement('div');
    summary.className = 'med-pharm-row-summary' + missCls;

    var main = document.createElement('div');
    main.className = 'med-pharm-main';
    var text = document.createElement('div');
    text.className = 'med-pharm-text';
    var nameEl = document.createElement('div');
    nameEl.className = 'med-pharm-name';
    nameEl.textContent = row.med || '';
    text.appendChild(nameEl);
    var adhEl = document.createElement('div');
    adhEl.className = 'med-cell-adh';
    adhEl.innerHTML = buildAdhTriggerHtml(row, stats, daysInMonth);
    text.appendChild(adhEl);
    var dosisEl = document.createElement('div');
    dosisEl.className = 'med-pharm-dosis-line';
    dosisEl.textContent = row.dosis || '';
    text.appendChild(dosisEl);
    var catEl = document.createElement('span');
    catEl.className = 'med-pharm-cat-badge';
    catEl.textContent = rowSomePharmCategory(row);
    text.appendChild(catEl);
    main.appendChild(text);
    var actions = document.createElement('div');
    actions.className = 'med-pharm-row-actions';
    var btnDays = document.createElement('button');
    btnDays.type = 'button';
    btnDays.className = 'med-pharm-btn-dias';
    btnDays.textContent = 'Días';
    btnDays.addEventListener('click', function (e) {
      e.stopPropagation();
      openMedPharmRowModal(row.rowKey);
    });
    actions.appendChild(btnDays);
    var btnVis = document.createElement('button');
    btnVis.type = 'button';
    btnVis.className = 'med-pharm-btn-visibility';
    if (isHidden) {
      btnVis.textContent = 'Mostrar';
      btnVis.title = 'Volver a mostrar en la lista y calendario';
      btnVis.dataset.medPharmUnhide = row.rowKey;
    } else {
      btnVis.textContent = 'Ocultar';
      btnVis.title = 'Ocultar de la vista (se conserva en el mes importado)';
      btnVis.dataset.medPharmHide = row.rowKey;
    }
    actions.appendChild(btnVis);
    main.appendChild(actions);
    summary.appendChild(main);

    var freqEl = document.createElement('span');
    freqEl.className = 'med-pharm-freq-cell';
    freqEl.textContent = formatFreqShort(row.freq);
    summary.appendChild(freqEl);

    var viaEl = document.createElement('span');
    viaEl.className = 'med-pharm-via-cell';
    viaEl.textContent = formatViaShort(row.via);
    summary.appendChild(viaEl);

    wrap.appendChild(summary);
    listEl.appendChild(wrap);
  });
  wireMedPharmAdhHoverPanels(listEl);
}

export function openMedPharmRowModal(rowKey) {
  var pid = rt.getActiveId();
  var month = pid ? getViewMonth(pid) : null;
  if (!month) return;
  var row = month.rows.find(function (r) {
    return r.rowKey === rowKey;
  });
  if (!row) return;
  var body = document.getElementById('med-pharm-modal-one-body');
  var title = document.getElementById('med-pharm-modal-one-title');
  var sub = document.getElementById('med-pharm-modal-one-sub');
  if (!body) return;
  if (title) title.textContent = row.med || 'Medicamento';
  if (sub) {
    var stats = adherenceStats(row.days, row.notAdmin);
    var parts = [monthLabel(viewYear, viewMonthIndex)];
    if (row.dosis) parts.push(row.dosis);
    parts.push(formatFreqShort(row.freq) + ' · ' + formatViaShort(row.via));
    parts.push(stats.effective + ' d efectivos');
    sub.textContent = parts.join(' · ');
  }
  mountSomeGrid(month, [row], body);
  openMedPharmModal('med-pharm-modal-one');
  openRowKey = rowKey;
}

export function openMedPharmFullModal() {
  var pid = rt.getActiveId();
  var month = pid ? getViewMonth(pid) : null;
  if (!month) {
    rt.showToast('No hay datos del mes para mostrar', 'error');
    return;
  }
  var rows = displayRows(month);
  if (!rows.length) {
    var hiddenN = countHiddenInCategoryFilter(month);
    rt.showToast(
      hiddenN > 0
        ? 'Solo hay medicamentos ocultos. Activa «Mostrar ocultos» para ver el calendario.'
        : 'No hay medicamentos en el filtro actual',
      'error'
    );
    return;
  }
  var body = document.getElementById('med-pharm-modal-full-body');
  var title = document.getElementById('med-pharm-modal-full-title');
  var sub = document.getElementById('med-pharm-modal-full-sub');
  if (!body) return;
  if (title) {
    title.textContent = 'Calendario farmacoterapéutico — ' + monthLabel(viewYear, viewMonthIndex);
  }
  if (sub) {
    var filtLabel = listFilter === 'TODOS' ? 'Todos los medicamentos' : 'Filtro: ' + listFilter;
    sub.textContent = filtLabel + ' · ' + rows.length + ' filas · formato matriz SOME';
    sub.hidden = false;
  }
  openMedPharmModal('med-pharm-modal-full');
  mountSomeGrid(month, rows, body);
}

export function importMedPharmMonthPaste() {
  var pid = rt.getActiveId();
  if (!pid) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var ta = document.getElementById('med-pharm-paste');
  var raw = ta ? ta.value : '';
  if (!looksLikeSomePharmMonthPaste(raw)) {
    rt.showToast('No parece un pegado SOME mensual (cabecera con días 01, 02…)', 'error');
    return;
  }
  var parsed = parseSomePharmMonthPaste(raw, { year: viewYear, monthIndex: viewMonthIndex });
  if (!parsed.rows.length) {
    rt.showToast('No se encontraron filas de medicamento en el pegado', 'error');
    return;
  }
  var profile = getProfile(pid) || { months: {} };
  medPharmProfileByPatient[pid] = applySomePasteToProfile(profile, parsed);
  if (medPharmProfileByPatient[pid].draftPaste) delete medPharmProfileByPatient[pid].draftPaste;
  saveState();
  if (ta) ta.value = '';
  closeModals();
  renderMedPharmProfilePanel();
  var msg = 'Mes importado (' + parsed.rows.length + ' medicamentos)';
  if (parsed.skipped > 0) msg += '. Omitidas ' + parsed.skipped + ' líneas.';
  rt.showToast(msg, 'success');
}

export function onRecetaMergedToProfile(patientId, recetaBlock) {
  if (!patientId || !recetaBlock || !recetaBlock.items || !recetaBlock.items.length) return;
  var fecha = recetaBlock.fechaActualizacion;
  if (!fecha) return;
  var parts = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!parts) return;
  var year = parseInt(parts[3], 10);
  var monthIndex = parseInt(parts[2], 10) - 1;
  var profile = getProfile(patientId) || { months: {} };
  var withMonth = ensureMonthOnProfile(profile, year, monthIndex);
  var key = monthKeyFromParts(year, monthIndex);
  var month = withMonth.months[key];
  month = mergeRecetaIntoMonth(month, recetaBlock.items, fecha);
  month.rows = assignSomePharmCategories(month.rows);
  withMonth.months[key] = month;
  medPharmProfileByPatient[patientId] = withMonth;
  saveState();
  if (medSubview === 'perfil' && viewYear === year && viewMonthIndex === monthIndex) {
    renderMedPharmProfilePanel();
  }
}

export const medPharmProfileWindowHandlers = {
  setMedSubview,
  importMedPharmMonthPaste,
  openMedPharmPasteModal,
  openMedPharmFullModal,
  closeMedPharmModals,
};
