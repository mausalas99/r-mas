#!/usr/bin/env node
/**
 * Build R+ Interno Nube static assets for cloud/sync-worker ASSETS binding.
 * Run before `wrangler deploy` in cloud/sync-worker.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const SRC = path.join(PUBLIC, 'interno');
const DEST = path.join(ROOT, 'cloud', 'sync-pages', 'public', 'interno');

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

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    if (name === '.DS_Store') continue;
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

/**
 * @param {string} text
 */
export function rewriteInternoModuleImports(text) {
  return String(text || '')
    .replace(/from '\.\.\/js\/dom-escape\.mjs'/g, "from './js/dom-escape.mjs'")
    .replace(/from "\.\.\/js\/dom-escape\.mjs"/g, 'from "./js/dom-escape.mjs"');
}

function cleanDest() {
  if (fs.existsSync(DEST)) {
    fs.rmSync(DEST, { recursive: true, force: true });
  }
  fs.mkdirSync(DEST, { recursive: true });
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('missing public/interno/');
    process.exit(1);
  }

  cleanDest();
  copyDir(SRC, DEST);

  copyFile(path.join(PUBLIC, 'tokens.css'), path.join(DEST, 'tokens.css'));
  copyFile(path.join(PUBLIC, 'styles', 'overlays.css'), path.join(DEST, 'styles', 'overlays.css'));
  copyFile(path.join(PUBLIC, 'js', 'dom-escape.mjs'), path.join(DEST, 'js', 'dom-escape.mjs'));

  const indexSrc = path.join(SRC, 'index.html');
  if (!fs.existsSync(indexSrc)) {
    console.error('missing public/interno/index.html');
    process.exit(1);
  }
  const indexOut = buildInternoIndexHtml(fs.readFileSync(indexSrc, 'utf8'));
  writeFile(path.join(DEST, 'index.html'), indexOut);

  const appPath = path.join(DEST, 'interno-app.mjs');
  const appOut = rewriteInternoModuleImports(fs.readFileSync(appPath, 'utf8'));
  writeFile(appPath, appOut);

  console.log(`wrote cloud/sync-pages/public/interno/ (${totalBytes.toLocaleString()} bytes)`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
