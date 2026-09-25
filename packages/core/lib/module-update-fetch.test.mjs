import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { buildModuleManifest, signModuleManifest } from '../../shared-signing/lib/sign-module-bundle.mjs';
import { fetchModuleUpdate } from './module-update-fetch.mjs';

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
}

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Builds a real signed manifest + zip, the same way scripts/sign-release-bundle.mjs does. */
async function buildSignedFixture({ version = '9.0.0', privateKeyPem, fileContent = 'console.log(1);' } = {}) {
  const bundleDir = tmpDir('module-fetch-src-');
  fs.writeFileSync(path.join(bundleDir, 'app.bundle.mjs'), fileContent);
  const manifest = buildModuleManifest({
    packageName: '@rplus/core',
    version,
    bundleDir,
    relativeFilePaths: ['app.bundle.mjs'],
  });
  const signature = signModuleManifest(manifest, privateKeyPem);
  const zip = new JSZip();
  zip.file('app.bundle.mjs', fs.readFileSync(path.join(bundleDir, 'app.bundle.mjs')));
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  return { manifest, signature, zipBuffer };
}

function textResponse(body) {
  return { ok: true, text: async () => body };
}

function binaryResponse(buffer) {
  return { ok: true, arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) };
}

/** @param {{manifest?: string, signature?: string, zip?: Buffer, missing?: string[]}} assets */
function fakeFetch(assets) {
  const missing = new Set(assets.missing || []);
  return async (url) => {
    const filename = url.toString().split('/').pop();
    if (missing.has(filename)) return { ok: false };
    if (filename === 'module-manifest.json') return textResponse(assets.manifest);
    if (filename === 'module-signature.txt') return textResponse(assets.signature);
    if (filename === 'module-bundle.zip') return binaryResponse(assets.zip);
    throw new Error(`unexpected asset: ${filename}`);
  };
}

/**
 * Runs fetchModuleUpdate against a fresh staging dir with the given manifest/
 * signature/zip served from a fake fetch. Shared by every case below so each
 * `it` only states what differs about its fixture.
 * @param {{manifest: Record<string, unknown>, signature: string, zipBuffer: Buffer, publicKeyPem: string, missing?: string[]}} params
 */
async function runFetch({ manifest, signature, zipBuffer, publicKeyPem, missing }) {
  const modulesRootDir = tmpDir('module-fetch-root-');
  const result = await fetchModuleUpdate({
    fetchFn: fakeFetch({ manifest: JSON.stringify(manifest), signature, zip: zipBuffer, missing }),
    feedBaseUrl: 'https://feed.example/',
    modulesRootDir,
    publicKeyPem,
  });
  return { result, modulesRootDir };
}

describe('fetchModuleUpdate', () => {
  it('stages a genuine update whose files match the manifest hashes', async () => {
    const { publicKeyPem, privateKeyPem } = generateKeyPair();
    const { manifest, signature, zipBuffer } = await buildSignedFixture({ privateKeyPem });
    const { result, modulesRootDir } = await runFetch({ manifest, signature, zipBuffer, publicKeyPem });

    assert.equal(result.ok, true);
    assert.equal(result.version, '9.0.0');
    assert.equal(result.stagingDir, path.join(modulesRootDir, '9.0.0'));
    assert.equal(fs.readFileSync(path.join(result.stagingDir, 'app.bundle.mjs'), 'utf8'), 'console.log(1);');
    const stagedManifest = JSON.parse(fs.readFileSync(path.join(result.stagingDir, 'module-manifest.json'), 'utf8'));
    assert.deepEqual(stagedManifest, manifest);
  });

  it('rejects a bundle whose zip content was changed after signing, and removes the staged dir', async () => {
    const { publicKeyPem, privateKeyPem } = generateKeyPair();
    const { manifest, signature } = await buildSignedFixture({ privateKeyPem });
    // Re-zip different content than what was hashed into the manifest.
    const tamperedZip = new JSZip();
    tamperedZip.file('app.bundle.mjs', 'console.log("tampered");');
    const zipBuffer = await tamperedZip.generateAsync({ type: 'nodebuffer' });
    const { result, modulesRootDir } = await runFetch({ manifest, signature, zipBuffer, publicKeyPem });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'file-hash-mismatch');
    assert.equal(fs.existsSync(path.join(modulesRootDir, '9.0.0')), false);
  });

  it('rejects a bad signature before writing anything to disk', async () => {
    const { privateKeyPem } = generateKeyPair();
    const { publicKeyPem: otherPublicKeyPem } = generateKeyPair();
    const { manifest, signature, zipBuffer } = await buildSignedFixture({ privateKeyPem });
    const { result, modulesRootDir } = await runFetch({
      manifest,
      signature,
      zipBuffer,
      publicKeyPem: otherPublicKeyPem,
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'bad-signature');
    assert.deepEqual(fs.readdirSync(modulesRootDir), []);
  });

  it('reports feed-unavailable when an asset is missing', async () => {
    const { publicKeyPem, privateKeyPem } = generateKeyPair();
    const { manifest, signature, zipBuffer } = await buildSignedFixture({ privateKeyPem });
    const { result } = await runFetch({ manifest, signature, zipBuffer, publicKeyPem, missing: ['module-bundle.zip'] });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'feed-unavailable');
  });

  it('rejects a manifest whose version cannot be used as a safe directory name', async () => {
    const { publicKeyPem, privateKeyPem } = generateKeyPair();
    const { manifest, signature, zipBuffer } = await buildSignedFixture({ privateKeyPem, version: '../../etc' });
    const { result } = await runFetch({ manifest, signature, zipBuffer, publicKeyPem });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid-manifest');
  });

  it('rejects a zip entry with an absolute path that would escape the staging dir', async () => {
    // JSZip normalizes a relative `../` entry on its own before this code ever
    // sees it (verified: round-tripping '../../x' through generateAsync/loadAsync
    // yields the bare 'x'), so the real gap this guards is an absolute-path entry,
    // which JSZip preserves as-is.
    const { publicKeyPem, privateKeyPem } = generateKeyPair();
    // Manifest/signature are genuine for the declared file; the zip itself carries an extra hostile entry.
    const { manifest, signature } = await buildSignedFixture({ privateKeyPem });
    const escapeTarget = path.join(os.tmpdir(), `module-fetch-escaped-${process.pid}.txt`);
    const zip = new JSZip();
    zip.file('app.bundle.mjs', 'console.log(1);');
    zip.file(escapeTarget, 'pwned');
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const { result } = await runFetch({ manifest, signature, zipBuffer, publicKeyPem });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'unsafe-bundle');
    assert.equal(fs.existsSync(escapeTarget), false);
  });
});
