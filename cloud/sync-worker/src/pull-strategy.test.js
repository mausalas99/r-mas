import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MUTATION_RETENTION,
  PULL_OPS_MAX_BYTES,
  PULL_REVISION_GAP,
  mutationPruneCeiling,
  shouldReturnSnapshotPull,
} from './pull-strategy.js';

const syncSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'sync.js'), 'utf8');

describe('shouldReturnSnapshotPull', () => {
  it('forces snapshot when revision gap exceeds retention window', () => {
    assert.equal(shouldReturnSnapshotPull(PULL_REVISION_GAP), false);
    assert.equal(shouldReturnSnapshotPull(PULL_REVISION_GAP + 1), true);
    assert.equal(shouldReturnSnapshotPull(1557), true);
  });

  it('forces snapshot when cumulative ops bytes exceed cap', () => {
    assert.equal(shouldReturnSnapshotPull(1, PULL_OPS_MAX_BYTES), false);
    assert.equal(shouldReturnSnapshotPull(1, PULL_OPS_MAX_BYTES + 1), true);
  });
});

describe('mutationPruneCeiling', () => {
  it('keeps the retention window and drops older revisions', () => {
    assert.equal(mutationPruneCeiling(50), 0);
    assert.equal(mutationPruneCeiling(MUTATION_RETENTION), 0);
    assert.equal(mutationPruneCeiling(1557), 1557 - MUTATION_RETENTION);
  });
});

describe('sync.js mutation retention', () => {
  it('prunes old mutations after each successful commit', () => {
    assert.match(syncSrc, /mutationPruneCeiling/);
    assert.match(syncSrc, /DELETE FROM mutations WHERE room_id = \? AND revision <= \?/);
  });

  it('returns snapshot before selecting mutations when gap is large', () => {
    const start = syncSrc.indexOf('async function handlePull');
    assert.ok(start >= 0);
    const body = syncSrc.slice(start, start + 1800);
    const snapshotIdx = body.indexOf('shouldReturnSnapshotPull(gap)');
    const selectIdx = body.indexOf('SELECT revision, ops_json FROM mutations');
    assert.ok(snapshotIdx >= 0);
    assert.ok(selectIdx >= 0);
    assert.ok(snapshotIdx < selectIdx, 'gap check must run before mutations SELECT');
  });

  it('reads D1 revision before KV shortcut and never returns stale cached revision', () => {
    const start = syncSrc.indexOf('async function handlePull');
    const body = syncSrc.slice(start, start + 1400);
    const d1Idx = body.indexOf('SELECT revision FROM rooms');
    const kvIdx = body.indexOf('getCachedRoomRevision');
    assert.ok(d1Idx >= 0);
    assert.ok(kvIdx >= 0);
    assert.ok(d1Idx < kvIdx, 'D1 revision must be read before KV shortcut');
    assert.doesNotMatch(body, /revision: cachedRevision/);
  });
});
