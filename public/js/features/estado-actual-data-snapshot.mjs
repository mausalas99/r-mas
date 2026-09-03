/**
 * deriveSnapshot helpers — extracted from estado-actual-data.mjs.
 */
import {
  ioDiuresisForBalance,
  ioNumericEgressTotal,
} from './estado-actual-io.mjs';
import { sortGlucometriasChronologically } from './estado-actual-registro-defaults.mjs';
import { getVitalExtraStorageKey, VITAL_BASE_KEYS } from './estado-actual-vital-extras.mjs';
import { vitalSeriesFromMedicion } from './estado-actual-vital-series.mjs';
import { VITAL_KEYS } from './estado-actual-data-constants.mjs';

function hasIoNumber(v) {
  return v != null && v !== '';
}

/**
 * @param {Record<string, unknown>} vitals
 * @param {Record<string, string>} alteredAt
 * @param {string} key
 * @param {unknown} val
 * @param {Record<string, string>} rowAlt
 */
export function applyVitalReading(vitals, alteredAt, key, val, rowAlt) {
  if (val == null || val === '') return;
  vitals[key] = val;
  if (rowAlt && rowAlt[key] != null && String(rowAlt[key]).length > 0) {
    alteredAt[key] = String(rowAlt[key]);
  } else {
    delete alteredAt[key];
  }
}

/**
 * @param {unknown} row
 */
export function rowVitalsAndAltered(row) {
  if (!row || typeof row !== 'object') {
    return { rv: {}, rowAlt: {} };
  }
  /** @type {any} */
  var r = row;
  var rv = r.vitals && typeof r.vitals === 'object' ? r.vitals : {};
  var rowAlt =
    r.alteredAt && typeof r.alteredAt === 'object' ? /** @type {Record<string, string>} */ (r.alteredAt) : {};
  return { rv, rowAlt };
}

/**
 * @param {unknown} e
 */
export function normalizeBombaEntry(e) {
  if (!e || typeof e !== 'object') return null;
  var v = Number(e.value);
  var u = Number(e.units);
  if (!Number.isFinite(v)) return null;
  return {
    value: v,
    units: Number.isFinite(u) ? u : 0,
    time: e.time != null ? String(e.time) : undefined,
  };
}

/**
 * @param {unknown[]} garr
 */
export function nonemptyGlucometrias(garr) {
  var nonempty = /** @type {Array<{ value?: unknown, time?: string }>} */ ([]);
  for (var gg of garr) {
    if (!gg || typeof gg !== 'object') continue;
    if (gg.value != null && gg.value !== '') nonempty.push(gg);
  }
  return nonempty;
}

/**
 * @param {unknown} row
 */
export function bombaFromRow(row) {
  if (!row || typeof row !== 'object') return [];
  var barr = Array.isArray(row.bombaInsulina) ? row.bombaInsulina : [];
  return barr.map(normalizeBombaEntry).filter(Boolean);
}

/**
 * @param {unknown} row
 */
export function glucometriasFromRow(row) {
  if (!row || typeof row !== 'object') return [];
  return Array.isArray(row.glucometrias) ? row.glucometrias : [];
}

/**
 * @param {unknown} rowIo
 * @param {{ egrPartsSeen: unknown, egrSeen: unknown, evacSeen: unknown, ingSeen: unknown }} state
 */
export function absorbIoRow(rowIo, state) {
  if (state.egrPartsSeen === null && Array.isArray(rowIo.egrParts) && rowIo.egrParts.length) {
    state.egrPartsSeen = rowIo.egrParts.slice();
    state.egrSeen = ioNumericEgressTotal(rowIo) ?? ioDiuresisForBalance(rowIo);
  }
  if (state.egrSeen === null && rowIo.egr != null && rowIo.egr !== '') state.egrSeen = rowIo.egr;
  if (state.evacSeen === null && rowIo.evac != null && rowIo.evac !== '') state.evacSeen = rowIo.evac;
  if (state.ingSeen === null && hasIoNumber(rowIo.ing)) state.ingSeen = rowIo.ing;
}

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
  /** @type {Record<string, Array<{ value: number, time?: string, recordedAt?: string }>>} */
  var vitalSeries = {};
  for (var si = 0; si < sortedAsc.length; si++) {
    var srow = sortedAsc[si];
    if (!srow || typeof srow !== 'object') continue;
    var recordedAt = /** @type {any} */ (srow).recordedAt != null ? String(/** @type {any} */ (srow).recordedAt) : '';
    var fromRow = vitalSeriesFromMedicion(srow);
    VITAL_BASE_KEYS.forEach(function (bk) {
      if (!vitalSeries[bk]) vitalSeries[bk] = [];
      var list = fromRow[bk] || [];
      for (var ri = 0; ri < list.length; ri++) {
        var rd = list[ri];
        var dup = vitalSeries[bk].some(function (x) {
          return (
            x.value === rd.value &&
            (x.time || '') === (rd.time || '') &&
            (x.recordedAt || '') === recordedAt
          );
        });
        if (!dup) vitalSeries[bk].push({ value: rd.value, time: rd.time, recordedAt: recordedAt });
      }
    });
  }
  return vitalSeries;
}

/**
 * @param {unknown[]} sortedAsc
 * @param {string} vitalKey
 * @returns {Array<{ value: number, time?: string, recordedAt: string }>}
 */
export function deriveVitalSeriesProvenanceFromHistorial_(sortedAsc, vitalKey) {
  /** @type {Array<{ value: number, time?: string, recordedAt: string }>} */
  var out = [];
  for (var si = 0; si < sortedAsc.length; si++) {
    var srow = sortedAsc[si];
    if (!srow || typeof srow !== 'object') continue;
    var recordedAt = /** @type {any} */ (srow).recordedAt != null ? String(/** @type {any} */ (srow).recordedAt) : '';
    var fromRow = vitalSeriesFromMedicion(srow)[vitalKey] || [];
    for (var ri = 0; ri < fromRow.length; ri++) {
      var rd = fromRow[ri];
      var dup = out.some(function (x) {
        return x.value === rd.value && (x.time || '') === (rd.time || '') && x.recordedAt === recordedAt;
      });
      if (!dup) out.push({ value: rd.value, time: rd.time, recordedAt: recordedAt });
    }
  }
  return out;
}

/** @param {unknown[]} sortedAsc */
export function deriveTempPeakAtFromHistorial_(sortedAsc) {
  var series = deriveVitalSeriesProvenanceFromHistorial_(sortedAsc, 'temp');
  if (series.length < 2) return null;
  var peak = series[series.length - 2];
  return { recordedAt: peak.recordedAt, time: peak.time };
}

function appendVitalsBpFallback(tasList, tadList, rv, rowAlt) {
  if (!tasList.length && rv.tas != null && rv.tas !== '') {
    tasList.push({ value: Number(rv.tas), time: rowAlt.tas });
  }
  if (!tadList.length && rv.tad != null && rv.tad !== '') {
    tadList.push({ value: Number(rv.tad), time: rowAlt.tad });
  }
}

/** @param {unknown} row */
function collectBpListsFromHistorialRow(row) {
  if (!row || typeof row !== 'object') return null;
  /** @type {any} */
  var r = row;
  var recordedAt = r.recordedAt != null ? String(r.recordedAt) : '';
  var fromRow = vitalSeriesFromMedicion(row);
  /** @type {Array<{ value: number, time?: string }>} */
  var tasList = (fromRow.tas || []).slice();
  /** @type {Array<{ value: number, time?: string }>} */
  var tadList = (fromRow.tad || []).slice();
  var rv = r.vitals && typeof r.vitals === 'object' ? r.vitals : {};
  var rowAlt = r.alteredAt && typeof r.alteredAt === 'object' ? r.alteredAt : {};
  appendVitalsBpFallback(tasList, tadList, rv, rowAlt);
  return { recordedAt, tasList, tadList };
}

function pushBpPair(pairs, recordedAt, tasReading, tadReading) {
  var time =
    tasReading && tasReading.time
      ? String(tasReading.time)
      : tadReading && tadReading.time
        ? String(tadReading.time)
        : undefined;
  pairs.push({
    tas: tasReading && Number.isFinite(Number(tasReading.value)) ? Number(tasReading.value) : null,
    tad: tadReading && Number.isFinite(Number(tadReading.value)) ? Number(tadReading.value) : null,
    recordedAt: recordedAt,
    time: time,
  });
}

/**
 * TAS y TAD se guardan como series independientes por signo, así que una lectura
 * de TAS y una de TAD solo pertenecen a la misma toma si comparten `time`. Sin esa
 * coincidencia, no se debe adivinar el par por posición: cada lectura sobrante
 * queda sola en su fila.
 */
function appendBpPairsFromLayers(pairs, recordedAt, tasList, tadList) {
  if (!tasList.length && !tadList.length) return;
  var tadUsed = new Array(tadList.length);
  var leftoverTas = [];

  for (var i = 0; i < tasList.length; i++) {
    var tasReading = tasList[i];
    var matchIdx = -1;
    if (tasReading.time) {
      for (var j = 0; j < tadList.length; j++) {
        if (!tadUsed[j] && tadList[j].time === tasReading.time) {
          matchIdx = j;
          break;
        }
      }
    }
    if (matchIdx === -1) {
      leftoverTas.push(tasReading);
      continue;
    }
    tadUsed[matchIdx] = true;
    pushBpPair(pairs, recordedAt, tasReading, tadList[matchIdx]);
  }

  var leftoverTad = [];
  for (var k = 0; k < tadList.length; k++) {
    if (!tadUsed[k]) leftoverTad.push(tadList[k]);
  }

  var layers = Math.max(leftoverTas.length, leftoverTad.length);
  for (var li = 0; li < layers; li++) {
    pushBpPair(pairs, recordedAt, leftoverTas[li] || null, leftoverTad[li] || null);
  }
}

/** @param {unknown[]} sortedAsc */
export function deriveBpPairsFromHistorial_(sortedAsc) {
  /** @type {Array<{ tas: number | null, tad: number | null, recordedAt: string, time?: string }>} */
  var pairs = [];
  for (var i = 0; i < sortedAsc.length; i++) {
    var collected = collectBpListsFromHistorialRow(sortedAsc[i]);
    if (!collected) continue;
    appendBpPairsFromLayers(pairs, collected.recordedAt, collected.tasList, collected.tadList);
  }
  return pairs;
}
