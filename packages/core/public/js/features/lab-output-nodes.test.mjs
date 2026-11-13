import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { PITCH_CULTIVO_URO_SOME, PITCH_CULTIVO_ASPIRADO_1805_SOME } from '../tour-pitch-cultivos-some.mjs';

const ENTRY_CASES = {
  bhStructured: 'BH\tHb 12.1* Hto 36 Leu 11.2* Plt 250 Lin -',
  qsTrend: 'QS\tGlu 250* Cr 1.2 BUN - Na 140 K 5.8*',
  coag: 'Coag.\tTP 14* INR 1.2',
  prose: 'Frotis\tEritrocitos normocíticos con *alerta* y - guion',
  egoMultiLine: 'EGO\tpH 6 Dens 1.020\nLeucocitos 5-10 por campo *\nBacterias - escasas',
  gasoInterp: 'Interpretación gasometría:\tAcidosis metabólica con compensación respiratoria',
  citoquimico: 'Liq:\tTipo LCR Glu 40* Prot 80*',
  escapes: 'QS\tA<1* B>2 C&D "x" E',
  noTab: 'UROCULTIVO POR SONDA 05/05: PSEUDOMONAS AERUGINOSA - 50,000 UFC/mL *',
  bhExtended: 'BH\tHb 9.8* Hto 29* VCM 80 Neu 70 Lin 20 Eos 1 Bas 0',
};

/** Same shape as the trend lookup the lab panel builds: (section, field) → {trend, delta} | null. */
const TREND = (section, field) =>
  field === 'Hb' || field === 'hb' || field === 'K' ? { trend: 'up', delta: 1 } : field === 'Glu' ? { trend: 'down', delta: -1 } : null;

const S = (med, mic, interp) => ({ med, mic, interp });

/** Antibiogram rows + the optional "ext" (Cultivos cards): built fresh each call (ext holds row identities). */
const SENS_CASES = {
  empty: () => ({ sens: [] }),
  plain: () => ({
    sens: [S('AMPICILINA', '>16', 'R'), S('CEFTRIAXONA', '<=1', 'S'), S('CIPROFLOXACINA', '4', 'R'), S('GENTAMICINA', '8', 'I'), S('CEFOXITINA', '', 'POS')],
  }),
  sOrder: () => ({
    sens: [S('AAA', '16', 'S'), S('BBB', '4', 'S'), S('CCC', '≥64', 'R'), S('DDD', '8', 'I'), S('EEE', '', 'S')],
  }),
  ext: () => {
    const amp = S('AMPICILINA', '>16', 'R');
    const cro = S('CEFTRIAXONA', '<=1', 'S');
    const cip = S('CIPROFLOXACINA', '4', 'R');
    const van = S('VANCOMICINA <b>', '>=2', 'S');
    return {
      sens: [amp, cro, cip, van],
      ext: { intr: new Set([amp]), marks: new Map([[cro, 'AmpC'], [van, 'inesperada']]) },
    };
  },
};

/** resLab cultivo chunks as the lab output draws them: [text, sourceText]. */
const CULTIVO_CHUNKS = {
  withAtb: [
    'UROCULTIVO POR SONDA 05/05: PSEUDOMONAS AERUGINOSA\nCuenta: 50,000 UFC/mL\nATB\tAMIKACINA >32 R\nUSER SIMULADO\nLabo-12 Campo 1 AB 5',
    PITCH_CULTIVO_URO_SOME,
  ],
  noSource: ['UROCULTIVO POR SONDA 05/05: PSEUDOMONAS AERUGINOSA\nCuenta: 50,000 UFC/mL\nATB\tAMIKACINA >32 R', ''],
  twoChunks: [
    'ASPIRADO TRAQUEAL 18/05: ESCHERICHIA COLI · BLEE\nCuenta: 50,000 UFC/mL\nATB\n\nUROCULTIVO POR SONDA 05/05: PSEUDOMONAS AERUGINOSA\nATB',
    PITCH_CULTIVO_ASPIRADO_1805_SOME + '\n' + PITCH_CULTIVO_URO_SOME,
  ],
  escapes: ['CULTIVO 01/01: GERMEN <i> & "x"\nCuenta: <1', ''],
};

/** Text the "copy" buttons put on the clipboard (functions untouched by the port; pinned all the same). */
const COPY_CHUNKS = [
  'UROCULTIVO POR SONDA 05/05: PSEUDOMONAS AERUGINOSA · Preliminar\nCuenta: 50,000 UFC/mL\nATB\nAMIKACINA\n>32\tR\nUSER SIMULADO',
  'CULTIVO 01/01: X\nOtra línea sin ATB',
];
const COPY_SENS = [S('AMIKACINA', '>32', 'R'), S('PIP/TAZO', '<=16', 's'), S('GENTAMICINA', '', 'I')];

const CELL_PID = 'p-cell';
const CELL_SETS = [
  { id: 'set-uro', fecha: '05/05/2026', hora: '18:16', resLabs: [], sourceText: PITCH_CULTIVO_URO_SOME },
  { id: 'set-asp', fecha: '18/05/2026', hora: '16:58', resLabs: [], sourceText: PITCH_CULTIVO_ASPIRADO_1805_SOME },
  { id: 'set-bare', fecha: '01/05/2026', hora: '08:00', resLabs: [], sourceText: '' },
];
const CELL_ROWS = {
  noPatient: { pid: null, r: { organismo: 'X' } },
  withAtb: { pid: CELL_PID, r: { organismo: 'Pseudomonas aeruginosa', labSetId: 'set-uro', tipoKey: 'uro' } },
  bleeEcoli: { pid: CELL_PID, r: { organismo: 'Escherichia coli', labSetId: 'set-asp', tipoKey: 'asp' } },
  fallbackText: { pid: CELL_PID, r: { organismo: 'Klebsiella <x>', labSetId: 'set-bare', tipoKey: 'asp', resistencias: 'R: AMPICILINA & "otros"' } },
  missingAtb: { pid: CELL_PID, r: { organismo: 'Klebsiella pneumoniae', labSetId: 'set-bare', tipoKey: 'asp' } },
  negativo: { pid: CELL_PID, r: { organismo: 'SIN DESARROLLO', negativo: true, labSetId: 'set-bare', tipoKey: 'uro' } },
  gramNoSet: { pid: CELL_PID, r: { organismo: 'CONTAMINADO', labSetId: '', tipoKey: 'gram' } },
};


// One bundle, so the builders, the scenarios and the app state share the same instances.
const m = await loadJsx(import.meta.url, `
  import { renderEntry, renderEntryNodes, renderToken, isLabSectionHeaderHtml, isLabSectionHeaderNodes, nodesToHtml } from '../labs.js';
  import { buildAtbRisSummaryHtml, buildAtbRisSummaryNodes, formatCultivoCondensedForCopy, formatSensCrudasBlockForCopy } from '../labs-cultivo-atb.mjs';
  import { buildCultivoOutputNodes } from './expediente/expediente-cultivos-parse.mjs';
  import { buildCultivoAntibiogramCellNodes } from './expediente/expediente-cultivos-atb-ui.mjs';
  import { setLabHistory } from '../app-state.mjs';
  import { HNodes } from './expediente/expediente-cultivos-table-view.jsx';
  export { renderEntry, renderEntryNodes, renderToken, isLabSectionHeaderHtml, isLabSectionHeaderNodes, nodesToHtml };
  export { buildAtbRisSummaryHtml, buildAtbRisSummaryNodes, formatCultivoCondensedForCopy, formatSensCrudasBlockForCopy };
  export { buildCultivoOutputNodes };
  export const drawn = (nodes) => renderToString(<HNodes nodes={nodes} />);
  export const cellNodes = (c, pid, sets) => { setLabHistory({ [pid]: sets }); return buildCultivoAntibiogramCellNodes(c.r, c.pid); };
  export const settle = () => new Promise((r) => setTimeout(r, 100));`);
// The lazy CLSI data module loads after import; wait so the cell scenarios see it, as they did when the olds were taken.
await m.settle();

// Exact output of the string builders before they returned nodes (labs-display / labs-cultivo-atb / expediente-cultivos-*).
const { default: OLD } = await import('./lab-output-nodes.old.json', { with: { type: 'json' } });

// Preact escapes quotes in text and writes single-quoted attributes with double quotes; HTML reads both the same.
const norm = (s) =>
  s
    .replace(/data-onclick-args='([^']*)'/g, 'data-onclick-args="$1"')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')
    .replace(/ ([a-z-]+)=""/g, ' $1');

for (const [name, text] of Object.entries(ENTRY_CASES)) {
  test(`renderEntry ${name}: strings are byte-identical, with and without trend arrows`, () => {
    assert.deepEqual(m.renderEntry(text), OLD.entry[name]);
    assert.deepEqual(m.renderEntry(text, TREND), OLD.entryTrend[name]);
  });
  test(`renderEntry ${name}: drawn lines equal the old HTML`, () => {
    assert.deepEqual(m.renderEntryNodes(text).map(m.drawn).map(norm), OLD.entry[name].map(norm));
    assert.deepEqual(m.renderEntryNodes(text, TREND).map(m.drawn).map(norm), OLD.entryTrend[name].map(norm));
  });
  test(`renderEntry ${name}: section header check agrees with the string one`, () => {
    assert.deepEqual(m.renderEntryNodes(text).map(m.isLabSectionHeaderNodes), OLD.header[name]);
  });
}

for (const [tok, olds] of Object.entries(OLD.tokens)) {
  test(`renderToken ${JSON.stringify(tok)} is byte-identical`, () => {
    assert.deepEqual([m.renderToken(tok), m.renderToken(tok, { trend: 'up' }), m.renderToken(tok, { trend: 'down' })], olds);
  });
}

for (const [name, make] of Object.entries(SENS_CASES)) {
  test(`antibiogram summary ${name}: string is byte-identical, drawn HTML equals the old`, () => {
    const a = make();
    assert.equal(m.buildAtbRisSummaryHtml(a.sens), OLD.ris[name].plain);
    assert.equal(norm(m.drawn(m.buildAtbRisSummaryNodes(a.sens))), norm(OLD.ris[name].plain));
    const b = make();
    assert.equal(m.buildAtbRisSummaryHtml(b.sens, b.ext), OLD.ris[name].ext);
    const c = make();
    assert.equal(norm(m.drawn(m.buildAtbRisSummaryNodes(c.sens, c.ext))), norm(OLD.ris[name].ext));
  });
}

for (const [name, [text, source]] of Object.entries(CULTIVO_CHUNKS)) {
  test(`cultivo output chunk ${name}: drawn HTML equals the old fragments`, () => {
    assert.equal(norm(m.drawn(m.buildCultivoOutputNodes(text, source))), norm(OLD.fragments[name]));
  });
}

for (const [name, c] of Object.entries(CELL_ROWS)) {
  test(`cultivos antibiogram cell ${name}: drawn HTML equals the old cell`, () => {
    assert.equal(norm(m.drawn(m.cellNodes(c, CELL_PID, CELL_SETS))), norm(OLD.cell[name]));
  });
}

test('copied text is unchanged', () => {
  assert.deepEqual(COPY_CHUNKS.map((c) => m.formatCultivoCondensedForCopy(c, '')), OLD.copy.condensed);
  assert.equal(m.formatSensCrudasBlockForCopy(COPY_SENS), OLD.copy.sens);
});
