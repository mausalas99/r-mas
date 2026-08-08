/**
 * Gentle nudge when users switch tabs often with the mouse; stops after any nav shortcut.
 */
import { isGuardiaMode } from './features/chrome.mjs';
import { isMobileWeb } from './mobile-web.mjs';

export const TAB_SHORTCUTS_ADOPTED_LS_KEY = 'rpc-keyboard-tab-shortcuts-adopted';
export const MOUSE_TAB_SWITCH_THRESHOLD = 5;

var nudgeWired = false;
var nudgeShownThisSession = false;
var mouseTabClickCount = 0;

var TAB_CLICK_SELECTOR =
  '#app-main-tablist .app-tab,' +
  '.exp-consolidated-tab,' +
  '.exp-segment-btn,' +
  '#med-subview-tabs-bar .inner-tab,' +
  '.med-output-tab';

export function isTabShortcutsAdopted() {
  try {
    return localStorage.getItem(TAB_SHORTCUTS_ADOPTED_LS_KEY) === '1';
  } catch (_e) {
    return false;
  }
}

export function markTabShortcutsAdopted() {
  try {
    localStorage.setItem(TAB_SHORTCUTS_ADOPTED_LS_KEY, '1');
  } catch (_e) {
    void _e;
  }
  nudgeShownThisSession = true;
}

/**
 * @param {{ adopted?: boolean, nudgeShownThisSession?: boolean, mouseTabClickCount: number }} state
 */
export function shouldOfferTabShortcutsNudge(state) {
  if (state.adopted) return false;
  if (state.nudgeShownThisSession) return false;
  return state.mouseTabClickCount >= MOUSE_TAB_SWITCH_THRESHOLD;
}

/** @param {number} count */
export function nextMouseTabClickCount(count) {
  return Math.max(0, Number(count) || 0) + 1;
}

function modKeyLabel() {
  if (typeof navigator !== 'undefined' && navigator.platform && /Mac/i.test(navigator.platform)) {
    return '⌘';
  }
  return 'Ctrl';
}

function openAtajosHelp() {
  void import('./features/settings-help/shortcuts-modal.mjs').then(function (mod) {
    if (typeof mod.openShortcutsModal === 'function') mod.openShortcutsModal();
  });
}

function maybeShowTabShortcutsNudge(showToast) {
  if (typeof showToast !== 'function') return;
  if (isMobileWeb() || isGuardiaMode()) return;
  if (!shouldOfferTabShortcutsNudge({
    adopted: isTabShortcutsAdopted(),
    nudgeShownThisSession: nudgeShownThisSession,
    mouseTabClickCount: mouseTabClickCount,
  })) {
    return;
  }
  nudgeShownThisSession = true;
  var mod = modKeyLabel();
  showToast(
    '¿Muchos clics entre pestañas? Repite ' + mod + '+2 para cambiar sección del expediente.',
    'info',
    {
      durationMs: 6500,
      onClick: openAtajosHelp,
      action: { label: 'Ver atajos', onClick: openAtajosHelp },
    }
  );
}

function onDocumentTabClick(ev) {
  if (isMobileWeb() || isGuardiaMode() || isTabShortcutsAdopted()) return;
  var target = ev.target;
  if (!target || typeof target.closest !== 'function') return;
  if (!target.closest(TAB_CLICK_SELECTOR)) return;
  mouseTabClickCount = nextMouseTabClickCount(mouseTabClickCount);
  maybeShowTabShortcutsNudge(
    typeof window !== 'undefined' && typeof window.showToast === 'function'
      ? window.showToast
      : null
  );
}

/** @param {(msg: string, type?: string, opts?: object) => void} [_showToast] */
export function initKeyboardShortcutsNudge(_showToast) {
  if (nudgeWired || typeof document === 'undefined') return;
  nudgeWired = true;
  document.addEventListener('click', onDocumentTabClick, true);
}

/** @internal tests */
export function resetTabShortcutsNudgeStateForTests() {
  nudgeShownThisSession = false;
  mouseTabClickCount = 0;
}
