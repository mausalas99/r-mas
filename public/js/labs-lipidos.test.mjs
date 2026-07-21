import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQS_, procesarLabs } from './labs.js';
import { extraerConRangoSuero, extraerIndiceAterogenico_ } from './labs-extract.mjs';

const MUESTRA_PERFIL_LIPIDOS = `Expediente:\t2115922-5\tSolicitud:\t2607170439
Nombre:\tADRIANA ELIZABETH PEDRAZA RIZO\tFecha Registro:\tJul 17 2026 7:29AM
Sexo:\tFEMENINO\tUbicación:\tCONSULTA
Edad:\t41\tMedico:\tA QUIEN CORRESPONDA

QUIMICA CLINICA
COLESTEROL
Estudio\t\tResultado\tUnidades\tValor de Referencia
COLESTEROL\t
*
187
mg/dL\t130 - 200
TRIGLICERIDOS
Estudio\t\tResultado\tUnidades\tValor de Referencia
TRIGLICERIDOS\t
*
116
mg/dL\t35 - 150
COLESTEROL HDL
Estudio\t\tResultado\tUnidades\tValor de Referencia
COLESTEROL HDL\t
*
38
mg%\t29 - 71
COLESTEROL LDL
Estudio\t\tResultado\tUnidades\tValor de Referencia
COLESTEROL LDL\t
*
125.8
mg/dL\t0.0 - 130.0
VLDL
Estudio\t\tResultado\tUnidades\tValor de Referencia
VLDL\t
*
23.2
mg/dL\t2.0 - 40.0
INDICE ATEROGENICO
Estudio\t\tResultado\tUnidades\tValor de Referencia
INDICE ATEROGENICO\t
A
3.31
3.22 RIESGO PROM.
COCIENTE COL.TOT/HDL
Estudio\t\tResultado\tUnidades\tValor de Referencia
COCIENTE COL.TOT/HDL\t
A
4.92
0.00 - 3.10
`;

test('extraerConRangoSuero COLESTEROL no toma HDL/LDL', () => {
  var col = extraerConRangoSuero(['COLESTEROL'], MUESTRA_PERFIL_LIPIDOS);
  assert.equal(col.valor, '187');
  var hdl = extraerConRangoSuero(['COLESTEROL HDL'], MUESTRA_PERFIL_LIPIDOS);
  assert.equal(hdl.valor, '38');
  var ldl = extraerConRangoSuero(['COLESTEROL LDL'], MUESTRA_PERFIL_LIPIDOS);
  assert.equal(ldl.valor, '125.8');
});

test('extraerIndiceAterogenico_ usa umbral RIESGO PROM', () => {
  var ia = extraerIndiceAterogenico_(MUESTRA_PERFIL_LIPIDOS);
  assert.equal(ia.valor, '3.31');
  assert.equal(ia.min, 0);
  assert.equal(ia.max, 3.22);
});

test('parseQS_ expande perfil de lípidos completo', () => {
  var out = parseQS_(MUESTRA_PERFIL_LIPIDOS);
  assert.match(out, /^QS\t/);
  assert.match(out, /\bCOL 187\b/);
  assert.match(out, /\bHDL 38\b/);
  assert.match(out, /\bLDL 125\.8\b/);
  assert.match(out, /\bVLDL 23\.2\b/);
  assert.match(out, /\bTGL 116\b/);
  assert.match(out, /\bIA 3\.31\*/);
  assert.match(out, /\bCTHDL 4\.92\*/);
});

test('procesarLabs emite QS lipídico ampliado', () => {
  var { resLabs } = procesarLabs(MUESTRA_PERFIL_LIPIDOS);
  var qs = resLabs.find((l) => l.startsWith('QS\t'));
  assert.ok(qs, 'debe producir línea QS');
  assert.match(qs, /\bHDL 38\b/);
  assert.match(qs, /\bCTHDL 4\.92\*/);
});
