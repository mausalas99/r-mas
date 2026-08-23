import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localYmdToday,
  collectDailyDiuresisMl,
  latestNumericDiuresisMl,
  buildDescongestionStats,
} from './estado-actual-cardio-data.mjs';

function historialRow(recordedAt, egr) {
  return { recordedAt: recordedAt, io: { egrParts: [{ kind: 'diuresis', label: 'DIURESIS', value: egr }] } };
}

test('localYmdToday returns a YYYY-MM-DD string', () => {
  assert.match(localYmdToday(), /^\d{4}-\d{2}-\d{2}$/);
});

test('collectDailyDiuresisMl pulls numeric diuresis values, filtered by sinceYmd', () => {
  const historial = [
    historialRow(new Date(2026, 2, 12, 8, 0).toISOString(), 1500),
    historialRow(new Date(2026, 2, 13, 8, 0).toISOString(), 2000),
    historialRow(new Date(2026, 2, 14, 8, 0).toISOString(), 'NC'),
  ];
  assert.deepEqual(collectDailyDiuresisMl(historial), [1500, 2000]);
  assert.deepEqual(collectDailyDiuresisMl(historial, '2026-03-13'), [2000]);
});

test('latestNumericDiuresisMl picks the most recent numeric row', () => {
  const historial = [
    historialRow(new Date(2026, 2, 12, 8, 0).toISOString(), 1500),
    historialRow(new Date(2026, 2, 14, 8, 0).toISOString(), 'NC'),
    historialRow(new Date(2026, 2, 13, 8, 0).toISOString(), 2000),
  ];
  assert.equal(latestNumericDiuresisMl(historial), 2000);
});

test('latestNumericDiuresisMl returns null when nothing numeric', () => {
  assert.equal(latestNumericDiuresisMl([]), null);
});

test('buildDescongestionStats sums historial diuresis since inicioDescongestion and applies overrides', () => {
  const patient = {
    registeredAt: new Date(2026, 2, 10, 9, 0).toISOString(),
    cardio: {
      inicioDescongestion: '2026-03-12',
      overrides: {},
      diureticSegments: [
        { tipo: 'Furosemida', inicio: '2026-03-12', dosis: '40 mg IV cada 12h', endedAt: null },
      ],
    },
  };
  const monitoreo = {
    historial: [
      historialRow(new Date(2026, 2, 11, 8, 0).toISOString(), 1000), // before inicioDescongestion — excluded
      historialRow(new Date(2026, 2, 12, 8, 0).toISOString(), 1500),
      historialRow(new Date(2026, 2, 13, 8, 0).toISOString(), 2000),
    ],
  };
  const stats = buildDescongestionStats(patient, monitoreo, { asOfDate: '2026-03-13', balanceGlobalMl: -1200 });
  assert.equal(stats.diasInternamiento, 4);
  assert.equal(stats.diasDescongestion, 2);
  assert.equal(stats.diuresisAcumuladaMl, 3500);
  assert.equal(stats.diuresisHoyMl, 2000);
  assert.equal(stats.furosemidaAcumuladaMg, 160);
  assert.equal(stats.balanceAcumuladoMl, -1200);

  const overridden = buildDescongestionStats(
    { ...patient, cardio: { ...patient.cardio, overrides: { diuresisAcumuladaMl: 9999 } } },
    monitoreo,
    { asOfDate: '2026-03-13', balanceGlobalMl: -1200 }
  );
  assert.equal(overridden.diuresisAcumuladaMl, 9999);
});
