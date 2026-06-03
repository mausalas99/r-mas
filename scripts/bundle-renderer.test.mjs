import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBundleRendererPaths } from './bundle-renderer.mjs';
import { filePatternCovers, PACK_FILES_BASELINE } from './lib/electron-pack-files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

describe('bundle-renderer', () => {
  it('resuelve rutas de entrada y salida del bundle', () => {
    const { entry, outfile } = getBundleRendererPaths(repoRoot);
    assert.match(entry, /public\/js\/app\.js$/);
    assert.match(outfile, /public\/js\/app\.bundle\.mjs$/);
  });

  it('esbuild chunks quedan bajo public/** para el empaquetado Mac', () => {
    const chunksDir = path.join(repoRoot, 'public/js/chunks');
    assert.ok(fs.existsSync(chunksDir), 'run npm run build:ui to emit chunks');
    const sample = fs.readdirSync(chunksDir).find((f) => f.endsWith('.js') && !f.endsWith('.map'));
    assert.ok(sample, 'expected at least one chunk .js');
    const rel = `public/js/chunks/${sample}`;
    assert.ok(
      filePatternCovers(rel, PACK_FILES_BASELINE),
      `${rel} must be covered by electron-pack public/**/*`
    );
  });

  it('index.html no carga Chart.js bloqueante (BN-09)', () => {
    const html = fs.readFileSync(path.join(repoRoot, 'public/index.html'), 'utf8');
    assert.doesNotMatch(html, /vendor\/chart\.umd\.min\.js/);
  });
});
