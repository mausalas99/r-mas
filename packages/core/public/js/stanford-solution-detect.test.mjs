import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isStanfordSolutionMedicationItem,
  patientHasStanfordSolutionMeds,
  stanfordSolutionItemsFromList,
} from './stanford-solution-detect.mjs';

function stanfordItem(nombreRaw, dosisRaw) {
  return {
    nombreRaw: nombreRaw,
    viaRaw: 'VIA ORAL',
    dosisRaw: dosisRaw,
    frecuenciaRaw: 'CADA 8 HORAS',
    suspendido: false,
  };
}

test('isStanfordSolutionMedicationItem — detecta el marcador PARA SOLUCIÓN STANFORD', () => {
  var item = stanfordItem('NISTATINA 10000000 UI SUSPENSION 60 ML', '1 ML // PARA SOLUCIÓN STANFORD');
  assert.equal(isStanfordSolutionMedicationItem(item), true);
});

test('isStanfordSolutionMedicationItem — tolera variantes sin acento y con DIA#', () => {
  var item = stanfordItem(
    'DOXICICLINA 100 MG CAPSULA',
    '300 MG // PARA SOLUCION STANFORD *DIA# 8*'
  );
  assert.equal(isStanfordSolutionMedicationItem(item), true);
});

test('isStanfordSolutionMedicationItem — falso para medicamentos sin el marcador', () => {
  var item = stanfordItem('AMLODIPINO 5 MG TABLETA', '5 MG //');
  assert.equal(isStanfordSolutionMedicationItem(item), false);
});

test('isStanfordSolutionMedicationItem — falso si está suspendido', () => {
  var item = stanfordItem('NISTATINA 10000000 UI SUSPENSION 60 ML', '1 ML // PARA SOLUCIÓN STANFORD');
  item.suspendido = true;
  assert.equal(isStanfordSolutionMedicationItem(item), false);
});

test('stanfordSolutionItemsFromList / patientHasStanfordSolutionMeds', () => {
  var items = [
    stanfordItem('NISTATINA 10000000 UI SUSPENSION 60 ML', '1 ML // PARA SOLUCIÓN STANFORD'),
    stanfordItem('AMLODIPINO 5 MG TABLETA', '5 MG //'),
    stanfordItem('DEXAMETASONA 8 MG SOL INY 2 ML (*)', '8 MG // PARA SOLUCIÓN STANFORD'),
  ];
  assert.equal(patientHasStanfordSolutionMeds(items), true);
  assert.equal(stanfordSolutionItemsFromList(items).length, 2);
});
