/**
 * Med dropdown options for estado actual panel (from receta items).
 */
import {
  effectiveSoapCategory,
  formatMedicationSoapShort,
} from '../med-receta-core.mjs';
import { shouldIncludeMedicationInSoap } from '../med-receta-soap.mjs';
import { skipRecetaItemForInsulinPumpCarrier } from '../insulin-pump-receta-display.mjs';
import { skipRecetaItemForNmSoapBucket } from '../insulin-pump-receta-display.mjs';
import {
  isInsulinRescateMedicationItem,
  INSULIN_RESCATE_NM_LABEL,
} from '../insulin-rescate-display.mjs';
import { medInstructionFragmentForSoap } from './estado-actual-meds-receta-buckets.mjs';
import { resolveManejoFechaActualizacion } from './estado-actual-meds-core.mjs';

function tryAddInsulinRescateDropdownOption(it, ctx) {
  if (ctx.category !== 'nm' || !isInsulinRescateMedicationItem(it)) return false;
  if (!ctx.rescateAdded) {
    ctx.options.push({ value: INSULIN_RESCATE_NM_LABEL, label: INSULIN_RESCATE_NM_LABEL });
    ctx.rescateAdded = true;
  }
  return true;
}

function medDropdownOptionLabel(it, ctx, value) {
  if (ctx.category === 'abx' && ctx.fecha) {
    return formatMedicationSoapShort(
      /** @type {Parameters<typeof formatMedicationSoapShort>[0]} */ (it),
      { fechaActualizacion: ctx.fecha, refDate: ctx.refDate }
    );
  }
  return value;
}

function tryAddMedDropdownOption(it, ctx) {
  if (!it || /** @type {{ suspendido?: boolean }} */ (it).suspendido) return;
  if (skipRecetaItemForInsulinPumpCarrier(it, ctx.items)) return;
  if (!shouldIncludeMedicationInSoap(
    /** @type {{ nombreRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, suspendido?: boolean }} */ (it),
    ctx.classifyFn
  )) {
    return;
  }
  if (tryAddInsulinRescateDropdownOption(it, ctx)) return;
  var cat = effectiveSoapCategory(
    /** @type {{ nombreRaw?: string, soapCatOverride?: string }} */ (it),
    ctx.classifyFn
  );
  var matchCat = cat === ctx.category || (ctx.category === 'diureticos' && cat === 'diuretico');
  if (!matchCat) return;
  if (ctx.category === 'nm' && skipRecetaItemForNmSoapBucket(it, ctx.items)) return;
  var value = medInstructionFragmentForSoap(/** @type {Parameters<typeof medInstructionFragmentForSoap>[0]} */ (it));
  if (!value || ctx.seen[value]) return;
  ctx.seen[value] = 1;
  ctx.options.push({ value: value, label: medDropdownOptionLabel(it, ctx, value) });
}

/**
 * @param {string | null | undefined} activeId
 * @param {string} category
 * @param {Record<string, { items?: unknown[] }>} medRecetaByPatient
 * @param {(nombreRaw: string) => string} classifyFn
 * @param {Date} [refDate] — día efectivo para ABX en label (default: hoy)
 * @returns {Array<{ value: string, label: string }>}
 */
export function buildMedDropdownOptions(activeId, category, medRecetaByPatient, classifyFn, refDate) {
  /** @type {Array<{ value: string, label: string }>} */
  var options = [];
  var seen = Object.create(null);
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  var items = block && Array.isArray(block.items) ? block.items : [];
  var fecha = category === 'abx' ? resolveManejoFechaActualizacion(activeId, medRecetaByPatient) : '';
  var dropdownCtx = {
    items: items,
    category: category,
    classifyFn: classifyFn,
    fecha: fecha,
    refDate: refDate,
    options: options,
    seen: seen,
    rescateAdded: false,
  };
  items.forEach(function (it) {
    tryAddMedDropdownOption(it, dropdownCtx);
  });

  return options;
}
