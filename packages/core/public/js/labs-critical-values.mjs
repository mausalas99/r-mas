/**
 * Umbrales de valores críticos de laboratorio (pánico), no rangos normales.
 * Fuente: convención hospitalaria estándar de valores de pánico.
 */
import { sortLabHistoryChronological, getSetTrendValueForSeries } from './tend-core.mjs';

var CRITICAL_LAB_CHECKS = [
  { section: 'ESC', field: 'K', low: 2.5, high: 6.5 },
  { section: 'ESC', field: 'Na', low: 120, high: 160 },
  { section: 'QS', field: 'Glu', low: 40, high: 500 },
  { section: 'BH', field: 'Hb', low: 7 },
  { section: 'BH', field: 'Plt', low: 20000 },
  { section: 'QS', field: 'Cr', high: 4 },
  { section: 'GASES', field: 'pH', low: 7.2, high: 7.6 },
  { section: 'GASES', field: 'Bica', low: 10, high: 40 },
];

/** @param {unknown[]} sets historial de laboratorios de un paciente */
export function hasCriticalLabValue(sets) {
  var latest = sortLabHistoryChronological(sets || [])[0];
  if (!latest) return false;
  return CRITICAL_LAB_CHECKS.some(function (c) {
    var v = getSetTrendValueForSeries(latest, c.section, c.field);
    if (v == null) return false;
    if (c.low != null && v < c.low) return true;
    if (c.high != null && v > c.high) return true;
    return false;
  });
}
