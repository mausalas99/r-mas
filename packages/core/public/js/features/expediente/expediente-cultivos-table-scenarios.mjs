/** Synthetic cultivos for the Cultivos table view test (inputs only; the expected HTML lives in the .old.json). */
import { PITCH_CULTIVO_URO_SOME } from '../../tour-pitch-cultivos-some.mjs';
import { setLabHistory } from '../../app-state.mjs';
import { rt } from './expediente-runtime.mjs';

export const PID = 'p-cult';
const p2 = (n) => String(n).padStart(2, '0');
const D = (dd, mm, yyyy) => ({ fechaMuestra: `${p2(dd)}/${p2(mm)}/${yyyy}`, sortMs: Date.UTC(yyyy, mm - 1, dd) });
let seq = 0;
const row = (o) => ({ _seq: seq++, tipoKey: 'otro', tipoLabel: 'Otros cultivos', cuenta: '', negativo: false, ...o });

/** Uro with an antibiogram (sourceText carries it), twice the same germ → one block "2 muestras". */
const uro = (dd, mm, extra) =>
  row({ tipoKey: 'uro', tipoLabel: 'Urocultivo', sitio: 'UROCULTIVO POR SONDA', organismo: 'Pseudomonas aeruginosa',
    cuenta: '50,000 UFC/mL', ...D(dd, mm, 2026), ...extra });
const neg = (dd, mm, extra) =>
  row({ tipoKey: 'uro', tipoLabel: 'Urocultivo', sitio: 'UROCULTIVO POR SONDA', organismo: 'SIN DESARROLLO', negativo: true,
    ...D(dd, mm, 2026), ...extra });

const mixed = () => [
  uro(5, 5, { labSetId: 'set-uro' }),
  uro(2, 5, { labSetId: 'set-uro' }),
  row({ tipoKey: 'hemo', tipoLabel: 'Hemocultivo', sitio: 'HEMOCULTIVO (PERIFERICO DERECHO)',
    organismo: 'STAPHYLOCOCCUS AUREUS · MRSA · Preliminar', labSetId: 'h1', ...D(20, 4, 2026) }),
  row({ tipoKey: 'hemo', tipoLabel: 'Hemocultivo', sitio: 'HEMOCULTIVO (CATETER CENTRAL)',
    organismo: 'SIN DESARROLLO', negativo: true, labSetId: 'h2', ...D(21, 4, 2026) }),
  row({ tipoKey: 'asp', tipoLabel: 'Aspirado traqueal', sitio: 'ASPIRADO TRAQUEAL', organismo: 'ENTEROBACTER CLOACAE',
    cuenta: '>100,000 UFC/mL', resistencias: 'R: AMPICILINA', labSetId: 'a1', ...D(18, 5, 2026) }),
  row({ tipoKey: 'asp', tipoLabel: 'Aspirado traqueal', sitio: 'ASPIRADO TRAQUEAL', organismo: 'ENTEROBACTER CLOACAE',
    cuenta: '>100,000 UFC/mL', labSetId: 'a2', ...D(18, 5, 2026) }),
  neg(10, 4, { labSetId: 'n1' }),
  // Last result negative with an older isolate → the older isolate folds behind its date.
  row({ tipoKey: 'tej', tipoLabel: 'Tejido', sitio: 'TEJIDO CUTANEO (TEJIDO DE HERIDA TOBILLO IZQUIERDO)',
    organismo: 'ESCHERICHIA COLI · BLEE', cuenta: '10,000 UFC/mL', labSetId: 't1', ...D(1, 3, 2026) }),
  row({ tipoKey: 'tej', tipoLabel: 'Tejido', sitio: 'TEJIDO CUTANEO (TEJIDO DE HERIDA TOBILLO IZQUIERDO)',
    organismo: 'SIN DESARROLLO', negativo: true, labSetId: 't2', ...D(9, 3, 2026) }),
  row({ tipoKey: 'gram', tipoLabel: 'Tinción de Gram', sitio: 'LIQUIDO PLEURAL', organismo: 'CONTAMINADO', labSetId: 'g1', ...D(2, 2, 2026) }),
  row({ tipoKey: 'otro', tipoLabel: 'Otros cultivos', sitio: 'ESPUTO <1> & "2"', organismo: 'KLEBSIELLA "X" <b>',
    labSetId: '', ...D(3, 2, 2026) }),
];

const long = () => {
  const rows = [];
  for (let i = 0; i < 15; i++) {
    const dd = 1 + i;
    rows.push(i % 3 === 0 ? neg(dd, 6, { labSetId: 'l' + i }) : uro(dd, 6, { labSetId: 'l' + i, organismo: i % 2 ? 'Escherichia coli' : 'Klebsiella pneumoniae' }));
  }
  return rows;
};

export const SCENARIOS = {
  noPatient: { pid: null, rows: [] },
  empty: { pid: PID, rows: [] },
  mixed: { pid: PID, rows: mixed(), collapsed: ['urocultivo por sonda|pseudomonas aeruginosa|05/05/2026|02/05/2026'] },
  mixedPendingBusy: {
    pid: PID,
    rows: mixed(),
    refreshBusy: true,
    pending: [
      { key: 'k1', organismo: 'Pseudomonas aeruginosa', labSetId: 'set-uro', sitio: 'UROCULTIVO POR SONDA', fecha: '05/05/2026', atbOnly: true },
      { key: 'k2', organismo: 'STAPHYLOCOCCUS AUREUS · MRSA · Preliminar', labSetId: 'h1', sitio: 'HEMOCULTIVO (PERIFERICO DERECHO)', fecha: '20/04/2026' },
    ],
  },
  longList: { pid: PID, rows: long() },
  onlyNegatives: { pid: PID, rows: [neg(4, 5, { labSetId: 'n1' }), neg(1, 5, { labSetId: 'n2' }),
    row({ tipoKey: 'hemo', tipoLabel: 'Hemocultivo', sitio: 'HEMOCULTIVO (PERIFERICO IZQUIERDO)', organismo: 'SIN DESARROLLO', negativo: true, ...D(3, 5, 2026) })] },
  singleNegative: { pid: PID, rows: [neg(4, 5, { labSetId: 'n1' })] },
};

/** Set the globals the builders read (active patient, collapsed list, lab history) for scenario `name`. */
export function prepare(name) {
  const s = SCENARIOS[name];
  rt.getActiveId = () => s.pid;
  const store = s.collapsed ? { [PID]: s.collapsed } : {};
  globalThis.localStorage = { getItem: () => JSON.stringify(store), setItem() {} };
  setLabHistory({ [PID]: [{ id: 'set-uro', fecha: '05/05/2026', hora: '18:16', resLabs: [], sourceText: PITCH_CULTIVO_URO_SOME }] });
  return s;
}
