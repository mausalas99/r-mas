import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEstadoActualPaste } from './estado-actual-parser.mjs';

const PROSA = `* NEUROLÓGICAMENTE: ALERTA, GLASGOW 15, FOUR 16.
* VENTILATORIAMENTE: SATURANDO 96% AL AIRE AMBIENTE, CON FRECUENCIA RESPIRATORIA DE 16 RPM.
* HEMODINÁMICAMENTE: TA 130/80 MMHG CON ANTIHIPERTENSIVOS, FC DE 111 LPM.
* HEMATOINFECCIOSO: AFEBRIL 36.5°C. PLAQUETOPENIA LEVE (PLT 106,000/MCL).
* NEFROMETABOLICO: GLUCEMIA CENTRAL 370 MG/DL, K 3.0 MEQ/L.`;

test('prosa larga', () => {
  const p = parseEstadoActualPaste(PROSA);
  assert.ok(p.ok);
  assert.deepEqual(p.vitals, { tas: 130, tad: 80, fc: 111, fr: 16, temp: 36.5, sat: 96 });
  assert.equal(p.soporteHint, 'Aire ambiente');
  assert.equal(p.warnings.length, 0);
});

test('prosa abreviada N/V/HD/HI', () => {
  const p = parseEstadoActualPaste(
    'V: FR 17 RPM, SATURACIÓN DE OXÍGENO DE 95% AL AIRE AMBIENTE.\nHD: CLÍNICAMENTE ESTABLE, CON TA 107/49 MMHG, FC 70 LPM.\nHI: AFEBRIL AL MOMENTO DE LA VALORACIÓN, CON TEMPERATURA DE 36 °C.'
  );
  assert.deepEqual(p.vitals, { tas: 107, tad: 49, fc: 70, fr: 17, temp: 36, sat: 95 });
});

test('SO2 con O2 suplementario y TA 98/58', () => {
  const p = parseEstadoActualPaste('V: FR 18 RPM SO2 97% CON 1 L DE O2 SUPLEMENTARIO.\nHD: TA 98/58 MMHG SIN VASOPRESOR, FC 103 LPM.');
  assert.equal(p.vitals.sat, 97);
  assert.equal(p.vitals.tas, 98);
  assert.equal(p.vitals.fr, 18);
});

test('formato por líneas sigue igual', () => {
  const p = parseEstadoActualPaste('T°: 38.7 °C\nFC: 113 LPM\nFR: 19 RPM\nTA: 140/60 MMHG\nSAT: 97% AL AIRE AMBIENTE');
  assert.deepEqual(p.vitals, { tas: 140, tad: 60, fc: 113, fr: 19, temp: 38.7, sat: 97 });
});

const NM =
  'NM: NORMAL PICADA DIABÉTICA | PLAN DE LÍQUIDOS: HARTMANN 83.33 CC POR HORA | GLUCOMETRÍAS CAPILARES: 187 MG/DL | GLUCOMETRÍAS CENTRAL: 160 MG/DL. INGRESOS 710 CC EN 1 TURNO, EGRESOS NO CUANTIFICACIONES, BALANCE NO VALORABLE, DIURESIS PRESERVADA.';

test('prosa NM: dxt, ingresos, egresos NC, balance', () => {
  const p = parseEstadoActualPaste('N: ORIENTADA.\nHI: AFEBRIL, CON TEMPERATURA DE 36 °C.\n' + NM);
  assert.deepEqual(p.glucometrias.map((g) => g.value), [187, 160]);
  assert.equal(p.io.ing, 710);
  assert.equal(p.io.egr, 'NC');
  assert.ok(p.recognized.includes('balance-ignored'));
  assert.equal(p.warnings.length, 0);
});

test('prosa: ingresos + egresos numéricos y capilares en lista', () => {
  const p = parseEstadoActualPaste(
    'NM: CAPILARES: 145, 130, 91  MG/DL | INGRESOS 1750 CC EGRESOS 480 CC 2T; BALANCE TOTAL NV CC'
  );
  assert.deepEqual(p.glucometrias.map((g) => g.value), [145, 130, 91]);
  assert.equal(p.io.ing, 1750);
  assert.equal(p.io.egr, 480);
});
