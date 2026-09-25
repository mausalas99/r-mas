import { test } from 'node:test';
import assert from 'node:assert/strict';
import { procesarLabs } from './labs.js';
import {
  DEMO_SAME_DAY_AM_SOME,
  DEMO_SAME_DAY_PM_SOME,
  DEMO_HEAVILY_ALTERED_SOME,
} from './tour-pitch-labs-edge-cases.mjs';
import { buildPitchLabHistoryEntries, buildPitchLabHistoryEntry } from './tour-pitch-labs.mjs';

/** Counts abnormal-flagged tokens ("*" suffix) that procesarLabs' resLabs render. */
function countAlteredTokens(resLabs) {
  const joined = (resLabs || []).join('\n');
  const matches = joined.match(/\S+\*(?=\s|$)/g);
  return matches ? matches.length : 0;
}

test('DEMO_SAME_DAY_AM_SOME y DEMO_SAME_DAY_PM_SOME: mismo día, horas distintas, parsean sin error', () => {
  const am = procesarLabs(DEMO_SAME_DAY_AM_SOME);
  const pm = procesarLabs(DEMO_SAME_DAY_PM_SOME);
  assert.ok(am.resLabs.length > 0);
  assert.ok(pm.resLabs.length > 0);
  assert.match(DEMO_SAME_DAY_AM_SOME, /Fecha Registro:\tAug 19 2026 6:30AM/);
  assert.match(DEMO_SAME_DAY_PM_SOME, /Fecha Registro:\tAug 19 2026 4:15PM/);
  // Distinct altered values per draw, so the hour-group split is visibly meaningful
  // (not two identical copies of the same toma).
  assert.match(am.resLabs.join('\n'), /K 3\.1\*/);
  assert.match(pm.resLabs.join('\n'), /Cr 1\.9\*/);
});

test('buildPitchLabHistoryEntries: las dos tomas del mismo día comparten fecha bucket', () => {
  const today = new Date('2026-08-19T09:00:00');
  const entries = buildPitchLabHistoryEntries(today);
  const am = entries.find((e) => e.id === 'pitch-lab-sameday-am');
  const pm = entries.find((e) => e.id === 'pitch-lab-sameday-pm');
  assert.ok(am && pm, 'both same-day entries are seeded');
  assert.equal(am.fecha, pm.fecha, 'same dayOffset must land on the same date bucket');
  assert.notEqual(am.sourceText, pm.sourceText, 'each draw keeps its own source text/hour');
});

test('DEMO_HEAVILY_ALTERED_SOME: 17+ valores alterados en una sola toma', () => {
  const { resLabs } = procesarLabs(DEMO_HEAVILY_ALTERED_SOME);
  const altered = countAlteredTokens(resLabs);
  assert.ok(
    altered >= 17,
    `expected >= 17 altered values, got ${altered} in: ${resLabs.join(' | ')}`
  );
});

test('buildPitchLabHistoryEntry: la toma con 17+ alterados se puede construir como entrada de historial', () => {
  const today = new Date('2026-08-19T09:00:00');
  const entry = buildPitchLabHistoryEntry(
    { id: 'pitch-lab-heavily-altered', dayOffset: -3, report: DEMO_HEAVILY_ALTERED_SOME },
    today
  );
  assert.equal(entry.id, 'pitch-lab-heavily-altered');
  assert.ok(entry.resLabs.length > 0);
  assert.ok(countAlteredTokens(entry.resLabs) >= 17);
});
