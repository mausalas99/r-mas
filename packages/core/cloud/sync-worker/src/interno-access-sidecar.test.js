import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SyncError } from './errors.js';
import {
  applyInternoAccessUpsert,
  isInternoAccessUpsertOp,
  partitionSyncOps,
} from './interno-access-sidecar.js';

describe('interno-access-sidecar', () => {
  it('isInternoAccessUpsertOp detects typed sidecar ops', () => {
    assert.equal(isInternoAccessUpsertOp({ type: 'internoAccessUpsert', sala: 'Sala 1' }), true);
    assert.equal(isInternoAccessUpsertOp({ path: 'clinicalOps' }), false);
  });

  it('partitionSyncOps splits LWW path ops from interno sidecars', () => {
    const lww = { path: 'clinicalOps', value: {}, updatedAt: 't', actorId: 'a' };
    const sidecar = { type: 'internoAccessUpsert', sala: 'Sala 1', accessToken: 'tok' };
    const { lwwOps, sidecarOps } = partitionSyncOps([lww, sidecar]);
    assert.deepEqual(lwwOps, [lww]);
    assert.deepEqual(sidecarOps, [sidecar]);
  });

  it('applyInternoAccessUpsert upserts D1 when sala matches room', async () => {
    /** @type {Array<{ sql: string, args: unknown[] }>} */
    const runs = [];
    const db = {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() {
                if (sql.includes('FROM rooms')) {
                  return { sala: 'Sala 1' };
                }
                return null;
              },
              async run() {
                runs.push({ sql, args });
              },
            };
          },
        };
      },
    };

    const op = {
      type: 'internoAccessUpsert',
      sala: 'Sala 1',
      accessToken: 'hex-token',
      isActive: true,
      rotatedAt: '2026-08-07T12:00:00.000Z',
      rotatedBy: 'user-1',
    };
    const applied = await applyInternoAccessUpsert(db, 'room-1', op);
    assert.equal(applied, op);
    assert.equal(runs.length, 1);
    assert.match(runs[0].sql, /INSERT INTO sala_interno_access/);
    assert.deepEqual(runs[0].args, ['Sala 1', 'hex-token', 1, '2026-08-07T12:00:00.000Z', 'user-1']);
  });

  it('applyInternoAccessUpsert rejects sala mismatch with room', async () => {
    const db = {
      prepare() {
        return {
          bind() {
            return {
              async first() {
                return { sala: 'Sala 2' };
              },
            };
          },
        };
      },
    };
    await assert.rejects(
      () =>
        applyInternoAccessUpsert(db, 'room-1', {
          type: 'internoAccessUpsert',
          sala: 'Sala 1',
          accessToken: 'tok',
        }),
      (err) => err instanceof SyncError && err.code === 'invalid_request'
    );
  });
});
