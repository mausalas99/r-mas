import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSomeBlock } from './electrolyte-manejo.mjs';
import {
  drugToSomeOrder,
  kRepletionToSomeOrder,
  labMonitorToSomeOrder,
  protocolToSomeOrder,
  suggestIvFluidCarrier,
  cadGlucose250DextrosePlanOrder,
  cadInsulinStartSomeOrder,
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
      someFields: {
        medication: 'NORADRENALINA',
        route: 'IV',
        doseValue: '16',
        doseUnit: 'MG',
        dilution: '125 ML DE GLUCOSADO 5%',
        frequency: 'INFUSIÓN CONTINUA',
        infusionRateMlHr: '5 MCG/MIN',
        comments: 'TITULAR SEGÚN PAM',
      },
      notes: ['Permitir titular'],
    },
    null
  );
  assert.match(order.medication, /NORADRENALINA/i);
  assert.match(order.dilution, /125 ML/i);
  assert.match(String(order.infusionRateMlHr), /5 MCG\/MIN/i);
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

test('drugMatchesAtbRisFilter: abreviatura PIP/TAZO intacta', () => {
  var iso = {
    sensKeys: ['CIPRO', 'IMI', 'LVX', 'MERO', 'PIP/TAZO', 'TOBRA'],
    resKeys: ['CAZ'],
    intKeys: ['FEP'],
  };
  assert.equal(drugMatchesAtbRisFilter({ someAbbrev: ['PIP/TAZO', 'TZP'] }, iso, 's'), true);
  assert.equal(drugMatchesAtbRisFilter({ someAbbrev: ['CAZ'] }, iso, 'r'), true);
  assert.equal(drugMatchesAtbRisFilter({ someAbbrev: ['FEP'] }, iso, 'i'), true);
});

test('kRepletionToSomeOrder usa diluyente según sodio corregido ADA', () => {
  var orderLowNa = kRepletionToSomeOrder(
    { addMeqPerLiter: 20, detail: 'Con diuresis' },
    { na: 125, k: 4.2, glucoseMgDl: 300 }
  );
  assert.equal(orderLowNa.doseValue, '20');
  assert.match(orderLowNa.dilution, /NaCl 0\.9%/i);

  var orderHighNa = kRepletionToSomeOrder(
    { addMeqPerLiter: 20, detail: 'Con diuresis' },
    { na: 140, k: 4.2, glucoseMgDl: 300 }
  );
  assert.match(orderHighNa.dilution, /NaCl 0\.45%/i);
  assert.match(orderHighNa.comments, /DIURESIS/i);
});

test('cadGlucose250DextrosePlanOrder — agrega dextrosa 50% al carrier para glucosado 5%', () => {
  var order = cadGlucose250DextrosePlanOrder(80, { na: 142, glucoseMgDl: 280 });
  assert.match(order.medication, /DEXTROSA 50%/i);
  assert.equal(order.doseValue, '100');
  assert.equal(order.doseUnit, 'ML');
  assert.match(order.dilution, /AGREGAR A 1000 ML DE SOLUCIÓN DE NaCl 0\.45%/i);
  assert.match(order.dilution, /50 G\/L/i);
  assert.match(order.comments, /100 ML DE DEXTROSA 50%/i);
  assert.match(order.comments, /GLUCOSADO 5% EN NaCl 0\.45%/i);

  var orderLowNa = cadGlucose250DextrosePlanOrder(80, { na: 125, glucoseMgDl: 280 });
  assert.match(orderLowNa.dilution, /NaCl 0\.9%/i);
  assert.match(orderLowNa.comments, /GLUCOSADO 5% EN NaCl 0\.9%/i);
});

test('cadInsulinStartSomeOrder calcula 0.1 U/kg/h con peso', () => {
  var item = {
    phase: 'Insulina',
    medication: 'INSULINA REGULAR',
    text: 'Iniciar 1–2 h post líquidos: insulina regular 0.1 U/kg/h',
  };
  var order = cadInsulinStartSomeOrder(80, item);
  assert.equal(order.doseValue, '8');
  assert.equal(order.doseUnit, 'U/H');
});

test('suggestIvFluidCarrier — sodio corregido alto → NaCl 0.45%', () => {
  var s = suggestIvFluidCarrier({ na: 148, glucoseMgDl: 200, k: 4 });
  assert.match(s.carrier, /0\.45%/);
  assert.equal(s.correctedNa, 149.6);
  assert.match(s.rationale, /0\.45%/);
});

test('suggestIvFluidCarrier — sodio corregido bajo → NaCl 0.9%', () => {
  var s = suggestIvFluidCarrier({ na: 130, glucoseMgDl: 400, k: 4 });
  assert.match(s.carrier, /0\.9%/);
  assert.ok(s.correctedNa < 135);
});

test('labMonitoringForCadEhhMode devuelve estudios por modo', () => {
  assert.ok(labMonitoringForCadEhhMode('cad').length >= 4);
  assert.ok(labMonitoringForCadEhhMode('ehh').some(function (x) {
    return /OSMOLALIDAD/i.test(x.study);
  }));
  var labOrder = labMonitorToSomeOrder(labMonitoringForCadEhhMode('cad')[0]);
  assert.match(formatSomeBlock(labOrder), /FRECUENCIA:/);
});
