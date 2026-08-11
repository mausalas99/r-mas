import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { canExecuteClinicalCommand, executeClinicalCommand } from './clinical-repo-client.mjs';

describe('clinical-repo-client', () => {
  const prev = globalThis.window;

  beforeEach(() => {
    globalThis.window = {
      electronAPI: {
        dbClinicalCommand: async (payload) => {
          assert.equal(payload.command.type, 'eventualidad.upsert');
          return { ok: true, changedKeys: ['patients'], changeId: 'chg_test' };
        },
      },
    };
  });

  afterEach(() => {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  });

  it('canExecuteClinicalCommand detects IPC', () => {
    assert.equal(canExecuteClinicalCommand(), true);
  });

  it('executeClinicalCommand invokes electronAPI.dbClinicalCommand', async () => {
    const res = await executeClinicalCommand(
      { type: 'eventualidad.upsert', patientId: 'p1', entry: { text: 'x' } },
      { actorId: 'u1' }
    );
    assert.deepEqual(res, {
      ok: true,
      changedKeys: ['patients'],
      changeId: 'chg_test',
    });
  });

  it('returns ipc_unavailable without API', async () => {
    globalThis.window = {};
    assert.equal(canExecuteClinicalCommand(), false);
    const res = await executeClinicalCommand({ type: 'eventualidad.delete', patientId: 'p1', entryId: 'e1' });
    assert.deepEqual(res, { ok: false, error: 'ipc_unavailable' });
  });
});
