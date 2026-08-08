/** Shortcuts cheat sheet modal — header button + hold ⌘/Ctrl peek. */
import { esc } from '../patients-html.mjs';
import { SHORTCUT_GROUPS, modKeyLabel, SHORTCUTS_HOLD_MS } from './shortcuts-data.mjs';
import { openQuickHelp } from './help-content.mjs';

var peekMode = false;
var bodyRendered = false;

function modGlyph() {
  return modKeyLabel();
}

function formatKeyLabel(key) {
  var mod = modGlyph();
  return String(key).replace(/⌘/g, mod).replace(/Ctrl/g, mod);
}

function renderKeyGroup(keys) {
  return (
    '<span class="shortcuts-key-group">' +
    keys
      .map(function (k) {
        return '<kbd class="shortcuts-key">' + esc(formatKeyLabel(k)) + '</kbd>';
      })
      .join('') +
    '</span>'
  );
}

function renderShortcutsBody() {
  var container = document.getElementById('shortcuts-modal-body');
  if (!container) return;
  var mod = modGlyph();
  container.innerHTML = SHORTCUT_GROUPS.map(function (group) {
    return (
      '<section class="shortcuts-section">' +
      '<h4 class="shortcuts-section-title">' +
      esc(group.title) +
      '</h4>' +
      '<ul class="shortcuts-rows">' +
      group.items
        .map(function (item) {
          var hint =
            item.hint
              ? '<span class="shortcuts-row-hint">' + esc(item.hint) + '</span>'
              : '';
          return (
            '<li class="shortcuts-row">' +
            '<div class="shortcuts-row-copy">' +
            '<span class="shortcuts-row-label">' +
            esc(item.label) +
            '</span>' +
            hint +
            '</div>' +
            renderKeyGroup(item.keys) +
            '</li>'
          );
        })
        .join('') +
      '</ul></section>'
    );
  }).join('');
  var hintMod = document.getElementById('shortcuts-modal-hint-mod');
  if (hintMod) hintMod.textContent = mod;
  var holdSec = String(Math.round(SHORTCUTS_HOLD_MS / 1000));
  var hintSec = document.getElementById('shortcuts-hint-seconds');
  if (hintSec) hintSec.textContent = holdSec;
  var hdrBtn = document.getElementById('btn-header-shortcuts');
  if (hdrBtn) hdrBtn.title = 'Atajos de teclado (mantén ' + mod + ' ' + holdSec + ' s)';
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
