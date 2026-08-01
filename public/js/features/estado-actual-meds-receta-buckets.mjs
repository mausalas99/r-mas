/**
 * Receta → SOAP bucket mapping for estado actual meds sync.
 */
import {
  effectiveSoapCategory,
  formatMedicationSoapShort,
} from '../med-receta-core.mjs';
import { shouldIncludeMedicationInSoap } from '../med-receta-soap.mjs';
import { MED_FIELD_KEYS } from './estado-actual-data.mjs';
import {
  insulinPumpNmSoapFragment,
  skipRecetaItemForNmSoapBucket,
  skipRecetaItemForInsulinPumpCarrier,
} from '../insulin-pump-receta-display.mjs';
import {
  insulinRescateNmSoapFragment,
  skipRecetaItemForInsulinRescateBucket,
} from '../insulin-rescate-display.mjs';

/**
 * @param {{ nombreRaw?: string, viaRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number | null, suspendido?: boolean }} it
 * @returns {string}
 */
export function medInstructionFragmentForSoap(it) {
  return formatMedicationSoapShort(it);
}

/**
 * @param {unknown[]} items
 * @param {Record<string, boolean>} selMap
 * @param {(nombreRaw: string) => string} classifyFn
 * @returns {Record<string, string>}
 */
function maybeAddNmSpecialFragment(it, ctx, cat) {
  if (cat !== 'nm') return false;
  if (skipRecetaItemForNmSoapBucket(it, ctx.list)) {
    if (ctx.pumpNmFrag && !ctx.pumpNmAdded) {
      ctx.arrays.nm.push(ctx.pumpNmFrag);
      ctx.pumpNmAdded = true;
    }
    return true;
  }
  if (skipRecetaItemForInsulinRescateBucket(it, ctx.list)) {
    if (ctx.rescateNmFrag && !ctx.rescateNmAdded) {
      ctx.arrays.nm.push(ctx.rescateNmFrag);
      ctx.rescateNmAdded = true;
    }
    return true;
  }
  return false;
}

function pushRecetaItemToSoapBucket(it, ctx) {
  if (!it || !ctx.selMap[it.id] || it.suspendido) return;
  if (skipRecetaItemForInsulinPumpCarrier(it, ctx.list)) return;
  if (!shouldIncludeMedicationInSoap(it, ctx.classifyFn)) return;
  var cat = effectiveSoapCategory(it, ctx.classifyFn);
  if (cat === 'otros') return;
  if (maybeAddNmSpecialFragment(it, ctx, cat)) return;
  var frag = medInstructionFragmentForSoap(it);
  if (ctx.arrays[cat]) ctx.arrays[cat].push(frag);
  else ctx.arrays.otros.push(frag);
}

export function bucketsFromRecetaItems(items, selMap, classifyFn) {
  /** @type {Record<string, string[]>} */
  var arrays = {
    analgesia: [],
    antiemeticos: [],
    sedacion: [],
    antiepilepticos: [],
    antiparkinsonianos: [],
    antidotos: [],
    viaAerea: [],
    abx: [],
    transfusiones: [],
    antihta: [],
    diuretico: [],
    antitromboticos: [],
    anticoagulacion: [],
    antiarritmicos: [],
    estatinas: [],
    vasop: [],
    nm: [],
    otros: [],
  };
  var list = Array.isArray(items) ? items : [];
  var soapSelected = list.filter(function (it) {
    return it && selMap[it.id] && !it.suspendido;
  });
  var pumpNmFrag = insulinPumpNmSoapFragment(list, soapSelected);
  var rescateNmFrag = insulinRescateNmSoapFragment(list, soapSelected);
  var bucketCtx = {
    list: list,
    selMap: selMap,
    classifyFn: classifyFn,
    arrays: arrays,
    pumpNmFrag: pumpNmFrag,
    pumpNmAdded: false,
    rescateNmFrag: rescateNmFrag,
    rescateNmAdded: false,
  };
  list.forEach(function (it) {
    pushRecetaItemToSoapBucket(it, bucketCtx);
  });
  /** @type {Record<string, string>} */
  var buckets = {};
  for (var k of MED_FIELD_KEYS) {
    var srcKey = k === 'diureticos' ? 'diuretico' : k;
    buckets[k] = (arrays[srcKey] || []).join(' | ');
  }
  return buckets;
}
