/** @typedef {{ volMl: number, meq: number }} KClBagPlan */

export class ClinicalSafetyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClinicalSafetyError';
  }
}

export const VANCO_LOAD_MAX_MG = 3000;
export const VANCO_MAINT_MAX_MG = 2250;
export const MEQ_PER_AMPOULE_8_4_PCT = 50;
export const LEVETIRACETAM_LOAD_MAX_MG = 4500;
export const INSULIN_MAX_U_PER_HR = 50;
export const HYPERTONIC_MAX_ML = 500;
export const ALBUMIN_MAX_GRAMS = 200;
export const PROPOFOL_MAX_MG_PER_KG_H = 4;

const STD_BAG_VOLUMES_ML = [100, 250, 500, 1000];
const MAX_BAG_PLAN_ITERATIONS = 20;

/** @param {unknown} val */
export function requirePositiveFinite(val) {
  var n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** @param {number} n @param {number} min @param {number} max */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** @param {number} volMl @param {number} maxConcMeqPerL */
export function maxMeqForVolume(volMl, maxConcMeqPerL) {
  return (maxConcMeqPerL * volMl) / 1000;
}

/**
 * @param {number} totalMeq
 * @param {number} maxConcMeqPerL
 * @returns {{ bags: KClBagPlan[] }}
 */
export function planStandardKClBags(totalMeq, maxConcMeqPerL) {
  if (!Number.isFinite(totalMeq) || totalMeq <= 0) {
    throw new ClinicalSafetyError('Dosis de K+ inválida');
  }
  if (!Number.isFinite(maxConcMeqPerL) || maxConcMeqPerL <= 0) {
    throw new ClinicalSafetyError('Límite de concentración inválido');
  }

  /** @type {KClBagPlan[]} */
  var bags = [];
  var remaining = totalMeq;
  var iterations = 0;

  while (remaining > 1e-6) {
    if (iterations++ >= MAX_BAG_PLAN_ITERATIONS) {
      throw new ClinicalSafetyError('No se pudo fraccionar K+ en bolsas estándar');
    }

    var placed = false;
    for (var i = 0; i < STD_BAG_VOLUMES_ML.length; i += 1) {
      var vol = STD_BAG_VOLUMES_ML[i];
      var cap = maxMeqForVolume(vol, maxConcMeqPerL);
      if (cap >= remaining) {
        bags.push({ volMl: vol, meq: remaining });
        remaining = 0;
        placed = true;
        break;
      }
    }
    if (placed) continue;

    var bigVol = 1000;
    var chunk = maxMeqForVolume(bigVol, maxConcMeqPerL);
    if (chunk <= 0) {
      throw new ClinicalSafetyError('No se pudo fraccionar K+ en bolsas estándar');
    }
    var use = Math.min(remaining, chunk);
    bags.push({ volMl: bigVol, meq: use });
    remaining -= use;
  }

  return { bags: bags };
}
