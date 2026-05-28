import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  vitalSeriesFromMedicion,
  vitalSeriesToLegacyFields,
  MAX_VITAL_READINGS_PER_DAY,
} from './estado-actual-vital-series.mjs';

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
});
