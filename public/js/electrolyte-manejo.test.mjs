import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toSomeUpper,
  formatSomeBlock,
  formatSuggestedDoseFromOrder,
  kLimitsForAccess,
  tbwFactor,
  correctedCalcium,
  evaluateElectrolyteManejo,
  mlHypertonic177FromEffective3,
} from './electrolyte-manejo.mjs';

const MED_K_EXPECT = 'CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)';

test('toSomeUpper normaliza texto a mayusculas', () => {
  assert.equal(toSomeUpper('  gluconato iv  '), 'GLUCONATO IV');
});

test('formatSomeBlock arma bloque SOME en MAYUSCULAS', () => {
  var block = formatSomeBlock({
    medication: MED_K_EXPECT,
    route: 'intravenosa',
    doseValue: 30,
    doseUnit: 'mEq',
    dilution: '500 ML SOL SALINA AL 0.9% (30 MEQ / 500 ML)',
    infusionRateMlHr: 50,
  });
  assert.match(block, /^MEDICAMENTO: /m);
  assert.ok(!/[a-z]/.test(block), 'bloque debe ir sin minusculas ASCII');
});

test('mlHypertonic177FromEffective3 convierte vol final ~3% a mL 17.7%', () => {
  assert.equal(Math.round(mlHypertonic177FromEffective3(150)), 25);
  assert.equal(Math.round(mlHypertonic177FromEffective3(100)), 17);
});

test('Na hipo moderada SOME diluye 17.7% a ~3% eq.', () => {
  var r = evaluateElectrolyteManejo({
    parsedBySection: { ESC: { Na: 128, K: 4 } },
    patient: { peso: 70, sexo: 'M' },
  });
  var naRow = r.rows.find(function (row) {
    return row.electrolyte === 'Na' && row.direction === 'hypo';
  });
  assert.ok(naRow);
  assert.match(String(naRow.formulaResult), /~3% eq\./);
  assert.match(String(naRow.someOrders[0].dilution), /DILUIR.*17\.7%.*~3% EQ/i);
  assert.match(String(naRow.clinicalNotes.join(' ')), /Sin NaCl al 3%/);
});

test('Na hipo grave SOME usa mL 17.7% diluidos (no bolo directo 100–150 mL)', () => {
  var r = evaluateElectrolyteManejo({
    parsedBySection: { ESC: { Na: 118, K: 4 } },
    patient: { peso: 70, sexo: 'M' },
  });
  var naRow = r.rows.find(function (row) {
    return row.electrolyte === 'Na' && row.direction === 'hypo' && row.severity === 'grave';
  });
  assert.ok(naRow);
  assert.match(String(naRow.someOrders[0].doseValue), /17.*25|17–25/);
  assert.match(String(naRow.someOrders[0].dilution), /DILUIR/i);
  assert.match(String(naRow.someOrders[0].dilution), /~3% EQ/i);
});

test('Na hipo incluye SOME con NaCl hipertónico 17.7%', () => {
  var r = evaluateElectrolyteManejo({
    parsedBySection: { ESC: { Na: 128, K: 4 } },
    patient: { peso: 70, sexo: 'M' },
  });
  var naRow = r.rows.find(function (row) {
    return row.electrolyte === 'Na' && row.direction === 'hypo';
  });
  assert.ok(naRow, 'debe haber fila Na hipo');
  assert.ok(naRow.someOrders && naRow.someOrders.length > 0);
  assert.equal(
    naRow.someOrders[0].medication,
    'CLORURO DE SODIO HIPERT. 17.7 % SOL INY 10 ML (+)'
  );
});

test('Na hipo grave usa bolo hipertónico 17.7% diluido', () => {
  var r = evaluateElectrolyteManejo({
    parsedBySection: { ESC: { Na: 118, K: 4 } },
    patient: { peso: 70, sexo: 'M' },
  });
  var naRow = r.rows.find(function (row) {
    return row.electrolyte === 'Na' && row.direction === 'hypo' && row.severity === 'grave';
  });
  assert.ok(naRow);
  assert.equal(naRow.someOrders[0].medication, 'CLORURO DE SODIO HIPERT. 17.7 % SOL INY 10 ML (+)');
  assert.match(String(naRow.suggestedDose), /~3% eq/i);
});

test('kLimitsForAccess: periferica vs CVC', () => {
  var p = kLimitsForAccess('periferica');
  var c = kLimitsForAccess('cvc');
  assert.equal(p.maxConcMeqPerL, 40);
  assert.equal(p.maxMeqPerHr, 10);
  assert.equal(c.maxConcMeqPerL, 80);
  assert.equal(c.maxMeqPerHr, 40);
});

test('K hipo incluye algun someOrder del medicamento de potasio', () => {
  var r = evaluateElectrolyteManejo({
    parsedBySection: {
      ESC: { K: 2.9, Na: 138 },
    },
    patient: { peso: '70', sexo: 'M', viaAcceso: 'periferica' },
  });
  var kRow = r.rows.find(function (row) {
    return row.electrolyte === 'K' && row.direction === 'hypo';
  });
  assert.ok(kRow, 'debe haber fila K hipo');
  assert.ok(Array.isArray(kRow.someOrders) && kRow.someOrders.length > 0);
  assert.equal(kRow.someOrders[0].medication, MED_K_EXPECT);
});

test('K hipo: dosis sugerida incluye dilución, acceso y velocidad (sin institución)', () => {
  var r = evaluateElectrolyteManejo({
    parsedBySection: { ESC: { K: 3.1, F: 1.7 } },
    patient: { peso: 70, viaAcceso: 'periferica' },
  });
  var kRow = r.rows.find(function (row) {
    return row.electrolyte === 'K' && row.direction === 'hypo';
  });
  assert.ok(kRow);
  assert.doesNotMatch(String(kRow.suggestedDose), /institucion/i);
  assert.match(String(kRow.suggestedDose), /Dilución:/i);
  assert.match(String(kRow.suggestedDose), /Vel\. infusión:/i);
  assert.match(String(kRow.suggestedDose), /periférica/i);
});

test('P hipo: dosis sugerida con mmol, dilución y velocidad', () => {
  var r = evaluateElectrolyteManejo({
    parsedBySection: { ESC: { K: 3.1, F: 1.7 } },
    patient: { peso: 70, viaAcceso: 'cvc' },
  });
  var pRow = r.rows.find(function (row) {
    return row.electrolyte === 'P' && row.direction === 'hypo';
  });
  assert.ok(pRow);
  assert.doesNotMatch(String(pRow.suggestedDose), /institucion/i);
  assert.match(String(pRow.suggestedDose), /Dilución:/i);
  assert.match(String(pRow.suggestedDose), /Vel\. infusión:/i);
  assert.ok(pRow.someOrders.length > 0);
  assert.match(String(pRow.someOrders[0].medication), /FOSFATO DE POTASIO/);
});

test('formatSuggestedDoseFromOrder arma texto legible', () => {
  var t = formatSuggestedDoseFromOrder(
    {
      doseValue: 25,
      doseUnit: 'MEQ',
      dilution: '500 ML SS 0.9%',
      infusionRateMlHr: 50,
    },
    { accessLabel: 'central (CVC)', meqPerHr: 20 }
  );
  assert.match(t, /25 MEQ/);
  assert.match(t, /500 ML/);
  assert.match(t, /50 mL\/h/);
});

test('Na TBW factor mujer aplicado en déficit teorico Na', () => {
  /** TBW=F×peso: 60×0.5=30 → deficit mEq TBW*(140−Na)=30*(140−130)=300 */
  var r = evaluateElectrolyteManejo({
    parsedBySection: { ESC: { Na: 130, K: 4 } },
    patient: { peso: 60, sexo: 'F' },
  });
  assert.equal(tbwFactor({ sexo: 'F' }), 0.5);
  assert.ok(
    String(r.rows.find(function (row) { return row.electrolyte === 'Na'; }).formulaResult).includes(
      '300'
    )
  );
});

test('correctedCalcium aplica albúmina 4 g/dL referencia', () => {
  var v = correctedCalcium(8, 3.5);
  assert.equal(v, 8 + 0.8 * (4 - 3.5));
});

test('K hiper emergencia produce varias ordenes SOME', () => {
  var r = evaluateElectrolyteManejo({
    parsedBySection: {
      ESC: { K: 6.6, Na: 138 },
      QS: { Glu: 200 },
    },
    patient: {},
  });
  var kHyper = r.rows.find(function (row) {
    return row.electrolyte === 'K' && row.direction === 'hyper';
  });
  assert.ok(kHyper.someOrders.length >= 3);
  assert.ok(
    kHyper.someOrders.some(function (o) {
      return o.medication.includes('INSULINA');
    })
  );
  assert.ok(
    kHyper.someOrders.some(function (o) {
      return o.medication.includes('GLUCONATO');
    })
  );
});

test('crossAlerts: Mg y K hipos sugieren Mg primero', () => {
  var r = evaluateElectrolyteManejo({
    parsedBySection: {
      ESC: { K: 2.8, Na: 138, Mg: 1.2 },
      QS: { eTFG: 90 },
    },
    patient: { peso: 70 },
  });
  assert.ok(
    r.crossAlerts.some(function (t) {
      return /magnesio/i.test(t) && /potasio/i.test(t);
    })
  );
});

test('evaluateElectrolyteManejo marca hasAlterations con K 2.8', () => {
  var r = evaluateElectrolyteManejo({
    parsedBySection: { ESC: { K: 2.8, Na: 140 } },
    patient: {},
  });
  assert.equal(r.hasAlterations, true);
});
