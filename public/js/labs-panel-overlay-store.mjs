/**
 * localStorage-backed overlay store for extended lab panel defs.
 */
import { LAB_EXTENDED_PANEL_DEFS } from './labs-panel-defs.mjs';
import { applyOverlayToBuiltins, mergeLabPanelOverlayLww } from './labs-panel-overlay.mjs';

var LS_KEY = 'rpc-lab-panel-overlay';
var memory = null; // null = not loaded; array = authoritative for session/tests

export function loadLabPanelOverlays() {
  if (memory !== null) return memory.slice();
  memory = [];
  try {
    if (typeof localStorage !== 'undefined') {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.overlays)) {
          memory = parsed.overlays.slice();
        }
      }
    }
  } catch { /* ignore */ }
  return memory.slice();
}

export function saveLabPanelOverlays(arr) {
  memory = (arr || []).slice();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_KEY, JSON.stringify({ overlays: memory }));
    }
  } catch { /* ignore */ }
}

export function upsertLabPanelOverlay(record) {
  var next = mergeLabPanelOverlayLww(loadLabPanelOverlays(), [record]);
  saveLabPanelOverlays(next);
  return next;
}

export function getEffectivePanelDefs() {
  return applyOverlayToBuiltins(LAB_EXTENDED_PANEL_DEFS, loadLabPanelOverlays());
}

export function replaceLabPanelOverlayForTests(arr) { memory = (arr || []).slice(); }
export function clearLabPanelOverlayForTests() { memory = null; }
