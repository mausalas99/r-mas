import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  bumpTimestamp,
  foldOpsToLatestByPath,
  sweepRoomForPlaintextContent,
  backfillRoomEncryption,
} from './room-dek-migrate.mjs';
import { cacheSessionPassword, clearRoomDekCache, getCachedRoomDek } from './room-dek.mjs';
// Real (unmodified) Worker merge logic — proves the bumped-clock echo the sweep
// builds is actually accepted server-side, not just "different from the input".
import { emptyState, applyOps } from '../../../../cloud/sync-worker/src/lww.js';

describe('bumpTimestamp', () => {
  it('adds exactly 1ms to a valid ISO timestamp, same format', () => {
    assert.equal(bumpTimestamp('2026-08-17T10:00:00.000Z'), '2026-08-17T10:00:00.001Z');
  });

  it('rolls over seconds/minutes correctly', () => {
    assert.equal(bumpTimestamp('2026-08-17T10:00:00.999Z'), '2026-08-17T10:00:01.000Z');
  });

  it('returns the input unchanged for an unparseable clock', () => {
    assert.equal(bumpTimestamp('not-a-date'), 'not-a-date');
    assert.equal(bumpTimestamp(''), '');
  });
});

describe('foldOpsToLatestByPath', () => {
  it('keeps only the last op per path, in array order', () => {
    const ops = [
      { path: 'entries/p1/note', value: 'v1', updatedAt: 'a', actorId: 'x' },
      { path: 'entries/p1/note', value: 'v2', updatedAt: 'b', actorId: 'y' },
      { path: 'todos/t1', value: { id: 't1' }, updatedAt: 'c', actorId: 'x' },
    ];
    const folded = foldOpsToLatestByPath(ops);
    assert.deepEqual(folded, {
      'entries/p1/note': { value: 'v2', updatedAt: 'b', actorId: 'y' },
      'todos/t1': { value: { id: 't1' }, updatedAt: 'c', actorId: 'x' },
    });
  });

  it('ignores malformed entries instead of throwing', () => {
    assert.deepEqual(foldOpsToLatestByPath([null, {}, { path: '' }]), {});
    assert.deepEqual(foldOpsToLatestByPath(undefined), {});
  });
});

/** Fake api mimicking pull/push shape used by room-dek-migrate.mjs. */
function makeFakeApi({ pullResponse, pushImpl } = {}) {
  const pushedBatches = [];
  return {
    pushedBatches,
    async pull() {
      return pullResponse;
    },
    async push(roomId, body) {
      pushedBatches.push(body);
      if (pushImpl) return pushImpl(roomId, body);
      return { revision: (pullResponse.revision || 0) + pushedBatches.length };
    },
  };
}

describe('sweepRoomForPlaintextContent — full-state pull (large room)', () => {
  it('re-pushes plaintext content fields with a bumped clock; skips already-encrypted and non-content paths', async () => {
    const state = {
      revision: 500,
      entries: [
        { id: 'p1', note: 'plano', fields: { nombre: 'Juan' } },
        { id: 'p2', note: { enc: 1, iv: 'x', ct: 'y' } },
      ],
      entityVersions: {
        'entries/p1/note': { updatedAt: '2026-08-01T00:00:00.000Z', actorId: 'device-a' },
        'entries/p2/note': { updatedAt: '2026-08-02T00:00:00.000Z', actorId: 'device-b' },
        'entries/p1/fields': { updatedAt: '2026-08-01T00:00:00.000Z', actorId: 'device-a' },
      },
      labSidecars: {},
      todos: {},
    };
    const api = makeFakeApi({ pullResponse: { revision: 500, state } });

    const result = await sweepRoomForPlaintextContent(api, 'room-1', 'device-owner');
    assert.equal(result.swept, 1);
    assert.equal(api.pushedBatches.length, 1);
    const pushedOp = api.pushedBatches[0].ops[0];
    assert.equal(pushedOp.path, 'entries/p1/note');
    assert.equal(pushedOp.value, 'plano');
    assert.equal(pushedOp.updatedAt, '2026-08-01T00:00:00.001Z');
    assert.equal(pushedOp.actorId, 'device-owner');
  });

  it('does nothing when every content field is already encrypted', async () => {
    const state = {
      revision: 500,
      entries: [{ id: 'p1', note: { enc: 1, iv: 'x', ct: 'y' } }],
      entityVersions: { 'entries/p1/note': { updatedAt: '2026-08-01T00:00:00.000Z', actorId: 'a' } },
      labSidecars: {},
      todos: {},
    };
    const api = makeFakeApi({ pullResponse: { revision: 500, state } });
    const result = await sweepRoomForPlaintextContent(api, 'room-1', 'device-owner');
    assert.equal(result.swept, 0);
    assert.equal(api.pushedBatches.length, 0);
  });

  it('the bumped-clock op is actually accepted by the real Worker LWW merge (not rejected as stale)', async () => {
    // Simulate the server already holding this exact plaintext version.
    let serverState = emptyState();
    ({ state: serverState } = applyOps(serverState, [
      { path: 'entries/p1/note', value: 'plano', updatedAt: '2026-08-01T00:00:00.000Z', actorId: 'device-a' },
    ]));

    const state = {
      revision: 500,
      entries: [{ id: 'p1', note: 'plano' }],
      entityVersions: serverState.entityVersions,
      labSidecars: {},
      todos: {},
    };
    const api = makeFakeApi({ pullResponse: { revision: 500, state } });
    await sweepRoomForPlaintextContent(api, 'room-1', 'device-owner');
    const migrationOp = api.pushedBatches[0].ops[0];

    // Feed the exact op the sweep built back into the real server merge.
    const { applied, rejected } = applyOps(serverState, [migrationOp]);
    assert.equal(rejected.length, 0);
    assert.equal(applied.length, 1);

    // Sanity check: echoing the *original* (unbumped) clock would have been rejected.
    const { rejected: rejectedEcho } = applyOps(serverState, [
      { path: 'entries/p1/note', value: 'plano', updatedAt: '2026-08-01T00:00:00.000Z', actorId: 'device-a' },
    ]);
    assert.equal(rejectedEcho.length, 1);
  });

  it('a genuinely newer concurrent edit still wins over the migration echo', async () => {
    let serverState = emptyState();
    ({ state: serverState } = applyOps(serverState, [
      { path: 'entries/p1/note', value: 'plano viejo', updatedAt: '2026-08-01T00:00:00.000Z', actorId: 'device-a' },
    ]));

    const state = {
      revision: 500,
      entries: [{ id: 'p1', note: 'plano viejo' }],
      entityVersions: serverState.entityVersions,
      labSidecars: {},
      todos: {},
    };
    const api = makeFakeApi({ pullResponse: { revision: 500, state } });
    await sweepRoomForPlaintextContent(api, 'room-1', 'device-owner');
    const migrationOp = api.pushedBatches[0].ops[0];

    // A teammate's real edit lands with "now" — far later than the migration's
    // old-clock+1ms — either before or after the migration op arrives server-side.
    const realEdit = {
      path: 'entries/p1/note',
      value: 'nota actualizada por otro médico',
      updatedAt: '2026-08-17T12:00:00.000Z',
      actorId: 'device-b',
    };

    // Migration first, then the real edit: real edit still wins.
    let s1 = serverState;
    ({ state: s1 } = applyOps(s1, [migrationOp]));
    ({ state: s1 } = applyOps(s1, [realEdit]));
    assert.equal(s1.entries.find((e) => e.id === 'p1').note, realEdit.value);

    // Real edit first, then migration arrives late: migration is rejected as stale.
    let s2 = serverState;
    ({ state: s2 } = applyOps(s2, [realEdit]));
    const { rejected } = applyOps(s2, [migrationOp]);
    assert.equal(rejected.length, 1);
  });
});

describe('sweepRoomForPlaintextContent — ops fold (small/new room)', () => {
  it('folds the ops list and sweeps plaintext content the same way', async () => {
    const ops = [
      { path: 'entries/p1/note', value: 'plano', updatedAt: '2026-08-01T00:00:00.000Z', actorId: 'a' },
      { path: 'entries/p1/fields', value: { nombre: 'Juan' }, updatedAt: '2026-08-01T00:00:00.000Z', actorId: 'a' },
      { path: 'todos/t1', value: { id: 't1', enc: 1, iv: 'x', ct: 'y' }, updatedAt: '2026-08-01T00:00:00.000Z', actorId: 'a' },
    ];
    const api = makeFakeApi({ pullResponse: { revision: 3, ops } });
    const result = await sweepRoomForPlaintextContent(api, 'room-1', 'device-owner');
    assert.equal(result.swept, 1);
    assert.equal(api.pushedBatches[0].ops[0].path, 'entries/p1/note');
  });
});

describe('backfillRoomEncryption', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('is a no-op for a non-owner room (no ensureRoomDek / no sweep attempted)', async () => {
    const api = makeFakeApi({ pullResponse: { revision: 0, state: emptyState() } });
    api.getRoomDek = async () => {
      throw new Error('should not be called for a non-owner');
    };
    const result = await backfillRoomEncryption(api, { id: 'room-1', role: 'member' }, 'device-owner');
    assert.equal(result, null);
    assert.equal(api.pushedBatches.length, 0);
  });

  it('generates a DEK and sweeps when the owner has no DEK yet', async () => {
    cacheSessionPassword('hunter2-medico');
    const state = {
      revision: 500,
      entries: [{ id: 'p1', note: 'plano' }],
      entityVersions: { 'entries/p1/note': { updatedAt: '2026-08-01T00:00:00.000Z', actorId: 'a' } },
      labSidecars: {},
      todos: {},
    };
    const api = makeFakeApi({ pullResponse: { revision: 500, state } });
    api.setRoomDek = async () => ({ ok: true });
    api.getRoomDek = async () => ({ dek: null });

    const result = await backfillRoomEncryption(api, { id: 'room-1', role: 'owner' }, 'device-owner');
    assert.ok(result);
    assert.equal(result.swept, 1);
    assert.ok(getCachedRoomDek('room-1'));
  });

  it('does not throw when another device already set the DEK (setRoomDek 409)', async () => {
    cacheSessionPassword('hunter2-medico');
    const api = makeFakeApi({ pullResponse: { revision: 0, state: emptyState() } });
    api.getRoomDek = async () => ({ dek: null }); // loadRoomDek finds nothing either
    api.setRoomDek = async () => {
      const err = new Error('409 Esta sala ya tiene una llave configurada.');
      throw err;
    };
    await assert.doesNotReject(() =>
      backfillRoomEncryption(api, { id: 'room-1', role: 'owner' }, 'device-owner')
    );
    assert.equal(getCachedRoomDek('room-1'), null);
  });

  it('re-sweeps (idempotently, finding nothing) when a DEK already exists', async () => {
    cacheSessionPassword('hunter2-medico');
    const dekState = { revision: 10, entries: [], entityVersions: {}, labSidecars: {}, todos: {} };
    const api = makeFakeApi({ pullResponse: { revision: 10, state: dekState } });
    api.setRoomDek = async () => ({ ok: true });
    api.getRoomDek = async () => ({ dek: null });

    await backfillRoomEncryption(api, { id: 'room-1', role: 'owner' }, 'device-owner');
    const firstPushCount = api.pushedBatches.length;

    const result = await backfillRoomEncryption(api, { id: 'room-1', role: 'owner' }, 'device-owner');
    assert.equal(result.swept, 0);
    assert.equal(api.pushedBatches.length, firstPushCount);
  });
});
