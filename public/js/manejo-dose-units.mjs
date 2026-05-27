/** Preferencia HU (mcg/min) vs estándar (mcg/kg/min) en infusiones vasopresoras. */

var STORAGE_KEY = 'manejo-dose-unit-mode';

/** @typedef {'hu'|'standard'} DoseUnitMode */

/** @returns {DoseUnitMode} */
export function getDoseUnitMode() {
  try {
    var v = sessionStorage.getItem(STORAGE_KEY);
    if (v === 'standard' || v === 'hu') return v;
  } catch (_e) {}
  return 'hu';
}

/** @param {DoseUnitMode} mode */
export function setDoseUnitMode(mode) {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode === 'standard' ? 'standard' : 'hu');
  } catch (_e) {}
}

/**
 * @param {number} weightKg
 * @param {number} mcgKgMinLow
 * @param {number} [mcgKgMinHigh]
 */
export function calcMcgMinFromPerKg(weightKg, mcgKgMinLow, mcgKgMinHigh) {
  var w = Number(weightKg);
  var lo = Number(mcgKgMinLow);
  var hi = mcgKgMinHigh != null ? Number(mcgKgMinHigh) : lo;
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(lo)) {
    return { copyLine: '', mcgMinLow: null, mcgMinHigh: null };
  }
  var mcgMinLow = Math.round(w * lo * 100) / 100;
  var mcgMinHigh = Math.round(w * hi * 100) / 100;
  var range =
    mcgMinLow === mcgMinHigh
      ? String(mcgMinLow)
      : mcgMinLow + '–' + mcgMinHigh;
  return {
    mcgMinLow: mcgMinLow,
    mcgMinHigh: mcgMinHigh,
    copyLine:
      '≈ ' +
      range +
      ' mcg/min (' +
      lo +
      (hi !== lo ? '–' + hi : '') +
      ' mcg/kg/min × ' +
      w +
      ' kg)',
  };
}

/**
 * @param {object|null|undefined} entry
 * @param {DoseUnitMode} mode
 * @param {number|null|undefined} weightKg
 */
export function resolveProtocolWithDoseMode(entry, mode, weightKg) {
  if (!entry || !entry.doseUnitSwitch) return entry;
  var sw = entry.doseUnitSwitch;
  var variant = mode === 'standard' ? sw.standard : sw.hu;
  if (!variant) return entry;

  var resolved = Object.assign({}, entry);
  if (variant.indicationText) resolved.indicationText = variant.indicationText;
  if (variant.copyTemplate) resolved.copyTemplate = variant.copyTemplate;
  if (variant.someFields) {
    resolved.someFields = Object.assign({}, entry.someFields || {}, variant.someFields);
  }
  if (variant.notes) resolved.notes = variant.notes.slice();

  if (mode === 'standard' && sw.perKgRange && weightKg != null && Number(weightKg) > 0) {
    var conv = calcMcgMinFromPerKg(weightKg, sw.perKgRange[0], sw.perKgRange[1]);
    if (conv.copyLine) {
      resolved.notes = (resolved.notes || []).concat([conv.copyLine]);
    }
  }

  return resolved;
}
