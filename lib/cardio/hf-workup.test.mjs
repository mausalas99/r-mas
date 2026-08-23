import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyWorkup, normalizeWorkup } from './hf-workup.mjs';

test('emptyWorkup has all nine subsystem sections', () => {
  const w = emptyWorkup();
  assert.deepEqual(Object.keys(w).sort(), [
    'amiloidosis',
    'coronaria',
    'fa',
    'hierro',
    'infiltracion',
    'proteinuria',
    'sueno',
    'tiroideo',
    'valvular',
  ]);
  assert.equal(w.hierro.estadoEstudio, '');
  assert.equal(w.hierro.ferritina, null);
  assert.equal(w.fa.presente, null);
  assert.equal(w.valvular.severidad, '');
});

test('normalizeWorkup returns defaults when given nothing', () => {
  assert.deepEqual(normalizeWorkup(undefined), emptyWorkup());
  assert.deepEqual(normalizeWorkup(null), emptyWorkup());
});

test('normalizeWorkup merges partial sub-objects onto defaults', () => {
  const out = normalizeWorkup({
    hierro: { ferritina: 45 },
    fa: { presente: true, estrategia: 'Control de frecuencia' },
  });
  assert.equal(out.hierro.ferritina, 45);
  assert.equal(out.hierro.estadoEstudio, '');
  assert.equal(out.fa.presente, true);
  assert.equal(out.fa.estrategia, 'Control de frecuencia');
  assert.equal(out.fa.cha2ds2vasc, '');
  assert.equal(out.tiroideo.tsh, null);
});

test('normalizeWorkup keeps unknown future keys on a sub-object', () => {
  const out = normalizeWorkup({ hierro: { futuraLlave: 'x' } });
  assert.equal(out.hierro.futuraLlave, 'x');
  assert.equal(out.hierro.estadoEstudio, '');
});
