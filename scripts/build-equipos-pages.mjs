#!/usr/bin/env node
/**
 * Sync canonical public/equipos → cloud/equipos-pages/public/equipos deploy mirror.
 * Run before Cloudflare Pages/Worker static deploy; excluded from VibeDrift (see .vibedriftignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'public', 'equipos');
const DEST = path.join(ROOT, 'cloud', 'equipos-pages', 'public', 'equipos');

const SKIP_NAMES = new Set(['.DS_Store']);

function copyRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    if (SKIP_NAMES.has(name)) continue;
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    const st = fs.statSync(src);
    if (st.isDirectory()) {
      copyRecursive(src, dest);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(SRC)) {
  console.error('missing canonical public/equipos');
  process.exit(1);
}

copyRecursive(SRC, DEST);
console.log('synced public/equipos → cloud/equipos-pages/public/equipos');
