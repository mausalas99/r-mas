/** @type {ReadonlyArray<{ id: string, label: string, title: string }>} */
export const ENTREGA_CHIP_MARKERS = [
  { id: 'critico', label: 'CR', title: 'Paciente crítico' },
  { id: 'negativas', label: 'NF', title: 'Negativas firmadas' },
  { id: 'show', label: 'SH', title: 'Show' },
];

/**
 * @param {string[]} markerIds
 * @returns {Array<{ id: string, label: string, title: string }>}
 */
export function resolveEntregaChipMarkers(markerIds) {
  const set = new Set(markerIds);
  return ENTREGA_CHIP_MARKERS.filter((m) => set.has(m.id));
}
