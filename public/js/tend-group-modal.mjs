import {
  dedupeTrendSetsForSeries,
  getSetTrendValueForSeries,
  buildTrendAxisMeta,
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeHoraLabHistory,
  classifyTendPanelFamily,
  familyOrderForSection,
  BH_PANEL_FAMILIES,
  migratePanelFamilyKey,
  isPercentPanelFamily,
  formatTendSeriesLabel,
  columnSetsForFields,
  buildSectionTableModel,
  formatTrendColumnHeader,
  colKeyForTrendSet
} from './tend-core.mjs';
import {
  readSeriesColor,
  writeSeriesColor,
  readGroupVisibleFields,
  writeGroupVisibleFields,
  readGroupTableHidden,
  writeGroupTableHidden,
  readGroupPanelOrder,
  writeGroupPanelOrder,
  readGroupPanelHidden,
  readGroupPanelHiddenMigrated,
  writeGroupPanelHidden,
  resolvePanelTitle,
  writeGroupPanelTitle,
  defaultSeriesColor
} from './tend-prefs.mjs';
import { buildTableTsv, copyTableModelAsPng, copyTableText } from './tend-export.mjs';
import { evaluateGasoExtended } from './gaso-extended.mjs';
import { cancelOverlayClose, closeOverlayAnimated } from './ui-motion.mjs';
function isAbgAnalysisHidden() {
  return true;
}


const GENERIC_FAMILY_ORDER = ['gases', 'percent-diff', 'percent-rbc', 'absolute'];

function roundAxisBound(n, direction) {
  if (!isFinite(n)) return n;
  var abs = Math.abs(n);
  var step = abs <= 2 ? 0.5 : abs <= 20 ? 1 : abs <= 100 ? 5 : 10;
  if (direction === 'up') return Math.ceil(n / step) * step;
  return Math.floor(n / step) * step;
}

function formatAxisTickValue(v) {
  if (!isFinite(v)) return '';
  var r = Math.round(v * 1000) / 1000;
  if (Math.abs(r - Math.round(r)) < 1e-6) return String(Math.round(r));
  if (Math.abs(r * 10 - Math.round(r * 10)) < 1e-6) return String(Math.round(r * 10) / 10);
  return String(r);
}

function yScaleBoundsForDatasets(datasets, family) {
  var min = Infinity;
  var max = -Infinity;
  (datasets || []).forEach(function (ds) {
    (ds.data || []).forEach(function (y) {
      if (y != null && isFinite(y)) {
        if (y < min) min = y;
        if (y > max) max = y;
      }
    });
  });
  if (!isFinite(min)) return {};
  var pad = Math.max((max - min) * 0.12, 0.35);
  if (family === 'percent-diff' || family === 'bh-diff' || family === 'bh-diff-manual') {
    return { min: 0, max: Math.min(100, roundAxisBound(max + pad, 'up')) };
  }
  if (family === 'percent-rbc' || family === 'bh-quality') {
    return { min: 0, max: Math.min(60, roundAxisBound(max + pad, 'up')) };
  }
  if (min === max) {
    var padEq = Math.abs(min) * 0.12 || 1;
    return {
      min: roundAxisBound(min - padEq, 'down'),
      max: roundAxisBound(max + padEq, 'up')
    };
  }
  return {
    min: roundAxisBound(min - pad, 'down'),
    max: roundAxisBound(max + pad, 'up')
  };
}

function visibleDatasetsForChart(chart) {
  if (!chart || !chart.data || !chart.data.datasets) return [];
  return chart.data.datasets.filter(function (_ds, i) {
    return chart.isDatasetVisible(i);
  });
}

function applyChartYScale(chart, family) {
  if (!chart || !chart.options || !chart.options.scales || !chart.options.scales.y) return;
  var visible = visibleDatasetsForChart(chart);
  var y = chart.options.scales.y;
  if (!visible.length) {
    delete y.min;
    delete y.max;
    y.grace = '5%';
    return;
  }
  var bounds = yScaleBoundsForDatasets(visible, family);
  if (bounds.min != null && bounds.max != null) {
    y.min = bounds.min;
    y.max = bounds.max;
    delete y.grace;
  } else {
    delete y.min;
    delete y.max;
    y.grace = '5%';
  }
}

function tendPanelEyeSvg() {
  return (
    '<svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
  );
}

function orderPanelFamilies(activeFamilies, savedOrder, sectionKey) {
  var baseOrder = familyOrderForSection(sectionKey);
  var rank = Object.create(null);
  if (savedOrder && savedOrder.length) {
    savedOrder.forEach(function (fam, i) {
      var migrated = migratePanelFamilyKey(sectionKey, fam);
      rank[migrated] = i;
    });
  }
  var missingBase = (savedOrder && savedOrder.length ? savedOrder.length : baseOrder.length) + 100;
  return activeFamilies.slice().sort(function (a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a) ? rank[a] : missingBase + baseOrder.indexOf(a);
    var rb = Object.prototype.hasOwnProperty.call(rank, b) ? rank[b] : missingBase + baseOrder.indexOf(b);
    if (ra !== rb) return ra - rb;
    var ia = baseOrder.indexOf(a);
    var ib = baseOrder.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
}

function formatTrendDisplayValue(val) {
  if (val == null || !isFinite(val)) return '—';
  if (val !== 0 && Math.abs(val) < 0.1) return val.toFixed(2);
  if (Math.abs(val) < 10 && Math.floor(val) !== val) {
    return String(Math.round(val * 100) / 100);
  }
  return String(val);
}

function colKeyForSet(set) {
  return colKeyForTrendSet(set);
}

function toAscendingHistory(historyDesc) {
  return (historyDesc || []).slice().reverse();
}

function hexToRgba(hex, alpha) {
  var h = String(hex || '').replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length !== 6) return 'rgba(16,185,129,' + alpha + ')';
  var r = parseInt(h.slice(0, 2), 16);
  var g = parseInt(h.slice(2, 4), 16);
  var b = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

export function createTendGroupModal(deps) {
  var state = {
    sectionKey: null,
    patientId: null,
    charts: [],
    tableModel: null,
    activeTab: 'charts',
    tableHiddenBarCollapsed: false,
    historyDesc: [],
    historyAsc: [],
    visibleFields: [],
    specsByField: Object.create(null),
    gasoExtendedFio2: 0.21
  };

  var _panelSortable = null;

  function destroyCharts() {
    state.charts.forEach(function (ch) {
      if (ch) ch.destroy();
    });
    state.charts = [];
  }

  function destroyPanelSortable() {
    if (_panelSortable) {
      try {
        if (typeof _panelSortable.destroy === 'function') _panelSortable.destroy();
      } catch (_e) {}
      _panelSortable = null;
    }
  }

  function syncPanelOrderFromDom(sectionKey) {
    var zone = document.getElementById('tend-group-panels-sortable');
    if (!zone) return;
    var order = [];
    zone.querySelectorAll('.tend-group-panel-card[data-panel-family]').forEach(function (el) {
      var fam = el.getAttribute('data-panel-family');
      if (fam) order.push(fam);
    });
    if (order.length) writeGroupPanelOrder(state.patientId, sectionKey, order);
  }

  function mountPanelSortable(sectionKey) {
    destroyPanelSortable();
    var SortableCtor = typeof globalThis !== 'undefined' ? globalThis.Sortable : null;
    if (!SortableCtor || typeof SortableCtor.create !== 'function') return;
    var zone = document.getElementById('tend-group-panels-sortable');
    var panelRoot = document.getElementById('tend-group-panel-charts');
    if (!zone || !panelRoot) return;
    _panelSortable = SortableCtor.create(zone, {
      animation: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      draggable: '.tend-group-panel-card',
      handle: '.tend-group-panel-drag-hint',
      filter:
        'button, a[href], input, textarea, select, label, canvas, .tend-group-chart-wrap, .tend-group-legend, [contenteditable]',
      preventOnFilter: true,
      delay: 280,
      delayOnTouchOnly: false,
      direction: 'vertical',
      forceFallback: true,
      fallbackClass: 'tend-group-drag-hovercard',
      fallbackOnBody: true,
      fallbackTolerance: 4,
      swapThreshold: 0.65,
      invertedSwapThreshold: 0.58,
      scroll: panelRoot,
      bubbleScroll: true,
      scrollSensitivity: 54,
      scrollSpeed: 9,
      onEnd: function (evt) {
        if (evt.oldIndex === evt.newIndex && evt.from === evt.to) return;
        syncPanelOrderFromDom(sectionKey);
      }
    });
  }

  function renderPanelsHiddenBar(panelEl, sectionKey, hiddenFams) {
    var bar = panelEl.querySelector('#tend-group-panels-hidden-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'tend-group-panels-hidden-bar';
      bar.className = 'tend-group-table-hidden-bar tend-group-panels-hidden-bar';
      panelEl.insertBefore(bar, panelEl.firstChild);
    }
    var esc = deps.esc;
    if (!hiddenFams.length) {
      bar.style.display = 'none';
      bar.innerHTML = '';
      return;
    }
    var chips = hiddenFams.map(function (fam) {
      return (
        '<button type="button" class="tend-hidden-chip tend-group-restore-chip" data-restore-panel="' +
        esc(fam) +
        '">' +
        esc(resolvePanelTitle(state.patientId, sectionKey, fam)) +
        ' <span aria-hidden="true">×</span></button>'
      );
    });
    bar.style.display = '';
    bar.innerHTML =
      '<span class="tend-group-hidden-label">Paneles ocultos:</span>' +
      chips.join('') +
      '<button type="button" class="tend-toolbar-btn tend-group-show-all-btn tend-group-panels-show-all">Mostrar todo</button>';
    bar.querySelector('.tend-group-panels-show-all').onclick = function () {
      writeGroupPanelHidden(state.patientId, sectionKey, []);
      renderCharts(sectionKey);
    };
    bar.querySelectorAll('[data-restore-panel]').forEach(function (btn) {
      btn.onclick = function () {
        var fam = btn.getAttribute('data-restore-panel');
        var h = readGroupPanelHidden(state.patientId, sectionKey).filter(function (f) {
          return f !== fam;
        });
        writeGroupPanelHidden(state.patientId, sectionKey, h);
        renderCharts(sectionKey);
      };
    });
  }

  function persistLegendVisible(sectionKey) {
    var vis = [];
    document
      .querySelectorAll('#tend-group-backdrop .tend-group-legend-check:checked')
      .forEach(function (cb) {
        var fk = cb.getAttribute('data-field');
        if (fk && vis.indexOf(fk) < 0) vis.push(fk);
      });
    if (vis.length) {
      writeGroupVisibleFields(state.patientId, sectionKey, vis);
      state.visibleFields = vis.slice();
    }
  }

  function backdropEl() {
    return document.getElementById('tend-group-backdrop');
  }

  function isOpen() {
    var bd = backdropEl();
    return !!(bd && bd.getAttribute('aria-hidden') === 'false');
  }

  function closeModal() {
    destroyPanelSortable();
    state.sectionKey = null;
    document.body.classList.remove('tend-group-modal-open');
    var bd = backdropEl();
    // Charts y DOM se limpian al terminar la salida para que no se vean vaciarse.
    closeOverlayAnimated(bd, function () {
      if (bd) bd.style.display = 'none';
      destroyCharts();
      var chartsPanel = document.getElementById('tend-group-panel-charts');
      if (chartsPanel) chartsPanel.innerHTML = '';
      var wrap = document.getElementById('tend-group-table-wrap');
      if (wrap) wrap.innerHTML = '';
    });
  }

  function requestCloseFromUi() {
    if (typeof deps.onRequestClose === 'function') {
      deps.onRequestClose();
    } else {
      closeModal();
    }
  }

  function isAbnormal(set, sectionKey, fieldKey, val, historyDesc) {
    if (val == null || !isFinite(val)) return false;
    var ref =
      deps.tendRefFromLabSet(set, sectionKey, fieldKey) ||
      deps.tendRefForSeries(historyDesc, sectionKey, fieldKey, set);
    if (!ref) return false;
    return val < ref[0] || val > ref[1];
  }

  function formatCellValue(val, abnormal) {
    var t = formatTrendDisplayValue(val);
    return abnormal && t !== '—' ? t + '*' : t;
  }

  function renderTableHiddenBar(wrap, sectionKey, hidden, raw) {
    var bar = wrap.querySelector('#tend-group-table-hidden-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'tend-group-table-hidden-bar';
      bar.className = 'tend-group-table-hidden-bar';
      wrap.insertBefore(bar, wrap.firstChild);
    }
    var esc = deps.esc;
    var chips = [];
    hidden.cols.forEach(function (ck) {
      var label = ck;
      for (var i = 0; i < raw.columns.length; i++) {
        if (colKeyForSet(raw.columns[i]) === ck) {
          label = columnHeader(raw.columns[i], raw.columns);
          break;
        }
      }
      chips.push(
        '<button type="button" class="tend-hidden-chip tend-group-restore-chip" data-restore-col="' +
          esc(ck) +
          '">' +
          esc(label) +
          ' <span aria-hidden="true">×</span></button>'
      );
    });
    hidden.rows.forEach(function (fk) {
      var sp = state.specsByField[fk];
      var lab = sp ? legendLabelForSpec(sectionKey, sp) : fk;
      chips.push(
        '<button type="button" class="tend-hidden-chip tend-group-restore-chip" data-restore-row="' +
          esc(fk) +
          '">' +
          esc(lab) +
          ' <span aria-hidden="true">×</span></button>'
      );
    });
    if (!chips.length) {
      bar.style.display = 'none';
      bar.innerHTML = '';
      return;
    }
    var count = hidden.cols.length + hidden.rows.length;
    var collapsed = !!state.tableHiddenBarCollapsed;
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
    bar.querySelector('.tend-group-hidden-bar-toggle').onclick = function () {
      state.tableHiddenBarCollapsed = !state.tableHiddenBarCollapsed;
      renderTableHiddenBar(wrap, sectionKey, hidden, raw);
    };
    bar.querySelector('.tend-group-show-all-btn').onclick = function () {
      writeGroupTableHidden(state.patientId, sectionKey, { rows: [], cols: [] });
      state.tableHiddenBarCollapsed = false;
      renderTable(sectionKey);
    };
    bar.querySelectorAll('[data-restore-col]').forEach(function (btn) {
      btn.onclick = function () {
        var ck = btn.getAttribute('data-restore-col');
        var h = readGroupTableHidden(state.patientId, sectionKey);
        h.cols = h.cols.filter(function (c) {
          return c !== ck;
        });
        writeGroupTableHidden(state.patientId, sectionKey, h);
        renderTable(sectionKey);
      };
    });
    bar.querySelectorAll('[data-restore-row]').forEach(function (btn) {
      btn.onclick = function () {
        var fk = btn.getAttribute('data-restore-row');
        var h = readGroupTableHidden(state.patientId, sectionKey);
        h.rows = h.rows.filter(function (r) {
          return r !== fk;
        });
        writeGroupTableHidden(state.patientId, sectionKey, h);
        renderTable(sectionKey);
      };
    });
  }

  function columnHeader(set, columns) {
    return formatTrendColumnHeader(set, columns);
  }

  function isLegendFieldVisible(fieldKey) {
    var saved = readGroupVisibleFields(state.patientId, state.sectionKey);
    if (!saved || !saved.length) return true;
    return saved.indexOf(fieldKey) >= 0;
  }

  function eligibleSpecs(sectionKey, historyDesc) {
    var catalog = deps.getCatalogSpecs(sectionKey, historyDesc) || [];
    return catalog.filter(function (sp) {
      var raw = historyDesc.filter(function (s) {
        return getSetTrendValueForSeries(s, sectionKey, sp.fieldKey) != null;
      });
      return dedupeTrendSetsForSeries(raw, sectionKey, sp.fieldKey).length >= 2;
    });
  }

  function resolveVisibleFields(patientId, sectionKey, eligible) {
    var saved = readGroupVisibleFields(patientId, sectionKey);
    if (saved && saved.length) {
      var allowed = Object.create(null);
      eligible.forEach(function (sp) {
        allowed[sp.fieldKey] = true;
      });
      var filtered = saved.filter(function (fk) {
        return allowed[fk];
      });
      if (filtered.length) return filtered;
    }
    return eligible.map(function (sp) {
      return sp.fieldKey;
    });
  }

  function buildTableExportModel(sectionKey, rawModel, hidden) {
    var hiddenRows = Object.create(null);
    (hidden.rows || []).forEach(function (fk) {
      hiddenRows[fk] = true;
    });
    var hiddenCols = Object.create(null);
    (hidden.cols || []).forEach(function (ck) {
      hiddenCols[ck] = true;
    });
    var columns = rawModel.columns.map(function (set) {
      var ck = colKeyForSet(set);
      return {
        header: columnHeader(set, rawModel.columns),
        colKey: ck,
        hidden: !!hiddenCols[ck]
      };
    });
    var rows = rawModel.rows.map(function (row) {
      var cells = rawModel.columns.map(function (set, ci) {
        var val = row.values[ci];
        var ab = isAbnormal(set, sectionKey, row.fieldKey, val, state.historyDesc);
        return { text: formatCellValue(val, ab), abnormal: ab };
      });
      return {
        label: row.label,
        fieldKey: row.fieldKey,
        hidden: !!hiddenRows[row.fieldKey],
        cells: cells
      };
    });
    return { columns: columns, rows: rows };
  }

  function renderTable(sectionKey) {
    var wrap = document.getElementById('tend-group-table-wrap');
    if (!wrap) return;
    var hidden = readGroupTableHidden(state.patientId, sectionKey);
    var allSpecs = Object.keys(state.specsByField).map(function (fk) {
      return state.specsByField[fk];
    });
    var raw = buildSectionTableModel(
      state.historyAsc,
      sectionKey,
      allSpecs,
      function (set, fieldKey) {
        return getSetTrendValueForSeries(set, sectionKey, fieldKey);
      }
    );
    state.tableModel = buildTableExportModel(sectionKey, raw, hidden);

    var esc = deps.esc;
    var html = ['<div class="cultivos-table-wrap"><table id="tend-group-table" class="cultivos-table tend-group-table">'];
    html.push('<thead><tr><th>Analito</th>');
    raw.columns.forEach(function (set) {
      var ck = colKeyForSet(set);
      var colHidden = hidden.cols.indexOf(ck) >= 0;
      var colLabel = columnHeader(set, raw.columns);
      html.push(
        '<th class="' +
          (colHidden ? 'is-hidden' : '') +
          '"><label class="tend-group-col-toggle"><input type="checkbox" data-col-key="' +
          esc(ck) +
          '"' +
          (colHidden ? ' checked' : '') +
          ' aria-label="Ocultar columna"> ' +
          esc(colLabel) +
          '</label></th>'
      );
    });
    html.push('</tr></thead><tbody>');
    raw.rows.forEach(function (row) {
      var rowHidden = hidden.rows.indexOf(row.fieldKey) >= 0;
      var spRow = state.specsByField[row.fieldKey];
      var rowUnit = deps.tendUnitForSeries(sectionKey, row.fieldKey);
      var rowDisp = spRow
        ? formatTendSeriesLabel(spRow.cardTitle || row.fieldKey, row.fieldKey, rowUnit)
        : formatTendSeriesLabel(row.label, row.fieldKey, row.unit || rowUnit);
      var rowLabel =
        rowDisp.unit && rowDisp.unit !== '%'
          ? rowDisp.name + ' (' + rowDisp.unit + ')'
          : rowDisp.name;
      html.push(
        '<tr data-field="' +
          esc(row.fieldKey) +
          '" class="' +
          (rowHidden ? ' tend-group-row--data-hidden' : '') +
          '"><td><label class="tend-group-row-toggle"><input type="checkbox" data-field-key="' +
          esc(row.fieldKey) +
          '"' +
          (rowHidden ? ' checked' : '') +
          ' aria-label="Ocultar valores de fila (la fila sigue visible)"> ' +
          esc(rowLabel) +
          '</label></td>'
      );
      raw.columns.forEach(function (set, ci) {
        var ck = colKeyForSet(set);
        var colHidden = hidden.cols.indexOf(ck) >= 0;
        var val = row.values[ci];
        var ab = isAbnormal(set, sectionKey, row.fieldKey, val, state.historyDesc);
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
    html.push('</tbody></table></div>');
    wrap.innerHTML = html.join('');
    renderTableHiddenBar(wrap, sectionKey, hidden, raw);

    wrap.querySelectorAll('input[data-col-key]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var ck = inp.getAttribute('data-col-key');
        var h = readGroupTableHidden(state.patientId, sectionKey);
        var idx = h.cols.indexOf(ck);
        if (inp.checked) {
          if (idx < 0) h.cols.push(ck);
        } else if (idx >= 0) {
          h.cols.splice(idx, 1);
        }
        writeGroupTableHidden(state.patientId, sectionKey, h);
        renderTable(sectionKey);
      });
    });
    wrap.querySelectorAll('input[data-field-key]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var fk = inp.getAttribute('data-field-key');
        var h = readGroupTableHidden(state.patientId, sectionKey);
        var idx = h.rows.indexOf(fk);
        if (inp.checked) {
          if (idx < 0) h.rows.push(fk);
        } else if (idx >= 0) {
          h.rows.splice(idx, 1);
        }
        writeGroupTableHidden(state.patientId, sectionKey, h);
        renderTable(sectionKey);
      });
    });

  }

  function seriesColor(sectionKey, fieldKey, index) {
    return readSeriesColor(sectionKey, fieldKey) || defaultSeriesColor(index);
  }

  function formatTooltipLine(sectionKey, spec, value) {
    var unit = deps.tendUnitForSeries(sectionKey, spec.fieldKey);
    var parts = formatTendSeriesLabel(spec.cardTitle || spec.fieldKey, spec.fieldKey, unit);
    var valStr = formatTrendDisplayValue(value);
    if (parts.unit === '%') return parts.name + ' · ' + valStr + (valStr !== '—' ? ' %' : '');
    if (parts.unit) return parts.name + ' · ' + valStr + (valStr !== '—' ? ' ' + parts.unit : '');
    return parts.name + ' · ' + valStr;
  }

  function legendLabelForSpec(sectionKey, spec) {
    var unit = deps.tendUnitForSeries(sectionKey, spec.fieldKey);
    return formatTendSeriesLabel(spec.cardTitle || spec.fieldKey, spec.fieldKey, unit).name;
  }

  function specHasTrendPoints(sectionKey, fieldKey) {
    var raw = state.historyDesc.filter(function (s) {
      return getSetTrendValueForSeries(s, sectionKey, fieldKey) != null;
    });
    return dedupeTrendSetsForSeries(raw, sectionKey, fieldKey).length >= 2;
  }

  function catalogSpecsForCharts(sectionKey) {
    if (sectionKey === 'BH') {
      return deps.getCatalogSpecs(sectionKey, state.historyDesc) || [];
    }
    return Object.keys(state.specsByField).map(function (fk) {
      return state.specsByField[fk];
    });
  }

  function serieNumFromLabSet(set, sec, fk) {
    var v = getSetTrendValueForSeries(set, sec, fk);
    return v != null && isFinite(v) ? v : null;
  }

  /** @returns {HTMLElement} */
  function ensureGasoExtendedDialog() {
    var bd = document.getElementById('tend-gaso-ext-backdrop');
    if (bd) return bd;

    var escHtml = deps.esc || function (t) {
      return String(t == null ? '' : t);
    };

    bd = document.createElement('div');
    bd.id = 'tend-gaso-ext-backdrop';
    bd.className = 'tend-gaso-ext-backdrop';
    bd.setAttribute('aria-hidden', 'true');
    bd.style.display = 'none';

    bd.innerHTML =
      '<div id="tend-gaso-ext-dialog" class="tend-gaso-ext-dialog" role="dialog" aria-modal="true" aria-labelledby="tend-gaso-ext-title">' +
        '<div class="tend-gaso-ext-header">' +
          '<div class="tend-gaso-ext-header-text">' +
            '<h2 id="tend-gaso-ext-title">' + escHtml('Gasometría extendida') + '</h2>' +
            '<p class="tend-gaso-ext-subtitle">' + escHtml('Último estudio · interpretación ácido-base') + '</p>' +
          '</div>' +
          '<div class="tend-gaso-ext-header-actions">' +
            '<div class="tend-gaso-fio2-chip" role="group" aria-label="Fracción inspirada de oxígeno">' +
              '<span class="tend-gaso-fio2-chip-label">FiO₂</span>' +
              '<input type="number" class="tend-gaso-fio2-input" step="0.01" min="0.08" max="100" inputmode="decimal" aria-label="FiO₂ (0.21 o 21)" title="Fracción 0.21 o porcentaje 21" />' +
              '<span class="tend-gaso-fio2-chip-hint">0.21 · 21%</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="tend-gaso-extended-inner"></div>' +
      '</div>';

    bd.addEventListener('click', function (ev) {
      if (ev.target === bd) closeGasoExtended();
    });

    document.body.appendChild(bd);
    return bd;
  }

  function closeGasoExtended() {
    var bd = document.getElementById('tend-gaso-ext-backdrop');
    if (!bd) return;
    document.body.classList.remove('tend-gaso-ext-open');
    closeOverlayAnimated(bd, function () {
      bd.style.display = 'none';
    });
  }

  function parseFio2Input(raw) {
    var n = parseFloat(String(raw == null ? '' : raw).replace(',', '.'));
    if (!isFinite(n)) return state.gasoExtendedFio2;
    if (n > 3) return Math.min(Math.max(n / 100, 0.08), 1);
    return Math.min(Math.max(n, 0.08), 1);
  }

  /** @param {HTMLElement} slot */
  function refillGasoExtendedSlot(slot, latest) {
    var escHtml = deps.esc || function (t) {
      return String(t == null ? '' : t);
    };
    if (!slot) return;

    slot.innerHTML = '';

    if (!latest || !latest.parsedBySection) {
      slot.innerHTML =
        '<p class="tend-empty" style="font-size:13px;color:var(--text-muted);">' +
        escHtml('Sin valores recientes disponibles para gasometría.') +
        '</p>';
      return;
    }

    var na =
      serieNumFromLabSet(latest, 'QS', 'Na') ??
      serieNumFromLabSet(latest, 'ESC', 'Na') ??
      serieNumFromLabSet(latest, 'GASES', 'Na');
    var cl =
      serieNumFromLabSet(latest, 'QS', 'Cl') ??
      serieNumFromLabSet(latest, 'ESC', 'Cl');
    var alb = serieNumFromLabSet(latest, 'PFHs', 'Alb');

    var pH = serieNumFromLabSet(latest, 'GASES', 'pH');
    var pCO2 = serieNumFromLabSet(latest, 'GASES', 'pCO2');
    var pO2 = serieNumFromLabSet(latest, 'GASES', 'pO2');
    var bic = serieNumFromLabSet(latest, 'GASES', 'Bica');

    function fmtNum(n, unit) {
      if (n == null || !isFinite(n)) return '—';
      return String(n) + (unit ? ' ' + unit : '');
    }

    function primaryDisorderLabel(disorder, type) {
      var dMap = {
        metabolic: 'Metabólico',
        respiratory: 'Respiratorio',
        mixed: 'Mixto',
        compensated: 'Compensado',
        unknown: 'Indeterminado',
      };
      var tMap = { acidosis: 'acidosis', alkalosis: 'alcalosis', none: '' };
      var d = dMap[String(disorder || '').toLowerCase()] || String(disorder || '—');
      var t = tMap[String(type || '').toLowerCase()] || '';
      return t ? d + ' · ' + t : d;
    }

    function metricChip(label, value, tone) {
      var chip = document.createElement('span');
      chip.className = 'tend-gaso-chip' + (tone ? ' tend-gaso-chip--' + tone : '');
      var lbl = document.createElement('span');
      lbl.className = 'tend-gaso-chip-label';
      lbl.textContent = label;
      var val = document.createElement('strong');
      val.className = 'tend-gaso-chip-val';
      val.textContent = value;
      chip.appendChild(lbl);
      chip.appendChild(val);
      return chip;
    }

    function subMetric(label, value) {
      var sub = document.createElement('div');
      sub.className = 'tend-gaso-sub';
      var lbl = document.createElement('span');
      lbl.className = 'tend-gaso-sub-label';
      lbl.textContent = label;
      var val = document.createElement('span');
      val.className = 'tend-gaso-sub-val';
      val.textContent = value;
      sub.appendChild(lbl);
      sub.appendChild(val);
      return sub;
    }

    function stepCard(num, title, bodyEl) {
      var art = document.createElement('article');
      art.className = 'tend-gaso-step';
      var numEl = document.createElement('span');
      numEl.className = 'tend-gaso-step-num';
      numEl.textContent = String(num);
      var body = document.createElement('div');
      body.className = 'tend-gaso-step-body';
      var h = document.createElement('h5');
      h.className = 'tend-gaso-step-title';
      h.textContent = title;
      body.appendChild(h);
      body.appendChild(bodyEl);
      art.appendChild(numEl);
      art.appendChild(body);
      return art;
    }

    function stepText(txt) {
      var p = document.createElement('p');
      p.className = 'tend-gaso-step-text';
      p.textContent = String(txt || '');
      return p;
    }

    try {
      var ev = evaluateGasoExtended({
        pH: pH,
        pCO2: pCO2,
        pO2: pO2,
        hco3: bic,
        na: na,
        cl: cl,
        alb: alb,
        fio2: state.gasoExtendedFio2,
      });

      var panel = document.createElement('div');
      panel.className = 'tend-gaso-ext-panel';

      var metrics = document.createElement('div');
      metrics.className = 'tend-gaso-metrics';
      metrics.appendChild(
        metricChip(
          'pH',
          fmtNum(pH),
          pH != null && pH < 7.35 ? 'low' : pH != null && pH > 7.45 ? 'high' : ''
        )
      );
      metrics.appendChild(metricChip('PaCO₂', fmtNum(pCO2, 'mmHg')));
      metrics.appendChild(metricChip('HCO₃⁻', fmtNum(bic, 'mEq/L')));
      metrics.appendChild(
        metricChip(
          'Anión gap',
          fmtNum(ev.steps.anionGap.value, 'mEq/L'),
          ev.steps.anionGap.value != null && ev.steps.anionGap.value > 12 ? 'high' : ''
        )
      );
      panel.appendChild(metrics);

      var steps = document.createElement('div');
      steps.className = 'tend-gaso-steps';

      steps.appendChild(stepCard(1, 'Estado ácido-base', stepText(ev.steps.ph.interpretation)));

      var primaryBody = document.createElement('div');
      var primaryBadge = document.createElement('span');
      primaryBadge.className = 'tend-gaso-badge tend-gaso-badge--tip';
      primaryBadge.tabIndex = 0;
      primaryBadge.textContent = primaryDisorderLabel(ev.steps.primary.disorder, ev.steps.primary.type);
      var primaryRationale = String(ev.steps.primary.rationale || '').trim();
      if (primaryRationale) {
        var primaryTipId = 'tend-gaso-primary-rationale';
        primaryBadge.setAttribute('aria-describedby', primaryTipId);
        var primaryTip = document.createElement('span');
        primaryTip.id = primaryTipId;
        primaryTip.className = 'tend-gaso-tip';
        primaryTip.setAttribute('role', 'tooltip');
        primaryTip.textContent = primaryRationale;
        primaryBadge.appendChild(primaryTip);
      }
      primaryBody.appendChild(primaryBadge);
      steps.appendChild(stepCard(2, 'Trastorno predominante', primaryBody));

      var cmp = ev.steps.compensation;
      var cmpBody = document.createElement('div');
      var cmpGrid = document.createElement('div');
      cmpGrid.className = 'tend-gaso-subgrid';
      if (cmp.expectedPCO2 != null) {
        cmpGrid.appendChild(subMetric('PaCO₂ Winter', '~' + cmp.expectedPCO2 + ' mmHg'));
      }
      if (cmp.expectedHCO3Acute != null) {
        cmpGrid.appendChild(subMetric('HCO₃⁻ agudo', '~' + cmp.expectedHCO3Acute));
      }
      if (cmp.expectedHCO3Chronic != null) {
        cmpGrid.appendChild(subMetric('HCO₃⁻ crónico', '~' + cmp.expectedHCO3Chronic));
      }
      if (cmpGrid.childNodes.length) cmpBody.appendChild(cmpGrid);
      cmpBody.appendChild(stepText(cmp.note));
      steps.appendChild(stepCard(3, 'Compensación esperada', cmpBody));

      var agBody = document.createElement('div');
      if (ev.steps.anionGap.value != null) {
        var agBadge = document.createElement('span');
        agBadge.className =
          'tend-gaso-badge' + (ev.steps.anionGap.value > 12 ? ' tend-gaso-badge--warn' : '');
        agBadge.textContent = ev.steps.anionGap.value + ' mEq/L';
        agBody.appendChild(agBadge);
      }
      agBody.appendChild(stepText(ev.steps.anionGap.interpretation));
      steps.appendChild(stepCard(4, 'Anión gap', agBody));

      var ddBody = document.createElement('div');
      if (ev.steps.deltaDelta.value != null) {
        var ddBadge = document.createElement('span');
        ddBadge.className = 'tend-gaso-badge';
        ddBadge.textContent = String(ev.steps.deltaDelta.value);
        ddBody.appendChild(ddBadge);
      }
      ddBody.appendChild(stepText(ev.steps.deltaDelta.interpretation));
      steps.appendChild(stepCard(5, 'Delta-delta', ddBody));

      var oxBody = document.createElement('div');
      var oxGrid = document.createElement('div');
      oxGrid.className = 'tend-gaso-subgrid';
      if (ev.steps.oxygenation.pfRatio != null) {
        oxGrid.appendChild(subMetric('P/F', '≈ ' + ev.steps.oxygenation.pfRatio));
      }
      if (ev.steps.oxygenation.aaGradient != null) {
        oxGrid.appendChild(subMetric('Gradiente A–a', '≈ ' + ev.steps.oxygenation.aaGradient + ' mmHg'));
      }
      if (oxGrid.childNodes.length) oxBody.appendChild(oxGrid);
      oxBody.appendChild(stepText(ev.steps.oxygenation.note));
      steps.appendChild(stepCard(6, 'Oxigenación', oxBody));

      panel.appendChild(steps);
      slot.appendChild(panel);

      if (ev.summaryLines && ev.summaryLines.length) {
        var hs = document.createElement('details');
        hs.className = 'tend-gaso-summary';
        var sm = document.createElement('summary');
        sm.textContent = 'Resumen rápido';
        hs.appendChild(sm);
        var ul = document.createElement('ul');
        ul.className = 'tend-gaso-summary-list';
        ev.summaryLines.forEach(function (ln) {
          var li = document.createElement('li');
          li.textContent = ln;
          ul.appendChild(li);
        });
        hs.appendChild(ul);
        slot.appendChild(hs);
      }
    } catch (e) {
      slot.innerHTML =
        '<p class="tend-empty" style="font-size:13px;color:var(--error);">' +
        escHtml('No se pudo calcular la gasometría extendida.') +
        '</p>';
      console.error('evaluateGasoExtended', e);
    }
  }

  function wireGasoExtendedDialog(bd) {
    var inp = bd.querySelector('.tend-gaso-fio2-input');
    if (!inp || inp._gasoWired) return;
    inp._gasoWired = true;

    inp.value =
      Math.abs(state.gasoExtendedFio2 * 100 - Math.round(state.gasoExtendedFio2 * 100)) < 1e-6 &&
      state.gasoExtendedFio2 <= 1
        ? String(state.gasoExtendedFio2.toFixed(2))
        : String(state.gasoExtendedFio2);

    function rerun() {
      state.gasoExtendedFio2 = parseFio2Input(inp.value);
      var latest = state.historyDesc[0];
      refillGasoExtendedSlot(bd.querySelector('.tend-gaso-extended-inner'), latest);
    }

    inp.addEventListener('change', rerun);
    inp.addEventListener('input', rerun);
  }

  function openGasoExtended() {
    if (isAbgAnalysisHidden()) {
      if (deps.showToast) deps.showToast('El análisis de gasometría no está disponible en R+.', 'info');
      return;
    }
    var patientId = deps.getActiveId();
    if (!patientId) return;

    var historyDesc = sortLabHistoryChronological(deps.getHistory() || []);
    if (!historyDesc.length) {
      if (deps.showToast) deps.showToast('Sin laboratorio reciente para gasometría.', 'warn');
      return;
    }

    state.patientId = patientId;
    state.historyDesc = historyDesc;

    var latest = historyDesc[0];
    var hasGaso =
      latest &&
      latest.parsedBySection &&
      latest.parsedBySection.GASES &&
      serieNumFromLabSet(latest, 'GASES', 'pH') != null;
    if (!hasGaso) {
      if (deps.showToast) deps.showToast('No hay gasometría en el último estudio.', 'warn');
      return;
    }

    var bd = ensureGasoExtendedDialog();
    wireGasoExtendedDialog(bd);
    refillGasoExtendedSlot(bd.querySelector('.tend-gaso-extended-inner'), latest);

    cancelOverlayClose(bd);
    bd.style.display = 'flex';
    bd.setAttribute('aria-hidden', 'false');
    document.body.classList.add('tend-gaso-ext-open');
  }

  function renderCharts(sectionKey) {
    var panelEl = document.getElementById('tend-group-panel-charts');
    if (!panelEl) return;
    destroyCharts();
    destroyPanelSortable();
    panelEl.innerHTML = '';

    var families = Object.create(null);
    var catalogSpecs = catalogSpecsForCharts(sectionKey);
    catalogSpecs.forEach(function (sp, idx) {
      if (!sp) return;
      var fk = sp.fieldKey;
      var unit = deps.tendUnitForSeries(sectionKey, fk);
      var fam = classifyTendPanelFamily(sectionKey, fk, unit);
      if (!families[fam]) families[fam] = [];
      families[fam].push({ spec: sp, index: idx });
    });

    var activeFams;
    if (sectionKey === 'BH') {
      activeFams = BH_PANEL_FAMILIES.slice();
    } else {
      var familyOrder = familyOrderForSection(sectionKey);
      activeFams = familyOrder.filter(function (fam) {
        return families[fam] && families[fam].length;
      });
      GENERIC_FAMILY_ORDER.forEach(function (fam) {
        if (activeFams.indexOf(fam) >= 0) return;
        if (families[fam] && families[fam].length) activeFams.push(fam);
      });
    }
    if (!activeFams.length) {
      var emptyP = document.createElement('p');
      emptyP.className = 'tend-empty';
      emptyP.style.margin = '12px 0';
      emptyP.style.fontSize = '13px';
      emptyP.style.color = 'var(--text-muted)';
      emptyP.textContent = 'Sin datos para graficar en este estudio.';
      panelEl.appendChild(emptyP);
      renderPanelsHiddenBar(panelEl, sectionKey, []);
      return;
    }

    var hiddenFams = readGroupPanelHiddenMigrated(
      state.patientId,
      sectionKey,
      migratePanelFamilyKey
    ).filter(function (fam) {
      return activeFams.indexOf(fam) >= 0;
    });
    var orderedFams = orderPanelFamilies(
      activeFams,
      readGroupPanelOrder(state.patientId, sectionKey),
      sectionKey
    );
    var visibleFams = orderedFams.filter(function (fam) {
      return hiddenFams.indexOf(fam) < 0;
    });

    renderPanelsHiddenBar(panelEl, sectionKey, hiddenFams);

    var sortZone = document.createElement('div');
    sortZone.id = 'tend-group-panels-sortable';
    sortZone.className = 'tend-group-sort-zone patient-sort-zone';
    panelEl.appendChild(sortZone);

    visibleFams.forEach(function (fam) {
      var block = document.createElement('section');
      block.className = 'tend-group-panel-card tend-group-panel-family patient-card';
      block.setAttribute('data-panel-family', fam);

      var toolbar = document.createElement('div');
      toolbar.className = 'patient-card-toolbar tend-group-panel-toolbar';
      toolbar.innerHTML =
        '<div class="patient-card-toolbar-left">' +
        '<button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-eye" title="Ocultar panel" aria-label="Ocultar panel">' +
        tendPanelEyeSvg() +
        '</button>' +
        '</div>' +
        '<span class="tend-group-panel-drag-hint" aria-hidden="true" title="Arrastrar para reordenar">⋮⋮</span>';
      block.appendChild(toolbar);

      var titleEl = document.createElement('h3');
      titleEl.className = 'tend-group-family-title tend-group-family-title--editable';
      titleEl.setAttribute('contenteditable', 'true');
      titleEl.setAttribute('spellcheck', 'false');
      titleEl.setAttribute('role', 'textbox');
      titleEl.setAttribute(
        'aria-label',
        'Título del panel, editable. Enter para guardar, Esc para cancelar.'
      );
      titleEl.textContent = resolvePanelTitle(state.patientId, sectionKey, fam);
      var titleDraft = titleEl.textContent;
      titleEl.addEventListener('focus', function () {
        titleDraft = titleEl.textContent;
      });
      titleEl.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          titleEl.blur();
        } else if (ev.key === 'Escape') {
          ev.preventDefault();
          titleEl.textContent = titleDraft;
          titleEl.blur();
        }
      });
      titleEl.addEventListener('blur', function () {
        var next = (titleEl.textContent || '').replace(/\s+/g, ' ').trim();
        if (!next) {
          titleEl.textContent = titleDraft;
          return;
        }
        writeGroupPanelTitle(state.patientId, sectionKey, fam, next);
        titleEl.textContent = resolvePanelTitle(state.patientId, sectionKey, fam);
        titleDraft = titleEl.textContent;
        var hiddenNow = readGroupPanelHiddenMigrated(
          state.patientId,
          sectionKey,
          migratePanelFamilyKey
        ).filter(function (f) {
          return activeFams.indexOf(f) >= 0;
        });
        renderPanelsHiddenBar(panelEl, sectionKey, hiddenNow);
      });
      block.appendChild(titleEl);

      toolbar.querySelector('.tend-group-panel-eye').onclick = function (ev) {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        var h = readGroupPanelHiddenMigrated(
          state.patientId,
          sectionKey,
          migratePanelFamilyKey
        ).slice();
        if (h.indexOf(fam) < 0) h.push(fam);
        writeGroupPanelHidden(state.patientId, sectionKey, h);
        renderCharts(sectionKey);
      };

      var chartWrap = document.createElement('div');
      chartWrap.className = 'tend-group-chart-wrap';
      var canvas = document.createElement('canvas');
      chartWrap.appendChild(canvas);
      block.appendChild(chartWrap);

      var legend = document.createElement('div');
      legend.className = 'tend-group-legend';

      var items = (families[fam] || []).filter(function (item) {
        return specHasTrendPoints(sectionKey, item.spec.fieldKey);
      });
      var famFieldKeys = items.map(function (item) {
        return item.spec.fieldKey;
      });
      var colSets = columnSetsForFields(state.historyAsc, sectionKey, famFieldKeys);
      if (!colSets.length || !items.length) {
        var emptyP = document.createElement('p');
        emptyP.className = 'tend-empty';
        emptyP.style.margin = '8px 0 0';
        emptyP.style.fontSize = '13px';
        emptyP.style.color = 'var(--text-muted)';
        emptyP.textContent = items.length
          ? 'Sin puntos temporales para este panel.'
          : 'Ningún analito de este panel tiene 2 o más laboratorios. Procesa otro BH o activa BH extendida en Resultados.';
        block.appendChild(emptyP);
        sortZone.appendChild(block);
        return;
      }
      var axisMeta = buildTrendAxisMeta(colSets);
      var chartLabels = axisMeta.labels;

      var datasets = [];
      items.forEach(function (item) {
        var fk = item.spec.fieldKey;
        var label = legendLabelForSpec(sectionKey, item.spec);
        var color = seriesColor(sectionKey, fk, item.index);
        var data = axisMeta.points.map(function (p) {
          var v = getSetTrendValueForSeries(p.set, sectionKey, fk);
          return v != null && isFinite(v) ? v : null;
        });
        datasets.push({
          label: label,
          data: data,
          borderColor: color,
          backgroundColor: hexToRgba(color, 0.12),
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          tension: 0.3,
          fill: false,
          spanGaps: true,
          fieldKey: fk
        });

        var legItem = document.createElement('label');
        legItem.className = 'tend-group-legend-item';
        legItem.innerHTML =
          '<input type="checkbox" class="tend-group-legend-check" data-field="' +
          fk +
          '"' +
          (isLegendFieldVisible(fk) ? ' checked' : '') +
          '> ' +
          '<input type="color" class="tend-group-legend-color" data-field="' +
          fk +
          '" value="' +
          color +
          '"> ' +
          '<span>' +
          label +
          '</span>';
        legend.appendChild(legItem);
      });

      block.appendChild(legend);
      sortZone.appendChild(block);

      var yBounds = yScaleBoundsForDatasets(datasets, fam);
      var yScale = {
        ticks: {
          font: { size: 11 },
          callback: function (v) {
            var t = formatAxisTickValue(v);
            if (isPercentPanelFamily(fam)) {
              return t ? t + ' %' : '';
            }
            return t;
          }
        }
      };
      if (yBounds.min != null && yBounds.max != null) {
        yScale.min = yBounds.min;
        yScale.max = yBounds.max;
      } else {
        yScale.grace = '5%';
      }

      try {
        var chart = new deps.Chart(canvas, {
          type: 'line',
          data: { labels: chartLabels, datasets: datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  title: function (tipItems) {
                    var i = tipItems[0] && tipItems[0].dataIndex;
                    return i != null && chartLabels[i] != null ? chartLabels[i] : '';
                  },
                  label: function (ctx) {
                    var ds = ctx.dataset;
                    var spec = state.specsByField[ds.fieldKey];
                    if (!spec) return ds.label || '';
                    return formatTooltipLine(sectionKey, spec, ctx.parsed.y);
                  }
                }
              }
            },
            scales: {
              x: {
                ticks: {
                  maxRotation: 45,
                  minRotation: 0,
                  font: { size: 11 },
                  autoSkip: true,
                  maxTicksLimit: 12
                }
              },
              y: yScale
            }
          }
        });
        chart._tendFamily = fam;
        chart.data.datasets.forEach(function (ds, dsIdx) {
          var show = isLegendFieldVisible(ds.fieldKey);
          chart.setDatasetVisibility(dsIdx, show);
        });
        applyChartYScale(chart, fam);
        chart.update();
        state.charts.push(chart);

        legend.querySelectorAll('.tend-group-legend-check').forEach(function (inp) {
          inp.addEventListener('change', function () {
            var fk = inp.getAttribute('data-field');
            var dsIdx = chart.data.datasets.findIndex(function (d) {
              return d.fieldKey === fk;
            });
            if (dsIdx < 0) return;
            chart.setDatasetVisibility(dsIdx, inp.checked);
            applyChartYScale(chart, fam);
            chart.update();
            persistLegendVisible(sectionKey);
          });
        });

        legend.querySelectorAll('.tend-group-legend-color').forEach(function (inp) {
          inp.addEventListener('input', function () {
            var fk = inp.getAttribute('data-field');
            writeSeriesColor(sectionKey, fk, inp.value);
            var dsIdx = chart.data.datasets.findIndex(function (d) {
              return d.fieldKey === fk;
            });
            if (dsIdx < 0) return;
            chart.data.datasets[dsIdx].borderColor = inp.value;
            chart.data.datasets[dsIdx].pointBackgroundColor = inp.value;
            chart.update('none');
          });
        });
      } catch (chartErr) {
        console.error('tend-group chart', fam, chartErr);
        chartWrap.innerHTML =
          '<p class="tend-empty" style="margin:12px 0;font-size:13px;color:var(--error);">No se pudo dibujar este panel.</p>';
      }
    });

    mountPanelSortable(sectionKey);
  }

  function setTab(name) {
    state.activeTab = name === 'table' ? 'table' : 'charts';
    var chartsPanel = document.getElementById('tend-group-panel-charts');
    var tablePanel = document.getElementById('tend-group-panel-table');
    var tabs = document.querySelectorAll('#tend-group-backdrop .tend-group-tab');
    tabs.forEach(function (btn) {
      var on = btn.getAttribute('data-tab') === state.activeTab;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (chartsPanel) chartsPanel.hidden = state.activeTab !== 'charts';
    if (tablePanel) tablePanel.hidden = state.activeTab !== 'table';
    var track = document.getElementById('tend-group-tabs-track');
    if (track) track.setAttribute('data-active', state.activeTab);
  }


  return {
    open: function (sectionKey) {
      var patientId = deps.getActiveId();
      if (!patientId || !sectionKey) return;
      var historyDesc = sortLabHistoryChronological(deps.getHistory() || []);
      if (historyDesc.length < 2) return;
      var eligible = eligibleSpecs(sectionKey, historyDesc);
      if (sectionKey === 'BH') {
        var hasBhData = historyDesc.some(function (s) {
          return s.parsedBySection && s.parsedBySection.BH && Object.keys(s.parsedBySection.BH).length;
        });
        if (!hasBhData && !eligible.length) return;
      } else if (!eligible.length) {
        return;
      }

      state.sectionKey = sectionKey;
      state.patientId = patientId;
      if (sectionKey === 'GASES') state.gasoExtendedFio2 = 0.21;
      state.historyDesc = historyDesc;
      state.historyAsc = toAscendingHistory(historyDesc);
      state.specsByField = Object.create(null);
      var specsForModal =
        sectionKey === 'BH'
          ? deps.getCatalogSpecs(sectionKey, historyDesc) || []
          : eligible;
      specsForModal.forEach(function (sp) {
        state.specsByField[sp.fieldKey] = sp;
      });
      state.visibleFields = resolveVisibleFields(patientId, sectionKey, eligible.length ? eligible : specsForModal);

      var titleEl = document.getElementById('tend-group-title');
      if (titleEl) {
        titleEl.textContent =
          (deps.getSectionLabel(sectionKey) || sectionKey) + ' — Gráfica del estudio';
      }

      var bd = backdropEl();
      if (bd) {
        cancelOverlayClose(bd);
        bd.style.display = 'flex';
        bd.setAttribute('aria-hidden', 'false');
        document.body.classList.add('tend-group-modal-open');
      }

      setTab(state.activeTab || 'charts');
      try {
        renderCharts(sectionKey);
      } catch (chartRenderErr) {
        console.error('tend-group renderCharts', chartRenderErr);
        var panelErr = document.getElementById('tend-group-panel-charts');
        if (panelErr) {
          panelErr.innerHTML =
            '<p class="tend-empty">No se pudieron cargar las gráficas. Recarga la app e intenta de nuevo.</p>';
        }
      }
      try {
        renderTable(sectionKey);
      } catch (tableRenderErr) {
        console.error('tend-group renderTable', tableRenderErr);
      }

    },

    close: closeModal,

    isOpen: isOpen,

    setTab: setTab,

    copyTablePng: function () {
      if (!state.tableModel) {
        if (deps.showToast) deps.showToast('No hay tabla para copiar', 'error');
        return;
      }
      var visibleCols = state.tableModel.columns.filter(function (c) {
        return !c.hidden;
      });
      var visibleRows = state.tableModel.rows.filter(function (r) {
        return !r.hidden;
      });
      if (!visibleCols.length || !visibleRows.length) {
        if (deps.showToast) {
          deps.showToast('Muestra al menos una fila y una columna', 'error');
        }
        return;
      }
      var title =
        (deps.getSectionLabel(state.sectionKey) || state.sectionKey || 'Tabla') +
        ' — Tendencias';
      copyTableModelAsPng(state.tableModel, title, function (ok) {
        if (deps.showToast) {
          deps.showToast(
            ok ? 'Tabla copiada como imagen ✓' : 'No se pudo copiar la imagen',
            ok ? 'success' : 'error'
          );
        }
      });
    },

    copyTableText: function () {
      if (!state.tableModel) return;
      var tsv = buildTableTsv(state.tableModel);
      copyTableText(tsv, function (ok) {
        if (deps.showToast) {
          deps.showToast(
            ok ? 'Tabla copiada al portapapeles' : 'No se pudo copiar el texto',
            ok ? 'success' : 'error'
          );
        }
      });
    },

    openGasoExtended: openGasoExtended,

    closeGasoExtended: closeGasoExtended,
  };
}
