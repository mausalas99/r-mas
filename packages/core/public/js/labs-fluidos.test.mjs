import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCitoquimicoLiquidosParsed } from './labs-fluidos.mjs';
import {
  citoquimicoTipoFingerprintFromLine_,
  citoquimicoTipoValueFromLine_,
  getCitoquimicoTipoOverride,
  setCitoquimicoTipoOverride,
  clearCitoquimicoTipoOverrideForTests,
} from './labs-citoquimico-tipo-override.mjs';

// Reporte real: el header "CITOQUIMICO DE" (fila con celda de resultado vacía)
// cae directo sobre "BACTERIOLOGIA" (header de la segunda sub-tabla) sin fila de
// fluido en medio — el nombre real del fluido solo aparece unas líneas después,
// en COMENTARIO, dentro de la segunda sub-tabla.
var MUESTRA_TIPO_AUSENTE = `
QUIMICA CLINICA
CITOQUIMICO DE LIQUIDOS CORPORALES
Estudio		Resultado	Unidades	Valor de Referencia
DENSIDAD
*
1.010
PH
*
7.40
GLUCOSA
*
90.0
mg/dL
PROTEINAS
*
2800
mg/dL
LDH
*
120
IU/L
CITOQUIMICO DE
*

BACTERIOLOGIA
CITOQUIMICO DE LIQUIDOS CORPORALES
Estudio		Resultado	Unidades	Valor de Referencia
ASPECTO
*
CLARO
RECUENTO
A
50
LEUCOCITOS/MM3	0.00 - 5.00
COMENTARIO
*
LIQUIDO PERITONEAL
`;

test('parseCitoquimicoLiquidosParsed — no muestra el header de departamento como Tipo', () => {
  var out = parseCitoquimicoLiquidosParsed(MUESTRA_TIPO_AUSENTE);
  assert.ok(!/Tipo\s+BACTERIOLOGIA/.test(out.line), 'no debe mostrar BACTERIOLOGIA como Tipo');
});

test('parseCitoquimicoLiquidosParsed — usa COMENTARIO como respaldo del Tipo cuando el scan primario falla', () => {
  var out = parseCitoquimicoLiquidosParsed(MUESTRA_TIPO_AUSENTE);
  assert.match(out.line, /Tipo\s+LIQUIDO PERITONEAL/);
});

test('parseCitoquimicoLiquidosParsed — override manual de Tipo sobrevive un reparseo (Reprocesar)', () => {
  clearCitoquimicoTipoOverrideForTests();
  var first = parseCitoquimicoLiquidosParsed(MUESTRA_TIPO_AUSENTE);
  assert.match(first.line, /Tipo\s+LIQUIDO PERITONEAL/);

  var fingerprint = citoquimicoTipoFingerprintFromLine_(first.line);
  assert.ok(fingerprint, 'debe calcular una huella de las otras columnas');
  assert.equal(citoquimicoTipoValueFromLine_(first.line), 'LIQUIDO PERITONEAL');

  setCitoquimicoTipoOverride(fingerprint, 'LIQUIDO ASCITICO');
  assert.equal(getCitoquimicoTipoOverride(fingerprint), 'LIQUIDO ASCITICO');

  // Reprocesar vuelve a parsear desde el mismo texto SOME crudo; el override
  // debe reaplicarse porque la huella depende de las otras columnas, no del
  // índice ni del texto crudo.
  var reprocessed = parseCitoquimicoLiquidosParsed(MUESTRA_TIPO_AUSENTE);
  assert.match(reprocessed.line, /Tipo\s+LIQUIDO ASCITICO/);

  clearCitoquimicoTipoOverrideForTests();
});

test('citoquimicoTipoFingerprintFromLine_ — no depende del valor de Tipo', () => {
  var a = 'Liq:\tTipo LIQUIDO PERITONEAL Dens 1.010 pH 7.40 Glu 90';
  var b = 'Liq:\tTipo LIQUIDO ASCITICO Dens 1.010 pH 7.40 Glu 90';
  assert.equal(citoquimicoTipoFingerprintFromLine_(a), citoquimicoTipoFingerprintFromLine_(b));
});

// El portal a veces manda química y bacteriología del MISMO citoquímico como dos
// envíos separados (cada uno con la frase clave una sola vez); "Actualizar labs"
// los junta con "\n\n---\n\n" (mismo separador que lab-bulk-paste.mjs). Esta pareja
// SÍ debe fusionarse — nada ajeno entre las dos apariciones.
var QUIMICA_SOLA = `QUIMICA CLINICA
CITOQUIMICO DE LIQUIDOS CORPORALES
Estudio		Resultado	Unidades	Valor de Referencia
DENSIDAD
*
1.015
PH
*
7.5
GLUCOSA
*
783.0
mg/dL
PROTEINAS
*
600
mg/dL
LDH
*
10
IU/L`;
var BACTERIOLOGIA_SOLA = `BACTERIOLOGIA
CITOQUIMICO DE LIQUIDOS CORPORALES
Estudio		Resultado	Unidades	Valor de Referencia
ASPECTO
*
CLARO
COMENTARIO
*
LIQUIDO PERITONEAL`;

test('parseCitoquimicoLiquidosParsed — química y bacteriología llegadas como envíos separados sí se fusionan', () => {
  var texto = QUIMICA_SOLA + '\n\n---\n\n' + BACTERIOLOGIA_SOLA;
  var out = parseCitoquimicoLiquidosParsed(texto);
  assert.match(out.line, /Glu\s+783\.0/, 'debe conservar la glucosa del líquido, no perderla al fusionar');
  assert.match(out.line, /Tipo\s+LIQUIDO PERITONEAL/);
});

test('parseCitoquimicoLiquidosParsed — un envío ajeno de QS/BH entre las dos apariciones no contamina Glu/Prot/LDH', () => {
  // Mismo día, "Actualizar labs" trae de por medio un estudio de Química Sanguínea
  // de OTRO envío (glucosa sérica 54, nada que ver con el líquido). No debe
  // fusionarse como si fuera la pareja legítima de QUIMICA_SOLA.
  var envioAjeno = `QUIMICA CLINICA
GLUCOSA
54
mg/dL`;
  var texto = QUIMICA_SOLA + '\n\n---\n\n' + envioAjeno + '\n\n---\n\n' + BACTERIOLOGIA_SOLA;
  var out = parseCitoquimicoLiquidosParsed(texto);
  assert.ok(!/Glu\s+54\b/.test(out.line), 'no debe mostrar la glucosa sérica del envío ajeno como si fuera del líquido');
});

// Caso real reportado: dos solicitudes del mismo día — una Química Sanguínea
// (QS) y una CITOQUIMICO DE LIQUIDOS CORPORALES (química + bacteriología).
// "Actualizar labs" trae la mitad "química" del citoquímico, LUEGO la QS
// completa de en medio, y al final la mitad "bacteriología" — la QS ajena
// queda en el hueco entre las dos apariciones de la frase clave. Sin una
// pareja segura, se prefiere una sola mitad (la que quede, aquí la de
// bacteriología) antes que fusionar y arrastrar valores séricos ajenos.
var QS_SOLICITUD_AJENA = `QUIMICA CLINICA
GLUCOSA EN SANGRE
Estudio		Resultado	Unidades	Valor de Referencia
GLUCOSA EN SANGRE
B
54
mg/dL	60 - 100
PROTEINAS TOTALES
Estudio		Resultado	Unidades	Valor de Referencia
PROTEINAS TOTALES
B
5.4
g/dL	6.1 - 7.9
ALBUMINA
Estudio		Resultado	Unidades	Valor de Referencia
ALBUMINA
B
2.9
g/dL	3.6 - 5.5
LDH DESHIDROGENASA LACTICA
Estudio		Resultado	Unidades	Valor de Referencia
LDH DESHIDROGENASA LACTICA
A
252
UI/L	91 - 180`;
var CITOQUIMICO_QUIMICA_MITAD = `QUIMICA CLINICA
CITOQUIMICO DE LIQUIDOS CORPORALES
Estudio		Resultado	Unidades	Valor de Referencia
DENSIDAD
*
1.015
PH
*
7.5
GLUCOSA
*
597.0
mg/dL
PROTEINAS
*
1176
mg/dL
LDH
*
19
IU/L	`;
var CITOQUIMICO_BACTERIOLOGIA_MITAD = `BACTERIOLOGIA
CITOQUIMICO DE LIQUIDOS CORPORALES
Estudio		Resultado	Unidades	Valor de Referencia
ASPECTO
*
LIGERO XANTOCROMICO
COMENTARIO
*
LIQUIDO PERITONEAL`;

test('parseCitoquimicoLiquidosParsed — "Actualizar labs" con QS de otra solicitud metida entre las dos mitades del citoquímico no mezcla valores séricos', () => {
  var texto =
    CITOQUIMICO_QUIMICA_MITAD + '\n\n---\n\n' + QS_SOLICITUD_AJENA + '\n\n---\n\n' + CITOQUIMICO_BACTERIOLOGIA_MITAD;
  var out = parseCitoquimicoLiquidosParsed(texto);
  assert.match(out.line, /Tipo\s+LIQUIDO PERITONEAL/, 'conserva al menos el Tipo (vía COMENTARIO de la mitad que queda)');
  assert.ok(!/Glu\s+54\b/.test(out.line), 'no debe traer la glucosa sérica (54) de la QS ajena');
  assert.ok(!/LDH\s+252\b/.test(out.line), 'no debe traer el LDH sérico (252) de la QS ajena');
  assert.ok(!/Glu\s+597\.0/.test(out.line), 'sin pareja segura, tampoco se arriesga a mostrar la glucosa real (mitades no fusionadas)');
});
