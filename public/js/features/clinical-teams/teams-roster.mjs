/** Mi rotación submodule. */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  refreshClinicalUserProfile,
} from '../../clinical-access-runtime.mjs';
import {
  isBenignLanPushSkipCode,
  LAN_PROFILE_PUSH_FAILED_MSG,
} from '../../clinical-profile-lan-sync.mjs';
import {
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  formatMemberCycleLabel,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
} from '../../clinico-access.mjs';
import {
  buildClinicalTeamInviteMessage,
  teamInviteCode,
} from '../../clinical-team-invite.mjs';
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { clinicalServiceForSala } from '../../../../lib/clinical-salas.mjs';
import {
  effectiveClinicalRank,
  hasElevatedTeamPrivileges,
  hasProgramAdminPrivileges,
  canViewLanUserDirectory,
  canManageTeamRoster,
  canDeleteLanDirectoryUser,
} from '../../clinical-privileges.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
  shouldClaimClinicalUsername,
} from '../../clinical-username.mjs';
import { syncRotationConfigButton, wireNuevaRotacionControl } from '../clinical-rotation.mjs';
import {
  isClinicalLocalOnlyMode,
  persistClinicalUserBinding,
  readRpcSettings,
} from '../../clinical-settings.mjs';
import { resumeClinicalIdentityByUsername } from '../../clinical-access-runtime.mjs';
import { verifyAdminAccessCode } from '../../../../lib/admin-access-code.mjs';
import {
  ensureClinicalPanelSession,
  getClinicalTeamsPanelHost,
  safeRenderClinicalTeamsPanel,
  setClinicalTeamsPanelError,
  showClinicalTeamsPanelShell,
} from '../clinical-panel-host.mjs';
import { closeModalAnimated } from '../../ui-motion.mjs';
import {
  dbApi,
  toast,
  escapeHtml,
  escapeAttr,
  hintHtml,
  currentUserId,
  filterJoinedTeams,
  CLINICAL_TEAM_SERVICES,
  CLINICAL_SALAS,
  BROWSE_SALA_LS,
  promptAdminAccessCode,
  isAdminAccessGrantedThisSession,
  markAdminAccessGrantedThisSession,
  rememberAdminAccessCode,
  clearAdminAccessGrant,
  getVerifiedAdminAccessCode,
} from './shared.mjs';
import {
  publishClinicalTeamsToLan,
  toastTeamLanPublishResult,
  pullClinicalOpsFromLanRoom,
  resolveLocalUserIdByLanHandle,
} from './teams-guardia-bridge.mjs';

import {
  syncCreateTeamCycleField,
  renderCreateTeamForm,
  renderClinicalTeamsPanel,
  tryReconcileTeamMemberships,
  renderClinicalTeamsPanelInto,
  renderDirectorySectionHtml,
  renderJoinWithCodeSectionHtml,
  resolveBrowseSala,
} from './teams-roster-render.mjs';
export function teamsModalEl() {
  return document.getElementById('clinical-teams-backdrop');
}

function isClinicalTeamsPanelOpen() {
  const bd = teamsModalEl();
  return !!(bd && bd.classList.contains('open'));
}

/** Tras cambios de equipos: actualiza caché y panel si está abierto (sin «Cargando…»). */
export async function refreshTeamsUiAfterChange() {
  const { isLanDirectoryModalOpen } = await import('./teams-roster-lan.mjs');
  if (isLanDirectoryModalOpen()) return;

  const { refreshClinicalPatientListForScope } = await import('../../clinical-access-runtime.mjs');
  await refreshClinicalPatientListForScope({ allowLanPull: false });
  import('../clinical-rotation-entry.mjs').then((m) => m.syncClinicalRotationEntryChrome());
  if (isClinicalTeamsPanelOpen()) {
    await renderClinicalTeamsPanel({ silent: true, skipLanPull: true });
  }
}

/**
 * @param {{ skipProfileGate?: boolean }} [opts]
 *   skipProfileGate — post–Sala tutorial: open join-team UI even if profile onboarding pending.
 */
export async function openClinicalTeamsPanel(opts = {}) {
  const bd = teamsModalEl();
  if (!bd) return;

  showClinicalTeamsPanelShell();

  try {
    const { wireClinicalTeamsModalChrome } = await import('./teams-roster-modal-chrome.mjs');
    wireClinicalTeamsModalChrome();
  } catch (_chrome) {}

  void import('../lan/panel.mjs')
    .then((m) => {
      if (typeof m.stopLanAutoDiscovery === 'function') m.stopLanAutoDiscovery();
    })
    .catch(() => {});

  const sessionOk = await ensureClinicalPanelSession({ interactive: true });
  if (!sessionOk) {
    closeClinicalTeamsPanel();
    const mainMod = await import('../clinical-onboarding-main.mjs');
    const msg = await mainMod.describeOnboardingSessionBlock();
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 'error');
    }
    if (!opts.skipProfileGate && !mainMod.focusMainClinicalOnboarding()) {
      await mainMod.showMainClinicalOnboarding();
    }
    return;
  }

  try {
    if (!opts.skipProfileGate) {
      const { needsClinicalOnboarding } = await import('../clinical-onboarding.mjs');
      if (needsClinicalOnboarding()) {
        closeClinicalTeamsPanel();
        const mainMod = await import('../clinical-onboarding-main.mjs');
        await mainMod.showMainClinicalOnboarding();
        mainMod.focusMainClinicalOnboarding();
        return;
      }
    }
  } catch (err) {
    console.error('[Mi rotación]', err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : 'No se pudo abrir Mi rotación.'
    );
    return;
  }

  try {
    await renderClinicalTeamsPanel();
    const panelBody = getClinicalTeamsPanelHost();
    if (panelBody) panelBody.scrollTop = 0;
  } catch (err) {
    console.error('[Mi rotación]', err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : 'No se pudo abrir Mi rotación.'
    );
  }
}

export function closeClinicalTeamsPanel() {
  const bd = teamsModalEl();
  if (!bd) return;
  closeModalAnimated(bd, function () {
    document.body.classList.remove('clinical-teams-modal-open');
    void import('../lan/panel.mjs')
      .then((m) => {
        if (typeof m.startLanAutoDiscovery === 'function') m.startLanAutoDiscovery();
      })
      .catch(() => {});
  });
}

function closeTeamEditPanels(exceptPanel) {
  document.querySelectorAll('.clinical-teams-edit-panel').forEach((panel) => {
    if (exceptPanel && panel === exceptPanel) return;
    panel.hidden = true;
  });
}

function teamManageDelegationRoot() {
  return (
    document.getElementById('clinical-teams-panel-body') ||
    teamsModalEl()?.querySelector('.clinical-teams-modal') ||
    null
  );
}

export function wireTeamManageModalDelegation() {
  const root = teamManageDelegationRoot();
  if (!root || root._rpcTeamManageDelegated) return;
  root._rpcTeamManageDelegated = true;

  root.addEventListener('click', (ev) => {
    const target = ev.target instanceof Element ? ev.target : null;
    if (!target) return;

    const leaveBtn = target.closest('.clinical-teams-leave-btn');
    if (leaveBtn instanceof HTMLButtonElement) {
      void handleLeaveTeamClick(leaveBtn);
      return;
    }

    if (!canManageTeamRoster(clinicalSessionContext.user)) return;

    const editBtn = target.closest('.clinical-teams-edit-btn');
    if (editBtn) {
      const card = editBtn.closest('.clinical-teams-card');
      const panel = card?.querySelector('.clinical-teams-edit-panel');
      if (panel instanceof HTMLElement) {
        closeTeamEditPanels(panel);
        panel.hidden = !panel.hidden;
      }
      return;
    }

    const cancelBtn = target.closest('.clinical-teams-edit-cancel');
    if (cancelBtn) {
      const panel = cancelBtn.closest('.clinical-teams-edit-panel');
      if (panel instanceof HTMLElement) panel.hidden = true;
      return;
    }

    const deleteBtn = target.closest('.clinical-teams-delete-btn');
    if (deleteBtn instanceof HTMLButtonElement) {
      void handleDeleteTeamClick(deleteBtn);
    }
  });
}

/** @param {HTMLButtonElement} btn */
async function handleLeaveTeamClick(btn) {
  const teamId = String(btn.dataset.teamId || '').trim();
  const teamName = String(btn.dataset.teamName || 'este equipo').trim();
  const userId = currentUserId();
  if (!teamId || !userId) return;

  const ok = window.confirm(
    `¿Salir del equipo «${teamName}»?\n\nDejarás de ver los pacientes asignados a ese equipo en Mi rotación.`
  );
  if (!ok) return;

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberRemove !== 'function') {
    toast('No se pudo salir del equipo.', 'error');
    return;
  }

  btn.disabled = true;
  const res = await api.dbClinicalTeamsMemberRemove({ teamId, userId });
  btn.disabled = false;
  if (!res || res.ok === false) {
    toast(res?.error || 'No se pudo salir del equipo.', 'error');
    return;
  }

  toast('Saliste del equipo.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsToLan();
  await refreshTeamsUiAfterChange();
}

/** @param {HTMLButtonElement} btn */
async function handleDeleteTeamClick(btn) {
  const teamId = String(btn.dataset.teamId || '').trim();
  const teamName = String(btn.dataset.teamName || 'este equipo').trim();
  if (!teamId) return;

  const ok = window.confirm(
    `¿Eliminar el equipo «${teamName}»?\n\nSe quitarán sus integrantes. Esta acción no se puede deshacer.`
  );
  if (!ok) return;

  const userId = currentUserId();
  const api = dbApi();
  if (!userId || !api || typeof api.dbClinicalTeamsArchive !== 'function') {
    toast('No se pudo eliminar el equipo.', 'error');
    return;
  }

  btn.disabled = true;
  const res = await api.dbClinicalTeamsArchive({ teamId, callerUserId: userId });
  btn.disabled = false;

  if (!res || res.ok === false) {
    toast(res?.error || 'No se eliminó el equipo.', 'error');
    return;
  }

  toast('Equipo eliminado.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsToLan();
}

/** @param {Event} ev @param {HTMLFormElement} form */
export async function handleEditTeamSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || '').trim();
  const nameInput = form.querySelector('.clinical-teams-edit-name');
  const salaSelect = form.querySelector('.clinical-teams-edit-sala');
  const name =
    nameInput instanceof HTMLInputElement ? String(nameInput.value || '').trim() : '';
  const sala =
    salaSelect instanceof HTMLSelectElement ? String(salaSelect.value || '').trim() : '';

  if (!teamId || !name || !sala) {
    toast('Indica nombre y sala.', 'error');
    return;
  }

  const userId = currentUserId();
  const api = dbApi();
  if (!userId || !api || typeof api.dbClinicalTeamsUpdate !== 'function') {
    toast('No se pudo guardar el equipo.', 'error');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  const res = await api.dbClinicalTeamsUpdate({
    teamId,
    name,
    sala,
    callerUserId: userId,
  });
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;

  if (!res || res.ok === false) {
    toast(res?.error || 'No se guardó el equipo.', 'error');
    return;
  }

  toast('Equipo actualizado.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsToLan();
}

export async function handleProfileFormSubmit(ev) {
  ev.preventDefault();
  const username = normalizeUsername(
    String(document.getElementById('clinical-profile-username')?.value || '')
  );
  let rank = String(document.getElementById('clinical-profile-rank')?.value || 'R1');
  const sala = String(document.getElementById('clinical-profile-sala')?.value || '');
  const clinicalName = String(document.getElementById('clinical-profile-name')?.value || '').trim();
  const adminCb = document.getElementById('clinical-profile-admin');
  const wantsProgramAdmin = adminCb instanceof HTMLInputElement ? adminCb.checked : false;
  const wasProgramAdmin = hasProgramAdminPrivileges(clinicalSessionContext.user);

  /** @type {boolean|undefined} */
  let isProgramAdmin;
  /** @type {string|null} */
  let adminAccessCode = null;

  if (wantsProgramAdmin !== wasProgramAdmin) {
    isProgramAdmin = wantsProgramAdmin;
    if (wantsProgramAdmin) {
      if (!isAdminAccessGrantedThisSession()) {
        const code = await promptAdminAccessCode();
        if (!code || !verifyAdminAccessCode(code)) {
          if (adminCb instanceof HTMLInputElement) adminCb.checked = wasProgramAdmin;
          if (code != null) toast('Código incorrecto.', 'error');
          return;
        }
        rememberAdminAccessCode(code);
      }
      adminAccessCode = getVerifiedAdminAccessCode();
    }
  }

  if (!isValidUsernameFormat(username)) {
    toast('Usuario inválido. Usa 3–32 caracteres en minúsculas: letras, números y _.', 'error');
    return;
  }
  if (!clinicalName) {
    toast('Escribe tu nombre en guardia.', 'error');
    return;
  }

  const userId = currentUserId();
  const api = dbApi();
  if (!userId || !api) {
    toast('Sesión clínica no disponible. Desbloquea la base de datos.', 'error');
    return;
  }

  const currentUsername = normalizeUsername(clinicalSessionContext.user?.username || '');
  const usernameWillChange = shouldClaimClinicalUsername(
    currentUsername,
    username,
    clientIdFromSettings()
  );
  if (usernameWillChange) {
    const { assertLanRoomForUsernameRegister } = await import('../../clinical-profile-lan-sync.mjs');
    await assertLanRoomForUsernameRegister({ sala });
    if (currentUsername && !isLegacyMachineUsername(currentUsername, clientIdFromSettings())) {
      const ok = window.confirm(
        `¿Cambiar tu usuario de @${currentUsername} a @${username}? Los equipos verán el nuevo nombre.`
      );
      if (!ok) return;
    }
    if (typeof api.dbClinicalUsernameClaim !== 'function') {
      toast('No se pudo guardar el usuario LAN.', 'error');
      return;
    }
    const claimRes = await api.dbClinicalUsernameClaim({ userId, username });
    if (!claimRes?.ok) {
      const errMsg = String(claimRes?.error || '');
      if (/ya está en uso/i.test(errMsg)) {
        let settings = {};
        try {
          settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
        } catch (_e) {}
        const resume =
          window.confirm(
            `El usuario @${username} ya existe.\n\n¿Recuperar tu cuenta en este dispositivo?`
          );
        if (!resume) {
          toast(errMsg, 'error');
          return;
        }
        const resumeRes = await resumeClinicalIdentityByUsername(
          username,
          settings,
          clientIdFromSettings()
        );
        if (!resumeRes.ok) {
          toast(resumeRes.error || errMsg, 'error');
          return;
        }
      } else {
        toast(errMsg || 'No se pudo guardar el usuario.', 'error');
        return;
      }
    }
    if (clinicalSessionContext.user) {
      clinicalSessionContext.user.username = username;
    }
  }

  const ok = await persistProfileFromPanel({
    rank,
    sala,
    clinicalName,
    isProgramAdmin,
    username,
    adminAccessCode,
  });
  if (!ok) return;
  await refreshClinicalUserProfile();
  const msg =
    wantsProgramAdmin && (isProgramAdmin === true || wasProgramAdmin)
      ? 'Perfil guardado. Privilegios de administración activos.'
      : 'Perfil guardado.';
  const { flushClinicalProfileToLan, LAN_PROFILE_PUSH_FAILED_MSG, isBenignLanPushSkipCode } =
    await import('../../clinical-profile-lan-sync.mjs');
  const lanPush = await flushClinicalProfileToLan({ sala });
  if (!lanPush.ok && !isBenignLanPushSkipCode(lanPush.code)) {
    toast(LAN_PROFILE_PUSH_FAILED_MSG, 'warning');
  } else if (usernameWillChange && lanPush.ok) {
    toast(`${msg} @usuario publicado en la sala ⇄.`, 'success');
  } else {
    toast(msg, 'success');
  }
  syncRotationConfigButton();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await refreshTeamsUiAfterChange();
  void import('../lan-sync.mjs')
    .then((mod) => {
      if (typeof mod.pushClinicalOpsLanNow === 'function') void mod.pushClinicalOpsLanNow();
    })
    .catch(() => {});
  void import('../patients.mjs')
    .then((m) => m.renderPatientList())
    .catch(() => {});
}

function clientIdFromSettings() {
  try {
    return String(JSON.parse(localStorage.getItem('rpc-settings') || '{}').clientId || '');
  } catch (_e) {
    return '';
  }
}

async function persistProfileFromPanel({
  rank,
  sala,
  clinicalName,
  isProgramAdmin,
  username,
  adminAccessCode,
}) {
  const userId = currentUserId();
  const api = dbApi();
  if (!userId || !api || typeof api.dbClinicalProfileUpsert !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return false;
  }
  const res = await api.dbClinicalProfileUpsert({
    userId,
    clinicalName: clinicalName || clinicalSessionContext.user?.clinical_name || '',
    rank: rank || effectiveClinicalRank(clinicalSessionContext.user),
    sala: sala ?? clinicalSessionContext.user?.sala ?? null,
    isProgramAdmin,
    adminAccessCode: adminAccessCode ?? undefined,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se guardó el perfil.', 'error');
    return false;
  }
  const settings = readRpcSettings();
  const binding = {
    userId,
    username: username || settings.clinicalUsername,
    displayName: clinicalName || settings.clinicalDisplayName,
    rank: rank || settings.clinicalRank,
    sala: sala ?? settings.clinicalSala,
    isProgramAdmin,
    registered: true,
  };
  if (!isClinicalLocalOnlyMode(settings)) {
    binding.lanProfileGateComplete = true;
  }
  persistClinicalUserBinding(binding);
  if (clinicalSessionContext.user) {
    const savedRank = String(res.profile?.rank || rank || '');
    clinicalSessionContext.user.rank =
      savedRank === 'Admin' ? 'R1' : savedRank || clinicalSessionContext.user.rank;
    if (sala != null) clinicalSessionContext.user.sala = sala;
    if (clinicalName) clinicalSessionContext.user.clinical_name = clinicalName;
    if (res.profile?.username) clinicalSessionContext.user.username = res.profile.username;
    if (isProgramAdmin !== undefined) {
      clinicalSessionContext.user.is_program_admin = isProgramAdmin ? 1 : 0;
    } else if (res.profile?.is_program_admin != null) {
      clinicalSessionContext.user.is_program_admin = res.profile.is_program_admin === 1 ? 1 : 0;
    }
    if (String(res.profile?.rank || '') === 'Admin') {
      clinicalSessionContext.user.is_program_admin = 1;
    }
  }
  return true;
}

/** @param {Event} ev */
export async function handleCreateTeamSubmit(ev) {
  ev.preventDefault();
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsCreate !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return;
  }

  const name = String(document.getElementById('clinical-team-create-name')?.value || '').trim();
  const userId = currentUserId();
  const elevated = canManageTeamRoster(clinicalSessionContext.user);

  if (!name) {
    toast('Indica el nombre del equipo.', 'error');
    return;
  }

  let sala = String(document.getElementById('clinical-team-create-sala')?.value || '').trim();
  if (!sala) {
    sala = String(clinicalSessionContext.user?.sala || '').trim();
  }
  if (!sala) {
    toast('Selecciona la sala del equipo.', 'error');
    return;
  }

  if (elevated) {
    const res = await api.dbClinicalTeamsCreate({
      name,
      service: clinicalServiceForSala(sala) || 'Sala',
      onCallDayIndex: 0,
      sala,
      teamLeaderName: name,
      createdBy: userId,
    });
    if (!res || res.ok === false) {
      toast(res?.error || 'No se creó el equipo.', 'error');
      return;
    }
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
    const lanPush = await publishClinicalTeamsToLan();
    toastTeamLanPublishResult(
      lanPush,
      'Equipo vacío creado. Asigna integrantes desde el directorio LAN.'
    );
    return;
  }

  let service = String(document.getElementById('clinical-team-create-service')?.value || '').trim();
  const mappedService = clinicalServiceForSala(sala);
  if (mappedService && mappedService !== 'Sala') {
    service = mappedService;
  }
  const cycleLetter = String(document.getElementById('clinical-team-create-day')?.value || 'A').trim();

  if (!service) {
    toast('Indica nombre y servicio.', 'error');
    return;
  }

  const res = await api.dbClinicalTeamsCreate({
    name,
    service,
    subAreaFraction: cycleLetter,
    onCallDayIndex: 0,
    sala,
    teamLeaderName: name,
    createdBy: userId,
  });

  if (!res || res.ok === false) {
    toast(res?.error || 'No se creó el equipo.', 'error');
    return;
  }
  const teamId = String(res.team?.team_id || '');
  if (teamId && typeof api.dbClinicalTeamsMemberAdd === 'function') {
    const addRes = await api.dbClinicalTeamsMemberAdd({
      teamId,
      userId,
      subAreaFraction: cycleLetter,
    });
    if (!addRes || addRes.ok === false) {
      toast(addRes?.error || 'Equipo creado pero no se pudo unir automáticamente.', 'error');
    }
  }

  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  const lanPush = await publishClinicalTeamsToLan();
  toastTeamLanPublishResult(lanPush, 'Equipo creado.');
}

/**
 * @param {Event} ev
 * @param {HTMLFormElement} form
 */
export async function handleAddMemberSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || '');
  const usernameInput = form.querySelector('.clinical-teams-add-member-input');
  const username =
    usernameInput instanceof HTMLInputElement
      ? String(usernameInput.value || '').trim()
      : '';
  if (!teamId || !username) {
    toast('Escribe el username del residente.', 'error');
    return;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return;
  }

  const handle = normalizeUsername(username);
  if (!isValidUsernameFormat(handle)) {
    toast('Usuario inválido. Usa 3–32 caracteres: letras minúsculas, números y _ (sin @).', 'error');
    return;
  }

  let partnerUserId = await resolveLocalUserIdByLanHandle(handle);
  if (!partnerUserId) {
    await pullClinicalOpsFromLanRoom({ force: true });
    await fetchClinicalTeamsFromDb();
    partnerUserId = await resolveLocalUserIdByLanHandle(handle);
  }
  if (!partnerUserId) {
    toast(
      `No encontramos a @${handle} en esta Mac. En su R+: Mi rotación → @usuario → Guardar perfil (con la misma sala ⇄). Luego abre Directorio LAN aquí o reintenta.`,
      'error'
    );
    return;
  }

  const cycleEl = form.querySelector('.clinical-teams-add-member-cycle');
  const subAreaFraction =
    cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || '').trim() : '';
  if (!subAreaFraction) {
    toast('Elige el ciclo del integrante.', 'error');
    return;
  }

  const res = await api.dbClinicalTeamsMemberAdd({
    teamId,
    userId: partnerUserId,
    subAreaFraction,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se agregó el miembro.', 'error');
    return;
  }

  toast('Miembro agregado.', 'success');
  if (usernameInput instanceof HTMLInputElement) usernameInput.value = '';
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsToLan();
  await refreshTeamsUiAfterChange();
}

/**
 * @param {Event} ev
 * @param {HTMLFormElement} form
 */
export {
  wireBrowseSalaControl,
  wireJoinButtons,
  wireCopyInviteButtons,
  wireClinicalTeamsPanelInteractions,
  wireRenderedClinicalTeamsPanel,
} from './teams-roster-interactions.mjs';

export async function handleMyCycleSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || '');
  const userId = currentUserId();
  const select = form.querySelector('.clinical-teams-cycle-select');
  const subAreaFraction =
    select instanceof HTMLSelectElement ? String(select.value || '').trim() : '';
  if (!teamId || !userId || !subAreaFraction) {
    toast('Elige tu ciclo.', 'error');
    return;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return;
  }

  const res = await api.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se guardó el ciclo.', 'error');
    return;
  }

  toast('Ciclo actualizado.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsToLan();
  await refreshTeamsUiAfterChange();
}



let teamsControlsWired = false;

/** Close button, backdrop click, and form submit delegation — always safe to call. */
