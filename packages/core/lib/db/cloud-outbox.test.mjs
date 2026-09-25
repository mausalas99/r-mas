import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import { listCloudOutbox, replaceCloudOutbox } from './cloud-outbox.mjs';

function openDb() {
  const db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

describe('cloud-outbox', () => {
  it('round-trips rows through replaceCloudOutbox/listCloudOutbox', () => {
    const db = openDb();
    replaceCloudOutbox(db, [
      { clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }], enqueuedAt: 10 },
      { clientMutationId: 'm2', ops: [{ path: 'b', value: 2 }], baseRevision: 5, enqueuedAt: 20 },
    ]);
    const rows = listCloudOutbox(db);
    assert.deepEqual(rows, [
      { clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }], enqueuedAt: 10 },
      { clientMutationId: 'm2', ops: [{ path: 'b', value: 2 }], baseRevision: 5, enqueuedAt: 20 },
    ]);
    db.close();
  });

  it('replaceCloudOutbox drops rows missing after a resync', () => {
    const db = openDb();
    replaceCloudOutbox(db, [{ clientMutationId: 'm1', ops: [], enqueuedAt: 1 }]);
    replaceCloudOutbox(db, [{ clientMutationId: 'm2', ops: [], enqueuedAt: 2 }]);
    const rows = listCloudOutbox(db);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].clientMutationId, 'm2');
    db.close();
  });

  it('skips rows with no clientMutationId', () => {
    const db = openDb();
    replaceCloudOutbox(db, [{ clientMutationId: '', ops: [], enqueuedAt: 1 }]);
    assert.deepEqual(listCloudOutbox(db), []);
    db.close();
  });
});
