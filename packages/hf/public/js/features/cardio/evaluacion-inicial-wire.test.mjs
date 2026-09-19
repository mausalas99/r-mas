import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setPatients, getPatients } from '../../app-state.mjs';
import { rt } from '../app-tabs-runtime.mjs';
import { renderEvaluacionInicialPanel, syncEvaluacionInicialToPocusDay } from './evaluacion-inicial-wire.mjs';

function seedPatient(id, cardio) {
  setPatients([{ id: id, cardio: cardio }]);
  rt.getActiveId = function () {
    return id;
  };
}

function fire(el, type) {
  el.dispatchEvent(new Event(type, { bubbles: true }));
}

function goNext(mount) {
  fire(mount.querySelector('[data-hf-ei-step-action="next"]'), 'click');
}

function goBack(mount) {
  fire(mount.querySelector('[data-hf-ei-step-action="back"]'), 'click');
}

function jumpTo(mount, step) {
  fire(mount.querySelector('[data-hf-ei-step-jump="' + step + '"]'), 'click');
}

test('renderEvaluacionInicialPanel shows a placeholder when no patient is active', () => {
  if (typeof document === 'undefined') return;
  seedPatient(null, undefined);
  rt.getActiveId = function () {
    return null;
  };
  var mount = document.createElement('div');
  renderEvaluacionInicialPanel(mount);
  assert.match(mount.innerHTML, /Selecciona un paciente/);
});

test('renderEvaluacionInicialPanel backfills cardio.evaluacionInicial and renders step 1 (Identificación) by default', () => {
  if (typeof document === 'undefined') return;
  seedPatient('p1', undefined);
  var mount = document.createElement('div');
  renderEvaluacionInicialPanel(mount);
  var patient = getPatients()[0];
  assert.ok(patient.cardio);
  assert.ok(patient.cardio.evaluacionInicial);
  assert.equal(Array.isArray(patient.cardio.evaluacionInicial.medicamentosPrevios), true);
  assert.match(mount.innerHTML, /Paso 1 de 5/);
  assert.ok(mount.querySelector('[data-hf-ei="motivoConsulta"]'));
  assert.equal(mount.querySelector('[data-hf-ei-step-action="back"]'), null);
});

test('Siguiente/Atrás move between steps and each step only wires its own fields', () => {
  if (typeof document === 'undefined') return;
  seedPatient('p1b', undefined);
  var mount = document.createElement('div');
  renderEvaluacionInicialPanel(mount);
  assert.match(mount.innerHTML, /Paso 1 de 5/);
  assert.ok(mount.querySelector('[data-hf-ei="motivoConsulta"]'));

  goNext(mount);
  assert.match(mount.innerHTML, /Paso 2 de 5/);
  assert.equal(mount.querySelector('[data-hf-ei="motivoConsulta"]'), null);
  assert.ok(mount.querySelector('[data-hf-ei-trat="ieca_ara"]'));

  goNext(mount);
  assert.match(mount.innerHTML, /Paso 3 de 5/);
  assert.ok(mount.querySelector('[data-hf-ei-vexus="vciMm"]'));

  goBack(mount);
  assert.match(mount.innerHTML, /Paso 2 de 5/);

  goBack(mount);
  assert.match(mount.innerHTML, /Paso 1 de 5/);
  assert.equal(mount.querySelector('[data-hf-ei-step-action="back"]'), null);
});

test('clicking a step pill jumps directly to that step, skipping intermediate ones, with existing data intact', () => {
  if (typeof document === 'undefined') return;
  seedPatient('p1c', undefined);
  var mount = document.createElement('div');
  renderEvaluacionInicialPanel(mount);
  var patient = getPatients()[0];

  // Data entered on step 0 (Identificación) should survive a jump away and back.
  var residenteEl = mount.querySelector('[data-hf-ei="residente"]');
  residenteEl.value = 'Dra. Pérez';
  fire(residenteEl, 'input');

  // Jump straight from step 0 to step 4 (FEVI y labs), skipping steps 1-3.
  jumpTo(mount, 4);
  assert.match(mount.innerHTML, /Paso 5 de 6/);
  assert.ok(mount.querySelector('[data-hf-ei="feviEstimadaInicial"]'));
  assert.equal(mount.querySelector('[data-hf-ei="motivoConsulta"]'), null);

  // Jump back to step 0 — no linear gate, and the earlier edit persisted.
  jumpTo(mount, 0);
  assert.match(mount.innerHTML, /Paso 1 de 6/);
  assert.equal(patient.cardio.evaluacionInicial.residente, 'Dra. Pérez');
  assert.equal(mount.querySelector('[data-hf-ei="residente"]').value, 'Dra. Pérez');
});

test('editing etiología (step 2) and fenotipo (step 4) writes patient.cardio (canonical), not patient.cardio.evaluacionInicial', () => {
  if (typeof document === 'undefined') return;
  seedPatient('p2', undefined);
  var mount = document.createElement('div');
  renderEvaluacionInicialPanel(mount);
  var patient = getPatients()[0];

  goNext(mount); // step 2: Historia de IC (has etiología)
  var etiologiaSel = mount.querySelector('[data-ea-cardio="etiologia"]');
  etiologiaSel.value = 'Isquémica';
  fire(etiologiaSel, 'change');

  goNext(mount); // step 3: Exploración
  goNext(mount); // step 4: FEVI y labs (has fenotipo)
  var fenotipoSel = mount.querySelector('[data-ea-cardio="fenotipo"]');
  fenotipoSel.value = 'HFrEF';
  fire(fenotipoSel, 'change');

  assert.equal(patient.cardio.etiologia, 'Isquémica');
  assert.equal(patient.cardio.fenotipo, 'HFrEF');
  assert.equal('etiologia' in patient.cardio.evaluacionInicial, false);
  assert.equal('fenotipo' in patient.cardio.evaluacionInicial, false);
});

test('editing residente (step 1) writes patient.cardio.evaluacionInicial.residente, a genuinely separate field from patient.cardio.residente', () => {
  if (typeof document === 'undefined') return;
  seedPatient('p3', undefined);
  var mount = document.createElement('div');
  renderEvaluacionInicialPanel(mount);
  var patient = getPatients()[0];
  patient.cardio.residente = 'Dr. Top-level';

  var residenteInput = mount.querySelector('[data-hf-ei="residente"]');
  residenteInput.value = 'Dra. Intake';
  fire(residenteInput, 'input');

  assert.equal(patient.cardio.evaluacionInicial.residente, 'Dra. Intake');
  assert.equal(patient.cardio.residente, 'Dr. Top-level', 'the canonical top-level field must be untouched');
});

test('editing the tiempo de evolución number/unit picker composes and writes a single string', () => {
  if (typeof document === 'undefined') return;
  seedPatient('p3b', undefined);
  var mount = document.createElement('div');
  renderEvaluacionInicialPanel(mount);
  goNext(mount); // step 2: Historia de IC (has tiempoEvolucion)
  var patient = getPatients()[0];

  var numberEl = mount.querySelector('[data-hf-ei-duration-n="tiempoEvolucion"]');
  var unitEl = mount.querySelector('[data-hf-ei-duration-unit="tiempoEvolucion"]');
  numberEl.value = '2';
  fire(numberEl, 'input');
  assert.equal(patient.cardio.evaluacionInicial.tiempoEvolucion, '2 meses');

  unitEl.value = 'ano';
  fire(unitEl, 'change');
  assert.equal(patient.cardio.evaluacionInicial.tiempoEvolucion, '2 años');
});

test('a legacy fenotipoPrevio value renders a "(valor previo)" fallback and can still be selected (step 2)', () => {
  if (typeof document === 'undefined') return;
  var cardio = { evaluacionInicial: { fenotipoPrevio: 'IC diastólica leve' } };
  seedPatient('p4', cardio);
  var mount = document.createElement('div');
  renderEvaluacionInicialPanel(mount);
  goNext(mount); // step 2: Historia de IC (has fenotipoPrevio)
  var sel = mount.querySelector('[data-hf-ei="fenotipoPrevio"]');
  assert.match(sel.innerHTML, /IC diastólica leve \(valor previo\)/);
});

test('clicking "Guardar VExUS de ingreso en Congestión" writes a pocusByDay entry keyed to fecha', () => {
  if (typeof document === 'undefined') return;
  seedPatient('p5', undefined);
  var mount = document.createElement('div');
  renderEvaluacionInicialPanel(mount);
  var patient = getPatients()[0];

  var fechaInput = mount.querySelector('[data-hf-ei="fecha"]');
  fechaInput.value = '2026-08-22';
  fire(fechaInput, 'change');

  goNext(mount); // step 2
  goNext(mount); // step 3: Exploración (has VExUS de ingreso)

  var vciMmInput = mount.querySelector('[data-hf-ei-vexus="vciMm"]');
  vciMmInput.value = '21';
  fire(vciMmInput, 'input');

  var gradoSel = mount.querySelector('[data-hf-ei-vexus="grado"]');
  gradoSel.value = '2';
  fire(gradoSel, 'change');

  var syncBtn = mount.querySelector('[data-hf-ei-action="sync-congestion"]');
  fire(syncBtn, 'click');

  var day = patient.cardio.pocusByDay.find(function (d) {
    return d.date === '2026-08-22';
  });
  assert.ok(day, 'expected an upsertPocusDay entry for 2026-08-22');
  assert.equal(day.vciCm, 21);
  assert.equal(day.vexus, '2');
});

test('adding a medicamento previo row (step 1) re-renders and stays on the same step', () => {
  if (typeof document === 'undefined') return;
  seedPatient('p6', undefined);
  var mount = document.createElement('div');
  renderEvaluacionInicialPanel(mount);
  goNext(mount); // step 2: Historia de IC (has medicamentos previos)
  assert.match(mount.innerHTML, /Paso 2 de 5/);

  var addBtn = mount.querySelector('[data-hf-medprevio-action="add"]');
  fire(addBtn, 'click');

  var patient = getPatients()[0];
  assert.equal(patient.cardio.evaluacionInicial.medicamentosPrevios.length, 1);
  assert.match(mount.innerHTML, /Paso 2 de 5/, 'must stay on the same step after the add-row re-render');
});

test('syncEvaluacionInicialToPocusDay is a no-op when fecha is blank', () => {
  var patient = { cardio: { pocusByDay: [], evaluacionInicial: { fecha: '', vexusInicial: {} } } };
  syncEvaluacionInicialToPocusDay(patient);
  assert.deepEqual(patient.cardio.pocusByDay, []);
});
