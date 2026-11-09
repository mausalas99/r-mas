import test from 'node:test';
import assert from 'node:assert/strict';
import { cultivosTextFromHistory } from './copy-team-cultivos.mjs';

const set = (id, res) => ({ id, fecha: '2026-11-01', resLabs: [res] });

test('copies positive and negative cultivos, skipping repeats', () => {
  const pos = 'UROCULTIVO 01/11: E. coli\nCuenta: >100,000 UFC';
  const neg = 'HEMOCULTIVO 02/11: Sin desarrollo';
  const text = cultivosTextFromHistory([set('a', pos), set('b', neg), set('c', pos)]);
  assert.equal(text.split('E. coli').length, 2);
  assert.match(text, /Sin desarrollo/);
});

test('empty history gives empty text', () => {
  assert.equal(cultivosTextFromHistory([]), '');
});
