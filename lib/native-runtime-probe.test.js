const { test } = require('node:test');
const assert = require('node:assert/strict');
const { probeNativeRuntime } = require('./native-runtime-probe.js');

test('probeNativeRuntime returns structured result', () => {
  const r = probeNativeRuntime();
  assert.equal(typeof r.ok, 'boolean');
  assert.equal(typeof r.sqlcipher.ok, 'boolean');
  assert.equal(typeof r.argon2.ok, 'boolean');
  assert.ok(Array.isArray(r.failures));
});
