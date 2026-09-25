/**
 * Agrupa insulinas preprandial SC en Manejo y Estado Actual (NM).
 */
import {
  extractInsulinPrandialUnits,
  insulinPrandialItemsFromList,
  insulinPrandialSlotLabel,
  isInsulinPrandialMedicationItem,
  parseInsulinPrandialSlot,
  patientHasInsulinPrandialMeds,
  PRANDIAL_MEAL_ORDER,
  PRANDIAL_SLOT_PATTERNS,
} from './insulin-prandial-detect.mjs';

export const INSULIN_PRANDIAL_GROUP_ID = '__insulin_prandial_group__';
export const INSULIN_PRANDIAL_NM_PREFIX = 'INSULINA PREPRANDIAL';

export {
  extractInsulinPrandialUnits,
  insulinPrandialItemsFromList,
  isInsulinPrandialMedicationItem,
  parseInsulinPrandialSlot,
  patientHasInsulinPrandialMeds,
  PRANDIAL_MEAL_ORDER,
  PRANDIAL_SLOT_PATTERNS,
} from './insulin-prandial-detect.mjs';

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
 * @param {{ dosisRaw?: unknown, frecuenciaRaw?: unknown }} item
 * @returns {string}
 */
export function formatInsulinPrandialSlotFragment(item) {
  var slot = parseInsulinPrandialSlot(itemBlob(item));
  if (!slot) return '';
  var units = extractInsulinPrandialUnits(item.dosisRaw);
  var label = insulinPrandialSlotLabel(slot);
  if (units == null) return label;
  return String(units).replace(/\.0$/, '') + ' UI SC ' + label;
}

/**
 * Última indicación por comida (desayuno/comida/cena) en el orden del paste.
 * @param {unknown[]} items
 * @returns {Record<string, unknown>}
 */
export function insulinPrandialLatestBySlot(items) {
  /** @type {Record<string, unknown>} */
  var bySlot = {};
  insulinPrandialItemsFromList(items).forEach(function (it) {
    var slot = parseInsulinPrandialSlot(itemBlob(/** @type {{ dosisRaw?: unknown, frecuenciaRaw?: unknown }} */ (it)));
    if (slot) bySlot[slot] = it;
  });
  return bySlot;
}

/**
 * @param {number | null} units
 * @returns {string}
 */
function formatInsulinPrandialUnits(units) {
  if (units == null) return '';
  return String(units).replace(/\.0$/, '') + ' UI SC';
}

/**
 * @param {Record<string, unknown>} bySlot
 * @returns {string}
 */
function formatInsulinPrandialNmBody(bySlot) {
  /** @type {Array<{ key: string, units: number | null }>} */
  var slots = [];
  PRANDIAL_MEAL_ORDER.forEach(function (key) {
    if (!bySlot[key]) return;
    var item = /** @type {{ dosisRaw?: unknown }} */ (bySlot[key]);
    slots.push({ key: key, units: extractInsulinPrandialUnits(item.dosisRaw) });
  });
  if (!slots.length) return '';

  var unitValues = slots
    .map(function (s) {
      return s.units;
    })
    .filter(function (u) {
      return u != null;
    });
  var allSameUnits =
    unitValues.length >= 2 &&
    unitValues.length === slots.length &&
    unitValues.every(function (u) {
      return u === unitValues[0];
    });

  if (allSameUnits && unitValues[0] != null) {
    return formatInsulinPrandialUnits(unitValues[0]) + ' PREVIO A COMIDAS';
  }

  var parts = [];
  slots.forEach(function (s) {
    var label = insulinPrandialSlotLabel(s.key);
    if (s.units == null) parts.push(label);
    else parts.push(formatInsulinPrandialUnits(s.units) + ' ' + label);
  });
  return parts.join(', ');
}

/**
 * @param {unknown[]} allItems
 * @param {unknown[]} soapSelected
 * @returns {string | null}
 */
export function insulinPrandialNmSoapFragment(allItems, soapSelected) {
  if (!patientHasInsulinPrandialMeds(allItems)) return null;
  var selected = (Array.isArray(soapSelected) ? soapSelected : []).filter(isInsulinPrandialMedicationItem);
  if (!selected.length) return null;
  var bySlot = insulinPrandialLatestBySlot(selected);
  var body = formatInsulinPrandialNmBody(bySlot);
  if (!body) return null;
  return INSULIN_PRANDIAL_NM_PREFIX + ': ' + body;
}

/**
 * @param {unknown} item
 * @param {unknown[]} allItems
 * @returns {boolean}
 */
export function skipRecetaItemForInsulinPrandialBucket(item, allItems) {
  if (!patientHasInsulinPrandialMeds(allItems)) return false;
  return isInsulinPrandialMedicationItem(item);
}

/**
 * @param {(s: string) => string} escFn
 * @returns {string}
 */
export function insulinPrandialMedLabelHtml(allItems, escFn) {
  var frag = insulinPrandialNmSoapFragment(allItems, allItems);
  return escFn(frag || INSULIN_PRANDIAL_NM_PREFIX);
}

/**
 * @param {string} patientId
 * @param {unknown[]} items
 * @param {(patientId: string, itemId: string) => boolean} isSelectedFn
 * @returns {boolean}
 */
export function isInsulinPrandialGroupSoapSelected(patientId, items, isSelectedFn) {
  var prandial = insulinPrandialItemsFromList(items);
  if (!prandial.length) return false;
  return prandial.some(function (it) {
    return isSelectedFn(patientId, String(/** @type {{ id?: unknown }} */ (it).id || ''));
  });
}

/**
 * @param {unknown[]} items
 * @param {(itemId: string) => boolean} isSuspendedFn
 * @returns {boolean}
 */
export function isInsulinPrandialGroupSuspended(items, isSuspendedFn) {
  var prandial = insulinPrandialItemsFromList(items);
  if (!prandial.length) return false;
  return prandial.every(function (it) {
    return isSuspendedFn(String(/** @type {{ id?: unknown }} */ (it).id || ''));
  });
}
