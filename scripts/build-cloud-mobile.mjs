#!/usr/bin/env node
/**
 * Build R+ Móvil Nube static assets for cloud/sync-worker ASSETS binding.
 * Run before `wrangler deploy` in cloud/sync-worker.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLOUD_MOBILE_ENTRY = path.join(ROOT, 'public/js/app-cloud-mobile.js');
const LAN_STRIP_STUB = path.join(ROOT, 'public/js/stubs/cloud-mobile-lan-strip.mjs');

const CLOUD_MOBILE_STRIP_BASENAMES = new Set([
  'mobile-sharer-sync.mjs',
  'live-sync-membership.mjs',
  'detach-lan-for-nube.mjs',
  'lan-config-retire.mjs',
]);

/** @param {string} modulePath */
export function isCloudMobileLanStripTarget(modulePath) {
  const norm = String(modulePath || '').replace(/\\/g, '/');
  if (norm.includes('/features/lan/')) return true;
  const base = path.basename(norm);
  return CLOUD_MOBILE_STRIP_BASENAMES.has(base);
}

/** esbuild plugin: stub retired LAN modules in the Móvil Nube bundle only. */
export function createCloudMobileLanStripPlugin(stubPath = LAN_STRIP_STUB) {
  return {
    name: 'cloud-mobile-strip-lan',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.path.includes('stubs/cloud-mobile-lan-strip')) return null;
        const target = args.path.startsWith('.') ? path.join(args.resolveDir, args.path) : args.path;
        if (!isCloudMobileLanStripTarget(target)) return null;
        return { path: stubPath };
      });
    },
  };
}
const PUBLIC = path.join(ROOT, 'public');
const DEST = path.join(ROOT, 'cloud', 'sync-pages', 'public', 'mobile');

const CLOUD_FLAGS_SCRIPT =
  '<script>globalThis.__RPC_CLOUD_MOBILE__=true;globalThis.__RPC_MOBILE_WEB__=true;try{document.documentElement.dataset.cloudMobile="1";document.documentElement.classList.add("rpc-cloud-mobile");}catch(_e){}(function(){function g(){if(document.getElementById("rpc-cloud-mobile-gate"))return;var e=document.createElement("div");e.id="rpc-cloud-mobile-gate";e.className="rpc-cloud-mobile-gate ui-overlay-scrim";e.setAttribute("aria-live","polite");e.innerHTML=\'<div class="rpc-cloud-mobile-modal material-solid-elevated ui-overlay-dialog" role="dialog" aria-modal="true"><div class="rpc-cloud-mobile-modal__head"><h4 class="rpc-cloud-mobile-modal__title">R+ Móvil</h4><p class="rpc-cloud-mobile-modal__sub">Conectando al turno…</p></div><div class="rpc-cloud-mobile-modal__body rpc-cloud-mobile-modal__body--center"><span class="rpc-cloud-mobile-spinner" aria-hidden="true"></span></div></div>\';document.body&&document.body.appendChild(e);document.body&&document.body.classList.add("rpc-cloud-mobile-gated")}document.body?g():document.addEventListener("DOMContentLoaded",g);})();</script>';

const MOBILE_WEB_IIFE_RE =
  /\(function \(\) \{\s*try \{\s*var ls = localStorage;\s*var p = new URLSearchParams\(location\.search \|\| ''\);\s*var pathMobile[\s\S]*?\}\s*catch \(_e\) \{\}\s*\}\)\(\);/;

const MOBILE_WEB_AND_JOIN_SCRIPTS = `(function () {
  try {
    var ls = localStorage;
    var p = new URLSearchParams(location.search || '');
    var pathMobile = /^\\/mobile\\/?$/i.test(location.pathname || '');
    var queryMobile = p.get('rpc-mobile') === '1';
    var sticky = ls.getItem('rpc-mobile-mode') === '1';
    var touchUa = /iPad|iPhone|iPod|Android|Mobile/i.test(navigator.userAgent || '');
    if (!globalThis.__RPC_CLOUD_MOBILE__ && !queryMobile && !pathMobile && !sticky && !touchUa) return;
    window.__RPC_MOBILE_WEB__ = true;
    document.documentElement.classList.add('rpc-mobile-web', 'ui-density-normal');
    ls.setItem('rpc-mobile-mode', '1');
    try { ls.setItem('rpc-sidebar-auto-hide', '0'); } catch (_eSide) {}
  } catch (_e) {}
})();
(function () {
  try {
    if (!globalThis.__RPC_CLOUD_MOBILE__) return;
    var KEY = 'rpc-cloud-mobile-pairing';
    var TOKEN_KEY = 'rpc-cloud-sync-token';
    var REMEMBER_KEY = 'rpc-cloud-sync-remember';
    var ROOM_ID_KEY = 'rpc-cloud-sync-room-id';
    var ROOM_META_KEY = 'rpc-cloud-sync-room-meta';
    var p = new URLSearchParams(location.search || '');
    var auth = String(p.get('auth') || '').trim();
    var room = String(p.get('room') || '').trim();
    var sala = String(p.get('sala') || '').trim();
    var user = String(p.get('user') || '').trim().replace(/^@+/, '');
    var prev = {};
    try { prev = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_ep) { prev = {}; }
    if (auth || room) {
      var next = {
        auth: auth || String(prev.auth || ''),
        room: room || String(prev.room || ''),
        roomId: String(prev.roomId || ''),
        sala: sala || String(prev.sala || ''),
        user: user || String(prev.user || ''),
      };
      localStorage.setItem(KEY, JSON.stringify(next));
      if (next.auth) {
        localStorage.setItem(REMEMBER_KEY, '1');
        localStorage.setItem(TOKEN_KEY, next.auth);
        sessionStorage.setItem(TOKEN_KEY, next.auth);
      }
      if (next.room) sessionStorage.setItem('rpc-cloud-mobile-join-code', next.room);
      if (next.sala) sessionStorage.setItem('rpc-cloud-mobile-join-sala', next.sala);
      if (next.user) sessionStorage.setItem('rpc-cloud-mobile-join-user', next.user);
    } else if (prev && (prev.auth || prev.room)) {
      // Home Screen relaunch (manifest start_url has no query) — restore sticky pairing.
      if (prev.auth) {
        localStorage.setItem(REMEMBER_KEY, '1');
        localStorage.setItem(TOKEN_KEY, String(prev.auth));
        sessionStorage.setItem(TOKEN_KEY, String(prev.auth));
      }
      if (prev.room) sessionStorage.setItem('rpc-cloud-mobile-join-code', String(prev.room));
      if (prev.sala) sessionStorage.setItem('rpc-cloud-mobile-join-sala', String(prev.sala));
      if (prev.user) sessionStorage.setItem('rpc-cloud-mobile-join-user', String(prev.user));
      if (prev.roomId) {
        localStorage.setItem(ROOM_ID_KEY, String(prev.roomId));
        sessionStorage.setItem(ROOM_ID_KEY, String(prev.roomId));
        try {
          localStorage.setItem(ROOM_META_KEY, JSON.stringify({
            id: String(prev.roomId),
            code: String(prev.room || ''),
            sala: String(prev.sala || ''),
            turnKey: '',
            name: '',
          }));
          sessionStorage.setItem(ROOM_META_KEY, localStorage.getItem(ROOM_META_KEY));
        } catch (_em) {}
      }
      try {
        var u = new URL(location.href);
        if (prev.auth) u.searchParams.set('auth', String(prev.auth));
        if (prev.room) u.searchParams.set('room', String(prev.room));
        if (prev.sala) u.searchParams.set('sala', String(prev.sala));
        if (prev.user) u.searchParams.set('user', String(prev.user));
        history.replaceState(null, '', u.pathname + u.search);
      } catch (_eu) {}
    }
  } catch (_e) {}
})();`;

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

function rewriteRootPaths(text) {
  return text.replace(/(href|src)="\/(?!\/)/g, '$1="/mobile/');
}

/**
 * esbuild emits absolute `/js/chunks/…` imports; under Worker ASSETS they live at `/mobile/js/…`.
 * @param {string} text
 */
export function rewriteJsAssetPaths(text) {
  return String(text || '').replace(/(["'`])\/js\//g, '$1/mobile/js/');
}

/** @param {string} dir */
function rewriteJsTree(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === '.DS_Store') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      rewriteJsTree(full);
      continue;
    }
    if (!/\.(mjs|js|map)$/.test(name)) continue;
    const before = fs.readFileSync(full, 'utf8');
    const after = rewriteJsAssetPaths(before);
    if (after !== before) fs.writeFileSync(full, after);
  }
}

export function buildMobileIndexHtml(html) {
  let out = html;

  if (!out.includes('__RPC_CLOUD_MOBILE__')) {
    out = out.replace(/<head>\s*\n/i, `<head>\n${CLOUD_FLAGS_SCRIPT}\n`);
  }

  if (MOBILE_WEB_IIFE_RE.test(out)) {
    out = out.replace(MOBILE_WEB_IIFE_RE, MOBILE_WEB_AND_JOIN_SCRIPTS);
  } else {
    throw new Error('build-cloud-mobile: mobile web IIFE block not found in index.html');
  }

  return rewriteRootPaths(out);
}

export function buildMobileManifest(manifestText) {
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch (err) {
    throw new Error(`build-cloud-mobile: invalid manifest.webmanifest — ${err.message}`);
  }

  manifest.start_url = '/mobile/';
  manifest.scope = '/mobile/';

  if (Array.isArray(manifest.icons)) {
    manifest.icons = manifest.icons.map((icon) => {
      if (!icon || typeof icon.src !== 'string') return icon;
      if (icon.src.startsWith('/mobile/')) return icon;
      if (icon.src.startsWith('/')) {
        return { ...icon, src: `/mobile${icon.src}` };
      }
      return icon;
    });
  }

  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function runUiBuild() {
  console.log('running build:ui…');
  execSync('node scripts/build-ui.mjs', {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

/**
 * Bundle R+ Móvil Nube renderer (excludes retired LAN modules via strip plugin).
 * @param {string} outDir public/js under mobile ASSETS root (e.g. cloud/.../mobile/js)
 */
export async function bundleCloudMobileRenderer(outDir) {
  if (!fs.existsSync(CLOUD_MOBILE_ENTRY)) {
    throw new Error('missing public/js/app-cloud-mobile.js');
  }
  if (!fs.existsSync(LAN_STRIP_STUB)) {
    throw new Error('missing public/js/stubs/cloud-mobile-lan-strip.mjs');
  }

  const chunksDir = path.join(outDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    fs.rmSync(chunksDir, { recursive: true, force: true });
  }

  const outfile = path.join(outDir, 'app.bundle.mjs');
  const legacyOutfile = path.join(outDir, 'app.bundle.js');
  if (fs.existsSync(outfile)) fs.unlinkSync(outfile);
  if (fs.existsSync(legacyOutfile)) fs.unlinkSync(legacyOutfile);

  const result = await esbuild.build({
    entryPoints: [CLOUD_MOBILE_ENTRY],
    outdir: outDir,
    entryNames: 'app.bundle',
    chunkNames: 'chunks/[name]-[hash]',
    publicPath: '/js/',
    splitting: true,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    sourcemap: true,
    metafile: true,
    logLevel: 'info',
    plugins: [createCloudMobileLanStripPlugin()],
  });

  if (!fs.existsSync(legacyOutfile)) {
    throw new Error('cloud-mobile bundle build produced no app.bundle.js');
  }
  fs.renameSync(legacyOutfile, outfile);
  const legacyMap = path.join(outDir, 'app.bundle.js.map');
  const mjsMap = path.join(outDir, 'app.bundle.mjs.map');
  if (fs.existsSync(legacyMap)) {
    if (fs.existsSync(mjsMap)) fs.unlinkSync(mjsMap);
    fs.renameSync(legacyMap, mjsMap);
  }

  const metaPath = path.join(outDir, 'app.bundle.meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(result.metafile, null, 2) + '\n');

  for (const outPath of Object.keys(result.metafile.outputs)) {
    const base = path.basename(outPath);
    if (
      base.includes('mobile-sharer-sync') ||
      base.includes('detach-lan-for-nube') ||
      base.includes('lan-config-retire') ||
      base.includes('live-sync-membership')
    ) {
      throw new Error(`cloud-mobile bundle still contains LAN chunk: ${base}`);
    }
  }

  for (const inputPath of Object.keys(result.metafile.inputs)) {
    if (inputPath.includes('/features/lan/')) {
      throw new Error(`cloud-mobile bundle still references features/lan: ${inputPath}`);
    }
  }

  return result;
}

function cleanDest() {
  if (fs.existsSync(DEST)) {
    fs.rmSync(DEST, { recursive: true, force: true });
  }
  fs.mkdirSync(DEST, { recursive: true });
}

async function main() {
  runUiBuild();
  cleanDest();

  console.log('bundling cloud-mobile renderer…');
  await bundleCloudMobileRenderer(path.join(DEST, 'js'));

  copyFile(path.join(PUBLIC, 'tokens.css'), path.join(DEST, 'tokens.css'));
  copyDir(path.join(PUBLIC, 'styles'), path.join(DEST, 'styles'));
  copyDir(path.join(PUBLIC, 'icons'), path.join(DEST, 'icons'));
  copyDir(path.join(PUBLIC, 'vendor'), path.join(DEST, 'vendor'));

  const manifestSrc = path.join(PUBLIC, 'manifest.webmanifest');
  if (fs.existsSync(manifestSrc)) {
    const manifestOut = buildMobileManifest(fs.readFileSync(manifestSrc, 'utf8'));
    writeFile(path.join(DEST, 'manifest.webmanifest'), manifestOut);
  }

  const indexSrc = path.join(PUBLIC, 'index.html');
  if (!fs.existsSync(indexSrc)) {
    console.error('missing public/index.html');
    process.exit(1);
  }
  const indexOut = buildMobileIndexHtml(fs.readFileSync(indexSrc, 'utf8'));
  writeFile(path.join(DEST, 'index.html'), indexOut);

  // Chunks keep esbuild publicPath `/js/` — rewrite for `/mobile/` ASSETS mount.
  rewriteJsTree(path.join(DEST, 'js'));

  console.log(`wrote cloud/sync-pages/public/mobile/ (${totalBytes.toLocaleString()} bytes)`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
