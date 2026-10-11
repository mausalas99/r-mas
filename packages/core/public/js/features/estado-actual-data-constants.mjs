export { MED_FIELD_KEYS } from '../../../lib/monitoreo-merge.mjs';

/** @type {readonly string[]} */
export const VITAL_KEYS = ['tas', 'tad', 'fc', 'fr', 'temp', 'sat'];

/** Campos calóricos de dieta EA (no aplican a suplemento). */
export const DIET_CALORIC_KEYS = /** @type {const} */ (['kcalKg', 'kcal', 'proteinG']);
