import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {Record<string, unknown>} manifest
 * @param {string} signatureHex
 * @param {string} publicKeyPem
 */
export function verifyManifestSignature(manifest, signatureHex, publicKeyPem) {
  const verifier = crypto.createVerify('SHA256');
  verifier.update(JSON.stringify(manifest));
  return verifier.verify(publicKeyPem, signatureHex, 'hex');
}

/**
 * @param {string} bundleDir
 * @param {{files: {path: string, sha256: string}[]}} manifest
 */
export function verifyManifestFiles(bundleDir, manifest) {
  for (const { path: relativePath, sha256 } of manifest.files) {
    let actual;
    try {
      actual = crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(bundleDir, relativePath)))
        .digest('hex');
    } catch {
      return false;
    }
    if (actual !== sha256) return false;
  }
  return true;
}

/**
 * Verifies a downloaded module update before it is allowed to load. Any
 * failure here must keep the caller on its currently running version —
 * never load a bundle this rejects.
 * @param {{manifest: Record<string, unknown> & {files: {path: string, sha256: string}[]}, signature: string, publicKeyPem: string, bundleDir: string}} params
 * @returns {{ok: true} | {ok: false, reason: 'bad-signature' | 'file-hash-mismatch'}}
 */
export function verifyModuleUpdate({ manifest, signature, publicKeyPem, bundleDir }) {
  if (!verifyManifestSignature(manifest, signature, publicKeyPem)) {
    return { ok: false, reason: 'bad-signature' };
  }
  if (!verifyManifestFiles(bundleDir, manifest)) {
    return { ok: false, reason: 'file-hash-mismatch' };
  }
  return { ok: true };
}
