import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIndicacionesPaste } from '../med-receta-parse.mjs';
import { classifyMedicationSoapCategory } from '../med-receta-core.mjs';
import { bucketsFromRecetaItems } from './estado-actual-meds-receta-buckets.mjs';
import {
  isPotassiumReposCarrierMedicationItem,
  isPotassiumReposMedicationItem,
  patientHasPotassiumReposMeds,
  potassiumReposNmSoapFragment,
} from '../potassium-repos-display.mjs';
import { buildEstadoActualText } from './estado-actual-text.mjs';
import { emptyMonitoreo } from './estado-actual-data.mjs';

var K_REPOS_PASTE =
  '08/08/2026 11:40:10 a.m.\tMEDICAMENTOS P1\tCLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)\tVIA INTRAVENOSA\t60 MEQ\t-\tNW\n' +
  '08/08/2026 11:40:10 a.m.\tMEDICAMENTOS P1\tCLORURO DE SODIO 0.9 % SOL INY 1000 ML\tVIA INTRAVENOSA\t800 ML / VEL.INF: PARA 20 HORAS\tUNICA VEZ\tNW\n' +
  '08/08/2026 11:40:10 a.m.\tMEDICAMENTOS P1\tFOSFATO DE POTASIO 20 MEQ SOL INY 10 ML (+)\tVIA INTRAVENOSA\t20 MEQ\t-\tNW';

test('potassium repos — detección KCl, K phosphate y carrier NaCl', () => {
  var parsed = parseIndicacionesPaste(K_REPOS_PASTE);
  assert.equal(parsed.items.length, 3);
  assert.equal(patientHasPotassiumReposMeds(parsed.items), true);
  assert.equal(isPotassiumReposMedicationItem(parsed.items[0]), true);
  assert.equal(isPotassiumReposMedicationItem(parsed.items[2]), true);
  assert.equal(isPotassiumReposCarrierMedicationItem(parsed.items[1], parsed.items), true);
});

test('potassiumReposNmSoapFragment — cláusula consolidada NM', () => {
  var parsed = parseIndicacionesPaste(K_REPOS_PASTE);
  var sel = {};
  parsed.items.forEach(function (it) {
    sel[it.id] = true;
  });
  var frag = potassiumReposNmSoapFragment(parsed.items, parsed.items);
  assert.match(frag, /^REPOSICIÓN DE POTASIO:/);
  assert.match(frag, /CLORURO DE POTASIO.*60.*MEQ.*IV/i);
  assert.match(frag, /FOSFATO DE POTASIO.*20.*MEQ.*IV/i);
  assert.match(frag, /\(PARA 20 HORAS\)$/);
});

test('bucketsFromRecetaItems — reposición K en NM sin diluyente NaCl', () => {
  var parsed = parseIndicacionesPaste(K_REPOS_PASTE);
  var sel = {};
  parsed.items.forEach(function (it) {
    sel[it.id] = true;
  });
  var buckets = bucketsFromRecetaItems(parsed.items, sel, classifyMedicationSoapCategory);
  assert.match(buckets.nm, /^REPOSICIÓN DE POTASIO:/);
  assert.doesNotMatch(buckets.nm, /CLORURO DE SODIO/i);
});

test('buildEstadoActualText — reposición K en línea NM', () => {
  var m = emptyMonitoreo();
  m.estadoClinico.nm =
    'REPOSICIÓN DE POTASIO: CLORURO DE POTASIO 60 MEQ IV, FOSFATO DE POTASIO 20 MEQ IV (PARA 20 HORAS)';
  var text = buildEstadoActualText(m.estadoClinico, { vitals: {}, glucometrias: [], io: {} }, {}, {});
  var nmLine = text.split('\n').find(function (line) {
    return line.startsWith('NM:');
  });
  assert.match(nmLine, /REPOSICIÓN DE POTASIO: CLORURO DE POTASIO 60 MEQ IV, FOSFATO DE POTASIO 20 MEQ IV \(PARA 20 HORAS\)/);
});

test('potassiumReposNmSoapFragment — duración desde CC/HORA y volumen ML', () => {
  var paste =
    '08/08/2026 11:40:10 a.m.\tMEDICAMENTOS P1\tCLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)\tVIA INTRAVENOSA\t60 MEQ\t-\tNW\n' +
    '08/08/2026 11:40:10 a.m.\tMEDICAMENTOS P1\tCLORURO DE SODIO 0.9 % SOL INY 1000 ML\tVIA INTRAVENOSA\t800 ML / VEL.INF: 40 CC/HORA\tUNICA VEZ\tNW\n' +
    '08/08/2026 11:40:10 a.m.\tMEDICAMENTOS P1\tFOSFATO DE POTASIO 20 MEQ SOL INY 10 ML (+)\tVIA INTRAVENOSA\t20 MEQ\t-\tNW';
  var parsed = parseIndicacionesPaste(paste);
  var frag = potassiumReposNmSoapFragment(parsed.items, parsed.items);
  assert.match(frag, /\(PARA 20 HORAS\)$/);
});
