import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAppVersion, compareSemver, assertNubeAppVersion, MIN_NUBE_APP_VERSION } from './auth-util.js';

describe('sanitizeAppVersion', () => {
  it('trims and passes through a normal version string', () => {
    assert.equal(sanitizeAppVersion('  8.2.0  '), '8.2.0');
  });

  it('defaults missing/non-string input to empty string', () => {
    assert.equal(sanitizeAppVersion(undefined), '');
    assert.equal(sanitizeAppVersion(null), '');
    assert.equal(sanitizeAppVersion(123), '123');
  });

  it('truncates an oversized value instead of storing it unbounded', () => {
    assert.equal(sanitizeAppVersion('x'.repeat(100)).length, 32);
  });
});

describe('compareSemver', () => {
  it('orders versions numerically, not lexically', () => {
    assert.equal(compareSemver('8.1.9', '8.2.0'), -1);
    assert.equal(compareSemver('8.10.0', '8.2.0'), 1);
    assert.equal(compareSemver('8.2.0', '8.2.0'), 0);
  });

  it('returns 0 (never blocks) for unparseable input', () => {
    assert.equal(compareSemver('', '8.2.0'), 0);
    assert.equal(compareSemver('nightly', '8.2.0'), 0);
  });
});

describe('assertNubeAppVersion', () => {
  it('passes for the exact minimum and newer versions', () => {
    assert.doesNotThrow(() => assertNubeAppVersion(MIN_NUBE_APP_VERSION));
    assert.doesNotThrow(() => assertNubeAppVersion('9.0.0'));
  });

  it('throws update_required for an old version', () => {
    assert.throws(() => assertNubeAppVersion('8.1.9'), { code: 'update_required' });
  });

  it('throws update_required when appVersion is missing (pre-8.2.0 client)', () => {
    assert.throws(() => assertNubeAppVersion(undefined), { code: 'update_required' });
    assert.throws(() => assertNubeAppVersion(''), { code: 'update_required' });
  });
});
