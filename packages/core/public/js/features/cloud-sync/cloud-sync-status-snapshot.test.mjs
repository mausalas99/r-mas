import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCloudConexionChipStatus } from './cloud-sync-status-snapshot.mjs';
import { createSqlcipherOutbox } from './outbox-sqlcipher.mjs';

/** @param {string} status */
function fakeRuntime(status) {
  return {
    getStatus: () => status,
    getDetail: () => '',
    getTransportState: () => 'poll',
  };
}

describe('resolveCloudConexionChipStatus — outbox pending vs runtime idle', () => {
  beforeEach(() => {
    globalThis.window = {};
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it('a change restored from the encrypted DB reads as Pendiente, not "Nube al día"', async () => {
    globalThis.window.electronAPI = {
      dbCloudOutboxList: async () => ({
        ok: true,
        rows: [{ clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }], enqueuedAt: 1 }],
      }),
      dbCloudOutboxReplaceAll: async () => ({ ok: true }),
    };
    const outbox = createSqlcipherOutbox();

    // Boot order the panel really runs: the runtime settles on 'idle' against an
    // empty queue, then hydrate() restores last session's unsent rows.
    const runtime = fakeRuntime('idle');
    assert.equal(resolveCloudConexionChipStatus({ runtime, outbox }).status, 'idle');

    await outbox.hydrate();

    assert.equal(outbox.list().length, 1);
    assert.equal(resolveCloudConexionChipStatus({ runtime, outbox }).status, 'pending');
  });

  it('an in-session enqueue the runtime has not cycled on yet also reads as Pendiente', () => {
    const outbox = createSqlcipherOutbox();
    outbox.enqueue({ clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }] });
    assert.equal(
      resolveCloudConexionChipStatus({ runtime: fakeRuntime('idle'), outbox }).status,
      'pending'
    );
  });

  it('an empty outbox leaves idle alone', () => {
    const outbox = createSqlcipherOutbox();
    assert.equal(
      resolveCloudConexionChipStatus({ runtime: fakeRuntime('idle'), outbox }).status,
      'idle'
    );
  });

  it('pending rows never mask a status the owner has to act on', () => {
    const outbox = createSqlcipherOutbox();
    outbox.enqueue({ clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }] });
    for (const status of ['error', 'offline', 'syncing']) {
      assert.equal(
        resolveCloudConexionChipStatus({ runtime: fakeRuntime(status), outbox }).status,
        status
      );
    }
  });

  it('no runtime and no outbox yet is idle, not a throw', () => {
    assert.deepEqual(resolveCloudConexionChipStatus({ runtime: null, outbox: null }), {
      status: 'idle',
      detail: '',
      transport: 'poll',
    });
  });
});
