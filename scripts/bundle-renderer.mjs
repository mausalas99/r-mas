/**
 * Empaqueta public/js/app.js → public/js/app.bundle.mjs (esbuild).
 * Usado por prestart, build:ui y releases.
 */
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const ENTRY = path.join(ROOT, 'public/js/app.js');
const OUTFILE = path.join(ROOT, 'public/js/app.bundle.mjs');
const META_FILE = path.join(ROOT, 'public/js/app.bundle.meta.json');

export function getBundleRendererPaths(root = ROOT) {
  return { entry: path.join(root, 'public/js/app.js'), outfile: path.join(root, 'public/js/app.bundle.mjs') };
}

function buildOptions({ prod = false, write = true } = {}) {
  return {
    entryPoints: [ENTRY],
    outfile: OUTFILE,
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
    const jsOut = result.outputFiles.find((f) => f.path === OUTFILE || f.path.endsWith('app.bundle.mjs'));
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

  const result = await esbuild.build(buildOptions({ prod, write: true }));
  fs.writeFileSync(META_FILE, JSON.stringify(result.metafile, null, 2) + '\n');
  console.log('wrote public/js/app.bundle.mjs');
  return result;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const prod = process.argv.includes('--prod');
  const check = process.argv.includes('--check');
  const watch = process.argv.includes('--watch');
  bundleRenderer({ prod, check, watch }).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
