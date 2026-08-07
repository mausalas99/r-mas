import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shellWorkModeForKey, shellWorkModeShortcutMap } from './app-shell-keyboard.mjs';

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
});
