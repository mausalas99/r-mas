import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEstadoActualText } from './estado-actual-text.mjs';
import { emptyMonitoreo, deriveSnapshot } from './estado-actual-data.mjs';

test('buildEstadoActualText usa placeholders y omite línea S', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.four = '15';
  m.historial.push({
    id: '1',
    recordedAt: '2026-05-26T08:00:00.000Z',
    vitals: { tas: 120, tad: 80, fc: 82 },
    glucometrias: [{ value: 140, time: '08:00' }],
    io: { ing: 500, egr: 300 },
  });
  const textNc = buildEstadoActualText(
    m.estadoClinico,
    { vitals: {}, glucometrias: [], io: { ing: 500, egr: 'NC' } },
    { balanceTurno: NaN },
    {}
  );
  assert.match(textNc, /DIURESIS NC/);

  const text = buildEstadoActualText(m.estadoClinico, deriveSnapshot(m), {
    balanceTurno: 200,
    balanceGlobal: 200,
  });
  assert.doesNotMatch(text, /^S:/m);
  assert.match(text, /FOUR 15\/16/);
  assert.match(text, /TA 120\/80/);
  assert.match(text, /GLUCOMETRÍAS CAPILARES \(140/);
  assert.match(text, /BALANCE \+200 CC/);
  assert.match(text, /INGRESOS 500 CC, DIURESIS 300 CC/);
  // Formato igual a soap-estado: "ANALGESIA CON ___" (no hay subjetivo S:)
  assert.match(text, /ANALGESIA CON ___/);
  assert.match(text, /DIURÉTICOS: NINGUNO/);
  assert.match(text, /SIN VASOPRESORES/);
  assert.match(text, /RESCATES DE INSULINA DISPONIBLES, NO APLICADOS ACTUALMENTE/);
});

test('buildEstadoActualText documenta rescates aplicados', () => {
  const m = emptyMonitoreo();
  m.historial.push({
    id: '2',
    recordedAt: '2026-05-26T14:00:00.000Z',
    vitals: {},
    glucometrias: [{ value: 248, time: '14:00', altered: true, rescueUnits: 6, postRescueValue: 182 }],
    io: {},
  });
  const text = buildEstadoActualText(m.estadoClinico, deriveSnapshot(m), {}, {});
  assert.match(
    text,
    /RESCATES DE INSULINA APLICADOS \(6 U DE INSULINA RÁPIDA @ 14:00, DXT POST-RESCATE 182 MG\/DL\)/
  );
  assert.match(text, /GLUCOMETRÍAS CAPILARES \(182/);
});

test('buildEstadoActualText une antihipertensivos, diuréticos y NM en formato corto', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.antihta = 'NIFEDIPINO 60MG VO C/12H | SACUBITRILO/VALSARTÁN 200MG VO C/12H';
  m.estadoClinico.diureticos = 'FUROSEMIDA 80MG IV C/8H';
  m.estadoClinico.nm = 'INSULINA GLARGINA 10UI SC C/24H | LEVOTIROXINA 50MCG VO C/24H';
  m.estadoClinico.abx = 'MEROPENEM 1G IV C/8H DIA 13';
  const text = buildEstadoActualText(m.estadoClinico, { vitals: {}, glucometrias: [], io: {} }, {}, {});
  assert.match(text, /ANTIHIPERTENSIVOS: NIFEDIPINO 60MG VO C\/12H, SACUBITRILO\/VALSARTÁN 200MG VO C\/12H/);
  assert.match(text, /DIURÉTICOS: FUROSEMIDA 80MG IV C\/8H/);
  assert.match(text, /ANTIBIÓTICOS: MEROPENEM 1G IV C\/8H DIA 13/);
  assert.match(text, /INSULINA GLARGINA 10UI SC C\/24H \|\| LEVOTIROXINA 50MCG VO C\/24H/);
});

test('buildEstadoActualText incluye GR PROTEINA cuando proteinG está definido', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'NORMAL PICADA';
  m.estadoClinico.kcal = '2000';
  m.estadoClinico.proteinG = '70';
  const text = buildEstadoActualText(m.estadoClinico, { vitals: {}, glucometrias: [], io: {} }, {}, {
    patientPeso: 60,
  });
  assert.match(text, /\+ 70 GR PROTEINA/);
});

test('buildEstadoActualText calcula kcal total con peso del paciente', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.kcalKg = '25';
  const text = buildEstadoActualText(m.estadoClinico, { vitals: {}, glucometrias: [], io: {} }, {}, {
    patientPeso: 70,
  });
  assert.match(text, /25 KCAL\/KG \(1750 KCAL\) PARA PESO DE 70 KG/);
});
