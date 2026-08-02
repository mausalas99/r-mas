import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptJson, decryptJson } from './crypto-at-rest.js';

describe('crypto-at-rest', () => {
  it('round-trips JSON via AES-GCM', async () => {
    const env = { WORKER_DATA_KEY: 'ab'.repeat(32) };
    const obj = { hello: 'world' };
    const { ciphertext, iv } = await encryptJson(env, obj);
    const decoded = await decryptJson(env, ciphertext, iv);
    assert.deepEqual(decoded, obj);
  });
});
