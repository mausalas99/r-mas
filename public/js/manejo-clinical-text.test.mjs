import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clinicalTextPreview,
  expandClinicalCriteria,
  inferPresentationMode,
  parseCriterionPart,
  recommendationCardTitle,
  splitClinicalLines,
  splitDrugAlternatives,
} from './manejo-clinical-text.mjs';

test('inferPresentationMode distingue definición de acciones', () => {
  assert.equal(inferPresentationMode('Definición y riesgo'), 'prose');
  assert.equal(inferPresentationMode('Alto riesgo — monoterapia empírica'), 'checklist');
});

test('splitDrugAlternatives separa antibióticos empíricos', () => {
  var parts = splitDrugAlternatives(
    'Cefepime 2 g c/8 h, meropenem 1 g c/8 h o pip/tazo 4.5 g c/6 h'
  );
  assert.equal(parts.length, 3);
});

test('expandClinicalCriteria separa acciones y fármacos', () => {
  var items = expandClinicalCriteria(
    'Cefepime 2 g c/8 h, meropenem 1 g c/8 h o pip/tazo 4.5 g c/6 h. Agregar vancomicina según foco/MRSA. Antifúngico a las 96 h si fiebre persistente.',
    'Alto riesgo — monoterapia empírica'
  );
  assert.ok(items.length >= 5);
  assert.equal(items[0].label, 'Cefepime');
  assert.equal(items[3].label, 'Vancomicina');
  assert.equal(items[3].addon, true);
});

test('parseCriterionPart separa agregar vancomicina', () => {
  var part = parseCriterionPart('Agregar vancomicina según foco/MRSA');
  assert.equal(part.label, 'Vancomicina');
  assert.match(part.detail, /foco\/MRSA/);
  assert.equal(part.addon, true);
});

test('definición queda en criterios cortos sin exceso de filas', () => {
  var items = expandClinicalCriteria(
    'T ≥38.3°C o ≥38°C sostenida >1 h + neutrófilos <500 (o <1000 con descenso esperado a <500). MASCC ≥21: bajo riesgo.',
    'Definición y riesgo'
  );
  assert.equal(items.length, 2);
  assert.match(items[1].detail, /bajo riesgo/);
});

test('parseCriterionPart separa fármaco y dosis', () => {
  var part = parseCriterionPart('Cefepime 2 g c/8 h');
  assert.equal(part.label, 'Cefepime');
  assert.match(part.detail, /2 g/);
});

test('clinicalTextPreview muestra solo la primera línea', () => {
  var preview = clinicalTextPreview(
    'Cefepime 2 g c/8 h, meropenem 1 g c/8 h o pip/tazo 4.5 g c/6 h. Agregar vancomicina según foco/MRSA.',
    80,
    'Alto riesgo — monoterapia empírica'
  );
  assert.match(preview, /Cefepime/);
  assert.doesNotMatch(preview, /\+/);
});

test('expandClinicalCriteria separa precipitantes en lista escaneable', () => {
  var items = expandClinicalCriteria(
    'Infección (paracentesis, cultivos), sangrado GI, constipación, deshidratación, benzodiacepinas/opioides, PBE (PMN >250).',
    'Precipitantes'
  );
  assert.equal(items.length, 6);
  assert.equal(items[0].label, 'Infección');
  assert.match(items[0].detail, /Paracentesis/i);
  assert.equal(items[5].label, 'PBE');
  assert.match(items[5].detail, /PMN >250/);
});

test('parseCriterionPart separa paréntesis como detalle', () => {
  var part = parseCriterionPart('PBE (PMN >250)');
  assert.equal(part.label, 'PBE');
  assert.match(part.detail, /PMN >250/);
});

test('recommendationCardTitle usa sección', () => {
  assert.equal(
    recommendationCardTitle({ text: 'Cefepime 2 g c/8 h…' }, 'Alto riesgo — monoterapia empírica'),
    'Alto riesgo — monoterapia empírica'
  );
});
