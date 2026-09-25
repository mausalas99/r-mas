import { toNum_ } from './labs-extract.mjs';

/** @param {string} raw */
export function parseFluidLeu_(raw) {
  var c = String(raw || '').replace(/\*/g, '').trim();
  if (!c) return null;
  if (/^\d{1,3},\d{3}$/.test(c)) c = c.replace(',', '');
  else c = c.replace(',', '.');
  return toNum_(c);
}

/**
 * PMN absoluto o %; infiere conteo con leu total cuando aplica.
 * @param {string} raw
 * @param {number|null} leuNum
 */
export function parsePmnField_(raw, leuNum, unidad) {
  var empty = { pmnNum: null, pmnPct: null, predominant: false };
  if (!raw) return empty;
  var s = String(raw).replace(/\*/g, '').trim().toUpperCase();
  if (/PREDOMIN/i.test(s)) return { pmnNum: null, pmnPct: null, predominant: true };
  var pctMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*%?$/);
  if (!pctMatch) return empty;
  var n = toNum_(pctMatch[1]);
  if (n == null) return empty;

  // El reporte trae la unidad («POLIMORFONUCLEARES / * / 96 / %»), así que no
  // hace falta adivinarla por el tamaño del número. Antes un absoluto de 80
  // junto a Leu 9200 se leía como 80% y salía un PMN de 7360, que dispara la
  // alerta de PBE con antibiótico empírico sobre un líquido que no la tiene.
  var esPorcentaje = /%/.test(s) || /%/.test(String(unidad || ''));
  if (esPorcentaje) {
    return {
      pmnNum: leuNum != null ? Math.round((leuNum * n) / 100) : null,
      pmnPct: n,
      predominant: n >= 50,
    };
  }
  // Sin «%» un número mayor que 100 sólo puede ser absoluto. Uno de 100 o menos
  // es ambiguo, y ahí no se inventa: se deja sin resolver para que la alerta
  // pida confirmar el PMN absoluto en vez de afirmar una PBE.
  if (n > 100) return { pmnNum: n, pmnPct: null, predominant: true };
  return empty;
}

/** @param {string} raw */
export function isGramNegative_(raw) {
  return /\bNEGAT/i.test(String(raw || ''));
}

/**
 * Un Gram (o su comentario) describe organismos. `POLIMORFONUCLE` y
 * `ABUNDANT` describen células, no bacterias — "ABUNDANTES LEUCOCITOS" o
 * "ABUNDANTES POLIMORFONUCLEARES, NO BACTERIAS" son un recuento celular, y
 * antes disparaban la misma alerta de infección bacteriana que un Gram
 * realmente positivo.
 * @param {string} raw
 */
export function gramIsPositive_(raw) {
  var s = String(raw || '').trim();
  if (!s || isGramNegative_(s)) return false;
  return /\b(POSITIV|COCC|BACIL)/i.test(s);
}

/** Proteína LCR con posible sufijo de bandera (p. ej. 120B). */
export function parseLcrProteinMgdl_(raw) {
  var s = String(raw || '').replace(/\*/g, '').trim();
  if (!s) return null;
  var m = s.match(/^(\d+(?:[.,]\d+)?)/);
  return m ? toNum_(m[1]) : null;
}
