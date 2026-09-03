/**
 * Mi rotación shell — re-exports and modal/control wiring (BN-07).
 */
export {
  CLINICAL_TEAM_SERVICES,
  CLINICAL_SALAS,
  filterJoinedTeams,
  isUserTeamMember,
} from './clinical-teams/shared.mjs';

export {
  openClinicalTeamsPanel,
  closeClinicalTeamsPanel,
} from './clinical-teams/teams-roster.mjs';

export { wireClinicalTeamsModalChrome } from './clinical-teams/teams-roster-modal-chrome.mjs';

export { wireClinicalTeamsPanelInteractions } from './clinical-teams/teams-roster-interactions.mjs';

export {
  renderCreateTeamForm,
  renderClinicalTeamsPanel,
} from './clinical-teams/teams-roster-render.mjs';

export {
  openDirectoryUsersModal,
  closeDirectoryUsersModal,
} from './clinical-teams/teams-roster-users.mjs';

export { consumeClinicalTeamJoinFromUrl } from './clinical-teams/teams-invite.mjs';

import { refreshTeamsUiAfterChange } from './clinical-teams/teams-roster.mjs';

let teamsControlsWired = false;

export function wireClinicalTeamsControls() {
  void import('./clinical-teams/teams-roster-modal-chrome.mjs').then((m) => m.wireClinicalTeamsModalChrome());
  if (teamsControlsWired) return;
  teamsControlsWired = true;

  import('./clinical-rotation-entry.mjs').then((mod) => {
    mod.wireClinicalRotationEntryControls();
    mod.syncClinicalRotationEntryChrome();
  });
  void import('./clinical-rotation.mjs').then((mod) => {
    if (typeof mod.wireGuardiaRotationControls === 'function') mod.wireGuardiaRotationControls();
  });

  if (!document._rpcClinicalTeamsChangedWired) {
    document._rpcClinicalTeamsChangedWired = true;
    document.addEventListener('rpc-clinical-teams-changed', (ev) => {
      if (ev.detail?.source === 'cloud-hydrate' && !ev.detail?.force) return;
      void refreshTeamsUiAfterChange({ force: !!ev.detail?.force });
    });
  }

  if (!document._rpcClinicalOpsSyncedTeamsWired) {
    document._rpcClinicalOpsSyncedTeamsWired = true;
    let opsSyncedTeamsRefreshTimer = null;
    document.addEventListener('rpc-clinical-ops-synced', () => {
      if (opsSyncedTeamsRefreshTimer) clearTimeout(opsSyncedTeamsRefreshTimer);
      const delay = document.querySelector(
        '#connection-dropdown.connection-dropdown-modal--equipo'
      )
        ? 1800
        : 300;
      opsSyncedTeamsRefreshTimer = setTimeout(() => {
        opsSyncedTeamsRefreshTimer = null;
        void refreshTeamsUiAfterChange();
      }, delay);
    });
  }
}
