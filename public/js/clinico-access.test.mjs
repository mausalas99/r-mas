import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICO_UNLOCK_PHRASE,
  matchesClinicoUnlockPhrase,
  isClinicoUnlocked,
  isClinicoAccessHidden,
} from './clinico-access.mjs';

test('matchesClinicoUnlockPhrase accepts exact phrase', () => {
  assert.equal(matchesClinicoUnlockPhrase(CLINICO_UNLOCK_PHRASE), true);
});

test('matchesClinicoUnlockPhrase ignores case and accents', () => {
  assert.equal(matchesClinicoUnlockPhrase('Entiendo, usare mi criterio clincio'), true);
});

test('isClinicoAccessHidden is true until unlocked', () => {
  assert.equal(isClinicoAccessHidden({}), true);
  assert.equal(isClinicoAccessHidden({ hideManejoSection: false }), false);
});

test('isClinicoUnlocked respects clinicoUnlocked flag', () => {
  assert.equal(isClinicoUnlocked({ clinicoUnlocked: true, hideManejoSection: true }), true);
  assert.equal(
    isClinicoAccessHidden({ clinicoUnlocked: true, hideManejoSection: true }),
    true
  );
  assert.equal(
    isClinicoAccessHidden({ clinicoUnlocked: true, hideManejoSection: false }),
    false
  );
});
