import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildModuleManifest, signModuleManifest } from './sign-module-bundle.mjs';
import {
  loadJsonFile,
  saveJsonFile,
  loadRollbackState,
  saveRollbackState,
  loadRollbackOverrideVersion,
  saveRollbackOverrideVersion,
  verifyShippedBundle,
} from './module-boot-guard.mjs';

function tmpFile(name) {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'module-boot-guard-test-')), name);
}

function signedBundleFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'module-boot-guard-bundle-'));
  fs.writeFileSync(path.join(dir, 'app.bundle.mjs'), 'console.log(1);');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const manifest = buildModuleManifest({
    packageName: '@rplus/core',
    version: '1',
    bundleDir: dir,
    relativeFilePaths: ['app.bundle.mjs'],
  });
  const signature = signModuleManifest(manifest, privateKeyPem);
  const manifestPath = path.join(dir, 'module-manifest.json');
  const signaturePath = path.join(dir, 'module-signature.txt');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  fs.writeFileSync(signaturePath, signature);
  return { dir, manifestPath, signaturePath, publicKeyPem };
}

describe('loadJsonFile / saveJsonFile', () => {
  it('round-trips a value through disk', () => {
    const file = tmpFile('data.json');
    saveJsonFile(file, { a: 1 });
    assert.deepEqual(loadJsonFile(file, null), { a: 1 });
  });

  it('returns the fallback when the file is missing or unreadable', () => {
    assert.equal(loadJsonFile(tmpFile('missing.json'), 'fallback'), 'fallback');
  });
});

describe('rollback state', () => {
  it('defaults an unwritten state file to empty failures', () => {
    const state = loadRollbackState(tmpFile('state.json'));
    assert.deepEqual(state, { lastGoodVersion: undefined, failures: {}, pendingVersion: undefined });
  });

  it('round-trips a real state', () => {
    const file = tmpFile('state.json');
    saveRollbackState(file, { lastGoodVersion: '1.0.0', failures: { '1.0.1': 2 }, pendingVersion: '1.0.1' });
    assert.deepEqual(loadRollbackState(file), {
      lastGoodVersion: '1.0.0',
      failures: { '1.0.1': 2 },
      pendingVersion: '1.0.1',
    });
  });
});

describe('rollback override', () => {
  it('is absent by default', () => {
    assert.equal(loadRollbackOverrideVersion(tmpFile('override.json')), null);
  });

  it('only reports the version it was explicitly set to', () => {
    const file = tmpFile('override.json');
    saveRollbackOverrideVersion(file, '1.0.1');
    assert.equal(loadRollbackOverrideVersion(file), '1.0.1');
  });
});

describe('verifyShippedBundle', () => {
  it('accepts a genuine signed bundle', () => {
    const { dir, manifestPath, signaturePath, publicKeyPem } = signedBundleFixture();
    assert.deepEqual(verifyShippedBundle({ bundleDir: dir, manifestPath, signaturePath, publicKeyPem }), {
      ok: true,
    });
  });

  it('fails closed when the manifest is missing (unsigned build)', () => {
    const { dir, signaturePath, publicKeyPem } = signedBundleFixture();
    const result = verifyShippedBundle({
      bundleDir: dir,
      manifestPath: path.join(dir, 'no-such-manifest.json'),
      signaturePath,
      publicKeyPem,
    });
    assert.deepEqual(result, { ok: false, reason: 'missing-manifest' });
  });

  it('fails closed when a bundle file was changed after signing', () => {
    const { dir, manifestPath, signaturePath, publicKeyPem } = signedBundleFixture();
    fs.writeFileSync(path.join(dir, 'app.bundle.mjs'), 'console.log("tampered");');
    const result = verifyShippedBundle({ bundleDir: dir, manifestPath, signaturePath, publicKeyPem });
    assert.deepEqual(result, { ok: false, reason: 'file-hash-mismatch' });
  });
});
