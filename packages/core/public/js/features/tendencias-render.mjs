import { scheduleAfterPaint } from '../deferred-work.mjs';
import { buildTextSkeletonPanel } from '../ui-skeleton.mjs';
import {
  buildTrendSeriesIndexCached,
  getLabHistoryRevision,
  TREND_SPARK_WINDOW,
} from '../lab-history-cache.mjs';
import { readTendCardOrder } from '../tend-prefs.mjs';
import { syncTendPaneAfterRender } from '../tend-pane.mjs';
import { getSetTrendValueForSeries, buildTendChartLabels, parseFechaLabToMs } from '../tend-core.mjs';
import { getTendSectionLabel, TEND_SECTION_ORDER } from './tendencias-constants.mjs';
import { syncAbgLabPrefRowVisibility, isAbgAnalysisHidden } from './tendencias-lab-prefs.mjs';
import { tendAbnormalOnlyRead, tendHiddenSeriesRead, tendSectionIsExpanded, tendRefForSeries } from './tendencias-series.mjs';
import * as tc from './tendencias-core.mjs';
import {
  buildTendStatusHtml,
  buildTendChangeHtml,
  tendRangeText,
  previousValueFromSetsDesc,
} from './tendencias-insight.mjs';

function buildTendRenderKey(patientId, revision, prefsHash, sectionsExpanded) {
  return [patientId, revision, prefsHash, sectionsExpanded].join('::');
}

function tendPrefsHash() {
  return String(tendAbnormalOnlyRead()) + '|' + String(tendHiddenSeriesRead().join(','));
}

function tendExpandedSectionsKey() {
  return TEND_SECTION_ORDER.filter(function (sk) {
    return tendSectionIsExpanded(sk);
  }).join(',');
}

function resetTendRenderEmpty(container, message) {
  tc.tendStore._tendRenderState.key = null;
  tc.tendStore._tendRenderState.seriesKeys = [];
  tc.closeTendHiddenModal();
  container.innerHTML = '<p class="tend-empty">' + message + '</p>';
}

function collectSeriesAvailability(mergedCatalog, seriesIndex, abnormalOnly) {
  var seriesAvail = [];
  for (var ci = 0; ci < mergedCatalog.length; ci++) {
    var sp = mergedCatalog[ci];
    if (tc.tendSeriesIsUserHidden(sp.sectionKey, sp.fieldKey)) continue;
    var idxAvail = seriesIndex[tc.tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
    if (!idxAvail || idxAvail.setsDesc.length < 2) continue;
    seriesAvail.push(sp);
  }
  var full = seriesAvail.slice();
  if (abnormalOnly) {
    seriesAvail = seriesAvail.filter(function (sp) {
      var idxAb = seriesIndex[tc.tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
      return idxAb && idxAb.isAbnormal;
    });
  }
  return { seriesAvail: seriesAvail, seriesAvailFull: full };
}

function renderTendenciasEmptyState(container, toolbarHtml, mergedCatalog, seriesIndex, abnormalOnly, seriesAvailFull) {
  var anyData = mergedCatalog.some(function (sp) {
    var idxAny = seriesIndex[tc.tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
    return idxAny && idxAny.setsDesc.length >= 2;
  });
  var hiddenAll =
    anyData &&
    !mergedCatalog.some(function (sp) {
      if (tc.tendSeriesIsUserHidden(sp.sectionKey, sp.fieldKey)) return false;
      var idxVis = seriesIndex[tc.tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
      return idxVis && idxVis.setsDesc.length >= 2;
    });
  if (abnormalOnly && seriesAvailFull.length) {
    container.innerHTML =
      toolbarHtml +
      '<p class="tend-empty">Ningún analito está fuera de rango de referencia (o no tiene referencia en el reporte). Pulsa <strong>Todos</strong> para volver a la vista completa.</p>';
  } else if (hiddenAll) {
    container.innerHTML =
      toolbarHtml +
      '<p class="tend-empty">Los analitos con datos están <strong>ocultos</strong>. Pulsa <strong>Ocultos</strong> y restaura con el ojo o <strong>Mostrar todos</strong>.</p>';
  } else {
    container.innerHTML =
      toolbarHtml + '<p class="tend-empty">No hay parámetros con suficientes datos para graficar.</p>';
  }
  tc.syncTendHiddenModalIfOpen();
}

function orderTendSections(bySection) {
  var sectionsOrdered = [];
  for (var oi = 0; oi < TEND_SECTION_ORDER.length; oi++) {
    var sec = TEND_SECTION_ORDER[oi];
    if (bySection[sec] && bySection[sec].length) sectionsOrdered.push(sec);
  }
  Object.keys(bySection).forEach(function (sec) {
    if (sectionsOrdered.indexOf(sec) === -1) sectionsOrdered.push(sec);
  });
  return sectionsOrdered;
}

function buildTendPatchJobs(seriesAvail, seriesIndex) {
  var patchJobs = [];
  for (var pj = 0; pj < seriesAvail.length; pj += 1) {
    var spP = seriesAvail[pj];
    var skP = spP.sectionKey;
    var fkP = spP.fieldKey;
    if (!tc.tendSectionIsExpanded(skP)) continue;
    var idxP = seriesIndex[tc.tendCatalogSeriesKey(skP, fkP)];
    if (!idxP || !idxP.setsDesc.length) continue;
    var sparkDescP = idxP.setsDesc.slice(0, TREND_SPARK_WINDOW);
    var setsAscP = tc.toTrendAscendingSets(sparkDescP);
    patchJobs.push({
      sk2: skP,
      fk2: fkP,
      setsDesc2: sparkDescP,
      labels2: buildTendChartLabels(setsAscP),
      values2: setsAscP.map(function (s) {
        return getSetTrendValueForSeries(s, skP, fkP);
      }),
      ref: idxP.ref || null,
    });
  }
  return patchJobs;
}

function tryPatchTendenciasDom(container, seriesAvail, seriesIndex, historyDesc, renderKey, nextSeriesKeys) {
  var canPatch =
    tc.tendStore._tendRenderState.key === renderKey &&
    tc.tendStore._tendRenderState.seriesKeys.length === nextSeriesKeys.length &&
    tc.tendStore._tendRenderState.seriesKeys.every(function (k, i) {
      return k === nextSeriesKeys[i];
    }) &&
    container.querySelector('.tend-rows');
  if (!canPatch || !tc.patchTendRowsFromIndex(seriesIndex, seriesAvail)) return false;
  tc.updateSparkChartsFromJobs(buildTendPatchJobs(seriesAvail, seriesIndex), historyDesc);
  tc.syncTendHiddenModalIfOpen();
  return true;
}

function buildTendenciaRowHtml(sectionKey, spec, seriesIndex, expanded) {
  var specFk = spec.fieldKey;
  var idxRow = seriesIndex[tc.tendCatalogSeriesKey(sectionKey, specFk)];
  var latest = idxRow ? idxRow.latest : null;
  var isAb = idxRow ? idxRow.isAbnormal : false;
  var ref = idxRow ? idxRow.ref : null;
  var domId = tc.trendSparkDomId(sectionKey, specFk);
  var labelParts = tc.tendCardLabelParts(sectionKey, specFk);
  var unitHtml = labelParts.unit
    ? '<span class="tend-unit">' + tc.esc(labelParts.unit) + '</span>'
    : '';
  var seriesKey = tc.tendCatalogSeriesKey(sectionKey, specFk);
  var prev = idxRow
    ? previousValueFromSetsDesc(idxRow.setsDescFull || idxRow.setsDesc, sectionKey, specFk, getSetTrendValueForSeries)
    : null;
  return (
    '<div class="tend-row" data-series-key="' +
    tc.esc(seriesKey) +
    '" data-abnormal="' +
    (isAb ? '1' : '0') +
    '">' +
    // Visible only while the pivot pane is open (CSS); state comes from the pivot module.
    '<input type="checkbox" class="tend-tick tend-row-tick" aria-label="Agregar ' +
    tc.esc(labelParts.title) +
    ' a la tabla">' +
    '<span class="tend-row-name"><span class="tend-param-name">' +
    tc.esc(labelParts.title) +
    // One real button opens the row; its ::after covers the row (.card-open-btn).
    '<button type="button" class="tend-row-open card-open-btn" aria-label="Ver tendencia de ' +
    tc.esc(labelParts.title) +
    '"></button></span>' +
    unitHtml +
    '</span>' +
    '<span class="tend-param-value' +
    (isAb ? ' tend-abnormal' : '') +
    '">' +
    (latest != null ? latest : '—') +
    '</span>' +
    '<span class="tend-row-status">' +
    buildTendStatusHtml(tc.esc, latest, ref) +
    '</span>' +
    '<span class="tend-row-range">' +
    tc.esc(tendRangeText(ref)) +
    '</span>' +
    '<span class="tend-row-change">' +
    buildTendChangeHtml(tc.esc, latest, prev, isAb, ref) +
    '</span>' +
    '<span class="tend-spark-wrap"><span class="tend-spark-canvas-cell">' +
    (expanded
      ? '<canvas id="' + domId + '"></canvas>'
      : '<span class="tend-spark-placeholder" aria-hidden="true"></span>') +
    '</span></span>' +
    '<button type="button" class="tend-row-hide-btn" title="Ocultar analito" aria-label="Ocultar ' +
    tc.esc(labelParts.title) +
    '">' +
    tc.tendEyeHideSvg() +
    '</button></div>'
  );
}

function countAbnormalInList(list, seriesIndex, sectionKey) {
  return list.filter(function (spec) {
    var i = seriesIndex[tc.tendCatalogSeriesKey(sectionKey, spec.fieldKey)];
    return i && i.isAbnormal;
  }).length;
}

function buildTendenciaSectionHtml(sectionKey, list, seriesIndex) {
  var expanded = tc.tendSectionIsExpanded(sectionKey);
  var secLabel = getTendSectionLabel(sectionKey);
  var rowParts = list.map(function (spec) {
    return buildTendenciaRowHtml(sectionKey, spec, seriesIndex, expanded);
  });
  var oor = countAbnormalInList(list, seriesIndex, sectionKey);
  return (
    '<section class="tend-section" data-section="' +
    tc.esc(sectionKey) +
    '"><div class="tend-section-head">' +
    '<button type="button" class="tend-section-toggle" aria-expanded="' +
    (expanded ? 'true' : 'false') +
    '" aria-label="' +
    (expanded ? 'Contraer ' : 'Expandir ') +
    tc.esc(secLabel) +
    '"><span class="tend-section-chevron" aria-hidden="true">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
    '</span><span class="tend-section-title">' +
    tc.esc(secLabel) +
    '</span></button><span class="tend-section-count">' +
    list.length +
    (list.length === 1 ? ' analito' : ' analitos') +
    '</span>' +
    (oor
      ? '<span class="tend-oor-pill">' + oor + ' fuera de rango</span>'
      : '') +
    '<span class="tend-head-spacer"></span>' +
    (list.length > 0
      ? '<button type="button" class="tend-section-chart-btn" title="Abrir gráfica y tabla del estudio" aria-label="Gráfica de ' +
        tc.esc(secLabel) +
        '">' +
        tc.tendSectionChartSvg() +
        '<span class="tend-section-chart-label">Gráfica</span></button>'
      : '') +
    '</div><div class="tend-section-body' +
    (expanded ? '' : ' tend-section-body--collapsed') +
    '">' +
    TEND_COLS_HTML +
    '<div class="tend-rows tend-sort-zone" data-section-key="' +
    tc.esc(sectionKey) +
    '">' +
    rowParts.join('') +
    '</div></div></section>'
  );
}

var TEND_MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fmtTendDay(set, withYear) {
  var ms = set ? parseFechaLabToMs(set.fecha, set.hora) : null;
  if (typeof ms !== 'number' || !isFinite(ms)) return null;
  var d = new Date(ms);
  return d.getDate() + ' ' + TEND_MES[d.getMonth()] + (withYear ? ' ' + d.getFullYear() : '');
}

function buildTendSummaryHtml(historyDesc, oorN, totalN) {
  var latestDay = fmtTendDay(historyDesc[0], true);
  var prevDay = fmtTendDay(historyDesc[1], false);
  return (
    '<p class="tend-summary">' +
    (latestDay ? tc.esc(latestDay) + ' · ' : '') +
    (oorN ? '<b class="tend-summary-oor">' + oorN + ' fuera de rango</b>' : '0 fuera de rango') +
    ' de ' +
    totalN +
    ' · el cambio compara con ' +
    (prevDay ? 'el ' + tc.esc(prevDay) : 'la toma anterior') +
    '</p>'
  );
}

var TEND_COLS_HTML =
  '<div class="tend-cols" aria-hidden="true"><span>Analito</span><span>Último</span><span>Estado</span><span>Rango</span><span>Cambio</span><span>Últimos 5 días</span><span></span></div>';

function paintTendenciasGrid(container, toolbarHtml, sectionsOrdered, bySection, seriesIndex, seriesAvail, historyDesc, summaryHtml) {
  var htmlParts = [toolbarHtml, summaryHtml];
  for (var si = 0; si < sectionsOrdered.length; si++) {
    var sectionKey = sectionsOrdered[si];
    var list = tc.orderTrendSeriesBySaved(bySection[sectionKey], readTendCardOrder(tc.aid(), sectionKey));
    htmlParts.push(buildTendenciaSectionHtml(sectionKey, list, seriesIndex));
  }
  htmlParts.push('<p class="tend-empty tend-search-empty" hidden>Ningún analito coincide con la búsqueda.</p>');
  container.innerHTML = htmlParts.join('');
  tc.buildSparkJobsFromIndex(seriesAvail, seriesIndex, historyDesc, tc.sparkChartAnim(600));
}

function renderTendenciasBody(container) {
  tc.destroyTendCardSortables();
  // Invalidate in-flight spark rAF batches before tearing down canvases.
  tc.tendStore.sparkMountGen += 1;
  Object.keys(tc.tendStore.sparkCharts).forEach(function (k) {
    tc.destroySparkChartEntry(k);
  });
  if (!tc.aid()) {
    resetTendRenderEmpty(container, 'Selecciona un paciente.');
    return;
  }
  var historyDesc = tc.tendParsedHistoryDesc(tc.aid());
  if (historyDesc.length < 2) {
    resetTendRenderEmpty(container, 'Agrega al menos 2 sets de laboratorio para ver tendencias.');
    return;
  }
  var mergedCatalog = tc.buildMergedTrendSeriesCatalog(historyDesc);
  var indexCacheKey =
    String(tc.aid()) +
    '|' +
    getLabHistoryRevision(tc.aid()) +
    '|' +
    mergedCatalog.length +
    '|' +
    historyDesc.length;
  var seriesIndex = buildTrendSeriesIndexCached(indexCacheKey, {
    catalogSpecs: mergedCatalog,
    historyFullDesc: historyDesc,
    tendRefForSeries: tendRefForSeries,
  });
  tc.tendStore._tendRenderState.seriesIndex = seriesIndex;
  var abnormalOnly = tc.tendAbnormalOnlyRead();
  var avail = collectSeriesAvailability(mergedCatalog, seriesIndex, abnormalOnly);
  tc.tendStore._tendRenderState.seriesAvail = avail.seriesAvail;
  var hiddenChipN = tc.tendHiddenChipDescriptors().length;
  var oorTotal = avail.seriesAvailFull.filter(function (sp) {
    var ia = seriesIndex[tc.tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
    return ia && ia.isAbnormal;
  }).length;
  var toolbarOpts = {
    showGasoExtended: !isAbgAnalysisHidden() && tc.historyHasGasoForExtended(historyDesc),
    totalCount: avail.seriesAvailFull.length,
    abnormalCount: oorTotal,
  };
  var toolbarHtml = tc.buildTendInlineControlsHtml(hiddenChipN, toolbarOpts);
  if (!avail.seriesAvail.length) {
    renderTendenciasEmptyState(
      container,
      toolbarHtml,
      mergedCatalog,
      seriesIndex,
      abnormalOnly,
      avail.seriesAvailFull
    );
    return;
  }
  var bySection = Object.create(null);
  avail.seriesAvail.forEach(function (spec) {
    var k = spec.sectionKey;
    if (!bySection[k]) bySection[k] = [];
    bySection[k].push(spec);
  });
  var sectionsOrdered = orderTendSections(bySection);
  var renderKey = buildTendRenderKey(
    tc.aid(),
    getLabHistoryRevision(tc.aid()),
    tendPrefsHash(),
    tendExpandedSectionsKey()
  );
  var nextSeriesKeys = avail.seriesAvail.map(function (sp) {
    return tc.tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
  });
  if (tryPatchTendenciasDom(container, avail.seriesAvail, seriesIndex, historyDesc, renderKey, nextSeriesKeys)) {
    return;
  }
  tc.tendStore._tendRenderState.key = renderKey;
  tc.tendStore._tendRenderState.seriesKeys = nextSeriesKeys;
  paintTendenciasGrid(
    container,
    toolbarHtml,
    sectionsOrdered,
    bySection,
    seriesIndex,
    avail.seriesAvail,
    historyDesc,
    buildTendSummaryHtml(historyDesc, oorTotal, avail.seriesAvailFull.length)
  );
}

function renderTendencias(opts) {
  opts = opts || {};
  var onReady = typeof opts.onReady === 'function' ? opts.onReady : null;
  syncAbgLabPrefRowVisibility();
  var container = document.getElementById('tendencias-container');
  if (!container) {
    if (onReady) onReady();
    return;
  }
  tc.ensureTendenciasClickDelegation();

  var paint = function () {
    try {
      renderTendenciasBody(container);
    } catch (err) {
      console.error('[R+ Tendencias] Error al renderizar:', err);
      container.innerHTML =
        '<p class="tend-empty">No se pudieron cargar las tendencias. Revisa la consola (F12) o recarga la app.</p>';
    }
    syncTendPaneAfterRender();
    if (onReady) onReady();
  };

  if (opts.syncHeavy) {
    paint();
    return;
  }

  if (!container.querySelector('.tend-rows, .tend-toolbar, .tend-empty')) {
    container.innerHTML = buildTextSkeletonPanel('tend-skeleton skel-panel', 4);
  }
  scheduleAfterPaint(paint);
}

export { renderTendencias };
