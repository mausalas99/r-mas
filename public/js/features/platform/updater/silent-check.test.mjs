import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SILENT_UPDATE_CHECK_MIN_MS,
  shouldRunSilentUpdateCheck,
  shouldSurfaceUpdateCheckError,
  updateNotAvailableToastKind,
} from './silent-check.mjs';

describe('shouldRunSilentUpdateCheck', () => {
  it('runs when never checked', () => {
    assert.equal(shouldRunSilentUpdateCheck(1_000, 0), true);
  });

  it('skips inside the throttle window', () => {
    assert.equal(
      shouldRunSilentUpdateCheck(SILENT_UPDATE_CHECK_MIN_MS - 1, 1),
      false
    );
  });

  it('runs after the throttle window', () => {
    assert.equal(
      shouldRunSilentUpdateCheck(1 + SILENT_UPDATE_CHECK_MIN_MS, 1),
      true
    );
  });
});

describe('updateNotAvailableToastKind', () => {
  it('is silent by default (boot / Actualizar labs)', () => {
    assert.equal(updateNotAvailableToastKind({ checkFeedback: false }, {}), null);
  });

  it('toasts up-to-date only after a manual search', () => {
    assert.equal(
      updateNotAvailableToastKind({ checkFeedback: true }, {}),
      'up-to-date'
    );
  });

  it('keeps repair/reinstall failures visible', () => {
    assert.equal(
      updateNotAvailableToastKind({ pendingRepairUpdateCheck: true }, {}),
      'repair-error'
    );
    assert.equal(
      updateNotAvailableToastKind({ checkFeedback: false }, { reinstallFailed: true }),
      'repair-error'
    );
  });
});

describe('shouldSurfaceUpdateCheckError', () => {
  it('hides network blips on silent checks', () => {
    assert.equal(
      shouldSurfaceUpdateCheckError({
        checkFeedback: false,
        pendingRepairUpdateCheck: false,
        updateModalMode: 'upgrade',
      }),
      false
    );
  });

  it('shows errors for manual search, repair, and downgrade', () => {
    assert.equal(shouldSurfaceUpdateCheckError({ checkFeedback: true }), true);
    assert.equal(shouldSurfaceUpdateCheckError({ pendingRepairUpdateCheck: true }), true);
    assert.equal(shouldSurfaceUpdateCheckError({ updateModalMode: 'downgrade' }), true);
  });
});
