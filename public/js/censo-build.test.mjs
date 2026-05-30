import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sortPatientsForCensus,
  formatCensusMonthLabel,
  formatCensusDateLabel,
  truncateCensusCell,
  buildCensusPayload,
  formatPacienteMetaForCenso,
  formatCamaCellForCenso,
} from './censo-build.mjs';

test('formatCamaCellForCenso cuarto y cama en líneas', () => {
  assert.equal(formatCamaCellForCenso({ cuarto: '201', cama: '0' }), '201\n0');
  assert.equal(formatCamaCellForCenso({ cuarto: '305', cama: '' }), '305');
});

test('formatPacienteMetaForCenso líneas sin sexo', () => {
  assert.equal(
    formatPacienteMetaForCenso({ registro: '123', edad: '54', sexo: 'M' }),
    '123\n54 años'
  );
});

test('sortPatientsForCensus ordena por cuarto', () => {
  var sorted = sortPatientsForCensus([
    { id: 'b', nombre: 'B', cuarto: '305', cama: '1' },
    { id: 'a', nombre: 'A', cuarto: '201', cama: '2' },
  ]);
  assert.equal(sorted[0].id, 'a');
});

test('formatCensusMonthLabel español', () => {
  var label = formatCensusMonthLabel(new Date(2026, 4, 29));
  assert.match(label, /MAYO\s+2026/i);
});

test('truncateCensusCell añade elipsis', () => {
  assert.equal(truncateCensusCell('abcdef', 4), 'abc…');
});

test('buildCensusPayload usa censoMedsText y dx del paciente', () => {
  var payload = buildCensusPayload({
    settings: {
      profesorName: 'Dr. P',
      residenteR2: 'R2 X',
      residenteR1a: 'R1 A',
      defaultServicio: 'ONCO',
      censoSala: '1',
    },
    patients: [
      {
        id: '1',
        nombre: 'TEST',
        registro: '123',
        edad: '50',
        sexo: 'M',
        cuarto: '201',
        cama: '1',
        archived: false,
        diagnosticosList: ['DM2'],
        censoMedsText: 'MEROPENEM · Día 2',
      },
    ],
    includeArchived: false,
    labHistoryByPatient: { 1: [] },
    medRecetaByPatient: {},
    todosByPatient: { 1: [{ text: 'BH mañana', completed: false }] },
    now: new Date(2026, 4, 29),
  });
  assert.equal(payload.rows.length, 1);
  var sections = payload.rows[0].sections || [];
  var dx = sections.find((s) => s.label === 'Diagnósticos');
  var meds = sections.find((s) => s.label === 'ATB / Medicamentos');
  var pend = sections.find((s) => s.label === 'Pendientes');
  assert.match(dx.lines.join(' '), /DM2/);
  assert.match(meds.lines.join(' '), /MEROPENEM/);
  assert.match(pend.lines.join(' '), /BH/i);
  assert.equal(payload.header.r2, 'R2 X');
  assert.equal(payload.header.titleLine, 'Censo de Sala 1');
  assert.match(payload.header.equipoLine, /R2 X/);
  assert.match(payload.header.equipoLine, /Dr\. P/);
  assert.doesNotMatch(payload.header.equipoLine, /R2:/);
});

test('buildCensusPayload accesos múltiples en celda', () => {
  var payload = buildCensusPayload({
    settings: {},
    patients: [
      {
        id: '1',
        nombre: 'T',
        archived: false,
        accesosList: [
          { via: 'cvc', fecha: '2026-05-01' },
          { via: 'picc', fecha: '2026-05-12' },
        ],
      },
    ],
    includeArchived: false,
    labHistoryByPatient: { 1: [] },
    medRecetaByPatient: {},
    todosByPatient: { 1: [] },
  });
  var acc = (payload.rows[0].sections || []).find((s) => s.label === 'Accesos');
  assert.ok(acc);
  var joined = acc.lines.join('\n');
  assert.match(joined, /CVC/);
  assert.match(joined, /PICC/);
});

test('buildCensusPayload fallback meds desde receta', () => {
  var payload = buildCensusPayload({
    settings: {},
    patients: [{ id: '1', nombre: 'T', archived: false, diagnosticosList: ['X'] }],
    includeArchived: false,
    labHistoryByPatient: { 1: [] },
    medRecetaByPatient: {
      1: {
        items: [
          {
            nombreRaw: 'Vancomicina 1g',
            viaRaw: 'IV',
            frecuenciaRaw: 'c/12h',
            diaTratamiento: 1,
            suspendido: false,
          },
        ],
      },
    },
    todosByPatient: { 1: [] },
  });
  var medSec = (payload.rows[0].sections || []).find((s) => s.label === 'ATB / Medicamentos');
  assert.match(medSec.lines.join(' '), /VANCOMICINA/i);
});
