/**
 * Form submit delegation for Mi rotación — modal backdrop or ⇄ Equipo embed root.
 */
import { handleJoinWithCodeSubmit } from './teams-invite.mjs';

/** @type {WeakSet<HTMLElement>} */
const wiredRoots = new WeakSet();

/** @returns {Promise<typeof import('./teams-roster.mjs')>} */
function loadRoster() {
  return import('./teams-roster.mjs');
}

/** @param {HTMLElement | null | undefined} root */
export function wireClinicalTeamsFormDelegation(root) {
  if (!root || wiredRoots.has(root)) return;
  wiredRoots.add(root);
  root.addEventListener('submit', function (ev) {
    const form = ev.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id === 'clinical-profile-form') {
      ev.preventDefault();
      void loadRoster().then(function (m) {
        return m.handleProfileFormSubmit(ev);
      });
    } else if (form.id === 'clinical-team-create-form') {
      ev.preventDefault();
      void loadRoster().then(function (m) {
        return m.handleCreateTeamSubmit(ev);
      });
    } else if (form.classList.contains('clinical-teams-add-member-form')) {
      ev.preventDefault();
      void loadRoster().then(function (m) {
        return m.handleAddMemberSubmit(ev, form);
      });
    } else if (form.classList.contains('clinical-teams-my-cycle-form')) {
      ev.preventDefault();
      void loadRoster().then(function (m) {
        return m.handleMyCycleSubmit(ev, form);
      });
    } else if (form.id === 'clinical-team-join-code-form') {
      ev.preventDefault();
      void handleJoinWithCodeSubmit(ev);
    } else if (form.classList.contains('clinical-teams-edit-form')) {
      ev.preventDefault();
      void loadRoster().then(function (m) {
        return m.handleEditTeamSubmit(ev, form);
      });
    }
  });
}
