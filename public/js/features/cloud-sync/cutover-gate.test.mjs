import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowCutoverWizard } from './cutover-gate.mjs';

describe('shouldShowCutoverWizard', () => {
  it('hides when cutover done', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: true, cutoverPending: false }),
      false
    );
  });

  it('shows when pending', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: false, cutoverPending: true }),
      true
    );
  });

  it('hides when done even if pending flag stale (avoid loop)', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: true, cutoverPending: true }),
      false
    );
  });

  it('hides when neither done nor pending', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: false, cutoverPending: false }),
      false
    );
  });
});
