import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldOfferTabShortcutsNudge,
  nextMouseTabClickCount,
  MOUSE_TAB_SWITCH_THRESHOLD,
} from './keyboard-shortcuts-nudge.mjs';

describe('keyboard-shortcuts-nudge', () => {
  it('shouldOfferTabShortcutsNudge on 5th tab click (no time window)', () => {
    assert.equal(
      shouldOfferTabShortcutsNudge({
        adopted: false,
        nudgeShownThisSession: false,
        mouseTabClickCount: MOUSE_TAB_SWITCH_THRESHOLD - 1,
      }),
      false
    );
    assert.equal(
      shouldOfferTabShortcutsNudge({
        adopted: false,
        nudgeShownThisSession: false,
        mouseTabClickCount: MOUSE_TAB_SWITCH_THRESHOLD,
      }),
      true
    );
  });

  it('shouldOfferTabShortcutsNudge false when adopted or already shown', () => {
    assert.equal(
      shouldOfferTabShortcutsNudge({
        adopted: true,
        nudgeShownThisSession: false,
        mouseTabClickCount: 10,
      }),
      false
    );
    assert.equal(
      shouldOfferTabShortcutsNudge({
        adopted: false,
        nudgeShownThisSession: true,
        mouseTabClickCount: 10,
      }),
      false
    );
  });

  it('nextMouseTabClickCount increments globally', () => {
    assert.equal(nextMouseTabClickCount(0), 1);
    assert.equal(nextMouseTabClickCount(4), 5);
  });
});

import test from 'node:test';

test('keyboard-shortcuts-nudge — markTabShortcutsAdopted warns on setItem quota error', async () => {
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  
  globalThis.localStorage = {
    getItem() { return null; },
    setItem() {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    },
  };
  
  try {
    const { markTabShortcutsAdopted } = await import('./keyboard-shortcuts-nudge.mjs');
    markTabShortcutsAdopted();
    
    assert.ok(warnings.length > 0, 'console.warn should have been called');
    const msg = warnings[0][0];
    assert.ok(msg.includes('failed to write'), 'warn should mention failed write');
  } finally {
    console.warn = origWarn;
    delete globalThis.localStorage;
  }
});
