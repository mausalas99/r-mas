import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { UPDATE_FEED_MODE, UPDATE_WORKER_URL } from './update-feed.mjs';

const require = createRequire(import.meta.url);
const cjs = require('./update-feed.js');

describe('update-feed config', () => {
  it('UPDATE_FEED_MODE is one of the two allowed strings', () => {
    assert.ok(['github', 'worker'].includes(UPDATE_FEED_MODE));
  });

  it('UPDATE_WORKER_URL is an absolute https URL', () => {
    assert.match(UPDATE_WORKER_URL, /^https:\/\/.+/);
    assert.doesNotThrow(() => new URL(UPDATE_WORKER_URL));
  });

  it('defaults to worker mode for new builds', () => {
    assert.equal(UPDATE_FEED_MODE, 'worker');
  });

  it("'github' mode does not point at the Worker (handoff line 148 / spec acceptance line 170)", () => {
    // UPDATE_WORKER_URL always names the Worker host, never github.com — so
    // whichever mode a build ships with, 'github' mode can never resolve to
    // the Worker. main-update-feed.test.mjs covers the main.js call site that
    // actually enforces this at runtime.
    assert.doesNotMatch(UPDATE_WORKER_URL, /github\.com/);
  });

  it('lib/update-feed.js (CJS) and lib/update-feed.mjs (ESM) export identical values', () => {
    assert.equal(cjs.UPDATE_FEED_MODE, UPDATE_FEED_MODE);
    assert.equal(cjs.UPDATE_WORKER_URL, UPDATE_WORKER_URL);
  });
});
