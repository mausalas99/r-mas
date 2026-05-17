import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsearCitoquimicoLiquidos,
  procesarLabs,
  evaluarCriteriosLight_,
  normalizarProteinasFluidoGdl_,
  esLiquidoPleural_,
} from './labs.js';

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
  assert.match(out, /Prot.*\b3\b/);
  assert.match(out, /LDH.*6/);
  assert.match(out, /Asp.*CLARO/);
  assert.match(out, /Leu.*48/);
  assert.match(out, /PMN.*PREDOMINIO/);
  assert.match(out, /Eri.*ESCASOS/);
  assert.match(out, /Gram.*NEGATIVO/);
  assert.match(out, /Obs.*PERITONEAL/);
});

const MUESTRA_PLEURAL = `
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
8.0
GLUCOSA	
*
78.0
mg/dL	
PROTEINAS	
*
6000
mg/dL	
LDH	
*
549
IU/L	
CITOQUIMICO DE	
*
LÍQUIDO PLEURAL
ALBUMINA
Estudio		Resultado	Unidades	Valor de Referencia
ALBUMINA	
*
3.4
g/dL	3.2 - 5.5
LDH DESHIDROGENASA LACTICA
Estudio		Resultado	Unidades	Valor de Referencia
LDH DESHIDROGENASA LACTICA	
A
549
UI/L	91 - 180
COLESTEROL
Estudio		Resultado	Unidades	Valor de Referencia
COLESTEROL	
B
88
mg/dL	130 - 200
BACTERIOLOGIA
CITOQUIMICO DE LIQUIDOS CORPORALES
Estudio		Resultado	Unidades	Valor de Referencia
ASPECTO	
*
XANTOCROMICO SANGUINOLENTO
RECUENTO	
A
3,000
LEUCOCITOS/MM3	0.00 - 5.00
POLIMORFONUCLEARES	
*
---
%	
LINFOCITOS	
*
100
%	
ERITROCITOS	
*
5,000
/mm3	
GRAM	
*
ABUNDANTES LEUCOCITOS
COMENTARIO	
*
LIQUIDO PLEURAL
`;

test('normalizarProteinasFluidoGdl — mg/dL del laboratorio', () => {
  assert.equal(normalizarProteinasFluidoGdl_('6000'), 6);
  assert.equal(normalizarProteinasFluidoGdl_('300'), 3);
});

test('parsearCitoquimicoLiquidos — líquido pleural + Light exudado', () => {
  const out = parsearCitoquimicoLiquidos(MUESTRA_PLEURAL);
  assert.match(out, /Liq:/);
  assert.match(out, /PLEURAL/i);
  assert.match(out, /Prot.*\b6\b/);
  assert.match(out, /Alb.*3\.4/);
  assert.match(out, /LDH.*549/);
  assert.match(out, /Asp.*XANTOCROMICO/);
  assert.match(out, /Leu.*3000/);
  assert.match(out, /Linf.*100/);
  assert.match(out, /Light EXUDADO/i);
  assert.match(out, /LDH>2\/3/);
});

test('evaluarCriteriosLight — exudado por LDH > 2/3 ULN', () => {
  const t = evaluarCriteriosLight_(6, 549, null, null, 180);
  assert.match(t, /EXUDADO/);
  assert.match(t, /LDH>2\/3/);
});

test('evaluarCriteriosLight — trasudado si los 3 criterios son negativos', () => {
  const t = evaluarCriteriosLight_(2, 100, 8, 250, 180);
  assert.match(t, /TRASUDADO/);
  assert.ok(!/EXUDADO/.test(t));
});

test('esLiquidoPleural detecta comentario y tipo', () => {
  assert.equal(esLiquidoPleural_('', 'LIQUIDO PLEURAL', ''), true);
  assert.equal(esLiquidoPleural_('LIQUIDO PERITONEAL', '', ''), false);
});

test('procesarLabs no mezcla glucosa del líquido con QS', () => {
  const { resLabs } = procesarLabs(MUESTRA_PERITONEAL);
  const qs = resLabs.find((l) => l.startsWith('QS\t'));
  const liq = resLabs.find((l) => l.startsWith('Liq:\t'));
  assert.ok(liq, 'debe incluir bloque Liq');
  if (qs) assert.ok(!qs.includes('949'), 'QS no debe tomar Glu 949 del ascitis');
});
