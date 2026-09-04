import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// interno-app.mjs runs `void init()` at module scope (network fetch + WebSocket),
// so it cannot be imported directly in a unit test — assert against source instead,
// same as other hard-to-instantiate render modules in this repo (patients-list.mjs).
const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, 'interno-app.mjs'), 'utf8');

describe('interno-app — .interno-estudio-row keyboard activation (WU7)', () => {
  it('adds a keydown listener next to the click listener that opens the same detail on Enter/Space', () => {
    const start = src.indexOf("querySelectorAll('.interno-estudio-row')");
    const end = src.indexOf('});', src.indexOf('});', start) + 3);
    const block = src.slice(start, end);
    assert.match(block, /row\.addEventListener\('click'/);
    assert.match(block, /row\.addEventListener\('keydown', \(ev\) => \{/);
    assert.match(block, /if \(ev\.key !== 'Enter' && ev\.key !== ' '\) return;/);
    assert.match(block, /ev\.preventDefault\(\);/);
    // Both handlers skip the "Hecho" button and both call the same openDetail().
    assert.match(block, /if \(ev\.target\.closest\('\[data-mark-done\]'\)\) return;\s*\n\s*openDetail\(\);/g);
  });
});

describe('interno-app — title attributes on CSS-truncated text (WU10)', () => {
  it('adds title="${escapeAttr(...)}" on .interno-name, escaped the same way as the visible text', () => {
    assert.match(
      src,
      /<span class="interno-name" title="\$\{escapeAttr\(p\.nameShort\)\}">\$\{escapeHtml\(p\.nameShort\)\}<\/span>/
    );
  });

  it('adds title="${escapeAttr(...)}" on .interno-estudio-label, escaped the same way as the visible text', () => {
    assert.match(
      src,
      /<span class="interno-estudio-label" title="\$\{escapeAttr\(item\.label \|\| ''\)\}">\$\{escapeHtml\(item\.label \|\| ''\)\}<\/span>/
    );
  });

  it('does not touch the .interno-estudio-row markup line owned by WU7', () => {
    assert.match(src, /<li class="interno-estudio-row\$\{done \? ' is-done' : ''\}"[^>]*role="button" tabindex="0">/);
  });
});

function functionBody(name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' should be declared');
  const nextFn = src.indexOf('\nfunction ', start + 1);
  return src.slice(start, nextFn === -1 ? src.length : nextFn);
}

describe('markPendienteComplete field-invalid marking (WU14)', () => {
  it('imports markFieldInvalid from the shared helper', () => {
    assert.match(src, /import \{ markFieldInvalid \} from '\.\.\/js\/ui-field-invalid\.mjs';/);
  });

  it('marks #interno-sheet-hecho invalid alongside the server-error toast', () => {
    const body = functionBody('markPendienteComplete');
    assert.match(
      body,
      /showToast\(msg\);\s*markFieldInvalid\(document\.getElementById\('interno-sheet-hecho'\), msg\);\s*return;/
    );
  });

  it('marks #interno-sheet-hecho invalid alongside the network-error toast', () => {
    const body = functionBody('markPendienteComplete');
    assert.match(
      body,
      /showToast\('Error de conexión'\);\s*markFieldInvalid\(document\.getElementById\('interno-sheet-hecho'\), 'Error de conexión'\);/
    );
  });
});
