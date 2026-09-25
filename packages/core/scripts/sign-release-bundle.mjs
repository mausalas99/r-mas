#!/usr/bin/env node
/**
 * Release-only: signs the renderer bundle (public/js/app.bundle.mjs +
 * chunks/*) that electron-builder is about to package, so main.js can
 * verify it at every boot (packages/shared-signing/lib/module-boot-guard.mjs).
 * Run from packages/core/scripts/release.js, after bundle:renderer:prod and
 * before electron-builder. Never run for a plain dev build — the private
 * key never leaves Mau's machine and isn't in this repo or environment.
 *
 *   node scripts/sign-release-bundle.mjs
 *   R_PLUS_RELEASE_KEY_PATH=/path/to/key.pem node scripts/sign-release-bundle.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { buildModuleManifest, signModuleManifest } from '../../shared-signing/lib/sign-module-bundle.mjs';

const ROOT = path.join(new URL('.', import.meta.url).pathname, '..');
// Node resolves the root `scripts` symlink, so ROOT is packages/core. The
// shipped version (package.json) and release.js's dist/ live at the repo root.
const REPO_ROOT = path.resolve(ROOT, '../..');
export const MODULE_MANIFEST_FILE = 'module-manifest.json';
export const MODULE_SIGNATURE_FILE = 'module-signature.txt';
export const MODULE_BUNDLE_ZIP_FILE = 'module-bundle.zip';

/** @param {string} bundleDir */
export function collectBundleFiles(bundleDir) {
  const files = ['app.bundle.mjs'];
  const chunksDir = path.join(bundleDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    for (const name of fs.readdirSync(chunksDir)) {
      if (fs.statSync(path.join(chunksDir, name)).isFile()) {
        files.push(path.join('chunks', name));
      }
    }
  }
  return files.sort();
}

/**
 * @param {{packageName: string, version: string, bundleDir: string, privateKeyPem: string}} params
 */
export function signReleaseBundle({ packageName, version, bundleDir, privateKeyPem }) {
  const relativeFilePaths = collectBundleFiles(bundleDir);
  const manifest = buildModuleManifest({ packageName, version, bundleDir, relativeFilePaths });
  const signature = signModuleManifest(manifest, privateKeyPem);
  fs.writeFileSync(path.join(bundleDir, MODULE_MANIFEST_FILE), JSON.stringify(manifest));
  fs.writeFileSync(path.join(bundleDir, MODULE_SIGNATURE_FILE), signature);
  return { manifest, signature, fileCount: relativeFilePaths.length };
}

/**
 * Zips the same files the manifest covers, for the module feed to serve as
 * one downloadable artifact (`scripts/jev` design fork: new_lightweight_fetcher,
 * confidence 0.98 — the shell fetches this, not an electron-updater install).
 * @param {{bundleDir: string, relativeFilePaths: string[]}} params
 * @returns {Promise<Buffer>}
 */
export async function buildModuleBundleZip({ bundleDir, relativeFilePaths }) {
  const zip = new JSZip();
  for (const relPath of relativeFilePaths) {
    zip.file(relPath, fs.readFileSync(path.join(bundleDir, relPath)));
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Copies the signed manifest/signature and a zip of the bundle into dist/
 * so release.js's asset list can upload them alongside the installers — the
 * module feed worker proxies these from the GitHub/GitLab release, the same
 * way it already proxies latest.yml (see docs/superpowers/plans/2026-09-21-live-module-updates.md).
 * @param {{bundleDir: string, distDir: string, relativeFilePaths: string[]}} params
 */
export async function writeModuleFeedAssets({ bundleDir, distDir, relativeFilePaths }) {
  fs.mkdirSync(distDir, { recursive: true });
  fs.copyFileSync(path.join(bundleDir, MODULE_MANIFEST_FILE), path.join(distDir, MODULE_MANIFEST_FILE));
  fs.copyFileSync(path.join(bundleDir, MODULE_SIGNATURE_FILE), path.join(distDir, MODULE_SIGNATURE_FILE));
  const zipBuffer = await buildModuleBundleZip({ bundleDir, relativeFilePaths });
  fs.writeFileSync(path.join(distDir, MODULE_BUNDLE_ZIP_FILE), zipBuffer);
}

async function main() {
  const keyPath = process.env.R_PLUS_RELEASE_KEY_PATH || path.join(os.homedir(), '.rplus-release-key.pem');
  if (!fs.existsSync(keyPath)) {
    console.error(
      `No se encontró la llave privada de release en ${keyPath}. ` +
        'Define R_PLUS_RELEASE_KEY_PATH o coloca la llave en ~/.rplus-release-key.pem — nunca en el repo.'
    );
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const bundleDir = path.join(ROOT, 'public/js');
  const result = signReleaseBundle({
    packageName: pkg.name,
    version: pkg.version,
    bundleDir,
    privateKeyPem: fs.readFileSync(keyPath, 'utf8'),
  });
  await writeModuleFeedAssets({
    bundleDir,
    distDir: path.join(REPO_ROOT, 'dist'),
    relativeFilePaths: collectBundleFiles(bundleDir),
  });
  console.log(
    `Firmado ${MODULE_MANIFEST_FILE} / ${MODULE_SIGNATURE_FILE} para ${pkg.name}@${pkg.version} (${result.fileCount} archivo(s)), ` +
      `${MODULE_BUNDLE_ZIP_FILE} listo en dist/ para el feed de módulos.`
  );
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
