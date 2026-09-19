import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSyncApi } from './api-client.mjs';
import { generateDek, encryptValue } from './crypto.mjs';

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
});
