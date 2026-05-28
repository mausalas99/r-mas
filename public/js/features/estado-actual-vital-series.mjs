import { gluPointMs, isGluPointInRegistroWindow } from './estado-actual-registro-defaults.mjs';
import {
  VITAL_BASE_KEYS,
  getVitalExtraStorageKey,
  getBaseVitalKey,
} from './estado-actual-vital-extras.mjs';

/** Máximo de lecturas del mismo signo vital en la ventana del turno (por día de registro). */
export const MAX_VITAL_READINGS_PER_DAY = 4;

/** Máximo de capas en el modal (+1 en el mismo chip). */
export const MAX_VITAL_LAYERS_IN_FORM = 4;

/**
 * @typedef {{ value: number, time?: string }} VitalReading
 */

/**
 * @param {unknown} raw
 * @returns {VitalReading | null}
 */
function normalizeReading(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var val = Number(/** @type {any} */ (raw).value);
  if (!Number.isFinite(val)) return null;
  var time = /** @type {any} */ (raw).time;
  return { value: val, time: time != null && String(time).length ? String(time) : undefined };
}

/**
 * @param {VitalReading[]} list
 * @param {VitalReading} item
 */
function pushReading(list, item) {
  var key = item.value + '@' + (item.time || '');
  for (var i = 0; i < list.length; i++) {
    var k = list[i].value + '@' + (list[i].time || '');
    if (k === key) return;
  }
  list.push(item);
}

/**
 * @param {unknown} medicion
 * @returns {Record<string, VitalReading[]>}
 */
export function vitalSeriesFromMedicion(medicion) {
  /** @type {Record<string, VitalReading[]>} */
  var out = {};
  if (!medicion || typeof medicion !== 'object') return out;
  /** @type {any} */
  var m = medicion;

  var rawSeries = m.vitalSeries;
  if (rawSeries && typeof rawSeries === 'object') {
    for (var sk = 0; sk < VITAL_BASE_KEYS.length; sk++) {
      var bk = VITAL_BASE_KEYS[sk];
      var arr = /** @type {any} */ (rawSeries)[bk];
      if (!Array.isArray(arr)) continue;
      out[bk] = [];
      for (var ai = 0; ai < arr.length; ai++) {
        var norm = normalizeReading(arr[ai]);
        if (norm) pushReading(out[bk], norm);
      }
    }
  }

  var vit = m.vitals && typeof m.vitals === 'object' ? /** @type {any} */ (m.vitals) : {};
  var alt =
    m.alteredAt && typeof m.alteredAt === 'object'
      ? /** @type {Record<string, string>} */ (m.alteredAt)
      : {};

  for (var vi = 0; vi < VITAL_BASE_KEYS.length; vi++) {
    var key = VITAL_BASE_KEYS[vi];
    if (!out[key]) out[key] = [];
    if (vit[key] != null && vit[key] !== '') {
      pushReading(out[key], {
        value: Number(vit[key]),
        time: alt[key] ? String(alt[key]) : undefined,
      });
    }
    var extraKey = getVitalExtraStorageKey(key);
    if (vit[extraKey] != null && vit[extraKey] !== '') {
      pushReading(out[key], {
        value: Number(vit[extraKey]),
        time: alt[extraKey] ? String(alt[extraKey]) : undefined,
      });
    }
  }

  for (var ck = 0; ck < VITAL_BASE_KEYS.length; ck++) {
    var ckKey = VITAL_BASE_KEYS[ck];
    if (out[ckKey] && out[ckKey].length > MAX_VITAL_READINGS_PER_DAY) {
      out[ckKey] = out[ckKey].slice(-MAX_VITAL_READINGS_PER_DAY);
    }
  }
  return out;
}

/**
 * @param {Record<string, VitalReading[]>} series
 */
export function vitalSeriesToLegacyFields(series) {
  /** @type {Record<string, number | null>} */
  var vitals = {};
  /** @type {Record<string, string>} */
  var alteredAt = {};

  VITAL_BASE_KEYS.forEach(function (key) {
    vitals[key] = null;
    var list = series[key] || [];
    if (!list.length) return;
    var last = list[list.length - 1];
    vitals[key] = last.value;
    if (last.time) alteredAt[key] = last.time;
    if (list.length >= 2 && key === 'temp') {
      var second = list[list.length - 2];
      vitals.tempPeak = second.value;
      if (second.time) alteredAt.tempPeak = second.time;
    } else if (list.length >= 2) {
      var sec = list[list.length - 2];
      vitals[getVitalExtraStorageKey(key)] = sec.value;
      if (sec.time) alteredAt[getVitalExtraStorageKey(key)] = sec.time;
    }
  });
  return { vitals: vitals, alteredAt: alteredAt };
}

/**
 * @param {Array<{ recordedAt?: string, vitals?: Record<string, unknown>, vitalSeries?: Record<string, VitalReading[]>, alteredAt?: Record<string, string> }>} historial
 * @param {string} vitalKey
 * @param {Date} [now]
 */
export function countVitalReadingsInRegistroWindow(historial, vitalKey, now) {
  var hist = Array.isArray(historial) ? historial : [];
  /** @type {VitalReading[]} */
  var all = [];
  for (var i = 0; i < hist.length; i++) {
    var row = hist[i];
    if (!row || typeof row !== 'object') continue;
    var recordedAt = row.recordedAt != null ? String(row.recordedAt) : '';
    var series = vitalSeriesFromMedicion(row);
    var list = series[vitalKey] || [];
    for (var j = 0; j < list.length; j++) {
      var rd = list[j];
      var ms = gluPointMs(recordedAt, rd.time || '');
      if (!isGluPointInRegistroWindow(ms, now)) continue;
      pushReading(all, rd);
    }
  }
  return all.length;
}

/**
 * @param {Array<{ recordedAt?: string, bombaInsulina?: Array<{ value?: unknown, units?: unknown, time?: string }> }>} historial
 * @param {Date} [now]
 * @returns {Array<{ value: number, units: number, time: string }>}
 */
export function collectBombaInsulinaForRegistroWindow(historial, now) {
  var hist = Array.isArray(historial) ? historial : [];
  /** @type {Array<{ value: number, units: number, time: string }>} */
  var out = [];
  /** @type {Set<string>} */
  var seen = new Set();

  for (var i = 0; i < hist.length; i++) {
    var row = hist[i];
    if (!row || typeof row !== 'object') continue;
    var recordedAt = row.recordedAt != null ? String(row.recordedAt) : '';
    var entries = Array.isArray(row.bombaInsulina) ? row.bombaInsulina : [];
    for (var j = 0; j < entries.length; j++) {
      var e = entries[j];
      if (!e || typeof e !== 'object') continue;
      var val = Number(/** @type {any} */ (e).value);
      var units = Number(/** @type {any} */ (e).units);
      if (!Number.isFinite(val)) continue;
      if (!Number.isFinite(units)) units = 0;
      var time = /** @type {any} */ (e).time != null ? String(/** @type {any} */ (e).time) : '';
      var ms = gluPointMs(recordedAt, time);
      if (!isGluPointInRegistroWindow(ms, now)) continue;
      var key = val + '@' + units + '@' + time;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: val, units: units, time: time });
    }
  }

  out.sort(function (a, b) {
    return String(a.time || '').localeCompare(String(b.time || ''));
  });
  return out;
}
