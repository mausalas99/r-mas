import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDevice, normalizeDevice } from './hf-device.mjs';

test('emptyDevice has tri-state booleans and empty strings', () => {
  const d = emptyDevice();
  assert.equal(d.tieneIndicacion, null);
  assert.equal(d.colocado, null);
  assert.equal(d.indicacion, '');
  assert.equal(d.indicacionNota, '');
  assert.equal(d.tipo, '');
  assert.equal(d.fechaColocacion, '');
  assert.equal(d.fechaUltimaRevision, '');
  assert.equal(d.parametros, '');
});

test('normalizeDevice returns defaults for empty input', () => {
  assert.deepEqual(normalizeDevice(undefined), emptyDevice());
  assert.deepEqual(normalizeDevice(null), emptyDevice());
});

test('normalizeDevice merges partial fields onto defaults', () => {
  const out = normalizeDevice({ tieneIndicacion: true, tipo: 'DAI' });
  assert.equal(out.tieneIndicacion, true);
  assert.equal(out.tipo, 'DAI');
  assert.equal(out.colocado, null);
  assert.equal(out.fechaColocacion, '');
});
