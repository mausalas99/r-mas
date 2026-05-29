import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAnionGap_, procesarLabs } from './labs.js';

const MUESTRA_SOLO_COAG = `
Expediente:	2180481-3	Solicitud:	2605090476
Nombre:	MARGARITA LIZETH GARZA HERNANDEZ	Fecha Registro:	May 9 2026 10:07AM
Sexo:	FEMENINO	Ubicación:	SERVICIO CLÍNICO 1
Edad:	36	Medico:	A QUIEN CORRESPONDA

HEMATOLOGIA
TIEMPO DE PROTROMBINA Y TROMBOPLASTINA
Estudio		Resultado	Unidades	Valor de Referencia
TIEMPO DE PROTROMBINA
A
13.70
SEG.	10.25 - 13.20
TESTIGO
*
11.76
SEG
INR
*
1.17
TIEMPO DE TROMBOPLASTINA
*
33.3
SEG	29.1 - 38.4
TESTIGO
*
31.2
SEG
OBSERVACIONES
*
`;

test('procesarLabs incluye BH con TP/TTP/INR cuando no hay biometría', () => {
  const { resLabs } = procesarLabs(MUESTRA_SOLO_COAG);
  const bh = resLabs.find((l) => /^BH[:\t]/.test(l));
  assert.ok(bh, 'debe producir línea BH');
  assert.match(bh, /TP\s+13\.7/);
  assert.match(bh, /TTP\s+33\.3/);
  assert.match(bh, /INR\s+1\.17/);
});

test('computeAnionGap_ corrige AG por hipoalbuminemia cuando hay albúmina', () => {
  const sinCorreccion = computeAnionGap_('134.5', '102.3', '17.1');
  const corregido = computeAnionGap_('134.5', '102.3', '17.1', '2.1');
  assert.equal(sinCorreccion, '15.1*');
  assert.equal(corregido, '19.8*');
});
