import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  vitalSeriesFromMedicion,
  vitalSeriesToLegacyFields,
  mergeVitalSeriesFromHistorial,
  MAX_VITAL_READINGS_PER_DAY,
} from './estado-actual-vital-series.mjs';
import { validateVitalSeriesTurnLimits } from './estado-actual-panel-vitals.mjs';

describe('estado-actual-vital-series', () => {
  it('reads up to four readings from vitalSeries', () => {
    var med = {
      vitalSeries: {
        fc: [
          { value: 80, time: '08:00' },
          { value: 90, time: '10:00' },
          { value: 100, time: '12:00' },
          { value: 110, time: '14:00' },
        ],
      },
    };
    var series = vitalSeriesFromMedicion(med);
    assert.equal(series.fc.length, MAX_VITAL_READINGS_PER_DAY);
    assert.equal(series.fc[3].value, 110);
  });

  it('mergeVitalSeriesFromHistorial ignores readings outside the turn window', () => {
    var now = new Date(2026, 5, 22, 12, 0, 0);
    var hist = [
      {
        recordedAt: new Date(2026, 5, 20, 0, 0, 0).toISOString(),
        vitalSeries: {
          fc: [
            { value: 80, time: '08:00' },
            { value: 90, time: '12:00' },
            { value: 100, time: '16:00' },
            { value: 110, time: '20:00' },
          ],
        },
      },
      {
        recordedAt: new Date(2026, 5, 22, 0, 0, 0).toISOString(),
        vitalSeries: { fc: [{ value: 72, time: '00:00' }] },
      },
    ];
    var merged = mergeVitalSeriesFromHistorial(hist, 'fc', now);
    assert.deepEqual(
      merged.map(function (r) {
        return r.value + '@' + (r.time || '');
      }),
      ['72@00:00']
    );
  });

  it('mergeVitalSeriesFromHistorial leaves vitals empty on a new calendar day', () => {
    // Lecturas de ayer siguen en la ventana del turno (glu), pero el prefill de SV no las arrastra.
    var now = new Date(2026, 7, 3, 8, 30, 0);
    var hist = [
      {
        recordedAt: new Date(2026, 7, 2, 0, 0, 0).toISOString(),
        vitalSeries: {
          tas: [{ value: 111, time: '10:00' }],
          tad: [{ value: 60, time: '10:00' }],
          fc: [{ value: 64, time: '10:00' }],
        },
      },
    ];
    assert.deepEqual(mergeVitalSeriesFromHistorial(hist, 'tas', now), []);
    assert.deepEqual(mergeVitalSeriesFromHistorial(hist, 'tad', now), []);
    assert.deepEqual(mergeVitalSeriesFromHistorial(hist, 'fc', now), []);
  });

  it('validateVitalSeriesTurnLimits blocks when unique union exceeds cap', () => {
    var now = new Date(2026, 5, 22, 12, 0, 0);
    // Cierre 00:00: lecturas sin hora caen en el fin de ventana; 08/16 son del día previo.
    var recordedAt = new Date(2026, 5, 22, 0, 0, 0).toISOString();
    var hist = [
      {
        recordedAt: recordedAt,
        vitalSeries: { tas: [{ value: 110 }, { value: 120 }] },
      },
    ];
    var blocked = validateVitalSeriesTurnLimits(
      hist,
      { tas: [{ value: 130 }, { value: 140 }, { value: 150 }] },
      now
    );
    assert.equal(blocked.ok, false);
    var fine = validateVitalSeriesTurnLimits(hist, { tas: [{ value: 130 }, { value: 140 }] }, now);
    assert.equal(fine.ok, true);
  });

  it('validateVitalSeriesTurnLimits allows prefilled same readings without double-count', () => {
    var now = new Date(2026, 5, 22, 12, 0, 0);
    var recordedAt = new Date(2026, 5, 22, 0, 0, 0).toISOString();
    var readings = [
      { value: 110, time: '08:00' },
      { value: 120, time: '16:00' },
      { value: 130, time: '00:00' },
      { value: 140 },
    ];
    var hist = [{ recordedAt: recordedAt, vitalSeries: { tas: readings } }];
    var result = validateVitalSeriesTurnLimits(hist, { tas: readings }, now);
    assert.equal(result.ok, true);
  });

  it('maps series to legacy vitals for charts', () => {
    var series = {
      temp: [
        { value: 37.2, time: '08:00' },
        { value: 38.5, time: '14:00' },
      ],
    };
    var leg = vitalSeriesToLegacyFields(series);
    assert.equal(leg.vitals.temp, 38.5);
    assert.equal(leg.vitals.tempPeak, 37.2);
  });

  it('legacy vitals do not duplicate when vitalSeries already has readings', () => {
    var med = {
      vitals: { temp: 36 },
      vitalSeries: {
        temp: [
          { value: 37.2, time: '08:00' },
          { value: 38.5, time: '14:00' },
        ],
      },
    };
    var series = vitalSeriesFromMedicion(med);
    assert.equal(series.temp.length, 2);
    assert.equal(series.temp[1].value, 38.5);
  });
});
