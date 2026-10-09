import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { buildModuleOnlyRelease, moduleVersionFor } from './publish-module.mjs';
import { verifyModuleUpdate } from '../../shared-signing/lib/verify-module-update.mjs';
import { isCoreVersionCompatible } from '../lib/module-update-activate.mjs';

function keyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
}

function bundleDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-bundle-'));
  fs.writeFileSync(path.join(dir, 'app.bundle.mjs'), 'console.log(1);');
  fs.writeFileSync(path.join(dir, 'module-manifest.json'), 'packaged-manifest');
  return dir;
}

describe('moduleVersionFor', () => {
  it('differs from the core version and is a safe dir name', () => {
    const v = moduleVersionFor('8.4.2', new Date('2026-09-29T15:30:00Z'));
    assert.equal(v, '8.4.2-m202609291530');
    assert.match(v, /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/);
  });
});

describe('buildModuleOnlyRelease', () => {
  it('signs for exactly the core version, verifies, and leaves the source bundle dir untouched', async () => {
    const { publicKeyPem, privateKeyPem } = keyPair();
    const src = bundleDir();
    const r = await buildModuleOnlyRelease({
      bundleDir: src, coreVersion: '8.4.2', packageName: '@rplus/core', privateKeyPem, publicKeyPem,
      workDir: fs.mkdtempSync(path.join(os.tmpdir(), 'pm-work-')), now: new Date('2026-09-29T15:30:00Z'),
    });
    const manifest = JSON.parse(fs.readFileSync(r.files[0], 'utf8'));
    assert.equal(manifest.version, r.moduleVersion);
    assert.equal(isCoreVersionCompatible('8.4.2', manifest), true);
    assert.equal(isCoreVersionCompatible('8.4.3', manifest), false);
    assert.equal(fs.readFileSync(path.join(src, 'module-manifest.json'), 'utf8'), 'packaged-manifest');
    const zip = await JSZip.loadAsync(fs.readFileSync(r.files[2]));
    assert.deepEqual(Object.keys(zip.files), ['app.bundle.mjs']);
    const sig = fs.readFileSync(r.files[1], 'utf8');
    assert.equal(verifyModuleUpdate({ manifest, signature: sig, publicKeyPem, bundleDir: path.join(path.dirname(r.outDir), 'stage') }).ok, true);
  });

  it('refuses to build when the key does not match the shipped public key', async () => {
    const { privateKeyPem } = keyPair();
    const { publicKeyPem: other } = keyPair();
    await assert.rejects(
      buildModuleOnlyRelease({
        bundleDir: bundleDir(), coreVersion: '8.4.2', packageName: '@rplus/core', privateKeyPem, publicKeyPem: other,
        workDir: fs.mkdtempSync(path.join(os.tmpdir(), 'pm-work-')),
      }),
      /llave equivocada/
    );
  });
});
