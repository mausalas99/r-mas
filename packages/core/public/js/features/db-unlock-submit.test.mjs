import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// db-unlock-submit.mjs is the encrypted-DB unlock gate. Its unexpected-error
// catch blocks must always show the Spanish fallback and keep logging the
// raw error (the owner needs it for support) — never render it to the doctor.
const src = readFileSync(fileURLToPath(new URL('./db-unlock-submit.mjs', import.meta.url)), 'utf8');

const sites = ["'Error al recuperar.'", "'Error al desbloquear.'"];

describe('db-unlock-submit shows Spanish copy on unlock/recovery failure, not the raw error', () => {
  for (const fallback of sites) {
    it(`${fallback} is preceded by a console.error and never shows err.message`, () => {
      const idx = src.indexOf(fallback);
      assert.notEqual(idx, -1, `expected to find ${fallback} in db-unlock-submit.mjs`);
      const catchIdx = src.lastIndexOf('catch (err) {', idx);
      assert.notEqual(catchIdx, -1, 'expected a preceding catch (err) block');
      const block = src.slice(catchIdx, idx + fallback.length);

      assert.doesNotMatch(
        block,
        /setUnlockError\(\(err/,
        'must never show the raw error message to the user'
      );
      assert.match(block, /console\.error\(/, 'the raw error must still be logged for support');
    });
  }
});
