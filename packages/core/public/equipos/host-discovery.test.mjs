import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEquiposApiBase } from './host-discovery.mjs';

test('resolveEquiposApiBase uses the page origin', async () => {
  const prev = globalThis.window;
  globalThis.window = { location: { protocol: 'https:', host: 'equipos.example' } };
  try {
    assert.equal(await resolveEquiposApiBase(), 'https://equipos.example');
  } finally {
    globalThis.window = prev;
  }
});
