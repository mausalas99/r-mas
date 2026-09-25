/**
 * Opportunistic update checks: no toast unless the user asked from Ajustes.
 * Boot / Actualizar labs / patient select share a throttle so GitHub is not hammered.
 */
import { updaterState } from './state.mjs';

export var SILENT_UPDATE_CHECK_MIN_MS = 30 * 60 * 1000;

var lastSilentCheckAt = 0;

/**
 * @param {number} now
 * @param {number} lastAt
 * @param {number} [minMs]
 */
export function shouldRunSilentUpdateCheck(now, lastAt, minMs) {
  var min = minMs == null ? SILENT_UPDATE_CHECK_MIN_MS : minMs;
  if (!lastAt) return true;
  return now - lastAt >= min;
}

/**
 * @param {{ pendingRepairUpdateCheck?: boolean, checkFeedback?: boolean }} state
 * @param {{ reinstallFailed?: boolean } | null | undefined} payload
 * @returns {'repair-error' | 'up-to-date' | null}
 */
export function updateNotAvailableToastKind(state, payload) {
  if ((state && state.pendingRepairUpdateCheck) || (payload && payload.reinstallFailed)) {
    return 'repair-error';
  }
  if (state && state.checkFeedback) return 'up-to-date';
  return null;
}

/**
 * @param {{ checkFeedback?: boolean, pendingRepairUpdateCheck?: boolean, updateModalMode?: string }} state
 */
export function shouldSurfaceUpdateCheckError(state) {
  if (!state) return false;
  if (state.checkFeedback) return true;
  if (state.pendingRepairUpdateCheck) return true;
  return state.updateModalMode === 'downgrade';
}

export function requestSilentUpdateCheck() {
  if (typeof window === 'undefined' || !window.electronAPI) return false;
  if (typeof window.electronAPI.checkForUpdates !== 'function') return false;
  var now = Date.now();
  if (!shouldRunSilentUpdateCheck(now, lastSilentCheckAt)) return false;
  lastSilentCheckAt = now;
  updaterState.checkFeedback = false;
  try {
    window.electronAPI.checkForUpdates();
    return true;
  } catch {
    return false;
  }
}

/** @visibleForTesting */
export function resetSilentUpdateCheckForTests() {
  lastSilentCheckAt = 0;
}
