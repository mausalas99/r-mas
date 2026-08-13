/**
 * Chromium/Electron steals ⌘1–5 / ⌘T / ⌘E / ⌘N on rawKeyDown.
 * Match keyDown + rawKeyDown, Cmd/Ctrl via boolean flags OR modifiers[],
 * preventDefault, and forward `shell-shortcut` to the renderer.
 */
'use strict';

const CODE_RE = /^(Digit[1-5]|Numpad[1-5]|Key[ETDMGIPSKN]|Slash|Comma|BracketLeft|BracketRight)$/;
const KEYS = '12345etdmgipsn/,[]';
const META_MODS = { meta: 1, cmd: 1, command: 1 };
const CTRL_MODS = { control: 1, ctrl: 1 };

function isShortcutKeyEvent(type) {
  return type === 'keyDown' || type === 'rawKeyDown';
}

function modifierSet(input) {
  var list = input && Array.isArray(input.modifiers) ? input.modifiers : [];
  var out = {};
  for (var i = 0; i < list.length; i++) out[String(list[i]).toLowerCase()] = 1;
  return out;
}

function hasCmdOrCtrl(input) {
  if (!input) return false;
  if (input.meta || input.control) return true;
  var mods = modifierSet(input);
  for (var k in META_MODS) if (mods[k]) return true;
  for (var c in CTRL_MODS) if (mods[c]) return true;
  return false;
}

function isReservedShellShortcutInput(input) {
  if (!input || !isShortcutKeyEvent(input.type)) return false;
  if (input.isAutoRepeat) return false;
  if (!hasCmdOrCtrl(input) || input.alt) return false;
  var code = String(input.code || '');
  if (CODE_RE.test(code)) return true;
  var key = String(input.key || '').toLowerCase();
  return KEYS.indexOf(key) !== -1;
}

module.exports = { isReservedShellShortcutInput, hasCmdOrCtrl };
