/**
 * Pure text builders for the "Texto de egreso" modal (Manejo tab).
 * Two display modes, same labels as the inline Completa/Nombre + Día toggle:
 *  - 'full'   → full order line (drug + dose + route + frequency + day count),
 *               same content as today's egreso line, minus the raw " || "
 *               EMR-paste separator (kept only in the clipboard payload).
 *  - 'simple' → drug name + day count only; the day count is omitted when the
 *               item does not track one (never fabricated).
 */
import { trimStr } from '../med-receta-util.mjs';
import { applyNombreAccents, expandNombrePresentacion } from '../med-receta-nombre.mjs';
import { effectiveDiaTratamiento } from '../med-receta-dates.mjs';
import { applyIvToOralForEgreso } from '../med-receta-iv-oral.mjs';
import { formatMedicationEgresoLine } from '../med-receta-format.mjs';
import {
  formatInsulinPumpAlgoritmoLabel,
  insulinPumpAlgorithmForMedicationItem,
  isInsulinPumpCarrierMedicationItem,
} from '../insulin-pump-some-detect.mjs';
import { mergeDietaItems, collectDietasFromRecetaBlock } from '../med-receta-diet.mjs';

/**
 * Full order line, cleaned of the internal " || " name/instructions marker
 * used by the EMR-paste clipboard text.
 * @param {{ nombreRaw?: string, viaRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number|null, suspendido?: boolean }} item
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 * @returns {string}
 */
export function formatMedEgresoFullLine(item, opts) {
  return formatMedicationEgresoLine(item, opts).replace(' || ', ': ');
}

/**
 * Drug name + day count only. Omits the day count when the item has no
 * diaTratamiento tracked (e.g. PRN items, or SOME rows without a start date).
 * @param {{ nombreRaw?: string, diaTratamiento?: number|null, suspendido?: boolean }} item
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 * @returns {string}
 */
export function formatMedEgresoNameDiaLine(item, opts) {
  var resolved = applyIvToOralForEgreso(item, opts) || item || {};
  var nombre = applyNombreAccents(expandNombrePresentacion(resolved.nombreRaw));
  var dia =
    resolved.diaTratamiento != null
      ? effectiveDiaTratamiento(resolved.diaTratamiento, opts && opts.fechaActualizacion, opts && opts.refDate)
      : null;
  return dia != null ? nombre + ' (día ' + dia + ')' : nombre;
}

/**
 * @param {unknown[]} items
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 * @param {'full'|'simple'} mode
 * @returns {string[]}
 */
export function buildMedEgresoListLines(items, opts, mode) {
  var all = Array.isArray(items) ? items : [];
  var list = all.filter(function (it) {
    return it && !it.suspendido && !isInsulinPumpCarrierMedicationItem(it, all);
  });
  return list.map(function (it) {
    var alg = insulinPumpAlgorithmForMedicationItem(all, it);
    if (alg != null) return formatInsulinPumpAlgoritmoLabel(alg);
    return mode === 'simple' ? formatMedEgresoNameDiaLine(it, opts) : formatMedEgresoFullLine(it, opts);
  });
}

/**
 * Diet summary line, e.g. "Dieta blanda diabética 1000 kcal · 72 g proteína".
 * Empty string when no diet is confirmed for the patient.
 * @param {{ dietas?: unknown[], items?: unknown[] }|null|undefined} block
 * @returns {string}
 */
export function buildMedEgresoDietSummaryLine(block) {
  var merged = mergeDietaItems(collectDietasFromRecetaBlock(block));
  var desc = trimStr(merged.descripcion);
  var bits = [];
  if (merged.kcal != null) bits.push(merged.kcal + ' kcal');
  if (merged.proteinG != null) bits.push(merged.proteinG + ' g proteína');
  if (!desc && !bits.length) return '';
  if (!bits.length) return desc;
  return desc ? desc + ' ' + bits.join(' · ') : bits.join(' · ');
}
