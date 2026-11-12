import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { PaletteList } from './command-palette-view.jsx';
  export const html = (items, query) => renderToString(
    <PaletteList items={items} selected={0} query={query} onHover={() => {}} onPick={() => {}} />);`);

// Exact markup command-palette.mjs made before the port (list.innerHTML after renderResults, captured
// from the old code in a browser with fixed items; no clock involved).
const { default: OLD } = await import('./command-palette-view.old.json', { with: { type: 'json' } });

// Preact writes void tags as <x/> and escapes quotes in text; HTML parses both the same.
const norm = (s) => s
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&gt;/g, '>')
  .replace(/<(rect|path|circle)\b([^>]*?)\s*\/>/g, '<$1$2></$1>');

for (const [name, old] of Object.entries(OLD)) {
  test(`palette HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.html(old.items, old.query)), norm(old.html));
  });
}
