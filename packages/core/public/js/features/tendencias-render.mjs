import {
  buildTrendSeriesIndexCached,
  getLabHistoryRevision,
  TREND_SPARK_WINDOW,
} from '../lab-history-cache.mjs';
import { readTendCardOrder } from '../tend-prefs.mjs';
import { syncTendPaneAfterRender } from '../tend-pane.mjs';
import { getSetTrendValueForSeries, buildTendChartLabels } from '../tend-core.mjs';
import { TEND_SECTION_ORDER } from './tendencias-constants.mjs';
import { syncAbgLabPrefRowVisibility, isAbgAnalysisHidden } from './tendencias-lab-prefs.mjs';
import { tendAbnormalOnlyRead, tendHiddenSeriesRead, tendSectionIsExpanded, tendRefForSeries } from './tendencias-series.mjs';
import * as tc from './tendencias-core.mjs';
import { drawTendGrid, drawTendNote, drawTendSkeleton } from './tendencias-render-view.jsx';
import { tendSectionModel, tendSummaryModel } from './tendencias-grid-model.mjs';

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
  drawTendNote(container, null, { text: message });
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

function renderTendenciasEmptyState(container, toolbar, mergedCatalog, seriesIndex, abnormalOnly, seriesAvailFull) {
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
  var kind = abnormalOnly && seriesAvailFull.length ? 'abnormal' : hiddenAll ? 'hidden' : 'nodata';
  drawTendNote(container, toolbar, { kind: kind });
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

function paintTendenciasGrid(container, toolbar, sectionsOrdered, bySection, seriesIndex, seriesAvail, historyDesc, summary) {
  var sections = sectionsOrdered.map(function (sectionKey) {
    var list = tc.orderTrendSeriesBySaved(bySection[sectionKey], readTendCardOrder(tc.aid(), sectionKey));
    return tendSectionModel(sectionKey, list, seriesIndex, tc.tendSectionIsExpanded(sectionKey));
  });
  var prevScroll = container.scrollTop;
  drawTendGrid(container, { toolbar: toolbar, summary: summary, sections: sections });
  if (prevScroll) container.scrollTop = prevScroll;
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
    gaso: !isAbgAnalysisHidden() && tc.historyHasGasoForExtended(historyDesc),
    total: avail.seriesAvailFull.length,
    oor: oorTotal,
    on: abnormalOnly,
  };
  var toolbar = tc.tendToolbarModel(hiddenChipN, toolbarOpts);
  if (!avail.seriesAvail.length) {
    renderTendenciasEmptyState(
      container,
      toolbar,
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
    toolbar,
    sectionsOrdered,
    bySection,
    seriesIndex,
    avail.seriesAvail,
    historyDesc,
    tendSummaryModel(historyDesc, oorTotal, avail.seriesAvailFull.length)
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
      drawTendNote(container, null, { text: 'No se pudieron cargar las tendencias. Revisa la consola (F12) o recarga la app.' });
    }
    syncTendPaneAfterRender();
    if (onReady) onReady();
  };

  if (opts.syncHeavy) {
    paint();
    return;
  }

  if (!container.querySelector('.tend-rows, .tend-toolbar, .tend-empty')) {
    drawTendSkeleton(container, 4);
  }
  // Not scheduleAfterPaint: tab/patient switches cancel it, which left the skeleton stuck and onReady unfired.
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(function () {
      requestAnimationFrame(paint);
    });
  } else setTimeout(paint, 0);
}

export { renderTendencias };
