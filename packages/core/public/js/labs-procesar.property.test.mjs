/**
 * Property-based tests for the SOME lab parser (procesarLabs).
 *
 * Instead of hand-picked reports, fast-check builds thousands of SOME reports
 * from the real row shapes (random subset of analytes, random values, random
 * flags, random whitespace noise) and checks rules that must always hold:
 *   - every pasted value comes out under its own label, unchanged
 *   - no analyte that was not pasted is ever reported
 *   - Windows line endings / trailing spaces do not change the result
 *   - the order of the study blocks does not change the result
 *   - a mangled report (lines dropped, duplicated, cut) never crashes the parser
 *
 * A failure prints the shrunk counterexample report: paste it into the app.
 * Seeded so CI is reproducible; set FC_SEED / FC_RUNS to explore further.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { procesarLabs } from './labs.js';
import { DEMO_SOME_LAB_REPORT } from './tour-demo-some-lab.mjs';

const SEED = Number(process.env.FC_SEED || 20260927);
const RUNS = Number(process.env.FC_RUNS || 300);
const opts = (extra) => ({ seed: SEED, numRuns: RUNS, ...extra });

const HEADER =
  'Expediente:\t9000095-7\tSolicitud:\t2605110244\n' +
  'Nombre:\tDEMO PROPIEDAD\tFecha Registro:\tApr 11 2026 9:42AM\n' +
  'Sexo:\tMASCULINO\tUbicación:\tSERVICIO DEMO\n' +
  'Edad:\t67\tMedico:\tSERVICIO DEMO\n\n';
const TABLE = 'Estudio\t\tResultado\tUnidades\tValor de Referencia\n';

/**
 * Chemistry analytes, one study block each (the SOME "QUIMICA CLINICA" shape).
 * label/section = how procesarLabs prints them; [min, max, decimals] = value range.
 */
const CHEM = [
  { study: 'GLUCOSA EN SANGRE', row: 'GLUCOSA EN SANGRE', unit: 'mg/dL', ref: '60 - 100', section: 'QS', label: 'Glu', range: [40, 600, 0] },
  { study: 'NITROGENO DE LA UREA EN SANGRE', row: 'NITROGENO DE LA UREA EN SANGRE', unit: 'mg/dL', ref: '7 - 20', section: 'QS', label: 'BUN', range: [3, 150, 0] },
  { study: 'CREATININA EN SANGRE', row: 'CREATININA EN SANGRE', unit: 'mg/dL', ref: '0.6 - 1.4', section: 'QS', label: 'Cr', range: [0.3, 12, 2] },
  { study: 'ACIDO URICO EN SANGRE', row: 'ACIDO URICO EN SANGRE', unit: 'mg/dL', ref: '4.8 - 8.7', section: 'QS', label: 'AU', range: [1, 15, 1] },
  { study: 'COLESTEROL', row: 'COLESTEROL', unit: 'mg/dL', ref: '130 - 200', section: 'QS', label: 'COL', range: [80, 400, 0] },
  { study: 'TRIGLICERIDOS', row: 'TRIGLICERIDOS', unit: 'mg/dL', ref: '35 - 150', section: 'QS', label: 'TGL', range: [30, 900, 0] },
  { study: 'SODIO', row: 'SODIO', unit: 'mmol/L', ref: '135.0 - 145.0', section: 'ESC', label: 'Na', range: [110, 170, 0] },
  { study: 'CLORO', row: 'CLORO', unit: 'mmol/L', ref: '101.0 - 110.0', section: 'ESC', label: 'Cl', range: [80, 130, 0] },
  { study: 'POTASIO', row: 'POTASIO', unit: 'mmol/L', ref: '3.6 - 5.0', section: 'ESC', label: 'K', range: [2, 8, 1] },
  { study: 'FOSFORO EN SANGRE', row: 'FOSFORO', unit: 'mg/dL', ref: '2.5 - 4.6', section: 'ESC', label: 'F', range: [1, 9, 1] },
  { study: 'AST(ASPARTATO AMINOTRANSFERASA)', row: 'AST(ASPARTATO AMINOTRANSFERASA)', unit: 'UI/L', ref: '10 - 42', section: 'PFHs', label: 'AST', range: [5, 900, 0] },
  { study: 'ALT ALANIN AMINO TRANSFERASA', row: 'ALT ALANIN AMINO TRANSFERASA', unit: 'UI/L', ref: '10 - 42', section: 'PFHs', label: 'ALT', range: [5, 900, 0] },
  { study: 'ALP FOSFATASA ALCALINA', row: 'ALP FOSFATASA ALCALINA', unit: 'UI/L', ref: '38 - 126', section: 'PFHs', label: 'FA', range: [20, 900, 0] },
  { study: 'LDH DESHIDROGENASA LACTICA', row: 'LDH DESHIDROGENASA LACTICA', unit: 'UI/L', ref: '91 - 180', section: 'PFHs', label: 'LDH', range: [80, 2000, 0] },
];

/** Blood count rows (one BIOMETRIA HEMATICA table). */
const BH = [
  { row: 'HGB', unit: 'g/dL', ref: '12.20 - 18.10', label: 'Hb', range: [4, 20, 1] },
  { row: 'HCT', unit: '%', ref: '37.7 - 53.7', label: 'Hto', range: [12, 60, 1] },
  { row: 'MCV', unit: 'fL', ref: '80 - 97', label: 'VCM', range: [60, 120, 0] },
  { row: 'WBC', unit: 'K/uL', ref: '4.00 - 11.00', label: 'Leu', range: [0.5, 60, 2] },
  { row: 'PLT', unit: 'K/uL', ref: '142.00 - 424.00', label: 'Plt', range: [5, 900, 0] },
];

const FLAGS = ['*', 'A', 'B'];

function valueArb([min, max, decimals]) {
  const scale = 10 ** decimals;
  return fc.integer({ min: Math.round(min * scale), max: Math.round(max * scale) }).map((n) => (n / scale).toFixed(decimals));
}

/** A random, well-formed SOME report: a subset of chemistry studies (random order) + optional BH. */
const reportArb = fc
  .record({
    chem: fc.subarray(CHEM, { minLength: 1 }).chain((specs) =>
      fc.tuple(
        fc.shuffledSubarray(specs, { minLength: specs.length, maxLength: specs.length }),
        fc.tuple(...specs.map((s) => fc.tuple(valueArb(s.range), fc.constantFrom(...FLAGS)))),
      ).map(([order, vals]) => order.map((s) => ({ ...s, value: vals[specs.indexOf(s)][0], flag: vals[specs.indexOf(s)][1] }))),
    ),
    bh: fc.option(
      fc.tuple(...BH.map((s) => fc.tuple(valueArb(s.range), fc.constantFrom(...FLAGS)))).map((vals) =>
        BH.map((s, i) => ({ ...s, value: vals[i][0], flag: vals[i][1] })),
      ),
      { nil: null },
    ),
  })
  .map(({ chem, bh }) => {
    let text = HEADER;
    if (bh) {
      text += 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE;
      for (const r of bh) text += `${r.row}\t\t${r.flag}\t${r.value}\t${r.unit}\t${r.ref}\n`;
      text += '\n';
    }
    text += 'QUIMICA CLINICA\n';
    for (const r of chem) text += `${r.study}\n${TABLE}${r.row}\t\t${r.flag}\t${r.value}\t${r.unit}\t${r.ref}\n`;
    return { text, chem, bh };
  });

/** "QS\tGlu 94 Cr 1.35 ..." lines → { 'QS|Glu': 94, ... } (flags like "*" stripped). */
function readValues(res) {
  const out = {};
  for (const line of res.resLabs || []) {
    const [section, rest = ''] = String(line).split('\t');
    for (const m of rest.matchAll(/([A-Za-z][A-Za-z/%]*)\s+(-?\d+(?:\.\d+)?)\*?/g)) out[`${section}|${m[1]}`] = Number(m[2]);
  }
  return out;
}

const pasted = ({ chem, bh }) => [
  ...chem.map((r) => ({ key: `${r.section}|${r.label}`, value: Number(r.value), row: r.row })),
  ...(bh || []).map((r) => ({ key: `BH|${r.label}`, value: Number(r.value), row: r.row })),
];

test('every pasted value comes out under its own label, unchanged', () => {
  fc.assert(
    fc.property(reportArb, (rep) => {
      const got = readValues(procesarLabs(rep.text));
      for (const p of pasted(rep)) {
        assert.ok(p.key in got, `${p.row} (${p.key}) missing from output`);
        assert.equal(got[p.key], p.value, `${p.row}: pasted ${p.value}, got ${got[p.key]}`);
      }
    }),
    opts(),
  );
});

test('no analyte that was not pasted is ever reported (derived values aside)', () => {
  // Derived: BUN/CR needs BUN+Cr, eTFG needs Cr — only allowed when their inputs were pasted.
  const derived = { 'QS|BUN/CR': ['QS|BUN', 'QS|Cr'], 'QS|eTFG': ['QS|Cr'] };
  fc.assert(
    fc.property(reportArb, (rep) => {
      const keys = new Set(pasted(rep).map((p) => p.key));
      for (const k of Object.keys(readValues(procesarLabs(rep.text)))) {
        if (derived[k]) {
          assert.ok(derived[k].every((d) => keys.has(d)), `${k} reported without its inputs`);
          continue;
        }
        assert.ok(keys.has(k), `${k} reported but never pasted`);
      }
    }),
    opts(),
  );
});

test('Windows line endings and trailing spaces do not change the result', () => {
  fc.assert(
    fc.property(reportArb, fc.constantFrom('\r\n', '\n'), fc.constantFrom('', ' ', '  \t'), (rep, eol, trail) => {
      const noisy = rep.text.split('\n').map((l) => (l ? l + trail : l)).join(eol);
      assert.deepEqual(procesarLabs(noisy).resLabs, procesarLabs(rep.text).resLabs);
    }),
    opts(),
  );
});

test('the order of study blocks does not change the result', () => {
  fc.assert(
    fc.property(reportArb, fc.integer(), (rep, salt) => {
      const reversed = { ...rep, chem: [...rep.chem].sort((a, b) => ((a.label.length * 31 + salt) % 7) - ((b.label.length * 31 + salt) % 7)) };
      let text = HEADER;
      if (rep.bh) {
        text += 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE;
        for (const r of rep.bh) text += `${r.row}\t\t${r.flag}\t${r.value}\t${r.unit}\t${r.ref}\n`;
        text += '\n';
      }
      text += 'QUIMICA CLINICA\n';
      for (const r of reversed.chem) text += `${r.study}\n${TABLE}${r.row}\t\t${r.flag}\t${r.value}\t${r.unit}\t${r.ref}\n`;
      assert.deepEqual(readValues(procesarLabs(text)), readValues(procesarLabs(rep.text)));
    }),
    opts(),
  );
});

test('a mangled report (lines dropped, duplicated, cut, junk inserted) never crashes the parser', () => {
  const lines = DEMO_SOME_LAB_REPORT.split('\n');
  const edit = fc.oneof(
    fc.record({ kind: fc.constant('drop'), at: fc.nat() }),
    fc.record({ kind: fc.constant('dup'), at: fc.nat() }),
    fc.record({ kind: fc.constant('cut'), at: fc.nat(), len: fc.nat({ max: 40 }) }),
    fc.record({ kind: fc.constant('junk'), at: fc.nat(), text: fc.string({ maxLength: 30 }) }),
  );
  fc.assert(
    fc.property(fc.array(edit, { maxLength: 12 }), (edits) => {
      const ls = [...lines];
      for (const e of edits) {
        const i = e.at % Math.max(1, ls.length);
        if (e.kind === 'drop') ls.splice(i, 1);
        else if (e.kind === 'dup') ls.splice(i, 0, ls[i] ?? '');
        else if (e.kind === 'cut') ls[i] = String(ls[i] ?? '').slice(0, e.len);
        else ls.splice(i, 0, e.text);
      }
      const res = procesarLabs(ls.join('\n'));
      assert.ok(res && Array.isArray(res.resLabs));
    }),
    opts(),
  );
});
