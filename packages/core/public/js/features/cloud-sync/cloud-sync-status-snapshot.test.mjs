import { describe, it } from 'node:test';
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

  it('Worker unreachable with queued changes keeps «Pendiente · sin conexión», not «Reconectando»', () => {
    const outbox = createSqlcipherOutbox();
    outbox.enqueue({ clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }] });
    const runtime = { ...fakeRuntime('pending', 'poll'), getDetail: () => 'Sin conexión con el servidor Nube. Se enviará al reconectar.' };
    const chip = resolveCloudConexionChipStatus({ runtime, outbox });
    assert.equal(chip.status, 'pending');
    assert.match(chip.detail, /Sin conexión/);
  });
});
