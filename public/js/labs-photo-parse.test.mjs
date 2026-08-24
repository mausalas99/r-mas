import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOcrLabText } from './labs-photo-parse.mjs';

test('parses a clean row with unit and range', () => {
  var rows = parseOcrLabText('HEMOGLOBINA   15.20   g/dL   13.70 - 17.50');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rawName, 'HEMOGLOBINA');
  assert.equal(rows[0].resultado, '15.20');
  assert.equal(rows[0].unidades, 'g/dL');
  assert.equal(rows[0].ref, '13.70 - 17.50');
  assert.equal(rows[0].abnormal, false);
  assert.deepEqual({ matchedKey: rows[0].matchedKey, matchedSectionKey: rows[0].matchedSectionKey }, { matchedKey: 'Hb', matchedSectionKey: 'BH' });
});

test('handles comma decimals from OCR', () => {
  var rows = parseOcrLabText('CREATININA SERICA 1,10 mg/dL 0,70 - 1,30');
  assert.equal(rows[0].resultado, '1.10');
  assert.equal(rows[0].matchedKey, 'Cr');
});

test('flags out-of-range numeric result as abnormal', () => {
  var rows = parseOcrLabText('BILIRRUBINA TOTAL 2.01 mg/dL 0.20 - 1.20');
  assert.equal(rows[0].abnormal, true);
});

test('flags a value against a "<X" style range', () => {
  var rows = parseOcrLabText('GAMMAGLUTAMIL TRANSPEPTIDASA 37.6 U/L <60.0');
  assert.equal(rows[0].abnormal, false);
  var rowsHigh = parseOcrLabText('GAMMAGLUTAMIL TRANSPEPTIDASA 88.0 U/L <60.0');
  assert.equal(rowsHigh[0].abnormal, true);
});

test('an explicit trailing asterisk always flags abnormal', () => {
  var rows = parseOcrLabText('INDICE DE RIESGO ATEROGENICO 4.6 * <4.5');
  assert.equal(rows[0].abnormal, true);
});

test('an explicit Alto/Bajo flag word flags abnormal even without a parseable range', () => {
  var rows = parseOcrLabText('POTASIO 6.1 mmol/L Alto');
  assert.equal(rows[0].abnormal, true);
});

test('a lone unit letter like U/L does not false-positive as an H/L flag', () => {
  var rows = parseOcrLabText('GAMMAGLUTAMIL TRANSPEPTIDASA 37.6 U/L <60.0');
  assert.equal(rows[0].abnormal, false);
});

test('skips lines with no digits (headers, letterhead)', () => {
  var rows = parseOcrLabText('LABORATORIO DE ANALISIS CLINICOS\nEXAMEN RESULTADOS UNIDADES');
  assert.equal(rows.length, 0);
});

test('unmatched names still produce a row for manual mapping', () => {
  var rows = parseOcrLabText('EXAMEN RARO NO CATALOGADO 12.0 mg/dL 1.0 - 20.0');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].matchedKey, null);
  assert.equal(rows[0].matchedSectionKey, null);
});

test('handles multiple rows in one report', () => {
  var text = [
    'LEUCOCITOS 5.64 10^3/µL 4.23 - 9.07',
    'PLAQUETAS 222 10^3/µL 163 - 337',
    'ALGO SIN DIGITOS',
  ].join('\n');
  var rows = parseOcrLabText(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].matchedKey, 'Leu');
  assert.equal(rows[1].matchedKey, 'Plt');
});
