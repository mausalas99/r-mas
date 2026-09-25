import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recordBootOutcome, shouldRollback, DEFAULT_MAX_CONSECUTIVE_FAILURES } from './rollback-tracker.mjs';

describe('recordBootOutcome', () => {
  it('sets lastGoodVersion and clears failures for that version on success', () => {
    const state = recordBootOutcome({ failures: { '2': 1 } }, { version: '2', success: true });
    assert.equal(state.lastGoodVersion, '2');
    assert.equal(state.failures['2'], undefined);
  });

  it('increments the failure count for a version on failure', () => {
    let state = recordBootOutcome(undefined, { version: '3', success: false });
    assert.equal(state.failures['3'], 1);
    state = recordBootOutcome(state, { version: '3', success: false });
    assert.equal(state.failures['3'], 2);
  });

  it('does not touch another version\'s failure count', () => {
    const state = recordBootOutcome({ failures: { '3': 2 } }, { version: '4', success: false });
    assert.equal(state.failures['3'], 2);
    assert.equal(state.failures['4'], 1);
  });
});

describe('shouldRollback', () => {
  it('is false below the failure threshold', () => {
    assert.equal(shouldRollback({ failures: { '5': 1 } }, '5'), false);
  });

  it('is true at the default threshold', () => {
    assert.equal(shouldRollback({ failures: { '5': DEFAULT_MAX_CONSECUTIVE_FAILURES } }, '5'), true);
  });

  it('respects a custom threshold', () => {
    assert.equal(shouldRollback({ failures: { '5': 1 } }, '5', 1), true);
  });

  it('is false for a version with no recorded failures', () => {
    assert.equal(shouldRollback({ failures: {} }, '6'), false);
  });
});
