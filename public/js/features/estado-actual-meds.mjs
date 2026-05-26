import { formatMedicationEgresoLine } from '../med-receta-core.mjs';
import { MED_FIELD_KEYS } from './estado-actual-data.mjs';

/**
 * @param {{ nombreRaw?: string, viaRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number | null, suspendido?: boolean }} it
 * @returns {string}
 */
export function medInstructionFragmentForSoap(it) {
  var full = formatMedicationEgresoLine(it);
  var parts = full.split('||');
  if (parts.length < 2) return full.replace(/\.\s*$/, '').trim();
  return parts[1].replace(/^\s+/, '').replace(/\.\s*$/, '').trim();
}

/**
 * @param {unknown[]} items
 * @param {Record<string, boolean>} selMap
 * @param {(nombreRaw: string) => string} classifyFn
 * @returns {Record<string, string>}
 */
export function bucketsFromRecetaItems(items, selMap, classifyFn) {
  /** @type {Record<string, string[]>} */
  var arrays = { analgesia: [], abx: [], antihta: [], vasop: [], otros: [] };
  var list = Array.isArray(items) ? items : [];
  list.forEach(function (it) {
    if (!it || !selMap[it.id] || it.suspendido) return;
    var cat = classifyFn(it.nombreRaw);
    if (arrays[cat]) arrays[cat].push(medInstructionFragmentForSoap(it));
    else arrays.otros.push(medInstructionFragmentForSoap(it));
  });
  arrays.otros.forEach(function (t) {
    arrays.abx.push(t);
  });
  /** @type {Record<string, string>} */
  var buckets = {};
  for (var k of MED_FIELD_KEYS) {
    buckets[k] = arrays[k].join(' | ');
  }
  return buckets;
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {Record<string, string>} buckets
 */
export function applyRecetaProposal(monitoreo, buckets) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') {
    monitoreo.pendienteReceta = {};
  }
  for (var k of MED_FIELD_KEYS) {
    if (monitoreo.confirmado && monitoreo.confirmado[k]) continue;
    var val = buckets && buckets[k];
    if (val != null && String(val).trim()) {
      monitoreo.pendienteReceta[k] = String(val).trim();
    }
  }
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {string} key
 */
export function confirmMedField(monitoreo, key) {
  if (!monitoreo || !MED_FIELD_KEYS.includes(/** @type {typeof MED_FIELD_KEYS[number]} */ (key))) return;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== 'object') {
    monitoreo.estadoClinico = {};
  }
  var pending =
    monitoreo.pendienteReceta &&
    typeof monitoreo.pendienteReceta === 'object' &&
    monitoreo.pendienteReceta[key];
  if (pending != null && String(pending).trim()) {
    /** @type {Record<string, string>} */ (monitoreo.estadoClinico)[key] = String(pending).trim();
  }
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') {
    monitoreo.confirmado = {};
  }
  /** @type {Record<string, boolean>} */ (monitoreo.confirmado)[key] = true;
  if (monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object') {
    monitoreo.pendienteReceta[key] = '';
  }
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {string} key
 */
export function discardMedProposal(monitoreo, key) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return;
  if (MED_FIELD_KEYS.includes(/** @type {typeof MED_FIELD_KEYS[number]} */ (key))) {
    monitoreo.pendienteReceta[key] = '';
  }
}

/**
 * @param {Record<string, unknown>} monitoreo
 */
export function confirmAllMedProposals(monitoreo) {
  for (var k of MED_FIELD_KEYS) {
    if (
      monitoreo.pendienteReceta &&
      typeof monitoreo.pendienteReceta === 'object' &&
      monitoreo.pendienteReceta[k]
    ) {
      confirmMedField(monitoreo, k);
    }
  }
}

/**
 * @param {string | null | undefined} activeId
 * @param {string} category
 * @param {Record<string, { items?: unknown[] }>} medRecetaByPatient
 * @param {(nombreRaw: string) => string} classifyFn
 * @returns {string[]}
 */
export function buildMedDropdownOptions(activeId, category, medRecetaByPatient, classifyFn) {
  /** @type {string[]} */
  var options = [];
  var seen = Object.create(null);
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  var items = block && Array.isArray(block.items) ? block.items : [];

  items.forEach(function (it) {
    if (!it || /** @type {{ suspendido?: boolean }} */ (it).suspendido) return;
    var cat = classifyFn(/** @type {{ nombreRaw?: string }} */ (it).nombreRaw);
    var matchCat = cat === category || (category === 'abx' && cat === 'otros');
    if (!matchCat) return;
    var frag = medInstructionFragmentForSoap(/** @type {Parameters<typeof medInstructionFragmentForSoap>[0]} */ (it));
    if (!frag || seen[frag]) return;
    seen[frag] = 1;
    options.push(frag);
  });

  return options;
}
