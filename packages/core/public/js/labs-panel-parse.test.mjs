import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExtendedLabPanels_ } from './labs-panel-parse.mjs';

function lineFor_(sectionKey, lines) {
  return lines.find(function (l) { return l.indexOf(sectionKey + '\t') === 0; });
}

/** Bloque SOME sintético numérico (mismo layout que labs-panel-extended.test.mjs). */
function someNum_(name, value, unit, ref) {
  return (
    name +
    '\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
    name +
    '\t\n*\n' +
    value +
    '\n' +
    unit +
    '\t' +
    ref +
    '\n'
  );
}

// Fila de antibiograma real: "VANCOMICINA" seguida de CMI + interpretación
// (sensibilidad), no un nivel sérico terapéutico.
var FIXTURE_HEMOCULTIVO_VANCO =
  'BACTERIOLOGIA\n' +
  'HEMOCULTIVO\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'MICROORGANISMO\n*\n' +
  'Enterococcus faecalis\n' +
  'CUENTA\n*\n' +
  '50,000 UFC/mL\n' +
  'ANTIBIOGRAMA\n*\n' +
  'VANCOMICINA\n2\tS\n' +
  'AMPICILINA\n<=2\tS\n' +
  'QUIMICA CLINICA\n' +
  someNum_('GLUCOSA', '90', 'mg/dL', '70 - 100');

test('parseExtendedLabPanels_ — VANCOMICINA en antibiograma de BACTERIOLOGIA no fabrica un NIVEL', () => {
  var lines = parseExtendedLabPanels_(FIXTURE_HEMOCULTIVO_VANCO);
  var nivel = lineFor_('NIVEL', lines);
  assert.ok(!nivel, 'la fila de sensibilidad del antibiograma no debe producir sección NIVEL');
});

var FIXTURE_NIVEL_VANCO_REAL =
  'QUIMICA CLINICA\n' + someNum_('VANCOMICINA', '18', 'ug/mL', '10 - 20');

test('parseExtendedLabPanels_ — NIVEL DE VANCOMICINA real (fuera de BACTERIOLOGIA) sí se reporta', () => {
  var lines = parseExtendedLabPanels_(FIXTURE_NIVEL_VANCO_REAL);
  var nivel = lineFor_('NIVEL', lines);
  assert.ok(nivel, 'un nivel sérico terapéutico real debe seguir reportándose');
  assert.match(nivel, /\bVanco 18\b/);
});

test('parseExtendedLabPanels_ — un antibiograma de BACTERIOLOGIA no oculta un NIVEL real del mismo reporte', () => {
  var combinado = FIXTURE_HEMOCULTIVO_VANCO + '\n' + someNum_('DIGOXINA', '1.8', 'ng/mL', '0.8 - 2.0');
  var lines = parseExtendedLabPanels_(combinado);
  var nivel = lineFor_('NIVEL', lines);
  assert.ok(nivel, 'DIGOXINA fuera del bloque BACTERIOLOGIA debe seguir apareciendo');
  assert.match(nivel, /\bDig 1\.8\b/);
  assert.ok(!/\bVanco\b/.test(nivel), 'no debe colarse el Vanco del antibiograma');
});
