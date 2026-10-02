/**
 * Post-render DOM wiring for Mi rotación (no import from teams-roster.mjs).
 * Loaded dynamically from teams-roster-render after innerHTML is set.
 */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import {
  buildClinicalTeamInviteMessage,
} from '../../clinical-team-invite.mjs';
import { copyToClipboardSafe } from '../soap-estado.mjs';
import {
  hasProgramAdminPrivileges,
  effectiveClinicalRank,
} from '../../clinical-privileges.mjs';
import { inferMembershipCycleForJoin } from '../../clinico-access.mjs';
import { validateTeamRankSlot } from '../../../../lib/clinical-team-composition.mjs';
import { publishClinicalTeamsAfterChange } from './teams-guardia-bridge.mjs';
import { markClinicalEverJoinedTeam } from '../clinical-rotation-rejoin-modal.mjs';
import {
  toast,
  dbApi,
  currentUserId,
  toastTeamWarnings,
  BROWSE_SALA_LS,
  promptAdminAccessCode,
  openChangeAdminCodeModal,
  isAdminAccessGrantedThisSession,
  markAdminAccessGrantedThisSession,
  rememberAdminAccessCode,
  clearAdminAccessGrant,
  writeClinicalTeamsCollapseOpen,
  filterJoinedTeams,
} from './shared.mjs';
import { getClinicalTeamsPanelHost } from '../clinical-panel-host.mjs';
import {
  resolveClinicalTeamsPanelContext,
  buildPerfilSalaHtml,
  buildPerfilAccountHtml,
} from './teams-roster-panel-build.mjs';
import { wireTeamManageModalDelegation } from './teams-roster-manage.mjs';
import {
  syncCreateTeamCycleField,
  syncCreateTeamServiceFromSala,
  renderClinicalTeamsPanel,
} from './teams-roster-render.mjs';

function toastJoinSlotWarnings(team, rank) {
  const slotWarn = validateTeamRankSlot(team?.service || '', rank, team?.members || []);
  if (slotWarn) toast(slotWarn, 'warn');
  else if (team?.joinWarning) toast(String(team.joinWarning), 'warn');
}

/** @param {string} teamId */
export async function joinClinicalTeamByButton(teamId) {
  const userId = currentUserId();
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsJoin !== 'function') {
    toast('No se pudo unir al equipo.', 'error');
    return;
  }
  const team = (clinicalSessionContext.teams || []).find((t) => String(t.team_id) === teamId);
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const cycle = inferMembershipCycleForJoin(team || {}, rank);
  toastJoinSlotWarnings(team, rank);

  const res = await api.dbClinicalTeamsJoin({ teamId, userId, subAreaFraction: cycle });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se pudo unir al equipo.', 'error');
    return;
  }
  toastTeamWarnings(res.warnings);
  toast('Te uniste al equipo.', 'success');
  markClinicalEverJoinedTeam();
  const sala = String(team?.sala || clinicalSessionContext.user?.sala || '').trim();
  const { closeTeamsUiAfterJoin, refreshTeamsUiAfterChange } = await import('./teams-roster-shell.mjs');
  const { fetchClinicalTeamsFromDb } = await import('../../clinical-access-runtime.mjs');
  await fetchClinicalTeamsFromDb();
  closeTeamsUiAfterJoin();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed', { detail: { sala } }));
  await publishClinicalTeamsAfterChange({ sala });
  void import('../cloud-sync/ensure-turn-room.mjs').then(({ ensureTurnRoomAfterTeamJoin }) =>
    ensureTurnRoomAfterTeamJoin(toast)
  );
  await refreshTeamsUiAfterChange();
}

function syncSalaFieldVisibility() {
  syncCreateTeamServiceFromSala();
}

function wireAdminCheckboxGate() {
  const cb = document.getElementById('clinical-profile-admin');
  if (!(cb instanceof HTMLInputElement) || cb._rpcAdminGateWired) return;
  cb._rpcAdminGateWired = true;

  const hadAdminOnLoad =
    cb.checked || hasProgramAdminPrivileges(clinicalSessionContext.user);
  if (hadAdminOnLoad) {
    markAdminAccessGrantedThisSession();
  }

  // A checkbox is already toggled when click listeners run: checked here means
  // the user is turning admin ON (ask for the code), unchecked means OFF.
  cb.addEventListener('click', (ev) => {
    if (!cb.checked) {
      clearAdminAccessGrant();
      return;
    }
    if (isAdminAccessGrantedThisSession()) return;

    ev.preventDefault();
    void promptAdminAccessCode().then((code) => {
      if (code) {
        cb.checked = true;
        rememberAdminAccessCode(code);
        return;
      }
      cb.checked = false;
    });
  });
}

/** «Crear equipo» and «Tengo un código» each open their form in a native <dialog>. */
function wireTeamDialogs() {
  for (const [btnId, dialogId] of [
    ['btn-clinical-team-create-open', 'clinical-team-create-panel'],
    ['btn-clinical-team-join-code-open', 'clinical-team-join-code-dialog'],
  ]) {
    const openBtn = document.getElementById(btnId);
    const dialog = document.getElementById(dialogId);
    if (!(openBtn instanceof HTMLButtonElement) || !(dialog instanceof HTMLDialogElement)) continue;
    if (openBtn._rpcDialogWired) continue;
    openBtn._rpcDialogWired = true;
    openBtn.addEventListener('click', () => {
      if (dialogId === 'clinical-team-create-panel') syncCreateTeamServiceFromSala();
      dialog.showModal();
    });
    dialog.querySelectorAll('.clinical-teams-create-cancel').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });
  }
}

/** Admin switch gate and «Cambiar código» for the profile form, wherever it is shown. */
function wireProfileFormControls() {
  wireAdminCheckboxGate();
  const changeCodeBtn = document.getElementById('btn-clinical-admin-code-change');
  if (changeCodeBtn && !changeCodeBtn._rpcWired) {
    changeCodeBtn._rpcWired = true;
    changeCodeBtn.addEventListener('click', () => void openChangeAdminCodeModal());
  }
}

/**
 * Mi perfil window: Sala chips and the account cards. Submit goes through the
 * root's form delegation.
 * @param {HTMLElement | null} salaHost @param {HTMLElement | null} accountHost
 */
export async function mountPerfilClinical(salaHost, accountHost) {
  if (!(salaHost instanceof HTMLElement) || !(accountHost instanceof HTMLElement)) return;
  const user = clinicalSessionContext.user;
  if (!user || !currentUserId()) {
    salaHost.innerHTML = '';
    accountHost.innerHTML = '';
    return;
  }
  const ctx = await resolveClinicalTeamsPanelContext(user, filterJoinedTeams(clinicalSessionContext.teams, user));
  salaHost.innerHTML = buildPerfilSalaHtml(ctx);
  accountHost.innerHTML = buildPerfilAccountHtml(ctx, user);
  wireProfileFormControls();
}

export function wireClinicalTeamsPanelInteractions() {
  syncSalaFieldVisibility();
  wireTeamDialogs();
  wireProfileFormControls();

  const salaSelect = document.getElementById('clinical-team-create-sala');
  if (salaSelect && !salaSelect._rpcSalaWired) {
    salaSelect._rpcSalaWired = true;
    salaSelect.addEventListener('change', () => syncCreateTeamServiceFromSala());
  }

  const serviceSelect = document.getElementById('clinical-team-create-service');
  if (serviceSelect && !serviceSelect._rpcServiceWired) {
    serviceSelect._rpcServiceWired = true;
    serviceSelect.addEventListener('change', () => syncCreateTeamCycleField());
  }

  const r1LineSelect = document.getElementById('clinical-team-create-r1-line');
  if (r1LineSelect && !r1LineSelect._rpcR1LineWired) {
    r1LineSelect._rpcR1LineWired = true;
    r1LineSelect.addEventListener('change', () => syncCreateTeamCycleField());
  }
}

export function wireBrowseSalaControl(elevated) {
  if (!elevated) return;
  const select = document.getElementById('clinical-browse-sala');
  if (!select || select._rpcBrowseWired) return;
  select._rpcBrowseWired = true;
  select.addEventListener('change', () => {
    try {
      localStorage.setItem(BROWSE_SALA_LS, String(select.value || ''));
    } catch (e) { console.warn("[teams-roster-interactions] failed to write " + BROWSE_SALA_LS, e); }
    void renderClinicalTeamsPanel({ silent: true, skipLanPull: true, preserveDraft: true });
  });
}

export function wireJoinButtons() {
  document.querySelectorAll('.clinical-teams-join-btn').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcJoinWired) return;
    btn._rpcJoinWired = true;
    btn.addEventListener('click', async () => {
      await joinClinicalTeamByButton(String(btn.dataset.teamId || ''));
    });
  });
}

export function wireInheritPatientsButtons() {
  document.querySelectorAll('.clinical-teams-inherit-btn').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcInheritWired) return;
    btn._rpcInheritWired = true;
    btn.addEventListener('click', async () => {
      const teamId = String(btn.dataset.teamId || '');
      const teamName = String(btn.dataset.teamName || '');
      const { openInheritPatientsModal, wireInheritPatientsModal } = await import(
        './teams-roster-inherit-patients-modal.mjs'
      );
      wireInheritPatientsModal();
      const res = await openInheritPatientsModal({ teamId, teamName });
      if (res && res.offered === false) {
        toast('No hay pacientes locales del mes anterior para heredar.', 'info');
      }
    });
  });
}

export function wireCopyInviteButtons() {
  document.querySelectorAll('.clinical-teams-copy-invite-btn').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcInviteWired) return;
    btn._rpcInviteWired = true;
    btn.addEventListener('click', () => {
      const teamId = String(btn.dataset.teamId || '');
      const team = (clinicalSessionContext.teams || []).find(
        (t) => String(t.team_id) === teamId
      );
      if (!team) {
        toast('Equipo no encontrado.', 'error');
        return;
      }
      const text = buildClinicalTeamInviteMessage(team);
      void copyToClipboardSafe(text).then((ok) => {
        toast(
          ok ? 'Invitación copiada. Pégala en WhatsApp o correo.' : 'No se pudo copiar.',
          ok ? 'success' : 'error'
        );
      });
    });
  });
}

function wireClinicalTeamsCollapsePersistence() {
  const host = getClinicalTeamsPanelHost();
  if (!host) return;
  host.querySelectorAll('details.clinical-teams-collapse[data-collapse-key]').forEach((el) => {
    if (!(el instanceof HTMLDetailsElement) || el._rpcCollapseWired) return;
    el._rpcCollapseWired = true;
    el.addEventListener('toggle', () => {
      const key = String(el.dataset.collapseKey || '').trim();
      if (!key) return;
      writeClinicalTeamsCollapseOpen(key, el.open);
    });
  });
}

/** Called from render after panel HTML is injected (dynamic import avoids render↔roster cycle). */
export function wireRenderedClinicalTeamsPanel(elevated) {
  wireTeamManageModalDelegation();
  wireClinicalTeamsPanelInteractions();
  wireJoinButtons();
  wireInheritPatientsButtons();
  wireCopyInviteButtons();
  wireBrowseSalaControl(elevated);
  wireClinicalTeamsCollapsePersistence();
}
