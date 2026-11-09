import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MECHANISM_SOURCE, mechanismHintFor } from './cultivo-mechanism.mjs';

const row = (med, interp) => ({ med, mic: '', interp });
const hint = (org, rows) => mechanismHintFor(org, rows);

test('fuente: EUCAST detección de mecanismos v2.0 julio 2017', () => {
  assert.match(MECHANISM_SOURCE, /EUCAST.*v2\.0.*2017/);
});

test('grupo 1 con ceftriaxona R y cefoxitina S: cribado BLEE, sin AmpC', () => {
  const h = hint('Escherichia coli', [row('CEFTRIAXONA', 'R'), row('CEFOXITINA', 'S'), row('MEROPENEM', 'S')]);
  assert.equal(h.id, 'esbl-cribado');
  assert.deepEqual(h.evidencia.map((e) => [e.row.med, e.k]), [['CEFTRIAXONA', 'r'], ['CEFOXITINA', 's']]);
  assert.equal(h.fuente, MECHANISM_SOURCE);
});

test('cribado positivo con I y con cada indicador por separado', () => {
  assert.equal(hint('Klebsiella pneumoniae', [row('Ceftazidima', 'I')]).id, 'esbl-cribado');
  assert.equal(hint('Proteus mirabilis', [row('Cefotaxima', 'R')]).id, 'esbl-cribado');
  assert.equal(hint('Salmonella enterica', [row('Cefpodoxima', 'R')]).id, 'esbl-cribado');
});

test('cefpodoxima I no activa el cribado (EUCAST: solo R)', () => {
  assert.equal(hint('Escherichia coli', [row('Cefpodoxima', 'I')]), null);
});

test('grupo 1 con cefoxitina R: AmpC puede esconder la BLEE', () => {
  const h = hint('E. coli', [row('Ceftazidima', 'R'), row('Cefoxitina', 'R')]);
  assert.equal(h.id, 'esbl-ampc');
  assert.match(h.texto, /cefepima/i);
  assert.match(h.texto, /cloxacilina/i);
});

test('grupo 2 (AmpC propia): cribado distinto, confirmar con cefepima', () => {
  for (const o of ['Enterobacter cloacae complex', 'Citrobacter freundii', 'Serratia marcescens', 'Klebsiella aerogenes']) {
    const h = hint(o, [row('Ceftriaxona', 'R')]);
    assert.equal(h.id, 'esbl-cribado-g2', o);
    assert.match(h.texto, /cefepima/i);
  }
});

test('sin pista: todo S, sin antibiograma, otra especie o BLEE ya informada', () => {
  assert.equal(hint('Escherichia coli', [row('CEFTRIAXONA', 'S'), row('CEFOXITINA', 'R')]), null);
  assert.equal(hint('Escherichia coli', []), null);
  assert.equal(hint('Escherichia coli', null), null);
  assert.equal(hint('Pseudomonas aeruginosa', [row('CEFTAZIDIMA', 'R')]), null);
  assert.equal(hint('Enterococcus faecalis', [row('CEFTRIAXONA', 'R')]), null);
  assert.equal(hint('Escherichia coli BLEE', [row('CEFTRIAXONA', 'R')]), null);
  assert.equal(hint('ESCHERICHIA COLI · ESBL', [row('CEFTRIAXONA', 'R')]), null);
});

test('evidencia lista solo los indicadores R/I y la cefoxitina', () => {
  const h = hint('Escherichia coli', [row('Cefotaxima', 'R'), row('Ceftazidima', 'S'), row('Cefepima', 'R'), row('Cefoxitina', 'S')]);
  assert.deepEqual(h.evidencia.map((e) => e.row.med), ['Cefotaxima', 'Cefoxitina']);
});
