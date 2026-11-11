/** Synthetic inputs for the Tendencias group-table view test (the expected HTML lives in the .old.json). */
// Column keys and day keys depend on the local zone; pin it so the .old.json stays valid anywhere.
process.env.TZ = 'America/Mexico_City';

import { dayKeyFromLabSet } from './tendencias-event-context.mjs';
import { seriesColorKey } from '../tend-prefs.mjs';

const esc = (s) =>
  String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const REFS = { 'BH|Hb': [12, 16], 'BH|Leu': [4, 11], 'BH|Plq': [150, 400], 'QS|Na': [135, 145], 'LCR|Prot': [15, 45] };
const UNITS = { 'BH|Hb': 'g/dL', 'BH|Leu': 'x10³/µL', 'BH|Plq': '', 'QS|Na': 'mEq/L', 'LCR|Prot': '%' };

export const deps = {
  esc,
  tendRefFromLabSet: (set, sk, fk) => set.refs?.[sk + '|' + fk] || null,
  tendRefForSeries: (_hist, sk, fk) => REFS[sk + '|' + fk] || null,
  tendUnitForSeries: (sk, fk) => UNITS[sk + '|' + fk] || '',
  getSectionLabel: (sk) => ({ BH: 'Biometría <hemática>', QS: 'Química sanguínea' })[sk] || null,
};

const sets = (n) =>
  Array.from({ length: n }, (_, i) => ({ fecha: String(i + 1).padStart(2, '0') + '/05/2026', hora: i % 2 ? '14:30' : '06:00', resLabs: [] }));
const spec = (sectionKey, fieldKey, cardTitle) => ({ sectionKey, fieldKey, cardTitle });
const row = (sectionKey, fieldKey, label, values, extra) => ({ sectionKey, fieldKey, label, unit: UNITS[sectionKey + '|' + fieldKey], values, ...extra });
const specMap = (specs) => Object.fromEntries(specs.map((s) => [seriesColorKey(s.sectionKey, s.fieldKey), s]));
const bucketMap = (columns, byIndex) => {
  const m = new Map();
  for (const [i, entries] of Object.entries(byIndex)) m.set(dayKeyFromLabSet(columns[i]), { kind: 'otro', entries });
  return m;
};

const hbSpecs = [spec('BH', 'Hb', 'Hemoglobina'), spec('BH', 'Leu', 'Leucocitos'), spec('BH', 'Plq', 'Plaquetas')];
const baseState = (over) => ({ historyDesc: [], sectionKey: 'BH', dynamicMode: false, patientId: 'p1', tableMenuOpen: false, ...over });
const hidden0 = { rows: [], cols: [] };

function scenario(name, o) {
  const columns = o.columns;
  const specs = o.specs;
  const raw = { columns, rows: o.rows };
  return [
    name,
    {
      raw,
      hidden: o.hidden || hidden0,
      byDay: !!o.byDay,
      state: baseState({ sectionKey: o.sectionKey || 'BH', dynamicMode: !!o.dynamicMode, ...(o.state || {}) }),
      markersByDay: o.markers ? bucketMap(columns, o.markers) : null,
      specs,
      specsByRowKey: o.specsByRowKey || specMap(specs),
      menuOpen: !!o.menuOpen,
    },
  ];
}

const c3 = sets(3);
const c4 = sets(4);
const refSetsRows = c3.map((s, i) => ({ ...s, refs: i === 2 ? { 'BH|Hb': [13, 17] } : {} }));

export const SCENARIOS = Object.fromEntries([
  scenario('single section, out of range, last column tagged', {
    columns: c3,
    specs: hbSpecs,
    rows: [row('BH', 'Hb', 'Hb', [10.2, 11, 17.5]), row('BH', 'Leu', 'Leu', [12, 8, 3.1]), row('BH', 'Plq', 'Plq', [200, null, 210])],
    markers: { 1: [{ id: 'e1', text: 'Transfusión 2 PG', kind: 'transfusion' }], 2: [{ id: 'e2', text: 'Cirugía <menor> "A"', kind: 'otro' }] },
  }),
  scenario('hidden columns and rows', {
    columns: c4,
    specs: hbSpecs,
    rows: [row('BH', 'Hb', 'Hb', [10, 11, 12, 13]), row('BH', 'Leu', 'Leu', [5, 6, 7, 8]), row('BH', 'Plq', 'Plq', [100, 200, 300, 450])],
    hidden: { rows: ['BH|Leu'], cols: ['f:x|h:y'] },
  }),
  scenario('last column hidden, more than 3 events', {
    columns: c3,
    specs: hbSpecs,
    rows: [row('BH', 'Hb', 'Hb', [10, 11, 12]), row('BH', 'Leu', 'Leu', [5, 6, 7])],
    hidden: { rows: [], cols: [`t:${new Date(2026, 4, 3, 6, 0).getTime()}`] },
    markers: {
      0: [1, 2, 3, 4, 5].map((n) => ({ id: 'm' + n, text: 'Evento ' + n, kind: 'otro' })),
    },
  }),
  scenario('two sections with section rows and ref sets', {
    columns: refSetsRows,
    specs: [spec('BH', 'Hb', 'Hemoglobina'), spec('QS', 'Na', 'Sodio')],
    rows: [
      row('BH', 'Hb', 'Hb', [11.5, 12.5, 16.5], { refSets: refSetsRows }),
      row('QS', 'Na', 'Na', [133, 140, 150]),
    ],
  }),
  scenario('label from row when spec is missing, with unit', {
    columns: c3,
    specs: [],
    specsByRowKey: {},
    rows: [row('QS', 'Na', 'Sodio <sérico>', [136, 137, 138]), row('LCR', 'Prot', 'Proteínas %', [20, 50, 30])],
    dynamicMode: true,
  }),
  scenario('empty table, dynamic mode', { columns: [], specs: [], rows: [], dynamicMode: true }),
  scenario('empty table, grouped by day', { columns: [], specs: [], rows: [], byDay: true }),
  scenario('LCR interpretation row', {
    columns: c3.map((s, i) => (i === 1 ? { ...s, resLabs: ['INTERPRETACIÓN CITOQUÍMICO:\tLíquido <claro> & normal'] } : s)),
    specs: [spec('LCR', 'Prot', 'Proteínas')],
    rows: [row('LCR', 'Prot', 'Prot', [20, 50, 30])],
    sectionKey: 'LCR',
    hidden: { rows: [], cols: [`t:${new Date(2026, 4, 3, 6, 0).getTime()}`] },
  }),
  scenario('hidden bar open, 9 hidden (filter box)', {
    columns: c3,
    specs: hbSpecs,
    rows: [row('BH', 'Hb', 'Hb', [10, 11, 12])],
    hidden: {
      cols: [`t:${new Date(2026, 4, 1, 6, 0).getTime()}`, `t:${new Date(2026, 3, 20).getTime()}`, 'f:Anterior|h:'],
      rows: ['BH|Hb', 'BH|Leu', 'BH|Plq', 'BH|Zzz', 'QS|Na', 'LCR|Prot'],
    },
    menuOpen: true,
  }),
  scenario('hidden bar closed, 1 hidden', { columns: c3, specs: hbSpecs, rows: [row('BH', 'Hb', 'Hb', [10, 11, 12])], hidden: { rows: ['BH|Hb'], cols: [] } }),
  scenario('hidden bar open, 2 hidden', {
    columns: c3,
    specs: hbSpecs,
    rows: [row('BH', 'Hb', 'Hb', [10, 11, 12])],
    hidden: { rows: ['BH|Hb', 'QS|Zz<'], cols: [] },
    menuOpen: true,
  }),
]);
