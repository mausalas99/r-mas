import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { encodeRoomState, decodeRoomState } from './crypto-at-rest.js';
import { SyncError } from './errors.js';
import { QUOTAS } from './quotas.js';
import { loadRoomState, commitMutationBatch, refattenRoomCore, handleSync } from './sync.js';
import { splitCoreState } from './room-state-shard.js';

const TEST_KEY = { WORKER_DATA_KEY: 'cd'.repeat(32) };
const ROOM_ID = 'room-shard-test';

/** Minimal D1 fake backing `rooms`, `room_state`, `room_state_labs` (legacy
 * whole-patient), `room_state_lab_sets` (per-set), `mutations`. */
function fakeDb({ revision = 0 } = {}) {
  let roomRevision = revision;
  /** @type {{ ciphertext: Uint8Array, iv: Uint8Array } | null} */
  let core = null;
  /** @type {Map<string, { ciphertext: Uint8Array, iv: Uint8Array }>} legacy whole-patient rows */
  const labs = new Map();
  /** @type {Map<string, Map<string, { ciphertext: Uint8Array, iv: Uint8Array }>>} per-set rows */
  const labSets = new Map();
  /** @type {Set<string>} committed (room_id, client_mutation_id, revision) keys */
  const mutationRows = new Set();
  /** @type {{ opsJson: unknown, ciphertext: unknown, iv: unknown } | null} */
  let lastMutationRow = null;
  /** @type {string[]} SQL of every statement actually bound (i.e. added to a batch) */
  const boundSql = [];
  /** @type {Array<{ sql: string, args: unknown[] }>} */
  const boundCalls = [];
  /** @type {Map<string, { ciphertext: Uint8Array, iv: Uint8Array }>} per-patient rows (schema 013) */
  const patients = new Map();

  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          boundSql.push(sql);
          boundCalls.push({ sql, args });
          return {
            isRead: /^\s*SELECT/i.test(sql),
            async first() {
              // requireMember: session + user + room + membership in one row.
              if (sql.includes('FROM sessions')) {
                return { id: 'u1', role: 'member', room_id: args[0], room_revision: roomRevision, room_storage_bytes: 10_000, is_member: 1 };
              }
              if (sql.includes('SELECT revision, storage_bytes FROM rooms')) {
                return { revision: roomRevision, storage_bytes: 10_000 };
              }
              if (sql.includes('FROM room_state_labs')) return labs.get(args[1]) || null;
              if (sql.includes('FROM room_state')) return core;
              if (sql.includes('SELECT revision FROM rooms')) return { revision: roomRevision };
              return null;
            },
            async all() {
              if (sql.includes('UNION ALL') && sql.includes('FROM room_state_patients')) {
                const rows = core ? [{ kind: 'core', patient_id: '', ciphertext: core.ciphertext, iv: core.iv, revision: roomRevision, storage_bytes: 10_000 }] : [];
                for (const [patient_id, row] of patients.entries()) {
                  rows.push({ kind: 'patient', patient_id, ciphertext: row.ciphertext, iv: row.iv });
                }
                return { results: rows };
              }
              if (sql.includes('FROM room_state_patients')) {
                return {
                  results: [...patients.entries()].map(([patient_id, row]) => ({
                    patient_id,
                    ciphertext: row.ciphertext,
                    iv: row.iv,
                  })),
                };
              }
              if (sql.includes('FROM room_state_lab_sets')) {
                const rows = [];
                for (const [patient_id, sets] of labSets.entries()) {
                  for (const [set_id, row] of sets.entries()) {
                    rows.push({ patient_id, set_id, ciphertext: row.ciphertext, iv: row.iv });
                  }
                }
                return { results: rows };
              }
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
              if (sql.includes('UPDATE room_state SET') && sql.includes('FROM rooms WHERE id')) {
                const [ciphertext, iv, , , , revision] = args;
                if (revision !== roomRevision) return { meta: { changes: 0 } };
                core = { ciphertext, iv };
                return { meta: { changes: 1 } };
              }
              if (sql.includes('DELETE FROM room_state_patients') && sql.includes('FROM rooms WHERE id')) {
                if (args[2] !== roomRevision) return { meta: { changes: 0 } };
                patients.clear();
                return { meta: { changes: 1 } };
              }
              if (sql.includes('UPDATE rooms SET storage_bytes')) return { meta: { changes: 1 } };
              if (sql.includes('UPDATE room_state SET ciphertext')) {
                const [ciphertext, iv, , , , clientMutationId, nextRevision] = args;
                if (!mutationRows.has(`${clientMutationId}:${nextRevision}`)) {
                  return { meta: { changes: 0 } };
                }
                core = { ciphertext, iv };
                return { meta: { changes: 1 } };
              }
              if (sql.includes('INSERT OR REPLACE INTO room_state_patients')) {
                const [, patientId, ciphertext, iv, , , clientMutationId, nextRevision] = args;
                if (!mutationRows.has(`${clientMutationId}:${nextRevision}`)) {
                  return { meta: { changes: 0 } };
                }
                patients.set(patientId, { ciphertext, iv });
                return { meta: { changes: 1 } };
              }
              if (sql.includes('DELETE FROM room_state_patients')) {
                // all rows (4 args) or one row (5 args)
                const one = args.length === 5;
                const [, a, b, c, d] = args;
                const [clientMutationId, nextRevision] = one ? [c, d] : [b, c];
                if (!mutationRows.has(`${clientMutationId}:${nextRevision}`)) {
                  return { meta: { changes: 0 } };
                }
                if (one) patients.delete(a);
                else patients.clear();
                return { meta: { changes: 1 } };
              }
              if (sql.includes('INSERT OR REPLACE INTO room_state_lab_sets')) {
                const [, patientId, setId, ciphertext, iv, , , clientMutationId, nextRevision] = args;
                if (!mutationRows.has(`${clientMutationId}:${nextRevision}`)) {
                  return { meta: { changes: 0 } };
                }
                if (!labSets.has(patientId)) labSets.set(patientId, new Map());
                labSets.get(patientId).set(setId, { ciphertext, iv });
                return { meta: { changes: 1 } };
              }
              if (sql.includes('DELETE FROM room_state_lab_sets')) {
                const [, patientId, , clientMutationId, nextRevision] = args;
                if (!mutationRows.has(`${clientMutationId}:${nextRevision}`)) {
                  return { meta: { changes: 0 } };
                }
                labSets.delete(patientId);
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
      for (const stmt of stmts) results.push(await (stmt.isRead ? stmt.all() : stmt.run()));
      return results;
    },
    async setLegacyState(state) {
      const encoded = await encodeRoomState(TEST_KEY, state);
      core = { ciphertext: encoded.ciphertext, iv: encoded.iv };
    },
    async setLegacyPatientShard(patientId, sets) {
      const encoded = await encodeRoomState(TEST_KEY, sets);
      labs.set(patientId, { ciphertext: encoded.ciphertext, iv: encoded.iv });
    },
    async setShardedState(state) {
      const { core, shards } = splitCoreState(state);
      await db.setLegacyState(core);
      patients.clear();
      for (const [pid, shard] of shards) {
        const enc = await encodeRoomState(TEST_KEY, shard);
        patients.set(pid, { ciphertext: enc.ciphertext, iv: enc.iv });
      }
    },
    patients,
    boundCalls,
    labs,
    labSets,
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

describe('room_state_lab_sets sharding (one row per lab set)', () => {
  let db;
  beforeEach(() => {
    db = fakeDb({ revision: 0 });
  });

  it('writes exactly the (patientId, setId) row an op touches, strips labSidecars from core', async () => {
    const nextState = baseState({ labSidecars: { p1: { s1: { value: 'lab-data' } } } });
    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [{ path: 'labSidecars/p1/s1', value: { value: 'lab-data' } }],
      nextState,
    });
    assert.equal(committed.ok, true);

    const core = await db.getCoreState();
    assert.equal(core.labSidecars, undefined);
    assert.ok(db.labSets.get('p1')?.has('s1'));

    const { state } = await loadRoomState(TEST_KEY, db, ROOM_ID);
    assert.deepEqual(state.labSidecars, { p1: { s1: { value: 'lab-data' } } });
  });

  it('deletes a patient from both lab tables when tombstoned', async () => {
    await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [{ path: 'labSidecars/p1/s1', value: { value: 'x' } }],
      nextState: baseState({ labSidecars: { p1: { s1: { value: 'x' } } } }),
    });
    assert.ok(db.labSets.get('p1')?.has('s1'));

    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 1,
      nextRevision: 2,
      userId: 'u1',
      clientMutationId: 'm2',
      applied: [{ path: 'tombstones/p1', value: { deletedAt: 'now' } }],
      nextState: baseState({ revision: 1, labSidecars: {}, tombstones: { p1: { deletedAt: 'now' } } }),
    });
    assert.equal(committed.ok, true);
    assert.equal(db.labs.has('p1'), false);
    assert.equal(db.labSets.has('p1'), false);
  });

  it('reads a legacy whole-patient row unchanged and does NOT rewrite it on an unrelated commit', async () => {
    await db.setLegacyState(baseState());
    await db.setLegacyPatientShard('p1', { s1: { value: 'legacy' } });

    const { state } = await loadRoomState(TEST_KEY, db, ROOM_ID);
    assert.deepEqual(state.labSidecars, { p1: { s1: { value: 'legacy' } } });

    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [{ path: 'agenda', value: [] }],
      nextState: { ...state, agenda: [] },
      legacyShardBytes: new Map([['p1', 999]]),
      labSetBytes: new Map(),
    });
    assert.equal(committed.ok, true);
    // Legacy row untouched — commit never rewrites a whole patient's history.
    assert.ok(db.labs.has('p1'));
    assert.equal(db.labSets.has('p1'), false);
  });

  it('migrates one set at a time: touching one set does not disturb the rest of a legacy row', async () => {
    await db.setLegacyState(baseState());
    await db.setLegacyPatientShard('p1', { s1: { value: 'legacy-1' }, s2: { value: 'legacy-2' } });
    const { state, legacyShardBytes, labSetBytes } = await loadRoomState(TEST_KEY, db, ROOM_ID);

    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [{ path: 'labSidecars/p1/s2', value: { value: 'updated-2' } }],
      nextState: { ...state, labSidecars: { p1: { s1: { value: 'legacy-1' }, s2: { value: 'updated-2' } } } },
      legacyShardBytes,
      labSetBytes,
    });
    assert.equal(committed.ok, true);
    // Legacy row (s1's only home) is left exactly as-is; only s2 got its own new row.
    assert.deepEqual(
      await decodeRoomState(TEST_KEY, db.labs.get('p1').ciphertext, db.labs.get('p1').iv),
      { s1: { value: 'legacy-1' }, s2: { value: 'legacy-2' } }
    );
    assert.deepEqual(
      await decodeRoomState(TEST_KEY, db.labSets.get('p1').get('s2').ciphertext, db.labSets.get('p1').get('s2').iv),
      { value: 'updated-2' }
    );

    const { state: reloaded } = await loadRoomState(TEST_KEY, db, ROOM_ID);
    assert.deepEqual(reloaded.labSidecars.p1, { s1: { value: 'legacy-1' }, s2: { value: 'updated-2' } });
  });

  it('a patient whose legacy row is already over labShardMaxBytes can still push a new small set', async () => {
    await db.setLegacyState(baseState());
    const hugeLegacy = { old: { blob: 'x'.repeat(QUOTAS.labShardMaxBytes + 500_000) } };
    await db.setLegacyPatientShard('p1', hugeLegacy);
    const { state, legacyShardBytes, labSetBytes } = await loadRoomState(TEST_KEY, db, ROOM_ID);

    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [{ path: 'labSidecars/p1/new', value: { value: 'fresh' } }],
      nextState: { ...state, labSidecars: { p1: { ...state.labSidecars.p1, new: { value: 'fresh' } } } },
      legacyShardBytes,
      labSetBytes,
    });
    assert.equal(committed.ok, true);
    assert.ok(db.labSets.get('p1')?.has('new'));
  });

  it('rejects a single lab set whose own payload exceeds labShardMaxBytes', async () => {
    const bigSet = { blob: 'x'.repeat(QUOTAS.labShardMaxBytes + 1000) };
    await assert.rejects(
      () =>
        commitMutationBatch(TEST_KEY, db, {
          roomId: ROOM_ID,
          expectedRevision: 0,
          nextRevision: 1,
          userId: 'u1',
          clientMutationId: 'm1',
          applied: [{ path: 'labSidecars/p1/s1', value: bigSet }],
          nextState: baseState({ labSidecars: { p1: { s1: bigSet } } }),
        }),
      (err) => err instanceof SyncError && err.code === 'payload_too_large'
    );
    assert.equal(db.labSets.has('p1'), false);
  });

  it('storage_bytes accounts for core + legacy rows + per-set rows', async () => {
    await db.setLegacyState(baseState());
    await db.setLegacyPatientShard('p2', { s1: { v: 'legacy' } });
    const { state, legacyShardBytes, labSetBytes } = await loadRoomState(TEST_KEY, db, ROOM_ID);

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

    const nextState = { ...state, labSidecars: { ...state.labSidecars, p1: { s1: { v: 'a' } } } };
    await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [{ path: 'labSidecars/p1/s1', value: { v: 'a' } }],
      nextState,
      legacyShardBytes,
      labSetBytes,
    });

    const { labSidecars, ...core } = nextState;
    const coreEncoded = await encodeRoomState(TEST_KEY, core);
    const p1SetEncoded = await encodeRoomState(TEST_KEY, { v: 'a' });
    const p2LegacyEncoded = await encodeRoomState(TEST_KEY, { s1: { v: 'legacy' } });
    assert.equal(
      capturedStorageBytes,
      coreEncoded.storageBytes + p1SetEncoded.storageBytes + p2LegacyEncoded.storageBytes
    );
  });
});

describe('loadRoomState skipLabShards (admin network census: metadata only)', () => {
  let db;
  beforeEach(() => {
    db = fakeDb({ revision: 0 });
  });

  it('reads no lab-shard tables and decrypts no lab shard when skipLabShards is set', async () => {
    await db.setLegacyState(baseState({ entries: [{ id: 'p1', fields: {} }] }));
    await db.setLegacyPatientShard('p1', { s1: { v: 'legacy' } });
    await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [{ path: 'labSidecars/p2/s1', value: { v: 'fresh' } }],
      nextState: baseState({
        entries: [{ id: 'p1', fields: {} }],
        labSidecars: { p2: { s1: { v: 'fresh' } } },
      }),
    });

    db.clearBoundSql();
    const { state, legacyShardBytes, labSetBytes } = await loadRoomState(TEST_KEY, db, ROOM_ID, {
      skipLabShards: true,
    });

    assert.equal(db.boundSql.some((sql) => sql.includes('FROM room_state_labs')), false);
    assert.equal(db.boundSql.some((sql) => sql.includes('FROM room_state_lab_sets')), false);
    assert.deepEqual(state.entries, [{ id: 'p1', fields: {} }]);
    assert.equal(legacyShardBytes.size, 0);
    assert.equal(labSetBytes.size, 0);
  });

  it('still returns the full lab shards when skipLabShards is omitted (default behavior unchanged)', async () => {
    await db.setLegacyState(baseState());
    await db.setLegacyPatientShard('p1', { s1: { v: 'legacy' } });
    const { state } = await loadRoomState(TEST_KEY, db, ROOM_ID);
    assert.deepEqual(state.labSidecars.p1, { s1: { v: 'legacy' } });
  });
});

describe('commitMutationBatch writes only the ops-touched set rows', () => {
  let db;
  beforeEach(() => {
    db = fakeDb({ revision: 0 });
  });

  it('skips lab tables entirely for a mutation that does not touch labs', async () => {
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
    });

    const { state, legacyShardBytes, labSetBytes } = await loadRoomState(TEST_KEY, db, ROOM_ID);

    db.clearBoundSql();
    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 1,
      nextRevision: 2,
      userId: 'u1',
      clientMutationId: 'census-only',
      applied: [{ path: 'entries/p9/fields', value: { nombre: 'X' } }],
      nextState: { ...state, agenda: [] },
      legacyShardBytes,
      labSetBytes,
    });
    assert.equal(committed.ok, true);

    const shardWrites = db.boundSql.filter(
      (sql) =>
        (sql.includes('room_state_labs') || sql.includes('room_state_lab_sets')) &&
        (sql.includes('INSERT') || sql.includes('DELETE'))
    );
    assert.deepEqual(shardWrites, []);
  });

  it('writes only the one touched set, leaving the patient other sets alone', async () => {
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
    });

    const { state, legacyShardBytes, labSetBytes } = await loadRoomState(TEST_KEY, db, ROOM_ID);
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
      legacyShardBytes,
      labSetBytes,
    });

    const shardWrites = db.boundSql.filter(
      (sql) => sql.includes('room_state_lab_sets') && sql.includes('INSERT')
    );
    assert.equal(shardWrites.length, 1);
    assert.deepEqual(
      await decodeRoomState(TEST_KEY, db.labSets.get('p1').get('s2').ciphertext, db.labSets.get('p1').get('s2').iv),
      { v: 'new' }
    );
    // s1's row from the seed commit is untouched.
    assert.deepEqual(
      await decodeRoomState(TEST_KEY, db.labSets.get('p1').get('s1').ciphertext, db.labSets.get('p1').get('s1').iv),
      { v: 'a' }
    );
  });
});

describe('commitMutationBatch batchRawBytes guard', () => {
  let db;
  beforeEach(() => {
    db = fakeDb({ revision: 0 });
  });

  it('rejects a batch whose raw blob bytes exceed batchRawBytes before writing anything', async () => {
    // Several sets, each under labShardMaxBytes individually, whose sum
    // exceeds batchRawBytes — the bug this guard exists for.
    assert.ok(3 * 1_500_000 > QUOTAS.batchRawBytes && 1_500_000 < QUOTAS.labShardMaxBytes);
    const perSetBytes = 1_500_000;
    const nextLabSidecars = {
      p1: { s1: { blob: 'x'.repeat(perSetBytes) } },
      p2: { s1: { blob: 'x'.repeat(perSetBytes) } },
      p3: { s1: { blob: 'x'.repeat(perSetBytes) } },
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
        }),
      (err) => err instanceof SyncError && err.code === 'payload_too_large'
    );
    assert.equal(db.labSets.size, 0);
  });
});

describe('storage_bytes on pushes that skip lab shards', () => {
  it('keeps the prior lab bytes in the total instead of dropping to core-only', async () => {
    const db = fakeDb({ revision: 0 });
    const committed = await commitMutationBatch(TEST_KEY, db, {
      roomId: ROOM_ID,
      expectedRevision: 0,
      nextRevision: 1,
      userId: 'u1',
      clientMutationId: 'm1',
      applied: [{ path: 'entries/p1/fields', value: { nombre: 'X' } }],
      nextState: baseState(),
      priorLabBytes: 123_456,
    });
    assert.equal(committed.ok, true);
    const update = db.boundCalls.find((c) => c.sql.includes('UPDATE rooms SET revision'));
    const { labSidecars: _labs, ...core } = baseState();
    const { storageBytes: coreBytes } = await encodeRoomState(TEST_KEY, core);
    assert.equal(update.args[1], coreBytes + 123_456);
  });
});

describe('loadRoomState reads per-patient rows only when the core is marked', () => {
  const full = baseState({
    entries: [
      { id: 'p2', fields: { nombre: 'B' } },
      { id: 'p1', fields: { nombre: 'A' } },
    ],
    entityVersions: {
      'entries/p1/fields': { updatedAt: '2026-01-01', actorId: 'u' },
      'entries/p2': { updatedAt: '2026-01-02', actorId: 'u' },
      'tombstones/p3': { updatedAt: '2026-01-03', actorId: 'u' },
      'todos/t1': { updatedAt: '2026-01-04', actorId: 'u' },
    },
    tombstones: { p3: { deletedAt: '2026-01-03' } },
    todos: { t1: { text: 'x' } },
  });

  it('reads the core row and the patient rows in one statement (no read skew under a concurrent commit)', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setShardedState(full);
    db.clearBoundSql();
    await loadRoomState(TEST_KEY, db, ROOM_ID, { skipLabShards: true });
    const stateReads = db.boundSql.filter((sql) => /FROM room_state(_patients)?\b/.test(sql) && !sql.includes('_labs') && !sql.includes('_lab_sets'));
    assert.equal(stateReads.length, 1);
    assert.match(stateReads[0], /UNION ALL/);
  });

  it('rebuilds the flat state, same entries order', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setShardedState(full);
    const { state } = await loadRoomState(TEST_KEY, db, ROOM_ID, { skipLabShards: true });
    assert.deepEqual(state, full);
  });

  it('ignores per-patient rows when the core has no marker (legacy fat core)', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setShardedState(full);
    await db.setLegacyState(baseState({ entries: [{ id: 'only', fields: {} }] }));
    const { state } = await loadRoomState(TEST_KEY, db, ROOM_ID, { skipLabShards: true });
    assert.deepEqual(state.entries.map((e) => e.id), ['only']);
  });

  it('fails loudly if a listed patient has no row (never returns fewer patients)', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setShardedState(full);
    db.patients.delete('p1');
    await assert.rejects(() => loadRoomState(TEST_KEY, db, ROOM_ID, { skipLabShards: true }), /p1/);
  });
});

describe('per-patient writer (PATIENT_SHARD_WRITE=1)', () => {
  const ON = { ...TEST_KEY, PATIENT_SHARD_WRITE: '1' };
  const V = (n) => ({ updatedAt: `2026-01-0${n}`, actorId: 'u' });
  const full = baseState({
    entries: [
      { id: 'p1', fields: { nombre: 'A' } },
      { id: 'p2', fields: { nombre: 'B' } },
    ],
    entityVersions: { 'entries/p1/fields': V(1), 'entries/p2/fields': V(2) },
  });
  const count = (db, text) => db.boundCalls.filter((c) => c.sql.includes(text)).length;

  async function commit(db, env, loaded, nextState, applied, extra = {}) {
    db.boundCalls.length = 0;
    return commitMutationBatch(env, db, {
      roomId: ROOM_ID,
      expectedRevision: 3,
      nextRevision: 4,
      userId: 'u1',
      clientMutationId: `m-${Math.random()}`,
      applied,
      nextState,
      shardBaseline: loaded.shardBaseline,
      ...extra,
    });
  }

  it('first commit on a legacy room splits everything, clears old rows, reloads identical', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setLegacyState(full);
    db.patients.set('stale', { ciphertext: new Uint8Array(1), iv: new Uint8Array(1) });
    const loaded = await loadRoomState(ON, db, ROOM_ID, { skipLabShards: true });
    assert.equal(loaded.shardBaseline, null);
    const res = await commit(db, ON, loaded, loaded.state, [{ path: 'entries/p1/fields', value: {} }]);
    assert.equal(res.ok, true);
    assert.equal(count(db, 'DELETE FROM room_state_patients'), 1);
    assert.deepEqual([...db.patients.keys()].sort(), ['p1', 'p2']);
    assert.equal((await db.getCoreState()).patientsSharded, 1);
    const again = await loadRoomState(ON, db, ROOM_ID, { skipLabShards: true });
    assert.deepEqual(again.state, full);
  });

  it('a field edit writes exactly one patient row and no core row', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setShardedState(full);
    const loaded = await loadRoomState(ON, db, ROOM_ID, { skipLabShards: true });
    const next = JSON.parse(JSON.stringify(loaded.state));
    next.entries[0].fields.nombre = 'A2';
    next.entityVersions['entries/p1/fields'] = V(5);
    const res = await commit(db, ON, loaded, next, [{ path: 'entries/p1/fields', value: {} }]);
    assert.equal(res.ok, true);
    assert.equal(count(db, 'INSERT OR REPLACE INTO room_state_patients'), 1);
    assert.equal(count(db, 'UPDATE room_state SET'), 0);
    const again = await loadRoomState(ON, db, ROOM_ID, { skipLabShards: true });
    assert.equal(again.state.entries[0].fields.nombre, 'A2');
    assert.equal(again.state.entries[1].fields.nombre, 'B');
  });

  it('a lab push touches its patient row and its lab set, not the core', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setShardedState(full);
    const loaded = await loadRoomState(ON, db, ROOM_ID, { skipLabShards: false });
    const next = JSON.parse(JSON.stringify(loaded.state));
    next.labSidecars = { p1: { s1: { v: 1 } } };
    next.entityVersions['labSidecars/p1/s1'] = V(6);
    const res = await commit(db, ON, loaded, next, [{ path: 'labSidecars/p1/s1', value: { v: 1 } }]);
    assert.equal(res.ok, true);
    assert.equal(count(db, 'INSERT OR REPLACE INTO room_state_patients'), 1);
    assert.equal(count(db, 'INSERT OR REPLACE INTO room_state_lab_sets'), 1);
    assert.equal(count(db, 'UPDATE room_state SET'), 0);
  });

  it('a delete removes the entry, keeps a tombstone shard, and rewrites only the slim core', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setShardedState(full);
    const loaded = await loadRoomState(ON, db, ROOM_ID, { skipLabShards: true });
    const next = JSON.parse(JSON.stringify(loaded.state));
    next.entries = next.entries.filter((e) => e.id !== 'p1');
    next.tombstones = { p1: { deletedAt: '2026-01-09' } };
    next.entityVersions['tombstones/p1'] = V(9);
    const res = await commit(db, ON, loaded, next, [{ path: 'tombstones/p1', value: {} }]);
    assert.equal(res.ok, true);
    assert.equal(count(db, 'INSERT OR REPLACE INTO room_state_patients'), 1);
    assert.equal(count(db, 'UPDATE room_state SET'), 1);
    const again = await loadRoomState(ON, db, ROOM_ID, { skipLabShards: true });
    assert.deepEqual(again.state.entries.map((e) => e.id), ['p2']);
    assert.ok(again.state.tombstones.p1);
  });

  it('a lost race writes no patient rows', async () => {
    const db = fakeDb({ revision: 9 });
    await db.setShardedState(full);
    const loaded = await loadRoomState(ON, db, ROOM_ID, { skipLabShards: true });
    const before = JSON.stringify([...db.patients.keys()]);
    const next = JSON.parse(JSON.stringify(loaded.state));
    next.entries[0].fields.nombre = 'LOST';
    const res = await commit(db, ON, loaded, next, [{ path: 'entries/p1/fields', value: {} }]);
    assert.equal(res.ok, false);
    assert.equal(JSON.stringify([...db.patients.keys()]), before);
    const again = await loadRoomState(ON, db, ROOM_ID, { skipLabShards: true });
    assert.equal(again.state.entries[0].fields.nombre, 'A');
  });

  it('flag off on a sharded room writes a fat core; old patient rows are ignored', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setShardedState(full);
    const loaded = await loadRoomState(TEST_KEY, db, ROOM_ID, { skipLabShards: true });
    const next = JSON.parse(JSON.stringify(loaded.state));
    next.entries[0].fields.nombre = 'FAT';
    const res = await commit(db, TEST_KEY, loaded, next, [{ path: 'entries/p1/fields', value: {} }]);
    assert.equal(res.ok, true);
    assert.equal(count(db, 'room_state_patients'), 0);
    const core = await db.getCoreState();
    assert.equal(core.patientsSharded, undefined);
    const again = await loadRoomState(TEST_KEY, db, ROOM_ID, { skipLabShards: true });
    assert.equal(again.state.entries[0].fields.nombre, 'FAT');
  });
});

describe('pull parity and rollback', () => {
  const V = (n) => ({ updatedAt: `2026-01-0${n}`, actorId: 'u' });
  const full = baseState({
    entries: [
      { id: 'p2', fields: { nombre: 'B' } },
      { id: 'p1', fields: { nombre: 'A' } },
    ],
    entityVersions: { 'entries/p1/fields': V(1), 'labSidecars/p1/s1': V(2), 'todos/t1': V(3) },
    todos: { t1: { text: 'x' } },
    agenda: [{ id: 'ag' }],
    tombstones: { gone: { deletedAt: '2026-01-05' } },
  });

  it('a sharded room loads exactly like the fat room, labs included, no marker keys leak', async () => {
    const fat = fakeDb({ revision: 3 });
    await fat.setLegacyState(full);
    await fat.setLegacyPatientShard('p1', { s1: { v: 1 } });
    const sharded = fakeDb({ revision: 3 });
    await sharded.setShardedState(full);
    await sharded.setLegacyPatientShard('p1', { s1: { v: 1 } });
    const a = await loadRoomState(TEST_KEY, fat, ROOM_ID);
    const b = await loadRoomState(TEST_KEY, sharded, ROOM_ID);
    assert.deepEqual(b.state, a.state);
    for (const k of ['patientsSharded', 'entryOrder', 'looseEntries']) {
      assert.equal(k in b.state, false);
    }
  });

  it('refattenRoomCore writes one fat core, drops patient rows, state unchanged', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setShardedState(full);
    const before = await loadRoomState(TEST_KEY, db, ROOM_ID, { skipLabShards: true });
    const res = await refattenRoomCore(TEST_KEY, db, ROOM_ID);
    assert.deepEqual(res, { changed: true });
    assert.equal(db.patients.size, 0);
    const core = await db.getCoreState();
    assert.equal(core.patientsSharded, undefined);
    const after = await loadRoomState(TEST_KEY, db, ROOM_ID, { skipLabShards: true });
    assert.deepEqual(after.state, before.state);
    assert.equal(after.shardBaseline, null);
  });

  it('refattenRoomCore leaves a room that was never split alone', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setLegacyState(full);
    assert.deepEqual(await refattenRoomCore(TEST_KEY, db, ROOM_ID), { changed: false });
  });
});

describe('handleSync push room read', () => {
  it('first attempt reuses the room row from requireMember', async () => {
    const db = fakeDb({ revision: 3 });
    await db.setShardedState?.(baseState({ entries: [{ id: 'p1', fields: { nombre: 'A' } }] }));
    db.boundCalls.length = 0;
    const request = new Request(`https://x/rooms/${ROOM_ID}/mutations`, {
      method: 'POST',
      headers: { Authorization: 'Bearer t' },
      body: JSON.stringify({
        clientMutationId: 'm-reuse',
        baseRevision: 3,
        ops: [{ path: 'entries/p1/fields', value: { nombre: 'B' }, updatedAt: '2026-02-01', actorId: 'u1' }],
      }),
    });
    const res = await handleSync(request, { ...TEST_KEY, DB: db }, ROOM_ID, 'mutations');
    assert.equal(res.status, 200);
    const reads = db.boundCalls.filter((c) => c.sql.includes('SELECT revision, storage_bytes FROM rooms'));
    assert.equal(reads.length, 0);
  });
});
