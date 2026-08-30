import { readRpcSettings } from '../../clinical-settings.mjs';

export const CUTOVER_FLAG_KEY = 'cloudSync79Cutover';

export function getCutoverFlag() {
  const s = readRpcSettings();
  return String(s[CUTOVER_FLAG_KEY] || '');
}

/** @param {'pending' | 'done'} value */
export function setCutoverFlag(value) {
  const s = readRpcSettings();
  s[CUTOVER_FLAG_KEY] = value;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(s));
  } catch (e) {
    console.warn('[cutover-flags] failed to write rpc-settings', e);
  }
}

/** App is on 7.9.x (or cutover already pending from a prior crash). */
export function is79CutoverVersion() {
  const v = String(
    (typeof window !== 'undefined' && window.__RPC_APP_VERSION__) || ''
  ).trim();
  if (getCutoverFlag() === 'pending') return true;
  return /^7\.9(\.|$|-)/.test(v);
}

export function isCutoverPending() {
  return getCutoverFlag() === 'pending';
}

export function isCutoverDone() {
  return getCutoverFlag() === 'done';
}
