import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSqlcipherOutbox } from './outbox-sqlcipher.mjs';

describe('createSqlcipherOutbox', () => {
  beforeEach(() => {
    globalThis.window = {};
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it('enqueue works synchronously (no electronAPI needed to read back)', () => {
    const ob = createSqlcipherOutbox();
    ob.enqueue({ clientMutationId: 'm1', ops: [{ path: 'x' }] });
    assert.equal(ob.list().length, 1);
    assert.equal(ob.list()[0].ops[0].path, 'x');
  });

  it('mirrors every save to dbCloudOutboxReplaceAll', async () => {
    const calls = [];
    window.electronAPI = {
      dbCloudOutboxReplaceAll: async (rows) => {
        calls.push(rows);
        return { ok: true };
      },
    };
    const ob = createSqlcipherOutbox();
    ob.enqueue({ clientMutationId: 'm1', ops: [{ path: 'x' }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0].clientMutationId, 'm1');
  });

  it('a failing persist does not throw or lose the in-memory row', async () => {
    window.electronAPI = {
      dbCloudOutboxReplaceAll: async () => {
        throw new Error('IPC down');
      },
    };
    const ob = createSqlcipherOutbox();
    ob.enqueue({ clientMutationId: 'm1', ops: [{ path: 'x' }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(ob.list().length, 1);
  });

  it('hydrate loads rows persisted from a previous run', async () => {
    window.electronAPI = {
      dbCloudOutboxList: async () => ({
        ok: true,
        rows: [{ clientMutationId: 'm1', ops: [{ path: 'x' }], enqueuedAt: 1 }],
      }),
      dbCloudOutboxReplaceAll: async () => ({ ok: true }),
    };
    const ob = createSqlcipherOutbox();
    assert.equal(ob.list().length, 0);
    await ob.hydrate();
    assert.equal(ob.list().length, 1);
    assert.equal(ob.list()[0].clientMutationId, 'm1');
  });

  it('hydrate is a no-op without electronAPI', async () => {
    const ob = createSqlcipherOutbox();
    await ob.hydrate();
    assert.equal(ob.list().length, 0);
  });
});
