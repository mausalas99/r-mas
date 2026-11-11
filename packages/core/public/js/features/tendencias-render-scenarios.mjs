/** Synthetic inputs for the Tendencias list / toolbar / hidden-chips view tests (the expected HTML lives in the .old.json). */
const set = (sk, fk, v, fecha, hora) => ({ fecha, hora, parsedBySection: { [sk]: { [fk]: v } } });
const sets = (sk, fk, latest, prev) => [set(sk, fk, latest, '05/05/2024', '08:00'), set(sk, fk, prev, '04/05/2024', '08:00')];

export const GRID = {
  'mixed section, out of range, no ref, jump': {
    sections: [
      { key: 'BH', expanded: true, fields: ['Hb', 'Leu', 'Hto'] },
    ],
    index: {
      'BH|Hb': { latest: 9, isAbnormal: true, ref: [12, 16], setsDesc: sets('BH', 'Hb', 9, 14) },
      'BH|Leu': { latest: 11.2, isAbnormal: false, ref: null, setsDesc: sets('BH', 'Leu', 11.2, 11.2) },
      'BH|Hto': { latest: 41, isAbnormal: false, ref: [36, 48], setsDesc: sets('BH', 'Hto', 41, 40.9) },
    },
  },
  'collapsed section, pH low, row without index entry': {
    sections: [{ key: 'GASES', expanded: false, fields: ['pH', 'pCO2'] }],
    index: {
      'GASES|pH': { latest: 7.3, isAbnormal: true, ref: [7.35, 7.45], setsDesc: sets('GASES', 'pH', 7.3, 7.4) },
    },
  },
  'two sections, single analyte, escaped unknown field': {
    sections: [
      { key: 'BH', expanded: true, fields: ['Hb'] },
      { key: 'QS', expanded: true, fields: ['Glu', '<x>&"y"'] },
    ],
    index: {
      'BH|Hb': { latest: 13, isAbnormal: false, ref: [12, 16], setsDesc: sets('BH', 'Hb', 13, 12) },
      'QS|Glu': { latest: 180, isAbnormal: true, ref: [70, 110], setsDesc: sets('QS', 'Glu', 180, 90) },
      'QS|<x>&"y"': { latest: null, isAbnormal: false, ref: [1, 2], setsDesc: [] },
    },
  },
};

export const SUMMARY = {
  'oor and previous day': { history: [{ fecha: '05/05/2024', hora: '08:00' }, { fecha: '04/05/2024', hora: '08:00' }], oor: 3, total: 12 },
  'no oor': { history: [{ fecha: '15/11/2023', hora: '10:30' }, { fecha: '14/11/2023', hora: '10:30' }], oor: 0, total: 5 },
  'unparseable dates': { history: [{ fecha: 'zzz', hora: '' }, { fecha: '', hora: '' }], oor: 1, total: 2 },
};

export const TOOLBAR = {
  'all, nothing hidden': { hidden: 0, total: 12, oor: 3, gaso: false, on: false },
  'only abnormal, hidden and gasometry': { hidden: 4, total: 12, oor: 3, gaso: true, on: true },
  'zero counts': { hidden: 0, total: 0, oor: 0, gaso: false, on: false },
};

export const HIDDEN = {
  'two known analytes': ['BH|Hb', 'GASES|pH'],
  'unknown field, escaped': ['QS|<x>&"y"', 'BH|Leu'],
  'none': [],
};

export const EMPTY = {
  'abnormal only': { kind: 'abnormal' },
  'all hidden': { kind: 'hidden' },
  'no data': { kind: 'nodata' },
};

export const LEGEND = {
  'two days, manage tags': {
    labels: ['01/05', '02/05 08:00', '03/05'],
    markers: [
      [0, 'transfusion', [{ id: 'e1', text: 'Transfusión 2 UCE', kind: 'transfusion' }]],
      [2, 'otro', [{ id: 'e<2>', text: 'Nota "x" & y', kind: 'otro' }, { id: 'e3', text: 'Biopsia', kind: 'biopsia' }]],
    ],
  },
  'no markers': { labels: ['01/05'], markers: [] },
};

export const PICKER = {
  'no extras': { extras: [], groups: [{ sectionKey: 'BH', label: 'Biometría hemática', specs: [{ sectionKey: 'BH', fieldKey: 'Hb', cardTitle: 'Hb' }] }] },
  'two extras, escaped': {
    extras: [
      { sectionKey: 'BH', fieldKey: 'Hb', cardTitle: 'Hb' },
      { sectionKey: 'QS', fieldKey: '<x>&"y"' },
    ],
    groups: [
      { sectionKey: 'QS', label: 'Química <sanguínea>', specs: [{ sectionKey: 'QS', fieldKey: 'Glu', cardTitle: 'Glucosa' }, { sectionKey: 'QS', fieldKey: '<x>&"y"' }] },
    ],
  },
  'empty groups': { extras: [], groups: [] },
};
