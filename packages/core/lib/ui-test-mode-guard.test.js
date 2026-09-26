const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkUiTestModeBoot } = require('./ui-test-mode-guard.js');

const DEFAULT_UD = '/Users/x/Library/Application Support/r-plus';
const FRESH_UD = '/tmp/rplus-ui-test/userdata';

test('uiTestMode off: always ok, whatever the URL/path', () => {
  assert.deepEqual(
    checkUiTestModeBoot({
      uiTestMode: false,
      cloudSyncUrl: 'https://rplus-sync.rmas-workersdev.workers.dev',
      userDataPath: DEFAULT_UD,
      defaultUserDataPath: DEFAULT_UD,
    }),
    { ok: true }
  );
});

test('uiTestMode on: real Worker hostname refused', () => {
  const res = checkUiTestModeBoot({
    uiTestMode: true,
    cloudSyncUrl: 'https://rplus-sync.rmas-workersdev.workers.dev',
    userDataPath: FRESH_UD,
    defaultUserDataPath: DEFAULT_UD,
  });
  assert.equal(res.ok, false);
  assert.match(res.reason, /local mock/);
});

test('uiTestMode on: non-localhost URL refused', () => {
  const res = checkUiTestModeBoot({
    uiTestMode: true,
    cloudSyncUrl: 'https://example.com',
    userDataPath: FRESH_UD,
    defaultUserDataPath: DEFAULT_UD,
  });
  assert.equal(res.ok, false);
});

test('uiTestMode on: unset URL refused', () => {
  const res = checkUiTestModeBoot({
    uiTestMode: true,
    cloudSyncUrl: '',
    userDataPath: FRESH_UD,
    defaultUserDataPath: DEFAULT_UD,
  });
  assert.equal(res.ok, false);
});

test('uiTestMode on: real default userData path refused even with a good URL', () => {
  const res = checkUiTestModeBoot({
    uiTestMode: true,
    cloudSyncUrl: 'http://localhost:8787',
    userDataPath: DEFAULT_UD,
    defaultUserDataPath: DEFAULT_UD,
  });
  assert.equal(res.ok, false);
  assert.match(res.reason, /userData path/);
});

test('uiTestMode on: local mock URL + fresh userData path passes', () => {
  assert.deepEqual(
    checkUiTestModeBoot({
      uiTestMode: true,
      cloudSyncUrl: 'http://localhost:8787',
      userDataPath: FRESH_UD,
      defaultUserDataPath: DEFAULT_UD,
    }),
    { ok: true }
  );
});

test('uiTestMode on: 127.0.0.1 URL also counts as local', () => {
  assert.deepEqual(
    checkUiTestModeBoot({
      uiTestMode: true,
      cloudSyncUrl: 'http://127.0.0.1:8787',
      userDataPath: FRESH_UD,
      defaultUserDataPath: DEFAULT_UD,
    }),
    { ok: true }
  );
});
