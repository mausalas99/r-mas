/**
 * Receta → SOAP bucket mapping for estado actual meds sync.
 */
import {
  effectiveSoapCategory,
  formatMedicationSoapShort,
} from '../med-receta-core.mjs';
import { shouldIncludeMedicationInSoap } from '../med-receta-soap.mjs';
import { MED_FIELD_KEYS } from './estado-actual-data.mjs';
import { getPatients } from '../app-state.mjs';
import { dayKeyFromIso } from './eventualidades-store.mjs';
import { medAdminScheduleForItem } from '../med-admin-schedule.mjs';
import {
  insulinPumpNmSoapFragment,
  skipRecetaItemForNmSoapBucket,
  skipRecetaItemForInsulinPumpCarrier,
} from '../insulin-pump-receta-display.mjs';
import {
  insulinRescateNmSoapFragment,
  skipRecetaItemForInsulinRescateBucket,
} from '../insulin-rescate-display.mjs';
import {
  insulinPrandialNmSoapFragment,
  skipRecetaItemForInsulinPrandialBucket,
} from '../insulin-prandial-display.mjs';
import {
  potassiumReposNmSoapFragment,
  skipRecetaItemForPotassiumReposBucket,
} from '../potassium-repos-display.mjs';
import { isPotassiumReposCarrierMedicationItem } from '../potassium-repos-detect.mjs';
import {
  stanfordSolutionNmSoapFragment,
  skipRecetaItemForStanfordSolutionBucket,
} from '../stanford-solution-display.mjs';

/** @returns {Record<string, boolean> | null} today's not-administered marks for a patient, or null if none/stale */
function notAdminMapForPatient(patientId) {
  if (!patientId) return null;
  var patient = getPatients().find(function (p) {
    return String(p.id) === String(patientId);
  });
  var medAdmin = patient && patient.medAdmin;
  if (!medAdmin || typeof medAdmin !== 'object') return null;
  if (medAdmin.day !== dayKeyFromIso(new Date().toISOString())) return null;
  return medAdmin.notAdmin && typeof medAdmin.notAdmin === 'object' ? medAdmin.notAdmin : null;
}

/** @returns {{ missed: string[], total: number }} which of the item's scheduled dose times were marked not-given today */
function missedDoseTimesForItem(notAdminMap, item) {
  if (!notAdminMap || !item) return { missed: [], total: 0 };
  var times = medAdminScheduleForItem(item).defaultTimes || [];
  var missed = times.filter(function (t) {
    return !!notAdminMap[item.id + '|' + t];
  });
  return { missed: missed, total: times.length };
}

/**
 * @param {{ id?: string, nombreRaw?: string, viaRaw?: string, dosisRaw?: string, frecuenciaRaw?: string, diaTratamiento?: number | null, suspendido?: boolean }} it
 * @param {Record<string, boolean> | null} [notAdminMap] today's not-administered marks, keyed `itemId|hh:mm`
 * @returns {string}
 */
export function medInstructionFragmentForSoap(it, notAdminMap) {
  var frag = formatMedicationSoapShort(it);
  var info = missedDoseTimesForItem(notAdminMap, it);
  if (!info.missed.length) return frag;
  if (info.missed.length === info.total) return frag + ' (NO ADMINISTRADA)';
  return frag + ' (NO ADMINISTRADO, ' + info.missed.join(', ') + ')';
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
  if (skipRecetaItemForInsulinPrandialBucket(it, ctx.list)) {
    if (ctx.prandialNmFrag && !ctx.prandialNmAdded) {
      ctx.arrays.nm.push(ctx.prandialNmFrag);
      ctx.prandialNmAdded = true;
    }
    return true;
  }
  if (skipRecetaItemForPotassiumReposBucket(it, ctx.list)) {
    if (ctx.kReposNmFrag && !ctx.kReposNmAdded) {
      ctx.arrays.nm.push(ctx.kReposNmFrag);
      ctx.kReposNmAdded = true;
    }
    return true;
  }
  return false;
}

function pushRecetaItemToSoapBucket(it, ctx) {
  if (!it || !ctx.selMap[it.id] || it.suspendido) return;
  if (skipRecetaItemForInsulinPumpCarrier(it, ctx.list)) return;
  if (isPotassiumReposCarrierMedicationItem(it, ctx.list)) return;
  if (skipRecetaItemForStanfordSolutionBucket(it, ctx.list)) {
    if (ctx.stanfordNmFrag && !ctx.stanfordNmAdded) {
      ctx.arrays.nm.push(ctx.stanfordNmFrag);
      ctx.stanfordNmAdded = true;
    }
    return;
  }
  if (!shouldIncludeMedicationInSoap(it, ctx.classifyFn)) return;
  var cat = effectiveSoapCategory(it, ctx.classifyFn);
  if (cat === 'otros') return;
  if (maybeAddNmSpecialFragment(it, ctx, cat)) return;
  var frag = medInstructionFragmentForSoap(it, ctx.notAdminMap);
  if (ctx.arrays[cat]) ctx.arrays[cat].push(frag);
  else ctx.arrays.otros.push(frag);
}

export function bucketsFromRecetaItems(items, selMap, classifyFn, patientId) {
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
  var prandialNmFrag = insulinPrandialNmSoapFragment(list, soapSelected);
  var kReposNmFrag = potassiumReposNmSoapFragment(list, soapSelected);
  var stanfordNmFrag = stanfordSolutionNmSoapFragment(list, soapSelected);
  var bucketCtx = {
    list: list,
    selMap: selMap,
    classifyFn: classifyFn,
    arrays: arrays,
    pumpNmFrag: pumpNmFrag,
    pumpNmAdded: false,
    rescateNmFrag: rescateNmFrag,
    rescateNmAdded: false,
    prandialNmFrag: prandialNmFrag,
    prandialNmAdded: false,
    kReposNmFrag: kReposNmFrag,
    kReposNmAdded: false,
    stanfordNmFrag: stanfordNmFrag,
    stanfordNmAdded: false,
    notAdminMap: notAdminMapForPatient(patientId),
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
