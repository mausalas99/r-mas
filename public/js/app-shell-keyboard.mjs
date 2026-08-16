/**
 * Shell keyboard shortcuts (⌘/Ctrl+digit tabs, ⌘K palette, work modes, etc.).
 */
import { toggleProfileSection, setWorkModeFromHeader } from './features/profile.mjs';
import {
  shellCloseSettingsDropdown,
  shellToggleSettingsDropdown,
  openCommandPaletteFromShell,
} from './app-shell-lazy-panels.mjs';
import {
  isExpedienteShortcutKey,
  runExpedienteShortcut,
} from './app-shell-expediente-shortcuts.mjs';
import {
  runTabDigitShortcut,
  runMedOutputTabShortcut,
  runMedTabShortcut,
  runAgendaWeekNavShortcut,
  runResumenHomeShortcut,
} from './app-shell-tab-shortcuts.mjs';
import { markTabShortcutsAdopted } from './keyboard-shortcuts-nudge.mjs';
import { copyTeamLabsForToday } from './features/patients-list/copy-team-labs.mjs';

var shellKeyboardWired = false;
var lastShellShortcutAt = 0;
var lastShellShortcutSig = '';

var CODE_TO_KEY = {
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Numpad1: '1',
  Numpad2: '2',
  Numpad3: '3',
  Numpad4: '4',
  Numpad5: '5',
  KeyE: 'e',
  KeyT: 't',
  KeyD: 'd',
  KeyM: 'm',
  KeyG: 'g',
  KeyI: 'i',
  KeyP: 'p',
  KeyS: 's',
  KeyK: 'k',
  KeyN: 'n',
  KeyC: 'c',
  Slash: '/',
  Comma: ',',
  BracketLeft: '[',
  BracketRight: ']',
  Enter: 'enter',
  NumpadEnter: 'enter',
};

/** Layout-safe: prefer e.code so ⌘1/⌘E/⌘T work when e.key is empty or dead. */
export function normalizeShellShortcutKey(e) {
  var code = e && e.code ? String(e.code) : '';
  if (CODE_TO_KEY[code]) return CODE_TO_KEY[code];
  return String((e && e.key) || '').toLowerCase();
}

var WORK_MODE_SHORTCUTS = {
  g: 'guardia',
  i: 'interconsulta',
  p: 'pase',
  s: 'sala',
};

export const shellWorkModeShortcutMap = Object.freeze({ ...WORK_MODE_SHORTCUTS });

export function shellWorkModeForKey(key) {
  return WORK_MODE_SHORTCUTS[String(key || '').toLowerCase()] || null;
}

function shellShortcutFromTypingField(e) {
  var tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (e.target && e.target.isContentEditable)
  );
}

/** Slash shortcut — layout-tolerant (⌘/ on US, ⌘⇧7 on some ES layouts). */
function isShellSlashShortcut(e, key) {
  if (key === '/' || key === '?') return true;
  var code = e && e.code ? String(e.code) : '';
  return code === 'Slash' || code === 'NumpadDivide';
}

function noteTabNavigationShortcutUsed() {
  markTabShortcutsAdopted();
}

function openShortcutsModalFromShortcut() {
  void import('./features/settings-help/shortcuts-modal.mjs').then(function (mod) {
    if (typeof mod.openShortcutsModal === 'function') mod.openShortcutsModal();
  });
}

/** ⌘/ or Ctrl+/ — show shortcuts cheat sheet (not bare ⌘ hold: conflicts with macOS ⌘Tab). */
function handleShellShortcutsSlashShortcut(e, key) {
  if (!isShellSlashShortcut(e, key)) return false;
  if (e.altKey) return false;
  e.preventDefault();
  openShortcutsModalFromShortcut();
  return true;
}

function handleShellSettingsCommaShortcut() {
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (bg && bg.classList.contains('open')) shellCloseSettingsDropdown();
  else shellToggleSettingsDropdown();
}

/** @param {(msg: string, type?: string) => void} showToast */
function handleShellImportOverwriteShortcut(showToast) {
  window.__rpcPreferImportOverwrite = !window.__rpcPreferImportOverwrite;
  showToast(
    window.__rpcPreferImportOverwrite
      ? 'Importación: conflictos → sobrescribir (⌘⇧, o Ctrl+Shift+, de nuevo para apagar).'
      : 'Importación: conflictos → se preguntará en cada conflicto.',
    window.__rpcPreferImportOverwrite ? 'success' : 'info'
  );
}

function handleShellWorkModeShortcut(key) {
  var mode = shellWorkModeForKey(key);
  if (!mode) return false;
  setWorkModeFromHeader(mode);
  return true;
}

function handleShellPaletteShortcut(e, key) {
  if (key !== 'k' || e.shiftKey || e.altKey) return false;
  e.preventDefault();
  openCommandPaletteFromShell();
  return true;
}

/** @param {(msg: string, type?: string) => void} showToast */
function handleShellCopyTeamLabsShortcut(e, key, showToast) {
  if (key !== 'c' || !e.shiftKey || e.altKey) return false;
  e.preventDefault();
  copyTeamLabsForToday(showToast);
  return true;
}

function handleShellProfileShortcut(e, key) {
  if (key !== 'p' || !e.shiftKey || e.altKey) return false;
  e.preventDefault();
  toggleProfileSection();
  return true;
}

function handleShellTabLetterShortcut(e, key) {
  if (e.shiftKey || e.altKey) return false;
  if (key === 'm') {
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runMedTabShortcut();
    return true;
  }
  return false;
}

function handleShellExpedienteShortcut(e, key) {
  if (e.shiftKey || e.altKey || !isExpedienteShortcutKey(key)) return false;
  e.preventDefault();
  noteTabNavigationShortcutUsed();
  runExpedienteShortcut(key);
  return true;
}

function handleShellNamedShortcut(e, key) {
  if (handleShellShortcutsSlashShortcut(e, key)) return true;
  if (handleShellPaletteShortcut(e, key)) return true;
  if (handleShellProfileShortcut(e, key)) return true;
  if (handleShellTabLetterShortcut(e, key)) return true;
  if (!e.shiftKey && !e.altKey && handleShellWorkModeShortcut(key)) {
    e.preventDefault();
    e.stopPropagation();
    return true;
  }
  return handleShellExpedienteShortcut(e, key);
}

/** @param {(msg: string, type?: string) => void} showToast */
function handleShellCommaShortcut(e, showToast) {
  if (e.key !== ',') return false;
  if (shellShortcutFromTypingField(e)) return true;
  e.preventDefault();
  if (!e.shiftKey && !e.altKey) handleShellSettingsCommaShortcut();
  else if (e.shiftKey && !e.altKey) handleShellImportOverwriteShortcut(showToast);
  return true;
}

function handleShellDigitTabShortcut(e, key) {
  if (e.shiftKey || e.altKey) return false;
  if (key !== '1' && key !== '2' && key !== '3' && key !== '4' && key !== '5') return false;
  e.preventDefault();
  noteTabNavigationShortcutUsed();
  runTabDigitShortcut(key);
  return true;
}

function handleShellAgendaNavShortcut(e, key) {
  if (e.shiftKey || e.altKey) return false;
  if (key !== '[' && key !== ']') return false;
  e.preventDefault();
  noteTabNavigationShortcutUsed();
  runAgendaWeekNavShortcut(key === '[' ? -1 : 1);
  return true;
}

function handleShellMedOutputShortcut(e, key) {
  if (!e.shiftKey || e.altKey || key !== '3') return false;
  e.preventDefault();
  noteTabNavigationShortcutUsed();
  runMedOutputTabShortcut();
  return true;
}

function handleShellResumenHomeShortcut(e, key) {
  if (e.shiftKey || e.altKey) return false;
  if (key !== 'enter') return false;
  e.preventDefault();
  e.stopPropagation();
  noteTabNavigationShortcutUsed();
  runResumenHomeShortcut();
  return true;
}

/** @param {(msg: string, type?: string) => void} showToast */
function onShellModifierKeydown(e, showToast) {
  var key = normalizeShellShortcutKey(e);
  if (!key) return;

  var sig = key + ':' + (e.shiftKey ? '1' : '0');
  var now = Date.now();
  if (sig === lastShellShortcutSig && now - lastShellShortcutAt < 80) return;
  lastShellShortcutAt = now;
  lastShellShortcutSig = sig;

  if (handleShellResumenHomeShortcut(e, key)) return;
  if (handleShellMedOutputShortcut(e, key)) return;
  if (handleShellAgendaNavShortcut(e, key)) return;
  if (handleShellDigitTabShortcut(e, key)) return;
  if (handleShellCopyTeamLabsShortcut(e, key, showToast)) return;
  if (handleShellNamedShortcut(e, key)) return;
  handleShellCommaShortcut(e, showToast);
}

function payloadToKeyEvent(payload) {
  return {
    key: payload && payload.key,
    code: payload && payload.code,
    metaKey: true,
    ctrlKey: !!(payload && payload.control),
    shiftKey: !!(payload && payload.shift),
    altKey: !!(payload && payload.alt),
    preventDefault: function () {},
    stopPropagation: function () {},
    target: typeof document !== 'undefined' ? document.activeElement || document.body : {},
  };
}

/** @param {(msg: string, type?: string) => void} showToast */
export function initShellKeyboardShortcuts(showToast) {
  if (shellKeyboardWired) return;
  shellKeyboardWired = true;
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.metaKey || e.ctrlKey) onShellModifierKeydown(e, showToast);
    },
    true
  );
  var api = typeof window !== 'undefined' ? window.electronAPI : null;
  if (api && typeof api.onShellShortcut === 'function') {
    api.onShellShortcut(function (payload) {
      onShellModifierKeydown(payloadToKeyEvent(payload), showToast);
    });
  }
}

/** @internal Tests only */
export function runShellModifierKeydownForTests(e, showToast) {
  onShellModifierKeydown(e, showToast);
}

/** @internal Tests only */
export function isShellSlashShortcutForTests(e, key) {
  return isShellSlashShortcut(e, key);
}
