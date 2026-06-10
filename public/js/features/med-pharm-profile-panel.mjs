/**
 * UI Perfil farmacoterapéutico (subvista Medicamentos). Funciones cortas, CCN bajo.
 */
import { medPharmProfileByPatient, saveState, patients } from '../app-state.mjs';
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
  isMedPharmRowHidden,
  formatFreqShort,
  formatViaShort,
  monthKeyFromParts,
} from '../med-pharm-profile-core.mjs';
import {
  buildPharmViewWindow,
  unifyRowsForWindow,
  groupUnifiedRowsByMed,
  rowsForMedGroup,
  adherenceStatsForRowKeys,
  cellValueAtColumn,
  toggleNotAdminAtColumn,
  makeColumn,
} from '../med-pharm-view-window.mjs';
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

const MONTH_ABBR = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
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
let openMedGroupKey = null;
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

function getFimiFechaForPatient(patientId) {
  var patient = patients.find(function (p) {
    return p.id === patientId;
  });
  return patient ? patient.fimiFecha : '';
}

function getViewWindow(pid) {
  var profile = getProfile(pid);
  return buildPharmViewWindow({
    profile: profile || { months: {} },
    viewYear: viewYear,
    viewMonthIndex: viewMonthIndex,
    today: todayParts(),
    fimiFecha: getFimiFechaForPatient(pid),
  });
}

function monthRowForColumn(profile, rowKey, column) {
  var month = profile && profile.months ? profile.months[column.monthKey] : null;
  if (!month || !month.rows) return null;
  for (var i = 0; i < month.rows.length; i += 1) {
    if (month.rows[i].rowKey === rowKey) return month.rows[i];
  }
  return null;
}

function notAdminAtColumn(profile, rowKey, column) {
  var row = monthRowForColumn(profile, rowKey, column);
  if (!row || !row.notAdmin) return false;
  return !!(row.notAdmin[column.day] || row.notAdmin[String(column.day)]);
}

function windowHasMultipleMonths(columns) {
  if (!columns || columns.length < 2) return false;
  var mk = columns[0].monthKey;
  for (var i = 1; i < columns.length; i += 1) {
    if (columns[i].monthKey !== mk) return true;
  }
  return false;
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

function formatViaListAbbrev(raw) {
  var v = formatViaShort(raw).toUpperCase();
  if (!v || v === '—') return '—';
  if (v.indexOf('INTRAVEN') >= 0) return 'IV';
  if (v === 'IV') return 'IV';
  if (v.indexOf('ORAL') >= 0) return 'VO';
  if (v.indexOf('SUBCUT') >= 0) return 'SC';
  if (v.indexOf('INTRAMUS') >= 0) return 'IM';
  if (v.indexOf('INHAL') >= 0) return 'INH';
  if (v.indexOf('TOPIC') >= 0) return 'TOP';
  if (v.length > 5) return v.slice(0, 4);
  return v;
}

function medGroupListTooltip(group) {
  var lines = [];
  group.variants.forEach(function (v) {
    var head = v.med || group.med || '';
    var part = [v.dosis, formatFreqShort(v.freq), formatViaShort(v.via)].filter(Boolean).join(' · ');
    lines.push(part ? head + ' — ' + part : head);
  });
  return lines.join('\n');
}

function formatAdhDayList(columns, multiMonth) {
  if (!columns.length) return '—';
  return columns
    .map(function (col) {
      var dd = String(col.day).padStart(2, '0');
      return multiMonth ? dd + ' ' + MONTH_ABBR[col.monthIndex] : dd;
    })
    .join(', ');
}

function adherenceDayDetail(row, columns, profile) {
  return adherenceDayDetailForRowKeys(profile, [row.rowKey], columns);
}

function adherenceDayDetailForRowKeys(profile, rowKeys, columns) {
  var indicated = [];
  var missed = [];
  for (var i = 0; i < columns.length; i += 1) {
    var col = columns[i];
    var dayIndicated = false;
    var dayMissed = false;
    for (var k = 0; k < rowKeys.length; k += 1) {
      if (!(cellValueAtColumn(profile, rowKeys[k], col) > 0)) continue;
      dayIndicated = true;
      if (notAdminAtColumn(profile, rowKeys[k], col)) dayMissed = true;
    }
    if (!dayIndicated) continue;
    indicated.push(col);
    if (dayMissed) missed.push(col);
  }
  var administered = indicated.filter(function (col) {
    return missed.indexOf(col) < 0;
  });
  return { indicated: indicated, missed: missed, administered: administered };
}

function adherenceStatsForWindow(profile, rowKey, columns) {
  var indicated = 0;
  var missed = 0;
  var missedDays = [];
  for (var i = 0; i < columns.length; i += 1) {
    var col = columns[i];
    if (!(cellValueAtColumn(profile, rowKey, col) > 0)) continue;
    indicated += 1;
    if (notAdminAtColumn(profile, rowKey, col)) {
      missed += 1;
      missedDays.push(col.day);
    }
  }
  return {
    indicated: indicated,
    effective: indicated - missed,
    missed: missed,
    missedDays: missedDays,
  };
}

function buildAdhPanelHtmlForGroup(group, columns, profile, windowLabel) {
  var detail = adherenceDayDetailForRowKeys(profile, group.rowKeys, columns);
  var multiMonth = windowHasMultipleMonths(columns);
  var monthTitle = windowLabel || monthLabel(viewYear, viewMonthIndex);
  var regimenNote =
    group.variants.length > 1
      ? '<p class="med-pharm-adh-panel-regimens">' +
        esc(String(group.variants.length)) +
        ' regímenes (dosis distintas) en esta ventana</p>'
      : '';
  return (
    regimenNote +
    '<p class="med-pharm-adh-panel-head">' +
    esc(monthTitle) +
    '</p>' +
    '<div class="med-pharm-adh-panel-section">' +
    '<span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--ok">Administrados (por defecto)</span>' +
    '<p class="med-pharm-adh-panel-days">' +
    esc(formatAdhDayList(detail.administered, multiMonth)) +
    '</p>' +
    '</div>' +
    '<div class="med-pharm-adh-panel-section">' +
    '<span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--miss">No administrados</span>' +
    '<p class="med-pharm-adh-panel-days">' +
    esc(formatAdhDayList(detail.missed, multiMonth)) +
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

function buildAdhPanelHtml(row, columns, profile, windowLabel) {
  var detail = adherenceDayDetail(row, columns, profile);
  var multiMonth = windowHasMultipleMonths(columns);
  var monthTitle = windowLabel || monthLabel(viewYear, viewMonthIndex);
  return (
    '<p class="med-pharm-adh-panel-head">' +
    esc(monthTitle) +
    '</p>' +
    '<div class="med-pharm-adh-panel-section">' +
    '<span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--ok">Administrados (por defecto)</span>' +
    '<p class="med-pharm-adh-panel-days">' +
    esc(formatAdhDayList(detail.administered, multiMonth)) +
    '</p>' +
    '</div>' +
    '<div class="med-pharm-adh-panel-section">' +
    '<span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--miss">No administrados</span>' +
    '<p class="med-pharm-adh-panel-days">' +
    esc(formatAdhDayList(detail.missed, multiMonth)) +
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

function buildAdhTriggerHtml(row, stats, columns, profile, windowLabel) {
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
    buildAdhPanelHtml(row, columns, profile, windowLabel) +
    '</div></span>'
  );
}

function buildAdhTriggerHtmlForGroup(group, stats, columns, profile, windowLabel) {
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
    '" data-med-group-key="' +
    esc(group.medGroupKey) +
    '" aria-haspopup="dialog">' +
    esc(label) +
    '</button>' +
    '<div class="med-pharm-adh-panel" role="dialog" aria-hidden="true">' +
    buildAdhPanelHtmlForGroup(group, columns, profile, windowLabel) +
    '</div></span>'
  );
}

function buildMedCellInner(row, stats, columns, profile, windowLabel) {
  return (
    '<div class="med-cell-name">' +
    esc(row.med) +
    '</div>' +
    '<div class="med-cell-adh">' +
    buildAdhTriggerHtml(row, stats, columns, profile, windowLabel) +
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

function rowsMatchingCategoryFilter(rows) {
  if (!rows || !rows.length) return [];
  if (listFilter === 'TODOS') return rows;
  return rows.filter(function (r) {
    return rowSomePharmCategory(r) === listFilter;
  });
}

function countHiddenInCategoryFilter(rows) {
  return rowsMatchingCategoryFilter(rows).filter(isMedPharmRowHidden).length;
}

function isMedPharmGroupHidden(group) {
  if (!group || !group.variants || !group.variants.length) return false;
  for (var i = 0; i < group.variants.length; i += 1) {
    if (!isMedPharmRowHidden(group.variants[i])) return false;
  }
  return true;
}

function groupMatchesCategoryFilter(group) {
  if (listFilter === 'TODOS') return true;
  for (var i = 0; i < group.variants.length; i += 1) {
    if (rowSomePharmCategory(group.variants[i]) === listFilter) return true;
  }
  return false;
}

function displayRowsForWindow(profile, window) {
  var unified = unifyRowsForWindow(profile || { months: {} }, window.columns);
  var rows = rowsMatchingCategoryFilter(unified);
  if (showHiddenMedRows) return rows;
  return rows.filter(function (r) {
    return !isMedPharmRowHidden(r);
  });
}

function displayGroupsForWindow(profile, window) {
  var unified = unifyRowsForWindow(profile || { months: {} }, window.columns);
  var groups = groupUnifiedRowsByMed(unified, profile, window.columns);
  groups = groups.filter(groupMatchesCategoryFilter);
  if (!showHiddenMedRows) {
    groups = groups.filter(function (g) {
      return !isMedPharmGroupHidden(g);
    });
  }
  return groups;
}

function countHiddenGroups(groups) {
  var n = 0;
  for (var i = 0; i < groups.length; i += 1) {
    if (isMedPharmGroupHidden(groups[i])) n += 1;
  }
  return n;
}

function setMedPharmMedGroupHidden(pid, rowKeys, hidden) {
  var profile = getProfile(pid);
  if (!profile || !profile.months || !rowKeys || !rowKeys.length) return;
  var keySet = Object.create(null);
  rowKeys.forEach(function (rk) {
    keySet[rk] = true;
  });
  Object.keys(profile.months).forEach(function (mk) {
    var month = profile.months[mk];
    if (!month || !month.rows) return;
    month.rows.forEach(function (row) {
      if (!keySet[row.rowKey]) return;
      if (hidden) row.hidden = true;
      else delete row.hidden;
    });
  });
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

function appendDayHeader(tr, columns, from, to) {
  var prevMonthKey = from > 0 ? columns[from - 1].monthKey : '';
  for (var i = from; i < to; i += 1) {
    var col = columns[i];
    var th = document.createElement('th');
    th.className = 'day-hdr' + (isToday(col.year, col.monthIndex, col.day) ? ' today-col' : '');
    if (col.monthKey !== prevMonthKey) {
      th.classList.add('day-hdr-month');
      if (i > 0) th.classList.add('day-hdr-month-boundary');
      var abbr = document.createElement('span');
      abbr.className = 'day-hdr-month-label';
      abbr.textContent = MONTH_ABBR[col.monthIndex];
      th.appendChild(abbr);
      prevMonthKey = col.monthKey;
    }
    th.appendChild(document.createTextNode(String(col.day).padStart(2, '0')));
    tr.appendChild(th);
  }
}

function appendDayCell(tr, profile, row, column, monthBoundary) {
  var td = document.createElement('td');
  td.className = 'day-pad' + (isToday(column.year, column.monthIndex, column.day) ? ' today-col' : '');
  if (monthBoundary) td.classList.add('day-pad-month-boundary');
  var v = cellValueAtColumn(profile, row.rowKey, column);
  if (!(v > 0)) {
    tr.appendChild(td);
    return;
  }
  td.classList.add('indicated');
  if (notAdminAtColumn(profile, row.rowKey, column)) {
    td.classList.add('not-admin');
  }
  if (v > 1) {
    var span = document.createElement('span');
    span.className = 'x2';
    span.textContent = '×2';
    td.appendChild(span);
  }
  td.dataset.rowKey = row.rowKey;
  td.dataset.year = String(column.year);
  td.dataset.month = String(column.monthIndex);
  td.dataset.day = String(column.day);
  td.title =
    'Día ' +
    column.day +
    ' ' +
    MONTH_ABBR[column.monthIndex] +
    ' — clic para marcar no administrado';
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
    onGridDayClick(
      dayCell.dataset.rowKey,
      parseInt(dayCell.dataset.year, 10),
      parseInt(dayCell.dataset.month, 10),
      parseInt(dayCell.dataset.day, 10)
    );
  });
}

function refreshOpenMedPharmGrids() {
  var pid = rt.getActiveId();
  if (!pid) return;
  var profile = getProfile(pid) || { months: {} };
  var window = getViewWindow(pid);
  if (!window.columns.length) return;
  var fullEl = document.getElementById('med-pharm-modal-full');
  if (fullEl && fullEl.classList.contains('open')) {
    var fullBody = document.getElementById('med-pharm-modal-full-body');
    mountSomeGrid(window, displayRowsForWindow(profile, window), profile, fullBody);
  }
  var oneEl = document.getElementById('med-pharm-modal-one');
  if (oneEl && oneEl.classList.contains('open') && openMedGroupKey) {
    var unified = unifyRowsForWindow(profile, window.columns);
    var variantRows = rowsForMedGroup(unified, openMedGroupKey);
    if (variantRows.length) {
      var oneBody = document.getElementById('med-pharm-modal-one-body');
      var sub = document.getElementById('med-pharm-modal-one-sub');
      mountSomeGrid(window, variantRows, profile, oneBody);
      if (sub) {
        sub.textContent = buildMedGroupModalSubtitle(profile, window, variantRows);
      }
    }
  }
}

function mountSomeGrid(window, rows, profile, container) {
  if (!container) return;
  container.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.className = 'med-pharm-grid-scope some-grid-wrap med-pharm-scroll';
  wrap.appendChild(buildSomeGridTable(window, rows, profile));
  container.appendChild(wrap);
  wireGridDayClicks(wrap);
  wireMedPharmAdhHoverPanels(wrap);
}

function appendDayCellsForSlice(tr, profile, row, columns, from, to) {
  var prevMonthKey = from > 0 ? columns[from - 1].monthKey : '';
  for (var i = from; i < to; i += 1) {
    var col = columns[i];
    var boundary = col.monthKey !== prevMonthKey && i > 0;
    appendDayCell(tr, profile, row, col, boundary);
    prevMonthKey = col.monthKey;
  }
}

function buildSomeGridTable(window, rows, profile) {
  var columns = window.columns;
  var total = columns.length;
  var splitAt = window.splitAt;
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
  appendDayHeader(hdr1, columns, 0, Math.min(splitAt, total));
  padDayCells(hdr1, hdr1.querySelectorAll('th.day-hdr').length, splitAt, 'th', 'day-hdr day-hdr-empty');
  thead.appendChild(hdr1);

  var hdr2 = document.createElement('tr');
  hdr2.className = 'hdr-row-2';
  if (total > splitAt) {
    appendDayHeader(hdr2, columns, splitAt, total);
  }
  padDayCells(hdr2, hdr2.querySelectorAll('th.day-hdr').length, splitAt, 'th', 'day-hdr day-hdr-empty');
  thead.appendChild(hdr2);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  rows.forEach(function (row, rowIndex) {
    var stats = adherenceStatsForWindow(profile, row.rowKey, columns);
    var missCls = stats.missed > 0 ? ' has-misses' : '';
    var blockStartCls = rowIndex > 0 ? ' med-row-block-start' : '';
    var blockToneCls = rowIndex % 2 === 1 ? ' med-block-b' : ' med-block-a';

    var tr1 = document.createElement('tr');
    tr1.className = 'day-band' + missCls + blockStartCls + blockToneCls;
    var medTd = document.createElement('td');
    medTd.rowSpan = 2;
    medTd.className = 'col-med';
    medTd.innerHTML = buildMedCellInner(row, stats, columns, profile, window.label);
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

    appendDayCellsForSlice(tr1, profile, row, columns, 0, Math.min(splitAt, total));
    padDayCells(tr1, tr1.querySelectorAll('td.day-pad').length, splitAt, 'td', 'day-pad day-pad-empty');
    tbody.appendChild(tr1);

    var tr2 = document.createElement('tr');
    tr2.className = 'day-band med-row-block-end' + missCls + blockToneCls;
    if (total > splitAt) {
      appendDayCellsForSlice(tr2, profile, row, columns, splitAt, total);
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
  openMedGroupKey = null;
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

function onGridDayClick(rowKey, year, monthIndex, day) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var col = makeColumn(year, monthIndex, day);
  var profile = getProfile(pid) || { months: {} };
  profile = toggleNotAdminAtColumn(profile, rowKey, col);
  medPharmProfileByPatient[pid] = profile;
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
    var hideBtn = e.target.closest('[data-med-pharm-hide-group]');
    if (hideBtn && hideBtn.dataset.medPharmHideGroup) {
      var pidHide = rt.getActiveId();
      if (pidHide) {
        setMedPharmMedGroupHidden(pidHide, hideBtn.dataset.medPharmHideGroup.split('\t'), true);
      }
      return;
    }
    var unhideBtn = e.target.closest('[data-med-pharm-unhide-group]');
    if (unhideBtn && unhideBtn.dataset.medPharmUnhideGroup) {
      var pidShow = rt.getActiveId();
      if (pidShow) {
        setMedPharmMedGroupHidden(pidShow, unhideBtn.dataset.medPharmUnhideGroup.split('\t'), false);
      }
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
  var profile = getProfile(pid) || { months: {} };
  var window = getViewWindow(pid);
  if (label) label.textContent = window.label;
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
  var unifiedRows = unifyRowsForWindow(profile, window.columns);
  var allGroups = groupUnifiedRowsByMed(unifiedRows, profile, window.columns);
  var groups = displayGroupsForWindow(profile, window);
  var hiddenCount = countHiddenGroups(allGroups.filter(groupMatchesCategoryFilter));
  var filtro = document.getElementById('med-pharm-filtro');
  renderFilterSelect(filtro);
  updateMedPharmHiddenToolbar(hiddenCount);
  var card = document.querySelector('.med-pharm-profile-card');
  var listHead = document.querySelector('.med-pharm-list-head');
  if (!window.columns.length) {
    if (card) card.classList.remove('med-pharm-has-grid');
    if (listHead) listHead.style.display = '';
    list.className = 'med-pharm-list-body';
    list.innerHTML =
      '<div class="med-pharm-empty">' +
      '<p class="med-pharm-empty-title">Sin datos para ' +
      esc(window.label) +
      '</p>' +
      '<p class="med-pharm-empty-lead">Importa la matriz SOME del hospital o procesa <strong>Receta</strong> en la pestaña Manejo actual.</p>' +
      '<button type="button" class="btn-generate" data-med-pharm-open-paste>Importar mes SOME</button>' +
      '</div>';
    list.querySelector('[data-med-pharm-open-paste]').addEventListener('click', openMedPharmPasteModal);
    return;
  }
  if (!groups.length) {
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
  renderMedPharmSummaryList(list, groups, window, profile);
}

function buildMedGroupModalSubtitle(profile, window, variantRows) {
  var rowKeys = variantRows.map(function (r) {
    return r.rowKey;
  });
  var stats = adherenceStatsForRowKeys(profile, rowKeys, window.columns);
  var parts = [window.label];
  if (variantRows.length > 1) {
    parts.push(variantRows.length + ' regímenes (dosis distintas)');
  } else {
    var row = variantRows[0];
    if (row.dosis) parts.push(row.dosis);
    parts.push(formatFreqShort(row.freq) + ' · ' + formatViaShort(row.via));
  }
  parts.push(stats.effective + ' d efectivos');
  return parts.join(' · ');
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

function renderMedPharmSummaryList(listEl, groups, window, profile) {
  var columns = window.columns;
  var rowKeysAttr = function (group) {
    return group.rowKeys.join('\t');
  };
  listEl.innerHTML = '';
  groups.forEach(function (group) {
    var current = group.currentVariant;
    var stats = adherenceStatsForRowKeys(profile, group.rowKeys, columns);
    var missCls = stats.missed > 0 ? ' has-misses' : '';
    var isHidden = isMedPharmGroupHidden(group);
    var multiRegimen = group.variants.length > 1;
    var wrap = document.createElement('div');
    wrap.className = 'med-pharm-row' + (isHidden ? ' med-pharm-row--hidden' : '');
    var summary = document.createElement('div');
    summary.className = 'med-pharm-row-summary' + missCls;

    summary.title = medGroupListTooltip(group);

    var main = document.createElement('div');
    main.className = 'med-pharm-main med-pharm-main--compact';
    var nameRow = document.createElement('div');
    nameRow.className = 'med-pharm-name-row';
    var nameEl = document.createElement('div');
    nameEl.className = 'med-pharm-name';
    nameEl.textContent = group.med || '';
    nameRow.appendChild(nameEl);
    var catEl = document.createElement('span');
    catEl.className = 'med-pharm-cat-badge';
    catEl.textContent = rowSomePharmCategory(current);
    nameRow.appendChild(catEl);
    if (multiRegimen) {
      var regEl = document.createElement('span');
      regEl.className = 'med-pharm-regimen-badge';
      regEl.textContent = '×' + group.variants.length;
      regEl.title = group.variants.length + ' regímenes — ver en Días';
      nameRow.appendChild(regEl);
    }
    var adhEl = document.createElement('div');
    adhEl.className = 'med-cell-adh';
    adhEl.innerHTML = buildAdhTriggerHtmlForGroup(group, stats, columns, profile, window.label);
    nameRow.appendChild(adhEl);
    main.appendChild(nameRow);
    summary.appendChild(main);

    var actions = document.createElement('div');
    actions.className = 'med-pharm-row-actions';
    var btnDays = document.createElement('button');
    btnDays.type = 'button';
    btnDays.className = 'med-pharm-btn-dias';
    btnDays.textContent = 'Días';
    btnDays.title = multiRegimen
      ? 'Ver calendario con todas las dosis de este medicamento'
      : 'Ver calendario del medicamento';
    btnDays.addEventListener('click', function (e) {
      e.stopPropagation();
      openMedPharmMedGroupModal(group.medGroupKey);
    });
    actions.appendChild(btnDays);
    var btnVis = document.createElement('button');
    btnVis.type = 'button';
    btnVis.className = 'med-pharm-btn-visibility';
    if (isHidden) {
      btnVis.textContent = '↩';
      btnVis.setAttribute('aria-label', 'Mostrar en la lista');
      btnVis.title = 'Volver a mostrar en la lista y calendario';
      btnVis.dataset.medPharmUnhideGroup = rowKeysAttr(group);
    } else {
      btnVis.textContent = '×';
      btnVis.setAttribute('aria-label', 'Ocultar de la lista');
      btnVis.title = 'Ocultar de la vista (se conserva en el mes importado)';
      btnVis.dataset.medPharmHideGroup = rowKeysAttr(group);
      btnVis.classList.add('med-pharm-btn-visibility--icon');
    }
    actions.appendChild(btnVis);
    summary.appendChild(actions);

    var freqEl = document.createElement('span');
    freqEl.className = 'med-pharm-freq-cell';
    freqEl.textContent = formatFreqShort(current.freq);
    summary.appendChild(freqEl);

    var viaEl = document.createElement('span');
    viaEl.className = 'med-pharm-via-cell';
    viaEl.textContent = formatViaListAbbrev(current.via);
    viaEl.title = formatViaShort(current.via);
    summary.appendChild(viaEl);

    wrap.appendChild(summary);
    listEl.appendChild(wrap);
  });
  wireMedPharmAdhHoverPanels(listEl);
}

export function openMedPharmMedGroupModal(medGroupKey) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var profile = getProfile(pid) || { months: {} };
  var window = getViewWindow(pid);
  if (!window.columns.length) return;
  var unified = unifyRowsForWindow(profile, window.columns);
  var variantRows = rowsForMedGroup(unified, medGroupKey);
  if (!variantRows.length) return;
  var body = document.getElementById('med-pharm-modal-one-body');
  var title = document.getElementById('med-pharm-modal-one-title');
  var sub = document.getElementById('med-pharm-modal-one-sub');
  if (!body) return;
  if (title) title.textContent = variantRows[0].med || 'Medicamento';
  if (sub) sub.textContent = buildMedGroupModalSubtitle(profile, window, variantRows);
  mountSomeGrid(window, variantRows, profile, body);
  openMedPharmModal('med-pharm-modal-one');
  openMedGroupKey = medGroupKey;
}

export function openMedPharmFullModal() {
  var pid = rt.getActiveId();
  if (!pid) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var profile = getProfile(pid) || { months: {} };
  var window = getViewWindow(pid);
  if (!window.columns.length) {
    rt.showToast('No hay datos del mes para mostrar', 'error');
    return;
  }
  var unified = unifyRowsForWindow(profile, window.columns);
  var rows = displayRowsForWindow(profile, window);
  if (!rows.length) {
    var hiddenN = countHiddenInCategoryFilter(unified);
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
    title.textContent = 'Calendario farmacoterapéutico — ' + window.label;
  }
  if (sub) {
    var filtLabel = listFilter === 'TODOS' ? 'Todos los medicamentos' : 'Filtro: ' + listFilter;
    sub.textContent = filtLabel + ' · ' + rows.length + ' filas · formato matriz SOME';
    sub.hidden = false;
  }
  openMedPharmModal('med-pharm-modal-full');
  mountSomeGrid(window, rows, profile, body);
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
