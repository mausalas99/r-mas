import test from 'node:test';
import assert from 'node:assert/strict';

test('manejo.mjs y dependencias cargan en Node (imports ESM válidos)', async () => {
  const mod = await import('./manejo.mjs');
  assert.equal(typeof mod.renderManejo, 'function');
  assert.equal(typeof mod.manejoRerender, 'function');
});
