import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePitchCultivoHistory, PITCH_DEMO_PATIENT_ID } from './tour-pitch-demo-seed.mjs';
import { PITCH_CULTIVO_LAB_SPECS } from './tour-pitch-cultivos-some.mjs';

test('reconcilePitchCultivoHistory upserts cultivo entries with sourceText', () => {
  const labHistory = {};
  labHistory[PITCH_DEMO_PATIENT_ID] = [
    { id: 'pitch-lab-trend-1', fecha: '01/05/2026', resLabs: [], parsed: {} },
  ];
  reconcilePitchCultivoHistory(labHistory);
  const ids = labHistory[PITCH_DEMO_PATIENT_ID].map((e) => e.id);
  for (const spec of PITCH_CULTIVO_LAB_SPECS) {
    assert.ok(ids.includes(spec.id), 'missing ' + spec.id);
  }
  const at1805 = labHistory[PITCH_DEMO_PATIENT_ID].find((e) => e.id === PITCH_CULTIVO_LAB_SPECS[0].id);
  assert.ok(at1805.sourceText && at1805.sourceText.includes('ESBL'));
});
