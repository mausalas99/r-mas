import test from 'node:test';
import assert from 'node:assert/strict';
import { escTxt, renderToken, renderEntry } from './labs-display.mjs';

test('escTxt escapes HTML', () => {
  assert.equal(escTxt('<b>&'), '&lt;b&gt;&amp;');
});

test('renderToken marks altered values', () => {
  assert.match(renderToken('12*'), /lab-value-altered/);
  assert.equal(renderToken('12'), '12');
});

test('renderEntry preserves section label on first line', () => {
  const out = renderEntry('BH\tHb 14');
  assert.match(out[0], /section-lbl/);
  assert.match(out[0], /Hb/);
});
