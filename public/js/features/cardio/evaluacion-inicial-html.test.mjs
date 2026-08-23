import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyEvaluacionInicial } from '../../../../lib/cardio/evaluacion-inicial.mjs';
import {
  buildEvaluacionInicialHtml,
  EVALUACION_INICIAL_STEP_COUNT,
  EVALUACION_INICIAL_STEP_TITLES,
  composeDurationValue,
} from './evaluacion-inicial-html.mjs';

test('has 5 steps in the expected order', () => {
  assert.equal(EVALUACION_INICIAL_STEP_COUNT, 5);
  assert.deepEqual(EVALUACION_INICIAL_STEP_TITLES, [
    'Identificación',
    'Historia de IC',
    'Exploración',
    'FEVI y labs',
    'Impresión y plan',
  ]);
});

test('step 0 (Identificación) renders fecha/residente/motivoConsulta/antecedentes, nothing from later steps', () => {
  var html = buildEvaluacionInicialHtml(emptyEvaluacionInicial(), { etiologia: '', fenotipo: '' }, 0);
  assert.match(html, /Paso 1 de 5/);
  assert.match(html, /data-hf-ei="fecha"/);
  assert.match(html, /data-hf-ei="residente"/);
  assert.match(html, /data-hf-ei="motivoConsulta"/);
  assert.match(html, /data-hf-ei="antecedentes"/);
  assert.doesNotMatch(html, /data-hf-ei-trat="ieca_ara"/);
  assert.doesNotMatch(html, /data-hf-ei-labs="na"/);
  assert.doesNotMatch(html, /data-hf-ei-step-action="back"/);
  assert.match(html, /data-hf-ei-step-action="next"/);
});

test('step 1 (Historia de IC) renders medicamentos previos, historia/etiología, tratamiento previo, FA/dispositivo', () => {
  var html = buildEvaluacionInicialHtml(emptyEvaluacionInicial(), { etiologia: '', fenotipo: '' }, 1);
  assert.match(html, /Paso 2 de 5/);
  assert.match(html, /data-hf-medprevio-action="add"/);
  assert.match(html, /data-hf-ei="historiaIcPrevia"/);
  assert.match(html, /data-ea-cardio="etiologia"/);
  assert.match(html, /data-hf-ei-trat="ieca_ara"/);
  assert.match(html, /data-hf-ei="faFlutter"/);
  assert.doesNotMatch(html, /data-hf-ei="motivoConsulta"/);
  assert.doesNotMatch(html, /data-hf-ei-expl="ta"/);
  assert.match(html, /data-hf-ei-step-action="back"/);
  assert.match(html, /data-hf-ei-step-action="next"/);
});

test('step 2 (Exploración) renders PEEA, exploración física, VExUS, US pulmonar, Rx tórax, ECG', () => {
  var html = buildEvaluacionInicialHtml(emptyEvaluacionInicial(), { etiologia: '', fenotipo: '' }, 2);
  assert.match(html, /Paso 3 de 5/);
  assert.match(html, /data-hf-ei="peea"/);
  assert.match(html, /data-hf-ei-expl="ta"/);
  assert.match(html, /data-hf-ei-vexus="vciMm"/);
  assert.match(html, /data-hf-ei-uspulmonar-lineasb="0"/);
  assert.match(html, /data-hf-ei-uspulmonar-lineasb="7"/);
  assert.match(html, /data-hf-ei-rxtorax-hallazgo="Cardiomegalia"/);
  assert.match(html, /data-hf-ei="ecgIngreso"/);
  assert.match(html, /data-hf-ei-action="sync-congestion"/);
  assert.doesNotMatch(html, /data-hf-ei-labs="na"/);
});

test('step 3 (FEVI y labs) renders feviEstimadaInicial/fenotipo and labs de ingreso', () => {
  var html = buildEvaluacionInicialHtml(emptyEvaluacionInicial(), { etiologia: '', fenotipo: '' }, 3);
  assert.match(html, /Paso 4 de 5/);
  assert.match(html, /data-hf-ei="feviEstimadaInicial"/);
  assert.match(html, /data-ea-cardio="fenotipo"/);
  assert.match(html, /data-hf-ei-labs="na"/);
  assert.doesNotMatch(html, /data-hf-ei-expl="ta"/);
});

test('step 4 (Impresión y plan) renders impresión, plan, diuresis/gasto, eventualidades; is the last step', () => {
  var html = buildEvaluacionInicialHtml(emptyEvaluacionInicial(), { etiologia: '', fenotipo: '' }, 4);
  assert.match(html, /Paso 5 de 5/);
  assert.match(html, /data-hf-ei="impresionDiagnostica"/);
  assert.match(html, /data-hf-ei="planTerapeutico"/);
  assert.match(html, /data-hf-ei="nau2hPostBolo"/);
  assert.match(html, /data-hf-ei="gastoUrinario6h"/);
  assert.match(html, /data-hf-ei="eventualidades"/);
  assert.match(html, /data-hf-ei-step-action="back"/);
  assert.doesNotMatch(html, /data-hf-ei-step-action="next"/);
});

test('step defaults to 0 and clamps out-of-range values into [0, 4]', () => {
  var e = emptyEvaluacionInicial();
  var noStepArg = buildEvaluacionInicialHtml(e, { etiologia: '', fenotipo: '' });
  assert.match(noStepArg, /Paso 1 de 5/);
  var negative = buildEvaluacionInicialHtml(e, { etiologia: '', fenotipo: '' }, -3);
  assert.match(negative, /Paso 1 de 5/);
  var tooHigh = buildEvaluacionInicialHtml(e, { etiologia: '', fenotipo: '' }, 99);
  assert.match(tooHigh, /Paso 5 de 5/);
});

test('populated rendering carries values through to the markup on their owning step', () => {
  var e = emptyEvaluacionInicial();
  e.fecha = '2026-08-22';
  e.motivoConsulta = 'Disnea de reposo';
  e.residente = 'Dra. Pérez';
  var html0 = buildEvaluacionInicialHtml(e, { etiologia: '', fenotipo: '' }, 0);
  assert.match(html0, /data-hf-ei="fecha" value="2026-08-22"/);
  assert.match(html0, />Disnea de reposo<\/textarea>/);
  assert.match(html0, /data-hf-ei="residente" value="Dra. Pérez"/);

  e.exploracion.ta = '110/70';
  e.vexusInicial.vciMm = 22;
  var html2 = buildEvaluacionInicialHtml(e, { etiologia: '', fenotipo: '' }, 2);
  assert.match(html2, /data-hf-ei-expl="ta" value="110\/70"/);
  assert.match(html2, /data-hf-ei-vexus="vciMm" value="22"/);

  e.labsIngreso.na = 138;
  e.rxTorax.hallazgos = ['Cardiomegalia'];
  var html2b = buildEvaluacionInicialHtml(e, { etiologia: '', fenotipo: '' }, 2);
  assert.match(html2b, /data-hf-ei-rxtorax-hallazgo="Cardiomegalia" checked/);
  var html3 = buildEvaluacionInicialHtml(e, { etiologia: '', fenotipo: '' }, 3);
  assert.match(html3, /data-hf-ei-labs="na" value="138"/);
});

test('etiología and fenotipo render as canonical patient.cardio fields, not duplicated on evaluacionInicial', () => {
  var html1 = buildEvaluacionInicialHtml(emptyEvaluacionInicial(), { etiologia: 'Isquémica', fenotipo: 'HFrEF' }, 1);
  assert.match(html1, /data-ea-cardio="etiologia"[\s\S]*?<option value="Isquémica" selected>/);
  // evaluacionInicial itself has no `etiologia`/top-level `fenotipo` key — only `fenotipoPrevio`.
  assert.doesNotMatch(html1, /data-hf-ei="etiologia"/);
  assert.doesNotMatch(html1, /data-hf-ei="fenotipo"/);
  assert.match(html1, /data-hf-ei="fenotipoPrevio"/);

  var html3 = buildEvaluacionInicialHtml(emptyEvaluacionInicial(), { etiologia: 'Isquémica', fenotipo: 'HFrEF' }, 3);
  assert.match(html3, /data-ea-cardio="fenotipo"[\s\S]*?<option value="HFrEF" selected>/);
});

test('a legacy fenotipoPrevio value not in FENOTIPOS renders a "(valor previo)" fallback option', () => {
  var e = emptyEvaluacionInicial();
  e.fenotipoPrevio = 'IC sistólica leve';
  var html = buildEvaluacionInicialHtml(e, { etiologia: '', fenotipo: '' }, 1);
  assert.match(html, /<option value="IC sistólica leve" selected>IC sistólica leve \(valor previo\)<\/option>/);
});

test('tiempo de evolución renders as a number + unit picker and pre-fills from an existing "N unidad" value', () => {
  var e = emptyEvaluacionInicial();
  e.tiempoEvolucion = '2 meses';
  var html = buildEvaluacionInicialHtml(e, { etiologia: '', fenotipo: '' }, 1);
  assert.match(html, /data-hf-ei-duration-n="tiempoEvolucion"/);
  assert.match(html, /data-hf-ei-duration-unit="tiempoEvolucion"/);
  assert.match(html, /value="2"[^>]*data-hf-ei-duration-n="tiempoEvolucion"|data-hf-ei-duration-n="tiempoEvolucion"[^>]*value="2"/);
  assert.match(html, /<option value="mes" selected>meses<\/option>/);
});

test('composeDurationValue combines the number and unit, pluralizing only when n !== 1', () => {
  assert.equal(composeDurationValue('2', 'mes'), '2 meses');
  assert.equal(composeDurationValue('1', 'mes'), '1 mes');
  assert.equal(composeDurationValue('1', 'dia'), '1 día');
  assert.equal(composeDurationValue('3', 'ano'), '3 años');
  assert.equal(composeDurationValue('', 'mes'), '');
});

test('escapes narrative text content', () => {
  var e = emptyEvaluacionInicial();
  e.motivoConsulta = '<script>x</script>';
  var html = buildEvaluacionInicialHtml(e, { etiologia: '', fenotipo: '' }, 0);
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
});
