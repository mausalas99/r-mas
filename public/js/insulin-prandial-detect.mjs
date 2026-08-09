/**
 * Detección de insulina preprandial SC en bloques SOME.
 * Reconoce indicación por comida (ANTES DEL DESAYUNO/COMIDA/CENA) o por turno (EN AM/MEDIODIA/PM).
 */
import { isInsulinRescateMedicationItem } from './insulin-rescate-detect.mjs';

var INSULIN_RE = /\bINSULINA\b/i;
var SC_VIA_RE = /\b(?:VIA\s+)?SUBCUT[AÁ]NEA\b|\bSC\b/i;

/** @type {ReadonlyArray<{ key: string, label: string, re: RegExp }>} */
export var PRANDIAL_SLOT_PATTERNS = [
  {
    key: 'desayuno',
    label: 'DESAYUNO',
    re: /\b(?:ANTES\s+DEL\s+DESAYUNO|ANTES\s+DE\s+(?:LA\s+)?DESAYUNO|EN\s+AM)\b/i,
  },
  {
    key: 'comida',
    label: 'COMIDA',
    re: /\b(?:ANTES\s+DE\s+LA\s+COMIDA|ANTES\s+DEL\s+ALMUERZO|EN\s+MEDIOD[IÍ]A)\b/i,
  },
  {
    key: 'cena',
    label: 'CENA',
    re: /\b(?:ANTES\s+DE\s+LA\s+CENA|ANTES\s+DEL\s+CENA|EN\s+PM)\b/i,
  },
];

export var PRANDIAL_MEAL_ORDER = ['desayuno', 'comida', 'cena'];

/**
 * @param {{ dosisRaw?: unknown, frecuenciaRaw?: unknown }} item
 * @returns {string}
 */
function itemBlob(item) {
  return [item.dosisRaw, item.frecuenciaRaw]
    .map(function (x) {
      return String(x || '');
    })
    .join(' ');
}

/**
 * @param {unknown} blob
 * @returns {string | null}
 */
export function parseInsulinPrandialSlot(blob) {
  var s = String(blob || '');
  for (var i = 0; i < PRANDIAL_SLOT_PATTERNS.length; i += 1) {
    var slot = PRANDIAL_SLOT_PATTERNS[i];
    if (slot.re.test(s)) return slot.key;
  }
  return null;
}

/**
 * @param {unknown} dosisRaw
 * @returns {number | null}
 */
export function extractInsulinPrandialUnits(dosisRaw) {
  var left = String(dosisRaw || '').split('//')[0].trim();
  var m = left.match(/(\d+(?:[.,]\d+)?)\s*(?:UI|U\.?I\.?|UNIDADES?)\b/i);
  if (!m) return null;
  var n = Number(String(m[1]).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param {{ nombreRaw?: unknown, viaRaw?: unknown, dosisRaw?: unknown, frecuenciaRaw?: unknown, suspendido?: boolean }} item
 * @returns {boolean}
 */
export function isInsulinPrandialMedicationItem(item) {
  if (!item || item.suspendido) return false;
  if (isInsulinRescateMedicationItem(item)) return false;
  if (!INSULIN_RE.test(String(item.nombreRaw || ''))) return false;
  if (!SC_VIA_RE.test(String(item.viaRaw || ''))) return false;
  return parseInsulinPrandialSlot(itemBlob(item)) != null;
}

/**
 * @param {unknown[]} items
 * @returns {unknown[]}
 */
export function insulinPrandialItemsFromList(items) {
  return (Array.isArray(items) ? items : []).filter(isInsulinPrandialMedicationItem);
}

/**
 * @param {unknown[]} items
 * @returns {boolean}
 */
export function patientHasInsulinPrandialMeds(items) {
  return insulinPrandialItemsFromList(items).length > 0;
}

/**
 * @param {string} slotKey
 * @returns {string}
 */
export function insulinPrandialSlotLabel(slotKey) {
  for (var i = 0; i < PRANDIAL_SLOT_PATTERNS.length; i += 1) {
    if (PRANDIAL_SLOT_PATTERNS[i].key === slotKey) return PRANDIAL_SLOT_PATTERNS[i].label;
  }
  return String(slotKey || '').toUpperCase();
}
