/** Tono por familia ATB — 4 grupos farmacológicos, matices suaves (no arcoíris). */

export const ATB_FAMILY_COLOR_PREFIX = 'manejo-atb-family';

/** @param {string} familyId */
export function atbFamilyCssClass(familyId) {
  if (!familyId || familyId === 'all') return '';
  return ATB_FAMILY_COLOR_PREFIX + '--' + familyId;
}
