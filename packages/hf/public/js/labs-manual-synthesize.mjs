/**
 * Sintetiza chunks resLabs canónicos desde valores de entrada manual.
 */
import { fieldsForManualLabType, getManualLabType } from './labs-manual-catalog.mjs';

/**
 * Normaliza valor de celda: trim; si parece número, coma→punto.
 * @param {unknown} raw
 * @param {'num'|'qual'} mode
 * @returns {string}
 */
export function normalizeManualLabValue(raw, mode) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  if (mode === 'qual') {
    // Single token so the chunk stays readable as key/value pairs
    return s.replace(/\s+/g, '_');
  }
  var n = s.replace(',', '.');
  // Preserve trailing * (flag clínico) if user typed it
  var star = n.endsWith('*');
  var body = star ? n.slice(0, -1).trim() : n;
  if (/^-?\d+(?:\.\d+)?%?$/.test(body)) {
    return star ? body + '*' : body;
  }
  return s;
}

/**
 * @param {string} sectionKey
 * @param {Record<string, string|number|null|undefined>} valuesByKey
 * @returns {string} chunk resLabs o ''
 */
export function synthesizeManualResLab(sectionKey, valuesByKey) {
  var type = getManualLabType(sectionKey);
  if (!type) return '';
  var fields = fieldsForManualLabType(sectionKey);
  var parts = [];
  var vals = valuesByKey && typeof valuesByKey === 'object' ? valuesByKey : {};
  for (var i = 0; i < fields.length; i++) {
    var fld = fields[i];
    var norm = normalizeManualLabValue(vals[fld.key], fld.mode);
    if (!norm) continue;
    // parsearSecciones only attaches numeric next-tokens to keys; for qual
    // still emit key+value so the chunk is readable in historial/nota.
    parts.push(fld.key, norm);
  }
  if (!parts.length) return '';
  return type.sectionKey + '\t' + parts.join(' ');
}

/**
 * @param {string} sectionKey
 * @param {Record<string, string|number|null|undefined>} valuesByKey
 * @returns {string[]}
 */
export function synthesizeManualResLabs(sectionKey, valuesByKey) {
  var chunk = synthesizeManualResLab(sectionKey, valuesByKey);
  return chunk ? [chunk] : [];
}
