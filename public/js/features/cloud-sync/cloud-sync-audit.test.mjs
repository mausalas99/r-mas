import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DEK_EVENTS, auditDekEvent } from './cloud-sync-audit.mjs';

describe('cloud-sync-audit', () => {
  let calls;

  beforeEach(() => {
    calls = [];
    globalThis.window = {
      electronAPI: {
        dbAuditAppend: async (payload) => {
          calls.push(payload);
          return { ok: true };
        },
      },
    };
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it('DEK_EVENTS constants are defined', () => {
    assert.equal(DEK_EVENTS.DEK_CREATED, 'nube.dek.created');
    assert.equal(DEK_EVENTS.WRAP_PUT, 'nube.dek.wrap_put');
    assert.equal(DEK_EVENTS.WRAP_GET, 'nube.dek.wrap_get');
    assert.equal(DEK_EVENTS.WRAP_FAILED, 'nube.dek.wrap_failed');
  });

  it('auditDekEvent calls dbAuditAppend with eventType and meta', async () => {
    await auditDekEvent(DEK_EVENTS.DEK_CREATED, { roomId: 'r1', deviceId: 'd1' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].eventType, 'nube.dek.created');
    assert.equal(calls[0].meta.roomId, 'r1');
  });

  it('auditDekEvent swallows errors silently', async () => {
    globalThis.window.electronAPI.dbAuditAppend = async () => { throw new Error('db down'); };
    await assert.doesNotReject(() => auditDekEvent(DEK_EVENTS.WRAP_PUT, {}));
  });

  it('auditDekEvent is a no-op when no electronAPI', async () => {
    delete globalThis.window;
    await assert.doesNotReject(() => auditDekEvent(DEK_EVENTS.WRAP_GET, {}));
  });
});
