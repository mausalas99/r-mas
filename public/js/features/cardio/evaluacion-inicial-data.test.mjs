import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyEvaluacionInicial } from '../../../../lib/cardio/evaluacion-inicial.mjs';
import {
  withTopLevelFieldChange,
  withSectionFieldChange,
  withUsPulmonarCampoChange,
  withUsPulmonarNotaChange,
  withRxToraxNotaChange,
  withRxToraxHallazgoToggle,
  buildCongestionSyncRecord,
  parseTriState,
  findNearestLabSetForDate,
  withLabsIngresoAutofill,
} from './evaluacion-inicial-data.mjs';

test('parseTriState maps the DOM string values to boolean|null', () => {
  assert.equal(parseTriState('true'), true);
  assert.equal(parseTriState('false'), false);
  assert.equal(parseTriState(''), null);
});

test('withTopLevelFieldChange writes a string field and reports changed', () => {
  var e = emptyEvaluacionInicial();
  var result = withTopLevelFieldChange(e, 'motivoConsulta', 'Disnea progresiva');
  assert.equal(result.changed, true);
  assert.equal(result.evaluacionInicial.motivoConsulta, 'Disnea progresiva');
  assert.notEqual(result.evaluacionInicial, e, 'must not mutate the input object');
});

test('withTopLevelFieldChange parses a numeric field to Number or null', () => {
  var e = emptyEvaluacionInicial();
  var result = withTopLevelFieldChange(e, 'ultimaFevi', '35');
  assert.equal(result.evaluacionInicial.ultimaFevi, 35);
  var cleared = withTopLevelFieldChange(result.evaluacionInicial, 'ultimaFevi', '');
  assert.equal(cleared.evaluacionInicial.ultimaFevi, null);
});

test('withTopLevelFieldChange parses a tri-state field to boolean|null', () => {
  var e = emptyEvaluacionInicial();
  var result = withTopLevelFieldChange(e, 'historiaIcPrevia', 'true');
  assert.equal(result.evaluacionInicial.historiaIcPrevia, true);
});

test('withTopLevelFieldChange reports changed:false when the value is unchanged', () => {
  var e = emptyEvaluacionInicial();
  var result = withTopLevelFieldChange(e, 'motivoConsulta', '');
  assert.equal(result.changed, false);
});

test('withSectionFieldChange updates a sub-object field without touching siblings', () => {
  var e = emptyEvaluacionInicial();
  var result = withSectionFieldChange(e, 'exploracion', 'ta', '120/80');
  assert.equal(result.evaluacionInicial.exploracion.ta, '120/80');
  assert.equal(result.evaluacionInicial.exploracion.fc, null);
  assert.notEqual(result.evaluacionInicial.exploracion, e.exploracion);
});

test('withSectionFieldChange parses tratamientoPrevio tri-state keys', () => {
  var e = emptyEvaluacionInicial();
  var result = withSectionFieldChange(e, 'tratamientoPrevio', 'arni', 'true');
  assert.equal(result.evaluacionInicial.tratamientoPrevio.arni, true);
});

test('withSectionFieldChange parses labsIngreso numeric keys', () => {
  var e = emptyEvaluacionInicial();
  var result = withSectionFieldChange(e, 'labsIngreso', 'na', '138');
  assert.equal(result.evaluacionInicial.labsIngreso.na, 138);
});

test('withUsPulmonarCampoChange updates one campo by index without touching the others', () => {
  var e = emptyEvaluacionInicial();
  var result = withUsPulmonarCampoChange(e, 2, 'lineasB', '1-2');
  assert.equal(result.evaluacionInicial.usPulmonar.campos[2].lineasB, '1-2');
  assert.equal(result.evaluacionInicial.usPulmonar.campos[0].lineasB, '');
  assert.equal(result.evaluacionInicial.usPulmonar.campos.length, 8);
});

test('withUsPulmonarCampoChange parses derrame/consolidacion as tri-state', () => {
  var e = emptyEvaluacionInicial();
  var result = withUsPulmonarCampoChange(e, 0, 'derrame', 'true');
  assert.equal(result.evaluacionInicial.usPulmonar.campos[0].derrame, true);
});

test('withUsPulmonarNotaChange updates the note without touching campos', () => {
  var e = emptyEvaluacionInicial();
  var result = withUsPulmonarNotaChange(e, 'Líneas B bibasales');
  assert.equal(result.evaluacionInicial.usPulmonar.nota, 'Líneas B bibasales');
});

test('withRxToraxHallazgoToggle adds and removes a finding from the array', () => {
  var e = emptyEvaluacionInicial();
  var checked = withRxToraxHallazgoToggle(e, 'Cardiomegalia', true);
  assert.deepEqual(checked.evaluacionInicial.rxTorax.hallazgos, ['Cardiomegalia']);
  var unchecked = withRxToraxHallazgoToggle(checked.evaluacionInicial, 'Cardiomegalia', false);
  assert.deepEqual(unchecked.evaluacionInicial.rxTorax.hallazgos, []);
});

test('withRxToraxNotaChange updates the note without touching hallazgos', () => {
  var e = emptyEvaluacionInicial();
  var withHallazgo = withRxToraxHallazgoToggle(e, 'Normal', true).evaluacionInicial;
  var result = withRxToraxNotaChange(withHallazgo, 'Sin infiltrados');
  assert.equal(result.evaluacionInicial.rxTorax.nota, 'Sin infiltrados');
  assert.deepEqual(result.evaluacionInicial.rxTorax.hallazgos, ['Normal']);
});

test('buildCongestionSyncRecord maps vexusInicial + fecha to an upsertPocusDay record', () => {
  var e = emptyEvaluacionInicial();
  e.fecha = '2026-08-22';
  e.vexusInicial.vciMm = 22;
  e.vexusInicial.vciColapso = '<50%';
  e.vexusInicial.grado = '2';
  var record = buildCongestionSyncRecord(e);
  assert.deepEqual(record, { date: '2026-08-22', vciCm: 22, vciCollapse: '<50%', vexus: '2' });
});

test('buildCongestionSyncRecord returns an empty date when fecha is blank', () => {
  var record = buildCongestionSyncRecord(emptyEvaluacionInicial());
  assert.equal(record.date, '');
});

test('findNearestLabSetForDate picks the newest set on or before the target date', () => {
  var history = [
    { fecha: 'Aug 20 2026', hora: '08:00', parsedBySection: { ESC: { Na: 138 } } },
    { fecha: 'Aug 22 2026', hora: '08:00', parsedBySection: { ESC: { Na: 140 } } },
  ];
  var set = findNearestLabSetForDate(history, '2026-08-21');
  assert.equal(set.fecha, 'Aug 20 2026');
});

test('findNearestLabSetForDate returns null when every set is after the target date', () => {
  var history = [{ fecha: 'Aug 22 2026', hora: '08:00', parsedBySection: {} }];
  assert.equal(findNearestLabSetForDate(history, '2026-08-21'), null);
});

test('withLabsIngresoAutofill fills labsIngreso keys from the lab set and stamps fecha', () => {
  var e = emptyEvaluacionInicial();
  var set = {
    fecha: 'Aug 20 2026',
    hora: '08:00',
    parsedBySection: { ESC: { Na: '138', K: '4.1' }, GASES: { pH: '7.35' } },
  };
  var next = withLabsIngresoAutofill(e, '2026-08-20', set).labsIngreso;
  assert.equal(next.fecha, '2026-08-20');
  assert.equal(next.na, 138);
  assert.equal(next.k, 4.1);
  assert.equal(next.ph, 7.35);
  assert.equal(next.creat, null);
});

test('withLabsIngresoAutofill clears values when no set is found', () => {
  var e = emptyEvaluacionInicial();
  e.labsIngreso.na = 138;
  var next = withLabsIngresoAutofill(e, '2026-08-20', null).labsIngreso;
  assert.equal(next.na, null);
  assert.equal(next.fecha, '2026-08-20');
});
