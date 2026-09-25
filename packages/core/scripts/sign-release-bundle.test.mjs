import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import {
  collectBundleFiles,
  signReleaseBundle,
  buildModuleBundleZip,
  writeModuleFeedAssets,
  MODULE_MANIFEST_FILE,
  MODULE_SIGNATURE_FILE,
  MODULE_BUNDLE_ZIP_FILE,
} from './sign-release-bundle.mjs';
import { verifyShippedBundle } from '../../shared-signing/lib/module-boot-guard.mjs';

function makeBundleDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-release-bundle-test-'));
  fs.writeFileSync(path.join(dir, 'app.bundle.mjs'), 'console.log(1);');
  fs.mkdirSync(path.join(dir, 'chunks'));
  fs.writeFileSync(path.join(dir, 'chunks', 'auto-chart.js'), 'console.log(2);');
  return dir;
}

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
}

describe('collectBundleFiles', () => {
  it('includes app.bundle.mjs and every file under chunks/', () => {
    const dir = makeBundleDir();
    assert.deepEqual(collectBundleFiles(dir), ['app.bundle.mjs', path.join('chunks', 'auto-chart.js')]);
  });

  it('skips chunks/ entirely when it does not exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-release-bundle-nochunks-'));
    fs.writeFileSync(path.join(dir, 'app.bundle.mjs'), 'console.log(1);');
    assert.deepEqual(collectBundleFiles(dir), ['app.bundle.mjs']);
  });
});

describe('signReleaseBundle', () => {
  it('writes a manifest + signature on disk that the boot-time verifier accepts', () => {
    const dir = makeBundleDir();
    const { privateKeyPem, publicKeyPem } = generateKeyPair();
    signReleaseBundle({ packageName: '@rplus/core', version: '9.9.9', bundleDir: dir, privateKeyPem });

    assert.ok(fs.existsSync(path.join(dir, MODULE_MANIFEST_FILE)));
    assert.ok(fs.existsSync(path.join(dir, MODULE_SIGNATURE_FILE)));
    assert.deepEqual(
      verifyShippedBundle({
        bundleDir: dir,
        manifestPath: path.join(dir, MODULE_MANIFEST_FILE),
        signaturePath: path.join(dir, MODULE_SIGNATURE_FILE),
        publicKeyPem,
      }),
      { ok: true }
    );
  });

  it('the manifest it writes never covers itself or the signature file', () => {
    const dir = makeBundleDir();
    const { privateKeyPem } = generateKeyPair();
    const { manifest } = signReleaseBundle({ packageName: '@rplus/core', version: '1.0.0', bundleDir: dir, privateKeyPem });
    const paths = manifest.files.map((f) => f.path);
    assert.ok(!paths.includes(MODULE_MANIFEST_FILE));
    assert.ok(!paths.includes(MODULE_SIGNATURE_FILE));
  });
});

describe('buildModuleBundleZip', () => {
  it('zips exactly the files the manifest covers, with matching content', async () => {
    const dir = makeBundleDir();
    const relativeFilePaths = collectBundleFiles(dir);
    const buffer = await buildModuleBundleZip({ bundleDir: dir, relativeFilePaths });
    const zip = await JSZip.loadAsync(buffer);
    const filePaths = Object.values(zip.files)
      .filter((f) => !f.dir)
      .map((f) => f.name);
    assert.deepEqual(filePaths.sort(), relativeFilePaths.sort());
    const appBundle = await zip.file('app.bundle.mjs').async('string');
    assert.equal(appBundle, 'console.log(1);');
  });
});

describe('writeModuleFeedAssets', () => {
  it('copies manifest+signature and writes the zip into distDir', async () => {
    const dir = makeBundleDir();
    const { privateKeyPem } = generateKeyPair();
    signReleaseBundle({ packageName: '@rplus/core', version: '1.0.0', bundleDir: dir, privateKeyPem });
    const distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'module-feed-dist-'));

    await writeModuleFeedAssets({ bundleDir: dir, distDir, relativeFilePaths: collectBundleFiles(dir) });

    assert.ok(fs.existsSync(path.join(distDir, MODULE_MANIFEST_FILE)));
    assert.ok(fs.existsSync(path.join(distDir, MODULE_SIGNATURE_FILE)));
    assert.ok(fs.existsSync(path.join(distDir, MODULE_BUNDLE_ZIP_FILE)));
    assert.equal(
      await readFile(path.join(distDir, MODULE_MANIFEST_FILE), 'utf8'),
      await readFile(path.join(dir, MODULE_MANIFEST_FILE), 'utf8')
    );
  });
});
