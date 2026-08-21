import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { encodeRoomState, decodeRoomState } from './crypto-at-rest.js';
import { SyncError } from './errors.js';
import { QUOTAS } from './quotas.js';
import { loadRoomState, commitMutationBatch } from './sync.js';

const TEST_KEY = { WORKER_DATA_KEY: 'cd'.repeat(32) };
const ROOM_ID = 'room-shard-test';

/** Minimal D1 fake backing `rooms` (revision only), `room_state`, `room_state_labs`, `mutations`. */
function fakeDb({ revision = 0 } = {}) {
  let roomRevision = revision;
  /** @type {{ ciphertext: Uint8Array, iv: Uint8Array } | null} */
  let core = null;
  /** @type {Map<string, { ciphertext: Uint8Array, iv: Uint8Array }>} */
  const labs = new Map();
  /** @type {Set<string>} committed (room_id, client_mutation_id, revision) keys */
  const mutationRows = new Set();
  /** @type {{ opsJson: unknown, ciphertext: unknown, iv: unknown } | null} */
  let lastMutationRow = null;
  /** @type {string[]} SQL of every statement actually bound (i.e. added to a batch) */
  const boundSql = [];

  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          boundSql.push(sql);
          return {
            async first() {
              if (sql.includes('FROM room_state_labs')) return labs.get(args[1]) || null;
              if (sql.includes('FROM room_state')) return core;
              if (sql.includes('SELECT revision FROM rooms')) return { revision: roomRevision };
              return null;
            },
            async all() {
              if (sql.includes('FROM room_state_labs')) {
                return {
                  results: [...labs.entries()].map(([patient_id, row]) => ({
                    patient_id,
                    ciphertext: row.ciphertext,
                    iv: row.iv,
                  })),
                };
              }
              return { results: [] };
            },
            async run() {
              if (sql.includes('INSERT INTO mutations')) {
                // Guarded: only "inserts" (and only bumps revision) if expectedRevision matches.
                const [, nextRevision, clientMutationId, , opsJson, ciphertext, iv, , , expectedRevision] =
                  args;
                if (expectedRevision !== roomRevision) return { meta: { changes: 0 } };
                mutationRows.add(`${clientMutationId}:${nextRevision}`);
                lastMutationRow = { opsJson, ciphertext, iv };
                return { meta: { changes: 1 } };
              }
              if (sql.includes('UPDATE rooms SET revision')) {
                const [nextRevision, , , , expectedRevision] = args;
                if (expectedRevision !== roomRevision) return { meta: { changes: 0 } };
                roomRevision = nextRevision;
                return { meta: { changes: 1 } };
              }
              if (sql.includes('UPDATE room_state SET ciphertext')) {
                const [ciphertext, iv, , , , clientMutationId, nextRevision] = args;
                if (!mutationRows.has(`${clientMutationId}:${nextRevision}`)) {
                  return { meta: { changes: 0 } };
                }
                core = { ciphertext, iv };
                return { meta: { changes: 1 } };
              }
              if (sql.includes('INSERT OR REPLACE INTO room_state_labs')) {
                const [, patientId, ciphertext, iv, , , clientMutationId, nextRevision] = args;
                if (!mutationRows.has(`${clientMutationId}:${nextRevision}`)) {
                  return { meta: { changes: 0 } };
                }
                labs.set(patientId, { ciphertext, iv });
                return { meta: { changes: 1 } };
              }
              if (sql.includes('DELETE FROM room_state_labs')) {
                const [, patientId, , clientMutationId, nextRevision] = args;
                if (!mutationRows.has(`${clientMutationId}:${nextRevision}`)) {
                  return { meta: { changes: 0 } };
                }
                labs.delete(patientId);
                return { meta: { changes: 1 } };
              }
              if (sql.includes('DELETE FROM mutations')) return { meta: { changes: 0 } };
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
    async batch(stmts) {
      const results = [];
      for (const stmt of stmts) results.push(await stmt.run());
      return results;
    },
    async setLegacyState(state) {
      const encoded = await encodeRoomState(TEST_KEY, state);
      core = { ciphertext: encoded.ciphertext, iv: encoded.iv };
    },
    labs,
    getCoreState: async () => (core ? decodeRoomState(TEST_KEY, core.ciphertext, core.iv) : null),
    getLastMutationRow: () => lastMutationRow,
    boundSql,
    clearBoundSql: () => {
      boundSql.length = 0;
    },
  };
  return db;
}

function baseState(overrides = {}) {
  return {
    revision: 0,
    entries: [],
    entityVersions: {},
    todos: {},
    agenda: [],
    clinicalOps: null,
    labSidecars: {},
    tombstones: {},
    ...overrides,
  };
}

describe('mutations.ops_json at-rest encryption', () => {
  let db;
  beforeEach(() => {
    db = fakeDb({ revision: 0 });
  });

  it('encrypts applied ops instead of writing plaintext ops_json', async () => {
    const applied = [
      { path: 'entries/p1/fields', value: { nombre: 'PACIENTE SIN NOMBRE', sala: 'Sala 2' } },
    ];
    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied,
      nextState: baseState(),
      previousLabSidecars: {},
    });
    assert.equal(committed.ok, true);

    const row = db.getLastMutationRow();
    assert.equal(row.opsJson, '');
    assert.doesNotMatch(String(row.ciphertext ?? ''), /PACIENTE|Sala 2/);
    assert.doesNotMatch(String(row.iv ?? ''), /PACIENTE|Sala 2/);

    const decoded = await decodeRoomState(TEST_KEY, row.ciphertext, row.iv);
    assert.deepEqual(decoded, applied);
  });
});

describe('room_state_labs sharding', () => {
  let db;
  beforeEach(() => {
    db = fakeDb({ revision: 0 });
  });

  it('splits labSidecars into a per-patient shard row and strips it from core', async () => {
    const nextState = baseState({ labSidecars: { p1: { s1: { value: 'lab-data' } } } });
    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [{ path: 'labSidecars/p1/s1', value: { value: 'lab-data' } }],
      nextState,
      previousLabSidecars: {},
    });
    assert.equal(committed.ok, true);

    const core = await db.getCoreState();
    assert.equal(core.labSidecars, undefined);
    assert.ok(db.labs.has('p1'));

    const { state } = await loadRoomState(TEST_KEY, db, ROOM_ID);
    assert.deepEqual(state.labSidecars, { p1: { s1: { value: 'lab-data' } } });
  });

  it('deletes a patient shard when labSidecars is wiped (e.g. tombstone)', async () => {
    await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [],
      nextState: baseState({ labSidecars: { p1: { s1: { value: 'x' } } } }),
      previousLabSidecars: {},
    });
    assert.ok(db.labs.has('p1'));

    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 1,
      nextRevision: 2,
      userId: 'u1',
      clientMutationId: 'm2',
      applied: [{ path: 'tombstones/p1', value: { deletedAt: 'now' } }],
      nextState: baseState({ revision: 1, labSidecars: {}, tombstones: { p1: { deletedAt: 'now' } } }),
      previousLabSidecars: { p1: { s1: { value: 'x' } } },
    });
    assert.equal(committed.ok, true);
    assert.equal(db.labs.has('p1'), false);
  });

  it('reads a legacy single-blob row (labSidecars embedded in core) unchanged, then self-migrates on next write', async () => {
    await db.setLegacyState(
      baseState({ labSidecars: { p1: { s1: { value: 'legacy' } } } })
    );

    const { state } = await loadRoomState(TEST_KEY, db, ROOM_ID);
    assert.deepEqual(state.labSidecars, { p1: { s1: { value: 'legacy' } } });
    assert.equal(db.labs.has('p1'), false);

    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [{ path: 'agenda', value: [] }],
      nextState: { ...state, agenda: [] },
      previousLabSidecars: state.labSidecars,
    });
    assert.equal(committed.ok, true);
    assert.ok(db.labs.has('p1'));
    const core = await db.getCoreState();
    assert.equal(core.labSidecars, undefined);
  });

  it('rejects a patient whose lab history exceeds labShardMaxBytes, batch not applied', async () => {
    const bigSets = { s1: { blob: 'x'.repeat(QUOTAS.labShardMaxBytes + 1000) } };
    await assert.rejects(
      () =>
        commitMutationBatch(TEST_KEY, db, {
          roomId: ROOM_ID,
          expectedRevision: 0,
          nextRevision: 1,
          userId: 'u1',
          clientMutationId: 'm1',
          applied: [{ path: 'labSidecars/p1/s1', value: bigSets.s1 }],
          nextState: baseState({ labSidecars: { p1: bigSets } }),
          previousLabSidecars: {},
        }),
      (err) => err instanceof SyncError && err.code === 'payload_too_large'
    );
    assert.equal(db.labs.has('p1'), false);
  });

  it('storage_bytes equals core bytes + sum of shard bytes', async () => {
    let capturedStorageBytes = null;
    const origPrepare = db.prepare.bind(db);
    db.prepare = (sql) => {
      const stmt = origPrepare(sql);
      if (!sql.includes('UPDATE rooms SET revision')) return stmt;
      return {
        bind: (...args) => {
          capturedStorageBytes = args[1];
          return stmt.bind(...args);
        },
      };
    };

    const nextState = baseState({
      labSidecars: { p1: { s1: { v: 'a' } }, p2: { s1: { v: 'b' } } },
    });
    await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [],
      nextState,
      previousLabSidecars: {},
    });

    const { labSidecars, ...core } = nextState;
    const coreEncoded = await encodeRoomState(TEST_KEY, core);
    const p1Encoded = await encodeRoomState(TEST_KEY, labSidecars.p1);
    const p2Encoded = await encodeRoomState(TEST_KEY, labSidecars.p2);
    assert.equal(
      capturedStorageBytes,
      coreEncoded.storageBytes + p1Encoded.storageBytes + p2Encoded.storageBytes
    );
  });
});

describe('commitMutationBatch does not rewrite untouched lab shards', () => {
  let db;
  beforeEach(() => {
    db = fakeDb({ revision: 0 });
  });

  it('skips re-encoding shards a non-lab mutation does not touch', async () => {
    // Seed 3 already-sharded patients via a real commit.
    await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'seed',
      applied: [
        { path: 'labSidecars/p1/s1', value: { v: 'a' } },
        { path: 'labSidecars/p2/s1', value: { v: 'b' } },
        { path: 'labSidecars/p3/s1', value: { v: 'c' } },
      ],
      nextState: baseState({
        labSidecars: { p1: { s1: { v: 'a' } }, p2: { s1: { v: 'b' } }, p3: { s1: { v: 'c' } } },
      }),
      previousLabSidecars: {},
    });
    assert.equal(db.labs.size, 3);

    // Real production path: load full state (all 3 shards merged in), then
    // commit a mutation that only touches a census field, not labs.
    const { state, shardedPatientIds, shardStorageBytes } = await loadRoomState(
      TEST_KEY,
      db,
      ROOM_ID
    );
    assert.deepEqual([...shardedPatientIds].sort(), ['p1', 'p2', 'p3']);

    db.clearBoundSql();
    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 1,
      nextRevision: 2,
      userId: 'u1',
      clientMutationId: 'census-only',
      applied: [{ path: 'entries/p9/fields', value: { nombre: 'X' } }],
      nextState: { ...state, agenda: [] },
      previousLabSidecars: state.labSidecars,
      shardedPatientIds,
      shardStorageBytes,
    });
    assert.equal(committed.ok, true);

    const shardWrites = db.boundSql.filter(
      (sql) => sql.includes('room_state_labs') && (sql.includes('INSERT') || sql.includes('DELETE'))
    );
    assert.deepEqual(shardWrites, []);
    assert.equal(db.labs.size, 3);
  });

  it('still writes only the touched shard when one patient is updated', async () => {
    await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'seed',
      applied: [
        { path: 'labSidecars/p1/s1', value: { v: 'a' } },
        { path: 'labSidecars/p2/s1', value: { v: 'b' } },
      ],
      nextState: baseState({ labSidecars: { p1: { s1: { v: 'a' } }, p2: { s1: { v: 'b' } } } }),
      previousLabSidecars: {},
    });

    const { state, shardedPatientIds, shardStorageBytes } = await loadRoomState(
      TEST_KEY,
      db,
      ROOM_ID
    );
    const nextLabSidecars = { ...state.labSidecars, p1: { s1: { v: 'a' }, s2: { v: 'new' } } };

    db.clearBoundSql();
    await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 1,
      nextRevision: 2,
      userId: 'u1',
      clientMutationId: 'p1-update',
      applied: [{ path: 'labSidecars/p1/s2', value: { v: 'new' } }],
      nextState: { ...state, labSidecars: nextLabSidecars },
      previousLabSidecars: state.labSidecars,
      shardedPatientIds,
      shardStorageBytes,
    });

    const shardWrites = db.boundSql.filter(
      (sql) => sql.includes('room_state_labs') && sql.includes('INSERT')
    );
    assert.equal(shardWrites.length, 1);
    const updated = await decodeRoomState(TEST_KEY, db.labs.get('p1').ciphertext, db.labs.get('p1').iv);
    assert.deepEqual(updated, { s1: { v: 'a' }, s2: { v: 'new' } });
  });
});

describe('commitMutationBatch batchRawBytes guard', () => {
  let db;
  beforeEach(() => {
    db = fakeDb({ revision: 0 });
  });

  it('rejects a batch whose raw blob bytes exceed batchRawBytes before writing anything', async () => {
    // Several patients, each under labShardMaxBytes individually, whose sum
    // exceeds batchRawBytes — the bug this guard exists for. 3 * 1.5MB stays
    // under the 1.9MB per-shard cap but clears the 4MB batch cap.
    assert.ok(3 * 1_500_000 > QUOTAS.batchRawBytes && 1_500_000 < QUOTAS.labShardMaxBytes);
    const perPatientBytes = 1_500_000;
    const nextLabSidecars = {
      p1: { s1: { blob: 'x'.repeat(perPatientBytes) } },
      p2: { s1: { blob: 'x'.repeat(perPatientBytes) } },
      p3: { s1: { blob: 'x'.repeat(perPatientBytes) } },
    };
    await assert.rejects(
      () =>
        commitMutationBatch(TEST_KEY, db, {
          roomId: ROOM_ID,
          expectedRevision: 0,
          nextRevision: 1,
          userId: 'u1',
          clientMutationId: 'm1',
          applied: [
            { path: 'labSidecars/p1/s1', value: nextLabSidecars.p1.s1 },
            { path: 'labSidecars/p2/s1', value: nextLabSidecars.p2.s1 },
            { path: 'labSidecars/p3/s1', value: nextLabSidecars.p3.s1 },
          ],
          nextState: baseState({ labSidecars: nextLabSidecars }),
          previousLabSidecars: {},
        }),
      (err) => err instanceof SyncError && err.code === 'payload_too_large'
    );
    assert.equal(db.labs.size, 0);
  });
});
