import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEstadoActualText } from './estado-actual-text.mjs';
import { buildHiTempClause } from './estado-actual-text-build.mjs';
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
  assert.match(textNc, /BALANCE NC\b/);

  const text = buildEstadoActualText(m.estadoClinico, deriveSnapshot(m), {
    balanceTurno: 200,
    balanceGlobal: 200,
  });
  assert.doesNotMatch(text, /^S:/m);
  assert.match(text, /FOUR 15\/16/);
  assert.match(text, /TA 120\/80/);
  assert.match(text, /GLUCOMETRÍAS CAPILARES \(140 MG\/DL\)/);
  assert.doesNotMatch(text, /GLUCOMETRÍAS CAPILARES \(140, ___/);
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
  assert.match(text, /GLUCOMETRÍAS CAPILARES \(182 MG\/DL\)/);
});

test('buildEstadoActualText omits glucometrías clause when none registered', () => {
  const m = emptyMonitoreo();
  const text = buildEstadoActualText(m.estadoClinico, { vitals: {}, glucometrias: [], io: {} }, {}, {});
  assert.doesNotMatch(text, /GLUCOMETRÍAS CAPILARES/);
  assert.doesNotMatch(text, /RESCATES DE INSULINA/);
});

test('buildEstadoActualText une antihipertensivos, diuréticos y NM en formato corto', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.antihta = 'NIFEDIPINO 60MG VO C/12H | SACUBITRILO/VALSARTÁN 200MG VO C/12H';
  m.estadoClinico.diureticos = 'FUROSEMIDA 80MG IV C/8H';
  m.estadoClinico.antitromboticos = 'ENOXAPARINA 40MG SC C/24H | ACIDO ACETILSALICILICO 100MG VO C/24H';
  m.estadoClinico.nm = 'INSULINA GLARGINA 10UI SC C/24H | LEVOTIROXINA 50MCG VO C/24H';
  m.estadoClinico.abx = 'MEROPENEM 1G IV C/8H DIA 13';
  const text = buildEstadoActualText(m.estadoClinico, { vitals: {}, glucometrias: [], io: {} }, {}, {});
  assert.match(text, /ANTIHIPERTENSIVOS: NIFEDIPINO 60MG VO C\/12H, SACUBITRILO\/VALSARTÁN 200MG VO C\/12H/);
  assert.match(text, /DIURÉTICOS: FUROSEMIDA 80MG IV C\/8H/);
  assert.match(
    text,
    /ANTITROMBOTICOS: ENOXAPARINA 40MG SC C\/24H, ACIDO ACETILSALICILICO 100MG VO C\/24H/
  );
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
  assert.match(text, /25 KCAL\/KG \(1750 KCAL\)/);
  assert.doesNotMatch(text, /PARA PESO DE/i);
});

test('buildEstadoActualText dieta suplemento sin requerimiento calórico', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'SUPLEMENTO';
  const text = buildEstadoActualText(m.estadoClinico, { vitals: {}, glucometrias: [], io: {} }, {}, {});
  const nmLine = text.split('\n').find((line) => line.startsWith('NM:'));
  assert.match(nmLine, /^NM: DIETA SUPLEMENTO \|\|/);
  assert.doesNotMatch(nmLine, /CALCULADA A/);
  assert.doesNotMatch(nmLine, /KCAL\/KG/);
});

test('buildEstadoActualText SOME *SUPLEMENTO sin cláusula calórica', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = '*SUPLEMENTO';
  m.estadoClinico.kcalKg = '25';
  const text = buildEstadoActualText(m.estadoClinico, { vitals: {}, glucometrias: [], io: {} }, {}, {});
  const nmLine = text.split('\n').find((line) => line.startsWith('NM:'));
  assert.match(nmLine, /^NM: DIETA SUPLEMENTO \|\|/);
  assert.doesNotMatch(nmLine, /CALCULADA A/);
});

test('buildHiTempClause documenta pico en paréntesis, no duplica TEMPERATURA', () => {
  const clause = buildHiTempClause({ temp: 36, tempPeak: 37.2 }, { tempPeak: '08:00' });
  assert.equal(clause, 'TEMPERATURA 36 °C (PICO 37.2 °C @ 08:00)');
});

test('buildEstadoActualText bomba de insulina muestra glucosa sin sufijo mg/dL', () => {
  const m = emptyMonitoreo();
  m.historial.push({
    id: '1',
    recordedAt: '2026-06-22T14:00:00.000Z',
    vitals: {},
    bombaInsulina: [
      { value: 320, units: 7 },
      { value: 209, units: 3 },
      { value: 257, units: 0.5 },
    ],
    glucometrias: [],
    io: {},
  });
  const text = buildEstadoActualText(m.estadoClinico, deriveSnapshot(m), {}, {});
  assert.match(text, /BOMBA DE INSULINA \(320 \(7 U\), 209 \(3 U\), 257 \(0\.5 U\)\)/);
  assert.doesNotMatch(text, /mg\/dL/i);
});

test('buildEstadoActualText marca INESTABLE con hipotensión', () => {
  const m = emptyMonitoreo();
  m.historial.push({
    id: '1',
    recordedAt: '2026-06-22T14:00:00.000Z',
    vitals: { tas: 85, tad: 55, fc: 80 },
    glucometrias: [],
    io: {},
  });
  const text = buildEstadoActualText(m.estadoClinico, deriveSnapshot(m), {}, {});
  const hdLine = text.split('\n').find((line) => line.startsWith('HD:'));
  assert.match(hdLine, /^HD: INESTABLE,/);
});

test('buildEstadoActualText marca INESTABLE con vasopresores aunque TA normal', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.vasop = 'NOREPINEFRINA 0.1 MCG/KG/MIN';
  const text = buildEstadoActualText(
    m.estadoClinico,
    { vitals: { tas: 120, tad: 70, fc: 80 }, glucometrias: [], io: {} },
    {},
    {}
  );
  const hdLine = text.split('\n').find((line) => line.startsWith('HD:'));
  assert.match(hdLine, /^HD: INESTABLE,/);
});

test('buildEstadoActualText mantiene ESTABLE con hipertensión aislada', () => {
  const m = emptyMonitoreo();
  m.historial.push({
    id: '1',
    recordedAt: '2026-06-22T14:00:00.000Z',
    vitals: { tas: 155, tad: 95, fc: 80 },
    glucometrias: [],
    io: {},
  });
  const text = buildEstadoActualText(m.estadoClinico, deriveSnapshot(m), {}, {});
  const hdLine = text.split('\n').find((line) => line.startsWith('HD:'));
  assert.match(hdLine, /^HD: ESTABLE,/);
});

test('buildEstadoActualText marca FEBRIL cuando temperatura actual supera umbral', () => {
  const m = emptyMonitoreo();
  m.historial.push({
    id: '1',
    recordedAt: '2026-06-22T14:00:00.000Z',
    vitals: { temp: 38.4 },
    glucometrias: [],
    io: {},
  });
  const text = buildEstadoActualText(m.estadoClinico, deriveSnapshot(m), {}, {});
  const hiLine = text.split('\n').find((line) => line.startsWith('HI:'));
  assert.match(hiLine, /^HI: FEBRIL,/);
});

test('buildEstadoActualText marca AFEBRIL con pico febril documentado en paréntesis', () => {
  const m = emptyMonitoreo();
  m.historial = [
    {
      id: '1',
      recordedAt: '2026-06-22T06:00:00.000Z',
      vitals: { temp: 36 },
      vitalSeries: {
        temp: [
          { value: 38.2, time: '08:00' },
          { value: 36, time: '16:00' },
        ],
      },
      glucometrias: [],
      io: {},
    },
  ];
  const text = buildEstadoActualText(m.estadoClinico, deriveSnapshot(m), {}, {});
  const hiLine = text.split('\n').find((line) => line.startsWith('HI:'));
  assert.match(hiLine, /^HI: AFEBRIL,/);
  assert.match(hiLine, /PICO 38\.2 °C/);
});

test('buildEstadoActualText temperatura con pico en turno', () => {
  const m = emptyMonitoreo();
  m.historial = [
    {
      id: '1',
      recordedAt: '2026-06-22T06:00:00.000Z',
      vitals: { temp: 36, fr: 15, sat: 97, tas: 120, tad: 60, fc: 98 },
      vitalSeries: {
        temp: [
          { value: 37.2, time: '08:00' },
          { value: 36, time: '16:00' },
        ],
      },
      glucometrias: [],
      io: {},
    },
  ];
  const snap = deriveSnapshot(m);
  const text = buildEstadoActualText(m.estadoClinico, snap, {}, {});
  const hiLine = text.split('\n').find((line) => line.startsWith('HI:'));
  assert.match(hiLine, /TEMPERATURA 36 °C \(PICO 37\.2 °C @ 08:00\)/);
  assert.doesNotMatch(hiLine, /TEMPERATURA.*TEMPERATURA/);
});
