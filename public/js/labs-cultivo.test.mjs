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

// El texto extraído del PDF de SOME a veces pega cada renglón del
// antibiograma sin separadores ("ANTIBIOGRAMA*AMP/SULBACTAM16/8I",
// "*AMIKACINA<=16S", …). buildGermenChunk_ solo probaba el formato con
// tab (nombre y CMI+interp en renglones separados) y ese devolvía cero
// antibióticos en este formato pegado — el cultivo se guardaba en
// resLabs sin línea "ATB", aunque el mismo germen sí mostraba su
// antibiograma correcto en la tabla (que lee de otra fuente). Con dos
// gérmenes en el mismo estudio, para confirmar que no se corta el
// segundo al buscar el primero.
var UROCULTIVO_PDF_GLUED_DOS_GERMENES = `Sexo:\tFEMENINO\tUbicación:\tMEDICINA INTERNA 1
Edad:\t58\tMedico:\tA QUIEN CORRESPONDA

BACTERIOLOGIA
Estudio\t\tResultado\tUnidades\tValor de Referencia
UROCULTIVO POR SONDA
PRODUCTO*
MICROORGANISMO*Escherichia coli
COMENTARIO:*
CUENTA DE KASS*25,000 UFC/mL
ANTIBIOGRAMA*AMP/SULBACTAM16/8I
*AMIKACINA<=16S
*AMPICILINA>16R
*
MICROORGANISMO*Enterococcus faecalis
COMENTARIO:*
CUENTA DE KASS*+100,000 UFC/mL
ANTIBIOGRAMA*AMPICILINA<=2S
*NITROFURANTOINA<=32S
*PENICILINA8S
*
MICROORGANISMO*
COMENTARIO:*`;

test('parseCultivo_ guarda el antibiograma cuando el PDF llega con renglones pegados (dos gérmenes)', () => {
  var tNorm = UROCULTIVO_PDF_GLUED_DOS_GERMENES.replace(/\r/g, '').replace(/\t/g, ' ');
  var out = parseCultivo_(UROCULTIVO_PDF_GLUED_DOS_GERMENES, tNorm);
  var chunks = out.split(/\n\n+/);
  assert.equal(chunks.length, 2, 'un chunk por germen');
  assert.match(chunks[0], /ESCHERICHIA COLI/);
  assert.match(chunks[0], /^ATB R: AMP \| I: AMP-SULB \| S: AMIK$/m, 'E. coli debe traer su antibiograma');
  assert.match(chunks[1], /ENTEROCOCCUS FAECALIS/);
  assert.match(chunks[1], /^ATB S: AMP, NITRO, PEN$/m, 'Enterococcus no debe quedar sin antibiograma');
});
