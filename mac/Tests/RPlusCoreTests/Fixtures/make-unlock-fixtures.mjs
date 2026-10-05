// Makes the unlock parity fixture. Run with Electron's Node:
//   ELECTRON_RUN_AS_NODE=1 <Electron binary> make-unlock-fixtures.mjs
// Writes unlock-fixtures.json: synthetic passphrase, salts, recovery codes and the blobs
// Node's crypto.mjs makes from them. Swift must unwrap them to the same key.
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const c = await import(join(resolve(here, '../../../../packages/core/lib/db'), 'crypto.mjs'));

const kdfSalt = Buffer.from(Array.from({ length: 16 }, (_, i) => i));
const recoverySalt = Buffer.from(Array.from({ length: 16 }, (_, i) => 100 + i));
const passphrase = 'correct horse';
const keyHex = await c.deriveSqlcipherKeyHex(passphrase, kdfSalt);

async function wrap(code) {
  const wk = await c.deriveRecoveryWrappingKeyHex(recoverySalt, code);
  return { wrappingKeyHex: wk, wrapped: c.wrapKeyForRecovery(keyHex, wk) };
}
const current = await wrap('R+ABCD2345');
const legacy = await wrap(c.LEGACY_RECOVERY_CODE);

const out = {
  passphrase,
  kdfSaltB64: kdfSalt.toString('base64'),
  keyHex,
  recoverySaltB64: recoverySalt.toString('base64'),
  recoveryCode: 'R+ABCD2345',
  recoveryCodeMessyInput: '  r+abcd 2345\n',
  wrappingKeyHex: current.wrappingKeyHex,
  wrapped: current.wrapped,
  legacyCode: c.LEGACY_RECOVERY_CODE,
  legacyWrappingKeyHex: legacy.wrappingKeyHex,
  legacyWrapped: legacy.wrapped,
  // A real generated code, to prove the alphabet and length rule.
  sampleGeneratedCode: c.generateRecoveryCode(),
};
writeFileSync(join(here, 'unlock-fixtures.json'), JSON.stringify(out, null, 2) + '\n');
console.log('wrote unlock-fixtures.json');
