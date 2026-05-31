import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHistoriaClinicaSafetyHidden } from './clinical-product-policy.mjs';
import {
  buildAppTextForSafety,
  buildPeeaTextForSafety,
  scanHistoriaClinicaSafety,
} from './clinical-history-safety.mjs';

const catalogs = {
  appConditions: { dm: 'Diabetes mellitus', hta: 'Hipertensión arterial' },
};

test('buildAppTextForSafety concatenates meds, detail, and condition labels', () => {
  var text = buildAppTextForSafety(
    {
      app: {
        conditions: ['dm', 'hta'],
        descripcionDetallada: 'DM2 dx 2010.',
        medicamentosActuales: [
          { medication: 'Metformina', dosage: '850 mg', frequency: 'c/12h' },
        ],
      },
    },
    catalogs
  );
  assert.match(text, /Metformina/);
  assert.match(text, /DM2 dx 2010/);
  assert.match(text, /Diabetes mellitus/);
  assert.match(text, /Hipertensión arterial/);
});

test('buildAppTextForSafety accepts legacy flat app string', () => {
  assert.equal(buildAppTextForSafety({ app: 'metformina oral' }, catalogs), 'metformina oral');
});

test('buildPeeaTextForSafety prefers padecimientoActual and datosNegados', () => {
  var text = buildPeeaTextForSafety({
    padecimientoActual: 'Ingreso por sangrado',
    datosNegados: 'Fiebre, disnea.',
    peea: 'legacy peea',
  });
  assert.match(text, /sangrado/);
  assert.match(text, /Fiebre/);
  assert.doesNotMatch(text, /legacy peea/);
});

test('buildPeeaTextForSafety falls back to peea', () => {
  assert.equal(buildPeeaTextForSafety({ peea: 'TA 120/60' }), 'TA 120/60');
});

test('scanHistoriaClinicaSafety uses nested app for metformina rule', { skip: isHistoriaClinicaSafetyHidden() }, () => {
  var out = scanHistoriaClinicaSafety({
    data: {
      app: {
        conditions: [],
        descripcionDetallada: '',
        medicamentosActuales: [{ medication: 'metformina', dosage: '850 mg' }],
      },
    },
    catalogs,
    patient: { sexo: 'M', edad: '49' },
    latestLabSet: {
      id: 's1',
      parsed: { eTFG: 22, Cr: 2.1 },
      fecha: '30/05/26',
    },
  });
  assert.ok(out.rules.some((r) => r.id === 'metformina-egfr-lt30'));
});

test('scanHistoriaClinicaSafety still honors explicit appText', { skip: isHistoriaClinicaSafetyHidden() }, () => {
  var out = scanHistoriaClinicaSafety({
    appText: 'penicilina con alergia documentada',
    peeaText: '',
    patient: {},
  });
  assert.ok(out.rules.some((r) => r.id === 'beta-lactam-allergy'));
});
