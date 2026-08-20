import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSensCrudasForGermFromSource } from './labs-cultivo-atb.mjs';

// Día con dos cultivos consolidados en el mismo sourceText (mergeClusterSourceText):
// un urocultivo con el mismo germen pero SIN antibiograma (reportado como
// "negativo a betalactamasas", sin sección ANTIBIOGRAMA), seguido de un
// hemocultivo con el antibiograma real. El primer MICROORGANISMO que
// coincide con la consulta no trae ANTIBIOGRAMA — el parser debe seguir
// buscando en las siguientes coincidencias en vez de rendirse.
var DOS_CULTIVOS_MISMO_GERMEN =
  'Expediente:\t0000000-0\tSolicitud:\t2608130001\n' +
  'Nombre:\tPACIENTE DE PRUEBA\tFecha Registro:\t13/08/2026 04:20:52 p. m.\n' +
  'Sexo:\tMASCULINO\tUbicación:\tMEDICINA INTERNA 2\n' +
  'Edad:\t67\tMedico:\tA QUIEN CORRESPONDA\n' +
  '\nBACTERIOLOGIA\n' +
  'UROCULTIVO POR SONDA\n' +
  'PRODUCTO\n*\n' +
  'MICROORGANISMO\n*\n' +
  'Escherichia coli\n' +
  'CUENTA\n*\n' +
  '1,000 UFC/mL\n' +
  '\nBACTERIOLOGIA\n' +
  'HEMOCULTIVO\n' +
  'PRODUCTO\n*\n' +
  'PERIFERICO IZQUIERDO\n' +
  'MICROORGANISMO\n*\n' +
  'Escherichia coli\n' +
  'COMENTARIO:\n*\n' +
  'AISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\n' +
  'CUENTA\n*\n' +
  '50,000 UFC/mL\n' +
  'ANTIBIOGRAMA\n*\n' +
  'CEFTAZIDIMA\n>16\tESBL\n' +
  'IMIPENEM\n<=1\tS\n' +
  'MEROPENEM\n<=1\tS\n';

test('extractSensCrudasForGermFromSource sigue buscando cuando la primera coincidencia no trae ANTIBIOGRAMA', () => {
  var sens = extractSensCrudasForGermFromSource(DOS_CULTIVOS_MISMO_GERMEN, 'ESCHERICHIA COLI');
  assert.ok(sens && sens.length, 'debe encontrar el antibiograma del segundo cultivo con el mismo germen');
  var meds = sens.map(function (s) { return s.med; });
  assert.ok(meds.includes('MEROPENEM'), 'debe incluir MEROPENEM del hemocultivo');
  var mero = sens.find(function (s) { return s.med === 'MEROPENEM'; });
  assert.equal(mero.interp, 'S');
});

// "Actualizar" puede reconsultar el repositorio varias veces y anexar (no
// reemplazar) el mismo cultivo cuando la hora del estudio varía apenas unos
// minutos entre consultas — el mismo germen queda repetido 2 veces dentro de
// sourceText. La primera copia queda truncada (su ANTIBIOGRAMA se corta
// porque el parser topa con el MICROORGANISMO de la segunda copia antes de
// terminar de leerlo); la segunda copia sí trae el antibiograma completo.
var CULTIVO_DUPLICADO_TRUNCADO =
  '\nBACTERIOLOGIA\n' +
  'UROCULTIVO POR SONDA\n' +
  'PRODUCTO\n*\n' +
  'MICROORGANISMO\n*\n' +
  'Escherichia coli\n' +
  'CUENTA\n*\n' +
  '25,000 UFC/mL\n' +
  'ANTIBIOGRAMA\n*\n' +
  'AMIKACINA\n<=16\tS\n' +
  '---\n' +
  'BACTERIOLOGIA\n' +
  'UROCULTIVO POR SONDA\n' +
  'PRODUCTO\n*\n' +
  'MICROORGANISMO\n*\n' +
  'Escherichia coli\n' +
  'CUENTA\n*\n' +
  '25,000 UFC/mL\n' +
  'ANTIBIOGRAMA\n*\n' +
  'AMIKACINA\n<=16\tS\n' +
  'AMPICILINA\n>16\tR\n' +
  'CEFTRIAXONA\n<=1\tS\n';

test('extractSensCrudasForGermFromSource elige la copia con más antibióticos cuando el mismo cultivo quedó duplicado en sourceText', () => {
  var sens = extractSensCrudasForGermFromSource(CULTIVO_DUPLICADO_TRUNCADO, 'ESCHERICHIA COLI');
  assert.ok(sens, 'debe encontrar antibiograma');
  assert.equal(sens.length, 3, 'debe quedarse con la copia completa (3 antibióticos), no la truncada (1)');
});

// Extracción por tabla donde cada campo del renglón (antibiótico, CMI,
// interpretación) cae en su propia línea separada por marcadores "*", en vez
// de compartir línea con "MIC\tINTERP" adjunta al nombre.
var UROCULTIVO_CAMPOS_POR_LINEA =
  '\nBACTERIOLOGIA\n' +
  'UROCULTIVO POR SONDA\n' +
  'PRODUCTO\n*\n' +
  'MICROORGANISMO\n*\n' +
  'Escherichia coli\n' +
  'CUENTA\n*\n' +
  '25,000 UFC/mL\n' +
  'ANTIBIOGRAMA\n*\n' +
  'AMIKACINA\n*\nS\n*\n' +
  'AMPICILINA\n*\nR\n*\n' +
  'CEFTRIAXONA\n*\n1\n*\nS\n*\n';

test('extractSensCrudasForGermFromSource lee antibiograma con un campo por línea (nombre, CMI, interpretación separados)', () => {
  var sens = extractSensCrudasForGermFromSource(UROCULTIVO_CAMPOS_POR_LINEA, 'ESCHERICHIA COLI');
  assert.ok(sens, 'debe encontrar antibiograma');
  assert.equal(sens.length, 3);
  var byMed = {};
  sens.forEach(function (s) { byMed[s.med] = s; });
  assert.equal(byMed.AMIKACINA.interp, 'S');
  assert.equal(byMed.AMPICILINA.interp, 'R');
  assert.equal(byMed.CEFTRIAXONA.interp, 'S');
  assert.equal(byMed.CEFTRIAXONA.mic, '1');
});

test('extractSensCrudasForGermFromSource devuelve null si ninguna coincidencia trae ANTIBIOGRAMA', () => {
  var soloUro =
    '\nBACTERIOLOGIA\n' +
    'UROCULTIVO POR SONDA\n' +
    'PRODUCTO\n*\n' +
    'MICROORGANISMO\n*\n' +
    'Escherichia coli\n' +
    'CUENTA\n*\n' +
    '1,000 UFC/mL\n';
  assert.equal(extractSensCrudasForGermFromSource(soloUro, 'ESCHERICHIA COLI'), null);
});
