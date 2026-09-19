import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCultivo_ } from './labs-cultivo.mjs';

var COPROCULTIVO_PRELIMINAR = `Expediente:\t0000000-0\tSolicitud:\t2608130985
Nombre:\tPACIENTE DE PRUEBA\tFecha Registro:\t13/08/2026 04:20:52 p. m.
Sexo:\tMASCULINO\tUbicación:\tMEDICINA INTERNA 2
Edad:\t67\tMedico:\tA QUIEN CORRESPONDA

BACTERIOLOGIA
Estudio\t\tResultado\tUnidades\tValor de Referencia
COPROCULTIVO
PRODUCTO\t
*
TINCION DE GRAM\t
*
CALIDAD DE LA MUESTRA\t
*
ESTADO DE CULTIVO\t
*
REPORTE PRELIMINAR, MICROBIOTA COLIBACILAR NORMAL AUSENTE
*
MICROORGANISMO\t
*
COMENTARIO:\t
*
CUENTA\t
*`;

test('parseCultivo_ coprocultivo con MICROBIOTA COLIBACILAR en estado', () => {
  var tNorm = COPROCULTIVO_PRELIMINAR.replace(/\r/g, '').replace(/\t/g, ' ');
  var out = parseCultivo_(COPROCULTIVO_PRELIMINAR, tNorm);
  assert.ok(out, 'debe producir salida');
  assert.match(out, /COPROCULTIVO/, 'debe incluir tipo');
  assert.match(out, /13\/08/, 'debe incluir fecha');
  assert.match(out, /MICROBIOTA COLIBACILAR NORMAL AUSENTE/, 'no debe truncar MICROBIOTA');
  assert.doesNotMatch(out, /REPORTE PRELIMINAR,$/, 'no debe terminar con coma suelta');
});
