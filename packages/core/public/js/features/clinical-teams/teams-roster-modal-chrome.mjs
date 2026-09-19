/**
 * Modal backdrop/close/submit wiring for Mi rotación.
 * Loaded before openClinicalTeamsPanel; handlers come via dynamic import of teams-roster
 * to avoid roster ↔ render cycles and missing bindings in split chunks.
 */
import {
  adminCodeModalBackdropEl,
  cancelAdminCodeModal,
  wireAdminCodeModalControls,
} from './shared.mjs';
import {
  closeDirectoryUsersModal,
  directoryUsersModalBackdropEl,
  wireDirectoryUsersControls,
} from './teams-roster-users.mjs';
import { wireClinicalTeamsFormDelegation } from './teams-roster-form-delegation.mjs';

function teamsModalBackdrop() {
  return document.getElementById('clinical-teams-backdrop');
}

/** @returns {Promise<typeof import('./teams-roster.mjs')>} */
function loadRoster() {
  return import('./teams-roster.mjs');
}

/** Close button, backdrop click, and form submit delegation — always safe to call. */
export function wireClinicalTeamsModalChrome() {
  const bd = teamsModalBackdrop();
  if (bd) {
    if (!bd._rpcTeamsBackdropClick) {
      bd._rpcTeamsBackdropClick = true;
      bd.addEventListener('click', (ev) => {
        if (ev.target === bd) {
          void loadRoster().then((m) => m.closeClinicalTeamsPanel());
        }
      });
    }
    wireClinicalTeamsFormDelegation(bd);
  }

  const closeBtn = document.getElementById('btn-clinical-teams-close');
  if (closeBtn && !closeBtn._rpcCloseWired) {
    closeBtn._rpcCloseWired = true;
    closeBtn.addEventListener('click', () => {
      void loadRoster().then((m) => m.closeClinicalTeamsPanel());
    });
  }

  if (!document._rpcClinicalTeamsEscapeWired) {
    document._rpcClinicalTeamsEscapeWired = true;
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      const lanBd = directoryUsersModalBackdropEl();
      if (lanBd?.classList.contains('open')) {
        closeDirectoryUsersModal();
        return;
      }
      const adminBd = adminCodeModalBackdropEl();
      if (adminBd?.classList.contains('open')) {
        cancelAdminCodeModal();
        return;
      }
      const teamsBd = teamsModalBackdrop();
      if (teamsBd?.classList.contains('open')) {
        void loadRoster().then((m) => m.closeClinicalTeamsPanel());
      }
    });
  }

  wireDirectoryUsersControls();
  wireAdminCodeModalControls();
  void loadRoster().then((m) => m.wireTeamManageModalDelegation());
}
