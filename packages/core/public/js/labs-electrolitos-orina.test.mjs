import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseElectrolitosOrina_ } from './labs-fluidos-misc.mjs';
import { parseESC_ } from './labs-chemistry.mjs';

const REPORTE = `QUIMICA CLINICA
POTASIO EN ORINA
Estudio\t\tResultado\tUnidades\tValor de Referencia
POTASIO EN ORINA\t
B
25
mmol/L\t40 - 80
SODIO URINARIO
Estudio\t\tResultado\tUnidades\tValor de Referencia
SODIO EN ORINA\t
B
69
mmol/L\t80 - 180
CREATININA EN ORINA
Estudio\t\tResultado\tUnidades\tValor de Referencia
CREATININA EN ORINA\t
A
84.92
mg/dL\t0.00 - 0.00
COMENTARIO DE MUESTRA\t
*
CLORO
Estudio\t\tResultado\tUnidades\tValor de Referencia
CLORO\t
B
64
mmol/L\t98.0 - 110.0
COMENTARIO DE MUESTRA
Estudio\t\tResultado\tUnidades\tValor de Referencia
COMENTARIO DE LA MUESTRA\t
*
ORINA ALEATORIA`;

test('CLORO con muestra de orina va a EU, no a Cl sérico', () => {
  assert.equal(parseElectrolitosOrina_(REPORTE), 'EU\tNa 69 K 25 Cl 64 Cr 84.92');
  assert.equal(parseESC_(REPORTE, {}), '');
});

test('CLORO sérico sin comentario de orina no va a EU', () => {
  const suero = 'CLORO\nEstudio\tResultado\nCLORO\t\n98\nmmol/L\t98.0 - 110.0';
  assert.equal(parseElectrolitosOrina_(suero), '');
});
