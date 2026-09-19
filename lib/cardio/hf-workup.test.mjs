import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyWorkup } from './hf-workup.mjs';

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
