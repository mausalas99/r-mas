import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  shellWorkModeForKey,
  shellWorkModeShortcutMap,
  runShellModifierKeydownForTests,
  isShellSlashShortcutForTests,
  normalizeShellShortcutKey,
} from './app-shell-keyboard.mjs';
import { SHORTCUT_GROUPS } from './features/settings-help/shortcuts-data.mjs';

const UI_DENSITY_LS = 'rpc-ui-density';

function memoryStore() {
  var map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

describe('app-shell-keyboard work mode shortcuts', () => {
  /** @type {Storage|undefined} */
  var prevLocal;

  beforeEach(() => {
    prevLocal = globalThis.localStorage;
    globalThis.localStorage = memoryStore();
  });

  afterEach(() => {
    if (prevLocal === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prevLocal;
  });
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

  it('hoja de atajos se abre con ⌘/ (no hold de ⌘ solo — conflicto ⌘Tab)', () => {
    var appGroup = SHORTCUT_GROUPS.find(function (g) {
      return g.title === 'Aplicación';
    });
    assert.ok(appGroup);
    var slash = appGroup.items.find(function (item) {
      return item.keys.join('') === '⌘/';
    });
    assert.ok(slash);
    assert.match(slash.label, /atajos/i);
  });

  it('isShellSlashShortcut acepta key y code (teclados ES)', () => {
    assert.equal(isShellSlashShortcutForTests({ code: 'Slash' }, '/'), true);
    assert.equal(isShellSlashShortcutForTests({ code: 'Slash' }, '?'), true);
    assert.equal(isShellSlashShortcutForTests({ code: 'NumpadDivide' }, ''), true);
    assert.equal(isShellSlashShortcutForTests({ code: 'KeyE' }, 'e'), false);
  });

  it('⌘/ funciona en modo Guardia y con foco en INPUT (sala / EA)', () => {
    globalThis.localStorage.setItem(UI_DENSITY_LS, 'guardia');
    var prevented = false;
    runShellModifierKeydownForTests(
      {
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: '/',
        code: 'Slash',
        preventDefault() {
          prevented = true;
        },
        target: { tagName: 'INPUT', isContentEditable: false },
      },
      function () {}
    );
    assert.equal(prevented, true);
  });

  it('⌘K no se bloquea en modo Guardia', () => {
    globalThis.localStorage.setItem(UI_DENSITY_LS, 'guardia');
    var prevented = false;
    runShellModifierKeydownForTests(
      {
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: 'k',
        preventDefault() {
          prevented = true;
        },
        target: { tagName: 'BODY', isContentEditable: false },
      },
      function () {}
    );
    assert.equal(prevented, true);
    assert.equal(globalThis.localStorage.getItem(UI_DENSITY_LS), 'guardia');
  });

  it('normalizeShellShortcutKey uses e.code when e.key is empty or dead', () => {
    assert.equal(normalizeShellShortcutKey({ code: 'Digit1', key: '' }), '1');
    assert.equal(normalizeShellShortcutKey({ code: 'KeyE', key: 'Dead' }), 'e');
    assert.equal(normalizeShellShortcutKey({ code: 'KeyT', key: 'Meta' }), 't');
    assert.equal(normalizeShellShortcutKey({ code: 'KeyK', key: 'k' }), 'k');
    assert.equal(normalizeShellShortcutKey({ code: 'KeyA', key: 'a' }), 'a');
    assert.equal(normalizeShellShortcutKey({ code: 'Enter', key: 'Enter' }), 'enter');
  });

  it('⌘↩ vuelve a Resumen even with focus in an input', () => {
    var prevented = false;
    var stopped = false;
    runShellModifierKeydownForTests(
      {
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: 'Enter',
        code: 'Enter',
        preventDefault() {
          prevented = true;
        },
        stopPropagation() {
          stopped = true;
        },
        target: { tagName: 'INPUT', isContentEditable: false },
      },
      function () {}
    );
    assert.equal(prevented, true);
    assert.equal(stopped, true);
  });
});
