import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ageYearsFromLabDemographics,
  computeEgfrCkdEpi2021Creatinine,
  parseQS_,
  procesarLabs,
} from './labs.js';

test('ageYearsFromLabDemographics convierte unidades comunes', () => {
  assert.equal(ageYearsFromLabDemographics('67', 'años'), 67);
  assert.ok(Math.abs(ageYearsFromLabDemographics('216', 'meses') - 18) < 0.02);
  assert.ok(ageYearsFromLabDemographics('', 'años') == null);
});

test('computeEgfrCkdEpi2021Creatinine: valores plausibles (adultos)', () => {
  var gM = computeEgfrCkdEpi2021Creatinine(1.0, 50, false);
  assert.ok(gM > 60 && gM < 95, 'hombre 50 años Cr 1.0');
  var gF = computeEgfrCkdEpi2021Creatinine(0.9, 45, true);
  assert.ok(gF > 70 && gF < 110, 'mujer 45 años Cr 0.9');
  assert.equal(computeEgfrCkdEpi2021Creatinine(1.0, 17, false), null);
  assert.equal(computeEgfrCkdEpi2021Creatinine(-1, 40, false), null);
});

test('parseQS_ añade eTFG después de Cr cuando hay edad y sexo', () => {
  var t =
    'QUIMICA SANGUINEA GLUCOSA EN SANGRE 95 mg/dL 70-110 CREATININA 1.0 mg/dL 0.7-1.2';
  var qs = parseQS_(t, { edad: '50', edadUnidad: 'años', sexo: 'M' });
  assert.match(qs, /^QS\t/);
  assert.match(qs, /\bCr\s+/);
  assert.match(qs, /\beTFG\s+\d+/);
});

test('procesarLabs: QS con eTFG usando encabezado del reporte', () => {
  var raw = [
    'Nombre: PRUEBA PACIENTE',
    'Sexo: FEMENINO',
    'Edad: 58 años',
    'QUIMICA SANGUINEA',
    'GLUCOSA EN SANGRE 100 mg/dL',
    'CREATININA 1.05 mg/dL',
  ].join('\n');
  var r = procesarLabs(raw);
  var qsLine = (r.resLabs || []).find(function (l) {
    return String(l).startsWith('QS\t');
  });
  assert.ok(qsLine, 'debe existir línea QS');
  assert.match(String(qsLine), /\beTFG\s+\d+/);
});
