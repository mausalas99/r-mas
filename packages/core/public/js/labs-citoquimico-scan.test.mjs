import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyCitoquimicoFields_,
  scanCitoquimicoLine_,
  CITO_DEPT_HEADER_RE_,
} from './labs-citoquimico-scan.mjs';

function noop_(v) { return v; }

function scanAll_(lineas) {
  var fields = emptyCitoquimicoFields_();
  for (var i = 0; i < lineas.length; i++) {
    var lin = lineas[i];
    scanCitoquimicoLine_(fields, lineas, i, lin, lin.toUpperCase(), noop_);
  }
  return fields;
}

test('CITO_DEPT_HEADER_RE_ reconoce nombres de departamento, no fluidos reales', () => {
  assert.equal(CITO_DEPT_HEADER_RE_.test('BACTERIOLOGIA'), true);
  assert.equal(CITO_DEPT_HEADER_RE_.test('QUIMICA CLINICA'), true);
  assert.equal(CITO_DEPT_HEADER_RE_.test('LIQUIDO PERITONEAL'), false);
  assert.equal(CITO_DEPT_HEADER_RE_.test('LIQUIDO PLEURAL'), false);
});

test('scanCitoquimicoLine_ — "CITOQUIMICO DE" seguido del header de la siguiente sub-tabla no fija fluid', () => {
  // Reporte real: fila "CITOQUIMICO DE" con celda de resultado vacía ("*"),
  // e inmediatamente después el header de la segunda sub-tabla de departamento
  // en vez de un nombre de fluido.
  var lineas = ['CITOQUIMICO DE', '*', '', 'BACTERIOLOGIA', 'CITOQUIMICO DE LIQUIDOS CORPORALES'];
  var fields = scanAll_(lineas);
  assert.equal(fields.fluid, '', 'no debe adoptar el header de departamento como fluido');
});

test('scanCitoquimicoLine_ — "CITOQUIMICO DE" seguido del nombre real de fluido sí lo fija', () => {
  var lineas = ['CITOQUIMICO DE', '*', 'LIQUIDO PERITONEAL'];
  var fields = scanAll_(lineas);
  assert.equal(fields.fluid, 'LIQUIDO PERITONEAL');
});

test('scanCitoquimicoLine_ — "CITOQUIMICO DE <fluido>" en la misma línea rechaza departamento', () => {
  var lineas = ['CITOQUIMICO DE BACTERIOLOGIA'];
  var fields = scanAll_(lineas);
  assert.equal(fields.fluid, '');
});

test('scanCitoquimicoLine_ — "CITOQUIMICO DE <fluido>" en la misma línea acepta fluido real', () => {
  var lineas = ['CITOQUIMICO DE LIQUIDO PLEURAL'];
  var fields = scanAll_(lineas);
  assert.equal(fields.fluid, 'LIQUIDO PLEURAL');
});
