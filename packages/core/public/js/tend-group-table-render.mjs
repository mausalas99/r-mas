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
  buildEventMarkerTagsHtml,
  eventMarkerTagSpecs,
} from './features/tendencias-event-context.mjs';
import { renderAnalytePickerBar } from './tend-group-analyte-picker.mjs';

/** Identidad de fila estable entre secciones (evita choques de fieldKey homónimos). */
export function rowKey(row) {
  return seriesColorKey(row.sectionKey, row.fieldKey);
}

function isAbnormal(deps, set, row, val, historyDesc) {
  if (val == null || !isFinite(val)) return false;
  var ref =
    deps.tendRefFromLabSet(set, row.sectionKey, row.fieldKey) ||
    deps.tendRefForSeries(historyDesc, row.sectionKey, row.fieldKey, set);
  if (!ref) return false;
  return val < ref[0] || val > ref[1];
}

export function formatCellValue(val, abnormal) {
  var t = formatTrendDisplayValue(val);
  return abnormal && t !== '—' ? t + '*' : t;
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

function buildHiddenChips(deps, state, hidden, raw, specsByRowKey) {
  var esc = deps.esc;
  var chips = [];
  hidden.cols.forEach(function (ck) {
    chips.push(
      '<button type="button" class="tend-hidden-chip tend-group-restore-chip" data-restore-col="' +
        esc(ck) +
        '">' +
        esc(hiddenColLabel(raw, ck)) +
        ' <span aria-hidden="true">×</span></button>'
    );
  });
  hidden.rows.forEach(function (rk) {
    var sp = specsByRowKey[rk];
    var lab = sp ? legendLabelForSpec(deps, sp.sectionKey, sp) : rk;
    chips.push(
      '<button type="button" class="tend-hidden-chip tend-group-restore-chip" data-restore-row="' +
        esc(rk) +
        '">' +
        esc(lab) +
        ' <span aria-hidden="true">×</span></button>'
    );
  });
  return chips;
}

function wireHiddenBarActions(bar, ctx) {
  bar.querySelector('.tend-group-hidden-bar-toggle').onclick = function (ev) {
    ev.stopPropagation();
    ctx.state.tableHiddenBarCollapsed = !ctx.state.tableHiddenBarCollapsed;
    renderTableHiddenBar(ctx);
  };
  bar.querySelector('.tend-group-show-all-btn').onclick = function (ev) {
    ev.stopPropagation();
    writeGroupTableHidden(ctx.state.patientId, ctx.sectionKey, { rows: [], cols: [] });
    ctx.state.tableHiddenBarCollapsed = false;
    ctx.renderTable(ctx.sectionKey);
  };
  bar.querySelectorAll('[data-restore-col]').forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.stopPropagation();
      var ck = btn.getAttribute('data-restore-col');
      var h = readGroupTableHidden(ctx.state.patientId, ctx.sectionKey);
      h.cols = h.cols.filter(function (c) {
        return c !== ck;
      });
      writeGroupTableHidden(ctx.state.patientId, ctx.sectionKey, h);
      ctx.renderTable(ctx.sectionKey);
    };
  });
  bar.querySelectorAll('[data-restore-row]').forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.stopPropagation();
      var rk = btn.getAttribute('data-restore-row');
      var h = readGroupTableHidden(ctx.state.patientId, ctx.sectionKey);
      h.rows = h.rows.filter(function (r) {
        return r !== rk;
      });
      writeGroupTableHidden(ctx.state.patientId, ctx.sectionKey, h);
      ctx.renderTable(ctx.sectionKey);
    };
  });
}

export function renderTableHiddenBar(ctx) {
  var wrap = ctx.wrap;
  var hidden = ctx.hidden;
  var raw = ctx.raw;
  var bar = wrap.querySelector('#tend-group-table-hidden-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'tend-group-table-hidden-bar';
    bar.className = 'tend-group-table-hidden-bar';
    wrap.insertBefore(bar, wrap.firstChild);
  }
  var chips = buildHiddenChips(ctx.deps, ctx.state, hidden, raw, ctx.specsByRowKey);
  if (!chips.length) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }
  var count = hidden.cols.length + hidden.rows.length;
  var collapsed = !!ctx.state.tableHiddenBarCollapsed;
  bar.style.display = '';
  bar.className = 'tend-group-table-hidden-bar' + (collapsed ? ' is-collapsed' : '');
  bar.innerHTML =
    '<div class="tend-group-hidden-bar-head">' +
    '<button type="button" class="tend-group-hidden-bar-toggle" aria-expanded="' +
    (collapsed ? 'false' : 'true') +
    '">' +
    '<span class="tend-section-chevron" aria-hidden="true">' +
    (collapsed ? '▶' : '▼') +
    '</span>' +
    '<span class="tend-group-hidden-label">Ocultos en copia (' +
    count +
    ')</span></button>' +
    '<button type="button" class="tend-toolbar-btn tend-group-show-all-btn">Mostrar todo</button>' +
    '</div>' +
    '<div class="tend-group-hidden-bar-body' +
    (collapsed ? ' tend-section-body--collapsed' : '') +
    '">' +
    chips.join('') +
    '</div>';
  wireHiddenBarActions(bar, ctx);
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
      var ab = isAbnormal(deps, refSet, row, val, state.historyDesc);
      return { text: formatCellValue(val, ab), abnormal: ab };
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

function buildTableHeadHtml(esc, raw, hidden, markersByDay) {
  var html = ['<thead><tr><th>Analito</th>'];
  raw.columns.forEach(function (set) {
    var ck = colKeyForSet(set);
    var colHidden = hidden.cols.indexOf(ck) >= 0;
    var colLabel = columnHeader(set, raw.columns);
    var dayKey = dayKeyFromLabSet(set);
    var tagsHtml =
      dayKey && markersByDay && markersByDay.has(dayKey)
        ? buildEventMarkerTagsHtml(markersByDay.get(dayKey))
        : '';
    html.push(
      '<th class="' +
        (colHidden ? 'is-hidden' : '') +
        '"><div class="tend-group-col-head">' +
        tagsHtml +
        '<label class="tend-group-col-toggle"><input type="checkbox" data-col-key="' +
        esc(ck) +
        '"' +
        (colHidden ? ' checked' : '') +
        ' aria-label="Ocultar columna"> ' +
        esc(colLabel) +
        '</label></div></th>'
    );
  });
  html.push('</tr></thead>');
  return html;
}

/** Hidden rows leave the table (same `is-hidden` as date columns). */
export function tableHiddenRowClass(rowHidden) {
  return rowHidden ? 'is-hidden' : '';
}

function buildTableBodyHtml(deps, esc, state, raw, hidden, specsByRowKey) {
  var html = ['<tbody>'];
  raw.rows.forEach(function (row) {
    var rk = rowKey(row);
    var rowHidden = hidden.rows.indexOf(rk) >= 0;
    var rowLabel = rowDisplayLabel(deps, state, row, specsByRowKey);
    html.push(
      '<tr data-field="' +
        esc(rk) +
        '" class="' +
        tableHiddenRowClass(rowHidden) +
        '"><td><label class="tend-group-row-toggle"><input type="checkbox" data-field-key="' +
        esc(rk) +
        '"' +
        (rowHidden ? ' checked' : '') +
        ' aria-label="Ocultar fila"> ' +
        esc(rowLabel) +
        '</label></td>'
    );
    raw.columns.forEach(function (set, ci) {
      var ck = colKeyForSet(set);
      var colHidden = hidden.cols.indexOf(ck) >= 0;
      var val = row.values[ci];
      var refSet = row.refSets ? row.refSets[ci] : set;
      var ab = isAbnormal(deps, refSet, row, val, state.historyDesc);
      html.push(
        '<td class="' +
          (colHidden ? 'is-hidden' : '') +
          (ab ? ' tend-abnormal' : '') +
          '">' +
          esc(formatCellValue(val, ab)) +
          '</td>'
      );
    });
    html.push('</tr>');
  });
  var interpTexts = interpretationRowTexts(state.sectionKey, raw.columns);
  if (interpTexts) {
    html.push('<tr class="tend-group-table-interp-row"><td><em>Interpretación</em></td>');
    raw.columns.forEach(function (set, ci) {
      var ck = colKeyForSet(set);
      var colHidden = hidden.cols.indexOf(ck) >= 0;
      html.push(
        '<td class="' +
          (colHidden ? 'is-hidden' : '') +
          '" style="white-space:normal;text-align:left;font-size:12px;font-style:italic;">' +
          esc(interpTexts[ci] || '—') +
          '</td>'
      );
    });
    html.push('</tr>');
  }
  html.push('</tbody>');
  return html;
}

function toggleHiddenList(list, key, checked) {
  var idx = list.indexOf(key);
  if (checked) {
    if (idx < 0) list.push(key);
  } else if (idx >= 0) {
    list.splice(idx, 1);
  }
}

function wireTableToggles(wrap, deps, state, sectionKey, renderTable) {
  wrap.querySelectorAll('input[data-col-key]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      var h = readGroupTableHidden(state.patientId, sectionKey);
      toggleHiddenList(h.cols, inp.getAttribute('data-col-key'), inp.checked);
      writeGroupTableHidden(state.patientId, sectionKey, h);
      renderTable(sectionKey);
    });
  });
  wrap.querySelectorAll('input[data-field-key]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      var h = readGroupTableHidden(state.patientId, sectionKey);
      toggleHiddenList(h.rows, inp.getAttribute('data-field-key'), inp.checked);
      writeGroupTableHidden(state.patientId, sectionKey, h);
      renderTable(sectionKey);
    });
  });
}

function buildDayModeToggleHtml(byDay) {
  return (
    '<label class="tend-group-daymode-toggle"><input type="checkbox" id="tend-group-daymode-input"' +
    (byDay ? ' checked' : '') +
    '> Agrupar por día</label>'
  );
}

function wireDayModeToggle(wrap, state, sectionKey, renderTable) {
  var inp = wrap.querySelector('#tend-group-daymode-input');
  if (!inp) return;
  inp.addEventListener('change', function () {
    writeGroupTableByDay(state.patientId, sectionKey, inp.checked);
    renderTable(sectionKey);
  });
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

  var esc = deps.esc;
  var html = [
    buildDayModeToggleHtml(byDay),
    state.dynamicMode ? '<div id="tend-group-analyte-picker-slot"></div>' : '',
    '<div class="cultivos-table-wrap"><table id="tend-group-table" class="cultivos-table tend-group-table">',
  ];
  html = html.concat(buildTableHeadHtml(esc, raw, hidden, markersByDay));
  html = html.concat(buildTableBodyHtml(deps, esc, state, raw, hidden, specsByRowKey));
  html.push('</table></div>');
  wrap.innerHTML = html.join('');
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
  wireTableToggles(wrap, deps, state, sectionKey, renderTable);
  wireDayModeToggle(wrap, state, sectionKey, renderTable);
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
