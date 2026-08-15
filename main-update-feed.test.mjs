/**
 * Static check: main.js wires the default updater feed from lib/update-feed.js.
 * When UPDATE_FEED_MODE === 'worker' the app must override electron-builder's
 * baked-in GitHub feed with UPDATE_WORKER_URL before any update check; the
 * downgrade/reinstall paths (buildGenericFeedUrl) must stay untouched.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MAIN_SRC = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');

test('main.js imports UPDATE_FEED_MODE/UPDATE_WORKER_URL from lib/update-feed.js', () => {
  assert.match(
    MAIN_SRC,
    /require\(['"]\.\/lib\/update-feed\.js['"]\)/,
    'main.js should require ./lib/update-feed.js'
  );
});

test('getAutoUpdater() sets the generic Worker feed when UPDATE_FEED_MODE is worker', () => {
  const start = MAIN_SRC.indexOf('function getAutoUpdater()');
  assert.ok(start >= 0, 'getAutoUpdater definition missing');
  const end = MAIN_SRC.indexOf('\n}', start);
  const body = MAIN_SRC.slice(start, end);

  assert.match(body, /UPDATE_FEED_MODE === 'worker'/);
  assert.match(body, /setFeedURL\(\{\s*provider:\s*'generic',\s*url:\s*UPDATE_WORKER_URL\s*\}\)/);

  const onAvailableIdx = body.indexOf("_autoUpdater.on('update-available'");
  const feedIdx = body.indexOf('UPDATE_FEED_MODE');
  assert.ok(
    feedIdx >= 0 && onAvailableIdx > feedIdx,
    'feed override must happen before update-available listener / any check'
  );
});

test('downgrade/reinstall paths still build GitHub-tag feed URLs (unchanged)', () => {
  assert.match(MAIN_SRC, /url: buildGenericFeedUrl\(current\)/);
  assert.match(MAIN_SRC, /url: buildGenericFeedUrl\(target\)/);
});

test("setFeedURL override only fires when UPDATE_FEED_MODE === 'worker' ('github' mode is a no-op)", () => {
  const start = MAIN_SRC.indexOf('function getAutoUpdater()');
  assert.ok(start >= 0, 'getAutoUpdater definition missing');
  const end = MAIN_SRC.indexOf('\n}', start);
  const body = MAIN_SRC.slice(start, end);

  const guardIdx = body.indexOf("UPDATE_FEED_MODE === 'worker'");
  assert.ok(guardIdx >= 0, "getAutoUpdater must guard the override with UPDATE_FEED_MODE === 'worker'");

  const setFeedIdx = body.indexOf('setFeedURL', guardIdx);
  assert.ok(
    setFeedIdx >= 0 && setFeedIdx > guardIdx,
    'setFeedURL(worker feed) must appear inside the worker-mode guard, not unconditionally'
  );

  // The only setFeedURL call to UPDATE_WORKER_URL in this function must be the
  // guarded one — i.e. there is exactly one setFeedURL call in getAutoUpdater(),
  // and it comes after the mode check, so 'github' mode never reaches it.
  const setFeedCalls = body.match(/setFeedURL\(/g) || [];
  assert.equal(setFeedCalls.length, 1, 'getAutoUpdater() should only call setFeedURL for the worker override');
});
