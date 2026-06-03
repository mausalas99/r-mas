import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import {
  countLanSyncOutbox,
  drainLanSyncOutbox,
  enqueueLanSyncOutbox,
  LAN_OUTBOX_MAX_PER_ROOM,
} from './lan-sync-outbox.mjs';

describe('lan-sync-outbox', () => {
  it('enforces max items per room (oldest dropped)', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const roomId = 'sala-test';
    for (let i = 0; i < LAN_OUTBOX_MAX_PER_ROOM + 5; i += 1) {
      enqueueLanSyncOutbox(db, {
        roomId,
        kind: 'bundle',
        payload: { n: i },
      });
    }
    assert.equal(countLanSyncOutbox(db, { roomId }), LAN_OUTBOX_MAX_PER_ROOM);
    const items = drainLanSyncOutbox(db, { roomId });
    assert.equal(items.length, LAN_OUTBOX_MAX_PER_ROOM);
    assert.equal(items[0].payload.n, 5);
    assert.equal(items[items.length - 1].payload.n, LAN_OUTBOX_MAX_PER_ROOM + 4);
    db.close();
  });

  it('drain removes rows for room only', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    enqueueLanSyncOutbox(db, { roomId: 'a', kind: 'patch', payload: { x: 1 } });
    enqueueLanSyncOutbox(db, { roomId: 'b', kind: 'bundle', payload: { y: 2 } });
    const drained = drainLanSyncOutbox(db, { roomId: 'a' });
    assert.equal(drained.length, 1);
    assert.equal(countLanSyncOutbox(db, { roomId: 'a' }), 0);
    assert.equal(countLanSyncOutbox(db, { roomId: 'b' }), 1);
    db.close();
  });
});
