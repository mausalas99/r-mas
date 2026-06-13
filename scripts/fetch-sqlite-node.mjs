/**
 * Install a Node (system) prebuild for better-sqlite3-multiple-ciphers when
 * prebuild-install / npm rebuild fail (e.g. Rosetta xcrun on Apple Silicon).
 *
 * Prebuilds: https://github.com/m4heshd/better-sqlite3-multiple-ciphers/releases
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

const PREBUILD_REPO = 'm4heshd/better-sqlite3-multiple-ciphers';
const NODE_REL = 'build/Release/better_sqlite3.node';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = path.join(root, 'node_modules', 'better-sqlite3-multiple-ciphers');
const destFile = path.join(pkgDir, NODE_REL);

function resolveNodeAbi() {
  const abi = require('node-abi');
  return abi.getAbi(process.version, 'node');
}

function prebuildAssetName(version, abiVersion) {
  const arch = process.arch === 'x64' ? 'x64' : process.arch;
  return `better-sqlite3-multiple-ciphers-v${version}-node-v${abiVersion}-${process.platform}-${arch}.tar.gz`;
}

function prebuildUrl(version, abiVersion) {
  const asset = prebuildAssetName(version, abiVersion);
  return `https://github.com/${PREBUILD_REPO}/releases/download/v${version}/${asset}`;
}

async function main() {
  const version = require('better-sqlite3-multiple-ciphers/package.json').version;
  const abiVersion = resolveNodeAbi();
  const url = prebuildUrl(version, abiVersion);
  console.log(`[fetch-sqlite-node] Node ${process.version} (abi ${abiVersion}) → ${url}`);

  const tmpTgz = path.join(root, 'scripts', '.sqlite-node.tgz');
  const tmpDir = path.join(root, 'scripts', '.sqlite-node-tmp');

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }
    await fs.writeFile(tmpTgz, Buffer.from(await resp.arrayBuffer()));
    await fs.mkdir(tmpDir, { recursive: true });
    execSync(`tar xzf "${tmpTgz}" -C "${tmpDir}"`, { cwd: root });
    const srcFile = path.join(tmpDir, NODE_REL);
    await fs.mkdir(path.dirname(destFile), { recursive: true });
    await fs.copyFile(srcFile, destFile);
    console.log(`[fetch-sqlite-node] Installed ${NODE_REL}`);
  } catch (e) {
    console.error(`[fetch-sqlite-node] Failed: ${e.message}`);
    process.exit(1);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.unlink(tmpTgz).catch(() => {});
  }
}

await main();
