import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { encodeRoomState, decodeRoomState } from './crypto-at-rest.js';
import { SyncError } from './errors.js';
import { QUOTAS } from './quotas.js';
import { loadRoomState, commitMutationBatch } from './sync.js';

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
              if (sql.includes('UPDATE room_state SET ciphertext')) {
                const [ciphertext, iv, , , , clientMutationId, nextRevision] = args;
                if (!mutationRows.has(`${clientMutationId}:${nextRevision}`)) {
                  return { meta: { changes: 0 } };
                }
                core = { ciphertext, iv };
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
      for (const stmt of stmts) results.push(await stmt.run());
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
