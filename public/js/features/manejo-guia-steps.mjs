/**
 * @param {import('../manejo-pathology-catalog.mjs').ManejoPathologyEntry} entry
 * @returns {Array<{ number: number, sectionId: string, sectionTitle: string, item: object }>}
 */
export function flattenPathologySteps(entry) {
  var out = [];
  var n = 0;
  (entry.sections || []).forEach(function (section) {
    (section.items || []).forEach(function (item) {
      n += 1;
      out.push({
        number: n,
        sectionId: section.id,
        sectionTitle: section.title,
        item: item,
      });
    });
  });
  return out;
}

/** @param {string} tier */
export function tierChipLabel(tier) {
  if (tier === 'first-line') return '1.ª línea';
  if (tier === 'alternative') return 'Alternativa';
  return '';
}
