/** Mi rotación — create team / add member / cycle form submits. */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
} from '../../clinical-access-runtime.mjs';
import { canManageTeamRoster } from '../../clinical-privileges.mjs';
import {
  isValidUsernameFormat,
  normalizeUsername,
} from '../../clinical-username.mjs';
import { dbApi, toast, currentUserId } from './shared.mjs';
import {
  publishClinicalTeamsAfterChange,
  toastTeamPublishResult,
  pullClinicalOpsFromRoom,
  resolveLocalUserIdByHandle,
} from './teams-guardia-bridge.mjs';
import { refreshTeamsUiAfterChange } from './teams-roster-shell.mjs';
import { closeCreateTeamPanelAfterSuccess } from './teams-roster-panel-draft.mjs';
import { markClinicalEverJoinedTeam } from '../clinical-rotation-rejoin-modal.mjs';

function teamSalaForId(teamId) {
  const team = (clinicalSessionContext.teams || []).find(
    (row) => String(row.team_id) === String(teamId || '')
  );
  return String(team?.sala || clinicalSessionContext.user?.sala || '').trim();
}

function readCreateTeamBasics() {
  const name = String(document.getElementById('clinical-team-create-name')?.value || '').trim();
  let sala = String(document.getElementById('clinical-team-create-sala')?.value || '').trim();
  if (!sala) sala = String(clinicalSessionContext.user?.sala || '').trim();
  return { name, sala, userId: currentUserId() };
}

async function createElevatedTeam(api, { name, sala, userId }) {
  const res = await api.dbClinicalTeamsCreate({
    name,
    service: 'HF',
    onCallDayIndex: 0,
    sala,
    teamLeaderName: name,
    createdBy: userId,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se creó el equipo.', 'error');
    return;
  }
  closeCreateTeamPanelAfterSuccess();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed', { detail: { force: true, sala } }));
  const lanPush = await publishClinicalTeamsAfterChange({ sala });
  toastTeamPublishResult(
    lanPush,
    'Equipo vacío creado. Asigna integrantes desde el directorio de usuarios.'
  );
}

async function autoJoinCreatorToTeam(api, teamId, userId) {
  if (!teamId || typeof api.dbClinicalTeamsMemberAdd !== 'function') return;
  const addRes = await api.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
  });
  if (!addRes || addRes.ok === false) {
    toast(addRes?.error || 'Equipo creado pero no se pudo unir automáticamente.', 'error');
  }
}

async function createStandardTeam(api, { name, sala, userId }) {
  const res = await api.dbClinicalTeamsCreate({
    name,
    service: 'HF',
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
  await autoJoinCreatorToTeam(api, teamId, userId);

  closeCreateTeamPanelAfterSuccess();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed', { detail: { force: true, sala } }));
  const lanPush = await publishClinicalTeamsAfterChange({ sala });
  toastTeamPublishResult(lanPush, 'Equipo creado.');
  if (teamId) {
    markClinicalEverJoinedTeam();
  }
}

/** @param {Event} ev */
export async function handleCreateTeamSubmit(ev) {
  ev.preventDefault();
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsCreate !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return;
  }

  const { name, sala, userId } = readCreateTeamBasics();
  if (!name) {
    toast('Indica el nombre del equipo.', 'error');
    return;
  }
  if (!sala) {
    toast('Selecciona la sala del equipo.', 'error');
    return;
  }

  if (canManageTeamRoster(clinicalSessionContext.user)) {
    await createElevatedTeam(api, { name, sala, userId });
    return;
  }
  await createStandardTeam(api, { name, sala, userId });
}

/**
 * @param {Event} ev
 * @param {HTMLFormElement} form
 */
export async function handleAddMemberSubmit(ev, form) {
  ev.preventDefault();
  const parsed = parseAddMemberForm(form);
  if (!parsed.ok) {
    toast(parsed.error, 'error');
    return;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return;
  }

  const partnerUserId = await resolvePartnerUserIdForAdd(parsed.handle);
  if (!partnerUserId) {
    toast(
      `No encontramos a @${parsed.handle} en esta Mac. En su R+: Mi rotación → @usuario → Guardar perfil (con la misma sala ⇄). Luego abre Directorio LAN aquí o reintenta.`,
      'error'
    );
    return;
  }

  const res = await api.dbClinicalTeamsMemberAdd({
    teamId: parsed.teamId,
    userId: partnerUserId,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se agregó el miembro.', 'error');
    return;
  }

  toast('Miembro agregado.', 'success');
  if (parsed.usernameInput instanceof HTMLInputElement) parsed.usernameInput.value = '';
  const sala = teamSalaForId(parsed.teamId);
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed', { detail: { sala } }));
  await publishClinicalTeamsAfterChange({ sala });
  await refreshTeamsUiAfterChange();
}

function parseAddMemberForm(form) {
  const teamId = String(form.dataset.teamId || '');
  const usernameInput = form.querySelector('.clinical-teams-add-member-input');
  const username =
    usernameInput instanceof HTMLInputElement
      ? String(usernameInput.value || '').trim()
      : '';
  if (!teamId || !username) {
    return { ok: false, error: 'Escribe el username del residente.' };
  }
  const handle = normalizeUsername(username);
  if (!isValidUsernameFormat(handle)) {
    return {
      ok: false,
      error: 'Usuario inválido. Usa 3–32 caracteres: letras minúsculas, números y _ (sin @).',
    };
  }
  return { ok: true, teamId, handle, usernameInput };
}

async function resolvePartnerUserIdForAdd(handle) {
  let partnerUserId = await resolveLocalUserIdByHandle(handle);
  if (partnerUserId) return partnerUserId;
  await pullClinicalOpsFromRoom({ force: true });
  await fetchClinicalTeamsFromDb();
  return resolveLocalUserIdByHandle(handle);
}

