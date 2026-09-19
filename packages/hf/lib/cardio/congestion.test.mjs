import test from 'node:test';
import assert from 'node:assert/strict';
import { upsertPocusDay, getPocusDay, emptyCongestionChecklist, emptyLungZones, LUNG_ZONE_KEYS } from './congestion.mjs';

test('upsertPocusDay replaces same calendar day', () => {
  let hist = [];
  hist = upsertPocusDay(hist, {
    date: '2026-03-14',
    vciCm: 1.96,
    vexus: 0,
    congestionScore: 3,
    lungPattern: 'B',
    stevenson: 'A',
    note: '',
  });
  hist = upsertPocusDay(hist, {
    date: '2026-03-14',
    vciCm: 1.9,
    vexus: 0,
    congestionScore: 2,
    lungPattern: 'B',
    stevenson: 'A',
    note: 'update',
  });
  assert.equal(hist.length, 1);
  assert.equal(getPocusDay(hist, '2026-03-14').congestionScore, 2);
});

test('upsertPocusDay stores and round-trips fevi', () => {
  let hist = [];
  hist = upsertPocusDay(hist, {
    date: '2026-03-14',
    vciCm: 1.96,
    vexus: 0,
    congestionScore: 3,
    fevi: '55%',
    note: '',
  });
  assert.equal(getPocusDay(hist, '2026-03-14').fevi, '55%');

  hist = upsertPocusDay(hist, {
    date: '2026-03-14',
    vciCm: 1.9,
    congestionScore: 2,
    note: 'update without fevi key omitted',
  });
  // fevi is preserved when the key is omitted from the update record.
  assert.equal(getPocusDay(hist, '2026-03-14').fevi, '55%');
});

test('upsertPocusDay defaults fevi to empty string when absent', () => {
  const hist = upsertPocusDay([], { date: '2026-03-15', vciCm: 2 });
  assert.equal(getPocusDay(hist, '2026-03-15').fevi, '');
});

test('emptyCongestionChecklist has selector fields', () => {
  const c = emptyCongestionChecklist();
  assert.equal(c.pvy, null);
  assert.equal(c.soplo, null);
  assert.ok('estertores' in c);
});

test('upsertPocusDay preserves checklist when omitted on same-day update', () => {
  let hist = [];
  hist = upsertPocusDay(hist, {
    date: '2026-03-14',
    vciCm: 1.96,
    vexus: 0,
    congestionScore: 3,
    checklist: Object.assign(emptyCongestionChecklist(), { pvy: true, soplo: false }),
  });
  hist = upsertPocusDay(hist, {
    date: '2026-03-14',
    vciCm: 1.9,
    congestionScore: 2,
    note: 'pocus only',
  });
  const day = getPocusDay(hist, '2026-03-14');
  assert.equal(day.congestionScore, 2);
  assert.equal(day.note, 'pocus only');
  assert.equal(day.checklist.pvy, true);
  assert.equal(day.checklist.soplo, false);
});

test('emptyLungZones has all 8 zone keys defaulting to empty string', () => {
  const z = emptyLungZones();
  assert.equal(LUNG_ZONE_KEYS.length, 8);
  LUNG_ZONE_KEYS.forEach((k) => assert.equal(z[k], ''));
});

test('upsertPocusDay stores and round-trips lungZones', () => {
  let hist = [];
  const zones = Object.assign(emptyLungZones(), { rAntSup: '1-2', lLatInf: '≥3' });
  hist = upsertPocusDay(hist, { date: '2026-03-14', vciCm: 1.96, lungZones: zones });
  const day = getPocusDay(hist, '2026-03-14');
  assert.equal(day.lungZones.rAntSup, '1-2');
  assert.equal(day.lungZones.lLatInf, '≥3');
});

test('upsertPocusDay preserves lungZones when omitted on same-day update', () => {
  let hist = [];
  const zones = Object.assign(emptyLungZones(), { rAntSup: 'Coalescentes' });
  hist = upsertPocusDay(hist, { date: '2026-03-14', vciCm: 1.96, lungZones: zones });
  hist = upsertPocusDay(hist, { date: '2026-03-14', vciCm: 1.9, note: 'pocus only, lungZones omitted' });
  const day = getPocusDay(hist, '2026-03-14');
  assert.equal(day.lungZones.rAntSup, 'Coalescentes');
});

test('upsertPocusDay defaults lungZones to empty grid when absent', () => {
  const hist = upsertPocusDay([], { date: '2026-03-15', vciCm: 2 });
  const day = getPocusDay(hist, '2026-03-15');
  assert.deepEqual(day.lungZones, emptyLungZones());
});
