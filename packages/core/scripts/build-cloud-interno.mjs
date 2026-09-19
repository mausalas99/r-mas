#!/usr/bin/env node
/**
 * Build R+ Interno Nube static assets for cloud/sync-worker ASSETS binding.
 * Run before `wrangler deploy` in cloud/sync-worker.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const SRC = path.join(PUBLIC, 'interno');
const DEST = path.join(ROOT, 'cloud', 'sync-pages', 'public', 'interno');

/** Bundled separately below — the on-device decrypt/assemble logic pulls in
 * lib/interno/*, lib/entrega/*, and cloud-sync/crypto.mjs, none of which live
 * under public/interno/ and so can't resolve via a flat copy. */
const BUNDLED_ENTRY_BASENAME = 'interno-app.mjs';

const CLOUD_FLAGS_SCRIPT =
  '<script>globalThis.__RPC_CLOUD_INTERNO__=true;try{document.documentElement.dataset.cloudInterno="1";document.documentElement.classList.add("rpc-cloud-interno");}catch(_e){}</script>';

let totalBytes = 0;

function writeFile(destPath, content) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  fs.writeFileSync(destPath, buf);
  totalBytes += buf.length;
}

function copyFile(srcPath, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  totalBytes += fs.statSync(destPath).size;
}

/** Copies public/interno/ verbatim except test files and the bundled entry (interno-crypto-board.mjs included — it's inlined by esbuild, not shipped as its own file). */
function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    if (name === '.DS_Store') continue;
    if (name.endsWith('.test.mjs') || name.endsWith('.test.js')) continue;
    if (name === BUNDLED_ENTRY_BASENAME || name === 'interno-crypto-board.mjs') continue;
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    const st = fs.statSync(src);
    if (st.isDirectory()) {
      copyDir(src, dest);
      continue;
    }
    copyFile(src, dest);
  }
}

/**
 * @param {string} html
 */
export function buildInternoIndexHtml(html) {
  let out = String(html || '');

  if (!out.includes('__RPC_CLOUD_INTERNO__')) {
    out = out.replace(/<head>\s*\n/i, `<head>\n${CLOUD_FLAGS_SCRIPT}\n`);
  }

  out = out.replace(/(href|src)="\/tokens\.css/g, '$1="/interno/tokens.css');
  out = out.replace(/(href|src)="\/styles\//g, '$1="/interno/styles/');

  return out;
}

function cleanDest() {
  if (fs.existsSync(DEST)) {
    fs.rmSync(DEST, { recursive: true, force: true });
  }
  fs.mkdirSync(DEST, { recursive: true });
}

/**
 * Bundles interno-app.mjs (which pulls in lib/interno/*, lib/entrega/*, and
 * cloud-sync/crypto.mjs for on-device decrypt/assemble) into one self-contained
 * ESM file — same pattern as build-cloud-mobile.mjs's renderer bundle, sized
 * down since Interno is one small page, not a full app shell (no splitting).
 * @param {string} entryPath
 * @param {string} outfile
 */
export async function bundleInternoApp(entryPath, outfile) {
  await esbuild.build({
    entryPoints: [entryPath],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    sourcemap: true,
    logLevel: 'info',
  });
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error('missing public/interno/');
    process.exit(1);
  }

  cleanDest();
  copyDir(SRC, DEST);

  copyFile(path.join(PUBLIC, 'tokens.css'), path.join(DEST, 'tokens.css'));
  copyFile(path.join(PUBLIC, 'styles', 'overlays.css'), path.join(DEST, 'styles', 'overlays.css'));

  const indexSrc = path.join(SRC, 'index.html');
  if (!fs.existsSync(indexSrc)) {
    console.error('missing public/interno/index.html');
    process.exit(1);
  }
  const indexOut = buildInternoIndexHtml(fs.readFileSync(indexSrc, 'utf8'));
  writeFile(path.join(DEST, 'index.html'), indexOut);

  console.log('bundling interno-app…');
  const entryPath = path.join(SRC, BUNDLED_ENTRY_BASENAME);
  const outfile = path.join(DEST, BUNDLED_ENTRY_BASENAME);
  await bundleInternoApp(entryPath, outfile);
  totalBytes += fs.statSync(outfile).size;

  console.log(`wrote cloud/sync-pages/public/interno/ (${totalBytes.toLocaleString()} bytes)`);
}

const isMain = import.meta.main;
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
