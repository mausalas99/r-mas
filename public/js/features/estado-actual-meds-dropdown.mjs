/**
 * Med dropdown options for estado actual panel (from receta items).
 */
import {
  effectiveSoapCategory,
  formatMedicationSoapShort,
} from '../med-receta-core.mjs';
import { shouldIncludeMedicationInSoap } from '../med-receta-soap.mjs';
import {
  skipRecetaItemForInsulinPumpCarrier,
  skipRecetaItemForNmSoapBucket,
  insulinPumpNmSoapFragment,
} from '../insulin-pump-receta-display.mjs';
import { isInsulinIvMedicationItem } from '../insulin-pump-some-detect.mjs';
import {
  isInsulinRescateMedicationItem,
  INSULIN_RESCATE_NM_LABEL,
} from '../insulin-rescate-display.mjs';
import {
  isInsulinPrandialMedicationItem,
  INSULIN_PRANDIAL_NM_PREFIX,
  insulinPrandialNmSoapFragment,
} from '../insulin-prandial-display.mjs';
import {
  isPotassiumReposCarrierMedicationItem,
  isPotassiumReposMedicationItem,
  potassiumReposNmSoapFragment,
} from '../potassium-repos-display.mjs';
import { medInstructionFragmentForSoap } from './estado-actual-meds-receta-buckets.mjs';
import { resolveManejoFechaActualizacion } from './estado-actual-meds-core.mjs';

function tryAddInsulinPumpDropdownOption(it, ctx) {
  if (ctx.category !== 'nm' || !isInsulinIvMedicationItem(it)) return false;
  if (!ctx.pumpAdded) {
    var frag = insulinPumpNmSoapFragment(ctx.items, ctx.items);
    if (frag) {
      ctx.options.push({ value: frag, label: frag });
      ctx.pumpAdded = true;
    }
  }
  return true;
}

function tryAddPotassiumReposDropdownOption(it, ctx) {
  if (ctx.category !== 'nm' || !isPotassiumReposMedicationItem(it)) return false;
  if (!ctx.kReposAdded) {
    var frag = potassiumReposNmSoapFragment(ctx.items, ctx.items);
    if (frag) {
      ctx.options.push({ value: frag, label: frag });
      ctx.kReposAdded = true;
    }
  }
  return true;
}

function tryAddInsulinRescateDropdownOption(it, ctx) {
  if (ctx.category !== 'nm' || !isInsulinRescateMedicationItem(it)) return false;
  if (!ctx.rescateAdded) {
    ctx.options.push({ value: INSULIN_RESCATE_NM_LABEL, label: INSULIN_RESCATE_NM_LABEL });
    ctx.rescateAdded = true;
  }
  return true;
}

function tryAddInsulinPrandialDropdownOption(it, ctx) {
  if (ctx.category !== 'nm' || !isInsulinPrandialMedicationItem(it)) return false;
  if (!ctx.prandialAdded) {
    var frag = insulinPrandialNmSoapFragment(ctx.items, ctx.items);
    ctx.options.push({
      value: frag || INSULIN_PRANDIAL_NM_PREFIX,
      label: frag || INSULIN_PRANDIAL_NM_PREFIX,
    });
    ctx.prandialAdded = true;
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
  if (isPotassiumReposCarrierMedicationItem(it, ctx.items)) return;
  if (!shouldIncludeMedicationInSoap(
    /** @type {{ nombreRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, suspendido?: boolean }} */ (it),
    ctx.classifyFn
  )) {
    return;
  }
  if (tryAddInsulinPumpDropdownOption(it, ctx)) return;
  if (tryAddInsulinRescateDropdownOption(it, ctx)) return;
  if (tryAddInsulinPrandialDropdownOption(it, ctx)) return;
  if (tryAddPotassiumReposDropdownOption(it, ctx)) return;
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
    pumpAdded: false,
    rescateAdded: false,
    prandialAdded: false,
    kReposAdded: false,
  };
  items.forEach(function (it) {
    tryAddMedDropdownOption(it, dropdownCtx);
  });

  return options;
}
