/**
 * Mi rotación shell — re-exports and modal/control wiring (BN-07).
 */
export {
  CLINICAL_TEAM_SERVICES,
  CLINICAL_SALAS,
  filterJoinedTeams,
  isUserTeamMember,
} from './shared.mjs';

export {
  openClinicalTeamsPanel,
  closeClinicalTeamsPanel,
  wireClinicalTeamsPanelInteractions,
} from './teams-roster.mjs';

export {
  renderCreateTeamForm,
  renderClinicalTeamsPanel,
} from './teams-roster-render.mjs';

export {
  openLanUsersDirectoryModal,
  closeLanUsersDirectoryModal,
} from './teams-roster-lan.mjs';

export { consumeClinicalTeamJoinFromUrl } from './teams-invite.mjs';

import {
  adminCodeModalBackdropEl,
  cancelAdminCodeModal,
  wireAdminCodeModalControls,
} from './shared.mjs';
import { handleJoinWithCodeSubmit } from './teams-invite.mjs';
import {
  closeClinicalTeamsPanel,
  handleAddMemberSubmit,
  handleCreateTeamSubmit,
  handleEditTeamSubmit,
  handleMyCycleSubmit,
  handleProfileFormSubmit,
  openClinicalTeamsPanel,
  refreshTeamsUiAfterChange,
  teamsModalEl,
  wireClinicalTeamsPanelInteractions,
  wireTeamManageModalDelegation,
} from './teams-roster.mjs';
import {
  closeLanUsersDirectoryModal,
  lanUsersModalBackdropEl,
  lanUsersModalBodyEl,
  loadLanUsersDirectoryIntoHost,
  wireLanUsersDirectoryControls,
} from './teams-roster-lan.mjs';

let teamsControlsWired = false;

/** Close button, backdrop click, and form submit delegation — always safe to call. */
export function wireClinicalTeamsModalChrome() {
  const bd = teamsModalEl();
  if (bd) {
    if (!bd._rpcTeamsBackdropClick) {
      bd._rpcTeamsBackdropClick = true;
      bd.addEventListener('click', (ev) => {
        if (ev.target === bd) closeClinicalTeamsPanel();
      });
    }
    if (!bd._rpcTeamsSubmitDelegated) {
      bd._rpcTeamsSubmitDelegated = true;
      bd.addEventListener('submit', (ev) => {
        const form = ev.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (form.id === 'clinical-profile-form') {
          ev.preventDefault();
          void handleProfileFormSubmit(ev);
        } else if (form.id === 'clinical-team-create-form') {
          ev.preventDefault();
          void handleCreateTeamSubmit(ev);
        } else if (form.classList.contains('clinical-teams-add-member-form')) {
          ev.preventDefault();
          void handleAddMemberSubmit(ev, form);
        } else if (form.classList.contains('clinical-teams-my-cycle-form')) {
          ev.preventDefault();
          void handleMyCycleSubmit(ev, form);
        } else if (form.id === 'clinical-team-join-code-form') {
          ev.preventDefault();
          void handleJoinWithCodeSubmit(ev);
        } else if (form.classList.contains('clinical-teams-edit-form')) {
          ev.preventDefault();
          void handleEditTeamSubmit(ev, form);
        }
      });
    }
  }

  const closeBtn = document.getElementById('btn-clinical-teams-close');
  if (closeBtn && !closeBtn._rpcCloseWired) {
    closeBtn._rpcCloseWired = true;
    closeBtn.addEventListener('click', () => closeClinicalTeamsPanel());
  }

  if (!document._rpcClinicalTeamsEscapeWired) {
    document._rpcClinicalTeamsEscapeWired = true;
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      const lanBd = lanUsersModalBackdropEl();
      if (lanBd?.classList.contains('open')) {
        closeLanUsersDirectoryModal();
        return;
      }
      const adminBd = adminCodeModalBackdropEl();
      if (adminBd?.classList.contains('open')) {
        cancelAdminCodeModal();
        return;
      }
      const teamsBd = teamsModalEl();
      if (teamsBd?.classList.contains('open')) closeClinicalTeamsPanel();
    });
  }

  wireLanUsersDirectoryControls();
  wireAdminCodeModalControls();
  wireTeamManageModalDelegation();
}

export function wireClinicalTeamsControls() {
  wireClinicalTeamsModalChrome();
  if (teamsControlsWired) return;
  teamsControlsWired = true;

  import('../clinical-rotation-entry.mjs').then((mod) => {
    mod.wireClinicalRotationEntryControls();
    mod.syncClinicalRotationEntryChrome();
  });

  const openBtn = document.getElementById('btn-guardia-mi-rotacion');
  if (openBtn && !openBtn._rpcTeamsOpenWired) {
    openBtn._rpcTeamsOpenWired = true;
    openBtn.addEventListener('click', () => void openClinicalTeamsPanel());
  }

  if (!document._rpcClinicalTeamsChangedWired) {
    document._rpcClinicalTeamsChangedWired = true;
    document.addEventListener('rpc-clinical-teams-changed', () => {
      void refreshTeamsUiAfterChange();
    });
  }

  if (!document._rpcClinicalOpsSyncedTeamsWired) {
    document._rpcClinicalOpsSyncedTeamsWired = true;
    let opsSyncedTeamsRefreshTimer = null;
    document.addEventListener('rpc-clinical-ops-synced', () => {
      if (opsSyncedTeamsRefreshTimer) clearTimeout(opsSyncedTeamsRefreshTimer);
      opsSyncedTeamsRefreshTimer = setTimeout(() => {
        opsSyncedTeamsRefreshTimer = null;
        void refreshTeamsUiAfterChange();
        const lanBd = lanUsersModalBackdropEl();
        const host = lanUsersModalBodyEl();
        if (lanBd?.classList.contains('open') && host) void loadLanUsersDirectoryIntoHost(host);
      }, 300);
    });
  }
}
