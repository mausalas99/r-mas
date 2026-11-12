/** Synthetic inputs for the lab results card view tests. */
export const HOUR_HEADERS = {
  full: { text: '11:44 · Toma de la mañana', altered: 2 },
  one: { text: '06:05 · Ingreso', altered: 1 },
  none: { text: '11:44 · Toma de la mañana', altered: 0 },
  hourOnly: { text: '9:30', altered: 0 },
  labelOnly: { text: 'Sin hora <x> & co', altered: 3 },
};
export const CHIPS = {
  mixed: [
    { label: 'K', value: '6.8', critical: true, trend: '↑' },
    { label: 'Na <x>', value: '128', critical: false, trend: '↓' },
    { label: 'Hb', value: '8.1', critical: false, trend: '' },
  ],
  one: [{ label: 'Cr', value: '2.4', critical: false, trend: '' }],
  none: [],
};
