import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveObjetivoZones,
  buildObjetivoText,
  buildObjetivoSnapshot,
  isVitalOutOfRange,
  isLabOutOfRange,
} from './objetivo-derive.mjs';

test('isVitalOutOfRange flags values outside the normal range', () => {
  assert.equal(isVitalOutOfRange('fc', 140), true);
  assert.equal(isVitalOutOfRange('fc', 80), false);
  assert.equal(isVitalOutOfRange('fc', ''), false);
  assert.equal(isVitalOutOfRange('fc', null), false);
});

test('isLabOutOfRange compares value against min/max when both present', () => {
  assert.equal(isLabOutOfRange({ value: 20, min: 4, max: 11 }), true);
  assert.equal(isLabOutOfRange({ value: 8, min: 4, max: 11 }), false);
  assert.equal(isLabOutOfRange({ value: 8 }), false);
  assert.equal(isLabOutOfRange(null), false);
});

test('deriveObjetivoZones omits zones with no real data', () => {
  const { zones, hasAnyData } = deriveObjetivoZones({ vitals: {}, labs: [] });
  assert.deepEqual(zones, []);
  assert.equal(hasAnyData, false);
});

test('deriveObjetivoZones builds V and HD from real vitals only', () => {
  const { zones, hasAnyData } = deriveObjetivoZones({
    vitals: { fr: 22, sat: 90, tas: 100, tad: 70, fc: 88, temp: null },
  });
  assert.equal(hasAnyData, true);
  const ids = zones.map((z) => z.id);
  assert.deepEqual(ids, ['V', 'HD']);

  const vZone = zones.find((z) => z.id === 'V');
  assert.equal(vZone.items.length, 2);
  assert.equal(vZone.items[0].text, 'FR 22 rpm');
  assert.equal(vZone.items[0].altered, true); // fr max is 20
  assert.equal(vZone.items[1].text, 'SatO2 90 %');
  assert.equal(vZone.items[1].altered, true); // sat min is 94

  const hdZone = zones.find((z) => z.id === 'HD');
  assert.equal(hdZone.items.length, 3);
  assert.equal(hdZone.items.every((i) => i.altered === false), true);
});

test('deriveObjetivoZones attaches labs to a zone by keyword match, never inventing data', () => {
  const { zones } = deriveObjetivoZones({
    vitals: { temp: 38.5 },
    labs: [
      { key: 'leucocitos', label: 'Leucocitos', value: 18.2, unit: 'x10^3/uL', min: 4.5, max: 11 },
      { key: 'plaquetas', label: 'Plaquetas', value: 250, unit: 'x10^3/uL', min: 150, max: 450 },
    ],
  });
  const hi = zones.find((z) => z.id === 'HI');
  assert.ok(hi, 'HI zone should exist from temp + matching lab');
  // Temp item + leucocitos lab item; plaquetas does not match any HI keyword.
  assert.equal(hi.items.length, 2);
  const leuco = hi.items.find((i) => i.text.startsWith('Leucocitos'));
  assert.ok(leuco);
  assert.equal(leuco.altered, true);
  assert.equal(hi.items.some((i) => i.text.startsWith('Plaquetas')), false);
});

test('isLabOutOfRange trusts a pre-computed altered flag when no min/max is available', () => {
  assert.equal(isLabOutOfRange({ value: 142, altered: true }), true);
  assert.equal(isLabOutOfRange({ value: 90, altered: false }), false);
});

test('deriveObjetivoZones attaches labs carrying only a pre-computed altered flag (paste-parsed "*" convention, no min/max)', () => {
  const { zones } = deriveObjetivoZones({
    vitals: {},
    labs: [{ key: 'glucosa', label: 'GLUCOSA', value: '142', altered: true }],
  });
  const nm = zones.find((z) => z.id === 'NM');
  assert.ok(nm, 'NM zone should exist from the altered glucosa lab');
  assert.equal(nm.items[0].altered, true);
});

test('deriveObjetivoZones ignores labs with no matching zone keyword entirely', () => {
  const { zones } = deriveObjetivoZones({
    vitals: {},
    labs: [{ key: 'colesterol', label: 'Colesterol', value: 300, min: 0, max: 200 }],
  });
  assert.deepEqual(zones, []);
});

test('buildObjetivoText renders one line per zone, marking altered values with *', () => {
  const { zones } = deriveObjetivoZones({ vitals: { fr: 22, sat: 90 } });
  const text = buildObjetivoText(zones);
  assert.equal(text, 'V: FR 22 rpm*, SatO2 90 %*');
});

test('buildObjetivoText returns empty string for no zones', () => {
  assert.equal(buildObjetivoText([]), '');
});

test('buildObjetivoSnapshot stamps confirmedAt using the injected clock', () => {
  const fixed = new Date('2026-08-18T12:00:00.000Z');
  const snapshot = buildObjetivoSnapshot(
    { vitals: { fc: 88 } },
    { now: () => fixed }
  );
  assert.equal(snapshot.confirmedAt, fixed.toISOString());
  assert.equal(snapshot.text, 'HD: FC 88 lpm');
  assert.equal(snapshot.zones.length, 1);
});

test('buildObjetivoSnapshot never invents data when nothing is real', () => {
  const snapshot = buildObjetivoSnapshot({ vitals: {}, labs: [] });
  assert.deepEqual(snapshot.zones, []);
  assert.equal(snapshot.text, '');
});
