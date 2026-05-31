import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSqlcipherKeyHex, wrapDek, unwrapDek } from './crypto.mjs';

const mockSafe = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from('enc:' + s).toString('base64'),
  decryptString: (s) => Buffer.from(s, 'base64').toString('utf8').replace(/^enc:/, ''),
};

describe('crypto', () => {
  it('deriveSqlcipherKeyHex is 64 hex chars', async () => {
    const salt = Buffer.alloc(16, 1);
    const hex = await deriveSqlcipherKeyHex('test-pass', salt);
    assert.match(hex, /^[0-9a-f]{64}$/);
  });

  it('wrap and unwrap DEK', () => {
    const dek = 'ab'.repeat(32);
    const wrapped = wrapDek(dek, mockSafe);
    assert.equal(unwrapDek(wrapped, mockSafe), dek);
  });
});
