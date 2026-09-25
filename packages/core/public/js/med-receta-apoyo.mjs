/**
 * Apoyo (support) items in a patient's Manejo list: oxygen therapy and similar
 * non-pharmacologic support that is NOT a medication for counting/SOAP purposes.
 * These render in the same Manejo table but count separately in the turno header
 * ("Medicamentos del turno · 11" + "más 1 apoyo (O₂)") and are not SOAP-eligible.
 */
import { normalizeNombreForSoapClassify } from './med-receta-nombre.mjs';

/** Kinds of apoyo currently recognized. Extend here as new support items appear. */
export var APOYO_KIND_OXIGENO = 'oxigeno';

var OXIGENO_RE = /\b(OXIGENO|CANULA\s+NASAL|PUNTAS\s+NASALES|MASCARILLA\s+(RESERVORIO|SIMPLE|VENTURI)|CPAP|BIPAP)\b|\bO2\b/;

/**
 * @param {string} nombreRaw
 * @returns {string} one of APOYO_KIND_* or '' if not an apoyo item
 */
export function classifyApoyoKind(nombreRaw) {
  var n = normalizeNombreForSoapClassify(nombreRaw);
  if (OXIGENO_RE.test(n)) return APOYO_KIND_OXIGENO;
  return '';
}

/** @param {string} nombreRaw */
export function isApoyoMedicationNombre(nombreRaw) {
  return classifyApoyoKind(nombreRaw) !== '';
}

/** @param {{ nombreRaw?: string }} item */
export function isApoyoMedicationItem(item) {
  return !!item && isApoyoMedicationNombre(item.nombreRaw);
}

/** Short label used next to the apoyo kind in the turno header, e.g. "O₂". */
export var APOYO_KIND_LABELS = {
  oxigeno: 'O₂',
};

/** @param {string} kind */
export function apoyoKindLabel(kind) {
  return APOYO_KIND_LABELS[kind] || '';
}
