/**
 * Detección de la Solución Stanford: varios medicamentos del mismo bloque
 * MEDICAMENTOS marcados "PARA SOLUCIÓN STANFORD" en la dosis, para fusionarlos
 * en una sola línea (igual que la reposición de potasio).
 */
import { trimStr } from './med-receta-util.mjs';

var STANFORD_MARKER_RE = /SOLUCI[ÓO]N\s+STANFORD/i;

/**
 * @param {{ dosisRaw?: unknown, suspendido?: boolean } | null | undefined} item
 * @returns {boolean}
 */
export function isStanfordSolutionMedicationItem(item) {
  if (!item || item.suspendido) return false;
  return STANFORD_MARKER_RE.test(trimStr(item.dosisRaw));
}

/**
 * @param {unknown[]} items
 * @returns {unknown[]}
 */
export function stanfordSolutionItemsFromList(items) {
  return (Array.isArray(items) ? items : []).filter(isStanfordSolutionMedicationItem);
}

/**
 * @param {unknown[]} items
 * @returns {boolean}
 */
export function patientHasStanfordSolutionMeds(items) {
  return stanfordSolutionItemsFromList(items).length > 0;
}
