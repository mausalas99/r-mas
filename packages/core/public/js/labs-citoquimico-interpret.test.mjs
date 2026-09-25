import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  procesarLabs,
  buildAscitisLabAlerts_,
  buildLcrLabAlerts_,
  evaluarPbeAscitis_,
  evaluarLcrEtiologia_,
  evaluarLcrPhSanity_,
  isCitoquimInterpretacionResLabChunk,
} from './labs.js';
import { parsePmnField_ } from './labs-fluid-interpret-values.mjs';

const MUESTRA_LCR_BACTERIANA = `
QUIMICA CLINICA
GLUCOSA
Estudio		Resultado	Unidades	Valor de Referencia
GLUCOSA
B
110
mg/dL	70 - 110

CITOQUIMICO DE LCR
Estudio		Resultado	Unidades	Valor de Referencia
PH
7.30
ASPECTO
TURBIO
RECUENTO CELULAR
2500
LEUCOCITOS
GLUCOSA
25
mg/dL	40 - 80
PROTEINAS
180
mg/dL	15 - 45
CLORURO
120
mEq/L	118 - 132
GRAM
COCCOS GRAM POSITIVOS EN CADENAS
TINTA CHINA
NEGATIVO

BACTERIOLOGIA
`;

test('parsePmnField — infiere PMN absoluto desde % (unidad del reporte)', () => {
  const info = parsePmnField_('96', 9200, '%');
  assert.equal(info.pmnNum, 8832);
  assert.equal(info.pmnPct, 96);
  assert.equal(info.predominant, true);
});

test('parsePmnField — el % puede venir en el valor, en la unidad o como %PMN', () => {
  assert.equal(parsePmnField_('96%', 9200).pmnNum, 8832);
  assert.equal(parsePmnField_('96', 9200, '%PMN').pmnNum, 8832);
  assert.equal(parsePmnField_('96', 9200, '%\t').pmnNum, 8832);
});

test('parsePmnField — PREDOMINIO sigue marcando predominio sin número', () => {
  const info = parsePmnField_('PREDOMINIO', 9200, '%');
  assert.equal(info.pmnNum, null);
  assert.equal(info.pmnPct, null);
  assert.equal(info.predominant, true);
});

test('parsePmnField — un absoluto pequeño sin % ya no se lee como porcentaje', () => {
  // Antes: 80 con Leu 9200 daba pmnNum 7360 y disparaba PBE.
  const info = parsePmnField_('80', 9200);
  assert.equal(info.pmnNum, null, 'no debe inventar un absoluto desde un número ambiguo');
  assert.equal(info.predominant, false);
});

test('parsePmnField — un número mayor que 100 sin % sólo puede ser absoluto', () => {
  const info = parsePmnField_('420', 9200);
  assert.equal(info.pmnNum, 420);
  assert.equal(info.pmnPct, null);
  assert.equal(info.predominant, true);
});

test('evaluarPbeAscitis — PMN ≥250', () => {
  const info = parsePmnField_('96', 9200, '%');
  const alerts = evaluarPbeAscitis_(9200, info, 'ABUNDANTES POLIMORFONUCLEARES');
  assert.match(alerts.join(' '), /PMN 8832 ≥250/);
  assert.match(alerts.join(' '), /peritonitis bacteriana espontánea/i);
});

test('evaluarPbeAscitis — un PMN ambiguo pide confirmarlo en vez de afirmar PBE', () => {
  const info = parsePmnField_('80', 9200);
  const alerts = evaluarPbeAscitis_(9200, info, 'NEGATIVO').join(' ');
  assert.ok(
    !/peritonitis bacteriana espontánea/i.test(alerts),
    'no debe afirmar PBE sobre un número ambiguo: ' + alerts
  );
  assert.match(alerts, /confirmar PMN absoluto/i);
});

test('evaluarLcrEtiologia — meningitis bacteriana', () => {
  const alerts = evaluarLcrEtiologia_(2500, 25, 180, 'COCCOS GRAM POSITIVOS', 'NEGATIVO', 110);
  assert.match(alerts.join(' '), /Meningitis bacteriana/i);
});

test('buildLcrLabAlerts — LCR procesado con etiología', () => {
  const alerts = buildLcrLabAlerts_(MUESTRA_LCR_BACTERIANA);
  assert.ok(alerts.length);
  assert.match(alerts.join(' '), /Meningitis bacteriana/i);
});

test('procesarLabs — LCR incluye interpretación citoquímica', () => {
  const { resLabs } = procesarLabs(MUESTRA_LCR_BACTERIANA);
  const lcr = resLabs.find((l) => l.startsWith('LCR:\t'));
  const interp = resLabs.find((l) => isCitoquimInterpretacionResLabChunk(l));
  assert.ok(lcr);
  assert.match(lcr, /Leu 2500/);
  assert.ok(interp);
  assert.match(interp, /Meningitis bacteriana/i);
});

test('evaluarLcrEtiologia — pleocitosis viral', () => {
  const alerts = evaluarLcrEtiologia_(80, 65, 70, 'NEGATIVO', 'NEGATIVO', 100);
  assert.match(alerts.join(' '), /viral/i);
});

test('evaluarLcrEtiologia — Leu 10-99 con glucosa baja no es viral', () => {
  const alerts = evaluarLcrEtiologia_(26, 21, 200, 'NEGATIVO', 'NEGATIVO', 90);
  assert.ok(!/viral/i.test(alerts.join(' ')));
  assert.match(alerts.join(' '), /tuberculosa/i);
});

test('evaluarLcrEtiologia — Leu 10-99 con proteína muy alta no es viral puro', () => {
  const alerts = evaluarLcrEtiologia_(40, 60, 150, 'NEGATIVO', 'NEGATIVO', 90);
  assert.ok(!/^Meningitis viral/i.test(alerts.join(' ')));
  assert.match(alerts.join(' '), /bacteriana parcialmente tratada/i);
});

test('evaluarLcrPhSanity_ — pH normal sin flag', () => {
  assert.equal(evaluarLcrPhSanity_(7.35), '');
});

test('evaluarLcrPhSanity_ — pH alto', () => {
  assert.match(evaluarLcrPhSanity_(8.5), /fuera de rango fisiológico/);
});

test('evaluarPbeAscitis — leucocitos bajos sin alerta PBE', () => {
  const info = parsePmnField_('PREDOMINIO', 48);
  const alerts = evaluarPbeAscitis_(48, info, 'NEGATIVO');
  assert.equal(alerts.length, 0);
});
