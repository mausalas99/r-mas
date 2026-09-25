/**
 * Clinical session helpers for Conexión / Nube (formerly features/lan/panel-clinical-context).
 */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';

export function getClinicalSettings() {
  try {
    return JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch {
    return {};
  }
}

export function getClinicalRank() {
  const s = getClinicalSettings();
  return String(s.clinicalRank || '').trim();
}

export function getUserSala() {
  let fromSettings = '';
  let fromUser = '';
  try {
    const s = getClinicalSettings();
    fromSettings = String(s.clinicalSala || '').trim();
  } catch {
    /* ignore */
  }
  try {
    const user = typeof clinicalSessionContext !== 'undefined' ? clinicalSessionContext.user : null;
    fromUser = String(user && user.sala ? user.sala : '').trim();
  } catch {
    /* ignore */
  }
  if (fromUser) return fromUser;
  return fromSettings;
}

export function isClinicalRegistered() {
  const s = getClinicalSettings();
  return s.clinicalRegistered === true;
}

export function getClinicalUserUserId() {
  try {
    const user = typeof clinicalSessionContext !== 'undefined' ? clinicalSessionContext.user : null;
    return user ? String(user.user_id || '') : '';
  } catch {
    return '';
  }
}
