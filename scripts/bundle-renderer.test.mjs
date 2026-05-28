import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBundleRendererPaths } from './bundle-renderer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

describe('bundle-renderer', () => {
  it('resuelve rutas de entrada y salida del bundle', () => {
    const { entry, outfile } = getBundleRendererPaths(repoRoot);
    assert.match(entry, /public\/js\/app\.js$/);
    assert.match(outfile, /public\/js\/app\.bundle\.mjs$/);
  });
});
