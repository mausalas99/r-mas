import { captureScroll } from './tend-group-chart-helpers.mjs';
import {
  getSetTrendValueForSeries,
  buildSectionTableModel,
  formatTrendColumnHeader,
  formatTendSeriesLabel,
} from './tend-core.mjs';
import {
  readGroupTableHidden,
  writeGroupTableHidden,
  readGroupTableByDay,
  writeGroupTableByDay,
  seriesColorKey,
} from './tend-prefs.mjs';
import { formatTrendDisplayValue, colKeyForSet } from './tend-group-chart-helpers.mjs';
import {
  isCitoquimInterpretacionResLabChunk,
  citoquimInterpretacionBody_,
} from './labs-citoquimico-interpret.mjs';
import {
  collectEventMarkersForPatient,
  dayKeyFromLabSet,
  eventMarkerTagSpecs,
  eventMarkerTagViews,
} from './features/tendencias-event-context.mjs';
import { renderAnalytePickerBar } from './tend-group-analyte-picker.mjs';
import { drawGroupTable, drawDayToggle, drawHiddenBar } from './features/tend-group-table-view.jsx';

/** Identidad de fila estable entre secciones (evita choques de fieldKey homónimos). */
export function rowKey(row) {
  return seriesColorKey(row.sectionKey, row.fieldKey);
}

/** '▼' below range, '▲' above, '' in range or unknown. Arrows travel with copied text. */
function abnormalDir(deps, set, row, val, historyDesc) {
  if (val == null || !isFinite(val)) return '';
  var ref =
    deps.tendRefFromLabSet(set, row.sectionKey, row.fieldKey) ||
    deps.tendRefForSeries(historyDesc, row.sectionKey, row.fieldKey, set);
  if (!ref) return '';
  return val < ref[0] ? '▼' : val > ref[1] ? '▲' : '';
}

/** Reference text for a row: latest draw that has a range. '' when none. */
function rowRefText(deps, row, raw, historyDesc) {
  for (var i = raw.columns.length - 1; i >= 0; i--) {
    var set = row.refSets ? row.refSets[i] : raw.columns[i];
    var ref =
      deps.tendRefFromLabSet(set, row.sectionKey, row.fieldKey) ||
      deps.tendRefForSeries(historyDesc, row.sectionKey, row.fieldKey, set);
    if (ref) return formatTrendDisplayValue(ref[0]) + ' – ' + formatTrendDisplayValue(ref[1]);
  }
  return '';
}

function lastVisibleCol(raw, hidden) {
  for (var i = raw.columns.length - 1; i >= 0; i--) {
    if (hidden.cols.indexOf(colKeyForSet(raw.columns[i])) < 0) return i;
  }
  return -1;
}

export function formatCellValue(val, dir) {
  var t = formatTrendDisplayValue(val);
  return dir && t !== '—' ? dir + ' ' + t : t;
}

function columnHeader(set, columns) {
  return formatTrendColumnHeader(set, columns, { showTime: false });
}

function legendLabelForSpec(deps, sectionKey, spec) {
  var sk = spec.sectionKey || sectionKey;
  var unit = deps.tendUnitForSeries(sk, spec.fieldKey);
  return formatTendSeriesLabel(spec.cardTitle || spec.fieldKey, spec.fieldKey, unit).name;
}

function hiddenColLabel(raw, ck) {
  for (var i = 0; i < raw.columns.length; i++) {
    if (colKeyForSet(raw.columns[i]) === ck) {
      return columnHeader(raw.columns[i], raw.columns);
    }
  }
  // Toma individual fusionada por "Agrupar por día": su columna ya no existe, pero el key sigue oculto.
  if (ck.indexOf('t:') === 0) {
    var ms = Number(ck.slice(2));
    var d = new Date(ms);
    if (isFinite(ms) && !isNaN(d.getTime())) {
      return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    }
  }
  return ck;
}

function buildHiddenItems(deps, hidden, raw, specsByRowKey) {
  var items = [];
  hidden.cols.forEach(function (ck) {
    items.push({ kind: 'col', key: ck, label: hiddenColLabel(raw, ck) });
  });
  hidden.rows.forEach(function (rk) {
    var sp = specsByRowKey[rk];
    items.push({ kind: 'row', key: rk, label: sp ? legendLabelForSpec(deps, sp.sectionKey, sp) : rk });
  });
  return items;
}

/** null when nothing is hidden (bar stays empty and hidden). */
export function buildHiddenBarModel(deps, state, hidden, raw, specsByRowKey) {
  var items = buildHiddenItems(deps, hidden, raw, specsByRowKey);
  return items.length ? { open: !!state.tableHiddenMenuOpen, count: items.length, items: items } : null;
}

function filterHiddenRows(ev) {
  var q = ev.currentTarget.value.trim().toLowerCase();
  ev.currentTarget.closest('.tend-hidden-panel').querySelectorAll('.tend-hidden-row').forEach(function (row) {
    row.style.display = row.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none';
  });
}

function hiddenBarHandlers(ctx) {
  return {
    onTrigger: function (ev) {
      ev.stopPropagation();
      ctx.state.tableHiddenMenuOpen = !ctx.state.tableHiddenMenuOpen;
      renderTableHiddenBar(ctx);
    },
    onFilter: filterHiddenRows,
    onShowAll: function (ev) {
      ev.stopPropagation();
      writeGroupTableHidden(ctx.state.patientId, ctx.sectionKey, { rows: [], cols: [] });
      ctx.state.tableHiddenMenuOpen = false;
      ctx.renderTable(ctx.sectionKey);
    },
    onRestore: function (ev, kind, key) {
      ev.stopPropagation();
      var list = kind === 'col' ? 'cols' : 'rows';
      var h = readGroupTableHidden(ctx.state.patientId, ctx.sectionKey);
      h[list] = h[list].filter(function (k) {
        return k !== key;
      });
      writeGroupTableHidden(ctx.state.patientId, ctx.sectionKey, h);
      ctx.renderTable(ctx.sectionKey);
    },
  };
}

export function renderTableHiddenBar(ctx) {
  var wrap = ctx.wrap;
  var bar = wrap.querySelector('#tend-group-table-hidden-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'tend-group-table-hidden-bar';
    bar.className = 'tend-group-table-hidden-bar';
    wrap.insertBefore(bar, wrap.firstChild);
  }
  var m = buildHiddenBarModel(ctx.deps, ctx.state, ctx.hidden, ctx.raw, ctx.specsByRowKey);
  if (!m) {
    bar.style.display = 'none';
    drawHiddenBar(bar, null);
    return;
  }
  bar.style.display = '';
  bar.className = 'tend-group-table-hidden-bar' + (m.open ? ' is-open' : '');
  drawHiddenBar(bar, m, hiddenBarHandlers(ctx));
}

/** Texto de "INTERPRETACIÓN CITOQUÍMICO:" pegado junto a esa toma de LCR, si existe. */
function lcrInterpretationForSet(set) {
  var resLabs = (set && set.resLabs) || [];
  for (var i = 0; i < resLabs.length; i++) {
    if (isCitoquimInterpretacionResLabChunk(resLabs[i])) {
      return citoquimInterpretacionBody_(resLabs[i]);
    }
  }
  return '';
}

/** Fila "Interpretación" al pie de la tabla de LCR, una por columna/toma. null si no aplica. */
function interpretationRowTexts(sectionKey, columns) {
  if (sectionKey !== 'LCR') return null;
  var texts = (columns || []).map(lcrInterpretationForSet);
  return texts.some(Boolean) ? texts : null;
}

function buildTableExportModel(deps, state, rawModel, hidden, markersByDay) {
  var hiddenRows = Object.create(null);
  (hidden.rows || []).forEach(function (rk) {
    hiddenRows[rk] = true;
  });
  var hiddenCols = Object.create(null);
  (hidden.cols || []).forEach(function (ck) {
    hiddenCols[ck] = true;
  });
  var columns = rawModel.columns.map(function (set) {
    var ck = colKeyForSet(set);
    var dayKey = dayKeyFromLabSet(set);
    var bucket = dayKey && markersByDay && markersByDay.has(dayKey) ? markersByDay.get(dayKey) : null;
    return {
      header: columnHeader(set, rawModel.columns),
      colKey: ck,
      hidden: !!hiddenCols[ck],
      eventTags: eventMarkerTagSpecs(bucket),
    };
  });
  var rows = rawModel.rows.map(function (row) {
    var rk = rowKey(row);
    var cells = rawModel.columns.map(function (set, ci) {
      var val = row.values[ci];
      var refSet = row.refSets ? row.refSets[ci] : set;
      var dir = abnormalDir(deps, refSet, row, val, state.historyDesc);
      return { text: formatCellValue(val, dir), abnormal: !!dir };
    });
    return {
      label: row.label,
      fieldKey: row.fieldKey,
      hidden: !!hiddenRows[rk],
      cells: cells,
    };
  });
  var interpTexts = interpretationRowTexts(state.sectionKey, rawModel.columns);
  if (interpTexts) {
    rows.push({
      label: 'Interpretación',
      fieldKey: '__interpretation',
      hidden: false,
      cells: interpTexts.map(function (t) {
        return { text: t || '—', abnormal: false };
      }),
    });
  }
  return { columns: columns, rows: rows };
}

function rowDisplayLabel(deps, state, row, specsByRowKey) {
  var spRow = specsByRowKey[rowKey(row)];
  var rowUnit = deps.tendUnitForSeries(row.sectionKey, row.fieldKey);
  var rowDisp = spRow
    ? formatTendSeriesLabel(spRow.cardTitle || row.fieldKey, row.fieldKey, rowUnit)
    : formatTendSeriesLabel(row.label, row.fieldKey, row.unit || rowUnit);
  return rowDisp.unit && rowDisp.unit !== '%'
    ? rowDisp.name + ' (' + rowDisp.unit + ')'
    : rowDisp.name;
}

/** Number of out-of-range values in the last visible draw (legend). */
function legendOutCount(model) {
  var ci = -1;
  model.columns.forEach(function (c, i) {
    if (!c.hidden) ci = i;
  });
  return ci < 0
    ? 0
    : model.rows.filter(function (r) {
        return !r.hidden && r.cells[ci] && r.cells[ci].abnormal;
      }).length;
}

/** Plain model the Preact table view draws (labels, flags, texts; no deps, no DOM). */
export function buildGroupTableViewModel(deps, state, raw, hidden, byDay, specsByRowKey, markersByDay, exportModel) {
  var lastCi = lastVisibleCol(raw, hidden);
  var cols = raw.columns.map(function (set, ci) {
    var ck = colKeyForSet(set);
    var dayKey = dayKeyFromLabSet(set);
    return {
      key: ck,
      label: columnHeader(set, raw.columns),
      hidden: hidden.cols.indexOf(ck) >= 0,
      last: ci === lastCi,
      tags: dayKey && markersByDay && markersByDay.has(dayKey) ? eventMarkerTagViews(markersByDay.get(dayKey)) : [],
    };
  });
  var multiSection = raw.rows.some(function (r) {
    return r.sectionKey !== raw.rows[0].sectionKey;
  });
  var curSection = null;
  var rows = raw.rows.map(function (row) {
    var section = null;
    if (multiSection && row.sectionKey !== curSection) {
      curSection = row.sectionKey;
      section = (deps.getSectionLabel && deps.getSectionLabel(curSection)) || curSection;
    }
    var rk = rowKey(row);
    return {
      section: section,
      key: rk,
      label: rowDisplayLabel(deps, state, row, specsByRowKey),
      hidden: hidden.rows.indexOf(rk) >= 0,
      ref: rowRefText(deps, row, raw, state.historyDesc),
      cells: raw.columns.map(function (set, ci) {
        var val = row.values[ci];
        var dir = abnormalDir(deps, row.refSets ? row.refSets[ci] : set, row, val, state.historyDesc);
        return { text: formatCellValue(val, dir), dir: dir, hidden: cols[ci].hidden, last: ci === lastCi };
      }),
    };
  });
  var interpTexts = interpretationRowTexts(state.sectionKey, raw.columns);
  return {
    byDay: byDay,
    dynamicMode: !!state.dynamicMode,
    empty: false,
    cols: cols,
    rows: rows,
    interp: interpTexts
      ? interpTexts.map(function (t, ci) {
          return { hidden: cols[ci].hidden, text: t || '—' };
        })
      : null,
    outCount: legendOutCount(exportModel),
  };
}

function toggleHiddenList(list, key, checked) {
  var idx = list.indexOf(key);
  if (checked) {
    if (idx < 0) list.push(key);
  } else if (idx >= 0) {
    list.splice(idx, 1);
  }
}

function tableHandlers(state, sectionKey, renderTable) {
  function toggler(list) {
    return function (key, hide) {
      var h = readGroupTableHidden(state.patientId, sectionKey);
      toggleHiddenList(h[list], key, hide);
      writeGroupTableHidden(state.patientId, sectionKey, h);
      renderTable(sectionKey);
    };
  }
  return {
    onToggleCol: toggler('cols'),
    onToggleRow: toggler('rows'),
    onByDay: function (checked) {
      writeGroupTableByDay(state.patientId, sectionKey, checked);
      renderTable(sectionKey);
    },
  };
}

/** Especificaciones de todas las filas de la tabla: las de la sección primaria + las agregadas de otras. */
function tableRowSpecs(state) {
  var primary = Object.keys(state.specsByField).map(function (fk) {
    return state.specsByField[fk];
  });
  return primary.concat(state.tableExtraSpecs || []);
}

function buildSpecsByRowKey(specs) {
  var map = Object.create(null);
  specs.forEach(function (sp) {
    map[seriesColorKey(sp.sectionKey, sp.fieldKey)] = sp;
  });
  return map;
}

export function renderGroupTable(deps, state, sectionKey, renderTable, opts) {
  var wrapEl = document.getElementById((opts && opts.wrapId) || 'tend-group-table-wrap');
  var restore = wrapEl ? captureScroll(wrapEl) : null;
  renderGroupTableInner(deps, state, sectionKey, renderTable, opts);
  if (restore) restore();
}

function renderGroupTableInner(deps, state, sectionKey, renderTable, opts) {
  var wrap = document.getElementById((opts && opts.wrapId) || 'tend-group-table-wrap');
  if (!wrap) return;
  var hidden = readGroupTableHidden(state.patientId, sectionKey);
  var byDay = readGroupTableByDay(state.patientId, sectionKey);
  var allSpecs = tableRowSpecs(state);
  var specsByRowKey = buildSpecsByRowKey(allSpecs);
  var raw = buildSectionTableModel(
    state.historyAsc,
    allSpecs,
    function (set, sp) {
      return getSetTrendValueForSeries(set, sp.sectionKey, sp.fieldKey);
    },
    { groupByDay: byDay }
  );
  var markersByDay = collectEventMarkersForPatient(state.patientId);
  state.tableModel = buildTableExportModel(deps, state, raw, hidden, markersByDay);

  var handlers = tableHandlers(state, sectionKey, renderTable);
  // Pivot pane keeps the toggle in its range row (slot), other tables keep it above the table.
  var daySlot = opts && opts.daymodeSlotId ? document.getElementById(opts.daymodeSlotId) : null;
  if (daySlot) drawDayToggle(daySlot, byDay, handlers.onByDay);
  var model = buildGroupTableViewModel(deps, state, raw, hidden, byDay, specsByRowKey, markersByDay, state.tableModel);
  model.empty = !allSpecs.length;
  drawGroupTable(wrap, model, !!daySlot, handlers);
  renderTableHiddenBar({
    wrap: wrap,
    sectionKey: sectionKey,
    hidden: hidden,
    raw: raw,
    deps: deps,
    state: state,
    renderTable: renderTable,
    specsByRowKey: specsByRowKey,
  });
  if (state.dynamicMode) {
    renderAnalytePickerBar({
      slot: wrap.querySelector('#tend-group-analyte-picker-slot'),
      deps: deps,
      state: state,
      sectionKey: sectionKey,
      renderTable: renderTable,
    });
  }
}

export function createTableExportModel(deps, state, sectionKey, rawModel, hidden, markersByDay) {
  return buildTableExportModel(deps, state, rawModel, hidden, markersByDay);
}

export function tableColumnHeader(set, columns) {
  return columnHeader(set, columns);
}

export function tableLegendLabelForSpec(deps, sectionKey, spec) {
  return legendLabelForSpec(deps, sectionKey, spec);
}
