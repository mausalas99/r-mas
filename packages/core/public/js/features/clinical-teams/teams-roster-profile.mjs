/** Mi rotación — clinical profile form submit from panel. */
import { clinicalSessionContext, refreshClinicalUserProfile } from '../../clinical-access-runtime.mjs';
import {
  isBenignPushSkipCode,
  PROFILE_PUSH_FAILED_MSG,
} from '../../clinical-profile-cloud-stubs.mjs';
import { effectiveClinicalRank, hasProgramAdminPrivileges } from '../../clinical-privileges.mjs';
import { isCloudSyncActive } from '../cloud-sync/nube-sync-policy.mjs';
import { isCloudSala, normalizeCloudSala } from '../cloud-sync/sala-allowlist.mjs';
import { isValidUsernameFormat, normalizeUsername } from '../../clinical-username.mjs';
import { persistClinicalUserBinding } from '../../clinical-settings.mjs';
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
  return { sala: s, pullClinicalOpsForSala: mod.pullClinicalOpsForSala, pushClinicalOpsForSala: mod.pushClinicalOpsForSala };
}

/**
 * ⇄ Cuenta hosts this form outside the teams panel, so nothing else redraws
 * it: without this, «Cambiar código de administración» only showed up after
 * reopening Cuenta.
 */
async function remountCuentaProfile() {
  const cuentaHost = document.querySelector('[data-cloud-profile-host]');
  if (!cuentaHost?.isConnected) return;
  const { mountClinicalProfileInHost } = await import('./teams-roster-interactions.mjs');
  await mountClinicalProfileInHost(cuentaHost);
}

/**
 * Save, push to Nube, then read the rank back: the session (and the R4-only
 * «Editar» buttons) follow what was really saved, never the picked value.
 * @returns {Promise<boolean|null>} true when it stuck, false when the rank
 *   did not, null when nothing was saved
 */
async function saveProfileAndReadBack(fields, adminChange) {
  const nube = await nubeSalaSync(fields.sala);
  await nube?.pullClinicalOpsForSala(nube.sala, { since: 0 }).catch(() => null);
  const ok = await persistProfileFromPanel({
    rank: fields.rank,
    sala: fields.sala,
    clinicalName: fields.clinicalName,
    isProgramAdmin: adminChange.isProgramAdmin,
    username: fields.username,
    adminAccessCode: adminChange.adminAccessCode,
  });
  if (!ok) return null;
  // Push before anything pulls: every Nube pull lets the room's copy of this
  // user win, so a pull ahead of this push put the old rank back.
  // ponytail: a background sync cycle landing between the save and this push
  // can still undo it; the read-back below then says so instead of «guardado».
  await nube?.pushClinicalOpsForSala(nube.sala).catch(() => null);

  await refreshClinicalUserProfile();
  const savedRank = effectiveClinicalRank(clinicalSessionContext.user);
  if (savedRank !== fields.rank) {
    persistClinicalUserBinding({ rank: savedRank });
    toast(`No se guardó el rango: sigues como ${savedRank}.`, 'error');
    return false;
  }
  return true;
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

  const claimResult = await claimClinicalUsernameIfNeeded(fields.username, fields.sala);
  if (claimResult === false) return;
  const usernameWillChange = claimResult === true;

  const saved = await saveProfileAndReadBack(fields, adminChange);
  if (saved === null) return;
  await remountCuentaProfile();
  if (!saved) return;
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
