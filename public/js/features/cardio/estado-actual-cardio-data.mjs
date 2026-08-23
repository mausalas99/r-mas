/**
 * Pure data-shaping helpers for the cardio blocks on Clínico → Estado actual
 * (descongestión header + congestión/POCUS log). Wraps `lib/cardio/*` domain
 * logic against R+ HF's own `monitoreo.historial[].io` shape — does not
 * reimplement any counting/summing rule already in `lib/cardio`.
 */
import { computeDescongestion } from '../../../../lib/cardio/descongestion.mjs';
import { sumFurosemidaMg } from '../../../../lib/cardio/med-segments.mjs';
import { ioDiuresisForBalance, isIoNumericValue } from '../estado-actual-io.mjs';
import { pad2 } from '../estado-actual-panel-format.mjs';
import { admissionDateForPatient } from '../guardia-census-table.mjs';

/** @returns {string} YYYY-MM-DD, local calendar day. */
export function localYmdToday() {
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/**
 * @param {{ recordedAt?: string }} row
 * @returns {string} YYYY-MM-DD, or '' when `recordedAt` doesn't parse.
 */
function historialRowYmd(row) {
  var d = new Date(row && row.recordedAt);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/**
 * Numeric diuresis (mL) per historial row, from `io.egrParts` (kind:'diuresis')
 * or the legacy `io.egr` field, on/after `sinceYmd` when given.
 * @param {Array<{ recordedAt?: string, io?: unknown }>} historial
 * @param {string} [sinceYmd]
 * @returns {number[]}
 */
export function collectDailyDiuresisMl(historial, sinceYmd) {
  var rows = Array.isArray(historial) ? historial : [];
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row) continue;
    var ymd = historialRowYmd(row);
    if (sinceYmd && ymd && ymd < sinceYmd) continue;
    var v = ioDiuresisForBalance(row.io || {});
    if (isIoNumericValue(v)) out.push(Number(v));
  }
  return out;
}

/**
 * Diuresis (mL) from the most recently recorded historial row that has a
 * numeric value — the "hoy" (24h) reading shown next to the accumulated one.
 * @param {Array<{ recordedAt?: string, io?: unknown }>} historial
 * @returns {number | null}
 */
export function latestNumericDiuresisMl(historial) {
  var rows = Array.isArray(historial) ? historial.slice() : [];
  rows.sort(function (a, b) {
    return String((b && b.recordedAt) || '').localeCompare(String((a && a.recordedAt) || ''));
  });
  for (var i = 0; i < rows.length; i++) {
    var v = ioDiuresisForBalance((rows[i] && rows[i].io) || {});
    if (isIoNumericValue(v)) return Number(v);
  }
  return null;
}

/**
 * Builds the descongestión header stats: días internamiento/descongestión,
 * diuresis hoy/acumulada, furosemida acumulada, balance acumulado — each
 * respecting `patient.cardio.overrides` (see `descongestion.mjs`).
 * @param {{ cardio?: Record<string, any>, registeredAt?: string, fimiFecha?: string, fiuxFecha?: string }} patient
 * @param {{ historial?: unknown[] }} monitoreo
 * @param {{ asOfDate?: string, balanceGlobalMl?: number }} [opts]
 */
export function buildDescongestionStats(patient, monitoreo, opts) {
  opts = opts || {};
  var cardio = (patient && patient.cardio) || {};
  var asOfDate = opts.asOfDate || localYmdToday();
  var ingresoDate = admissionDateForPatient(patient) || '';
  var inicioDescongestion = String(cardio.inicioDescongestion || '');
  var historial = Array.isArray(monitoreo && monitoreo.historial) ? monitoreo.historial : [];
  var sinceYmd = inicioDescongestion || ingresoDate;
  var dailyDiuresisMl = collectDailyDiuresisMl(historial, sinceYmd);
  var diuresisHoyMl = latestNumericDiuresisMl(historial);
  var furosemidaAcumuladaMg = sumFurosemidaMg(cardio.diureticSegments, asOfDate);
  var balanceAcumuladoMl = Number.isFinite(Number(opts.balanceGlobalMl)) ? Number(opts.balanceGlobalMl) : 0;

  var result = computeDescongestion({
    ingresoDate: ingresoDate,
    asOfDate: asOfDate,
    inicioDescongestion: inicioDescongestion,
    dailyDiuresisMl: dailyDiuresisMl,
    furosemidaAcumuladaMg: furosemidaAcumuladaMg,
    balanceAcumuladoMl: balanceAcumuladoMl,
    overrides: cardio.overrides || {},
  });

  return Object.assign({}, result, {
    diuresisHoyMl: diuresisHoyMl,
    ingresoDate: ingresoDate,
    asOfDate: asOfDate,
    inicioDescongestion: inicioDescongestion,
    overrides: cardio.overrides || {},
  });
}
