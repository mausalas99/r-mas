import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearCitoquimicoLiquidos, procesarLabs } from './labs.js';

const MUESTRA_PERITONEAL = `
Expediente:	2211202-9	Solicitud:	2605020732
Nombre:	LUIS FERNANDO PEREZ TAPIA	Fecha Registro:	May 2 2026 5:11PM
Sexo:	MASCULINO	Ubicación:	MEDICINA INTERNA 2
Edad:	59	Medico:	A QUIEN CORRESPONDA
 

QUIMICA CLINICA
CITOQUIMICO DE LIQUIDOS CORPORALES
Estudio		Resultado	Unidades	Valor de Referencia
EXAMEN QUIMICO	
*
:
DENSIDAD	
*
1.010
PH	
*
8.5
GLUCOSA	
*
949.0
mg/dL	
PROTEINAS	
*
300
mg/dL	
LDH	
*
6
IU/L	
CITOQUIMICO DE	
*
LIQUIDO PERITONEAL

BACTERIOLOGIA
CITOQUIMICO DE LIQUIDOS CORPORALES
Estudio		Resultado	Unidades	Valor de Referencia
ASPECTO	
*
CLARO
RECUENTO	
A
48
LEUCOCITOS/MM3	0.00 - 5.00
POLIMORFONUCLEARES	
*
PREDOMINIO
%	
LINFOCITOS	
*
%	
ERITROCITOS	
*
ESCASOS
/mm3	
GRAM	
*
NEGATIVO
COMENTARIO	
*
PERITONEAL
`;

test('parsearCitoquimicoLiquidos — líquido peritoneal (química + citología)', () => {
  const out = parsearCitoquimicoLiquidos(MUESTRA_PERITONEAL);
  assert.match(out, /Liq:/);
  assert.match(out, /LIQUIDO PERITONEAL/);
  assert.match(out, /Dens.*1\.010/);
  assert.match(out, /pH.*8\.5/);
  assert.match(out, /Glu.*949/);
  assert.match(out, /Prot.*300/);
  assert.match(out, /LDH.*6/);
  assert.match(out, /Asp.*CLARO/);
  assert.match(out, /Leu.*48/);
  assert.match(out, /PMN.*PREDOMINIO/);
  assert.match(out, /Eri.*ESCASOS/);
  assert.match(out, /Gram.*NEGATIVO/);
  assert.match(out, /Obs.*PERITONEAL/);
});

test('procesarLabs no mezcla glucosa del líquido con QS', () => {
  const { resLabs } = procesarLabs(MUESTRA_PERITONEAL);
  const qs = resLabs.find((l) => l.startsWith('QS\t'));
  const liq = resLabs.find((l) => l.startsWith('Liq:\t'));
  assert.ok(liq, 'debe incluir bloque Liq');
  if (qs) assert.ok(!qs.includes('949'), 'QS no debe tomar Glu 949 del ascitis');
});
