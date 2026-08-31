import {
  dedupeTrendSetsForSeries,
  getSetTrendValueForSeries,
  buildTrendAxisMeta,
  classifyTendPanelFamily,
  familyOrderForSection,
  BH_PANEL_FAMILIES,
  migratePanelFamilyKey,
  isPercentPanelFamily,
  formatTendSeriesLabel,
  columnSetsForFields,
} from './tend-core.mjs';
import {
  readSeriesColor,
  writeSeriesColor,
  readGroupVisibleFields,
  writeGroupVisibleFields,
  readGroupPanelOrder,
  writeGroupPanelOrder,
  readGroupPanelHidden,
  readGroupPanelHiddenMigrated,
  writeGroupPanelHidden,
  resolvePanelTitle,
  writeGroupPanelTitle,
  defaultSeriesColor,
  readLegendOrder,
  writeLegendOrder,
  readFieldThresholds,
  writeFieldThresholds,
  isPanelEventsHidden,
  togglePanelEventsHidden,
} from './tend-prefs.mjs';
import { copyChartPng } from './tend-export.mjs';
import {
  GENERIC_FAMILY_ORDER,
  applyChartYScale,
  tendPanelEyeSvg,
  tendPanelEventsSvg,
  orderPanelFamilies,
  formatTrendDisplayValue,
  hexToRgba,
  formatAxisTickValue,
  yScaleBoundsForDatasets,
  visibleDatasetsForChart,
  createTendThresholdPlugin,
} from './tend-group-chart-helpers.mjs';
import { buildEventMarkerMapForSets, createTendEventMarkerPlugin } from './features/tendencias-event-context.mjs';

function destroyCharts(state) {
  state.charts.forEach(function (ch) {
    if (ch) ch.destroy();
  });
  state.charts = [];
}

function syncPanelOrderFromDom(state, sectionKey) {
  var zone = document.getElementById('tend-group-panels-sortable');
  if (!zone) return;
  var order = [];
  zone.querySelectorAll('.tend-group-panel-card[data-panel-family]').forEach(function (el) {
    var fam = el.getAttribute('data-panel-family');
    if (fam) order.push(fam);
  });
  if (order.length) writeGroupPanelOrder(state.patientId, sectionKey, order);
}

function mountPanelSortable(state, sectionKey, panelSortableRef) {
  if (panelSortableRef.current) {
    try {
      if (typeof panelSortableRef.current.destroy === 'function') panelSortableRef.current.destroy();
    } catch (_e) { void _e; }
    panelSortableRef.current = null;
  }
  var SortableCtor = typeof globalThis !== 'undefined' ? globalThis.Sortable : null;
  if (!SortableCtor || typeof SortableCtor.create !== 'function') return;
  var zone = document.getElementById('tend-group-panels-sortable');
  var panelRoot = document.getElementById('tend-group-panel-charts');
  if (!zone || !panelRoot) return;
  panelSortableRef.current = SortableCtor.create(zone, {
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
      syncPanelOrderFromDom(state, sectionKey);
    },
  });
}

function renderPanelsHiddenBar(panelEl, deps, state, sectionKey, hiddenFams, renderCharts) {
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

function persistLegendVisible(state, sectionKey) {
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

function seriesColor(sectionKey, fieldKey, index) {
  return readSeriesColor(sectionKey, fieldKey) || defaultSeriesColor(index);
}

function formatTooltipLine(deps, sectionKey, spec, value) {
  var unit = deps.tendUnitForSeries(sectionKey, spec.fieldKey);
  var parts = formatTendSeriesLabel(spec.cardTitle || spec.fieldKey, spec.fieldKey, unit);
  var valStr = formatTrendDisplayValue(value);
  if (parts.unit === '%') return parts.name + ' · ' + valStr + (valStr !== '—' ? ' %' : '');
  if (parts.unit) return parts.name + ' · ' + valStr + (valStr !== '—' ? ' ' + parts.unit : '');
  return parts.name + ' · ' + valStr;
}

function specHasTrendPoints(state, sectionKey, fieldKey) {
  var raw = state.historyDesc.filter(function (s) {
    return getSetTrendValueForSeries(s, sectionKey, fieldKey) != null;
  });
  return dedupeTrendSetsForSeries(raw, sectionKey, fieldKey).length >= 2;
}

function catalogSpecsForCharts(deps, state, sectionKey) {
  if (sectionKey === 'BH') return deps.getCatalogSpecs(sectionKey, state.historyDesc) || [];
  return Object.keys(state.specsByField).map(function (fk) {
    return state.specsByField[fk];
  });
}

function orderLegendItems(state, sectionKey, fam, items) {
  var saved = readLegendOrder(state.patientId, sectionKey, fam);
  if (!saved || !saved.length) return items;
  var rank = Object.create(null);
  saved.forEach(function (fk, i) {
    rank[fk] = i;
  });
  return items.slice().sort(function (a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a.spec.fieldKey) ? rank[a.spec.fieldKey] : 9999;
    var rb = Object.prototype.hasOwnProperty.call(rank, b.spec.fieldKey) ? rank[b.spec.fieldKey] : 9999;
    return ra - rb;
  });
}

function mountLegendSortable(legend, state, sectionKey, fam) {
  var SortableCtor = typeof globalThis !== 'undefined' ? globalThis.Sortable : null;
  if (!SortableCtor || typeof SortableCtor.create !== 'function') return;
  SortableCtor.create(legend, {
    animation: 150,
    draggable: '.tend-group-legend-item',
    handle: '.tend-group-legend-drag-hint',
    filter: 'input',
    preventOnFilter: false,
    forceFallback: true,
    fallbackTolerance: 4,
    onEnd: function () {
      var order = [];
      legend.querySelectorAll('.tend-group-legend-check').forEach(function (inp) {
        var fk = inp.getAttribute('data-field');
        if (fk) order.push(fk);
      });
      writeLegendOrder(state.patientId, sectionKey, fam, order);
    },
  });
  // Stop clicks anywhere in the legend from reaching the panel-card Sortable
  // above it, so pressing a checkbox/label never triggers the card's own
  // "about to be dragged" pickup animation. Registered after Sortable's own
  // listener on this same element, so the legend's drag-hint handle still works.
  ['mousedown', 'pointerdown', 'touchstart'].forEach(function (evtName) {
    legend.addEventListener(evtName, function (ev) {
      ev.stopPropagation();
    });
  });
}

function isLegendFieldVisible(state, fieldKey) {
  var saved = readGroupVisibleFields(state.patientId, state.sectionKey);
  if (!saved || !saved.length) return true;
  return saved.indexOf(fieldKey) >= 0;
}

/**
 * Study columns (x-axis) scoped to the currently-checked legend fields only, so a study
 * that only reported a hidden analyte doesn't leave a blank slot in the visible series.
 * Falls back to every family field when nothing is checked, so the axis never goes empty.
 */
export function rebuildPanelColumns(ctx, items) {
  var visibleKeys = items
    .map(function (item) {
      return item.spec.fieldKey;
    })
    .filter(function (fk) {
      return isLegendFieldVisible(ctx.state, fk);
    });
  var keys = visibleKeys.length
    ? visibleKeys
    : items.map(function (item) {
        return item.spec.fieldKey;
      });
  var colSets = columnSetsForFields(ctx.state.historyAsc, ctx.sectionKey, keys);
  return { colSets: colSets, axisMeta: buildTrendAxisMeta(colSets) };
}

function buildFamiliesMap(deps, state, sectionKey, catalogSpecs) {
  var families = Object.create(null);
  catalogSpecs.forEach(function (sp, idx) {
    if (!sp) return;
    var fk = sp.fieldKey;
    var unit = deps.tendUnitForSeries(sectionKey, fk);
    var fam = classifyTendPanelFamily(sectionKey, fk, unit);
    if (!families[fam]) families[fam] = [];
    families[fam].push({ spec: sp, index: idx });
  });
  return families;
}

function resolveActiveFamilies(sectionKey, families) {
  if (sectionKey === 'BH') return BH_PANEL_FAMILIES.slice();
  var familyOrder = familyOrderForSection(sectionKey);
  var activeFams = familyOrder.filter(function (fam) {
    return families[fam] && families[fam].length;
  });
  GENERIC_FAMILY_ORDER.forEach(function (fam) {
    if (activeFams.indexOf(fam) >= 0) return;
    if (families[fam] && families[fam].length) activeFams.push(fam);
  });
  return activeFams;
}

function appendEmptyChartsMessage(panelEl) {
  var emptyP = document.createElement('p');
  emptyP.className = 'tend-empty';
  emptyP.style.margin = '12px 0';
  emptyP.style.fontSize = '13px';
  emptyP.style.color = 'var(--text-muted)';
  emptyP.textContent = 'Sin datos para graficar en este estudio.';
  panelEl.appendChild(emptyP);
}

function tendSectionChartSvgIcon() {
  return (
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V9M12 17V5M16 17v-4"/></svg>'
  );
}

function buildPanelToolbar() {
  var toolbar = document.createElement('div');
  toolbar.className = 'patient-card-toolbar tend-group-panel-toolbar';
  toolbar.innerHTML =
    '<div class="patient-card-toolbar-left">' +
    '<button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-copy-svg" title="Copiar gráfica" aria-label="Copiar gráfica como imagen">' +
    tendSectionChartSvgIcon() +
    '</button>' +
    '<button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-eye" title="Ocultar panel" aria-label="Ocultar panel">' +
    tendPanelEyeSvg() +
    '</button>' +
    '<button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-events-toggle" title="Ocultar eventos" aria-label="Ocultar eventos" aria-pressed="false">' +
    tendPanelEventsSvg() +
    '</button>' +
    '</div>' +
    '<span class="tend-group-panel-drag-hint" aria-hidden="true" title="Arrastrar para reordenar">⋮⋮</span>';
  return toolbar;
}

function wirePanelTitle(titleEl, ctx) {
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
    writeGroupPanelTitle(ctx.state.patientId, ctx.sectionKey, ctx.fam, next);
    titleEl.textContent = resolvePanelTitle(ctx.state.patientId, ctx.sectionKey, ctx.fam);
    titleDraft = titleEl.textContent;
    var hiddenNow = readGroupPanelHiddenMigrated(
      ctx.state.patientId,
      ctx.sectionKey,
      migratePanelFamilyKey
    ).filter(function (f) {
      return ctx.activeFams.indexOf(f) >= 0;
    });
    renderPanelsHiddenBar(ctx.panelEl, ctx.deps, ctx.state, ctx.sectionKey, hiddenNow, ctx.renderCharts);
  });
}

function hidePanelFamily(ctx) {
  var h = readGroupPanelHiddenMigrated(ctx.state.patientId, ctx.sectionKey, migratePanelFamilyKey).slice();
  if (h.indexOf(ctx.fam) < 0) h.push(ctx.fam);
  writeGroupPanelHidden(ctx.state.patientId, ctx.sectionKey, h);
  ctx.renderCharts(ctx.sectionKey);
}

function buildChartYScale(fam, datasets) {
  var yBounds = yScaleBoundsForDatasets(datasets, fam);
  var yScale = {
    ticks: {
      font: { size: 11 },
      callback: function (v) {
        var t = formatAxisTickValue(v);
        if (isPercentPanelFamily(fam)) return t ? t + ' %' : '';
        return t;
      },
    },
  };
  if (yBounds.min != null && yBounds.max != null) {
    yScale.min = yBounds.min;
    yScale.max = yBounds.max;
  } else {
    yScale.grace = '5%';
  }
  return yScale;
}

function wireLegendControls(legend, chart, fam, ctx, items, markerMap) {
  legend.querySelectorAll('.tend-group-legend-drag-hint').forEach(function (hint) {
    hint.addEventListener('click', function (ev) {
      ev.preventDefault();
    });
  });
  legend.querySelectorAll('.tend-group-legend-check').forEach(function (inp) {
    inp.addEventListener('change', function () {
      var fk = inp.getAttribute('data-field');
      var dsIdx = chart.data.datasets.findIndex(function (d) {
        return d.fieldKey === fk;
      });
      if (dsIdx < 0) return;
      chart.setDatasetVisibility(dsIdx, inp.checked);
      persistLegendVisible(ctx.state, ctx.sectionKey);
      var cols = rebuildPanelColumns(ctx, items);
      chart.data.labels = cols.axisMeta.labels;
      chart.data.datasets.forEach(function (ds) {
        ds.data = cols.axisMeta.points.map(function (p) {
          var v = getSetTrendValueForSeries(p.set, ctx.sectionKey, ds.fieldKey);
          return v != null && isFinite(v) ? v : null;
        });
      });
      if (markerMap) {
        var fresh = buildEventMarkerMapForSets(cols.colSets, ctx.state.patientId);
        markerMap.indices = fresh.indices;
        markerMap.byIndex = fresh.byIndex;
      }
      applyChartYScale(chart, fam);
      chart.update();
    });
  });
  legend.querySelectorAll('.tend-group-legend-color').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var fk = inp.getAttribute('data-field');
      writeSeriesColor(ctx.sectionKey, fk, inp.value);
      var dsIdx = chart.data.datasets.findIndex(function (d) {
        return d.fieldKey === fk;
      });
      if (dsIdx < 0) return;
      chart.data.datasets[dsIdx].borderColor = inp.value;
      chart.data.datasets[dsIdx].pointBackgroundColor = inp.value;
      chart.update('none');
    });
  });
}

function buildPanelDatasets(ctx, items, axisMeta) {
  var datasets = [];
  var legend = document.createElement('div');
  legend.className = 'tend-group-legend';
  items.forEach(function (item) {
    var fk = item.spec.fieldKey;
    var label = ctx.legendLabelForSpec(ctx.sectionKey, item.spec);
    var color = seriesColor(ctx.sectionKey, fk, item.index);
    var data = axisMeta.points.map(function (p) {
      var v = getSetTrendValueForSeries(p.set, ctx.sectionKey, fk);
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
      fieldKey: fk,
      thresholds: readFieldThresholds(ctx.sectionKey, fk),
    });
    var legItem = document.createElement('label');
    legItem.className = 'tend-group-legend-item';
    legItem.innerHTML =
      '<input type="checkbox" class="tend-group-legend-check" data-field="' +
      fk +
      '"' +
      (isLegendFieldVisible(ctx.state, fk) ? ' checked' : '') +
      '> ' +
      '<input type="color" class="tend-group-legend-color" data-field="' +
      fk +
      '" value="' +
      color +
      '"> ' +
      '<span>' +
      label +
      '</span>' +
      '<span class="tend-group-legend-drag-hint" aria-hidden="true" title="Arrastrar para reordenar">⋮⋮</span>';
    legend.appendChild(legItem);
  });
  return { datasets: datasets, legend: legend };
}

function fieldLabelForItem(ctx, item) {
  return ctx.legendLabelForSpec(ctx.sectionKey, item.spec);
}

function applyThresholdsToChart(chart, fieldKey, thresholds) {
  var dsIdx = chart.data.datasets.findIndex(function (d) {
    return d.fieldKey === fieldKey;
  });
  if (dsIdx < 0) return;
  chart.data.datasets[dsIdx].thresholds = thresholds;
  chart.update('none');
}

function renderThresholdChips(container, ctx, chart, items) {
  container.innerHTML = '';
  items.forEach(function (item) {
    var fk = item.spec.fieldKey;
    var label = fieldLabelForItem(ctx, item);
    readFieldThresholds(ctx.sectionKey, fk).forEach(function (t) {
      var chip = document.createElement('span');
      chip.className = 'tend-group-threshold-chip';
      chip.textContent = label + ': ' + (t.label ? t.label + ' ' : '') + t.value;
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'tend-group-threshold-chip-remove';
      rm.setAttribute('aria-label', 'Quitar umbral');
      rm.textContent = '×';
      rm.onclick = function () {
        var next = readFieldThresholds(ctx.sectionKey, fk).filter(function (x) {
          return !(x.value === t.value && x.label === t.label);
        });
        writeFieldThresholds(ctx.sectionKey, fk, next);
        applyThresholdsToChart(chart, fk, next);
        renderThresholdChips(container, ctx, chart, items);
      };
      chip.appendChild(rm);
      container.appendChild(chip);
    });
  });
}

function buildThresholdControls(ctx, chart, items) {
  var row = document.createElement('div');
  row.className = 'tend-group-threshold-row';

  var toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'tend-toolbar-btn tend-group-threshold-add-btn';
  toggleBtn.textContent = '+ Umbral';

  var form = document.createElement('div');
  form.className = 'tend-group-threshold-form';
  form.hidden = true;

  var fieldSelect = document.createElement('select');
  fieldSelect.className = 'tend-group-threshold-field-select';
  items.forEach(function (item) {
    var opt = document.createElement('option');
    opt.value = item.spec.fieldKey;
    opt.textContent = fieldLabelForItem(ctx, item);
    fieldSelect.appendChild(opt);
  });

  var valueInput = document.createElement('input');
  valueInput.type = 'number';
  valueInput.step = 'any';
  valueInput.placeholder = 'Valor';
  valueInput.className = 'tend-group-threshold-value-input';

  var labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.placeholder = 'Etiqueta (opcional)';
  labelInput.className = 'tend-group-threshold-label-input';

  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'tend-toolbar-btn tend-group-threshold-submit-btn';
  addBtn.textContent = 'Agregar';

  form.appendChild(fieldSelect);
  form.appendChild(valueInput);
  form.appendChild(labelInput);
  form.appendChild(addBtn);

  var chips = document.createElement('div');
  chips.className = 'tend-group-threshold-chips';
  renderThresholdChips(chips, ctx, chart, items);

  toggleBtn.onclick = function () {
    form.hidden = !form.hidden;
    if (!form.hidden) valueInput.focus();
  };

  addBtn.onclick = function () {
    var val = parseFloat(String(valueInput.value).replace(',', '.'));
    if (!isFinite(val)) {
      valueInput.focus();
      return;
    }
    var fk = fieldSelect.value;
    var next = readFieldThresholds(ctx.sectionKey, fk)
      .concat([{ value: val, label: labelInput.value.trim() }])
      .sort(function (a, b) {
        return a.value - b.value;
      });
    writeFieldThresholds(ctx.sectionKey, fk, next);
    applyThresholdsToChart(chart, fk, next);
    valueInput.value = '';
    labelInput.value = '';
    renderThresholdChips(chips, ctx, chart, items);
  };

  row.appendChild(toggleBtn);
  row.appendChild(form);
  row.appendChild(chips);
  return row;
}

function createPanelChart(canvas, chartLabels, datasets, fam, ctx, markerMap) {
  var yScale = buildChartYScale(fam, datasets);
  var eventPlugin = createTendEventMarkerPlugin(markerMap, { compact: false });
  var thresholdPlugin = createTendThresholdPlugin();
  return new ctx.deps.Chart(canvas, {
    type: 'line',
    plugins: [eventPlugin, thresholdPlugin],
    data: { labels: chartLabels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),
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
            label: function (tipCtx) {
              var ds = tipCtx.dataset;
              var spec = ctx.state.specsByField[ds.fieldKey];
              if (!spec) return ds.label || '';
              return formatTooltipLine(ctx.deps, ctx.sectionKey, spec, tipCtx.parsed.y);
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            font: { size: 11 },
            autoSkip: true,
            maxTicksLimit: 12,
          },
        },
        y: yScale,
      },
    },
  });
}

function appendPanelEmptyMessage(block, items) {
  var emptyP = document.createElement('p');
  emptyP.className = 'tend-empty';
  emptyP.style.margin = '8px 0 0';
  emptyP.style.fontSize = '13px';
  emptyP.style.color = 'var(--text-muted)';
  emptyP.textContent = items.length
    ? 'Sin puntos temporales para este panel.'
    : 'Ningún analito de este panel tiene 2 o más laboratorios. Procesa otro BH o activa BH extendida en Resultados.';
  block.appendChild(emptyP);
}

function renderPanelFamilyCard(fam, ctx) {
  var block = document.createElement('section');
  block.className = 'tend-group-panel-card tend-group-panel-family patient-card';
  block.setAttribute('data-panel-family', fam);

  var toolbar = buildPanelToolbar();
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
  titleEl.textContent = resolvePanelTitle(ctx.state.patientId, ctx.sectionKey, fam);
  var panelCtx = Object.assign({ fam: fam }, ctx);
  wirePanelTitle(titleEl, panelCtx);
  block.appendChild(titleEl);

  toolbar.querySelector('.tend-group-panel-eye').onclick = function (ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    hidePanelFamily(panelCtx);
  };

  var chartWrap = document.createElement('div');
  chartWrap.className = 'tend-group-chart-wrap';
  var canvas = document.createElement('canvas');
  chartWrap.appendChild(canvas);
  block.appendChild(chartWrap);

  var items = orderLegendItems(
    ctx.state,
    ctx.sectionKey,
    fam,
    (ctx.families[fam] || []).filter(function (item) {
      return specHasTrendPoints(ctx.state, ctx.sectionKey, item.spec.fieldKey);
    })
  );
  var cols = rebuildPanelColumns(ctx, items);
  var colSets = cols.colSets;
  if (!colSets.length || !items.length) {
    appendPanelEmptyMessage(block, items);
    ctx.sortZone.appendChild(block);
    return;
  }

  var axisMeta = cols.axisMeta;
  var chartLabels = axisMeta.labels;
  var markerMap = buildEventMarkerMapForSets(colSets, ctx.state.patientId);
  var built = buildPanelDatasets(ctx, items, axisMeta);
  block.appendChild(built.legend);
  ctx.sortZone.appendChild(block);
  mountLegendSortable(built.legend, ctx.state, ctx.sectionKey, fam);

  try {
    var chart = createPanelChart(canvas, chartLabels, built.datasets, fam, ctx, markerMap);
    chart._tendFamily = fam;
    chart._tendEventsHidden = isPanelEventsHidden(ctx.state.patientId, ctx.sectionKey, fam);
    chart.data.datasets.forEach(function (ds, dsIdx) {
      chart.setDatasetVisibility(dsIdx, isLegendFieldVisible(ctx.state, ds.fieldKey));
    });
    applyChartYScale(chart, fam);
    chart.update();
    ctx.state.charts.push(chart);
    wireLegendControls(built.legend, chart, fam, ctx, items, markerMap);
    block.appendChild(buildThresholdControls(ctx, chart, items));
    var eventsToggleBtn = toolbar.querySelector('.tend-group-panel-events-toggle');
    var syncEventsToggleBtn = function () {
      var hidden = !!chart._tendEventsHidden;
      eventsToggleBtn.setAttribute('aria-pressed', hidden ? 'true' : 'false');
      eventsToggleBtn.classList.toggle('patient-toolbar-chip--on', hidden);
      eventsToggleBtn.title = hidden ? 'Mostrar eventos' : 'Ocultar eventos';
      eventsToggleBtn.setAttribute('aria-label', eventsToggleBtn.title);
    };
    syncEventsToggleBtn();
    eventsToggleBtn.onclick = function (ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      chart._tendEventsHidden = togglePanelEventsHidden(ctx.state.patientId, ctx.sectionKey, fam);
      syncEventsToggleBtn();
      chart.update();
    };
    toolbar.querySelector('.tend-group-panel-copy-svg').onclick = function (ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      var title = resolvePanelTitle(ctx.state.patientId, ctx.sectionKey, fam);
      copyChartPng(chart, title, visibleDatasetsForChart(chart), function (ok) {
        if (ctx.deps.showToast) ctx.deps.showToast(ok ? 'Gráfica copiada ✓' : 'No se pudo copiar la gráfica', ok ? 'success' : 'error');
      });
    };
  } catch (chartErr) {
    console.error('tend-group chart', fam, chartErr);
    chartWrap.innerHTML =
      '<p class="tend-empty" style="margin:12px 0;font-size:13px;color:var(--error);">No se pudo dibujar este panel.</p>';
  }
}

export function renderGroupCharts(deps, state, sectionKey, legendLabelForSpec, panelSortableRef, renderCharts) {
  var panelEl = document.getElementById('tend-group-panel-charts');
  if (!panelEl) return;
  destroyCharts(state);
  if (panelSortableRef.current) {
    try {
      if (typeof panelSortableRef.current.destroy === 'function') panelSortableRef.current.destroy();
    } catch (_e) { void _e; }
    panelSortableRef.current = null;
  }
  panelEl.innerHTML = '';

  var catalogSpecs = catalogSpecsForCharts(deps, state, sectionKey);
  var families = buildFamiliesMap(deps, state, sectionKey, catalogSpecs);
  var activeFams = resolveActiveFamilies(sectionKey, families);
  if (!activeFams.length) {
    appendEmptyChartsMessage(panelEl);
    renderPanelsHiddenBar(panelEl, deps, state, sectionKey, [], renderCharts);
    return;
  }

  var hiddenFams = readGroupPanelHiddenMigrated(state.patientId, sectionKey, migratePanelFamilyKey).filter(
    function (fam) {
      return activeFams.indexOf(fam) >= 0;
    }
  );
  var orderedFams = orderPanelFamilies(activeFams, readGroupPanelOrder(state.patientId, sectionKey), sectionKey);
  var visibleFams = orderedFams.filter(function (fam) {
    return hiddenFams.indexOf(fam) < 0;
  });

  renderPanelsHiddenBar(panelEl, deps, state, sectionKey, hiddenFams, renderCharts);

  var sortZone = document.createElement('div');
  sortZone.id = 'tend-group-panels-sortable';
  sortZone.className = 'tend-group-sort-zone patient-sort-zone';
  panelEl.appendChild(sortZone);

  var cardCtx = {
    deps: deps,
    state: state,
    sectionKey: sectionKey,
    legendLabelForSpec: legendLabelForSpec,
    panelEl: panelEl,
    activeFams: activeFams,
    families: families,
    sortZone: sortZone,
    renderCharts: renderCharts,
  };
  visibleFams.forEach(function (fam) {
    renderPanelFamilyCard(fam, cardCtx);
  });

  mountPanelSortable(state, sectionKey, panelSortableRef);
}

export function destroyGroupCharts(state, panelSortableRef) {
  destroyCharts(state);
  if (panelSortableRef.current) {
    try {
      if (typeof panelSortableRef.current.destroy === 'function') panelSortableRef.current.destroy();
    } catch (_e) { void _e; }
    panelSortableRef.current = null;
  }
}
