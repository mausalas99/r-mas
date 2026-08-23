import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRefsBySectionFromReport } from './labs-report-refs.mjs';

// Reporte real: INR sin rango propio impreso, seguido de TIEMPO DE TROMBOPLASTINA
// con su propio rango (28.9 - 34.1). El rango de tendencia de INR no debe robar el de TTP.
var REPORTE_COAG = `
HEMATOLOGIA
BIOMETRIA HEMATICA COMPLETA
Estudio		Resultado	Unidades	Valor de Referencia
WBC
B
2.89
K/uL	4.10 - 11.10
TIEMPO DE PROTROMBINA Y TROMBOPLASTINA
Estudio		Resultado	Unidades	Valor de Referencia
TIEMPO DE PROTROMBINA
A
15.40
SEG.	10.25 - 13.20
TESTIGO
*
11.76
SEG
INR
*
1.32
TIEMPO DE TROMBOPLASTINA
A
36.2
SEG	28.9 - 34.1
TESTIGO
*
31.5
SEG
OBSERVACIONES
*
FIBRINOGENO
Estudio		Resultado	Unidades	Valor de Referencia
FIBRINOGENO
*
378
mg/dL	150 - 400
`;

test('buildRefsBySectionFromReport no cruza el rango de TTP hacia INR cuando INR no trae rango propio', () => {
  var refs = buildRefsBySectionFromReport(REPORTE_COAG);
  assert.equal(refs.BH.INR, undefined);
  assert.deepEqual(refs.BH.TTP, [28.9, 34.1]);
  assert.deepEqual(refs.BH.TP, [10.25, 13.2]);
});
