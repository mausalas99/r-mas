import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatFasesDosisMaximo,
  resolveVexusIngreso,
  resolveDispositivoLabel,
  resolveNyhaActual,
  resolveNtProBnpUltimo,
  rowsToTsv,
  buildSeguimientoCohortRow,
  SEGUIMIENTO_COHORT_HEADERS,
} from './seguimiento-sheets.mjs';

test('formatFasesDosisMaximo lists diuretic phases with max daily mg', () => {
  const s = formatFasesDosisMaximo([
    { tipo: 'Furosemida', inicio: '2026-03-13', dosis: '80 mg IV cada 12h', endedAt: '2026-03-16' },
    { tipo: 'Furosemida', inicio: '2026-03-17', dosis: '40 mg VO cada 12h' },
  ]);
  assert.match(s, /Fase 1/);
  assert.match(s, /160 mg\/d/);
  assert.match(s, /Fase 2/);
});

test('resolveVexusIngreso prefers explicit field then ingreso POCUS', () => {
  const cardio = {
    vexusIngreso: null,
    pocusByDay: [{ date: '2026-03-13', vexus: 2 }],
  };
  assert.equal(resolveVexusIngreso({ vexusIngreso: 1 }, '2026-03-13'), 1);
  assert.equal(resolveVexusIngreso(cardio, '2026-03-13'), 2);
});

test('buildSeguimientoCohortRow includes required columns', () => {
  const patient = {
    id: 'p1',
    nombre: 'Test Patient',
    registro: 'REG1',
    fimiFecha: '2026-03-13',
    cardio: {
      inicioDescongestion: '2026-03-13',
      vexusIngreso: 2,
      dosisInicialDiuretico: 'Furosemida 80 mg IV DU',
      seguimientoHospitalizacion: 'En descongestión',
      seguimientoConsulta: 'Cita IC en 7 días',
      overrides: {},
      pocusByDay: [{ date: '2026-03-13', vexus: 2 }],
      diureticSegments: [
        { tipo: 'Furosemida', inicio: '2026-03-13', dosis: '80 mg cada 12h', mgTotal: 480 },
      ],
      medSegments: [],
      fantasticos: [],
      medCatalog: [],
    },
    monitoreo: {
      historial: [
        {
          recordedAt: '2026-03-13T12:00:00.000Z',
          io: { ing: 2000, egr: 1500 },
        },
      ],
    },
  };
  const row = buildSeguimientoCohortRow(patient, { asOfDate: '2026-03-15' });
  assert.equal(row.length, SEGUIMIENTO_COHORT_HEADERS.length);
  assert.equal(row[0], 'En descongestión');
  assert.equal(row[1], 'Cita IC en 7 días');
  assert.equal(row[2], 2);
  assert.equal(row[3], 'Furosemida 80 mg IV DU');
  assert.equal(row[4], 500);
  assert.equal(row[7], 'Test Patient');
});

test('Part C, Phase 7: cohort row appends Dispositivo/NYHA actual/NT-proBNP último, in sync with the Resumen chips', () => {
  const patient = {
    id: 'p1',
    nombre: 'Test Patient',
    cardio: {
      overrides: {},
      pocusByDay: [],
      diureticSegments: [],
      device: { colocado: true, tipo: 'TRC-D' },
      scores: [{ date: '2026-03-14', nyha: 'III' }],
    },
    monitoreo: { historial: [] },
  };
  const labs = [{ at: '2026-03-14', valores: { ntprobnp: 1800 } }];
  const row = buildSeguimientoCohortRow(patient, { asOfDate: '2026-03-15', labHistory: labs });
  const idx = SEGUIMIENTO_COHORT_HEADERS.length - 3;
  assert.equal(SEGUIMIENTO_COHORT_HEADERS[idx], 'Dispositivo');
  assert.equal(row[idx], 'TRC-D');
  assert.equal(SEGUIMIENTO_COHORT_HEADERS[idx + 1], 'NYHA actual');
  assert.equal(row[idx + 1], 'III');
  assert.equal(SEGUIMIENTO_COHORT_HEADERS[idx + 2], 'NT-proBNP último');
  assert.equal(row[idx + 2], 1800);
});

test('resolveDispositivoLabel / resolveNyhaActual / resolveNtProBnpUltimo defaults', () => {
  assert.equal(resolveDispositivoLabel({}), '');
  assert.equal(resolveDispositivoLabel({ device: { tieneIndicacion: true, colocado: false } }), 'Indicado, no colocado');
  assert.equal(resolveNyhaActual({}), '');
  assert.equal(resolveNtProBnpUltimo([]), '');
});

test('rowsToTsv escapes tabs and quotes', () => {
  const tsv = rowsToTsv(['A', 'B'], [['x', 'line with\ttab']]);
  assert.match(tsv, /"line with\ttab"/);
});
