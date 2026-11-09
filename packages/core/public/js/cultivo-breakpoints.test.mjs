import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMic, categoriaMic, interpretMic, flagInterpMismatch } from './cultivo-breakpoints.mjs';

const cat = (o, med, mic, opts) => (interpretMic(o, med, mic, opts) || {}).cat || null;

test('parseMic: operadores y formatos', () => {
  assert.deepEqual(parseMic('<=2'), { op: '<=', v: 2 });
  assert.deepEqual(parseMic('≥8'), { op: '>=', v: 8 });
  assert.deepEqual(parseMic('>16'), { op: '>', v: 16 });
  assert.deepEqual(parseMic('0,25'), { op: '=', v: 0.25 });
  assert.deepEqual(parseMic('4/76'), { op: '=', v: 4 });
  assert.equal(parseMic('Detectado'), null);
  assert.equal(parseMic(''), null);
});

test('categoriaMic: S / I / R y casos sin saber', () => {
  const f = { s: 1, r: 4, mid: 'I' };
  assert.equal(categoriaMic('<=0.5', f), 's');
  assert.equal(categoriaMic('1', f), 's');
  assert.equal(categoriaMic('2', f), 'i');
  assert.equal(categoriaMic('4', f), 'r');
  assert.equal(categoriaMic('>2', f), null); // >2 puede ser I o R
  assert.equal(categoriaMic('>4', f), 'r');
  assert.equal(categoriaMic('<=2', f), null); // ≤2 puede ser S o I
  assert.equal(categoriaMic('2', { s: 2, r: 8, mid: 'SDD' }), 's');
  assert.equal(categoriaMic('4', { s: 2, r: 8, mid: 'SDD' }), 'sdd');
  assert.equal(categoriaMic('2', { s: 1, r: null }), 'ns');
});

test('Enterobacterales: valores CLSI M100-Ed36', () => {
  assert.equal(cat('Escherichia coli', 'CEFTRIAXONA', '<=0.25'), 's');
  assert.equal(cat('Escherichia coli', 'CEFTRIAXONA', '2'), 'i');
  assert.equal(cat('Klebsiella pneumoniae', 'CEFTRIAXONA', '>=64'), 'r');
  assert.equal(cat('E. coli', 'CIPROFLOXACINA', '0.5'), 'i');
  assert.equal(cat('E. coli', 'MEROPENEM', '<=0.25'), 's');
  assert.equal(cat('E. coli', 'PIPERACILINA/TAZOBACTAM', '16'), 'sdd');
  assert.equal(cat('E. coli', 'AMPICILINA', '>=32'), 'r');
  assert.equal(cat('E. coli', 'AMPICILINA/SULBACTAM', '>=32'), 'r');
});

test('cefazolina: sistémica vs orina; nitrofurantoína solo orina', () => {
  assert.equal(cat('E. coli', 'CEFAZOLINA', '8'), 'r');
  assert.equal(cat('E. coli', 'CEFAZOLINA', '8', { orina: true }), 's');
  assert.equal(cat('E. coli', 'NITROFURANTOINA', '16'), null);
  assert.equal(cat('E. coli', 'NITROFURANTOINA', '16', { orina: true }), 's');
});

test('colistina: sin S en CLSI → I, y S reportada no se marca', () => {
  assert.equal(cat('Klebsiella pneumoniae', 'COLISTINA', '<=1'), 'i');
  assert.deepEqual(flagInterpMismatch('Klebsiella pneumoniae', [{ med: 'COLISTINA', mic: '<=1', interp: 'S' }]), []);
  assert.equal(flagInterpMismatch('Klebsiella pneumoniae', [{ med: 'COLISTINA', mic: '4', interp: 'S' }]).length, 1);
});

test('S. aureus, S. lugdunensis y SCN: oxacilina y vancomicina', () => {
  assert.equal(cat('Staphylococcus aureus', 'OXACILINA', '2'), 's');
  assert.equal(cat('Staphylococcus aureus', 'OXACILINA', '4'), 'r');
  assert.equal(cat('Staphylococcus lugdunensis', 'OXACILINA', '2'), 's');
  assert.equal(cat('Staphylococcus epidermidis', 'OXACILINA', '1'), 'r');
  assert.equal(cat('Staphylococcus aureus', 'VANCOMICINA', '2'), 's');
  assert.equal(cat('Staphylococcus aureus', 'VANCOMICINA', '4'), 'i');
  assert.equal(cat('Staphylococcus lugdunensis', 'VANCOMICINA', '4'), 's');
});

test('no interpreta con duda: organismo/antibiótico sin tabla, CMI sin número, varias filas', () => {
  assert.equal(cat('Candida albicans', 'FLUCONAZOL', '2'), null);
  assert.equal(cat('E. coli', 'ALGO RARO', '2'), null);
  assert.equal(cat('E. coli', 'CEFTRIAXONA', 'POS'), null);
  assert.equal(cat('Streptococcus pneumoniae', 'PENICILINA', '0.06'), null); // meningitis vs no meningitis
});

test('Pseudomonas, Acinetobacter, Enterococcus faecium (daptomicina)', () => {
  assert.equal(cat('Pseudomonas aeruginosa', 'CEFTAZIDIMA', '8'), 's');
  assert.equal(cat('Pseudomonas aeruginosa', 'CEFTAZIDIMA', '16'), 'i');
  assert.equal(cat('Acinetobacter baumannii', 'MEROPENEM', '>=16'), 'r');
  assert.equal(cat('Enterococcus faecium', 'DAPTOMICINA', '4'), 'sdd');
  assert.equal(cat('Enterococcus faecalis', 'DAPTOMICINA', '2'), 's');
});

test('flagInterpMismatch: reporte contra la CMI', () => {
  const rows = [
    { med: 'CEFTRIAXONA', mic: '>=64', interp: 'S' },
    { med: 'MEROPENEM', mic: '<=0.25', interp: 'S' },
    { med: 'CIPROFLOXACINA', mic: '0.5', interp: 'R' },
    { med: 'GENTAMICINA', mic: '', interp: 'R' },
  ];
  const f = flagInterpMismatch('Escherichia coli', rows);
  assert.deepEqual(f.map((x) => [x.abbr, x.esperada, x.reportada]), [['CFTX', 'R', 'S'], ['CIPRO', 'I', 'R']]);
  assert.deepEqual(flagInterpMismatch('E. coli', null), []);
});
