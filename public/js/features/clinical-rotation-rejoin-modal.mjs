/**
 * Modal after R4/Admin «Iniciar nueva rotación» (local) or rotationNuevaAt from Nube sync (peers).
 */
import { clinicalSessionContext, fetchClinicalTeamsFromDb } from '../clinical-access-runtime.mjs';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { isClinicalLocalOnlyMode, readRpcSettings } from '../clinical-settings.mjs';
import { escapeHtml, escapeAttr } from '../dom-escape.mjs';
import { needsProfileOnboarding } from './clinical-onboarding-gates.mjs';
import { CLINICAL_SALAS, filterJoinedTeams } from './clinical-teams/shared.mjs';

const PENDING_REJOIN_KEY = 'rpc-rotation-rejoin-pending';
const EVER_JOINED_KEY = 'rpc-clinical-ever-joined-team';

let wired = false;

export function markClinicalEverJoinedTeam() {
  try {
    localStorage.setItem(EVER_JOINED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function setRotationRejoinPending(pending) {
  try {
    if (pending) localStorage.setItem(PENDING_REJOIN_KEY, '1');
    else localStorage.removeItem(PENDING_REJOIN_KEY);
  } catch {
    /* ignore */
  }
}

export function isRotationRejoinPending() {
  try {
    return localStorage.getItem(PENDING_REJOIN_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * @param {{ joinedCount?: number, pending?: boolean }} opts
 */
export function shouldOfferRotationRejoin(opts = {}) {
  const joined = Number(opts.joinedCount || 0);
  if (joined > 0) return false;
  return !!opts.pending;
}

export function buildRotationRejoinLeadHtml(user) {
  const elevated = hasElevatedTeamPrivileges(user);
  const sala = String(user?.sala || '').trim();
  if (elevated) {
    return (
      '<p>Se archivaron los equipos del mes anterior' +
      (sala ? ` en <strong>${escapeHtml(sala)}</strong>` : '') +
      '. Confirma tu sala y <strong>publica los equipos nuevos</strong> en Mi rotación para que el resto se una.</p>'
    );
  }
  return (
    '<p>Hay <strong>nueva rotación</strong>: los equipos anteriores ya no están activos' +
    (sala ? ` (sala actual: <strong>${escapeHtml(sala)}</strong>)` : '') +
    '. Tu R2 o R4 ya publicó equipos nuevos en Nube — confirma tu sala y <strong>elige el tuyo</strong> en Mi rotación.</p>'
  );
}

function updateRotationRejoinOpenButton() {
  const btn = document.getElementById('rotation-rejoin-open');
  if (!(btn instanceof HTMLButtonElement)) return;
  const elevated = hasElevatedTeamPrivileges(clinicalSessionContext.user);
  btn.textContent = elevated
    ? 'Confirmar sala y abrir Mi rotación'
    : 'Confirmar sala y elegir equipo';
}

function currentJoinedCount() {
  return filterJoinedTeams(clinicalSessionContext.teams || [], clinicalSessionContext.user).length;
}

function backdropEl() {
  return document.getElementById('rotation-rejoin-backdrop');
}

function fillSalaSelect() {
  const select = document.getElementById('rotation-rejoin-sala');
  if (!(select instanceof HTMLSelectElement)) return;
  const settings = readRpcSettings();
  const current = String(
    clinicalSessionContext.user?.sala || settings.clinicalSala || ''
  ).trim();
  select.innerHTML =
    '<option value="">— Seleccionar sala —</option>' +
    CLINICAL_SALAS.map(
      (s) =>
        `<option value="${escapeAttr(s)}"${s === current ? ' selected' : ''}>${escapeHtml(s)}</option>`
    ).join('');
}

function fillLead() {
  const lead = document.getElementById('rotation-rejoin-lead');
  if (lead) lead.innerHTML = buildRotationRejoinLeadHtml(clinicalSessionContext.user);
}

export function closeRotationRejoinModal() {
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

export function openRotationRejoinModal() {
  const bd = backdropEl();
  if (!bd) return;
  fillLead();
  fillSalaSelect();
  updateRotationRejoinOpenButton();
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  const select = document.getElementById('rotation-rejoin-sala');
  if (select instanceof HTMLSelectElement) select.focus();
}

/** Show modal only when R4/Admin (or peer sync) set the pending flag. */
export async function maybeShowRotationRejoinModal() {
  if (typeof document === 'undefined') return false;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return false;
  if (needsProfileOnboarding()) {
    setRotationRejoinPending(false);
    return false;
  }
  if (!isRotationRejoinPending()) return false;

  try {
    await fetchClinicalTeamsFromDb();
  } catch {
    /* optional */
  }

  const joinedCount = currentJoinedCount();
  if (joinedCount > 0) {
    setRotationRejoinPending(false);
    closeRotationRejoinModal();
    return false;
  }

  if (!shouldOfferRotationRejoin({ joinedCount, pending: true })) return false;

  openRotationRejoinModal();
  try {
    const main = await import('./clinical-onboarding-main.mjs');
    await main.refreshMainClinicalOnboardingIfNeeded?.();
  } catch {
    /* onboarding optional */
  }
  return true;
}

/** R4/Admin «Iniciar nueva rotación» or peer after rotationNuevaAt from Nube. */
export async function promptRotationRejoinAfterNuevaRotacion() {
  setRotationRejoinPending(true);
  return maybeShowRotationRejoinModal();
}

async function persistSalaFromModal() {
  const select = document.getElementById('rotation-rejoin-sala');
  const sala = select instanceof HTMLSelectElement ? String(select.value || '').trim() : '';
  if (!sala) return { ok: false, error: 'Elige tu sala.' };
  const { persistProfileFromPanel } = await import('./clinical-teams/teams-roster-profile-persist.mjs');
  const user = clinicalSessionContext.user || {};
  const ok = await persistProfileFromPanel({
    clinicalName: String(user.clinical_name || ''),
    rank: String(user.rank || 'R1'),
    sala,
    username: String(user.username || ''),
  });
  return ok ? { ok: true, sala } : { ok: false, error: 'No se pudo guardar la sala.' };
}

async function handleOpenMiRotacion() {
  const saved = await persistSalaFromModal();
  if (!saved.ok) {
    if (typeof window.showToast === 'function') window.showToast(saved.error || 'Elige tu sala.', 'error');
    return;
  }
  closeRotationRejoinModal();
  const { openClinicalTeamsPanel } = await import('./clinical-teams/teams-roster.mjs');
  await openClinicalTeamsPanel();
}

function onClinicalOpsRotationNuevaSynced(event) {
  const applied = Number(event?.detail?.mergeStats?.rotationNuevaApplied || 0) > 0;
  if (!applied) return;
  void promptRotationRejoinAfterNuevaRotacion();
}

export function wireRotationRejoinModal() {
  if (wired || typeof document === 'undefined') return;
  wired = true;

  const bd = backdropEl();
  if (bd) {
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd) closeRotationRejoinModal();
    });
  }
  document.getElementById('rotation-rejoin-later')?.addEventListener('click', () => {
    setRotationRejoinPending(false);
    closeRotationRejoinModal();
  });
  document.getElementById('rotation-rejoin-open')?.addEventListener('click', () => {
    void handleOpenMiRotacion();
  });

  document.addEventListener('rpc-clinical-ops-synced', onClinicalOpsRotationNuevaSynced);
  document.addEventListener('rpc-clinical-teams-changed', () => {
    if (currentJoinedCount() > 0) {
      setRotationRejoinPending(false);
      closeRotationRejoinModal();
    }
  });
}
