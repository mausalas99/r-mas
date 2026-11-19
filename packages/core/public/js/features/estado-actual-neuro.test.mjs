import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neuroFocalClause, neuroOrientClause } from './estado-actual-text-build.mjs';
import { NEURO_ALERTA } from './estado-actual-panel-constants.mjs';

test('neuroFocalClause: sin datos por defecto', () => {
  assert.equal(neuroFocalClause({}), 'SIN DATOS DE FOCALIZACIÓN');
  assert.equal(neuroFocalClause({ focal: '', focalTxt: 'ignorado' }), 'SIN DATOS DE FOCALIZACIÓN');
});

test('neuroFocalClause: con datos usa el hallazgo en mayúsculas', () => {
  assert.equal(neuroFocalClause({ focal: 'con', focalTxt: ' hemiparesia derecha ' }), 'FOCALIZACIÓN: HEMIPARESIA DERECHA');
  assert.equal(neuroFocalClause({ focal: 'con', focalTxt: '' }), 'CON DATOS DE FOCALIZACIÓN');
});

test('NEURO_ALERTA empieza con ALERTA (valor por defecto)', () => {
  assert.equal(NEURO_ALERTA[0], 'ALERTA');
});

test('neuroOrientClause: sin orient usa el número viejo', () => {
  assert.equal(neuroOrientClause({ esferas: '3' }), 'ORIENTADO EN 3 ESFERAS');
  assert.equal(neuroOrientClause({}), 'ORIENTADO EN ___ ESFERAS');
});

test('neuroOrientClause: dice en cuáles esferas está desorientado', () => {
  assert.equal(neuroOrientClause({ orient: 'TLP' }), 'ORIENTADO EN 3 ESFERAS');
  assert.equal(neuroOrientClause({ orient: '-' }), 'DESORIENTADO EN 3 ESFERAS');
  assert.equal(neuroOrientClause({ orient: 'P' }), 'ORIENTADO EN PERSONA, DESORIENTADO EN TIEMPO Y LUGAR');
  assert.equal(neuroOrientClause({ orient: 'TL' }), 'ORIENTADO EN TIEMPO Y LUGAR, DESORIENTADO EN PERSONA');
});
