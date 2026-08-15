import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ensurePatientDiagnosticos,
  diagnosticosTextForCenso,
  migratePatientDiagnosticosFromVpo,
  mergeCensoPatientFields,
  preloadNoteDxFromPatient,
  syncNoteDxFromPatient,
  ensureNoteDxFromPatientForExport,
  stampCensoFieldsClock,
} from './patient-diagnosticos.mjs';

test('ensurePatientDiagnosticos normaliza list y text', () => {
  var p = { diagnosticosList: ['dm2', ''] };
  ensurePatientDiagnosticos(p);
  assert.deepEqual(p.diagnosticosList, ['DM2', '']);
  assert.ok(p.diagnosticosText.includes('DM2'));
});

test('diagnosticosTextForCenso une con +', () => {
  var t = diagnosticosTextForCenso(['A', 'B']);
  assert.equal(t, 'A + B');
});

test('diagnosticosTextForCenso máximo 3 primeros', () => {
  var t = diagnosticosTextForCenso(['A', 'B', 'C', 'D', 'E']);
  assert.equal(t, 'A + B + C');
});

test('migratePatientDiagnosticosFromVpo solo si paciente vacío', () => {
  var p = { diagnosticosList: [] };
  var vpo = { diagnosticosList: ['IRC'] };
  assert.equal(migratePatientDiagnosticosFromVpo(p, vpo), true);
  assert.equal(p.diagnosticosList[0], 'IRC');
  p.diagnosticosList = ['X'];
  assert.equal(migratePatientDiagnosticosFromVpo(p, vpo), false);
});

test('mergeCensoPatientFields no sobrescribe dx reales con lista vacía', () => {
  var target = {
    diagnosticosList: ['DM2', ''],
    diagnosticosText: '1. DM2',
    censoMedsText: 'ATB',
  };
  mergeCensoPatientFields(target, { diagnosticosList: [''], censoMedsText: '' });
  assert.deepEqual(
    (target.diagnosticosList || []).filter(Boolean),
    ['DM2']
  );
  assert.equal(target.censoMedsText, 'ATB');
});

test('mergeCensoPatientFields toma dx no vacíos del source', () => {
  var target = { diagnosticosList: [''], diagnosticosText: '' };
  mergeCensoPatientFields(target, {
    diagnosticosList: ['IRC', ''],
    diagnosticosText: '1. IRC',
    censoMedsText: 'PIP/TAZO',
  });
  assert.deepEqual(
    (target.diagnosticosList || []).filter(Boolean),
    ['IRC']
  );
  assert.equal(target.censoMedsText, 'PIP/TAZO');
});

test('mergeCensoPatientFields keepLocalWhenPresent conserva dx locales más nuevos', () => {
  var target = {
    diagnosticosList: ['CHOQUE SÉPTICO', ''],
    diagnosticosText: '1. CHOQUE SÉPTICO',
    censoMedsText: 'MEROPENEM',
  };
  mergeCensoPatientFields(
    target,
    { diagnosticosList: ['NAC', ''], diagnosticosText: '1. NAC', censoMedsText: 'CEFTRIAXONA' },
    { keepLocalWhenPresent: true }
  );
  assert.deepEqual((target.diagnosticosList || []).filter(Boolean), ['CHOQUE SÉPTICO']);
  assert.equal(target.censoMedsText, 'MEROPENEM');
});

test('mergeCensoPatientFields keepLocalWhenPresent llena dx locales vacíos', () => {
  var target = { diagnosticosList: [''], diagnosticosText: '', censoMedsText: '' };
  mergeCensoPatientFields(
    target,
    { diagnosticosList: ['NAC', ''], diagnosticosText: '1. NAC', censoMedsText: 'CEFTRIAXONA' },
    { keepLocalWhenPresent: true }
  );
  assert.deepEqual((target.diagnosticosList || []).filter(Boolean), ['NAC']);
  assert.equal(target.censoMedsText, 'CEFTRIAXONA');
});

test('stampCensoFieldsClock marca lanUpdatedAt para el push de fields', () => {
  var patient = { id: 'p1', lanUpdatedAt: '2026-08-14T10:00:00.000Z' };
  stampCensoFieldsClock(patient, '2026-08-14T11:00:00.000Z');
  assert.equal(patient.lanUpdatedAt, '2026-08-14T11:00:00.000Z');
  stampCensoFieldsClock(patient);
  assert.ok(patient.lanUpdatedAt > '2026-08-14T11:00:00.000Z');
});

test('los editores de censo marcan el reloj antes de persistir', () => {
  var text = readFileSync(
    fileURLToPath(new URL('./patient-data-censo-ui.mjs', import.meta.url)),
    'utf8'
  );
  var handlers = [
    'onPatientDxInput',
    'addPatientDxRow',
    'removePatientDxRow',
    'splitPatientDxPaste',
    'updatePatientCensoMeds',
    'censoTomarDeMedicamentos',
  ];
  for (var i = 0; i < handlers.length; i += 1) {
    var start = text.indexOf('export function ' + handlers[i]);
    assert.ok(start > 0, handlers[i] + ' no encontrado');
    var body = text.slice(start, text.indexOf('\n}', start));
    assert.match(body, /stampCensoFieldsClock\(patient\)/, handlers[i] + ' sin reloj');
  }
});

test('preloadNoteDxFromPatient solo si nota vacía', () => {
  var patient = { diagnosticosList: ['NAC', 'DM2'] };
  var note = { diagnosticos: [''] };
  assert.equal(preloadNoteDxFromPatient(note, patient), true);
  assert.deepEqual(note.diagnosticos, ['NAC', 'DM2']);
  note.diagnosticos = ['OTRO'];
  assert.equal(preloadNoteDxFromPatient(note, patient), false);
  assert.deepEqual(note.diagnosticos, ['OTRO']);
});

test('syncNoteDxFromPatient replace trae dx del censo', () => {
  var patient = { diagnosticosList: ['IRC'] };
  var note = { diagnosticos: ['VIEJO'] };
  assert.equal(syncNoteDxFromPatient(note, patient, { mode: 'replace' }), true);
  assert.deepEqual(note.diagnosticos, ['IRC']);
});

test('ensureNoteDxFromPatientForExport rellena nota vacía para Word', () => {
  var patient = { diagnosticosList: ['NAC'] };
  var note = { diagnosticos: ['', ''] };
  assert.equal(ensureNoteDxFromPatientForExport(note, patient), true);
  assert.deepEqual(note.diagnosticos, ['NAC']);
});
