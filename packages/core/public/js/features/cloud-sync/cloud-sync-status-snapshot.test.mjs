import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCloudConexionChipStatus } from './cloud-sync-status-snapshot.mjs';
import { createSqlcipherOutbox } from './outbox-sqlcipher.mjs';

/**
 * @param {string} status
 * @param {'ws' | 'poll' | 'offline'} [transport] Defaults to 'ws' — these
 *   fixtures are about the outbox/status axis, not the channel-down axis
 *   covered separately below.
 */
function fakeRuntime(status, transport = 'ws') {
  return {
    getStatus: () => status,
    getDetail: () => '',
    getTransportState: () => transport,
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

describe('resolveCloudConexionChipStatus — live channel down never reads as green', () => {
  it('idle over poll (WS down) reports reconnecting, not "Nube al día"', () => {
    const outbox = createSqlcipherOutbox();
    assert.equal(
      resolveCloudConexionChipStatus({ runtime: fakeRuntime('idle', 'poll'), outbox }).status,
      'reconnecting'
    );
  });

  it('pending outbox over poll (WS down) still surfaces reconnecting — the channel matters more than the queue', () => {
    const outbox = createSqlcipherOutbox();
    outbox.enqueue({ clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }] });
    assert.equal(
      resolveCloudConexionChipStatus({ runtime: fakeRuntime('idle', 'poll'), outbox }).status,
      'reconnecting'
    );
  });

  it('idle over ws (WS up) stays "Nube al día"', () => {
    const outbox = createSqlcipherOutbox();
    assert.equal(
      resolveCloudConexionChipStatus({ runtime: fakeRuntime('idle', 'ws'), outbox }).status,
      'idle'
    );
  });

  it('error/offline/syncing are never masked by the channel check', () => {
    const outbox = createSqlcipherOutbox();
    for (const status of ['error', 'offline', 'syncing']) {
      assert.equal(
        resolveCloudConexionChipStatus({ runtime: fakeRuntime(status, 'poll'), outbox }).status,
        status
      );
    }
  });
});
