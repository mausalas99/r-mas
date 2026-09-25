import fs from 'node:fs';
import { verifyModuleUpdate } from './verify-module-update.mjs';

/**
 * @param {string} filePath
 * @param {unknown} fallback
 */
export function loadJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * @param {string} filePath
 * @param {unknown} data
 */
export function saveJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
}

/** @param {string} filePath */
export function loadRollbackState(filePath) {
  const data = loadJsonFile(filePath, {});
  return {
    lastGoodVersion: data.lastGoodVersion,
    failures: data.failures || {},
    pendingVersion: data.pendingVersion,
  };
}

/**
 * @param {string} filePath
 * @param {{lastGoodVersion?: string, failures?: Record<string, number>, pendingVersion?: string}} state
 */
export function saveRollbackState(filePath, state) {
  saveJsonFile(filePath, state);
}

/** Explicit human confirmation only — never set by the app on its own. @param {string} filePath */
export function loadRollbackOverrideVersion(filePath) {
  const data = loadJsonFile(filePath, null);
  return data && typeof data.version === 'string' ? data.version : null;
}

/**
 * @param {string} filePath
 * @param {string} version
 */
export function saveRollbackOverrideVersion(filePath, version) {
  saveJsonFile(filePath, { version });
}

/**
 * Verifies a shipped renderer bundle against its release-time manifest +
 * signature before anything is allowed to load it. A missing manifest or
 * signature (an unsigned build) fails closed, same as a bad signature or a
 * file changed after signing.
 * @param {{bundleDir: string, manifestPath: string, signaturePath: string, publicKeyPem: string}} params
 * @returns {{ok: true} | {ok: false, reason: 'missing-manifest' | 'bad-signature' | 'file-hash-mismatch'}}
 */
export function verifyShippedBundle({ bundleDir, manifestPath, signaturePath, publicKeyPem }) {
  let manifest;
  let signature;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    signature = fs.readFileSync(signaturePath, 'utf8').trim();
  } catch {
    return { ok: false, reason: 'missing-manifest' };
  }
  return verifyModuleUpdate({ manifest, signature, publicKeyPem, bundleDir });
}
