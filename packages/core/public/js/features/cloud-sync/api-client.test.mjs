import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSyncApi } from './api-client.mjs';
import { generateDek, encryptValue } from './crypto.mjs';
import { isRoomUnprotected, clearRoomDekCache } from './room-dek.mjs';

const ROOM_ID = 'room-1';
const originalFetch = globalThis.fetch;

/** @param {(url: string, init: object) => { status?: number, body: object }} handler */
function stubFetch(handler) {
  globalThis.fetch = async (url, init) => {
    const { status = 200, body } = handler(String(url), init);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: '',
      headers: { get: () => null },
      async json() {
        return body;
      },
    };
  };
}

describe('createCloudSyncApi push/pull encryption', () => {
  after(() => {
    globalThis.fetch = originalFetch;
  });

  it('push encrypts content-path op values on the wire when a DEK is supplied', async () => {
    /** @type {any} */
    let sentBody = null;
    stubFetch((url, init) => {
      sentBody = JSON.parse(String(init.body));
      return { body: { revision: 1, applied: [], rejected: [] } };
    });

    const dek = await generateDek();
    const api = createCloudSyncApi({
      getBaseUrl: () => 'https://x',
      getToken: () => 'tok',
      getRoomDek: () => dek,
    });

    await api.push(ROOM_ID, {
      clientMutationId: 'm1',
      ops: [
        { path: 'entries/p1/note', value: { text: 'nota' } },
        { path: 'entries/p1/fields', value: { nombre: 'Juan' } },
      ],
      baseRevision: 0,
    });

    assert.equal(sentBody.ops[0].value.enc, 1);
    assert.deepEqual(sentBody.ops[1].value, { nombre: 'Juan' });
  });

  it('push sends plaintext ops unchanged when no DEK is available', async () => {
    /** @type {any} */
    let sentBody = null;
    stubFetch((url, init) => {
      sentBody = JSON.parse(String(init.body));
      return { body: { revision: 1, applied: [], rejected: [] } };
    });

    const api = createCloudSyncApi({
      getBaseUrl: () => 'https://x',
      getToken: () => 'tok',
      getRoomDek: () => null,
    });

    await api.push(ROOM_ID, {
      clientMutationId: 'm1',
      ops: [{ path: 'entries/p1/note', value: { text: 'nota' } }],
      baseRevision: 0,
    });

    assert.deepEqual(sentBody.ops[0].value, { text: 'nota' });
  });

  it('pull decrypts an incremental ops response', async () => {
    const dek = await generateDek();
    const envelope = await encryptValue(dek, { text: 'nota' });
    stubFetch(() => ({
      body: { revision: 2, ops: [{ path: 'entries/p1/note', value: envelope }] },
    }));

    const api = createCloudSyncApi({
      getBaseUrl: () => 'https://x',
      getToken: () => 'tok',
      getRoomDek: () => dek,
    });

    const data = await api.pull(ROOM_ID, 1);
    assert.deepEqual(data.ops[0].value, { text: 'nota' });
  });

  it('pull decrypts a full snapshot response', async () => {
    const dek = await generateDek();
    const envelope = await encryptValue(dek, { text: 'nota' });
    stubFetch(() => ({
      body: {
        revision: 5,
        needSnapshot: true,
        state: { entries: [{ id: 'p1', nombre: 'Juan', note: envelope }] },
      },
    }));

    const api = createCloudSyncApi({
      getBaseUrl: () => 'https://x',
      getToken: () => 'tok',
      getRoomDek: () => dek,
    });

    const data = await api.pull(ROOM_ID, 0);
    assert.equal(data.state.entries[0].nombre, 'Juan');
    assert.deepEqual(data.state.entries[0].note, { text: 'nota' });
  });

  it('flags the room unprotected when a pull comes back with ciphertext this device cannot open', async () => {
    clearRoomDekCache();
    const dek = await generateDek();
    const envelope = await encryptValue(dek, { text: 'nota' });
    stubFetch(() => ({
      body: { revision: 2, ops: [{ path: 'entries/p1/note', value: envelope }] },
    }));

    const api = createCloudSyncApi({
      getBaseUrl: () => 'https://x',
      getToken: () => 'tok',
      getRoomDek: () => null, // this device has no DEK for the room yet
    });

    assert.equal(isRoomUnprotected('room-unprotected-1'), false);
    await api.pull('room-unprotected-1', 1);
    assert.equal(isRoomUnprotected('room-unprotected-1'), true);
  });

  it('does not flag the room when the pull decrypts cleanly', async () => {
    clearRoomDekCache();
    const dek = await generateDek();
    const envelope = await encryptValue(dek, { text: 'nota' });
    stubFetch(() => ({
      body: { revision: 2, ops: [{ path: 'entries/p1/note', value: envelope }] },
    }));

    const api = createCloudSyncApi({
      getBaseUrl: () => 'https://x',
      getToken: () => 'tok',
      getRoomDek: () => dek,
    });

    await api.pull('room-unprotected-2', 1);
    assert.equal(isRoomUnprotected('room-unprotected-2'), false);
  });
});

describe('createCloudSyncApi — error messages', () => {
  after(() => {
    globalThis.fetch = originalFetch;
  });

  it('shows a plain Spanish message for a cloud_sync_timeout, not the raw code', async () => {
    stubFetch(() => ({ status: 0, body: { error: 'cloud_sync_timeout' } }));
    const api = createCloudSyncApi({ getBaseUrl: () => 'https://x', getToken: () => 'tok' });
    await assert.rejects(() => api.pull(ROOM_ID, 0), /La Nube no respondió a tiempo/);
  });

  it('shows the server Spanish message, not the raw machine code', async () => {
    stubFetch(() => ({ status: 403, body: { error: 'not_member', message: 'No eres miembro de esta sala.' } }));
    const api = createCloudSyncApi({ getBaseUrl: () => 'https://x', getToken: () => 'tok' });
    await assert.rejects(() => api.pull(ROOM_ID, 0), /No eres miembro de esta sala/);
  });

  it('falls back to the machine code when the server sends no message', async () => {
    stubFetch(() => ({ status: 403, body: { error: 'not_member' } }));
    const api = createCloudSyncApi({ getBaseUrl: () => 'https://x', getToken: () => 'tok' });
    await assert.rejects(() => api.pull(ROOM_ID, 0), /not_member/);
  });

  it('captures Retry-After on a 503 D1-overload response, same as 429', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 503,
      statusText: '',
      headers: { get: (name) => (name === 'Retry-After' ? '5' : null) },
      async json() {
        return { error: 'overloaded', message: 'D1_ERROR: D1 DB is overloaded' };
      },
    });
    const api = createCloudSyncApi({ getBaseUrl: () => 'https://x', getToken: () => 'tok' });
    await assert.rejects(() => api.pull(ROOM_ID, 0), (err) => {
      assert.equal(err.status, 503);
      assert.equal(err.retryAfterMs, 5000);
      return true;
    });
  });
});
