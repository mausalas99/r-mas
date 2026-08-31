/** Mi rotación — team edit/leave/delete delegation. */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { canManageTeamRoster } from '../../clinical-privileges.mjs';
import { getClinicalTeamsPanelHost } from '../clinical-panel-host.mjs';
import { openConfirm } from '../workbench/confirm.mjs';
import { dbApi, toast, currentUserId } from './shared.mjs';
import { publishClinicalTeamsAfterChange } from './teams-guardia-bridge.mjs';
import { refreshTeamsUiAfterChange } from './teams-roster-shell.mjs';

function closeTeamEditPanels(exceptPanel) {
  document.querySelectorAll('.clinical-teams-edit-panel').forEach((panel) => {
    if (exceptPanel && panel === exceptPanel) return;
    panel.hidden = true;
  });
}

function teamManageDelegationRoot() {
  return getClinicalTeamsPanelHost();
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
      return;
    }

    const removeMemberBtn = target.closest('.clinical-teams-member-remove-btn');
    if (removeMemberBtn instanceof HTMLButtonElement) {
      void handleRemoveMemberClick(removeMemberBtn);
    }
  });
}

/** @param {HTMLButtonElement} btn @param {typeof openConfirm} [confirmFn] */
export async function handleRemoveMemberClick(btn, confirmFn = openConfirm) {
  const targetUserId = String(btn.dataset.userId || '').trim();
  const label = String(btn.dataset.userLabel || '').trim() || targetUserId;
  if (!targetUserId) return;

  const result = await confirmFn({
    weight: 'destructive',
    title: `¿Quitar a «${label}» del equipo y de la base clínica en esta Mac?`,
    message: 'Desaparecerá de Integrantes al sincronizar clinicalOps con la sala.',
    confirmLabel: 'Quitar',
    cancelLabel: 'Cancelar',
  });
  if (result !== 'confirm') return;

  const api = dbApi();
  if (!api || typeof api.dbClinicalUserDelete !== 'function') {
    toast('Quitar integrantes requiere R+ de escritorio con base clínica desbloqueada.', 'error');
    return;
  }

  btn.disabled = true;
  const res = await api.dbClinicalUserDelete({
    targetUserId,
    callerUserId: currentUserId(),
  });
  btn.disabled = false;
  if (!res?.ok) {
    toast(res?.error || 'No se pudo quitar el integrante.', 'error');
    return;
  }

  toast('Integrante quitado.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsAfterChange();
  await refreshTeamsUiAfterChange();
}

/** @param {HTMLButtonElement} btn @param {typeof openConfirm} [confirmFn] */
export async function handleLeaveTeamClick(btn, confirmFn = openConfirm) {
  const teamId = String(btn.dataset.teamId || '').trim();
  const teamName = String(btn.dataset.teamName || 'este equipo').trim();
  const userId = currentUserId();
  if (!teamId || !userId) return;

  const result = await confirmFn({
    weight: 'consequence',
    title: `¿Salir del equipo «${teamName}»?`,
    consequenceText: 'Dejarás de ver los pacientes asignados a ese equipo en Mi rotación.',
    confirmLabel: 'Salir',
    cancelLabel: 'Cancelar',
  });
  if (result !== 'confirm') return;

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberRemove !== 'function') {
    toast('No se pudo salir del equipo.', 'error');
    return;
  }

  btn.disabled = true;
  const res = await api.dbClinicalTeamsMemberRemove({ teamId, userId });
  btn.disabled = false;
  if (!res || res.ok === false) {
    toast(String(res?.error || 'No se pudo salir del equipo.'), 'error');
    return;
  }

  toast('Saliste del equipo.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsAfterChange();
  await refreshTeamsUiAfterChange();
}

/** @param {HTMLButtonElement} btn @param {typeof openConfirm} [confirmFn] */
export async function handleDeleteTeamClick(btn, confirmFn = openConfirm) {
  const teamId = String(btn.dataset.teamId || '').trim();
  const teamName = String(btn.dataset.teamName || 'este equipo').trim();
  if (!teamId) return;

  const result = await confirmFn({
    weight: 'destructive',
    title: `¿Eliminar el equipo «${teamName}»?`,
    message: 'Se quitarán sus integrantes. Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
  });
  if (result !== 'confirm') return;

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
  await publishClinicalTeamsAfterChange();
  await refreshTeamsUiAfterChange();
}

/** @param {Event} ev @param {HTMLFormElement} form */
export async function handleEditTeamSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || '').trim();
  const nameInput = form.querySelector('.clinical-teams-edit-name');
  const salaSelect = form.querySelector('.clinical-teams-edit-sala');
  const succeedsSelect = form.querySelector('.clinical-teams-edit-succeeds');
  const name =
    nameInput instanceof HTMLInputElement ? String(nameInput.value || '').trim() : '';
  const sala =
    salaSelect instanceof HTMLSelectElement ? String(salaSelect.value || '').trim() : '';
  const succeedsTeamId =
    succeedsSelect instanceof HTMLSelectElement ? String(succeedsSelect.value || '').trim() : undefined;

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

  await submitTeamEdit(api, { teamId, name, sala, succeedsTeamId, userId, form });
}

async function submitTeamEdit(api, { teamId, name, sala, succeedsTeamId, userId, form }) {
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  const res = await api.dbClinicalTeamsUpdate({
    teamId,
    name,
    sala,
    succeedsTeamId,
    callerUserId: userId,
  });
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;

  if (!res || res.ok === false) {
    toast(res?.error || 'No se guardó el equipo.', 'error');
    return;
  }

  toast('Equipo actualizado.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsAfterChange({ sala });
  await refreshTeamsUiAfterChange();
}
