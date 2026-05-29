import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDiagnosticosText,
  inferRiskFromDiagnosticos,
  formatDiagnosticosPlusLine,
} from './vpo-dx-inference.mjs';

test('parseDiagnosticosText separa por +', () => {
  var list = parseDiagnosticosText(
    'PERITONITIS ASOCIADA A DIÁLISIS + ENFERMEDAD RENAL CRÓNICA ESTADIO 5 + DIABETES MELLITUS TIPO 2'
  );
  assert.equal(list.length, 3);
  assert.match(list[0], /PERITONITIS/);
});

test('parseDiagnosticosText separa por líneas', () => {
  var list = parseDiagnosticosText('DX UNO\nDX DOS');
  assert.deepEqual(list, ['DX UNO', 'DX DOS']);
});

test('parseDiagnosticosText acepta signo más ancho', () => {
  var list = parseDiagnosticosText('DX UNO \uFF0B DX DOS');
  assert.equal(list.length, 2);
});

test('inferRiskFromDiagnosticos ejemplo clínico', () => {
  var list = parseDiagnosticosText(
    'PERITONITIS ASOCIADA A DIÁLISIS PERITONEAL + ENFERMEDAD RENAL CRÓNICA ESTADIO 5 + DIABETES MELLITUS TIPO 2 + INSUFICIENCIA CARDÍACA DE FEVI REDUCIDA + FIBRILACIÓN AURICULAR'
  );
  var inf = inferRiskFromDiagnosticos(list);
  assert.equal(inf.rcri.insuficienciaCardiaca, true);
  assert.equal(inf.asaKey, 'asa-iv');
});

test('formatDiagnosticosPlusLine', () => {
  assert.equal(formatDiagnosticosPlusLine(['A', 'B']), 'A + B');
});
