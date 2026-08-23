// Calcio corregido por albúmina: cCa = Ca + 0.8 × (4 − Alb[g/dL]).
import { marcarSegunRango } from './labs-extract.mjs';

function parseLabNum_(str) {
  if (str === '---' || str == null || str === '') return null;
  var n = parseFloat(String(str).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function formatCacToken_(cac) {
  if (cac == null || !isFinite(cac)) return '---';
  var rounded = Math.round((cac + Number.EPSILON) * 10) / 10;
  var cacStr = rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
  return marcarSegunRango(cacStr, 8.5, 10.5);
}

/**
 * cCa = Ca + 0.8 × (4 − Alb). Requiere calcio y albúmina numéricos.
 */
export function computeCorrectedCalciumValue_(caStr, albStr) {
  var ca = parseLabNum_(caStr);
  var alb = parseLabNum_(albStr);
  if (ca == null || alb == null) return null;
  return ca + 0.8 * (4 - alb);
}

/** cCa formateado con * si fuera de 8.5–10.5; '---' sin calcio o albúmina. */
export function computeCorrectedCalcium_(caStr, albStr) {
  return formatCacToken_(computeCorrectedCalciumValue_(caStr, albStr));
}
