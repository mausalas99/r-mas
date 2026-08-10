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
} from './teams-roster.mjs';

export { wireClinicalTeamsModalChrome } from './teams-roster-modal-chrome.mjs';

export { wireClinicalTeamsPanelInteractions } from './teams-roster-interactions.mjs';

export {
  renderCreateTeamForm,
  renderClinicalTeamsPanel,
} from './teams-roster-render.mjs';

export {
  openLanUsersDirectoryModal,
  closeLanUsersDirectoryModal,
} from './teams-roster-lan.mjs';

export { consumeClinicalTeamJoinFromUrl } from './teams-invite.mjs';

import { refreshTeamsUiAfterChange } from './teams-roster.mjs';

let teamsControlsWired = false;

export function wireClinicalTeamsControls() {
  void import('./teams-roster-modal-chrome.mjs').then((m) => m.wireClinicalTeamsModalChrome());
  if (teamsControlsWired) return;
  teamsControlsWired = true;

  import('../clinical-rotation-entry.mjs').then((mod) => {
    mod.wireClinicalRotationEntryControls();
    mod.syncClinicalRotationEntryChrome();
  });
  // Peers need rejoin modal listeners even outside Guardia board (Nube ops sync).
  void import('../clinical-rotation.mjs').then((mod) => {
    if (typeof mod.wireGuardiaRotationControls === 'function') mod.wireGuardiaRotationControls();
  });

  if (!document._rpcClinicalTeamsChangedWired) {
    document._rpcClinicalTeamsChangedWired = true;
    document.addEventListener('rpc-clinical-teams-changed', (ev) => {
      // Cloud hydrate already refreshed session data; re-painting Equipo flashes the sheet.
      if (ev.detail?.source === 'cloud-hydrate' && !ev.detail?.force) return;
      void refreshTeamsUiAfterChange({ force: !!ev.detail?.force });
    });
  }

  if (!document._rpcClinicalOpsSyncedTeamsWired) {
    document._rpcClinicalOpsSyncedTeamsWired = true;
    let opsSyncedTeamsRefreshTimer = null;
    document.addEventListener('rpc-clinical-ops-synced', () => {
      if (opsSyncedTeamsRefreshTimer) clearTimeout(opsSyncedTeamsRefreshTimer);
      // Longer debounce while Equipo is open — silent innerHTML swaps still flicker.
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
