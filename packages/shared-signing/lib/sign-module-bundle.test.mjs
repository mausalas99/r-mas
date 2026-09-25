import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hashBundleFiles, buildModuleManifest, signModuleManifest } from './sign-module-bundle.mjs';

function makeBundleDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-signing-test-'));
  fs.writeFileSync(path.join(dir, 'app.bundle.mjs'), 'console.log(1);');
  fs.mkdirSync(path.join(dir, 'chunks'));
  fs.writeFileSync(path.join(dir, 'chunks', 'a-123.mjs'), 'export const a = 1;');
  return dir;
}

function generateKeyPair() {
  return crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
}

describe('hashBundleFiles', () => {
  it('hashes each file to its real sha256', () => {
    const dir = makeBundleDir();
    const [entry] = hashBundleFiles(dir, ['app.bundle.mjs']);
    assert.equal(entry.path, 'app.bundle.mjs');
    assert.equal(
      entry.sha256,
      crypto.createHash('sha256').update('console.log(1);').digest('hex')
    );
  });
});

describe('buildModuleManifest', () => {
  it('builds a manifest with package, version and file hashes', () => {
    const dir = makeBundleDir();
    const manifest = buildModuleManifest({
      packageName: '@rplus/core',
      version: '1',
      bundleDir: dir,
      relativeFilePaths: ['app.bundle.mjs', 'chunks/a-123.mjs'],
    });
    assert.equal(manifest.package, '@rplus/core');
    assert.equal(manifest.version, '1');
    assert.equal(manifest.files.length, 2);
  });

  it('defaults minCoreVersion/maxCoreVersion to the module version when not given', () => {
    const dir = makeBundleDir();
    const manifest = buildModuleManifest({
      packageName: '@rplus/core',
      version: '1.2.0',
      bundleDir: dir,
      relativeFilePaths: ['app.bundle.mjs'],
    });
    assert.equal(manifest.minCoreVersion, '1.2.0');
    assert.equal(manifest.maxCoreVersion, '1.2.0');
  });

  it('keeps an explicit minCoreVersion/maxCoreVersion range', () => {
    const dir = makeBundleDir();
    const manifest = buildModuleManifest({
      packageName: '@rplus/core',
      version: '1.2.0',
      bundleDir: dir,
      relativeFilePaths: ['app.bundle.mjs'],
      minCoreVersion: '1.0.0',
      maxCoreVersion: '1.5.0',
    });
    assert.equal(manifest.minCoreVersion, '1.0.0');
    assert.equal(manifest.maxCoreVersion, '1.5.0');
  });
});

describe('signModuleManifest', () => {
  it('produces a signature that verifies against the matching public key', () => {
    const { publicKey, privateKey } = generateKeyPair();
    const manifest = { package: '@rplus/core', version: '1', files: [] };
    const signatureHex = signModuleManifest(manifest, privateKey.export({ type: 'pkcs8', format: 'pem' }));

    const verifier = crypto.createVerify('SHA256');
    verifier.update(JSON.stringify(manifest));
    assert.equal(
      verifier.verify(publicKey.export({ type: 'spki', format: 'pem' }), signatureHex, 'hex'),
      true
    );
  });
});
