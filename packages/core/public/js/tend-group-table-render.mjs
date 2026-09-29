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
  buildEventMarkerTagsHtml,
  eventMarkerTagSpecs,
} from './features/tendencias-event-context.mjs';
import { renderAnalytePickerBar } from './tend-group-analyte-picker.mjs';

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

function hiddenRowHtml(esc, attr, key, label) {
  return (
    '<div class="tend-hidden-row"><span class="tend-hidden-row-name">' + esc(label) + '</span>' +
    '<button type="button" class="tend-hidden-row-btn" ' + attr + '="' + esc(key) + '" aria-label="Mostrar ' + esc(label) + '">Mostrar</button></div>'
  );
}

function buildHiddenChips(deps, state, hidden, raw, specsByRowKey) {
  var esc = deps.esc;
  var chips = [];
  hidden.cols.forEach(function (ck) {
    chips.push(
      hiddenRowHtml(esc, 'data-restore-col', ck, hiddenColLabel(raw, ck))
    );
  });
  hidden.rows.forEach(function (rk) {
    var sp = specsByRowKey[rk];
    var lab = sp ? legendLabelForSpec(deps, sp.sectionKey, sp) : rk;
    chips.push(
      hiddenRowHtml(esc, 'data-restore-row', rk, lab)
    );
  });
  return chips;
}

function wireHiddenBarActions(bar, ctx) {
  bar.querySelector('.tend-hidden-trigger').onclick = function (ev) {
    ev.stopPropagation();
    ctx.state.tableHiddenMenuOpen = !ctx.state.tableHiddenMenuOpen;
    renderTableHiddenBar(ctx);
  };
  var filter = bar.querySelector('.tend-hidden-filter');
  if (filter) {
    filter.oninput = function () {
      var q = filter.value.trim().toLowerCase();
      bar.querySelectorAll('.tend-hidden-row').forEach(function (row) {
        row.style.display = row.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none';
      });
    };
  }
  bar.querySelector('.tend-group-show-all-btn').onclick = function (ev) {
    ev.stopPropagation();
    writeGroupTableHidden(ctx.state.patientId, ctx.sectionKey, { rows: [], cols: [] });
    ctx.state.tableHiddenMenuOpen = false;
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
  var count = chips.length;
  var open = !!ctx.state.tableHiddenMenuOpen;
  bar.style.display = '';
  bar.className = 'tend-group-table-hidden-bar' + (open ? ' is-open' : '');
  bar.innerHTML =
    '<button type="button" class="tend-hidden-trigger" aria-expanded="' + (open ? 'true' : 'false') + '">' +
    '<span class="rp-dot" aria-hidden="true"></span>' + count + (count === 1 ? ' oculto' : ' ocultos') + ' en la copia</button>' +
    (open
      ? '<div class="tend-hidden-panel"><div class="tend-hidden-panel-head"><span>Ocultos en la copia</span>' +
        '<button type="button" class="tend-group-show-all-btn">Mostrar todo</button></div>' +
        (count > 8 ? '<input type="search" class="tend-hidden-filter" placeholder="Buscar" aria-label="Buscar entre los ocultos">' : '') +
        '<div class="tend-hidden-list">' + chips.join('') + '</div></div>'
      : '');
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

var EYE_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="3"/></svg>';
var EYE_OFF_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.5 7.5C3.9 9.3 2.5 12 2.5 12S6 18 12 18c1.4 0 2.7-.3 3.9-.8"/></svg>';

/** Eye toggle: pressed = hidden in the copy. */
function eyeToggleHtml(esc, attr, key, hidden, what, label) {
  var verb = hidden ? 'Mostrar ' : 'Ocultar ';
  return (
    '<button type="button" class="tend-eye-toggle" ' + attr + '="' + esc(key) + '" aria-pressed="' +
    (hidden ? 'true' : 'false') + '" aria-label="' + esc(verb + what + ' ' + label) + '" title="' + esc(verb + what) + '">' +
    (hidden ? EYE_OFF_SVG : EYE_SVG) + '</button>'
  );
}

function buildTableHeadHtml(esc, raw, hidden, markersByDay) {
  var lastCi = lastVisibleCol(raw, hidden);
  var html = ['<thead><tr><th>Analito</th><th class="tend-tbl-ref-h">Referencia</th>'];
  raw.columns.forEach(function (set, ci) {
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
        (ci === lastCi ? ' is-last' : '') +
        '"><div class="tend-group-col-head">' +
        tagsHtml +
        '<span class="tend-group-col-toggle">' +
        eyeToggleHtml(esc, 'data-col-key', ck, colHidden, 'columna', colLabel) +
        esc(colLabel) +
        (ci === lastCi ? '<span class="tend-tbl-last-tag"> · último</span>' : '') +
        '</span></div></th>'
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
  var lastCi = lastVisibleCol(raw, hidden);
  var nCols = raw.columns.length + 2;
  var multiSection = raw.rows.some(function (r) {
    return r.sectionKey !== raw.rows[0].sectionKey;
  });
  var curSection = null;
  raw.rows.forEach(function (row) {
    var rk = rowKey(row);
    if (multiSection && row.sectionKey !== curSection) {
      curSection = row.sectionKey;
      html.push(
        '<tr class="tend-tbl-sec"><td colspan="' + nCols + '">' +
          esc((deps.getSectionLabel && deps.getSectionLabel(curSection)) || curSection) + '</td></tr>'
      );
    }
    var rowHidden = hidden.rows.indexOf(rk) >= 0;
    var rowLabel = rowDisplayLabel(deps, state, row, specsByRowKey);
    html.push(
      '<tr data-field="' +
        esc(rk) +
        '" class="' +
        tableHiddenRowClass(rowHidden) +
        '"><td><span class="tend-group-row-toggle">' +
        eyeToggleHtml(esc, 'data-field-key', rk, rowHidden, 'fila', rowLabel) +
        esc(rowLabel) +
        '</span></td><td class="tend-tbl-ref">' +
        esc(rowRefText(deps, row, raw, state.historyDesc)) +
        '</td>'
    );
    raw.columns.forEach(function (set, ci) {
      var ck = colKeyForSet(set);
      var colHidden = hidden.cols.indexOf(ck) >= 0;
      var val = row.values[ci];
      var refSet = row.refSets ? row.refSets[ci] : set;
      var dir = abnormalDir(deps, refSet, row, val, state.historyDesc);
      html.push(
        '<td class="' +
          (colHidden ? 'is-hidden' : '') +
          (ci === lastCi ? ' is-last' : '') +
          '"><span class="tend-val' +
          (dir ? (dir === '▲' ? ' tend-val--hi' : ' tend-val--lo') : '') +
          '">' +
          esc(formatCellValue(val, dir)) +
          '</span></td>'
      );
    });
    html.push('</tr>');
  });
  var interpTexts = interpretationRowTexts(state.sectionKey, raw.columns);
  if (interpTexts) {
    html.push('<tr class="tend-group-table-interp-row"><td><em>Interpretación</em></td><td></td>');
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

/** Legend + out-of-range count in the last visible draw. */
function buildLegendHtml(model) {
  var ci = -1;
  model.columns.forEach(function (c, i) {
    if (!c.hidden) ci = i;
  });
  var n = ci < 0 ? 0 : model.rows.filter(function (r) {
    return !r.hidden && r.cells[ci] && r.cells[ci].abnormal;
  }).length;
  return (
    '<div class="tend-tbl-legend"><span><span class="tend-tbl-lg-hi">▲</span> por encima</span>' +
    '<span><span class="tend-tbl-lg-lo">▼</span> por debajo</span>' +
    '<span>' + n + (n === 1 ? ' valor fuera de rango' : ' valores fuera de rango') + ' en la última toma</span></div>'
  );
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
  wrap.querySelectorAll('button[data-col-key]').forEach(function (inp) {
    inp.addEventListener('click', function () {
      var h = readGroupTableHidden(state.patientId, sectionKey);
      toggleHiddenList(h.cols, inp.getAttribute('data-col-key'), inp.getAttribute('aria-pressed') !== 'true');
      writeGroupTableHidden(state.patientId, sectionKey, h);
      renderTable(sectionKey);
    });
  });
  wrap.querySelectorAll('button[data-field-key]').forEach(function (inp) {
    inp.addEventListener('click', function () {
      var h = readGroupTableHidden(state.patientId, sectionKey);
      toggleHiddenList(h.rows, inp.getAttribute('data-field-key'), inp.getAttribute('aria-pressed') !== 'true');
      writeGroupTableHidden(state.patientId, sectionKey, h);
      renderTable(sectionKey);
    });
  });
}

function buildDayModeToggleHtml(byDay) {
  return (
    '<label class="tend-group-daymode-toggle"><input type="checkbox" class="tend-tick" id="tend-group-daymode-input"' +
    (byDay ? ' checked' : '') +
    '> Agrupar por día</label>'
  );
}

function wireDayModeToggle(host, state, sectionKey, renderTable) {
  var inp = host.querySelector('#tend-group-daymode-input');
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

  var esc = deps.esc;
  // Pivot pane keeps the toggle in its range row (slot), other tables keep it above the table.
  var daySlot = opts && opts.daymodeSlotId ? document.getElementById(opts.daymodeSlotId) : null;
  var dayHtml = buildDayModeToggleHtml(byDay);
  if (daySlot) daySlot.innerHTML = dayHtml;
  var html = [
    daySlot ? '' : dayHtml,
    state.dynamicMode ? '<div id="tend-group-analyte-picker-slot"></div>' : '',
  ];
  if (!allSpecs.length) {
    html.push(
      '<div class="tend-table-empty"><strong>Aún no hay analitos</strong>' +
        '<span>Marca analitos en la lista o usa «+ Agregar analito» para armar la tabla.</span></div>'
    );
  } else {
    html.push('<div class="cultivos-table-wrap"><table id="tend-group-table" class="cultivos-table tend-group-table">');
    html = html.concat(buildTableHeadHtml(esc, raw, hidden, markersByDay));
    html = html.concat(buildTableBodyHtml(deps, esc, state, raw, hidden, specsByRowKey));
    html.push('</table></div>');
    html.push(buildLegendHtml(state.tableModel));
  }
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
  wireDayModeToggle(daySlot || wrap, state, sectionKey, renderTable);
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
