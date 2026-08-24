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
import { rt } from './features/app-tabs-runtime.mjs';
import { _applyRepoSnapshot, resetClinicalReadModelForTests } from './clinical-read-model.mjs';

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
  it('mapa G/I/S → modos de trabajo', () => {
    assert.deepEqual(shellWorkModeShortcutMap, {
      g: 'guardia',
      i: 'interconsulta',
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

  it('⌘⇧C copia labs (no estado actual) cuando la pestaña activa es Laboratorio', async () => {
    resetClinicalReadModelForTests();
    _applyRepoSnapshot({
      patients: [{ id: 'p1', nombre: 'Ana Ruiz', pinned: true }],
      labHistory: { p1: [{ fecha: '16/08/2026', resLabs: ['BH\nHb 12.9*'] }] },
    });
    var prevClipboard = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText: async () => {} } },
      configurable: true,
    });
    var prevAppTab = rt.getActiveAppTab;
    var prevInner = rt.getActiveInner;
    rt.getActiveAppTab = function () {
      return 'lab';
    };
    rt.getActiveInner = function () {
      return 'estadoActual';
    };
    var toastMsg = '';
    try {
      runShellModifierKeydownForTests(
        {
          metaKey: true,
          ctrlKey: false,
          altKey: false,
          shiftKey: true,
          key: 'c',
          code: 'KeyC',
          preventDefault() {},
          target: { tagName: 'BODY', isContentEditable: false },
        },
        function (msg) {
          toastMsg = msg;
        }
      );
      await new Promise((r) => setTimeout(r, 0));
    } finally {
      rt.getActiveAppTab = prevAppTab;
      rt.getActiveInner = prevInner;
      Object.defineProperty(globalThis, 'navigator', { value: prevClipboard, configurable: true });
    }
    assert.match(toastMsg, /Laboratorios copiados/);
  });
});
