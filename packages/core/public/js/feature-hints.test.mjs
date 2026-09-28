import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURE_HINTS, HINTS_RELEASE, activeHints } from './feature-hints.mjs';

test('every «Guía» and this release\'s «Nuevo» hints are offered', () => {
  const ids = activeHints().map((h) => h.id);
  for (const h of FEATURE_HINTS) {
    if (h.kind === 'guia') assert.ok(ids.includes(h.id), h.id);
    else if (h.release === HINTS_RELEASE) assert.ok(ids.includes(h.id), h.id);
  }
  assert.ok(ids.includes('g-labs'));
  assert.ok(ids.includes('datos-tachar-843'));
  assert.ok(!ids.includes('datos-842'));
});

test('«Nuevo» hints from an older release are not offered', () => {
  const old = { id: 'viejo-841', release: '8.4.1', title: 'Viejo', steps: [{ sel: 'body', text: 'x' }] };
  const ids = activeHints([...FEATURE_HINTS, old]).map((h) => h.id);
  assert.ok(!ids.includes('viejo-841'));
});

test('every «Nuevo» hint names its release and every hint has a unique id', () => {
  for (const h of FEATURE_HINTS) {
    if (h.kind !== 'guia') assert.match(String(h.release || ''), /^\d+\.\d+\.\d+$/, h.id);
  }
  const ids = FEATURE_HINTS.map((h) => h.id);
  assert.equal(new Set(ids).size, ids.length);
});

