import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIndicacionesPaste } from '../med-receta-parse.mjs';
import { classifyMedicationSoapCategory } from '../med-receta-core.mjs';
import { bucketsFromRecetaItems } from './estado-actual-meds-receta-buckets.mjs';
import {
  isStanfordSolutionMedicationItem,
  patientHasStanfordSolutionMeds,
  stanfordSolutionNmSoapFragment,
} from '../stanford-solution-display.mjs';

var STANFORD_PASTE =
  '05/09/2026 08:28:07 a.m.\tMEDICAMENTOS\tNISTATINA 10000000 UI SUSPENSION 60 ML\tVIA ORAL\t1 ML // PARA SOLUCIÓN STANFORD\tCADA 8 HORAS\tNW\n' +
  '05/09/2026 08:27:25 a.m.\tMEDICAMENTOS\tALUMINIO/MAGNESIO/DIMETICONA SUSPENSION 360 ML\tVIA ORAL\t200 ML // PARA SOLUCIÓN STANFORD\tCADA 8 HORAS\tNW\n' +
  '05/09/2026 08:27:36 a.m.\tMEDICAMENTOS\tDIFENHIDRAMINA 250 MG JARABE 120 ML (*)\tVIA ORAL\t500 MG // PARA SOLUCIÓN STANFORD\tCADA 8 HORAS\tNW\n' +
  '05/09/2026 08:27:31 a.m.\tMEDICAMENTOS\tDEXAMETASONA 8 MG SOL INY 2 ML (*)\tVIA ORAL\t8 MG // PARA SOLUCIÓN STANFORD\tCADA 8 HORAS\tNW\n' +
  '05/09/2026 08:27:58 a.m.\tMEDICAMENTOS\tDOXICICLINA 100 MG CAPSULA\tVIA ORAL\t300 MG // PARA SOLUCIÓN STANFORD *DIA# 8*\tCADA 8 HORAS\tNW\n' +
  '05/09/2026 08:27:27 a.m.\tMEDICAMENTOS\tAMLODIPINO 5 MG TABLETA\tVIA ORAL\t5 MG //\tCADA 24 HORAS\tNW';

test('Solución Stanford — detecta los 5 medicamentos marcados', () => {
  var parsed = parseIndicacionesPaste(STANFORD_PASTE);
  assert.equal(parsed.items.length, 6);
  assert.equal(patientHasStanfordSolutionMeds(parsed.items), true);
  var stanfordCount = parsed.items.filter(isStanfordSolutionMedicationItem).length;
  assert.equal(stanfordCount, 5);
});

test('stanfordSolutionNmSoapFragment — una sola línea con los 5 componentes', () => {
  var parsed = parseIndicacionesPaste(STANFORD_PASTE);
  var frag = stanfordSolutionNmSoapFragment(parsed.items, parsed.items);
  assert.match(frag, /^SOLUCIÓN STANFORD: /);
  assert.match(frag, /NISTATINA/i);
  assert.match(frag, /ALUMINIO/i);
  assert.match(frag, /DIFENHIDRAMINA/i);
  assert.match(frag, /DEXAMETASONA/i);
  assert.match(frag, /DOXICICLINA/i);
  assert.equal(frag.split(' + ').length, 5);
});

test('bucketsFromRecetaItems — Solución Stanford fusionada en NM, no dispersa en otros campos', () => {
  var parsed = parseIndicacionesPaste(STANFORD_PASTE);
  var sel = {};
  parsed.items.forEach(function (it) {
    sel[it.id] = true;
  });
  var buckets = bucketsFromRecetaItems(parsed.items, sel, classifyMedicationSoapCategory);
  assert.match(buckets.nm, /^SOLUCIÓN STANFORD: /);
  assert.equal(buckets.nm.split(' + ').length, 5);
  assert.equal(buckets.abx, '');
});
