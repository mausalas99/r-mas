import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStepComplete } from './estado-actual-registro-steps.mjs';

/** Minimal form: a map of selector → input value; unknown selectors find nothing. */
function fakeForm(values, lists) {
  lists = lists || {};
  return {
    querySelector(sel) {
      return sel in values ? { value: values[sel], checked: !!values[sel] } : null;
    },
    querySelectorAll(sel) {
      return (lists[sel] || []).map(function (v) {
        return { value: v };
      });
    },
  };
}

const ALL_VITALS = {
  '[data-ea-vital="tas"]': '120',
  '[data-ea-vital="tad"]': '70',
  '[data-ea-vital="fc"]': '84',
  '[data-ea-vital="fr"]': '17',
  '[data-ea-vital="temp"]': '36.6',
  '[data-ea-vital="sat"]': '97',
};

test('vitals step is complete only when all six signs have a value', () => {
  assert.equal(isStepComplete(fakeForm(ALL_VITALS), 0), true);
  const missing = Object.assign({}, ALL_VITALS, { '[data-ea-vital="sat"]': '' });
  assert.equal(isStepComplete(fakeForm(missing), 0), false);
  assert.equal(isStepComplete(fakeForm({}), 0), false);
});

test('glucose step needs every standard row filled', () => {
  const sel = '#ea-glu-list .ea-glu-row--standard [data-ea-glu-value]';
  const list = '#ea-glu-list [data-ea-glu-value]';
  assert.equal(isStepComplete(fakeForm({}, { [sel]: ['155', '180'], [list]: ['155', '180'] }), 1), true);
  assert.equal(isStepComplete(fakeForm({}, { [sel]: ['155', ''], [list]: ['155', ''] }), 1), false);
  assert.equal(isStepComplete(fakeForm({}, {}), 1), false);
});

test('balance step needs ingresos and egresos in the same turno', () => {
  assert.equal(isStepComplete(fakeForm({ '#ea-io-ing-t1': '200', '#ea-io-egr-t1': '160' }), 2), true);
  assert.equal(isStepComplete(fakeForm({ '#ea-io-ing-t1': '200', '#ea-io-egr-t2': '160' }), 2), false);
  assert.equal(isStepComplete(fakeForm({ '#ea-io-ing-t1': '200' }), 2), false);
});

test('review step never auto-completes', () => {
  assert.equal(isStepComplete(fakeForm(ALL_VITALS), 3), false);
});
