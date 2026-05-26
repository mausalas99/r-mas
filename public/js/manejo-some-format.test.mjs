import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSomeBlock } from './electrolyte-manejo.mjs';
import {
  drugToSomeOrder,
  kRepletionToSomeOrder,
  labMonitorToSomeOrder,
  protocolToSomeOrder,
  suggestIvFluidCarrier,
} from './manejo-some-format.mjs';
import { drugMatchesAtbRisFilter, drugMatchesRisBucket } from './manejo-atb-suggest.mjs';
import { labMonitoringForCadEhhMode } from './manejo-cad-ehh.mjs';

test('formatSomeBlock incluye los 7 campos SOME en orden', () => {
  var block = formatSomeBlock({
    medication: 'Meropenem',
    doseValue: '1',
    doseUnit: 'G',
    route: 'IV',
    dilution: '100 CC NaCl 0.9%',
    frequency: 'CADA 8 H',
    infusionRateMlHr: '50',
    comments: 'AJUSTAR ClCr',
  });
  assert.match(block, /^MEDICAMENTO: MEROPENEM/);
  assert.match(block, /\nDOSIS: 1 G/);
  assert.match(block, /\nVIA: IV/);
  assert.match(block, /\nDILUCION: 100 CC NACL 0\.9%/);
  assert.match(block, /\nFRECUENCIA: CADA 8 H/);
  assert.match(block, /\nVELOCIDAD DE INFUSION: 50 CC\/HR/);
  assert.match(block, /\nCOMENTARIOS ADICIONALES: AJUSTAR CLCR/);
});

test('drugToSomeOrder separa dosis y frecuencia ATB', () => {
  var order = drugToSomeOrder(
    {
      name: 'Meropenem',
      adultDose: '1 g IV c/8h (ajustar ClCr <40)',
      route: 'IV',
      renalNote: 'ClCr 10–20: 500 mg c/12h',
    },
    null
  );
  assert.equal(order.medication, 'Meropenem');
  assert.match(String(order.frequency), /8 H/);
  assert.match(String(order.comments), /ClCr/);
});

test('protocolToSomeOrder estructura NORE', () => {
  var order = protocolToSomeOrder(
    {
      title: 'Noradrenalina (NORE)',
      indicationText: '16 mg en 125 cc glucosado 5%. Iniciar 5 mcg/min y titular.',
      notes: ['Permitir titular'],
    },
    null
  );
  assert.match(order.medication, /Noradrenalina/i);
  assert.match(order.dilution, /125 CC/i);
  assert.match(order.comments, /titular/i);
});

test('protocolToSomeOrder respeta someFields guardados', () => {
  var order = protocolToSomeOrder(
    {
      title: 'KCl',
      someFields: {
        medication: 'CLORURO DE POTASIO',
        doseValue: '20',
        doseUnit: 'MEQ',
        route: 'IV',
        dilution: 'EN NaCl 0.9% 1000 ML',
        frequency: 'CADA 8 H',
        infusionRateMlHr: 50,
        comments: 'VIGILAR K',
      },
    },
    null
  );
  assert.equal(order.doseValue, '20');
  assert.equal(order.doseUnit, 'MEQ');
  assert.equal(order.infusionRateMlHr, 50);
  assert.match(order.comments, /VIGILAR K/);
});

test('drugMatchesRisBucket filtra S R I', () => {
  var iso = { sensKeys: ['MERO'], resKeys: ['CIPRO'], intKeys: ['LVX'] };
  assert.equal(drugMatchesRisBucket({ someAbbrev: ['MERO'] }, iso, 's'), true);
  assert.equal(drugMatchesRisBucket({ someAbbrev: ['CIPRO'] }, iso, 'r'), true);
  assert.equal(drugMatchesRisBucket({ someAbbrev: ['LVX'] }, iso, 'i'), true);
  assert.equal(drugMatchesAtbRisFilter({ someAbbrev: ['MERO'] }, iso, 's'), true);
  assert.equal(drugMatchesAtbRisFilter({ someAbbrev: ['MERO'] }, iso, 'r'), false);
});

test('kRepletionToSomeOrder usa dosis en mEq y NaCl 0.9%', () => {
  var order = kRepletionToSomeOrder(
    { addMeqPerLiter: 20, detail: 'Con diuresis' },
    { na: 140, k: 4.2, glucoseMgDl: 300 }
  );
  assert.equal(order.medication, 'CLORURO DE POTASIO');
  assert.equal(order.doseValue, '20');
  assert.equal(order.doseUnit, 'MEQ');
  assert.match(order.dilution, /NaCl 0\.9%/i);
  assert.match(order.comments, /DIURESIS/i);
});

test('suggestIvFluidCarrier prefiere glucosado si Na alto y glucosa < 250', () => {
  var s = suggestIvFluidCarrier({ na: 148, glucoseMgDl: 200, k: 4 });
  assert.match(s.carrier, /GLUCOSADO/i);
});

test('labMonitoringForCadEhhMode devuelve estudios por modo', () => {
  assert.ok(labMonitoringForCadEhhMode('cad').length >= 4);
  assert.ok(labMonitoringForCadEhhMode('ehh').some(function (x) {
    return /OSMOLALIDAD/i.test(x.study);
  }));
  var labOrder = labMonitorToSomeOrder(labMonitoringForCadEhhMode('cad')[0]);
  assert.match(formatSomeBlock(labOrder), /FRECUENCIA:/);
});
