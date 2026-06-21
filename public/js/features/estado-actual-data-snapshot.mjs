/**
 * deriveSnapshot helpers — extracted from estado-actual-data.mjs.
 */
import { vitalSeriesFromMedicion } from './estado-actual-vital-series.mjs';
import {
  applyVitalReading,
  rowVitalsAndAltered,
  bombaFromRow,
  glucometriasFromRow,
  nonemptyGlucometrias,
  absorbIoRow,
  VITAL_KEYS,
  VITAL_BASE_KEYS,
  getVitalExtraStorageKey,
  sortGlucometriasChronologically,
} from './estado-actual-data-snapshot-helpers.mjs';

/** @typedef {{ kind: 'diuresis' | 'drain' | 'gastrostomy' | 'nephro', label: string, value: number | string }} IoEgresoPart */

/**
 * @param {Record<string, unknown>} vitals
 * @param {Record<string, string>} alteredAt
 * @param {Record<string, unknown>} rv
 * @param {Record<string, string>} rowAlt
 */
function applyRowVitals(vitals, alteredAt, rv, rowAlt) {
  for (var vk of VITAL_KEYS) {
    applyVitalReading(vitals, alteredAt, vk, rv[vk], rowAlt);
  }
  for (var ex = 0; ex < VITAL_BASE_KEYS.length; ex++) {
    var baseK = VITAL_BASE_KEYS[ex];
    var extraK = getVitalExtraStorageKey(baseK);
    applyVitalReading(vitals, alteredAt, extraK, rv[extraK], rowAlt);
  }
}

/** @param {unknown[]} sortedAsc */
export function deriveVitalsFromHistorial_(sortedAsc) {
  var vitals = {};
  for (var v0 of VITAL_KEYS) vitals[v0] = null;
  var alteredAt = /** @type {Record<string, string>} */ ({});

  for (var iRow = 0; iRow < sortedAsc.length; iRow++) {
    var parsed = rowVitalsAndAltered(sortedAsc[iRow]);
    applyRowVitals(vitals, alteredAt, parsed.rv, parsed.rowAlt);
  }
  return { vitals, alteredAt };
}

/**
 * @param {unknown} row
 */
function gluBlockFromRow(row) {
  var bombas = bombaFromRow(row);
  if (bombas.length) return { glucometrias: [], bombaInsulina: bombas };
  var nonempty = nonemptyGlucometrias(glucometriasFromRow(row));
  if (!nonempty.length) return null;
  var rowRecordedAt = row && row.recordedAt != null ? String(row.recordedAt) : '';
  return { glucometrias: sortGlucometriasChronologically(nonempty, rowRecordedAt), bombaInsulina: [] };
}

/** @param {unknown[]} sortedAsc */
export function deriveGluFromHistorial_(sortedAsc) {
  for (var j = sortedAsc.length - 1; j >= 0; j--) {
    var block = gluBlockFromRow(sortedAsc[j]);
    if (block) return block;
  }
  return { glucometrias: [], bombaInsulina: [] };
}

/** @param {unknown[]} sortedAsc */
export function deriveIoFromHistorial_(sortedAsc) {
  var state = {
    ingSeen: /** @type {null | unknown} */ (null),
    egrSeen: /** @type {null | unknown} */ (null),
    egrPartsSeen: /** @type {IoEgresoPart[] | null} */ (null),
    evacSeen: /** @type {null | unknown} */ (null),
  };
  for (var k2 = sortedAsc.length - 1; k2 >= 0; k2--) {
    var rIo = sortedAsc[k2];
    if (!rIo || typeof rIo !== 'object') continue;
    var rowIo = rIo.io && typeof rIo.io === 'object' ? rIo.io : {};
    absorbIoRow(rowIo, state);
    if (state.ingSeen !== null && (state.egrSeen !== null || state.egrPartsSeen) && state.evacSeen !== null) break;
  }
  /** @type {{ ing: null | unknown, egr: null | unknown, egrParts?: IoEgresoPart[], evac?: unknown }} */
  var snapIo = { ing: state.ingSeen, egr: state.egrSeen };
  if (state.egrPartsSeen) snapIo.egrParts = state.egrPartsSeen;
  if (state.evacSeen !== null) snapIo.evac = state.evacSeen;
  return snapIo;
}

/** @param {unknown[]} sortedAsc */
export function deriveVitalSeriesFromHistorial_(sortedAsc) {
  /** @type {Record<string, Array<{ value: number, time?: string }>>} */
  var vitalSeries = {};
  for (var si = sortedAsc.length - 1; si >= 0; si--) {
    var srow = sortedAsc[si];
    if (!srow || typeof srow !== 'object') continue;
    var fromRow = vitalSeriesFromMedicion(srow);
    VITAL_BASE_KEYS.forEach(function (bk) {
      if (!vitalSeries[bk]) vitalSeries[bk] = [];
      var list = fromRow[bk] || [];
      for (var ri = 0; ri < list.length; ri++) {
        var rd = list[ri];
        var dup = vitalSeries[bk].some(function (x) {
          return x.value === rd.value && (x.time || '') === (rd.time || '');
        });
        if (!dup) vitalSeries[bk].push(rd);
      }
    });
  }
  return vitalSeries;
}
