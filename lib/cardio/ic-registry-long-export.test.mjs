import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyCardio } from './patient-cardio.mjs';
import { emptyConsultaEntry } from './consulta-seguimiento.mjs';
import { emptyLabSnapshot } from './hf-labs.mjs';
import { buildIcRegistryRow } from './ic-registry-export.mjs';
import {
  ICR_PACIENTES_HEADERS,
  ICR_VISITAS_HEADERS,
  buildIcRegistryLongRowsForPatient,
  buildIcRegistryLongRows,
} from './ic-registry-long-export.mjs';

function fixturePatient() {
  const cardio = emptyCardio();
  cardio.evaluacionInicial.fecha = '2026-01-01';
  cardio.evaluacionInicial.labsIngreso.ntProBnp = 5000;
  cardio.echoStudies = [
    { date: '2026-01-02', fevi: 30, itVmax: 1.1, vciMm: 22, pad: 15, psap: 45, tapse: 1.4, tapsePsap: 0.31 },
    { date: '2026-02-15', fevi: 40, itVmax: 1.3, vciMm: 18, pad: 10, psap: 35, tapse: 1.7, tapsePsap: 0.48 },
  ];
  cardio.labSnapshots = [
    Object.assign(emptyLabSnapshot(), {
      date: '2026-01-02',
      values: Object.assign(emptyLabSnapshot().values, { cr: 1.2, na: 138, k: 4.1, bilTotal: 0.6, ntProBnp: 4800 }),
    }),
    Object.assign(emptyLabSnapshot(), {
      date: '2026-02-15',
      values: Object.assign(emptyLabSnapshot().values, { cr: 1.0, na: 140, k: 4.0, bilTotal: 0.5, ntProBnp: 1200 }),
    }),
  ];
  cardio.consultas = [
    Object.assign(emptyConsultaEntry(), {
      date: '2026-01-02',
      contacto: 'Teléfono',
      ta: 95,
      reingresoHospitalario: false,
      causaReingreso: '',
      muerte: false,
      scoreTmo: 3,
      dosisTitulada: { bb: 'Media', iecaAraArni: 'Máxima', arm: '', isglt2: '' },
      bbArniArmSglt2DosisMaxima: false,
      tiempoImplementacionSemanas: 2,
    }),
    Object.assign(emptyConsultaEntry(), {
      date: '2026-02-15',
      contacto: 'Presencial',
      ta: 110,
      reingresoHospitalario: true,
      causaReingreso: 'Arritmia',
      muerte: false,
      scoreTmo: 5,
      bbArniArmSglt2DosisMaxima: true,
      tiempoImplementacionSemanas: 6,
      implementacionCompleta: true,
      malApego: false,
    }),
  ];
  return { id: 'pt-1', nombre: 'Paciente Prueba', registro: 'REG-1', edad: 62, cardio };
}

test('ICR_PACIENTES_HEADERS covers exactly the baseline slice, bare Dosis renamed', () => {
  assert.equal(ICR_PACIENTES_HEADERS[0], 'ID');
  assert.ok(ICR_PACIENTES_HEADERS.includes('Nombre '));
  assert.ok(ICR_PACIENTES_HEADERS.includes('Registro'));
  assert.ok(!ICR_PACIENTES_HEADERS.includes('Dosis'), 'no ambiguous bare "Dosis" column should survive');
  assert.ok(ICR_PACIENTES_HEADERS.includes('Dosis ARM'), 'bare Dosis after ARM renamed');
  assert.ok(ICR_PACIENTES_HEADERS.includes('Dosis Vericiguat'));
  assert.ok(ICR_PACIENTES_HEADERS.includes('Dosis Digoxina'));
  assert.ok(ICR_PACIENTES_HEADERS.includes('Dosis ACO'));
});

test('ICR_VISITAS_HEADERS is a small deduped schema, not 20x the wide columns', () => {
  assert.deepEqual(ICR_VISITAS_HEADERS.slice(0, 3), ['ID', 'Registro', 'Visita']);
  assert.ok(ICR_VISITAS_HEADERS.includes('Fecha ECO'));
  assert.ok(ICR_VISITAS_HEADERS.includes('Fecha TMO'));
  assert.ok(ICR_VISITAS_HEADERS.length < 150, `expected a compact schema, got ${ICR_VISITAS_HEADERS.length} cols`);
  assert.equal(new Set(ICR_VISITAS_HEADERS).size, ICR_VISITAS_HEADERS.length, 'no duplicate columns');
});

test('buildIcRegistryLongRowsForPatient emits 1 paciente row + 1 row per real visit', () => {
  const patient = fixturePatient();
  const { pacienteRow, visitRows } = buildIcRegistryLongRowsForPatient(patient);
  assert.equal(pacienteRow.length, ICR_PACIENTES_HEADERS.length);
  assert.equal(pacienteRow[ICR_PACIENTES_HEADERS.indexOf('ID')], 'pt-1');
  assert.equal(pacienteRow[ICR_PACIENTES_HEADERS.indexOf('Registro')], 'REG-1');
  assert.equal(pacienteRow[ICR_PACIENTES_HEADERS.indexOf('Nombre ')], 'Paciente Prueba');

  assert.equal(visitRows.length, 2, 'only 2 consultas exist, no blank visit rows for the other 18 blocks');
  assert.equal(visitRows[0][0], 'pt-1');
  assert.equal(visitRows[0][1], 'REG-1');
  assert.equal(visitRows[0][2], '1');
  assert.equal(visitRows[1][2], '2');

  const feviCol = ICR_VISITAS_HEADERS.indexOf('FEVI');
  assert.ok(feviCol >= 0);
  assert.equal(visitRows[0][feviCol], '30');
  assert.equal(visitRows[1][feviCol], '40');

  const creatCol = ICR_VISITAS_HEADERS.indexOf('Creat');
  assert.equal(visitRows[0][creatCol], '1.2');

  const reingresoCol = ICR_VISITAS_HEADERS.findIndex((h) => h.startsWith('Reingreso hospitalario'));
  assert.ok(reingresoCol >= 0);
  assert.equal(visitRows[1][reingresoCol], '1');
});

test('buildIcRegistryLongRows aggregates across patients, Visitas rows link by ID even with blank/duplicate Registro', () => {
  const a = fixturePatient();
  const b = Object.assign(fixturePatient(), { id: 'pt-2', registro: '', nombre: 'Sin expediente' });
  const c = Object.assign(fixturePatient(), { id: 'pt-3', registro: 'REG-1', nombre: 'Expediente duplicado' });
  const built = buildIcRegistryLongRows([a, b, c]);
  assert.equal(built.pacientesRows.length, 3);
  assert.equal(built.visitasRows.length, 6);
  const ids = new Set(built.visitasRows.map((r) => r[0]));
  assert.deepEqual(ids, new Set(['pt-1', 'pt-2', 'pt-3']), 'ID stays unique/non-blank even when Registro is not');
});

test('every non-empty cell in the wide row is carried into the long output — no value is dropped', () => {
  const patient = fixturePatient();
  // Densify: give every visit block real data by adding 18 more consultas
  // with matching echo/labs, so all 20 blocks (not just 2) get exercised.
  for (let i = 3; i <= 20; i += 1) {
    const date = `2026-${String(Math.min(i, 12)).padStart(2, '0')}-0${(i % 9) + 1}`;
    patient.cardio.echoStudies.push({ date, fevi: 10 + i, itVmax: 1, vciMm: 10, pad: 5, psap: 20, tapse: 1, tapsePsap: 0.2 });
    patient.cardio.labSnapshots.push(
      Object.assign(emptyLabSnapshot(), {
        date,
        values: Object.assign(emptyLabSnapshot().values, { cr: 1, na: 140, k: 4, bilTotal: 0.5, ntProBnp: 100 }),
      }),
    );
    patient.cardio.consultas.push(
      Object.assign(emptyConsultaEntry(), { date, contacto: 'Teléfono', ta: 100 + i, scoreTmo: 1 }),
    );
  }

  const { row: wideRow } = buildIcRegistryRow(patient);
  const nonEmptyWideCount = wideRow.filter((v) => v !== '').length;

  const { pacienteRow, visitRows } = buildIcRegistryLongRowsForPatient(patient);
  const nonEmptyLongCount =
    pacienteRow.slice(1).filter((v) => v !== '').length + // drop synthetic ID column
    visitRows.reduce((sum, r) => sum + r.slice(3).filter((v) => v !== '').length, 0); // drop ID/Registro/Visita

  assert.equal(
    nonEmptyLongCount,
    nonEmptyWideCount,
    'every non-empty wide cell must reappear exactly once in Pacientes+Visitas',
  );
});
