import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ensurePatientDiagnosticos,
  diagnosticosTextForCenso,
  migratePatientDiagnosticosFromVpo,
  mergeCensoPatientFields,
  preloadNoteDxFromPatient,
  syncNoteDxFromPatient,
  ensureNoteDxFromPatientForExport,
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
