/**
 * Phase 2 of docs/superpowers/plans/2026-09-21-live-module-updates.md:
 * fetch + verify + stage a module update. No activation — the shell keeps
 * running whatever it already loaded; this only gets a verified bundle onto
 * disk. Reuses Phase E's signing/verification as-is (no new crypto).
 */
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import {
  verifyManifestSignature,
  verifyManifestFiles,
} from '../../shared-signing/lib/verify-module-update.mjs';

const MODULE_MANIFEST_FILE = 'module-manifest.json';
const MODULE_SIGNATURE_FILE = 'module-signature.txt';
const MODULE_BUNDLE_ZIP_FILE = 'module-bundle.zip';

// Manifest version becomes a directory name before it is trusted — keep it
// to a safe charset so a hostile feed response can't path-traverse via it.
const SAFE_VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/**
 * @param {typeof fetch} fetchFn
 * @param {string} feedBaseUrl
 * @param {string} filename
 * @returns {Promise<Response|null>}
 */
async function fetchAsset(fetchFn, feedBaseUrl, filename) {
  try {
    const res = await fetchFn(new URL(filename, feedBaseUrl).toString());
    if (res && res.ok) return res;
  } catch {
    /* network error — treated as feed-unavailable below */
  }
  return null;
}

/**
 * Extracts a zip into destDir, rejecting any entry whose path would land
 * outside destDir (zip-slip) — the zip is untrusted network content until
 * the manifest signature (checked by the caller before this runs) says
 * otherwise, and even then only the manifest's own file list is trusted.
 * @param {Buffer} zipBuffer
 * @param {string} destDir
 */
async function extractZipSafely(zipBuffer, destDir) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const resolvedDest = path.resolve(destDir);
  for (const [relPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const destPath = path.resolve(destDir, relPath);
    if (destPath !== resolvedDest && !destPath.startsWith(resolvedDest + path.sep)) {
      throw new Error(`module bundle entry escapes staging dir: ${relPath}`);
    }
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, await entry.async('nodebuffer'));
  }
}

/**
 * Fetches module-manifest.json / module-signature.txt / module-bundle.zip
 * from a module feed, verifies the signature and file hashes, and — only on
 * success — stages the verified files at `<modulesRootDir>/<version>/`.
 * Never loads or keeps a bundle that fails verification.
 * @param {{fetchFn: typeof fetch, feedBaseUrl: string, modulesRootDir: string, publicKeyPem: string}} params
 * @returns {Promise<
 *   | {ok: true, version: string, stagingDir: string, manifest: Record<string, unknown>}
 *   | {ok: false, reason: 'feed-unavailable' | 'invalid-manifest' | 'bad-signature' | 'unsafe-bundle' | 'file-hash-mismatch'}
 * >}
 */
export async function fetchModuleUpdate({ fetchFn, feedBaseUrl, modulesRootDir, publicKeyPem }) {
  const [manifestRes, signatureRes, zipRes] = await Promise.all([
    fetchAsset(fetchFn, feedBaseUrl, MODULE_MANIFEST_FILE),
    fetchAsset(fetchFn, feedBaseUrl, MODULE_SIGNATURE_FILE),
    fetchAsset(fetchFn, feedBaseUrl, MODULE_BUNDLE_ZIP_FILE),
  ]);
  if (!manifestRes || !signatureRes || !zipRes) {
    return { ok: false, reason: 'feed-unavailable' };
  }

  let manifest;
  try {
    manifest = JSON.parse(await manifestRes.text());
  } catch {
    return { ok: false, reason: 'invalid-manifest' };
  }
  const signature = (await signatureRes.text()).trim();
  const version = String(manifest && manifest.version).trim();
  if (!SAFE_VERSION_RE.test(version)) {
    return { ok: false, reason: 'invalid-manifest' };
  }

  // Signature checked against the manifest object alone, before anything
  // from the zip touches disk — a bad signature never gets to write a file.
  if (!verifyManifestSignature(manifest, signature, publicKeyPem)) {
    return { ok: false, reason: 'bad-signature' };
  }

  const stagingDir = path.join(modulesRootDir, version);
  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
  try {
    await extractZipSafely(zipBuffer, stagingDir);
  } catch {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    return { ok: false, reason: 'unsafe-bundle' };
  }

  if (!verifyManifestFiles(stagingDir, manifest)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    return { ok: false, reason: 'file-hash-mismatch' };
  }

  fs.writeFileSync(path.join(stagingDir, MODULE_MANIFEST_FILE), JSON.stringify(manifest));
  fs.writeFileSync(path.join(stagingDir, MODULE_SIGNATURE_FILE), signature);

  return { ok: true, version, stagingDir, manifest };
}
