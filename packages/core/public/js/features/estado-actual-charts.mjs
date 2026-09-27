// Estado Actual charts — public façade. Series math in -series.mjs,
// summary cache in -display.mjs, row/SVG rendering (no Chart.js) in -rows.mjs.
import { historialChartRevision, scanEaChartsSummary } from './estado-actual-charts-series.mjs';
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
 */
export function buildEaChartsSummary(monitoreo) {
  return scanEaChartsSummary(monitoreo);
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

export function renderEaChartsSummarySection(monitoreo) {
  var summary = getCachedEaChartsSummary(monitoreo);
  var canOpen =
    summary.measurementCount >= 2 &&
    (summary.vitalsReady || summary.gluReady || summary.ioReady);
  return (
    '<button type="button" id="ea-charts-summary" class="ea-btn ea-btn--ghost ea-charts-open-btn"' +
    (canOpen
      ? ' data-onclick="openEstadoActualChartsModal"'
      : ' disabled title="Registra al menos 2 mediciones para ver gráficas."') +
    '>' +
    '<svg class="ea-charts-open-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 17l6-6 4 4 8-10"/>' +
    '<path d="M3 12l5-4 4 3 9-7"/>' +
    '</svg>' +
    '<span>Ver gráficas</span></button>'
  );
}

/**
 * @param {HTMLElement | null} mountEl
 * @param {unknown} monitoreo
 */
export function renderEstadoActualCharts(mountEl, monitoreo) {
  renderEaChartsRows(mountEl, monitoreo);
}
