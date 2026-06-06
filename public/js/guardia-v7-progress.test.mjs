import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadGuardiaV7Progress,
  markGuardiaV7ChapterComplete,
  resetGuardiaV7Chapter,
  isGuardiaV7TrackComplete,
  GUARDIA_V7_PROGRESS_LS_KEY,
} from './guardia-v7-progress.mjs';

function mockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

test('markGuardiaV7ChapterComplete reports wasNew only on first completion', () => {
  const storage = mockStorage();
  const first = markGuardiaV7ChapterComplete('ch-guardia-modo', storage);
  assert.equal(first.wasNew, true);
  assert.deepEqual(first.completedChapters, ['ch-guardia-modo']);

  const second = markGuardiaV7ChapterComplete('ch-guardia-modo', storage);
  assert.equal(second.wasNew, false);
});

test('resetGuardiaV7Chapter removes chapter from progress', () => {
  const storage = mockStorage();
  markGuardiaV7ChapterComplete('ch-guardia-modo', storage);
  markGuardiaV7ChapterComplete('ch-guardia-entrega', storage);
  resetGuardiaV7Chapter('ch-guardia-modo', storage);
  const p = loadGuardiaV7Progress(storage);
  assert.deepEqual(p.completedChapters, ['ch-guardia-entrega']);
  assert.equal(isGuardiaV7TrackComplete(storage), false);
});

test('progress round-trips through storage key', () => {
  const storage = mockStorage();
  markGuardiaV7ChapterComplete('ch-guardia-modo', storage);
  assert.ok(storage.getItem(GUARDIA_V7_PROGRESS_LS_KEY));
});
