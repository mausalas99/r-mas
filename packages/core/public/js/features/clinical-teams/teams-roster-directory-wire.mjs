/** LAN directorio control wiring. */
import { getClinicalTeamsPanelHost } from '../clinical-panel-host.mjs';
import {
  LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD,
  directoryRt,
} from './teams-roster-directory-state.mjs';
import {
  directoryUsersModalBackdropEl,
  directoryUsersModalBodyEl,
  isDirectoryModalOpen,
} from './teams-roster-directory-dom.mjs';
import {
  ensureDirectoryFilterDelegation,
  bindDirectoryFilterControls,
} from './teams-roster-directory-filters.mjs';
import {
  openDirectoryUsersModal,
  closeDirectoryUsersModal,
} from './teams-roster-directory-modal.mjs';
import {
  reloadDirectoryUsersPreservingUi,
  refreshDirectoryFromHostUi,
} from './teams-roster-directory-load.mjs';
import {
  syncAssignCycleSelect,
  handleLanDeleteDirectoryUserClick,
  handleLanAssignButtonClick,
} from './teams-roster-directory-assign.mjs';

function wireDirectoryActivityRefresh() {
  if (typeof document === 'undefined' || document._rpcLanDirActivityRefreshWired) return;
  document._rpcLanDirActivityRefreshWired = true;
  document.addEventListener('rpc-clinical-user-activity-touched', () => {
    if (!isDirectoryModalOpen()) return;
    const host = directoryUsersModalBodyEl();
    if (!host?.querySelector('.clinical-directory-rank-groups')) return;
    void reloadDirectoryUsersPreservingUi();
  });
}

function wireDirectoryOpenButtons(panelHost) {
  if (panelHost && !panelHost._rpcLanDirOpenDelegated) {
    panelHost._rpcLanDirOpenDelegated = true;
    panelHost.addEventListener('click', (ev) => {
      const openBtn =
        ev.target instanceof Element
          ? ev.target.closest('#btn-open-lan-users-directory, .clinical-teams-open-lan-users-btn')
          : null;
      if (!openBtn) return;
      ev.preventDefault();
      void openDirectoryUsersModal();
    });
  }

  const openBtn = document.getElementById('btn-open-lan-users-directory');
  if (openBtn && !openBtn._rpcLanDirOpenWired) {
    openBtn._rpcLanDirOpenWired = true;
    openBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      void openDirectoryUsersModal();
    });
  }
}

function wireDirectoryModalChrome() {
  const bd = directoryUsersModalBackdropEl();
  if (bd && !bd._rpcDirectoryUsersBackdropWired) {
    bd._rpcDirectoryUsersBackdropWired = true;
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd) closeDirectoryUsersModal();
    });
  }

  const closeBtn = document.getElementById('btn-clinical-directory-users-close');
  if (closeBtn && !closeBtn._rpcDirectoryUsersCloseWired) {
    closeBtn._rpcDirectoryUsersCloseWired = true;
    closeBtn.addEventListener('click', () => closeDirectoryUsersModal());
  }
}

function wireDirectoryHostInteractions(host) {
  if (!host || host._rpcDirectoryUsersAssignWired) return;
  host._rpcDirectoryUsersAssignWired = true;
  host.addEventListener(
    'toggle',
    (ev) => {
      const details = ev.target;
      if (!(details instanceof HTMLDetailsElement)) return;
      if (!details.classList.contains('clinical-directory-rank-group')) return;
      const key = String(details.dataset.lanRankGroup || '').trim();
      if (!key) return;
      const count = Number(details.dataset.lanRankCount) || 0;
      if (details.open) {
        directoryRt.collapsedRanks.delete(key);
        if (count > LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD) {
          directoryRt.expandedRanks.add(key);
        }
      } else {
        directoryRt.collapsedRanks.add(key);
        directoryRt.expandedRanks.delete(key);
      }
    },
    true
  );
  host.addEventListener('change', (ev) => {
    const teamSelect = ev.target instanceof Element ? ev.target.closest('.clinical-directory-assign-team') : null;
    if (teamSelect) syncAssignCycleSelect(teamSelect);
  });
  host.addEventListener('click', (ev) => {
    const refreshBtn =
      ev.target instanceof Element ? ev.target.closest('.clinical-directory-refresh-btn') : null;
    if (refreshBtn) {
      void refreshDirectoryFromHostUi({ forcePull: true });
      return;
    }
    const delBtn =
      ev.target instanceof Element ? ev.target.closest('.clinical-directory-delete-user-btn') : null;
    if (delBtn) {
      void handleLanDeleteDirectoryUserClick(delBtn);
      return;
    }
    const btn = ev.target instanceof Element ? ev.target.closest('.clinical-directory-assign-btn') : null;
    if (btn) void handleLanAssignButtonClick(btn);
  });
}

export function wireDirectoryUsersControls() {
  wireDirectoryActivityRefresh();
  const panelHost = getClinicalTeamsPanelHost();
  wireDirectoryOpenButtons(panelHost);
  wireDirectoryModalChrome();
  ensureDirectoryFilterDelegation();
  const host = directoryUsersModalBodyEl();
  if (host) bindDirectoryFilterControls(host);
  wireDirectoryHostInteractions(host);
}
