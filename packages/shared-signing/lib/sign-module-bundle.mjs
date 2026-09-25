import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} bundleDir
 * @param {string[]} relativeFilePaths
 * @returns {{path: string, sha256: string}[]}
 */
export function hashBundleFiles(bundleDir, relativeFilePaths) {
  return relativeFilePaths.map((relativePath) => ({
    path: relativePath,
    sha256: crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(bundleDir, relativePath)))
      .digest('hex'),
  }));
}

/**
 * @param {{packageName: string, version: string, bundleDir: string, relativeFilePaths: string[]}} params
 */
export function buildModuleManifest({
  packageName,
  version,
  bundleDir,
  relativeFilePaths,
  minCoreVersion,
  maxCoreVersion,
}) {
  return {
    package: packageName,
    version,
    minCoreVersion: minCoreVersion || version,
    maxCoreVersion: maxCoreVersion || version,
    files: hashBundleFiles(bundleDir, relativeFilePaths),
  };
}

/**
 * @param {Record<string, unknown>} manifest
 * @param {string} privateKeyPem
 */
export function signModuleManifest(manifest, privateKeyPem) {
  const signer = crypto.createSign('SHA256');
  signer.update(JSON.stringify(manifest));
  return signer.sign(privateKeyPem, 'hex');
}
