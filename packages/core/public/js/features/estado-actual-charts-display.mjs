import { historialChartRevision, scanEaChartsSummary } from './estado-actual-charts-series.mjs';

/** Bump when the summary shape changes — busts the cached monitoreo._eaChartsSummary. */
export const EA_CHART_CACHE_REV = 'glu-dt-v2';

/**
 * @param {unknown} monitoreo
 */
export function stripMonitoreoChartRuntimeCache(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  /** @type {any} */
  var m = monitoreo;
  delete m._eaChartBundle;
  delete m._eaChartBundleRev;
  delete m._eaChartsSummary;
  delete m._eaChartsSummaryRev;
}

/**
 * @param {unknown[]} hist
 * @returns {string}
 */
function eaChartCacheRev(hist) {
  return historialChartRevision(hist) + '|' + EA_CHART_CACHE_REV;
}

/**
 * @param {unknown} monitoreo
 */
export function getCachedEaChartsSummary(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var rev = eaChartCacheRev(hist);
  if (m._eaChartsSummary && m._eaChartsSummaryRev === rev) {
    return m._eaChartsSummary;
  }
  var summary = scanEaChartsSummary(monitoreo);
  m._eaChartsSummaryRev = rev;
  m._eaChartsSummary = summary;
  return summary;
}
