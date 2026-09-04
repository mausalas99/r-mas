import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ensureTendenciasClickDelegation wires openTendDetail via a chain that loads
// Chart.js and opens an animated overlay (tendencias-ui-detail.mjs) — not safe to
// run end-to-end in a unit test, so this asserts the delegated keydown wiring
// against source, same convention as patients-list.test.mjs for tendencias-render's
// sibling delegation case in patients-list.mjs.
const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, 'tendencias-ui-shell.mjs'), 'utf8');

describe('ensureTendenciasClickDelegation — .tend-card keyboard activation (WU7)', () => {
  it('adds a keydown listener on the same #tendencias-container root that reuses the click handler on Enter/Space', () => {
    const start = src.indexOf('function ensureTendenciasClickDelegation');
    const end = src.indexOf('function handleTendenciasToolbarClick');
    const fn = src.slice(start, end);
    assert.match(fn, /root\.addEventListener\('click', onTendenciasContainerClick\);/);
    assert.match(fn, /root\.addEventListener\('keydown', function \(ev\) \{/);
    assert.match(fn, /if \(ev\.key !== 'Enter' && ev\.key !== ' '\) return;/);
    assert.match(fn, /t\.closest\('\.tend-card'\)/);
    assert.match(fn, /ev\.preventDefault\(\);\s*\n\s*onTendenciasContainerClick\(ev\);/);
  });
});
