#!/usr/bin/env node
/**
 * electron-builder afterPack: restore host-arch SQLCipher .node after cross-arch
 * beforePack (e.g. x64 pack on Apple Silicon). Keeps npm test / dev on host arch.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PACK_ARCH_NAMES = { 0: 'ia32', 1: 'x64', 2: 'arm', 3: 'arm64' };

// asarUnpack ships every node_modules/@node-rs/argon2* prebuild (all arches, for
// both mac dmg targets built from one prebuild step). Strip the ones that don't
// match this target's arch so macOS doesn't flag a leftover Intel/arm64 .node as
// "a component that will not open" in a future release.
function pruneForeignArchArgon2(appOutDir, targetArch) {
  const appDir = fs.readdirSync(appOutDir).find((f) => f.endsWith('.app'));
  if (!appDir) return;
  const nodeRsDir = path.join(
    appOutDir,
    appDir,
    'Contents/Resources/app.asar.unpacked/node_modules/@node-rs'
  );
  if (!fs.existsSync(nodeRsDir)) return;

  for (const entry of fs.readdirSync(nodeRsDir)) {
    if (!entry.startsWith('argon2')) continue;
    const dir = path.join(nodeRsDir, entry);
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.node')) continue;
      if (file === `argon2.darwin-${targetArch}.node`) continue;
      if (!file.startsWith('argon2.darwin-')) continue;
      fs.unlinkSync(path.join(dir, file));
      console.log(`[afterPack] Removed foreign-arch native: ${entry}/${file}`);
    }
  }
}

/** @param {import('electron-builder').AfterPackContext} context */
exports.default = async function afterPack(context) {
  const root = path.join(__dirname, '..');

  if (context.electronPlatformName === 'darwin') {
    const targetArch = PACK_ARCH_NAMES[context.arch] ?? process.arch;
    pruneForeignArchArgon2(context.appOutDir, targetArch);
  }

  console.log('[afterPack] Restoring host-arch SQLCipher binary for dev/tests');
  const r = spawnSync(process.execPath, ['scripts/rebuild-native-db.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) {
    console.warn('[afterPack] rebuild-native-db returned non-zero (non-fatal for pack artifact)');
  }
};
