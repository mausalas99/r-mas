import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderConnectionPanelFallback } from './connection-panel.mjs';

const here = dirname(fileURLToPath(import.meta.url));

describe('connection-panel', () => {
  it('renders fallback copy instead of leaving the modal empty', () => {
    const root = { innerHTML: '' };
    renderConnectionPanelFallback(root, 'local-only');
    assert.match(root.innerHTML, /Solo este equipo/);
    assert.match(root.innerHTML, /data-cloud-nube-fallback/);

    renderConnectionPanelFallback(root, 'unsupported-sala');
    assert.match(root.innerHTML, /Conexión no disponible/);
  });

  it('skips cached mount when only fallback markup is present', () => {
    const src = readFileSync(join(here, 'connection-panel.mjs'), 'utf8');
    assert.match(src, /data-cloud-nube-fallback/);
    assert.match(src, /shouldShowNubePanel\(getUserSala\(\)\)/);
  });

  it('toast runtime is the object runtime() returns, not a discarded function property', () => {
    const src = readFileSync(join(here, 'connection-panel.mjs'), 'utf8');
    const start = src.indexOf('export async function renderConnectionPanel');
    assert.ok(start >= 0);
    const body = src.slice(start, start + 1600);
    assert.match(body, /opts\?\.runtime|opts && opts\.runtime/);
    assert.doesNotMatch(
      body,
      /runtime\.showToast\s*=/,
      'showToast must live on the object returned by runtime(), not on the function'
    );
  });
});
