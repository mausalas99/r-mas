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

/**
 * One shown value (label as printed, e.g. «K», «Plt») past a panic threshold.
 * Plt prints in miles (248) or units (248000); both compare in units.
 * @param {string} label @param {string|number} value
 */
export function isCriticalLabValue(label, value) {
  var v = parseFloat(String(value).replace(',', '.'));
  if (Number.isNaN(v)) return false;
  var key = String(label || '').trim().toUpperCase();
  return CRITICAL_LAB_CHECKS.some(function (c) {
    if (c.field.toUpperCase() !== key) return false;
    var n = c.field === 'Plt' && v < 1000 ? v * 1000 : v;
    return (c.low != null && n < c.low) || (c.high != null && n > c.high);
  });
}

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

/**
 * Clinical-importance fallback order for altered-lab chips (Resumen tiles,
 * Labs «Alterados» chips). Earlier = more important = shown first.
 * A clinician can review/edit this list directly; keep it as the single
 * source of ordering truth — do not duplicate it elsewhere.
 */
var CLINICAL_PRIORITY_LABELS = [
  'lactato', 'lac',
  'ph',
  'pco2',
  'po2',
  'bica', 'bicarbonato', 'hco3',
  'k', 'potasio',
  'na', 'sodio',
  'glu', 'glucosa',
  'cr', 'creatinina',
  'bun',
  'hb', 'hemoglobina',
  'hto', 'hematocrito',
  'plaquetas', 'plt',
  'tp', 'inr',
];

export function clinicalPriorityRank(label) {
  var norm = String(label || '').trim().toLowerCase();
  var idx = CLINICAL_PRIORITY_LABELS.indexOf(norm);
  return idx === -1 ? CLINICAL_PRIORITY_LABELS.length : idx;
}
