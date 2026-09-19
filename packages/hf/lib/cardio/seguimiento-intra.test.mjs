import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyRondaEntry } from './seguimiento-intra.mjs';

test('emptyRondaEntry has all daily-round fields defaulted', () => {
  const r = emptyRondaEntry();
  assert.equal(r.date, '');
  assert.equal(r.ta, '');
  assert.equal(r.fc, null);
  assert.equal(r.diuresis6h, null);
  assert.equal(r.plan, '');
  assert.equal(r.sixMwt, null);
});
