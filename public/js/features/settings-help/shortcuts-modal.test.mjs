import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SHORTCUT_GROUPS } from './shortcuts-data.mjs';
import {
  openShortcutsModal,
  closeShortcutsModal,
  closeShortcutsPeek,
  isShortcutsPeekMode,
  resetShortcutsModalStateForTests,
} from './shortcuts-modal.mjs';

describe('shortcuts-data', () => {
  it('SHORTCUT_GROUPS tiene secciones con atajos', () => {
    assert.ok(SHORTCUT_GROUPS.length >= 4);
    assert.ok(SHORTCUT_GROUPS[0].items.length > 0);
  });

  it('⌘1 Paciente and ⌘2 Laboratorio match the strip (inner cycles)', () => {
    var tabs = SHORTCUT_GROUPS[0].items;
    assert.equal(tabs[0].label, 'Paciente');
    assert.equal(tabs[1].label, 'Laboratorio');
    assert.equal(tabs[2].label, 'Manejo');
    assert.match(tabs[0].hint || '', /Resumen.*Clínico.*Salida/);
    assert.match(tabs[1].hint || '', /Labs.*Tendencias.*Cultivos/);
    assert.doesNotMatch(tabs[0].hint || '', /Resultados/);
  });

  it('does not bind ⌘A (Select All stays native)', () => {
    var items = SHORTCUT_GROUPS.flatMap(function (g) { return g.items; });
    assert.equal(items.some(function (it) {
      return it.keys.length === 2 && it.keys[0] === '⌘' && it.keys[1] === 'A';
    }), false);
  });
});

describe('shortcuts-modal DOM', () => {
  beforeEach(() => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML =
      '<div id="shortcuts-backdrop" class="modal-backdrop shortcuts-backdrop" aria-hidden="true">' +
      '<div class="shortcuts-sheet">' +
      '<div class="shortcuts-chrome">' +
      '<div class="shortcuts-chrome-row">' +
      '<button type="button" class="shortcuts-close"></button>' +
      '</div>' +
      '<p class="shortcuts-lead" id="shortcuts-hint-bar">' +
      '<kbd id="shortcuts-modal-hint-mod"></kbd></p>' +
      '</div>' +
      '<div id="shortcuts-modal-body" class="shortcuts-body"></div>' +
      '<footer class="shortcuts-foot"></footer>' +
      '</div></div>';
    resetShortcutsModalStateForTests();
  });

  afterEach(() => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML = '';
    resetShortcutsModalStateForTests();
  });

  it('openShortcutsModal renderiza filas y abre backdrop', () => {
    if (typeof document === 'undefined') return;
    openShortcutsModal();
    var backdrop = document.getElementById('shortcuts-backdrop');
    assert.equal(backdrop.classList.contains('open'), true);
    assert.equal(isShortcutsPeekMode(), false);
    var body = document.getElementById('shortcuts-modal-body');
    assert.ok(body.innerHTML.includes('shortcuts-section'));
    assert.ok(body.innerHTML.includes('shortcuts-row'));
    assert.ok(body.innerHTML.includes('Laboratorio'));
  });

  it('peek mode se cierra con closeShortcutsPeek', () => {
    if (typeof document === 'undefined') return;
    openShortcutsModal({ peek: true });
    assert.equal(isShortcutsPeekMode(), true);
    closeShortcutsPeek();
    assert.equal(isShortcutsPeekMode(), false);
    assert.equal(document.getElementById('shortcuts-backdrop').classList.contains('open'), false);
  });

  it('closeShortcutsModal no afecta modo normal ya cerrado', () => {
    if (typeof document === 'undefined') return;
    openShortcutsModal();
    closeShortcutsModal();
    closeShortcutsPeek();
    assert.equal(document.getElementById('shortcuts-backdrop').classList.contains('open'), false);
  });
});
