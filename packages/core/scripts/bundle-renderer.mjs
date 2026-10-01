/**
 * Empaqueta public/js/app.js → public/js/app.bundle.mjs (esbuild).
 * Usado por prestart, build:ui y releases.
 */
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ENTRY = path.join(ROOT, 'public/js/app.js');
const OUT_DIR = path.join(ROOT, 'public/js');
const OUTFILE = path.join(OUT_DIR, 'app.bundle.mjs');
const META_FILE = path.join(OUT_DIR, 'app.bundle.meta.json');

export function getBundleRendererPaths(root = ROOT) {
  return {
    entry: path.join(root, 'public/js/app.js'),
    outfile: path.join(root, 'public/js/app.bundle.mjs'),
    outdir: path.join(root, 'public/js'),
  };
}

function isChartAutoChunk(metafile, outPath) {
  const info = metafile?.outputs?.[outPath];
  if (!info?.inputs) return false;
  return Object.keys(info.inputs).some(
    (k) => k.includes('node_modules/chart.js') || k.endsWith('chart.js/auto')
  );
}

function findChartChunkImportUrl(metafile, outDir = OUT_DIR) {
  if (metafile && metafile.outputs) {
    for (const outPath of Object.keys(metafile.outputs)) {
      const base = path.basename(outPath);
      if (!/^auto-.*\.js$/.test(base)) continue;
      if (!isChartAutoChunk(metafile, outPath)) continue;
      return '/js/chunks/' + base;
    }
  }
  const chunksDir = path.join(outDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const hit = fs
      .readdirSync(chunksDir)
      .find((f) => /^auto-.*\.js$/.test(f) && !f.endsWith('.map'));
    if (hit) return '/js/chunks/' + hit;
  }
  return null;
}

/** A dev build keeps old chunks this long: other sessions share this checkout. */
export const STALE_CHUNK_KEEP_MS = 2 * 60 * 60 * 1000;

/**
 * Delete chunks/ files this build did not write (and their .map files) once they are
 * older than keepMs. An app already running (npm start, an e2e) still holds the old
 * bundle and lazy-imports old chunk names; delete them and that import 404s for the
 * whole session (e.g. every cloud census push throws). Prod passes keepMs 0.
 * ponytail: age cutoff, not a refcount of running apps; a run longer than keepMs can still break.
 */
export function removeStaleChunks(metafile, { chunksDir = path.join(OUT_DIR, 'chunks'), keepMs = 0, now = Date.now() } = {}) {
  if (!fs.existsSync(chunksDir)) return;
  const fresh = new Set(Object.keys(metafile.outputs).map((p) => path.basename(p)));
  for (const f of fs.readdirSync(chunksDir)) {
    if (fresh.has(f)) continue;
    const file = path.join(chunksDir, f);
    if (now - fs.statSync(file).mtimeMs >= keepMs) fs.rmSync(file, { force: true });
  }
}

function buildOptions({ prod = false, write = true } = {}) {
  return {
    entryPoints: [ENTRY],
    outdir: OUT_DIR,
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
    write,
    minify: prod,
    legalComments: prod ? 'none' : 'inline',
    ...(prod ? { drop: ['debugger'] } : {}),
  };
}

/** @param {{ prod?: boolean, check?: boolean, watch?: boolean }} [opts] */
export async function bundleRenderer(opts = {}) {
  const prod = !!opts.prod;
  const check = !!opts.check;
  const watch = !!opts.watch;

  if (!fs.existsSync(ENTRY)) {
    throw new Error('missing public/js/app.js');
  }

  if (check) {
    const result = await esbuild.build(buildOptions({ prod, write: false }));
    const jsOut = result.outputFiles.find(
      (f) =>
        f.path === OUTFILE ||
        f.path.endsWith('app.bundle.mjs') ||
        f.path.endsWith('app.bundle.js')
    );
    if (!jsOut) throw new Error('bundle build produced no JS output');
    const onDisk = fs.existsSync(OUTFILE) ? fs.readFileSync(OUTFILE, 'utf8') : '';
    if (onDisk !== jsOut.text) {
      throw new Error('app.bundle.mjs out of date; run npm run bundle:renderer');
    }
    return result;
  }

  if (watch) {
    const ctx = await esbuild.context(buildOptions({ prod, write: true }));
    await ctx.watch();
    console.log('watching public/js → app.bundle.mjs');
    return ctx;
  }

  // Write over the old build, then drop stale chunks. Wiping chunks/ first left a
  // window where a running app (npm start, an e2e) lazy-loaded a 404 and hung on
  // "Preparando R+". Renames overwrite in place for the same reason.
  const result = await esbuild.build(buildOptions({ prod, write: true }));
  const bundleJs = path.join(OUT_DIR, 'app.bundle.js');
  if (!fs.existsSync(bundleJs)) {
    throw new Error('bundle build produced no public/js/app.bundle.js');
  }
  fs.renameSync(bundleJs, OUTFILE);
  const bundleJsMap = path.join(OUT_DIR, 'app.bundle.js.map');
  const bundleMjsMap = path.join(OUT_DIR, 'app.bundle.mjs.map');
  if (fs.existsSync(bundleJsMap)) fs.renameSync(bundleJsMap, bundleMjsMap);
  removeStaleChunks(result.metafile, { keepMs: prod ? 0 : STALE_CHUNK_KEEP_MS });
  fs.writeFileSync(META_FILE, JSON.stringify(result.metafile, null, 2) + '\n');
  const chartChunkManifest = path.join(OUT_DIR, 'chart-chunk.json');
  const chartImportUrl = findChartChunkImportUrl(result.metafile);
  if (chartImportUrl) {
    fs.writeFileSync(
      chartChunkManifest,
      JSON.stringify({ importUrl: chartImportUrl }, null, 2) + '\n'
    );
  } else if (fs.existsSync(chartChunkManifest)) {
    fs.unlinkSync(chartChunkManifest);
  }
  console.log('wrote public/js/app.bundle.mjs');
  return result;
}

const isMain = import.meta.main;
if (isMain) {
  const prod = process.argv.includes('--prod');
  const check = process.argv.includes('--check');
  const watch = process.argv.includes('--watch');
  bundleRenderer({ prod, check, watch }).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
