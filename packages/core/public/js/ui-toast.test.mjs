import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ui-toast.mjs needs a DOM; assert on source text like other no-DOM tests.
const src = readFileSync(fileURLToPath(new URL('./ui-toast.mjs', import.meta.url)), 'utf8');

describe('ui-toast swipe dismiss', () => {
  it('skips pointer capture on toast buttons, so a real click reaches them', () => {
    const start = src.indexOf('function onPointerDown');
    const body = src.slice(start, src.indexOf('function onPointerMove', start));
    const guard = body.indexOf("closest('.toast-action, .toast-close')) return;");
    const capture = body.indexOf('setPointerCapture');
    assert.notEqual(guard, -1);
    assert.ok(guard < capture, 'guard must run before setPointerCapture');
  });
});

describe('app-shell window.showToast', () => {
  it('passes opts through, so action buttons like «Ver atajos» render', () => {
    const shell = readFileSync(fileURLToPath(new URL('./app-shell.mjs', import.meta.url)), 'utf8');
    assert.match(shell, /export function showToast\(msg, type, opts\)/);
    assert.match(shell, /showToastImpl\(msg, type, opts\)/);
    assert.match(shell, /fn\(msg, type, opts\)/);
  });
});
