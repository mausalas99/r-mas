import test from 'node:test';
import assert from 'node:assert/strict';

const { autosendLabsToEventualidad, autosendLabsEventualidadForStored } = await import(
  './lab-eventualidad-autosend.mjs'
);

test('autosendLabsToEventualidad — disabled (no lab interpret in EV)', async () => {
  var out = await autosendLabsToEventualidad(
    { id: 'p1', eventualidades: { entries: [] } },
    [{ fecha: '21/07/2026', resLabs: ['BH\tHb 9'] }]
  );
  assert.equal(out.ok, true);
  assert.equal(out.skipped, 'disabled');
});

test('autosendLabsToEventualidad — disabled even without patient', async () => {
  var out = await autosendLabsToEventualidad(null, []);
  assert.equal(out.ok, true);
  assert.equal(out.skipped, 'disabled');
});

test('autosendLabsEventualidadForStored — never sends', async () => {
  var out = await autosendLabsEventualidadForStored({ p1: [{ fecha: '06/08/2026' }] });
  assert.equal(out.sent, 0);
  assert.equal(out.skipped, 1);
});
