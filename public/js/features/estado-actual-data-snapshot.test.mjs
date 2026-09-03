import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveBpPairsFromHistorial_ } from './estado-actual-data-snapshot.mjs';

test('deriveBpPairsFromHistorial_ pairs TAS/TAD by matching time, not array position', () => {
  var historial = [
    {
      recordedAt: '2026-09-01T06:00:00.000Z',
      vitalSeries: {
        tas: [
          { value: 150, time: '08:00' },
          { value: 140, time: '20:00' },
        ],
        tad: [{ value: 90, time: '20:00' }],
      },
    },
  ];
  var pairs = deriveBpPairsFromHistorial_(historial);
  assert.deepEqual(
    pairs.map(function (p) {
      return [p.tas, p.tad];
    }),
    [
      [140, 90],
      [150, null],
    ],
  );
});

test('deriveBpPairsFromHistorial_ falls back to positional pairing when no times are recorded', () => {
  var historial = [
    {
      recordedAt: '2026-09-01T06:00:00.000Z',
      vitalSeries: {
        tas: [{ value: 150 }, { value: 140 }],
        tad: [{ value: 90 }],
      },
    },
  ];
  var pairs = deriveBpPairsFromHistorial_(historial);
  assert.deepEqual(
    pairs.map(function (p) {
      return [p.tas, p.tad];
    }),
    [
      [150, 90],
      [140, null],
    ],
  );
});
