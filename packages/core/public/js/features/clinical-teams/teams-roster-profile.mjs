/** Mi rotación — clinical profile form submit from panel. */
import { clinicalSessionContext, refreshClinicalUserProfile } from '../../clinical-access-runtime.mjs';
import {
  isBenignPushSkipCode,
  PROFILE_PUSH_FAILED_MSG,
} from '../../clinical-profile-cloud-stubs.mjs';
import { hasProgramAdminPrivileges } from '../../clinical-privileges.mjs';
import { isCloudSyncActive } from '../cloud-sync/nube-sync-policy.mjs';
import { isCloudSala, normalizeCloudSala } from '../cloud-sync/sala-allowlist.mjs';
import { isValidUsernameFormat, normalizeUsername } from '../../clinical-username.mjs';
import { syncRotationConfigButton } from '../clinical-rotation.mjs';
import {
  toast,
  currentUserId,
  dbApi,
  promptAdminAccessCode,
  isAdminAccessGrantedThisSession,
  getVerifiedAdminAccessCode,
  rememberAdminAccessCode,
} from './shared.mjs';
import { claimClinicalUsernameIfNeeded } from './teams-roster-profile-claim.mjs';
import { persistProfileFromPanel } from './teams-roster-profile-persist.mjs';

function readProfileFormFields() {
  return {
    username: normalizeUsername(
      String(document.getElementById('clinical-profile-username')?.value || '')
    ),
    rank: String(document.getElementById('clinical-profile-rank')?.value || 'R1'),
    sala: String(document.getElementById('clinical-profile-sala')?.value || ''),
    clinicalName: String(document.getElementById('clinical-profile-name')?.value || '').trim(),
    adminCb: document.getElementById('clinical-profile-admin'),
  };
}

async function resolveProgramAdminChange(adminCb, wasProgramAdmin) {
  const wantsProgramAdmin = adminCb instanceof HTMLInputElement ? adminCb.checked : false;
  if (wantsProgramAdmin === wasProgramAdmin) {
    return { isProgramAdmin: undefined, adminAccessCode: null, wantsProgramAdmin, wasProgramAdmin };
  }
  if (!wantsProgramAdmin) {
    return { isProgramAdmin: false, adminAccessCode: null, wantsProgramAdmin, wasProgramAdmin };
  }
  if (!isAdminAccessGrantedThisSession()) {
    const code = await promptAdminAccessCode();
    if (!code) {
      if (adminCb instanceof HTMLInputElement) adminCb.checked = wasProgramAdmin;
      return null;
    }
    rememberAdminAccessCode(code);
  }
  return {
    isProgramAdmin: true,
    adminAccessCode: getVerifiedAdminAccessCode(),
    wantsProgramAdmin,
    wasProgramAdmin,
  };
}

async function toastProfileSaveResult({ msg, usernameWillChange, sala }) {
  const { flushClinicalProfileToCloud } = await import('../../clinical-profile-cloud-stubs.mjs');
  const lanPush = await flushClinicalProfileToCloud({ sala });
  if (!lanPush.ok && !isBenignPushSkipCode(lanPush.code)) {
    toast(PROFILE_PUSH_FAILED_MSG, 'warning');
  } else if (usernameWillChange && lanPush.ok) {
    toast(`${msg} @usuario publicado en la sala ⇄.`, 'success');
  } else {
    toast(msg, 'success');
  }
}

/** Nube sala-room pull/push for `sala`, or null when Nube is off for it. */
async function nubeSalaSync(sala) {
  if (!isCloudSyncActive()) return null;
  const s = normalizeCloudSala(sala || '');
  if (!isCloudSala(s)) return null;
  const mod = await import('../cloud-sync/cloud-clinical-ops-sala.mjs');
  return { sala: s, pull: mod.pullClinicalOpsForSala, push: mod.pushLocalClinicalOpsToSala };
}

const sessionSala = () => String(clinicalSessionContext.user?.sala || '');

/** A new sala means a new Nube room: join it now, so the server matches the profile. */
async function moveNubeRoomIfSalaChanged(prevSala, sala) {
  if (!sala || sala === prevSala) return;
  const [{ isCloudSala }, { getCloudSyncToken }] = await Promise.all([
    import('../cloud-sync/sala-allowlist.mjs'),
    import('../cloud-sync/settings.mjs'),
  ]);
  if (!isCloudSala(sala) || !getCloudSyncToken()) return;
  const { ensureTurnRoomAfterTeamJoin } = await import('../cloud-sync/ensure-turn-room.mjs');
  const room = await ensureTurnRoomAfterTeamJoin(toast);
  if (room && !prevSala) await openTeamsAfterSalaPick();
}

/** First sala pick after a rotation: a resident with no team goes on to pick one. */
async function openTeamsAfterSalaPick() {
  const { needsTeamOnboarding } = await import('../clinical-onboarding-gates.mjs');
  if (!needsTeamOnboarding()) return;
  (await import('../profile-modal.mjs')).closeProfileModal();
  await (await import('./teams-roster-shell.mjs')).openClinicalTeamsPanel();
}

/** Mirror a changed @usuario to the Nube account; local save already succeeded. */
async function renameNubeUsername(changed, username) {
  if (!changed) return;
  const [{ createCloudSyncApi }, { getCloudSyncUrl, getCloudSyncToken }] = await Promise.all([
    import('../cloud-sync/api-client.mjs'),
    import('../cloud-sync/settings.mjs'),
  ]);
  if (!getCloudSyncToken()) return;
  try {
    await createCloudSyncApi({ getBaseUrl: getCloudSyncUrl, getToken: getCloudSyncToken }).changeUsername(username);
  } catch (err) {
    toast(`Usuario cambiado aquí, pero no en Nube: ${err?.message || 'error'}`, 'error');
  }
}

export async function handleProfileFormSubmit(ev) {
  ev.preventDefault();
  const fields = readProfileFormFields();
  const wasProgramAdmin = hasProgramAdminPrivileges(clinicalSessionContext.user);
  const adminChange = await resolveProgramAdminChange(fields.adminCb, wasProgramAdmin);
  if (!adminChange) return;

  if (!isValidUsernameFormat(fields.username)) {
    toast('Usuario inválido. Usa 3–32 caracteres en minúsculas: letras, números y _.', 'error');
    return;
  }
  if (!fields.clinicalName) {
    toast('Escribe tu nombre en guardia.', 'error');
    return;
  }
  if (!currentUserId() || !dbApi()) {
    toast('Sesión clínica no disponible. Desbloquea la base de datos.', 'error');
    return;
  }

  const prevSala = sessionSala();
  const claimResult = await claimClinicalUsernameIfNeeded(fields.username, fields.sala);
  if (claimResult === false) return;
  const usernameWillChange = claimResult === true;

  const nube = await nubeSalaSync(fields.sala);
  await nube?.pull(nube.sala, { since: 0 }).catch(() => null);
  const ok = await persistProfileFromPanel({
    rank: fields.rank,
    sala: fields.sala,
    clinicalName: fields.clinicalName,
    isProgramAdmin: adminChange.isProgramAdmin,
    username: fields.username,
    adminAccessCode: adminChange.adminAccessCode,
  });
  if (!ok) return;
  // Push before anything pulls: a Nube pull lets the room's copy of this user win,
  // so a pull ahead of this push put the old rank back.
  await nube?.push(nube.sala).catch(() => null);

  await renameNubeUsername(usernameWillChange, fields.username);
  await refreshClinicalUserProfile();
  await moveNubeRoomIfSalaChanged(prevSala, fields.sala);
  // Mi perfil hosts this form outside the teams panel, so nothing else redraws
  // it: without this, «Cambiar código de administración» only showed up after
  // reopening Mi perfil.
  const perfilHost = document.querySelector('[data-perfil-clinical-host]');
  const perfilSalaHost = document.querySelector('[data-perfil-sala-host]');
  if (perfilHost?.isConnected && perfilSalaHost?.isConnected) {
    const { mountPerfilClinical } = await import('./teams-roster-interactions.mjs');
    await mountPerfilClinical(perfilSalaHost, perfilHost);
  }
  const msg =
    adminChange.wantsProgramAdmin &&
    (adminChange.isProgramAdmin === true || adminChange.wasProgramAdmin)
      ? 'Perfil guardado. Privilegios de administración activos.'
      : 'Perfil guardado.';
  await toastProfileSaveResult({ msg, usernameWillChange, sala: fields.sala });
  syncRotationConfigButton();
  // Sala must ride the event/push — otherwise switching to a rotation with no
  // local team yet never syncs (push targets only already-known team salas).
  document.dispatchEvent(
    new CustomEvent('rpc-clinical-teams-changed', { detail: { force: true, sala: fields.sala } })
  );
  void import('./teams-guardia-bridge.mjs')
    .then((mod) => mod.publishClinicalTeamsAfterChange({ sala: fields.sala }))
    .catch(() => {});
  void import('../patients.mjs')
    .then((m) => m.renderPatientList())
    .catch(() => {});
}
