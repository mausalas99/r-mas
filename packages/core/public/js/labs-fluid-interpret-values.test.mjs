import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFluidLeu_,
  parsePmnField_,
  isGramNegative_,
  gramIsPositive_,
} from './labs-fluid-interpret-values.mjs';

test('gramIsPositive_ — organismo real: positivo, cocos, bacilos', () => {
  assert.equal(gramIsPositive_('COCCOS GRAM POSITIVOS EN CADENAS'), true);
  assert.equal(gramIsPositive_('COCOS GRAM POSITIVOS'), true);
  assert.equal(gramIsPositive_('BACILOS GRAM NEGATIVOS'), false, 'NEGAT gana');
  assert.equal(gramIsPositive_('BACILOS GRAM VARIABLES'), true);
});

test('gramIsPositive_ — un recuento celular ya no dispara la alerta de infección', () => {
  // Antes: POLIMORFONUCLE y ABUNDANT describían células, no bacterias, y
  // hacían que "no se observan bacterias, abundantes leucocitos" leyera como
  // un Gram positivo.
  assert.equal(gramIsPositive_('ABUNDANTES LEUCOCITOS'), false);
  assert.equal(gramIsPositive_('ABUNDANTES POLIMORFONUCLEARES'), false);
  assert.equal(gramIsPositive_('ABUNDANTES POLIMORFONUCLEARES, NO BACTERIAS'), false);
  assert.equal(gramIsPositive_('MODERADOS LEUCOCITOS'), false);
});

test('gramIsPositive_ — negativo, vacío o sin dato', () => {
  assert.equal(gramIsPositive_('NEGATIVO'), false);
  assert.equal(gramIsPositive_(''), false);
  assert.equal(gramIsPositive_(null), false);
  assert.equal(gramIsPositive_(undefined), false);
});

test('isGramNegative_', () => {
  assert.equal(isGramNegative_('NEGATIVO'), true);
  assert.equal(isGramNegative_('COCOS GRAM POSITIVOS'), false);
  assert.equal(isGramNegative_(''), false);
});

test('parseFluidLeu_ — separador de miles vs decimal', () => {
  assert.equal(parseFluidLeu_('3,000'), 3000);
  assert.equal(parseFluidLeu_('1,5'), 1.5);
  assert.equal(parseFluidLeu_(''), null);
  assert.equal(parseFluidLeu_(null), null);
});

test('parsePmnField_ — % en el valor, en la unidad, PREDOMINIO y ambiguo', () => {
  assert.deepEqual(parsePmnField_('', 100), { pmnNum: null, pmnPct: null, predominant: false });
  assert.equal(parsePmnField_('PREDOMINIO', null).predominant, true);
  assert.equal(parsePmnField_('50', 200, '%').pmnPct, 50);
  assert.equal(parsePmnField_('101', null).pmnNum, 101);
  assert.equal(parsePmnField_('100', 500).pmnNum, null, '100 sin % es ambiguo, no se resuelve');
});
