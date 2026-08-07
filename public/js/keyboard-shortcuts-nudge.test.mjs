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
