// Estado Actual charts — public façade. Series math lives in -series.mjs,
// downsampling/display in -display.mjs, Chart.js wiring in -chartjs.mjs,
// tab shell DOM in -tabs.mjs.
import {
  historialChartRevision,
  scanEaChartsSummary,
} from './estado-actual-charts-series.mjs';
import {
  displaySlotForChart,
  getCachedEaChartBundle,
  getCachedEaChartsSummary,
} from './estado-actual-charts-display.mjs';
import { resolveChartCtor } from './estado-actual-charts-chartjs.mjs';
import {
  activateEaChartTab,
  buildEaChartsTabShell,
  defaultEaChartTab,
  destroyAllEaTabCharts,
  eaChartTabHasData,
  syncActiveEaChartsRef,
  wireEaChartsTabs,
} from './estado-actual-charts-tabs.mjs';

export {
  buildGluSeries,
  buildIoChartData,
  buildVitalsSeries,
  formatChartLabel,
  historialSortedAsc,
} from './estado-actual-charts-series.mjs';
export { downsampleEaChartSeries } from './estado-actual-charts-display.mjs';

export function destroyEstadoActualCharts(mountEl) {
  if (!mountEl) return;
  destroyAllEaTabCharts(mountEl);
  mountEl._eaCharts = [];
  mountEl._eaChartSlotIds = [];
  mountEl._eaChartsSig = '';
  mountEl._eaChartsLayoutKey = '';
  mountEl._eaActiveChartTab = '';
  mountEl._eaChartsTabsWired = false;
}

/**
 * @param {unknown} monitoreo
 * @returns {string}
 */
export function buildEaChartsLayoutKey(monitoreo) {
  return getCachedEaChartBundle(monitoreo).layoutKey;
}

/**
 * @param {unknown} chart
 * @param {string} slotId
 * @param {Record<string, { labels: string[], datasets: object[] }>} slotData
 * @returns {boolean}
 */
function patchEaChartFromSlot(chart, slotId, slotData) {
  /** @type {any} */
  var ch = chart;
  var next = displaySlotForChart(slotData, slotId);
  if (!ch || !ch.data || !next) return false;
  ch.data.labels = next.labels;
  var dsIn = next.datasets || [];
  for (var d = 0; d < dsIn.length; d += 1) {
    if (!ch.data.datasets[d]) {
      ch.data.datasets[d] = dsIn[d];
    } else {
      var target = ch.data.datasets[d];
      var patch = dsIn[d];
      target.data = patch.data;
      if (patch.label != null) target.label = patch.label;
      if (patch.borderColor != null) target.borderColor = patch.borderColor;
      if (patch.backgroundColor != null) target.backgroundColor = patch.backgroundColor;
      if (patch.type != null) target.type = patch.type;
      if (patch.borderDash != null) target.borderDash = patch.borderDash;
      if (patch.yAxisID != null) target.yAxisID = patch.yAxisID;
      if (patch.pointRadius != null) target.pointRadius = patch.pointRadius;
      if (patch.pointBackgroundColor != null) target.pointBackgroundColor = patch.pointBackgroundColor;
      if (patch.pointBorderColor != null) target.pointBorderColor = patch.pointBorderColor;
      if (patch.tension != null) target.tension = patch.tension;
    }
  }
  if (typeof ch.update === 'function') ch.update('none');
  return true;
}

export function updateEstadoActualChartsInPlace(mountEl, monitoreo, slotDataIn) {
  var slotData = slotDataIn || getCachedEaChartBundle(monitoreo).slotData;
  var stores = mountEl._eaTabChartStores;
  if (stores && typeof stores === 'object') {
    var storeKeys = Object.keys(stores);
    if (storeKeys.length) {
      for (var sk = 0; sk < storeKeys.length; sk += 1) {
        var entry = stores[storeKeys[sk]];
        if (!entry || !Array.isArray(entry.charts) || !Array.isArray(entry.slotIds)) return false;
        if (entry.charts.length !== entry.slotIds.length) return false;
        for (var i = 0; i < entry.charts.length; i += 1) {
          if (!patchEaChartFromSlot(entry.charts[i], entry.slotIds[i], slotData)) return false;
        }
      }
      syncActiveEaChartsRef(mountEl, mountEl._eaActiveChartTab || '');
      return true;
    }
  }

  var charts = mountEl._eaCharts;
  var slotIds = mountEl._eaChartSlotIds;
  if (!Array.isArray(charts) || !Array.isArray(slotIds) || charts.length !== slotIds.length) {
    return false;
  }
  for (var j = 0; j < charts.length; j += 1) {
    if (!patchEaChartFromSlot(charts[j], slotIds[j], slotData)) return false;
  }
  return true;
}

/**
 * @param {unknown} monitoreo
 * @returns {string}
 */
export function buildEaChartsSignature(monitoreo) {
  return getCachedEaChartBundle(monitoreo).signature;
}

/**
 * @param {unknown} monitoreo
 */
export function buildEaChartsSummary(monitoreo) {
  return scanEaChartsSummary(monitoreo);
}

/**
 * Revision for historial-only chart summary invalidation (panel patches).
 * @param {unknown} monitoreo
 * @returns {string}
 */
export function buildEaHistorialChartsRevision(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  return historialChartRevision(hist);
}

function eaChartsSummaryTile(label, value, hint) {
  return (
    '<div class="ea-charts-summary-tile">' +
    '<span class="ea-charts-summary-tile-label">' +
    label +
    '</span>' +
    '<span class="ea-charts-summary-tile-value">' +
    value +
    '</span>' +
    (hint ? '<span class="ea-charts-summary-tile-hint">' + hint + '</span>' : '') +
    '</div>'
  );
}

export function renderEaChartsSummarySection(monitoreo) {
  var summary = getCachedEaChartsSummary(monitoreo);
  var vitalsValue = summary.vitalsReady ? 'Listo' : '—';
  var vitalsHint = summary.vitalsReady
    ? summary.measurementCount + ' mediciones'
    : 'Mín. 2 mediciones con signos';
  var gluValue = summary.gluReady
    ? String(summary.gluLatest) + ' mg/dL'
    : summary.gluPointCount === 1
      ? '1 punto'
      : '—';
  var gluHint = summary.gluReady
    ? summary.gluPointCount + ' puntos'
    : 'Mín. 2 glucometrías';
  var ioValue =
    summary.ioReady && summary.ioTurn != null
      ? (summary.ioTurn >= 0 ? '+' : '') + summary.ioTurn + ' cc'
      : '—';
  var ioHint = summary.ioReady
    ? summary.ioPointCount + ' registros I/O'
    : 'Mín. 2 pares ingreso/egreso';
  var canOpen =
    summary.measurementCount >= 2 &&
    (summary.vitalsReady || summary.gluReady || summary.ioReady);
  return (
    '<section class="ea-section ea-charts-summary" id="ea-charts-summary">' +
    '<div class="ea-charts-summary-head">' +
    '<h3 class="ea-section-title">Gráficas de monitoreo</h3>' +
    (canOpen
      ? '<button type="button" class="ea-btn ea-btn--ghost ea-charts-open-btn" onclick="openEstadoActualChartsModal()">' +
        '<svg class="ea-charts-open-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3 17l6-6 4 4 8-10"/>' +
        '<path d="M3 12l5-4 4 3 9-7"/>' +
        '</svg>' +
        '<span>Ver gráficas</span></button>'
      : '<span class="ea-muted ea-charts-summary-empty">Registra al menos 2 mediciones para ver gráficas.</span>') +
    '</div>' +
    '<div class="ea-charts-summary-grid">' +
    eaChartsSummaryTile('Signos vitales', vitalsValue, vitalsHint) +
    eaChartsSummaryTile('Glucometrías', gluValue, gluHint) +
    eaChartsSummaryTile('Balance hídrico', ioValue, ioHint) +
    '</div>' +
    '</section>'
  );
}

/**
 * @param {HTMLElement | null} mountEl
 * @param {unknown} monitoreo
 * @param {unknown} [ChartCtor]
 * @param {{ showTitle?: boolean } | undefined} [opts]
 */
export function renderEstadoActualCharts(mountEl, monitoreo, ChartCtor, opts) {
  opts = opts || {};
  var showTitle = opts.showTitle === true;
  if (!mountEl) return;
  var bundle = getCachedEaChartBundle(monitoreo);
  var sig = bundle.signature;
  var slotData = bundle.slotData;
  if (mountEl._eaChartsSig === sig && mountEl.querySelector('.ea-charts-tabs')) {
    mountEl._eaChartBundle = bundle;
    var activeTab = mountEl._eaActiveChartTab || defaultEaChartTab(slotData);
    var activePanel = mountEl.querySelector('[data-ea-chart-panel="' + activeTab + '"]');
    if (activePanel && !activePanel.querySelector('canvas') && eaChartTabHasData(slotData, activeTab)) {
      var ChartRemount = resolveChartCtor(ChartCtor);
      if (ChartRemount) {
        activateEaChartTab(mountEl, activeTab, bundle, ChartRemount, bundle.layoutKey);
      }
    }
    return;
  }
  var layoutKey = bundle.layoutKey;
  if (
    mountEl._eaChartsLayoutKey === layoutKey &&
    mountEl._eaChartsSig !== sig &&
    updateEstadoActualChartsInPlace(mountEl, monitoreo, slotData)
  ) {
    mountEl._eaChartsSig = sig;
    return;
  }
  destroyEstadoActualCharts(mountEl);

  var Chart = resolveChartCtor(ChartCtor);
  var histAsc = bundle.histAsc;

  var hasEnough = histAsc.length >= 2;
  if (!hasEnough) {
    mountEl.innerHTML =
      '<p class="ea-muted ea-charts-empty">Registra al menos 2 mediciones para ver gráficas.</p>';
    return;
  }

  if (!Chart) {
    mountEl.innerHTML =
      '<p class="ea-muted ea-charts-empty">Chart.js no está disponible. Recarga la aplicación.</p>';
    return;
  }

  var titleHtml = showTitle ? '<h3 class="ea-section-title">Gráficas de monitoreo</h3>' : '';
  mountEl.innerHTML = titleHtml + '<div class="ea-charts-shell">' + buildEaChartsTabShell(slotData) + '</div>';
  mountEl._eaChartBundle = bundle;

  wireEaChartsTabs(mountEl, bundle, Chart, layoutKey);
  activateEaChartTab(mountEl, defaultEaChartTab(slotData), bundle, Chart, layoutKey);
}
