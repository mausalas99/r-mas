/**
 * Registro vitals: TA (TAS/TAD pair) edge values, partial entries, round trips.
 * Synthetic data only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { vitalSeriesFromMedicion, vitalSeriesToLegacyFields } from './estado-actual-vital-series.mjs';
import { normalizeVitalReading } from './estado-actual-vital-series-helpers.mjs';
import { formatCensoSignosColumn } from '../censo-signos-format.mjs';

const ta = (tas, tad) => formatCensoSignosColumn({ vitals: { tas, tad } }, {}).filter((l) => l.startsWith('TA'));

describe('Registro TA display (Censo column)', () => {
  it('pair, partial, empty, zero', () => {
    assert.deepEqual(ta(120, 80), ['TA: 120/80 MMHG']);
    assert.deepEqual(ta(120, null), ['TA: 120/— MMHG']);
    assert.deepEqual(ta(undefined, 70), ['TA: —/70 MMHG']);
    assert.deepEqual(ta(null, null), []);
    assert.deepEqual(ta('', ''), []); // was «TA: —/— MMHG»
    assert.deepEqual(ta(120, ''), ['TA: 120/— MMHG']);
    assert.deepEqual(ta(0, 0), ['TA: 0/0 MMHG']); // a typed 0 is shown, not hidden
  });
});

describe('Registro stored readings', () => {
  it('empty or null reading is dropped, never read as 0', () => {
    for (const v of [null, undefined, '', '  ', 'abc', NaN]) {
      assert.equal(normalizeVitalReading({ value: v, time: '08:00' }), null, String(v));
    }
    assert.deepEqual(normalizeVitalReading({ value: 0 }), { value: 0, time: undefined });
    const s = vitalSeriesFromMedicion({ vitalSeries: { tas: [{ value: null, time: '08:00' }, { value: 130 }], tad: [{ value: '' }] } });
    assert.deepEqual(s.tas.map((r) => r.value), [130]);
    assert.deepEqual(s.tad, []);
  });

  it('seeded round trip: series → legacy fields → series keeps every value of up to 2 readings; stored series keeps 4', () => {
    let seed = 7;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 500; i++) {
      const n = 1 + Math.floor(rnd() * 4);
      const mk = (lo, hi) =>
        Array.from({ length: n }, (_, k) => ({ value: lo + Math.floor(rnd() * (hi - lo)), time: String(8 + k).padStart(2, '0') + ':00' }));
      const series = { tas: mk(60, 260), tad: mk(30, 160) };
      // stored series is lossless (equal values allowed: two TAD of 60 are two readings)
      const back = vitalSeriesFromMedicion({ vitalSeries: series });
      assert.deepEqual(back.tas, series.tas);
      assert.deepEqual(back.tad, series.tad);
      // legacy mirror keeps the last reading as the main value
      const leg = vitalSeriesToLegacyFields(series);
      assert.equal(leg.vitals.tas, series.tas[n - 1].value);
      assert.equal(leg.vitals.tad, series.tad[n - 1].value);
      // legacy only (no stored series): last two survive. FLAG for owner: the order comes back
      // as [last, previous] (reversed), so values are compared sorted, not by position.
      const fromLeg = vitalSeriesFromMedicion({ vitals: leg.vitals, alteredAt: leg.alteredAt });
      const want = series.tas.slice(-2).map((r) => r.value);
      assert.deepEqual(fromLeg.tas.map((r) => r.value).sort(), want.slice().sort());
    }
  });
});
