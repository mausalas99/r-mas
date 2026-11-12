// Estado Actual charts — public façade. Series math in -series.mjs,
// summary cache in -display.mjs, row/SVG rendering (no Chart.js) in -rows.mjs.
import { historialChartRevision } from './estado-actual-charts-series.mjs';
import { getCachedEaChartsSummary } from './estado-actual-charts-display.mjs';
import { destroyEaChartsRows, renderEaChartsRows } from './estado-actual-charts-rows.mjs';

export {
  buildGluSeries,
  buildIoChartData,
  formatChartLabel,
  formatChartLabelFromMs,
  historialSortedAsc,
} from './estado-actual-charts-series.mjs';
export { stripMonitoreoChartRuntimeCache } from './estado-actual-charts-display.mjs';

export function destroyEstadoActualCharts(mountEl) {
  if (!mountEl) return;
  destroyEaChartsRows(mountEl);
}

/**
 * @param {unknown} monitoreo
 * @returns {string}
 */
export function buildEaHistorialChartsRevision(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  return historialChartRevision(hist);
}

/** Whether the "Ver gráficas" button is enabled (needs 2+ measurements and one chartable series). */
export function eaChartsCanOpen(monitoreo) {
  var summary = getCachedEaChartsSummary(monitoreo);
  return (
    summary.measurementCount >= 2 &&
    (summary.vitalsReady || summary.gluReady || summary.ioReady)
  );
}

/**
 * @param {HTMLElement | null} mountEl
 * @param {unknown} monitoreo
 */
export function renderEstadoActualCharts(mountEl, monitoreo) {
  renderEaChartsRows(mountEl, monitoreo);
}
