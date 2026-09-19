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
    const selectIdx = body.indexOf('SELECT revision, ops_json, ciphertext, iv FROM mutations');
    assert.ok(snapshotIdx >= 0);
    assert.ok(selectIdx >= 0);
    assert.ok(snapshotIdx < selectIdx, 'gap check must run before mutations SELECT');
  });

  it('skips the whole-room lab-ciphertext fetch on push when the batch touches no lab sets', () => {
    // Most pushes (signos/eventualidades/notes) never touch labSidecars — loading
    // every patient's lab history to apply them doesn't scale, and once a room's
    // total ciphertext is big enough D1 fails outright ("Failed to parse body as
    // JSON") with that whole dump as the error message. loadRoomState must be
    // told to skip lab shards for these, computed once before the retry loop
    // (pure over the client's own ops, unchanged across retries).
    const start = syncSrc.indexOf('async function handleMutations');
    assert.ok(start >= 0);
    const body = syncSrc.slice(start, start + 3000);
    const hoistIdx = body.indexOf('hasLabSidecarOps');
    const loopIdx = body.indexOf('for (let attempt');
    const loadIdx = body.indexOf('skipLabShards: !hasLabSidecarOps');
    assert.ok(hoistIdx >= 0 && hoistIdx < loopIdx, 'hasLabSidecarOps must be computed before the retry loop');
    assert.ok(loadIdx > loopIdx, 'loadRoomState inside the loop must pass skipLabShards');
  });

  it('returns empty ops when client revision is current', () => {
    const start = syncSrc.indexOf('async function handlePull');
    assert.ok(start >= 0);
    const body = syncSrc.slice(start, start + 1200);
    const d1Idx = body.indexOf('SELECT revision FROM rooms');
    const earlyIdx = body.indexOf('since >= revision');
    assert.ok(d1Idx >= 0);
    assert.ok(earlyIdx >= 0);
    assert.ok(d1Idx < earlyIdx, 'D1 revision must be read before early empty response');
    assert.doesNotMatch(body, /getCachedRoomRevision/);
    assert.doesNotMatch(body, /CACHE/);
  });
});
