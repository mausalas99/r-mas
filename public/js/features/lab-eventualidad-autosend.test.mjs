import test from 'node:test';
import assert from 'node:assert/strict';

const { autosendLabsToEventualidad } = await import('./lab-eventualidad-autosend.mjs');

test('autosendLabsToEventualidad — no patient', async () => {
  var out = await autosendLabsToEventualidad(null, [{ fecha: '21/07/2026', resLabs: ['BH\tHb 9'] }]);
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'no-patient');
});

test('autosendLabsToEventualidad — empty sets', async () => {
  var out = await autosendLabsToEventualidad({ id: 'p1', eventualidades: { entries: [] } }, []);
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'empty');
});
