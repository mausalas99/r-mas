/** Shortcuts cheat sheet modal — header button + ⌘/ (Ctrl+/). */
import { SHORTCUT_GROUPS, modKeyLabel } from './shortcuts-data.mjs';
import { openQuickHelp } from './help-content.mjs';

var peekMode = false;
var bodyRendered = false;

function modGlyph() {
  return modKeyLabel();
}

function renderShortcutsBody() {
  var container = document.getElementById('shortcuts-modal-body');
  if (!container) return;
  var mod = modGlyph();
  void import('./shortcuts-modal-view.jsx').then(function (view) {
    view.drawShortcutsBody(container, { groups: SHORTCUT_GROUPS, mod: mod });
  });
  var hintMod = document.getElementById('shortcuts-modal-hint-mod');
  if (hintMod) hintMod.textContent = mod;
  var hdrBtn = document.getElementById('btn-header-shortcuts');
  if (hdrBtn) hdrBtn.title = 'Atajos de teclado (' + mod + '/)';
  bodyRendered = true;
}

function syncPeekChrome() {
  var backdrop = document.getElementById('shortcuts-backdrop');
  if (!backdrop) return;
  backdrop.classList.toggle('shortcuts-backdrop--peek', peekMode);
}

/**
 * @param {{ peek?: boolean }} [opts]
 */
export function openShortcutsModal(opts) {
  var el = document.getElementById('shortcuts-backdrop');
  if (!el) return;
  peekMode = !!(opts && opts.peek);
  if (!bodyRendered) renderShortcutsBody();
  syncPeekChrome();
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
}

export function closeShortcutsModal() {
  var el = document.getElementById('shortcuts-backdrop');
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  el.classList.remove('shortcuts-backdrop--peek');
  peekMode = false;
  syncPeekChrome();
}

export function closeShortcutsPeek() {
  if (peekMode) closeShortcutsModal();
}

export function isShortcutsModalOpen() {
  var el = document.getElementById('shortcuts-backdrop');
  return el && el.classList.contains('open');
}

export function isShortcutsPeekMode() {
  return peekMode;
}

export function openShortcutsHelpCenter() {
  closeShortcutsModal();
  openQuickHelp('atajos');
}

/** @internal tests */
export function resetShortcutsModalStateForTests() {
  peekMode = false;
  bodyRendered = false;
}
