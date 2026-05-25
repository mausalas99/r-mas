import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProximaCitaText,
  buildRecetaHuGeneratePayload,
  normalizeRecetaHuConsultServices,
  normalizeRecetaHuDraft,
} from './receta-hu-core.mjs';

test('normalizeRecetaHuDraft conserva filas de medicamento y labs', () => {
  const d = normalizeRecetaHuDraft({
    fecha: '25/05/2026',
    meds: [{ medicamento: 'Paracetamol', presentacion: 'tab', dosis: '500 mg VO c/8h' }],
    labs: ['Biometría hemática', ''],
    cuidados: 'Dieta blanda',
    proximaCita: 'Acudir en 2 semanas a consulta de Nefrología',
  });
  assert.equal(d.meds.length, 1);
  assert.equal(d.meds[0].medicamento, 'Paracetamol');
  assert.equal(d.labs.length, 2);
  assert.equal(d.cuidados, 'Dieta blanda');
});

test('buildProximaCitaText arma frase de consulta', () => {
  assert.equal(
    buildProximaCitaText('2 semanas', 'Nefrología'),
    'Acudir en 2 semanas a consulta de Nefrología'
  );
});

test('buildRecetaHuGeneratePayload filtra filas vacías', () => {
  const body = buildRecetaHuGeneratePayload({
    patient: { nombre: 'Pérez', registro: '123', servicio: 'MI' },
    draft: {
      meds: [
        { medicamento: 'A', presentacion: '', dosis: '' },
        { medicamento: '', presentacion: '', dosis: '' },
      ],
      labs: ['BH', '  ', ''],
      doctorName: 'Dr. X',
      cedulaProfesional: '999',
    },
    doctorName: 'Dr. X',
    cedulaProfesional: '999',
  });
  assert.equal(body.meds.length, 1);
  assert.deepEqual(body.labs, ['BH']);
  assert.equal(body.doctorName, 'Dr. X');
});

test('normalizeRecetaHuConsultServices deduplica servicios', () => {
  const list = normalizeRecetaHuConsultServices(['Nefrología', 'nefrología', 'Oncología']);
  assert.equal(list.length, 2);
  assert.ok(list.includes('Nefrología'));
});
