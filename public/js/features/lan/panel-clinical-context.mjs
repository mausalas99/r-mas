/**
 * Clinical session helpers for LAN panel render — extracted from panel.mjs.
 */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { lanClient } from './runtime.mjs';

export function getClinicalSettings() {
  try {
    return JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch {
    return {};
  }
}

export function getClinicalRank() {
  var s = getClinicalSettings();
  return String(s.clinicalRank || '').trim();
}

export function getUserSala() {
  var fromSettings = '';
  var fromUser = '';
  try {
    var s = getClinicalSettings();
    fromSettings = String(s.clinicalSala || '').trim();
  } catch {
    /* ignore */
  }
  try {
    var user = typeof clinicalSessionContext !== 'undefined' ? clinicalSessionContext.user : null;
    fromUser = String(user && user.sala ? user.sala : '').trim();
  } catch {
    /* ignore */
  }
  // SQLCipher profile (Mi rotación) wins over rpc-settings when they diverge.
  if (fromUser) return fromUser;
  return fromSettings;
}

export function isClinicalRegistered() {
  var s = getClinicalSettings();
  return s.clinicalRegistered === true;
}

export function getClinicalUserUserId() {
  try {
    var user = typeof clinicalSessionContext !== 'undefined' ? clinicalSessionContext.user : null;
    return user ? String(user.user_id || '') : '';
  } catch {
    return '';
  }
}

export function isLanHostActive() {
  return !!lanClient.connected;
}
