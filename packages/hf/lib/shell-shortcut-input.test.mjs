import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReservedShellShortcutInput } from './shell-shortcut-input.cjs';

function keyDown(overrides) {
  return Object.assign({ type: 'keyDown', code: 'KeyC', key: 'c', meta: true }, overrides);
}

test('plain Cmd+C is not reserved (must reach Chromium as native copy)', () => {
  assert.equal(isReservedShellShortcutInput(keyDown()), false);
});

test('plain Ctrl+C is not reserved', () => {
  assert.equal(isReservedShellShortcutInput(keyDown({ meta: false, control: true })), false);
});

test('Cmd+Shift+C is still reserved (context-aware copy shortcut)', () => {
  assert.equal(isReservedShellShortcutInput(keyDown({ shift: true })), true);
});

test('other reserved shortcuts like Cmd+E are unaffected', () => {
  assert.equal(isReservedShellShortcutInput(keyDown({ code: 'KeyE', key: 'e' })), true);
});
