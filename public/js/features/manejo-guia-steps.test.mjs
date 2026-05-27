import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenPathologySteps } from './manejo-guia-steps.mjs';
import { findPathologyById } from '../manejo-pathology-catalog.mjs';

test('flattenPathologySteps numbers globally across sections', () => {
  var entry = findPathologyById('hyperkalemia-acute');
  assert.ok(entry);
  var steps = flattenPathologySteps(entry);
  assert.ok(steps.length >= 3);
  assert.equal(steps[0].number, 1);
  assert.equal(steps[steps.length - 1].number, steps.length);
  assert.equal(steps[0].sectionTitle, 'Estabilización de membrana cardíaca');
});

test('flattenPathologySteps preserves item type', () => {
  var entry = findPathologyById('hyperkalemia-acute');
  var proto = flattenPathologySteps(entry).find(function (s) {
    return s.item.type === 'protocol';
  });
  assert.ok(proto);
  assert.equal(proto.item.protocolId, 'ca-gluconate-bolus');
});
