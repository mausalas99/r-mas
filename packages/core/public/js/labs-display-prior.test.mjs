import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderEntry } from './labs-display.mjs';

test('a prior value shows before the new one as «8.1 → 7.6»', () => {
  const [line] = renderEntry('BH\tHb 7.6* Hto 25', null, (sec, label) => (sec === 'BH' && label === 'Hb' ? '8.1' : null));
  assert.match(line, /lab-prior-value[^>]*>8\.1<\/span> <span class="lab-prior-arrow"[^>]*>→<\/span> <strong/);
  assert.equal((line.match(/lab-prior-value/g) || []).length, 1);
});
