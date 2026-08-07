/**
 * Modal after «Iniciar nueva rotación»: confirm sala + open Mi rotación to join teams.
 * Peers see it when Nube/LAN sync archives teams (joined count drops to 0).
 */
import { clinicalSessionContext, fetchClinicalTeamsFromDb } from '../clinical-access-runtime.mjs';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { isClinicalLocalOnlyMode, readRpcSettings } from '../clinical-settings.mjs';
import { escapeHtml, escapeAttr } from '../dom-escape.mjs';
import { CLINICAL_SALAS, filterJoinedTeams } from './clinical-teams/shared.mjs';

const EVER_JOINED_KEY = 'rpc-clinical-ever-joined-team';
const PENDING_REJOIN_KEY = 'rpc-rotation-rejoin-pending';

let wired = false;
/** @type {number|null} */
let lastJoinedCount = null;

export function markClinicalEverJoinedTeam() {
  try {
    localStorage.setItem(EVER_JOINED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function hasClinicalEverJoinedTeam() {
  try {
    return localStorage.getItem(EVER_JOINED_KEY) === '1';
  } catch {
    return false;
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
 * @param {{ everJoined?: boolean, joinedCount?: number, force?: boolean, localOnly?: boolean, pending?: boolean }} opts
 */
export function shouldOfferRotationRejoin(opts = {}) {
  if (opts.localOnly) return false;
  const joined = Number(opts.joinedCount || 0);
  if (joined > 0) return false;
  if (opts.force) return true;
  if (opts.pending) return true;
  return !!opts.everJoined;
}

export function buildRotationRejoinLeadHtml(user) {
  const elevated = hasElevatedTeamPrivileges(user);
  const sala = String(user?.sala || '').trim();
  if (elevated) {
    return (
      '<p>Se archivaron los equipos del mes anterior' +
      (sala ? ` en <strong>${escapeHtml(sala)}</strong>` : '') +
      '. Confirma tu sala y <strong>crea o publica</strong> los equipos nuevos en Mi rotación para que el resto se una.</p>'
    );
  }
  return (
    '<p>Hay <strong>nueva rotación</strong>: los equipos anteriores ya no están activos' +
    (sala ? ` (sala actual: <strong>${escapeHtml(sala)}</strong>)` : '') +
    '. Confirma tu sala del mes y únete a tu equipo en Mi rotación.</p>'
  );
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
  const current = String(clinicalSessionContext.user?.sala || '').trim();
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
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  const select = document.getElementById('rotation-rejoin-sala');
  if (select instanceof HTMLSelectElement) select.focus();
}

/**
 * @param {{ force?: boolean }} [opts]
 */
export async function maybeShowRotationRejoinModal(opts = {}) {
  if (typeof document === 'undefined') return false;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return false;

  try {
    await fetchClinicalTeamsFromDb();
  } catch {
    /* optional */
  }

  const joinedCount = currentJoinedCount();
  lastJoinedCount = joinedCount;
  if (joinedCount > 0) {
    markClinicalEverJoinedTeam();
    setRotationRejoinPending(false);
    closeRotationRejoinModal();
    return false;
  }

  const offer = shouldOfferRotationRejoin({
    force: !!opts.force,
    joinedCount,
    everJoined: hasClinicalEverJoinedTeam(),
    pending: isRotationRejoinPending(),
    localOnly: false,
  });
  if (!offer) return false;

  setRotationRejoinPending(true);
  openRotationRejoinModal();
  try {
    const main = await import('./clinical-onboarding-main.mjs');
    await main.refreshMainClinicalOnboardingIfNeeded?.();
  } catch {
    /* onboarding optional */
  }
  return true;
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

/**
 * After ops sync / rotation event: detect join-count drop (nueva rotación on peer).
 */
export async function onClinicalOpsMaybeRotationRejoin() {
  try {
    await fetchClinicalTeamsFromDb();
  } catch {
    return;
  }
  const n = currentJoinedCount();
  if (lastJoinedCount == null) {
    lastJoinedCount = n;
    if (n > 0) markClinicalEverJoinedTeam();
    if (n === 0 && (hasClinicalEverJoinedTeam() || isRotationRejoinPending())) {
      await maybeShowRotationRejoinModal();
    }
    return;
  }
  if (lastJoinedCount > 0 && n === 0) {
    setRotationRejoinPending(true);
    lastJoinedCount = 0;
    await maybeShowRotationRejoinModal({ force: true });
    return;
  }
  lastJoinedCount = n;
  if (n > 0) {
    markClinicalEverJoinedTeam();
    setRotationRejoinPending(false);
    closeRotationRejoinModal();
  }
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
    closeRotationRejoinModal();
  });
  document.getElementById('rotation-rejoin-open')?.addEventListener('click', () => {
    void handleOpenMiRotacion();
  });

  document.addEventListener('rpc-guardia-rotation-changed', () => {
    void maybeShowRotationRejoinModal({ force: true });
  });
  document.addEventListener('rpc-clinical-ops-synced', () => {
    void onClinicalOpsMaybeRotationRejoin();
  });
  document.addEventListener('rpc-clinical-teams-changed', () => {
    const n = currentJoinedCount();
    if (n > 0) {
      markClinicalEverJoinedTeam();
      setRotationRejoinPending(false);
      closeRotationRejoinModal();
      lastJoinedCount = n;
    }
  });
}
