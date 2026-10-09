#!/usr/bin/env node
/**
 * Module-only release: ships a new renderer bundle (public/js/app.bundle.mjs +
 * chunks/*) to installed apps WITHOUT building an installer. Installed apps
 * poll the module feed once per launch and load a newer signed bundle
 * (docs/superpowers/plans/2026-09-21-live-module-updates.md).
 *
 *   npm run release:module              build + sign + verify into a temp dir, print what would go out
 *   npm run release:module -- --publish same, then upload to the current release with gh
 *
 * Covers bundle JS only. Changes to main.js, preload.js, CSS, HTML partials or
 * assets still need a full release. Signs with ~/.rplus-release-key.pem (or
 * R_PLUS_RELEASE_KEY_PATH); the key never leaves the owner's machine.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  collectBundleFiles,
  signReleaseBundle,
  writeModuleFeedAssets,
  MODULE_MANIFEST_FILE,
  MODULE_SIGNATURE_FILE,
  MODULE_BUNDLE_ZIP_FILE,
} from './sign-release-bundle.mjs';
import { verifyModuleUpdate } from '../../shared-signing/lib/verify-module-update.mjs';

const ROOT = path.join(new URL('.', import.meta.url).pathname, '..');
const REPO_ROOT = path.resolve(ROOT, '../..');
const REPO = 'mausalas99/r-mas';

/** `8.4.2-m202609291530`: differs from the core version (so installed apps see it as new), no counter state to keep. */
export function moduleVersionFor(coreVersion, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 12);
  return `${coreVersion}-m${stamp}`;
}

/**
 * Copies the bundle to a temp dir (never signs in place: public/js holds the
 * packaged manifest the boot guard checks), signs it for exactly `coreVersion`,
 * verifies the result against `publicKeyPem`, and writes the three feed files.
 * @returns {Promise<{moduleVersion: string, outDir: string, files: string[]}>}
 */
export async function buildModuleOnlyRelease({ bundleDir, coreVersion, packageName, privateKeyPem, publicKeyPem, workDir, now }) {
  const stageDir = path.join(workDir, 'stage');
  const outDir = path.join(workDir, 'out');
  const relativeFilePaths = collectBundleFiles(bundleDir);
  for (const rel of relativeFilePaths) {
    fs.mkdirSync(path.dirname(path.join(stageDir, rel)), { recursive: true });
    fs.copyFileSync(path.join(bundleDir, rel), path.join(stageDir, rel));
  }
  const moduleVersion = moduleVersionFor(coreVersion, now);
  const { manifest, signature } = signReleaseBundle({
    packageName,
    version: moduleVersion,
    bundleDir: stageDir,
    privateKeyPem,
    minCoreVersion: coreVersion,
    maxCoreVersion: coreVersion,
  });
  const verified = verifyModuleUpdate({ manifest, signature, publicKeyPem, bundleDir: stageDir });
  if (!verified.ok) {
    throw new Error(`La firma no coincide con module-update-pubkey.pem (${verified.reason}): llave equivocada.`);
  }
  await writeModuleFeedAssets({ bundleDir: stageDir, distDir: outDir, relativeFilePaths });
  return {
    moduleVersion,
    outDir,
    files: [MODULE_MANIFEST_FILE, MODULE_SIGNATURE_FILE, MODULE_BUNDLE_ZIP_FILE].map((n) => path.join(outDir, n)),
  };
}

async function main() {
  const publish = process.argv.includes('--publish');
  const keyPath = process.env.R_PLUS_RELEASE_KEY_PATH || path.join(os.homedir(), '.rplus-release-key.pem');
  if (!fs.existsSync(keyPath)) {
    console.error(`No se encontró la llave privada de release en ${keyPath}. Define R_PLUS_RELEASE_KEY_PATH.`);
    process.exit(1);
  }
  const build = spawnSync('npm', ['run', 'bundle:renderer:prod'], { cwd: REPO_ROOT, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status || 1);

  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const result = await buildModuleOnlyRelease({
    bundleDir: path.join(ROOT, 'public/js'),
    coreVersion: pkg.version,
    packageName: pkg.name,
    privateKeyPem: fs.readFileSync(keyPath, 'utf8'),
    publicKeyPem: fs.readFileSync(path.join(ROOT, 'module-update-pubkey.pem'), 'utf8'),
    workDir: fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-module-release-')),
  });
  console.log(`Módulo ${result.moduleVersion} firmado y verificado para la app ${pkg.version}.\n${result.files.join('\n')}`);

  const tag = `v${pkg.version}`;
  if (!publish) {
    console.log(`Nada subido. Para publicar: npm run release:module -- --publish  (sube a ${REPO} ${tag}, --clobber)`);
    return;
  }
  const up = spawnSync('gh', ['release', 'upload', tag, '--repo', REPO, ...result.files, '--clobber'], { stdio: 'inherit' });
  if (up.status !== 0) process.exit(up.status || 1);
  console.log(`Subido a ${REPO} ${tag}. Las apps instaladas lo toman en su próximo arranque.`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
