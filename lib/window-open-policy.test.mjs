import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedExternalUrl } from './window-open-policy.cjs';

test('isAllowedExternalUrl allows http and https', () => {
  assert.equal(isAllowedExternalUrl('https://example.com/path'), true);
  assert.equal(isAllowedExternalUrl('http://10.0.0.1:3738/join'), true);
  assert.equal(isAllowedExternalUrl('HTTPS://GitHub.com'), true);
});

test('isAllowedExternalUrl rejects non-http schemes and garbage', () => {
  assert.equal(isAllowedExternalUrl('file:///etc/passwd'), false);
  assert.equal(isAllowedExternalUrl('javascript:alert(1)'), false);
  assert.equal(isAllowedExternalUrl('sesion-ingreso://import'), false);
  assert.equal(isAllowedExternalUrl(''), false);
  assert.equal(isAllowedExternalUrl(null), false);
});
