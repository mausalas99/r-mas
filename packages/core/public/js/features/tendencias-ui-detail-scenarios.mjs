/** Synthetic series for the Tendencias detail view test (inputs only; the expected HTML lives in the .old.json). */
const L = (n) => Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, '0') + '/05');

export const SCENARIOS = {
  'rising out of range, 3 readings': { unit: 'mg/dL', ref: [70, 110], labels: L(3), values: [90, 105, 130], sibs: [], cur: null },
  'falling back into range, 6 readings (Ver todos)': { unit: 'g/dL', ref: [12, 16], labels: L(6), values: [9, 9.5, 10, 11, 12.5, 13.1], sibs: ['Hto', 'Leu'], cur: 'Leu' },
  'below range, getting worse': { unit: 'x10³/µL', ref: [150, 400], labels: L(4), values: [160, 140, 120, 90], sibs: ['Hb'], cur: null },
  'no reference range': { unit: '', ref: null, labels: L(3), values: [4, 4, 7], sibs: [], cur: null },
  'flat latest, null reading in the middle': { unit: 'mEq/L', ref: [135, 145], labels: L(5), values: [140, null, 140, 138, 138], sibs: ['K'], cur: 'gone' },
  'escaping in unit, labels and siblings': { unit: '<b>"mg"</b> & co', ref: [1, 2], labels: ['a<1>', 'b&2', 'c"3"'], values: [1.5, 2.5, 0.5], sibs: ['A "q"', 'B'], cur: 'A "q"' },
  'null latest': { unit: 'u', ref: [1, 2], labels: L(2), values: [1, null], sibs: [], cur: null },
};
