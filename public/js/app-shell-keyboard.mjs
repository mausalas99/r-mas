/**
 * Shell keyboard shortcuts (⌘/Ctrl+digit tabs, ⌘K palette, ⌘P density, etc.).
 */
import {
  getUiDensity,
  isPaseMode,
  isGuardiaMode,
  setUiDensity,
  toggleGuardiaMode,
} from './features/chrome.mjs';
import { toggleProfileSection } from './features/profile.mjs';
import {
  switchAppTab,
  openPaseSectionInNormal,
} from './features/pase-board.mjs';
import {
  shellCloseSettingsDropdown,
  shellToggleSettingsDropdown,
  openCommandPaletteFromShell,
} from './app-shell-lazy-panels.mjs';

var shellKeyboardWired = false;

function shellShortcutFromTypingField(e) {
  var tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (e.target && e.target.isContentEditable)
  );
}

function handleShellDigitShortcut(key) {
  if (isPaseMode()) {
    if (key === '1') openPaseSectionInNormal('labs');
    if (key === '2') openPaseSectionInNormal('expediente');
    if (key === '3') openPaseSectionInNormal('med');
    if (key === '4' || key === '5') openPaseSectionInNormal('agenda');
    return;
  }
  if (key === '1') switchAppTab('lab');
  if (key === '2') switchAppTab('nota');
  if (key === '3') switchAppTab('med');
  if (key === '4' || key === '5') switchAppTab('agenda');
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

function handleShellNamedShortcut(e, key) {
  if (key === 'k' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    openCommandPaletteFromShell();
    return true;
  }
  if (key === 'p' && !e.altKey) {
    e.preventDefault();
    if (e.shiftKey) toggleProfileSection();
    else if (isGuardiaMode()) setUiDensity('normal');
    else setUiDensity(getUiDensity() === 'normal' ? 'pase' : 'normal');
    return true;
  }
  if (key === 'g' && e.shiftKey && !e.altKey) {
    e.preventDefault();
    toggleGuardiaMode();
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
  var key = e.key.toLowerCase();
  if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5') {
    e.preventDefault();
    handleShellDigitShortcut(key);
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
