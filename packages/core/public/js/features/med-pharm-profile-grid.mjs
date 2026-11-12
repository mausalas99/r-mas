import { getMedPharmProfileByPatient, persistClinicalState } from '../app-state.mjs';
import { formatFreqShort, formatViaShort } from '../med-pharm-profile-core.mjs';
import {
  unifyRowsForWindow,
  rowsForMedGroup,
  toggleNotAdminAtColumn,
  makeColumn,
  adherenceStatsForRowKeys,
  cellValueAtColumn,
} from '../med-pharm-view-window.mjs';
import { medPharmProfileBridge } from './med-pharm-profile-bridge.mjs';
import {
  mp,
  getProfile,
  getViewWindow,
  todayParts,
  MONTH_ABBR,
  displayRowsForWindow,
  notAdminAtColumn,
} from './med-pharm-profile-state.mjs';
import {
  buildAdhTriggerModel,
  wireMedPharmAdhHoverPanels,
  adherenceStatsForWindow,
} from './med-pharm-profile-adh.mjs';
import { drawSomeGrid } from './med-pharm-profile-view.jsx';

function isTodayCol(today, col) {
  return today.year === col.year && today.monthIndex === col.monthIndex && today.day === col.day;
}

function dayHeaderCells(columns, from, to, today) {
  var cells = [];
  var prevMonthKey = from > 0 ? columns[from - 1].monthKey : '';
  for (var i = from; i < to; i += 1) {
    var col = columns[i];
    var cls = 'day-hdr' + (isTodayCol(today, col) ? ' today-col' : '');
    var label = '';
    if (col.monthKey !== prevMonthKey) {
      cls += ' day-hdr-month' + (i > 0 ? ' day-hdr-month-boundary' : '');
      label = MONTH_ABBR[col.monthIndex];
      prevMonthKey = col.monthKey;
    }
    cells.push({ cls: cls, label: label, day: String(col.day).padStart(2, '0') });
  }
  return cells;
}

function dayCellModel(profile, row, column, monthBoundary, today) {
  var cls = 'day-pad' + (isTodayCol(today, column) ? ' today-col' : '');
  if (monthBoundary) cls += ' day-pad-month-boundary';
  var v = cellValueAtColumn(profile, row.rowKey, column);
  if (!(v > 0)) return { cls: cls, attrs: null, x2: false };
  cls += ' indicated';
  if (notAdminAtColumn(profile, row.rowKey, column)) cls += ' not-admin';
  return {
    cls: cls,
    x2: v > 1,
    attrs: {
      'data-row-key': row.rowKey,
      'data-year': String(column.year),
      'data-month': String(column.monthIndex),
      'data-day': String(column.day),
      title: 'Día ' + column.day + ' ' + MONTH_ABBR[column.monthIndex] + ' — clic para marcar no administrado',
    },
  };
}

function onGridDayClick(rowKey, year, monthIndex, day) {
  var pid = mp.rt.getActiveId();
  if (!pid) return;
  var col = makeColumn(year, monthIndex, day);
  var profile = getProfile(pid) || { months: {} };
  profile = toggleNotAdminAtColumn(profile, rowKey, col);
  getMedPharmProfileByPatient()[pid] = profile;
  persistClinicalState();
  refreshOpenMedPharmGrids();
  medPharmProfileBridge.renderMedPharmProfilePanel();
}

function refreshOpenMedPharmGrids() {
  var pid = mp.rt.getActiveId();
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
  if (oneEl && oneEl.classList.contains('open') && mp.openMedGroupKey) {
    var unified = unifyRowsForWindow(profile, window.columns);
    var variantRows = rowsForMedGroup(unified, mp.openMedGroupKey);
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

export function mountSomeGrid(window, rows, profile, container) {
  if (!container) return;
  drawSomeGrid(container, {
    model: buildSomeGridModel(window, rows, profile, todayParts()),
    onDayClick: onGridDayClick,
  });
  wireMedPharmAdhHoverPanels(container);
}

function dayCellsForSlice(profile, row, columns, from, to, today) {
  var cells = [];
  var prevMonthKey = from > 0 ? columns[from - 1].monthKey : '';
  for (var i = from; i < to; i += 1) {
    var col = columns[i];
    var boundary = col.monthKey !== prevMonthKey && i > 0;
    cells.push(dayCellModel(profile, row, col, boundary, today));
    prevMonthKey = col.monthKey;
  }
  return cells;
}

/** Plain model of the SOME grid; `today` is {year, monthIndex, day} (the caller reads the clock). */
export function buildSomeGridModel(window, rows, profile, today) {
  var columns = window.columns;
  var total = columns.length;
  var splitAt = window.splitAt;
  var first = Math.min(splitAt, total);
  var hdr1 = dayHeaderCells(columns, 0, first, today);
  var hdr2 = total > splitAt ? dayHeaderCells(columns, splitAt, total, today) : [];
  return {
    splitAt: splitAt,
    hdr1: { cells: hdr1, pad: Math.max(0, splitAt - hdr1.length) },
    hdr2: { cells: hdr2, pad: Math.max(0, splitAt - hdr2.length) },
    rows: rows.map(function (row, rowIndex) {
      var stats = adherenceStatsForWindow(profile, row.rowKey, columns);
      var missCls = stats.missed > 0 ? ' has-misses' : '';
      var toneCls = rowIndex % 2 === 1 ? ' med-block-b' : ' med-block-a';
      var cells1 = dayCellsForSlice(profile, row, columns, 0, first, today);
      var cells2 = total > splitAt ? dayCellsForSlice(profile, row, columns, splitAt, total, today) : [];
      return {
        cls1: 'day-band' + missCls + (rowIndex > 0 ? ' med-row-block-start' : '') + toneCls,
        cls2: 'day-band med-row-block-end' + missCls + toneCls,
        med: row.med,
        adh: buildAdhTriggerModel(row, stats, columns, profile, window.label),
        dosis: row.dosis || '',
        freq: formatFreqShort(row.freq),
        via: formatViaShort(row.via),
        cells1: cells1,
        pad1: Math.max(0, splitAt - cells1.length),
        cells2: cells2,
        pad2: Math.max(0, splitAt - cells2.length),
      };
    }),
  };
}

export function buildMedGroupModalSubtitle(profile, window, variantRows) {
  var rowKeys = variantRows.map(function (r) { return r.rowKey; });
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
