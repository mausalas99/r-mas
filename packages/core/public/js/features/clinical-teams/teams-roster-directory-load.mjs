/** LAN directorio load, reload, fingerprint, draft preservation. */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { recordClinicalOpsTrace } from '../../clinical-ops-sync.mjs';
import { canDeleteDirectoryUser } from '../../clinical-privileges.mjs';
import { dbApi, escapeHtml, currentUserId } from './shared.mjs';
import { directoryRt, DIRECTORY_IPC_MIN_MS } from './teams-roster-directory-state.mjs';
import {
  directoryUsersModalBackdropEl,
  directoryUsersModalBodyEl,
  isDirectoryModalOpen,
} from './teams-roster-directory-dom.mjs';
import {
  captureDirectoryCollapseState,
  applyDirectoryFilters,
  bindDirectoryFilterControls,
} from './teams-roster-directory-filters.mjs';
import { renderDirectoryUsersModalBodyHtml } from './teams-roster-directory-render.mjs';
import {
  initUserRowAssignState,
  syncAssignCycleSelect,
} from './teams-roster-directory-assign.mjs';

/** @param {object[]} users @param {object[]} teams */
function buildDirectoryFingerprint(users, teams) {
  const userPart = (users || [])
    .map(
      (u) =>
        `${String(u.user_id || '')}\t${String(u.username || '')}\t${String(u.rank || '')}\t${String(u.clinical_name || '')}\t${String(u.sala || '')}\t${String(u.last_activity_at || '')}`
    )
    .sort()
    .join('\n');
  const teamPart = (teams || [])
    .map((t) => {
      const members = (t.members || [])
        .map((m) => `${String(m.user_id || '')}:${String(m.sub_area_fraction || '')}`)
        .sort()
        .join(',');
      return `${String(t.team_id || '')}\t${members}`;
    })
    .sort()
    .join('\n');
  return `${userPart}::${teamPart}`;
}

/** @param {{ forceIpc?: boolean, force?: boolean }} [options] */
export async function reloadDirectoryUsersPreservingUi(options = {}) {
  const host = directoryUsersModalBodyEl();
  if (!host || !isDirectoryModalOpen()) return;
  if (!options.force && isDirectoryUserInteracting()) return;
  directoryRt.lastFingerprint = '';
  captureDirectoryCollapseState(host);
  const draft = captureDirectoryDraftState(host);
  await loadDirectoryUsersIntoHost(host, {
    forceRender: true,
    forceIpc: options.forceIpc !== false,
  });
  restoreDirectoryDraftState(host, draft);
}

/** @param {HTMLElement} host @param {{ forceRender?: boolean, forceIpc?: boolean }} options */
async function fetchDirectoryLists(api, callerUserId) {
  return Promise.all([
    api.dbClinicalUsersList({ callerUserId }),
    typeof api.dbClinicalTeamsList === 'function' ? api.dbClinicalTeamsList() : Promise.resolve(null),
  ]);
}

function shouldSkipDirectoryIpcRefresh(options, host, now) {
  return (
    !options.forceIpc &&
    directoryRt.freezeAutoRefresh &&
    now - directoryRt.ipcLastAt < DIRECTORY_IPC_MIN_MS &&
    host.querySelector('.clinical-directory-rank-groups')
  );
}

function paintDirectoryHost(host, users, sessionUser) {
  host.innerHTML = renderDirectoryUsersModalBodyHtml(users, directoryRt.teams, {
    canDelete: canDeleteDirectoryUser(sessionUser),
    callerUserId: currentUserId(),
  });
  host.querySelectorAll('.clinical-lan-user-row').forEach((row) => initUserRowAssignState(row));
  bindDirectoryFilterControls(host);
  applyDirectoryFilters(host);
  const title = document.getElementById('clinical-directory-users-title');
  const pending = users.filter((u) => u && u.lanDirectoryPending).length;
  recordClinicalOpsTrace('display', {
    directoryCount: users.length,
    lanDirectoryPending: pending,
  });
  if (title) title.textContent = `Directorio de usuarios (${users.length})`;
}

function shouldReuseDirectoryFingerprint(host, fingerprint, options) {
  return (
    !options.forceRender &&
    fingerprint === directoryRt.lastFingerprint &&
    host.querySelector('.clinical-directory-rank-groups')
  );
}

async function loadDirectoryData_(api, callerUserId) {
  const [usersRes, teamsRes] = await fetchDirectoryLists(api, callerUserId);
  return { usersRes, teamsRes };
}

function renderDirectoryLoadError(host, message) {
  host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml(message || 'No se pudo cargar el directorio.')}</p>`;
}

/** @param {HTMLElement} host @param {{ forceRender?: boolean, forceIpc?: boolean }} [options] */
export async function loadDirectoryUsersIntoHost(host, options = {}) {
  const now = Date.now();
  if (shouldSkipDirectoryIpcRefresh(options, host, now)) return;

  const api = dbApi();
  if (!api || typeof api.dbClinicalUsersList !== 'function') {
    renderDirectoryLoadError(
      host,
      'Directorio solo en la app de escritorio R+ (base clínica desbloqueada). En iPad/móvil usa el censo de R+ Cloud; Mi rotación con directorio requiere Mac.'
    );
    return;
  }

  directoryRt.ipcLastAt = now;
  const { usersRes, teamsRes } = await loadDirectoryData_(api, currentUserId());
  if (!usersRes?.ok) {
    renderDirectoryLoadError(host, usersRes?.error);
    return;
  }

  directoryRt.teams = teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [];
  const users = Array.isArray(usersRes.users) ? usersRes.users : [];
  const fingerprint = buildDirectoryFingerprint(users, directoryRt.teams);
  if (shouldReuseDirectoryFingerprint(host, fingerprint, options)) {
    const title = document.getElementById('clinical-directory-users-title');
    if (title) title.textContent = `Directorio de usuarios (${users.length})`;
    applyDirectoryFilters(host);
    return;
  }
  directoryRt.lastFingerprint = fingerprint;
  paintDirectoryHost(host, users, clinicalSessionContext.user || {});
}

function isDirectoryUserInteracting() {
  const bd = directoryUsersModalBackdropEl();
  if (!bd?.classList.contains('open')) return false;
  const active = document.activeElement;
  if (active instanceof HTMLElement && bd.contains(active)) {
    if (
      active.closest(
        '.clinical-directory-assign-team, .clinical-directory-assign-cycle, .clinical-directory-assign-btn, .clinical-directory-delete-user-btn, .clinical-directory-rank-group-summary, .clinical-directory-refresh-btn, .clinical-directory-search, #clinical-directory-status-filter, #clinical-directory-sala-filter, #clinical-directory-activity-filter'
      )
    ) {
      return true;
    }
  }
  if (active instanceof HTMLSelectElement && bd.contains(active)) return true;
  if (
    active instanceof HTMLOptionElement &&
    active.parentElement instanceof HTMLSelectElement &&
    bd.contains(active.parentElement)
  ) {
    return true;
  }
  return false;
}

/** @param {HTMLElement} host */
function captureDirectoryDraftState(host) {
  /** @type {Map<string, { team: string, cycle: string }>} */
  const draft = new Map();
  host.querySelectorAll('.clinical-lan-user-row').forEach((row) => {
    const uid = String(row.dataset.userId || '').trim();
    if (!uid) return;
    const teamEl = row.querySelector('.clinical-directory-assign-team');
    const cycleEl = row.querySelector('.clinical-directory-assign-cycle');
    draft.set(uid, {
      team: teamEl instanceof HTMLSelectElement ? String(teamEl.value || '') : '',
      cycle: cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || '') : '',
    });
  });
  return draft;
}

/** @param {HTMLElement} host @param {Map<string, { team: string, cycle: string }>} draft */
function restoreDirectoryDraftState(host, draft) {
  if (!draft || !draft.size) return;
  host.querySelectorAll('.clinical-lan-user-row').forEach((row) => {
    const uid = String(row.dataset.userId || '').trim();
    const saved = draft.get(uid);
    if (!saved) return;
    const teamSelect = row.querySelector('.clinical-directory-assign-team');
    if (teamSelect instanceof HTMLSelectElement && saved.team) {
      teamSelect.value = saved.team;
      syncAssignCycleSelect(teamSelect, saved.cycle);
      if (saved.cycle) {
        const cycleSelect = row.querySelector('.clinical-directory-assign-cycle');
        if (cycleSelect instanceof HTMLSelectElement) {
          cycleSelect.value = saved.cycle;
        }
      }
    }
  });
}

/** Manual or post-mutation reload; optional directory pull from host. */
export async function refreshDirectoryFromHostUi(options = {}) {
  const host = directoryUsersModalBodyEl();
  if (!host || !isDirectoryModalOpen()) return;
  const btn = host.querySelector('.clinical-directory-refresh-btn');
  if (btn instanceof HTMLButtonElement) btn.disabled = true;
  try {
    if (options.pullFromHost !== false) {
      await pullDirectoryFromHostIfDue({ force: !!options.forcePull });
    }
    await reloadDirectoryUsersPreservingUi({ force: true, forceIpc: true });
  } finally {
    if (btn instanceof HTMLButtonElement) btn.disabled = false;
  }
}

export async function pullDirectoryFromHostIfDue() {
  return false;
}
