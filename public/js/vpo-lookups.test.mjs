import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getProcedureById, searchProcedures, getAsaByKey } from './vpo-lookups.mjs';

test('getProcedureById gallbladder tiene guptaCoef y ahaQuirurgico', () => {
  var p = getProcedureById('gupta-gallbladder-appendix');
  assert.ok(p);
  assert.equal(typeof p.guptaCoef, 'number');
  assert.ok(['Bajo', 'Intermedio', 'Alto'].includes(p.ahaQuirurgico));
});

test('searchProcedures filtra por texto', () => {
  var hits = searchProcedures('thor');
  assert.ok(hits.some((h) => /thoracic/i.test(h.labelEn)));
});

test('getAsaByKey resuelve clase IV', () => {
  var a = getAsaByKey('asa-iv');
  assert.ok(a);
  assert.equal(a.asaClass, 'IV');
  assert.equal(a.guptaCoef, -0.95);
});
