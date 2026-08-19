import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function readSidebarCss() {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'sidebar.css'), 'utf8');
}

test('patient cards use the soft-card container radius, not the oversized default', () => {
  const css = readSidebarCss();
  assert.match(css, /\.patient-card\s*\{[^}]*border-radius:\s*var\(--radius-container\)/s);
});

test('pinned patient cards get a distinct teal-tinted border (3b tarjetas suaves)', () => {
  const css = readSidebarCss();
  assert.match(css, /\.patient-card--pinned\s*\{[^}]*border-color:\s*color-mix\(in oklab, var\(--action\)/s);
});
