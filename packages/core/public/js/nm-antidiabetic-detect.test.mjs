import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAntidiabeticMedNombre,
  isAntidiabeticNmLine,
  partitionNmMedLines,
} from './nm-antidiabetic-detect.mjs';

test('isAntidiabeticMedNombre — insulina y orales', () => {
  assert.equal(isAntidiabeticMedNombre('METFORMINA 850MG'), true);
  assert.equal(isAntidiabeticMedNombre('INSULINA GLARGINA'), true);
  assert.equal(isAntidiabeticMedNombre('LEVOTIROXINA 50MCG'), false);
  assert.equal(isAntidiabeticMedNombre('OMEPRAZOL 40MG'), false);
});

test('isAntidiabeticNmLine — líneas NM especiales', () => {
  assert.equal(isAntidiabeticNmLine('RESCATES DE INSULINA'), true);
  assert.equal(isAntidiabeticNmLine('INSULINA PREPRANDIAL: 4UI AM/MEDIODIA/PM'), true);
  assert.equal(isAntidiabeticNmLine('BOMBA DE INSULINA EN ALGORITMO 2'), true);
  assert.equal(isAntidiabeticNmLine('METFORMINA 850MG VO C/24H'), true);
  assert.equal(isAntidiabeticNmLine('LEVOTIROXINA 50MCG VO C/24H'), false);
});

test('partitionNmMedLines separa antidiabéticos del resto NM', () => {
  var part = partitionNmMedLines([
    'RESCATES DE INSULINA',
    'OMEPRAZOL 40MG IV C/24H',
    'METFORMINA 850MG VO C/24H',
    'INSULINA GLARGINA 12UI SC C/24H',
    'LEVOTIROXINA 50MCG VO C/24H',
  ]);
  assert.equal(part.rescatesDisponibles, true);
  assert.deepEqual(part.antidiabeticos, [
    'RESCATES DE INSULINA',
    'METFORMINA 850MG VO C/24H',
    'INSULINA GLARGINA 12UI SC C/24H',
  ]);
  assert.deepEqual(part.other, ['OMEPRAZOL 40MG IV C/24H', 'LEVOTIROXINA 50MCG VO C/24H']);
});
