import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPitchTourSteps } from './tour-pitch-steps.mjs';
import {
  getPitchTourTarget,
  assertPitchTargetsComplete,
  resolvePitchScrollPolicy,
} from './tour-pitch-targets.mjs';

test('cada paso pitch tiene selector y callout (salvo intro y wrap)', () => {
  assertPitchTargetsComplete();
  const optional = new Set(['pitch_intro', 'pitch_problem_laboratoriazo', 'wrap']);
  for (const id of getPitchTourSteps()) {
    const t = getPitchTourTarget(id);
    assert.ok(t, 'target for ' + id);
    assert.ok(t.selector && String(t.selector).trim(), 'selector for ' + id);
    if (!optional.has(id)) {
      assert.ok(t.calloutLabel && String(t.calloutLabel).trim(), 'callout for ' + id);
    }
  }
});

test('resolvePitchScrollPolicy — modal chart steps skip page scroll', () => {
  assert.equal(resolvePitchScrollPolicy('sala_tend_chart'), 'none');
  assert.equal(resolvePitchScrollPolicy('sala_casiopea_lab'), 'none');
  assert.equal(resolvePitchScrollPolicy('pitch_pegar_monitoreo'), 'none');
});

test('resolvePitchScrollPolicy — default target scroll', () => {
  assert.equal(resolvePitchScrollPolicy('pitch_modo_pase'), 'target');
  assert.equal(resolvePitchScrollPolicy('map_sidebar'), 'target');
});

test('PITCH_TOUR_STEPS tiene 29 pasos sin sala_manejo', () => {
  const steps = getPitchTourSteps();
  assert.equal(steps.length, 29);
  assert.ok(!steps.includes('sala_manejo'));
  assert.equal(steps[1], 'pitch_problem_laboratoriazo');
  assert.equal(steps[19], 'pitch_switch_interconsulta');
  assert.equal(steps[20], 'ic_expediente_tabs');
});
