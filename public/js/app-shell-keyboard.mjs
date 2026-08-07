/**
 * Shell keyboard shortcuts (⌘/Ctrl+digit tabs, ⌘K palette, work modes, etc.).
 */
import { isPaseMode, isGuardiaMode } from './features/chrome.mjs';
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
  runAgendaTabShortcut,
  runAgendaWeekNavShortcut,
} from './app-shell-tab-shortcuts.mjs';
import { markTabShortcutsAdopted } from './keyboard-shortcuts-nudge.mjs';

var shellKeyboardWired = false;

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

function noteTabNavigationShortcutUsed() {
  markTabShortcutsAdopted();
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
      : 'Importación: se preguntará en cada conflicto.',
    window.__rpcPreferImportOverwrite ? 'success' : 'info'
  );
}

function handleShellWorkModeShortcut(key) {
  var mode = shellWorkModeForKey(key);
  if (!mode) return false;
  setWorkModeFromHeader(mode);
  return true;
}

function handleShellNamedShortcut(e, key) {
  if (key === 'k' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    openCommandPaletteFromShell();
    return true;
  }
  if (key === 'p' && e.shiftKey && !e.altKey) {
    e.preventDefault();
    toggleProfileSection();
    return true;
  }
  if (!e.shiftKey && !e.altKey && key === 'm') {
    if (shellShortcutFromTypingField(e)) return false;
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runMedTabShortcut();
    return true;
  }
  if (!e.shiftKey && !e.altKey && key === 'a') {
    if (shellShortcutFromTypingField(e)) return false;
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runAgendaTabShortcut();
    return true;
  }
  if (!e.shiftKey && !e.altKey && handleShellWorkModeShortcut(key)) {
    e.preventDefault();
    e.stopPropagation();
    return true;
  }
  if (!e.shiftKey && !e.altKey && isExpedienteShortcutKey(key)) {
    if (shellShortcutFromTypingField(e)) return false;
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runExpedienteShortcut(key);
    return true;
  }
  return false;
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

/** @param {(msg: string, type?: string) => void} showToast */
function onShellModifierKeydown(e, showToast) {
  if (isGuardiaMode()) return;

  var key = e.key.toLowerCase();

  if (e.shiftKey && !e.altKey && key === '3') {
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runMedOutputTabShortcut();
    return;
  }

  if (!e.shiftKey && !e.altKey && (key === '[' || key === ']')) {
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runAgendaWeekNavShortcut(key === '[' ? -1 : 1);
    return;
  }

  if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5') {
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runTabDigitShortcut(key);
    return;
  }
  if (handleShellNamedShortcut(e, key)) return;
  handleShellCommaShortcut(e, showToast);
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
}

/** @internal Tests only */
export function runShellModifierKeydownForTests(e, showToast) {
  onShellModifierKeydown(e, showToast);
}
