// Sections (expand/collapse + spark mount) and hidden-series prefs for Tendencias.
// Also re-exports the catalog (stable import path for spark/render/core).
import { TREND_SPARK_WINDOW } from '../lab-history-cache.mjs';
import { dedupeTrendSetsForSeries, getSetTrendValueForSeries, buildTendChartLabels } from '../tend-core.mjs';
import { scheduleIdle } from '../deferred-work.mjs';
import { loadChartJs } from '../vendor-loader.mjs';
import { openLabDisplayPrefsModal, closeLabDisplayPrefsModal, onLabDisplayPrefsChanged } from './tendencias-lab-prefs.mjs';
import { TEND_SERIES_CATALOG } from './tendencias-constants.mjs';
import { tendenciasBridge } from './tendencias-bridge.mjs';
import { drawTendHiddenChips, updateTendGrid } from './tendencias-render-view.jsx';
import { gridWithSectionExpanded } from './tendencias-grid-model.mjs';
import { tendStore } from './tendencias-state.mjs';
import { destroySparkChartEntry, sparkChartAnim, mountOneTrendSparkChart } from './tendencias-spark.mjs';
import {
  toTrendAscendingSets,
  tendCatalogSeriesKey,
  tendFindSeriesSpec,
  tendRefForSeries,
} from './tendencias-catalog.mjs';

export {
  toTrendAscendingSets,
  tendCardLabelParts,
  tendUnitForSeries,
  tendRefOrientative,
  tendRefFromLabSet,
  tendRefForSeries,
  tendParsedHistoryDesc,
  tendCatalogSeriesKey,
  orderTrendSeriesBySaved,
  tendFindSeriesSpec,
  buildMergedTrendSeriesCatalog,
  getTendCatalogSpecsForSection,
  getTendSectionLabel,
} from './tendencias-catalog.mjs';

var TEND_SECTION_EXPANDED_LS = 'rpc-tend-sections-expanded';
// Last written value wins in this session even when storage refuses the write (quota).
var _sectionExpandedMem = null;
var _hiddenSeriesMem = null;

function tendSectionExpandedRead() {
  if (_sectionExpandedMem) return Object.assign({}, _sectionExpandedMem);
  try {
    var raw = localStorage.getItem(TEND_SECTION_EXPANDED_LS);
    if (!raw) return {};
    var o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function tendSectionExpandedWrite(map) {
  _sectionExpandedMem = Object.assign({}, map || {});
  try {
    localStorage.setItem(TEND_SECTION_EXPANDED_LS, JSON.stringify(map || {}));
  } catch (e) { console.warn('[tendencias-sections] failed to write ' + TEND_SECTION_EXPANDED_LS, e); }
}

/** @param {string} sectionKey */
function tendSectionIsExpanded(sectionKey) {
  var m = tendSectionExpandedRead();
  if (!Object.prototype.hasOwnProperty.call(m, sectionKey)) return true;
  return m[sectionKey] !== false;
}

function destroySparkChartsForSection(sectionKey) {
  var prefix = String(sectionKey) + '\x01';
  Object.keys(tendStore.sparkCharts).forEach(function (ck) {
    if (!ck.startsWith(prefix)) return;
    destroySparkChartEntry(ck);
  });
}

function mountSectionSparkCharts(sectionKey, history, chartAnim) {
  var seriesIndex = tendStore._tendRenderState.seriesIndex;
  var seriesAvail = tendStore._tendRenderState.seriesAvail;
  if (!seriesIndex || !seriesAvail) return;
  var jobs = [];
  for (var i = 0; i < seriesAvail.length; i += 1) {
    var spec = seriesAvail[i];
    if (spec.sectionKey !== sectionKey) continue;
    var sk2 = spec.sectionKey;
    var fk2 = spec.fieldKey;
    var idx = seriesIndex[tendCatalogSeriesKey(sk2, fk2)];
    if (!idx || !idx.setsDesc.length) continue;
    var sparkDesc = idx.setsDesc.slice(0, TREND_SPARK_WINDOW);
    var setsAsc2 = toTrendAscendingSets(sparkDesc);
    jobs.push({
      sk2: sk2,
      fk2: fk2,
      setsDesc2: sparkDesc,
      labels2: buildTendChartLabels(setsAsc2),
      values2: setsAsc2.map(function (s) {
        return getSetTrendValueForSeries(s, sk2, fk2);
      }),
      ref: idx.ref || null,
    });
  }
  if (!jobs.length) return;
  var mountGen = tendStore.sparkMountGen;
  void loadChartJs().then(function (Chart) {
    if (mountGen !== tendStore.sparkMountGen) return;
    var jobIndex = 0;
    var SPARK_BATCH = 8;
    function runBatch() {
      if (mountGen !== tendStore.sparkMountGen) return;
      var end = Math.min(jobIndex + SPARK_BATCH, jobs.length);
      for (; jobIndex < end; jobIndex += 1) {
        mountOneTrendSparkChart(jobs[jobIndex], history, chartAnim, Chart, mountGen);
      }
      if (jobIndex < jobs.length) scheduleIdle(runBatch, 24);
    }
    runBatch();
  });
}

function applyTendSectionExpandedState(sectionKey, expanded) {
  if (!expanded) destroySparkChartsForSection(sectionKey);
  var redrawn = updateTendGrid(function (model) {
    return gridWithSectionExpanded(model, sectionKey, expanded);
  });
  if (!redrawn) {
    tendenciasBridge.renderTendencias();
    return;
  }
  if (expanded) mountSectionSparkCharts(sectionKey, null, sparkChartAnim(400));
}

function toggleTendSection(ev, sectionKey) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var m = tendSectionExpandedRead();
  var cur = tendSectionIsExpanded(sectionKey);
  var next = !cur;
  m[sectionKey] = next;
  tendSectionExpandedWrite(m);

  var container = document.getElementById('tendencias-container');
  var sectionEl =
    container &&
    container.querySelector('.tend-section[data-section="' + String(sectionKey).replace(/"/g, '\\"') + '"]');
  if (sectionEl && container.querySelector('.tend-rows') && tendStore._tendRenderState.seriesIndex) {
    applyTendSectionExpandedState(sectionKey, next);
    return;
  }
  tendenciasBridge.renderTendencias();
}

export {
  tendSectionExpandedRead,
  tendSectionExpandedWrite,
  tendSectionIsExpanded,
  destroySparkChartsForSection,
  mountSectionSparkCharts,
  applyTendSectionExpandedState,
  toggleTendSection,
};

var TEND_HIDDEN_SERIES_LS = 'rpc-tend-hidden-series';
var TEND_ABNORMAL_ONLY_LS = 'rpc-tend-abnormal-only';
function tendHiddenSeriesRead() {
  if (_hiddenSeriesMem) return _hiddenSeriesMem.slice();
  try {
    var j = localStorage.getItem(TEND_HIDDEN_SERIES_LS);
    if (!j) return [];
    var a = JSON.parse(j);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function tendHiddenSeriesWrite(arr) {
  _hiddenSeriesMem = (arr || []).slice();
  try {
    localStorage.setItem(TEND_HIDDEN_SERIES_LS, JSON.stringify(arr || []));
  } catch (e) { console.warn('[tendencias-hidden] failed to write ' + TEND_HIDDEN_SERIES_LS, e); }
}

function tendSeriesIsUserHidden(sectionKey, fieldKey) {
  return tendHiddenSeriesRead().indexOf(tendCatalogSeriesKey(sectionKey, fieldKey)) !== -1;
}

function tendSeriesSetUserHidden(sectionKey, fieldKey, hidden) {
  var k = tendCatalogSeriesKey(sectionKey, fieldKey);
  var a = tendHiddenSeriesRead().slice();
  var i = a.indexOf(k);
  if (hidden && i === -1) a.push(k);
  if (!hidden && i !== -1) a.splice(i, 1);
  tendHiddenSeriesWrite(a);
}

function seedTendHiddenDefaults() {
  var SEED_KEY = 'rpc-tend-hidden-seeded-v2';
  try {
    if (localStorage.getItem(SEED_KEY) === '1') return;
  } catch {
    return;
  }
  var current = tendHiddenSeriesRead().slice();
  var seen = {};
  current.forEach(function (k) {
    seen[k] = true;
  });
  var changed = false;
  TEND_SERIES_CATALOG.forEach(function (sp) {
    if (sp && sp.hiddenByDefault) {
      var key = tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
      if (!seen[key]) {
        current.push(key);
        seen[key] = true;
        changed = true;
      }
    }
  });
  try {
    if (changed) tendHiddenSeriesWrite(current);
    localStorage.setItem(SEED_KEY, '1');
  } catch (e) { console.warn('[tendencias-hidden] failed to write ' + SEED_KEY, e); }
}

function tendAbnormalOnlyRead() {
  try {
    return localStorage.getItem(TEND_ABNORMAL_ONLY_LS) === '1';
  } catch {
    return false;
  }
}

function tendAbnormalOnlyWrite(on) {
  try {
    if (on) localStorage.setItem(TEND_ABNORMAL_ONLY_LS, '1');
    else localStorage.removeItem(TEND_ABNORMAL_ONLY_LS);
  } catch (e) { console.warn('[tendencias-hidden] failed to write ' + TEND_ABNORMAL_ONLY_LS, e); }
}

function tendSeriesLatestAbnormal(history, sectionKey, fieldKey) {
  var raw = history.filter(function (s) {
    return getSetTrendValueForSeries(s, sectionKey, fieldKey) != null;
  });
  var setsDesc = dedupeTrendSetsForSeries(raw, sectionKey, fieldKey);
  if (setsDesc.length < 2) return false;
  var latestSet = setsDesc[0];
  var latest = getSetTrendValueForSeries(latestSet, sectionKey, fieldKey);
  var ref = tendRefForSeries(history, sectionKey, fieldKey, latestSet);
  return !!(ref && latest != null && (latest < ref[0] || latest > ref[1]));
}

function tendHiddenChipDescriptors() {
  var hiddenKeys = tendHiddenSeriesRead();
  var list = [];
  for (var hi = 0; hi < hiddenKeys.length; hi++) {
    var entry = hiddenKeys[hi];
    var pipe = entry.indexOf('|');
    if (pipe < 1) continue;
    var sk = entry.slice(0, pipe);
    var fk = entry.slice(pipe + 1);
    if (!fk) continue;
    list.push({ sectionKey: sk, fieldKey: fk });
  }
  return list;
}

function tendHiddenChipsModel() {
  return tendHiddenChipDescriptors().map(function (d) {
    return {
      key: tendCatalogSeriesKey(d.sectionKey, d.fieldKey),
      label: tendFindSeriesSpec(d.sectionKey, d.fieldKey).cardTitle || d.fieldKey,
    };
  });
}

function refreshTendHiddenModalContent() {
  var el = document.getElementById('tend-hidden-modal-chips');
  if (!el) return;
  drawTendHiddenChips(el, tendHiddenChipsModel());
}

function openTendHiddenModal() {
  var bd = document.getElementById('tend-hidden-modal-backdrop');
  if (!bd) return;
  refreshTendHiddenModalContent();
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
}

export function closeTendHiddenModal() {
  var bd = document.getElementById('tend-hidden-modal-backdrop');
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

/** Toolbar numbers: `on` = only-abnormal filter pressed, counts for both filter buttons. */
function tendToolbarModel(hiddenCount, opts) {
  opts = opts || {};
  return { hidden: hiddenCount, total: opts.total || 0, oor: opts.oor || 0, gaso: !!opts.gaso, on: !!opts.on };
}

function historyHasGasoForExtended(historyDesc) {
  var latest = historyDesc && historyDesc[0];
  if (!latest || !latest.parsedBySection || !latest.parsedBySection.GASES) return false;
  return getSetTrendValueForSeries(latest, 'GASES', 'pH') != null;
}

function toggleTendAbnormalOnlyFilter() {
  tendAbnormalOnlyWrite(!tendAbnormalOnlyRead());
  tendenciasBridge.renderTendencias();
}

function tendHideSeriesFromCard(ev, sectionKey, fieldKey) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  tendSeriesSetUserHidden(sectionKey, fieldKey, true);
  tendenciasBridge.renderTendencias();
}

function tendUnhideSeries(sectionKey, fieldKey) {
  tendSeriesSetUserHidden(sectionKey, fieldKey, false);
  tendenciasBridge.renderTendencias();
}

function tendResetAllHiddenSeries() {
  tendHiddenSeriesWrite([]);
  closeTendHiddenModal();
  tendenciasBridge.renderTendencias();
}

export {
  tendHiddenSeriesRead,
  tendHiddenSeriesWrite,
  tendSeriesIsUserHidden,
  tendSeriesSetUserHidden,
  seedTendHiddenDefaults,
  tendAbnormalOnlyRead,
  tendAbnormalOnlyWrite,
  tendSeriesLatestAbnormal,
  tendHiddenChipDescriptors,
  tendHiddenChipsModel,
  refreshTendHiddenModalContent,
  openTendHiddenModal,
  tendToolbarModel,
  historyHasGasoForExtended,
  toggleTendAbnormalOnlyFilter,
  tendHideSeriesFromCard,
  tendUnhideSeries,
  tendResetAllHiddenSeries,
  openLabDisplayPrefsModal,
  closeLabDisplayPrefsModal,
  onLabDisplayPrefsChanged,
};
