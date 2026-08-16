const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  OLD_APP_ID,
  legacyAppIdPaths,
  cleanupLegacyAppIdFiles,
} = require('./legacy-appid-cleanup.js');

test('legacyAppIdPaths: mac lists the plist, saved state, and caches under the old appId', () => {
  const paths = legacyAppIdPaths('/Users/x', 'darwin');
  assert.ok(paths.every((p) => p.includes(OLD_APP_ID)));
  assert.ok(paths.some((p) => p.endsWith('.plist')));
  assert.ok(paths.some((p) => p.endsWith('.savedState')));
  assert.ok(paths.some((p) => p.endsWith('.ShipIt')));
});

test('legacyAppIdPaths: non-mac platforms have no bundle-id-named files to clean', () => {
  assert.deepEqual(legacyAppIdPaths('/home/x', 'win32'), []);
  assert.deepEqual(legacyAppIdPaths('/home/x', 'linux'), []);
});

test('cleanupLegacyAppIdFiles: removes every mac path, best-effort', () => {
  const calls = [];
  const fakeFs = { rmSync: (p) => calls.push(p) };
  const removed = cleanupLegacyAppIdFiles(fakeFs, '/Users/x', 'darwin');
  assert.equal(removed, legacyAppIdPaths('/Users/x', 'darwin').length);
  assert.equal(calls.length, removed);
});

test('cleanupLegacyAppIdFiles: a failing rmSync on one path does not stop the rest', () => {
  const calls = [];
  const fakeFs = {
    rmSync: (p) => {
      if (p.endsWith('.plist')) throw new Error('EPERM');
      calls.push(p);
    },
  };
  const removed = cleanupLegacyAppIdFiles(fakeFs, '/Users/x', 'darwin');
  assert.equal(removed, legacyAppIdPaths('/Users/x', 'darwin').length - 1);
  assert.equal(calls.length, removed);
});

test('cleanupLegacyAppIdFiles: no-op on non-mac, never touches fs', () => {
  const fakeFs = { rmSync: () => { throw new Error('should not be called'); } };
  const removed = cleanupLegacyAppIdFiles(fakeFs, '/home/x', 'win32');
  assert.equal(removed, 0);
});
