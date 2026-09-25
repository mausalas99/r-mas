import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildModuleManifest, signModuleManifest } from './sign-module-bundle.mjs';
import { verifyManifestSignature, verifyManifestFiles, verifyModuleUpdate } from './verify-module-update.mjs';

function makeBundleDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-signing-verify-test-'));
  fs.writeFileSync(path.join(dir, 'app.bundle.mjs'), 'console.log(1);');
  return dir;
}

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
}

function signedFixture() {
  const dir = makeBundleDir();
  const { publicKeyPem, privateKeyPem } = generateKeyPair();
  const manifest = buildModuleManifest({
    packageName: '@rplus/core',
    version: '1',
    bundleDir: dir,
    relativeFilePaths: ['app.bundle.mjs'],
  });
  const signature = signModuleManifest(manifest, privateKeyPem);
  return { dir, publicKeyPem, manifest, signature };
}

describe('verifyManifestSignature', () => {
  it('accepts a signature made with the matching private key', () => {
    const { publicKeyPem, manifest, signature } = signedFixture();
    assert.equal(verifyManifestSignature(manifest, signature, publicKeyPem), true);
  });

  it('rejects a manifest tampered after signing', () => {
    const { publicKeyPem, manifest, signature } = signedFixture();
    const tampered = { ...manifest, version: '2' };
    assert.equal(verifyManifestSignature(tampered, signature, publicKeyPem), false);
  });

  it('rejects a signature from a different key', () => {
    const { manifest, signature } = signedFixture();
    const { publicKeyPem: otherPublicKeyPem } = generateKeyPair();
    assert.equal(verifyManifestSignature(manifest, signature, otherPublicKeyPem), false);
  });
});

describe('verifyManifestFiles', () => {
  it('accepts a bundle whose files match the manifest hashes', () => {
    const { dir, manifest } = signedFixture();
    assert.equal(verifyManifestFiles(dir, manifest), true);
  });

  it('rejects a bundle where a file was changed after signing', () => {
    const { dir, manifest } = signedFixture();
    fs.writeFileSync(path.join(dir, 'app.bundle.mjs'), 'console.log("tampered");');
    assert.equal(verifyManifestFiles(dir, manifest), false);
  });

  it('rejects a bundle missing a manifest file', () => {
    const { dir, manifest } = signedFixture();
    fs.rmSync(path.join(dir, 'app.bundle.mjs'));
    assert.equal(verifyManifestFiles(dir, manifest), false);
  });
});

describe('verifyModuleUpdate', () => {
  it('accepts a genuine, unmodified update', () => {
    const { dir, publicKeyPem, manifest, signature } = signedFixture();
    assert.deepEqual(verifyModuleUpdate({ manifest, signature, publicKeyPem, bundleDir: dir }), { ok: true });
  });

  it('rejects on a bad signature before ever checking file hashes', () => {
    const { dir, publicKeyPem, manifest } = signedFixture();
    const result = verifyModuleUpdate({ manifest, signature: 'not-a-real-signature', publicKeyPem, bundleDir: dir });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'bad-signature');
  });

  it('rejects on a file-hash mismatch when the signature itself is valid', () => {
    const { dir, publicKeyPem, manifest, signature } = signedFixture();
    fs.writeFileSync(path.join(dir, 'app.bundle.mjs'), 'console.log("tampered");');
    const result = verifyModuleUpdate({ manifest, signature, publicKeyPem, bundleDir: dir });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'file-hash-mismatch');
  });
});
