import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPatientSheets } from './patient-tables.mjs';

test('labs: one row per result line, patient name added, set fields repeated', () => {
  const sheets = buildPatientSheets({
    patients: [{ id: 'p1', nombre: 'Ana' }],
    labHistory: { p1: [{ fecha: '20/09/2026', hora: '07:10', resLabs: ['QS Cr 1.3', '', 'Hb 12'] }] },
  });
  const labs = sheets.find((s) => s.name === 'Labs');
  assert.deepEqual(labs.columns.map((c) => c.header), ['ID paciente', 'Paciente', 'fecha', 'hora', 'resultado']);
  assert.equal(labs.rows.length, 2);
  assert.deepEqual(labs.rows[1], ['p1', 'Ana', '20/09/2026', '07:10', 'Hb 12']);
});

test('empty columns are dropped; nested keys read "a / b"', () => {
  const sheets = buildPatientSheets({
    patients: [{ id: 'p1', nombre: 'Ana', vacio: '', monitoreo: { estado: { four: 2 } } }],
  });
  const pac = sheets[0];
  assert.equal(pac.name, 'Pacientes');
  assert.deepEqual(pac.columns.map((c) => c.header), ['id', 'nombre', 'monitoreo / estado / four']);
});

test('settings and med catalog produce no sheet', () => {
  const sheets = buildPatientSheets({
    settings: { theme: 'x' },
    medCatalog: [{ name: 'x' }],
    notes: {},
  });
  assert.deepEqual(sheets, []);
});
