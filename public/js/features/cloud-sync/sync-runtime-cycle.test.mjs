import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSyncRuntimeCycle,
  humanizeCloudSyncErrorMessage,
} from './sync-runtime-cycle.mjs';

function makeOutbox(rows = []) {
  let list = rows.slice();
  return {
    list: () => list.slice(),
    remove(id) {
      list = list.filter((r) => r.clientMutationId !== id);
    },
  };
}

describe('createSyncRuntimeCycle status', () => {
  let prevOnline;
  before(() => {
    prevOnline = Object.getOwnPropertyDescriptor(globalThis.navigator || {}, 'onLine');
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });
  after(() => {
    if (prevOnline) Object.defineProperty(globalThis.navigator, 'onLine', prevOnline);
  });

  it('humanizeCloudSyncErrorMessage maps Failed to fetch', () => {
    assert.match(humanizeCloudSyncErrorMessage('Failed to fetch'), /Wi|red|Nube/i);
    assert.equal(humanizeCloudSyncErrorMessage('Revisión conflictiva'), 'Revisión conflictiva');
  });

  it('keeps error after failed push (does not flip to pending)', async () => {
    const statuses = [];
    const outbox = makeOutbox([
      { clientMutationId: 'm1', ops: [{ t: 1 }], baseRevision: 0, enqueuedAt: 1 },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1 }),
        push: async () => {
          const err = new Error('push_failed');
          err.data = { message: 'Revisión conflictiva' };
          throw err;
        },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus(status, detail) {
        statuses.push({ status, detail });
      },
    });

    await runtime.syncCycle();
    runtime.stop();

    const last = statuses[statuses.length - 1];
    assert.equal(last.status, 'error');
    assert.match(String(last.detail || ''), /Revisión conflictiva/);
    const errorIdx = statuses.findIndex((s) => s.status === 'error');
    assert.ok(errorIdx >= 0);
    assert.ok(!statuses.slice(errorIdx + 1).some((s) => s.status === 'pending'));
  });

  it('reaches idle when pull succeeds and outbox empty', async () => {
    const statuses = [];
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 2 }),
        push: async () => ({ revision: 2 }),
      },
      outbox: makeOutbox(),
      getRoomId: () => 'room-1',
      getRevision: () => 1,
      setRevision: () => {},
      onStatus(status) {
        statuses.push(status);
      },
    });

    await runtime.syncCycle();
    runtime.stop();

    assert.equal(statuses[statuses.length - 1], 'idle');
  });

  it('truncates oversized lab sourceText before push and reaches idle', async () => {
    const pushed = [];
    const outbox = makeOutbox([
      {
        clientMutationId: 'm-fat',
        ops: [
          {
            path: 'labSidecars/p1/1785683680719-1-0',
            value: { id: '1785683680719-1-0', resLabs: ['BH\tHb 8'], sourceText: 'Z'.repeat(600_000) },
            updatedAt: 't',
            actorId: 'a',
          },
        ],
        baseRevision: 0,
        enqueuedAt: 1,
      },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1 }),
        push: async (_roomId, body) => {
          pushed.push(body);
          return { revision: 1 };
        },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus() {},
    });

    await runtime.syncCycle();
    runtime.stop();

    assert.equal(pushed.length, 1);
    const text = String(pushed[0].ops[0].value.sourceText || '');
    assert.ok(text.length > 0);
    assert.ok(text.length < 600_000);
    assert.equal(outbox.list().length, 0);
  });
});
