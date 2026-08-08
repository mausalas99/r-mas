import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shellWorkModeForKey, shellWorkModeShortcutMap } from './app-shell-keyboard.mjs';
import { SHORTCUTS_HOLD_MS } from './features/settings-help/shortcuts-data.mjs';

describe('app-shell-keyboard work mode shortcuts', () => {
  it('mapa G/I/P/S → modos de trabajo', () => {
    assert.deepEqual(shellWorkModeShortcutMap, {
      g: 'guardia',
      i: 'interconsulta',
      p: 'pase',
      s: 'sala',
    });
  });

  it('shellWorkModeForKey resuelve tecla o null', () => {
    assert.equal(shellWorkModeForKey('g'), 'guardia');
    assert.equal(shellWorkModeForKey('I'), 'interconsulta');
    assert.equal(shellWorkModeForKey('s'), 'sala');
    assert.equal(shellWorkModeForKey('x'), null);
  });

  it('hold de atajos requiere mantener ⌘ 2 segundos', () => {
    assert.equal(SHORTCUTS_HOLD_MS, 2000);
  });
});
