/**
 * Shared Mi rotación panel host + safe render wrapper.
 */
import { isDbMode } from '../db-storage-bridge.mjs';
import {
  bootstrapClinicalAccess,
  clinicalSessionContext,
} from '../clinical-access-runtime.mjs';
import { readRpcSettings, resolveClinicalClientId } from '../clinical-settings.mjs';
import { collectClinicalLsSnapshot } from './db-unlock.mjs';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Panel body inside the visible Mi rotación backdrop. */
export function getClinicalTeamsPanelHost() {
  const bd = document.getElementById('clinical-teams-backdrop');
  if (bd) {
    const scoped = bd.querySelector('#clinical-teams-panel-body');
    if (scoped) return scoped;
  }
  return document.getElementById('clinical-teams-panel-body');
}

export function setClinicalTeamsPanelLoading() {
  const host = getClinicalTeamsPanelHost();
  if (host) {
    host.innerHTML = '<p class="clinical-teams-lead clinical-teams-loading">Cargando…</p>';
  }
}

/** @param {string} message */
export function setClinicalTeamsPanelError(message) {
  const host = getClinicalTeamsPanelHost();
  if (!host) return;
  host.innerHTML = `
    <p class="clinical-registration-error">${escapeHtml(message)}</p>
    <p class="clinical-teams-lead">Cierra este diálogo y vuelve a abrir <strong>Mi rotación</strong>. Si sigue vacío, reinicia R+ por completo (Cmd+Q).</p>`;
}

/**
 * @param {(host: HTMLElement) => Promise<void>} renderFn
 */
export async function safeRenderClinicalTeamsPanel(renderFn) {
  const host = getClinicalTeamsPanelHost();
  if (!host) return;
  setClinicalTeamsPanelLoading();
  try {
    await renderFn(host);
  } catch (err) {
    console.error('[Mi rotación]', err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : 'Error al cargar Mi rotación.'
    );
  }
}

async function tryAutoOpenClinicalDb() {
  if (!isDbMode() || typeof window === 'undefined') return false;
  const api = window.rplusDb || window.electronAPI;
  if (!api || typeof api.dbAutoUnlock !== 'function') return false;
  try {
    const res = await api.dbAutoUnlock({ lsSnapshot: collectClinicalLsSnapshot() });
    return !!(res && res.ok !== false && res.state === 'unlocked');
  } catch (_e) {
    return false;
  }
}

/** Ensure DB clinical session exists before rendering the panel. */
export async function ensureClinicalPanelSession() {
  if (clinicalSessionContext.user?.user_id) return true;
  if (!isDbMode()) return false;
  const settings = readRpcSettings();
  const clientId = resolveClinicalClientId(settings);

  async function attemptSession() {
    if (clinicalSessionContext.user?.user_id) return true;
    await tryAutoOpenClinicalDb();
    if (clinicalSessionContext.user?.user_id) return true;
    const ok = await bootstrapClinicalAccess(settings, clientId);
    return !!(ok && clinicalSessionContext.user?.user_id);
  }

  if (await attemptSession()) return true;

  // Boot may have run bootstrap before main finished ensureUnlocked (common on Windows).
  const { applyClinicalDbUnlockCompletion } = await import('./db-unlock.mjs');
  await applyClinicalDbUnlockCompletion({ refreshOnboarding: false });
  if (clinicalSessionContext.user?.user_id) return true;

  return attemptSession();
}
