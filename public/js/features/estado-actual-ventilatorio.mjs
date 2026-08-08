/**
 * Soporte respiratorio en Estado Actual: parámetros por modalidad y cálculos
 * (PaFi, SpO2/FiO2, driving pressure, ROX, ml/kg, Tobin RRS).
 */
import { gasometryKindSupportsPafi } from './estado-actual-ventilatorio-labs.mjs';

/** @typedef {'litros' | 'hfnc' | 'vmni' | 'vm' | 'tqt' | null} SoporteTier */

/** @type {readonly string[]} */
export const SOPORTE_LITROS_TYPES = [
  'Puntillas nasales',
  'Mascarilla simple',
  'Mascarilla reservorio',
];

/** @type {readonly { value: string, label: string }[]} */
export const VM_MODO_OPTIONS = [
  { value: '', label: '—' },
  { value: 'VCV', label: 'Controlada volumen' },
  { value: 'PCV', label: 'Controlada presión' },
  { value: 'PSV', label: 'Asistida (PS)' },
];

/**
 * @param {string | null | undefined} soporte
 * @returns {string}
 */
export function normalizeSoporteValue(soporte) {
  var s = soporte != null ? String(soporte).trim() : '';
  if (s === 'VM no invasiva') return 'VMNI';
  return s;
}

/**
 * @param {string | null | undefined} soporte
 * @returns {SoporteTier}
 */
export function soporteTier(soporte) {
  var s = normalizeSoporteValue(soporte);
  if (!s || s === 'Aire ambiente') return null;
  if (s === 'Traqueostomía') return 'tqt';
  if (SOPORTE_LITROS_TYPES.indexOf(s) >= 0) return 'litros';
  if (s === 'Alto flujo') return 'hfnc';
  if (s === 'VMNI') return 'vmni';
  if (s === 'Ventilación mecánica') return 'vm';
  return null;
}

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseVentNum(raw) {
  if (raw == null || raw === '') return null;
  var n = Number(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} pesoKg
 * @returns {number | null}
 */
export function resolveIdealWeightKg(pesoKg) {
  var n = parseVentNum(pesoKg);
  if (n == null || n <= 0) return null;
  return n;
}

/**
 * @param {number | null} pao2
 * @param {number | null} fio2Pct
 * @returns {number | null}
 */
export function computePafi(pao2, fio2Pct) {
  if (pao2 == null || fio2Pct == null || fio2Pct <= 0) return null;
  return Math.round(pao2 / (fio2Pct / 100));
}

/**
 * @param {number | null} spo2
 * @param {number | null} fio2Pct
 * @returns {number | null}
 */
export function computeSpo2Fio2(spo2, fio2Pct) {
  if (spo2 == null || fio2Pct == null || fio2Pct <= 0) return null;
  return Math.round(spo2 / (fio2Pct / 100));
}

/**
 * @param {number | null} pmeseta
 * @param {number | null} peep
 * @returns {number | null}
 */
export function computeDrivingPressure(pmeseta, peep) {
  if (pmeseta == null || peep == null) return null;
  return Math.round(pmeseta - peep);
}

/**
 * @param {number | null} spo2
 * @param {number | null} fio2Pct
 * @param {number | null} fr
 * @returns {number | null}
 */
export function computeRox(spo2, fio2Pct, fr) {
  var sf = computeSpo2Fio2(spo2, fio2Pct);
  if (sf == null || fr == null || fr <= 0) return null;
  return Math.round((sf / fr) * 10) / 10;
}

/**
 * @param {number | null} vtMl
 * @param {number | null} pesoKg
 * @returns {number | null}
 */
export function computeVtMlKg(vtMl, pesoKg) {
  if (vtMl == null || pesoKg == null || pesoKg <= 0) return null;
  return Math.round((vtMl / pesoKg) * 10) / 10;
}

/**
 * @param {number | null} fr
 * @param {number | null} vtMl
 * @returns {number | null}
 */
export function computeTobinRrs(fr, vtMl) {
  if (fr == null || vtMl == null || vtMl <= 0) return null;
  var vtL = vtMl / 1000;
  return Math.round((fr / vtL) * 10) / 10;
}

/**
 * @param {number | null} pafi
 * @returns {string | null}
 */
export function classifySiraSeverity(pafi) {
  if (pafi == null) return null;
  if (pafi < 100) return 'SIRA severo';
  if (pafi < 200) return 'SIRA moderado';
  if (pafi <= 300) return 'SIRA leve';
  return null;
}

/**
 * @param {Record<string, unknown>} ec
 * @param {{ fr?: unknown, sat?: unknown, pesoKg?: unknown, lab?: { kind?: string | null, pO2?: number | null, pCO2?: number | null, pH?: number | null, sourceLabel?: string } | null }} [ctx]
 */
export function buildVentilatorioCalcHints(ec, ctx) {
  ctx = ctx || {};
  var lab = ctx.lab && typeof ctx.lab === 'object' ? ctx.lab : null;
  var fio2 = parseVentNum(ec.soporteFio2);
  var peep = parseVentNum(ec.vmPeep);
  var pmeseta = parseVentNum(ec.vmPmeseta);
  var vt = parseVentNum(ec.vmVt);
  var fr = parseVentNum(ctx.fr);
  var sat = parseVentNum(ctx.sat);
  var peso = resolveIdealWeightKg(ctx.pesoKg);

  var hints = [];

  var pao2ForPafi = null;
  if (lab && gasometryKindSupportsPafi(lab.kind)) {
    pao2ForPafi = lab.pO2;
  } else if (lab && lab.kind === 'venous') {
    hints.push('Gaso venosa: PaFi no válida — usar SpO₂/FiO₂');
  } else if (lab && lab.kind === 'unknown' && lab.pO2 != null) {
    hints.push('Tipo de gaso no identificado — PaFi omitida');
  }

  var pafi = computePafi(pao2ForPafi, fio2);
  if (pafi != null) {
    var sev = classifySiraSeverity(pafi);
    hints.push('PaFi ' + pafi + (sev ? ' (' + sev + ')' : ''));
    if (pafi < 150) hints.push('PaFi <150: valorar prono');
    if (pafi < 100) hints.push('PaFi <100: SIRA severo');
  }

  var sf = computeSpo2Fio2(sat, fio2);
  if (sf != null) {
    hints.push('SpO₂/FiO₂ ' + sf);
    if (pafi == null && sf < 315) hints.push('SpO₂/FiO₂ <315: sospecha SIRA');
  } else if (sat != null && fio2 == null && soporteTier(ec.soporte) != null) {
    hints.push('SatO₂ ' + sat + '% — falta FiO₂');
  }
  var dp = computeDrivingPressure(pmeseta, peep);
  if (dp != null) {
    hints.push('Driving pressure ' + dp + ' cmH₂O');
    if (dp >= 15) hints.push('Driving pressure ≥15: strain elevado');
  }
  if (pmeseta != null && pmeseta >= 30) hints.push('P meseta ≥30: ventilación no protectora');
  var rox = computeRox(sat, fio2, fr);
  if (rox != null && soporteTier(ec.soporte) === 'hfnc') hints.push('ROX ' + rox);
  if (fio2 != null && fio2 > 60 && soporteTier(ec.soporte) === 'hfnc') {
    hints.push('FiO₂ >60% en alto flujo: valorar intubación');
  }
  var mlKg = computeVtMlKg(vt, peso);
  if (mlKg != null) {
    hints.push('VT ' + mlKg + ' ml/kg');
    if (mlKg > 8) hints.push('VT >8 ml/kg: revisar protección pulmonar');
    if (mlKg > 6 && mlKg <= 8) hints.push('VT 6–8 ml/kg (pulmón normal)');
    if (mlKg <= 6) hints.push('VT ≤6 ml/kg (estrategia ARDS)');
  }
  var rrs = computeTobinRrs(fr, vt);
  if (rrs != null && soporteTier(ec.soporte) === 'vm') {
    hints.push('Tobin RRS ' + rrs);
    if (rrs > 105) hints.push('RRS >105: alto riesgo de falla de destete');
  }
  return hints;
}

/**
 * @param {unknown} n
 * @returns {string}
 */
function fmtNum(n) {
  if (n == null || !Number.isFinite(Number(n))) return '';
  return String(n);
}

/**
 * @param {Record<string, unknown>} ec
 */
export function formatSoporteVentilatorioClause(ec) {
  var soporte = normalizeSoporteValue(ec.soporte);
  var tier = soporteTier(soporte);
  var litros = parseVentNum(ec.soporteLitros);
  var flujo = parseVentNum(ec.soporteFlujoLmin);
  var fio2 = parseVentNum(ec.soporteFio2);
  var fio2Clause = fio2 != null ? ' FI O2 ' + fmtNum(fio2) + '%' : '';

  if (!soporte || soporte === 'Aire ambiente') return 'AL AIRE AMBIENTE';
  if (soporte === 'Traqueostomía') {
    var tqt = 'CON TRAQUEOSTOMÍA';
    if (fio2 != null) tqt += ' FI O2 ' + fmtNum(fio2) + '%';
    return tqt;
  }

  if (tier === 'litros') {
    var litClause = litros != null ? ' A ' + fmtNum(litros) + ' L/MIN' : '';
    if (soporte === 'Puntillas nasales') return 'POR PUNTILLAS NASALES' + litClause;
    if (soporte === 'Mascarilla simple') return 'POR MASCARILLA SIMPLE' + litClause;
    if (soporte === 'Mascarilla reservorio') return 'POR MASCARILLA CON RESERVORIO' + litClause;
  }
  if (tier === 'hfnc') {
    var hf = 'POR ALTO FLUJO';
    if (flujo != null) hf += ' ' + fmtNum(flujo) + ' L/MIN';
    if (fio2 != null) hf += ' FI O2 ' + fmtNum(fio2) + '%';
    return hf;
  }
  if (tier === 'vmni') {
    var epap = parseVentNum(ec.vmPeep);
    var ps = parseVentNum(ec.vmPsoporte);
    var vmni = 'CON VMNI';
    if (ps != null) vmni += ' PS ' + fmtNum(ps);
    if (epap != null) vmni += ' EPAP ' + fmtNum(epap);
    if (fio2 != null) vmni += ' FI O2 ' + fmtNum(fio2) + '%';
    return vmni;
  }
  if (tier === 'vm') {
    var modo = ec.vmModo != null ? String(ec.vmModo).trim() : '';
    var modoLabel =
      modo === 'VCV'
        ? 'VCV'
        : modo === 'PCV'
          ? 'PCV'
          : modo === 'PSV'
            ? 'PSV'
            : '';
    var vm = 'CON VENTILACIÓN MECÁNICA';
    if (modoLabel) vm += ' ' + modoLabel;
    var peep = parseVentNum(ec.vmPeep);
    var vt = parseVentNum(ec.vmVt);
    var vmFlujo = parseVentNum(ec.vmFlujo);
    if (vt != null) vm += ' VT ' + fmtNum(vt) + ' ML';
    if (peep != null) vm += ' PEEP ' + fmtNum(peep);
    if (fio2 != null) vm += ' FI O2 ' + fmtNum(fio2) + '%';
    if (vmFlujo != null) vm += ' FLUJO ' + fmtNum(vmFlujo) + ' L/MIN';
    return vm;
  }

  var fallback = {
    'Puntillas nasales': 'POR PUNTILLAS NASALES',
    'Alto flujo': 'POR ALTO FLUJO',
    VMNI: 'CON VMNI',
  };
  return fallback[soporte] || 'AL AIRE AMBIENTE';
}

/**
 * @param {Record<string, unknown>} ec
 * @param {{ fr?: unknown, sat?: unknown, pesoKg?: unknown, lab?: { kind?: string | null, pO2?: number | null, pCO2?: number | null, pH?: number | null, sourceLabel?: string } | null }} [ctx]
 */
export function formatVentilatorioCalcClause(ec, ctx) {
  var hints = buildVentilatorioCalcHints(ec, ctx);
  if (!hints.length) return '';
  return ' [' + hints.join('; ') + ']';
}
