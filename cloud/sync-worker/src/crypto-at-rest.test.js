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
  it('encodeRoomState stores plaintext JSON (Free CPU path)', async () => {
    const obj = { hello: 'world', n: 1 };
    const { ciphertext, iv, storageBytes } = encodeRoomState(obj);
    assert.equal(iv.byteLength, 0);
    assert.ok(storageBytes > 0);
    assert.equal(ciphertext[0], 0x7b);
    const decoded = await decodeRoomState({}, ciphertext, iv);
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

  it('rejects oversized legacy AES on Free path', async () => {
    const env = { WORKER_DATA_KEY: 'ab'.repeat(32) };
    const huge = new Uint8Array(300 * 1024);
    huge[0] = 0x00;
    const iv = new Uint8Array(12);
    await assert.rejects(
      () => decodeRoomState(env, huge, iv),
      /legacy AES too large/
    );
  });
});
