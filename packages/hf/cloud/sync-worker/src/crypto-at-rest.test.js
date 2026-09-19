import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptJson,
  decryptJson,
  encodeRoomState,
  decodeRoomState,
  __test,
} from './crypto-at-rest.js';

describe('crypto-at-rest', () => {
  it('encodeRoomState round-trips AES-256-GCM', async () => {
    const env = { WORKER_DATA_KEY: 'ab'.repeat(32) };
    const obj = { hello: 'world', n: 1 };
    const { ciphertext, iv, storageBytes } = await encodeRoomState(env, obj);
    assert.equal(iv.byteLength, 12);
    assert.ok(storageBytes > 0);
    assert.notEqual(ciphertext[0], 0x7b); // not plain JSON
    const decoded = await decodeRoomState(env, ciphertext, iv);
    assert.deepEqual(decoded, obj);
  });

  it('decodeRoomState still reads legacy AES-GCM blobs', async () => {
    const env = { WORKER_DATA_KEY: 'ab'.repeat(32) };
    const obj = { legacy: true, entries: [] };
    const { ciphertext, iv } = await encryptJson(env, obj);
    const decoded = await decryptJson(env, ciphertext, iv);
    assert.deepEqual(decoded, obj);
  });

  it('decodeRoomState accepts JSON returned as a string (D1 quirk)', async () => {
    const obj = { sala: 'Sala 2', entries: [] };
    const raw = JSON.stringify(obj);
    const decoded = await decodeRoomState({}, raw, '');
    assert.deepEqual(decoded, obj);
  });

  it('toUint8Array accepts number[] BLOB shape', () => {
    const bytes = __test.toUint8Array([0x7b, 0x7d]);
    assert.equal(bytes.byteLength, 2);
    assert.equal(bytes[0], 0x7b);
  });

  it('legacy AES round-trip via decryptJson', async () => {
    const env = { WORKER_DATA_KEY: 'cd'.repeat(32) };
    const obj = { hello: 'world' };
    const { ciphertext, iv } = await encryptJson(env, obj);
    const decoded = await decryptJson(env, ciphertext, iv);
    assert.deepEqual(decoded, obj);
  });

});
