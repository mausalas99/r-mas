import test from 'node:test';
import assert from 'node:assert/strict';
import { representativeFechaHoraForGroup_, appendResLabChunksToBox } from './lab-panel-output-helpers.mjs';

test('representativeFechaHoraForGroup_: picks the most recent set in the cluster', () => {
  var group = {
    sets: [
      { fecha: '10/08/2026', hora: '08:00' },
      { fecha: '10/08/2026', hora: '11:44' },
      { fecha: '09/08/2026', hora: '23:00' },
    ],
  };
  var rep = representativeFechaHoraForGroup_(group);
  assert.equal(rep.fecha, '10/08/2026');
  assert.equal(rep.hora, '11:44');
});

test('representativeFechaHoraForGroup_: falls back to the first set when timestamps are unparseable', () => {
  var group = { sets: [{ fecha: '', hora: '' }, { fecha: '', hora: '' }] };
  var rep = representativeFechaHoraForGroup_(group);
  assert.equal(rep, group.sets[0]);
});

test('representativeFechaHoraForGroup_: empty group returns an empty object', () => {
  assert.deepEqual(representativeFechaHoraForGroup_({}), {});
  assert.deepEqual(representativeFechaHoraForGroup_(null), {});
});

test('appendResLabChunksToBox is exported for the Laboratorio render path', () => {
  assert.equal(typeof appendResLabChunksToBox, 'function');
});
