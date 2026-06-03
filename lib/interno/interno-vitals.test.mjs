import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInternoMedicion, isGluAltered } from './interno-vitals.mjs';
import { parsePendientesJson, abbreviatePatientName } from './interno-board.mjs';
import { calcVitalsBanner } from './vitals-banner.mjs';

test('isGluAltered flags hypo and hyper', () => {
  assert.equal(isGluAltered(65), true);
  assert.equal(isGluAltered(200), true);
  assert.equal(isGluAltered(110), false);
});

test('buildInternoMedicion sets alteredAt for high FC', () => {
  const out = buildInternoMedicion({
    vitals: { fc: 130 },
    sala: 'Sala 1',
  });
  assert.equal(out.ok, true);
  assert.ok(out.medicion?.alteredAt?.fc);
  assert.equal(out.hasAlterations, true);
});

test('buildInternoMedicion accepts glucometrias only', () => {
  const out = buildInternoMedicion({
    glucometrias: [{ value: 210, time: '22:00' }],
    reporterName: 'Ana',
    sala: 'Sala 1',
  });
  assert.equal(out.ok, true);
  assert.equal(out.medicion?.recordedBy?.name, 'Ana');
  assert.ok(out.medicion?.alteredAt?.glu);
});

test('parsePendientesJson extracts time from legacy lines', () => {
  const items = parsePendientesJson(JSON.stringify(['Endoscopia HOY 14:00', 'Hb mañana']));
  assert.equal(items.length, 2);
  assert.equal(items[0].label, 'Endoscopia HOY 14:00');
  assert.equal(items[0].time, '14:00');
  assert.deepEqual(items[0].badges, []);
});

test('abbreviatePatientName', () => {
  assert.match(abbreviatePatientName('García López María'), /GARCÍA/);
});

test('calcVitalsBanner breached', () => {
  const past = new Date(Date.now() - 5 * 3600000).toISOString();
  const b = calcVitalsBanner(past, '2h');
  assert.equal(b.cls, 'breached');
});
