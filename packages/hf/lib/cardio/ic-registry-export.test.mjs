import test from 'node:test';
import assert from 'node:assert/strict';
import { IC_REGISTRY_HEADERS } from './ic-registry-headers.mjs';
import { emptyCardio } from './patient-cardio.mjs';
import { emptyConsultaEntry } from './consulta-seguimiento.mjs';
import { emptyLabSnapshot } from './hf-labs.mjs';
import {
  tagColumnsByVisit,
  buildIcRegistryRow,
  buildIcRegistryRows,
  rowsToCsv,
  causaReingresoCode,
  causaMuerteCode,
  boolCode,
} from './ic-registry-export.mjs';

test('IC_REGISTRY_HEADERS has exactly 1708 columns', () => {
  assert.equal(IC_REGISTRY_HEADERS.length, 1708);
});

test('tagColumnsByVisit bumps on every ECO N cita marker and finds 20 blocks', () => {
  const tags = tagColumnsByVisit(IC_REGISTRY_HEADERS);
  assert.equal(tags.length, IC_REGISTRY_HEADERS.length);
  assert.equal(tags[0], 0);
  const ecoStart = IC_REGISTRY_HEADERS.findIndex((h) => /^ECO\s+1\s*cita/i.test(h));
  assert.equal(tags[ecoStart - 1], 0);
  assert.equal(tags[ecoStart], 1);
  assert.equal(Math.max(...tags), 20);
});

test('boolCode/causaReingresoCode/causaMuerteCode translate to numeric strings', () => {
  assert.equal(boolCode(true), '1');
  assert.equal(boolCode(false), '0');
  assert.equal(boolCode(null), '');
  assert.equal(causaReingresoCode('Congestión'), '0');
  assert.equal(causaReingresoCode('Bajo gasto'), '1');
  assert.equal(causaReingresoCode('SICA'), '5');
  assert.equal(causaReingresoCode('Otros'), '7');
  assert.equal(causaReingresoCode('No existe'), '');
  assert.equal(causaMuerteCode('Insuficiencia cardiaca'), '0');
  assert.equal(causaMuerteCode('Otras causas'), '2');
});

function fixturePatient() {
  const cardio = emptyCardio();
  cardio.evaluacionInicial.fecha = '2026-01-01';
  cardio.evaluacionInicial.labsIngreso.ntProBnp = 5000;
  cardio.echoStudies = [
    {
      date: '2026-01-02',
      fevi: 30,
      itVmax: 1.1,
      vciMm: 22,
      vciColapso: '<50%',
      pad: 15,
      psap: 45,
      tapse: 1.4,
      tapsePsap: 0.31,
      sVd: 9,
      vexus: '2',
      septumIvd: 1.1,
      ppvid: 1.0,
      gpr: 0.3,
      volAiIndex: 34,
      vfdvi: 180,
      vfsvi: 130,
      jvValsalva: 20,
      jvEspiracion: 10,
      jvdRatio: 2,
      gradienteReversoVt: 5,
      feviRecuperada: false,
    },
    {
      date: '2026-02-15',
      fevi: 40,
      itVmax: 1.3,
      vciMm: 18,
      pad: 10,
      psap: 35,
      tapse: 1.7,
      tapsePsap: 0.48,
      sVd: 11,
      vexus: '0',
      jvdRatio: 5,
      feviRecuperada: true,
    },
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
  return {
    id: 'pt-1',
    nombre: 'Paciente Prueba',
    registro: 'REG-1',
    edad: 62,
    fimiFecha: '2026-01-01',
    cardio,
  };
}

function headerIndexWithinVisit(tags, visitIndex, header) {
  for (let i = 0; i < IC_REGISTRY_HEADERS.length; i += 1) {
    if (tags[i] === visitIndex && IC_REGISTRY_HEADERS[i] === header) return i;
  }
  return -1;
}

test('per-visit FEVI/labs resolve from date-matched echo/labSnapshot, by header lookup not hardcoded index', () => {
  const patient = fixturePatient();
  const { row } = buildIcRegistryRow(patient);
  const tags = tagColumnsByVisit(IC_REGISTRY_HEADERS);

  const feviV1 = headerIndexWithinVisit(tags, 1, 'FEVI ');
  const feviV2 = headerIndexWithinVisit(tags, 2, 'FEVI ');
  assert.equal(row[feviV1], '30');
  assert.equal(row[feviV2], '40');

  const creatV1 = headerIndexWithinVisit(tags, 1, 'Creat');
  assert.equal(row[creatV1], '1.2');

  const reingresoV2 = headerIndexWithinVisit(tags, 2, 'Reingreso hospitalario (0 = no, 1 = 0)');
  assert.equal(row[reingresoV2], '1');
  const causaV2 = headerIndexWithinVisit(
    tags,
    2,
    'Causa del reingreso (0 = Congrestión, 1 = bajo gasto, 2 = Congestión + bajo gasto, 3 = Infección, 4 = Arritmia, 5 = SICA, 6 = programado)',
  );
  assert.equal(row[causaV2], '4');
});

test('baseline Nombre/Registro/Años/FEVI BASAL resolve by header lookup', () => {
  const patient = fixturePatient();
  const { row } = buildIcRegistryRow(patient);
  assert.equal(row[IC_REGISTRY_HEADERS.indexOf('Nombre ')], 'Paciente Prueba');
  assert.equal(row[IC_REGISTRY_HEADERS.indexOf('Registro')], 'REG-1');
  assert.equal(row[IC_REGISTRY_HEADERS.indexOf('Años')], '62');
  assert.equal(row[IC_REGISTRY_HEADERS.indexOf('FEVI BASAL')], '30');
});

test('a visit whose date has no matching echo/labs leaves that visit blank, without leaking a neighbor visit value', () => {
  const patient = fixturePatient();
  patient.cardio.consultas.push(
    Object.assign(emptyConsultaEntry(), {
      date: '2026-03-20',
      contacto: '',
      ta: null,
      reingresoHospitalario: null,
      causaReingreso: '',
      muerte: null,
      scoreTmo: null,
      dosisTitulada: { bb: '', iecaAraArni: '', arm: '', isglt2: '' },
      bbArniArmSglt2DosisMaxima: null,
      tiempoImplementacionSemanas: null,
      implementacionCompleta: null,
      malApego: null,
      gdmtMaxTolerada: { ieca_ara: null, arni: null, sglt2: null, arm: null, bb: null, asa: null },
    }),
  );
  const { row } = buildIcRegistryRow(patient);
  const tags = tagColumnsByVisit(IC_REGISTRY_HEADERS);
  const feviV3 = headerIndexWithinVisit(tags, 3, 'FEVI ');
  const vciV3 = headerIndexWithinVisit(tags, 3, 'vena cava');
  const creatV3 = headerIndexWithinVisit(tags, 3, 'Creat');
  assert.equal(row[feviV3], '');
  assert.equal(row[vciV3], '');
  assert.equal(row[creatV3], '');

  const feviV2 = headerIndexWithinVisit(tags, 2, 'FEVI ');
  assert.equal(row[feviV2], '40', 'visit 2 value must be untouched by visit 3 having no echo match');
});

test('more consultas than visit-blocks are dropped and reported via truncatedVisits', () => {
  const patient = fixturePatient();
  const base = new Date('2026-04-01T00:00:00Z');
  for (let i = 0; i < 25; i += 1) {
    const d = new Date(base.getTime() + i * 86400000);
    patient.cardio.consultas.push(
      Object.assign(emptyConsultaEntry(), {
        date: d.toISOString().slice(0, 10),
        contacto: '',
        ta: null,
        reingresoHospitalario: null,
        causaReingreso: '',
        muerte: null,
        scoreTmo: null,
        dosisTitulada: { bb: '', iecaAraArni: '', arm: '', isglt2: '' },
        bbArniArmSglt2DosisMaxima: null,
        tiempoImplementacionSemanas: null,
        implementacionCompleta: null,
        malApego: null,
        gdmtMaxTolerada: { ieca_ara: null, arni: null, sglt2: null, arm: null, bb: null, asa: null },
      }),
    );
  }
  const { row, truncatedVisits } = buildIcRegistryRow(patient);
  assert.equal(row.length, IC_REGISTRY_HEADERS.length);
  assert.equal(truncatedVisits, 27 - 20);

  const { truncatedByPatient } = buildIcRegistryRows([patient]);
  assert.equal(truncatedByPatient[patient.id], 7);
});

test('TA column passes through legacy numeric and new "sistólica/diastólica" string values as-is', () => {
  const patient = fixturePatient();
  // Legacy numeric fixtures (visits 1/2, from `fixturePatient()`) stay
  // untouched; this pushes a third consulta with the new split-string shape
  // ("120/80") — TA is stored as a single string field, only its shape
  // changed (see consulta-ic-html.mjs's TA sistólica/diastólica inputs).
  patient.cardio.consultas.push(
    Object.assign(emptyConsultaEntry(), {
      date: '2026-03-20',
      ta: '120/80',
    }),
  );
  const { row } = buildIcRegistryRow(patient);
  const tags = tagColumnsByVisit(IC_REGISTRY_HEADERS);
  assert.equal(row[headerIndexWithinVisit(tags, 1, 'TA')], '95');
  assert.equal(row[headerIndexWithinVisit(tags, 2, 'TA')], '110');
  assert.equal(row[headerIndexWithinVisit(tags, 3, 'TA')], '120/80');
});

test('rowsToCsv quotes cells with commas and doubles embedded quotes', () => {
  const csv = rowsToCsv(['A', 'B'], [['x,y', 'has "quote"']]);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'A,B');
  assert.equal(lines[1], '"x,y","has ""quote"""');
});
