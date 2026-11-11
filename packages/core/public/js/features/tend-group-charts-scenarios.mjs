/** Synthetic inputs for the Tendencias group charts view test (the expected HTML lives in the .old.json). */
const many = Array.from({ length: 14 }, (_, i) => 90 + ((i * 7) % 23) - i);

export const LEGEND = {
  'empty series': { fk: 'hb', label: 'Hb', color: '#112233', checked: true, raw: [] },
  'one point': { fk: 'hb', label: 'Hb', color: '#112233', checked: true, raw: [13.2] },
  'two points, rising': { fk: 'na', label: 'Na', color: '#0a7c5a', checked: true, raw: [138, 142] },
  'many points, unchecked': { fk: 'glu', label: 'Glucosa', color: '#b3261e', checked: false, raw: many },
  'gaps and a falling trend': { fk: 'k', label: 'K', color: '#3355ff', checked: true, raw: [5.1, null, 4.6, null, 3.9] },
  'flat series': { fk: 'cl', label: 'Cl', color: '#444444', checked: true, raw: [100, 100, 100] },
  'first value zero (no change)': { fk: 'bt', label: 'Bilirrubina', color: '#c07a00', checked: true, raw: [0, 1.2, 2.4] },
  'relative scale': { fk: 'creat', label: 'Creatinina', color: '#7a3db8', checked: true, raw: [0.8, 1.6, 2.4], rel: [0.6, 1.2] },
};

export const HIDDEN_BAR = {
  'no hidden panels': [],
  'one hidden panel': [{ fam: 'hematologia', title: 'Hematología' }],
  'three hidden panels, escaped names': [
    { fam: 'renal', title: 'Renal' },
    { fam: 'a&b', title: 'Líquidos <y> "gases"' },
    { fam: 'otros', title: 'Otros' },
  ],
};

export const SCALE = { 'values mode': false, 'relative mode': true };
