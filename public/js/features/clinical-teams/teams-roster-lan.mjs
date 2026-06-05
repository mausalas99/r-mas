/** Mi rotación submodule. */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  refreshClinicalUserProfile,
} from '../../clinical-access-runtime.mjs';
import {
  isBenignLanPushSkipCode,
  LAN_PROFILE_PUSH_FAILED_MSG,
} from '../../clinical-profile-lan-sync.mjs';
import {
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  formatMemberCycleLabel,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
} from '../../clinico-access.mjs';
import {
  buildClinicalTeamInviteMessage,
  teamInviteCode,
} from '../../clinical-team-invite.mjs';
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { recordClinicalOpsTrace } from '../../lan-sync-diagnostics.mjs';
import {
  effectiveClinicalRank,
  hasElevatedTeamPrivileges,
  hasProgramAdminPrivileges,
  canViewLanUserDirectory,
  canManageTeamRoster,
  canDeleteLanDirectoryUser,
} from '../../clinical-privileges.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../../clinical-username.mjs';
import { syncRotationConfigButton, wireNuevaRotacionControl } from '../clinical-rotation.mjs';
import { persistClinicalUserBinding, readRpcSettings } from '../../clinical-settings.mjs';
import { resumeClinicalIdentityByUsername } from '../../clinical-access-runtime.mjs';
import { verifyAdminAccessCode } from '../../../../lib/admin-access-code.mjs';
import {
  ensureClinicalPanelSession,
  getClinicalTeamsPanelHost,
  safeRenderClinicalTeamsPanel,
  setClinicalTeamsPanelError,
} from '../clinical-panel-host.mjs';
import {
  dbApi,
  toast,
  escapeHtml,
  escapeAttr,
  hintHtml,
  currentUserId,
  filterJoinedTeams,
  CLINICAL_TEAM_SERVICES,
  CLINICAL_SALAS,
  BROWSE_SALA_LS,
  promptAdminAccessCode,
} from './shared.mjs';
import {
  publishClinicalTeamsToLan,
  toastTeamLanPublishResult,
  pullClinicalOpsFromLanRoom,
  resolveLocalUserIdByLanHandle,
} from './teams-guardia-bridge.mjs';


export function renderLanUsersDirectoryEntryHtml(user) {
  if (!canViewLanUserDirectory(user)) return '';
  return `
    <div class="clinical-teams-lan-users-entry">
      <button type="button" class="btn-med-secondary clinical-teams-open-lan-users-btn" id="btn-open-lan-users-directory">
        Abrir directorio de usuarios LAN
      </button>
      <p class="clinical-teams-section-desc">Crea equipos vacíos y asigna integrantes desde aquí (ventana aparte).</p>
    </div>`;
}

export function lanUsersModalBackdropEl() {
  return document.getElementById('clinical-lan-users-backdrop');
}

export function lanUsersModalBodyEl() {
  return document.getElementById('clinical-lan-users-panel-body');
}

/** @type {object[]} */
let _lanUsersModalTeams = [];

function cycleLettersForAssign(team, userRank) {
  const service = String(team?.service || 'Sala');
  const rank = String(userRank || 'R1');
  const svcKey = service.trim().toLowerCase();
  if (svcKey.includes('sala') && rank === 'R2') {
    return getCycleLettersForTeamCreate('Sala', 'R2');
  }
  if (svcKey.includes('sala') && rank === 'R1') {
    return [
      ...getCycleLettersForTeamCreate('Sala', 'R1', 0),
      ...getCycleLettersForTeamCreate('Sala', 'R1', 1),
    ];
  }
  return getCycleLettersForTeamCreate(service, rank);
}

function renderLanAssignTeamOptionsHtml(teams, selectedTeamId) {
  const list = Array.isArray(teams) ? teams : [];
  const selected = String(selectedTeamId || '').trim();
  if (!list.length) {
    return '<option value="">— Sin equipos —</option>';
  }
  return (
    '<option value="">— Equipo —</option>' +
    list
      .map((team) => {
        const id = escapeAttr(String(team.team_id || ''));
        const label = escapeHtml(
          `${String(team.name || 'Equipo').trim()} · ${String(team.sala || '').trim() || 'Sala'}`
        );
        const members = Array.isArray(team.members) ? team.members.length : 0;
        const isSelected = selected && id === selected ? ' selected' : '';
        return `<option value="${id}"${isSelected}>${label} (${members})</option>`;
      })
      .join('')
  );
}

/** @param {string} userId @param {object[]} teams */
function resolveLanUserPlacement(userId, teams) {
  const uid = String(userId || '').trim();
  if (!uid) return null;
  for (const team of teams || []) {
    const member = (team.members || []).find((m) => String(m.user_id || '') === uid);
    if (!member) continue;
    return {
      teamId: String(team.team_id || ''),
      teamName: String(team.name || 'Equipo').trim(),
      teamSala: String(team.sala || '').trim(),
      cycle: String(member.sub_area_fraction || '').trim(),
      rank: String(member.rank || ''),
    };
  }
  return null;
}

/** @param {ReturnType<typeof resolveLanUserPlacement>} placement @param {string} userRank */
function formatLanUserPlacementLabel(placement, userRank) {
  if (!placement?.teamId) return 'Sin equipo asignado';
  const parts = [placement.teamName || 'Equipo'];
  if (placement.teamSala) parts.push(placement.teamSala);
  if (placement.cycle) {
    parts.push(formatLanCycleOptionLabel(placement.cycle, userRank || placement.rank));
  }
  return parts.join(' · ');
}

const LAN_USER_RANK_ORDER = ['R1', 'R2', 'R3', 'R4', 'Admin'];

/** @param {object[]} users */
function groupLanUsersByRank(users) {
  /** @type {Map<string, object[]>} */
  const groups = new Map(LAN_USER_RANK_ORDER.map((rank) => [rank, []]));
  /** @type {object[]} */
  const other = [];
  for (const user of users) {
    const rank = String(user?.rank || 'R1');
    if (groups.has(rank)) groups.get(rank).push(user);
    else other.push(user);
  }
  return { groups, other };
}

/** @param {string} letter @param {string} userRank */
function formatLanCycleOptionLabel(letter, userRank) {
  const frac = String(letter || '').trim();
  if (!frac) return '— Ciclo —';
  const rank = String(userRank || 'R1');
  if (rank === 'R2' || /^[A-F]$/i.test(frac)) return `Ciclo R2 · ${frac}`;
  if (rank === 'R1' || /[12]$/i.test(frac)) return `Subciclo R1 · ${frac}`;
  return `Ciclo · ${frac}`;
}

/** @param {object} u @param {object[]} teamList @param {{ canDelete?: boolean, callerUserId?: string }} [opts] */
function renderLanUserRowHtml(u, teamList, opts = {}) {
  const userId = escapeAttr(String(u.user_id || ''));
  const rawUserId = String(u.user_id || '').trim();
  const canDelete =
    !!opts.canDelete &&
    rawUserId &&
    rawUserId !== String(opts.callerUserId || '').trim();
  const rawHandle = normalizeUsername(u.username || '');
  const handleValid = isValidUsernameFormat(rawHandle) && !u.lanDirectoryPending;
  const handleCell = handleValid
    ? `<span class="clinical-lan-users-handle">@${escapeHtml(rawHandle)}</span>`
    : `<span class="clinical-lan-users-handle clinical-lan-users-handle--pending" title="Falta registrar @usuario en Mi rotación">sin @usuario</span>`;
  const name = escapeHtml(String(u.clinical_name || '').trim() || 'Sin nombre');
  const rankRaw = escapeAttr(String(u.rank || 'R1'));
  const salaLabel = escapeHtml(String(u.sala || '').trim() || '—');
  const placement = resolveLanUserPlacement(u.user_id, teamList);
  const placementLabel = escapeHtml(formatLanUserPlacementLabel(placement, String(u.rank || 'R1')));
  const teamOptions = renderLanAssignTeamOptionsHtml(teamList, placement?.teamId);
  const cycleOptions = placement?.cycle
    ? `<option value="${escapeAttr(placement.cycle)}" selected>${escapeHtml(formatLanCycleOptionLabel(placement.cycle, String(u.rank || 'R1')))}</option>`
    : '<option value="">— Ciclo —</option>';

  return `<tr class="clinical-lan-user-row" data-user-id="${userId}" data-user-rank="${rankRaw}" data-preferred-cycle="${escapeAttr(placement?.cycle || '')}">
    <td class="clinical-lan-users-col-handle">
      ${handleCell}
    </td>
    <td class="clinical-lan-users-col-name">
      <span class="clinical-lan-users-name" title="${name}">${name}</span>
    </td>
    <td class="clinical-lan-users-col-placement">
      <span class="clinical-lan-users-placement" title="${placementLabel}">${placementLabel}</span>
    </td>
    <td class="clinical-lan-users-col-sala">${salaLabel}</td>
    <td class="clinical-lan-users-col-team">
      <label class="visually-hidden" for="clinical-lan-team-${userId}">Equipo</label>
      <select id="clinical-lan-team-${userId}" class="profile-input clinical-lan-assign-team">${teamOptions}</select>
    </td>
    <td class="clinical-lan-users-col-cycle">
      <label class="visually-hidden" for="clinical-lan-cycle-${userId}">Ciclo</label>
      <select id="clinical-lan-cycle-${userId}" class="profile-input clinical-lan-assign-cycle" ${placement?.teamId ? '' : 'disabled'}>
        ${cycleOptions}
      </select>
    </td>
    <td class="clinical-lan-users-col-action">
      <div class="clinical-lan-users-action-row">
        <button type="button" class="btn-save clinical-lan-assign-btn" data-user-id="${userId}">Asignar</button>
        ${
          canDelete
            ? `<button type="button" class="btn-med-secondary clinical-lan-delete-user-btn" data-user-id="${userId}" data-user-label="${escapeAttr(String(u.clinical_name || rawHandle || rawUserId))}" title="Quitar de la base clínica en esta Mac y sincronizar en ⇄">Eliminar</button>`
            : ''
        }
      </div>
    </td>
  </tr>`;
}

/** @param {object[]} users @param {object[]} teams @param {{ canDelete?: boolean, callerUserId?: string }} [opts] */
function renderLanUsersModalBodyHtml(users, teams, opts = {}) {
  const list = Array.isArray(users) ? users : [];
  const teamList = Array.isArray(teams) ? teams : [];
  const rowOpts = {
    canDelete: !!opts.canDelete,
    callerUserId: String(opts.callerUserId || ''),
  };

  if (!list.length) {
    return `<p class="clinical-teams-empty">Aún no hay otros @usuario en esta Mac. Cada residente debe conectarse a tu LAN, abrir <strong>⇄ → Unirse</strong> en la misma sala y guardar <strong>Mi rotación → Guardar perfil</strong>. Luego los asignas al equipo desde aquí (no hace falta que ya tengan equipo).</p>`;
  }

  const { groups, other } = groupLanUsersByRank(list);
  const tableHead = `<thead><tr>
    <th scope="col">@usuario</th>
    <th scope="col">Nombre</th>
    <th scope="col">Ubicación actual</th>
    <th scope="col">Sala</th>
    <th scope="col">Asignar equipo</th>
    <th scope="col">Ciclo</th>
    <th scope="col"><span class="visually-hidden">Acción</span></th>
  </tr></thead>`;

  const rankSections = LAN_USER_RANK_ORDER.map((rank) => {
    const usersInRank = groups.get(rank) || [];
    if (!usersInRank.length) return '';
    return `<details class="clinical-lan-rank-group" open>
      <summary class="clinical-lan-rank-group-summary">
        <span class="clinical-lan-rank-group-title">${escapeHtml(rank)}</span>
        <span class="clinical-lan-rank-group-count">${usersInRank.length}</span>
      </summary>
      <div class="clinical-lan-users-table-wrap">
        <table class="clinical-lan-users-table clinical-lan-users-table--assign">
          ${tableHead}
          <tbody>${usersInRank.map((u) => renderLanUserRowHtml(u, teamList, rowOpts)).join('')}</tbody>
        </table>
      </div>
    </details>`;
  }).join('');

  const otherSection = other.length
    ? `<details class="clinical-lan-rank-group" open>
        <summary class="clinical-lan-rank-group-summary">
          <span class="clinical-lan-rank-group-title">Otros</span>
          <span class="clinical-lan-rank-group-count">${other.length}</span>
        </summary>
        <div class="clinical-lan-users-table-wrap">
          <table class="clinical-lan-users-table clinical-lan-users-table--assign">
            ${tableHead}
            <tbody>${other.map((u) => renderLanUserRowHtml(u, teamList, rowOpts)).join('')}</tbody>
          </table>
        </div>
      </details>`
    : '';

  const teamsHint = teamList.length
    ? ''
    : '<p class="clinical-teams-empty">Crea un equipo vacío en Mi rotación para poder asignar residentes.</p>';

  return `
    <p class="clinical-lan-users-modal-lead">${list.length} usuario${list.length === 1 ? '' : 's'} · <strong>todas las salas</strong> en esta Mac (no filtra por tu sala). Asigna a cualquier equipo activo.</p>
    ${teamsHint}
    <div class="clinical-lan-rank-groups">${rankSections}${otherSection}</div>`;
}

function syncLanAssignCycleSelect(teamSelect, preferredCycle = '') {
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const row = teamSelect.closest('.clinical-lan-user-row');
  const cycleSelect = row?.querySelector('.clinical-lan-assign-cycle');
  if (!(cycleSelect instanceof HTMLSelectElement)) return;

  const teamId = String(teamSelect.value || '').trim();
  if (!teamId) {
    cycleSelect.innerHTML = '<option value="">— Ciclo —</option>';
    cycleSelect.disabled = true;
    return;
  }

  const team = _lanUsersModalTeams.find((t) => String(t.team_id) === teamId);
  const userId = String(row?.dataset.userId || '').trim();
  const userRank = String(row?.dataset.userRank || 'R1');
  const letters = team ? cycleLettersForAssign(team, userRank) : [];
  const rowPreferred = String(preferredCycle || row?.dataset.preferredCycle || '').trim();
  let defaultCycle = team ? resolveMembershipCycleForUser(team, userId, userRank) : letters[0] || 'A';
  if (rowPreferred && letters.includes(rowPreferred)) {
    defaultCycle = rowPreferred;
  }

  cycleSelect.innerHTML = letters
    .map((letter) => {
      const label = formatLanCycleOptionLabel(letter, userRank);
      return `<option value="${escapeAttr(letter)}" ${letter === defaultCycle ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');
  cycleSelect.disabled = letters.length === 0;
  cycleSelect.value = defaultCycle;
}

/** @param {Element} row */
function initLanUserRowAssignState(row) {
  const teamSelect = row.querySelector('.clinical-lan-assign-team');
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const preferred = String(row.dataset.preferredCycle || '').trim();
  syncLanAssignCycleSelect(teamSelect, preferred);
}

async function handleLanAssignUserToTeam(userId, teamId, subAreaFraction) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('No se pudo asignar.', 'error');
    return false;
  }
  const res = await api.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se asignó al equipo.', 'error');
    return false;
  }
  return true;
}

async function handleLanDeleteDirectoryUserClick(btn) {
  const userId = String(btn.dataset.userId || '').trim();
  if (!userId) return;
  const label = String(btn.dataset.userLabel || '').trim() || userId;
  const api = dbApi();
  if (!api || typeof api.dbClinicalUserDelete !== 'function') {
    toast('Eliminar usuarios requiere R+ de escritorio con base clínica desbloqueada.', 'error');
    return;
  }
  const confirmed = window.confirm(
    `¿Eliminar a «${label}» de la base clínica en esta Mac?\n\nDesaparecerá del directorio LAN. Las demás R+ en la misma sala ⇄ lo quitarán al sincronizar.`
  );
  if (!confirmed) return;

  btn.disabled = true;
  const res = await api.dbClinicalUserDelete({
    targetUserId: userId,
    callerUserId: currentUserId(),
  });
  btn.disabled = false;
  if (!res?.ok) {
    toast(res?.error || 'No se pudo eliminar el usuario.', 'error');
    return;
  }

  toast('Usuario eliminado de esta Mac.', 'success');
  const { flushClinicalProfileToLan, isBenignLanPushSkipCode } = await import(
    '../../clinical-profile-lan-sync.mjs'
  );
  const lanPush = await flushClinicalProfileToLan();
  if (!lanPush.ok && !isBenignLanPushSkipCode(lanPush.code)) {
    toast(
      'Usuario eliminado aquí, pero no se pudo publicar el cambio a la sala ⇄. Revisa la conexión.',
      'warning'
    );
  }
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await openLanUsersDirectoryModal();
}

async function handleLanAssignButtonClick(btn) {
  if (!(btn instanceof HTMLButtonElement)) return;
  const row = btn.closest('.clinical-lan-user-row');
  if (!row) return;

  const userId = String(btn.dataset.userId || row.dataset.userId || '').trim();
  const teamSelect = row.querySelector('.clinical-lan-assign-team');
  const cycleSelect = row.querySelector('.clinical-lan-assign-cycle');
  const teamId =
    teamSelect instanceof HTMLSelectElement ? String(teamSelect.value || '').trim() : '';
  let subAreaFraction =
    cycleSelect instanceof HTMLSelectElement ? String(cycleSelect.value || '').trim() : '';

  if (!userId || !teamId) {
    toast('Elige un equipo.', 'error');
    return;
  }

  const team = _lanUsersModalTeams.find((t) => String(t.team_id) === teamId);
  const userRank = String(row.dataset.userRank || 'R1');
  if (!subAreaFraction && team) {
    subAreaFraction = resolveMembershipCycleForUser(team, userId, userRank);
  }
  if (!subAreaFraction) {
    toast('Elige el ciclo del integrante.', 'error');
    return;
  }

  const wasMember = Boolean(
    team?.members?.some((m) => String(m.user_id || '') === userId)
  );

  btn.disabled = true;
  const ok = await handleLanAssignUserToTeam(userId, teamId, subAreaFraction);
  btn.disabled = false;
  if (!ok) return;

  toast(wasMember ? 'Ciclo actualizado.' : 'Integrante asignado al equipo.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsToLan();
  await fetchClinicalTeamsFromDb();
  await openLanUsersDirectoryModal();
}

/** @param {HTMLElement} host */
export async function loadLanUsersDirectoryIntoHost(host) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalUsersList !== 'function') {
    host.innerHTML =
      '<p class="clinical-teams-empty">Directorio solo en la app de escritorio R+ (base clínica desbloqueada). En iPad/móvil usa el censo LAN; Mi rotación con directorio requiere Mac.</p>';
    return;
  }

  const callerUserId = currentUserId();
  const [usersRes, teamsRes] = await Promise.all([
    api.dbClinicalUsersList({ callerUserId }),
    typeof api.dbClinicalTeamsList === 'function' ? api.dbClinicalTeamsList() : Promise.resolve(null),
  ]);

  if (!usersRes?.ok) {
    host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml(usersRes?.error || 'No se pudo cargar el directorio.')}</p>`;
    return;
  }

  _lanUsersModalTeams =
    teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [];

  const sessionUser = clinicalSessionContext.user || {};
  host.innerHTML = renderLanUsersModalBodyHtml(usersRes.users, _lanUsersModalTeams, {
    canDelete: canDeleteLanDirectoryUser(sessionUser),
    callerUserId: currentUserId(),
  });
  host.querySelectorAll('.clinical-lan-user-row').forEach((row) => initLanUserRowAssignState(row));

  const title = document.getElementById('clinical-lan-users-title');
  const users = Array.isArray(usersRes.users) ? usersRes.users : [];
  const pending = users.filter((u) => u && u.lanDirectoryPending).length;
  recordClinicalOpsTrace('display', {
    directoryCount: users.length,
    lanDirectoryPending: pending,
  });
  if (title) {
    title.textContent = `Directorio de usuarios LAN (${users.length})`;
  }
}

/** @type {ReturnType<typeof setInterval>|null} */
let lanDirectoryPollTimer = null;

function stopLanDirectoryPoll() {
  if (lanDirectoryPollTimer) {
    clearInterval(lanDirectoryPollTimer);
    lanDirectoryPollTimer = null;
  }
}

function startLanDirectoryPoll() {
  stopLanDirectoryPoll();
  lanDirectoryPollTimer = setInterval(() => {
    const bd = lanUsersModalBackdropEl();
    if (!bd?.classList.contains('open')) {
      stopLanDirectoryPoll();
      return;
    }
    void backgroundRefreshLanUsersDirectory();
  }, 5000);
}

async function pullLanDirectoryFromHostBeforeDisplay() {
  try {
    const lanMod = await import('../lan-sync.mjs');
    if (typeof lanMod.refreshLanClinicalDirectoryFromRoom !== 'function') return false;
    return !!(await lanMod.refreshLanClinicalDirectoryFromRoom({ timeoutMs: 8000 }));
  } catch (_e) {
    return false;
  }
}

function backgroundRefreshLanUsersDirectory() {
  void pullLanDirectoryFromHostBeforeDisplay()
    .then(() => {
      const host = lanUsersModalBodyEl();
      const bd = lanUsersModalBackdropEl();
      if (!host || !bd?.classList.contains('open')) return;
      return loadLanUsersDirectoryIntoHost(host);
    })
    .catch(() => {});
}

export async function openLanUsersDirectoryModal() {
  const user = clinicalSessionContext.user || {};
  if (!canViewLanUserDirectory(user)) {
    toast(
      'Solo R4, Admin o quien tenga privilegios de administración puede abrir el directorio LAN.',
      'warn'
    );
    return;
  }

  const bd = lanUsersModalBackdropEl();
  const host = lanUsersModalBodyEl();
  if (!bd || !host) {
    console.error('[Directorio LAN] Falta #clinical-lan-users-backdrop o #clinical-lan-users-panel-body');
    toast(
      'No se pudo abrir el directorio (falta el diálogo en la UI). Ejecuta npm run build:ui y reinicia R+.',
      'error'
    );
    return;
  }

  host.innerHTML = '<p class="clinical-teams-empty">Cargando directorio…</p>';
  document.body.classList.add('clinical-lan-directory-open');
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');

  try {
    await pullLanDirectoryFromHostBeforeDisplay();
    await loadLanUsersDirectoryIntoHost(host);
  } catch (err) {
    console.error('[Directorio LAN]', err);
    host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml(
      err instanceof Error ? err.message : 'No se pudo cargar el directorio.'
    )}</p>`;
  }

  startLanDirectoryPoll();
}

export function closeLanUsersDirectoryModal() {
  stopLanDirectoryPoll();
  const bd = lanUsersModalBackdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('clinical-lan-directory-open');
}

export function wireLanUsersDirectoryControls() {
  if (typeof document !== 'undefined' && !document._rpcLanUsersOpsSyncedWired) {
    document._rpcLanUsersOpsSyncedWired = true;
    document.addEventListener('rpc-clinical-ops-synced', () => {
      const bd = lanUsersModalBackdropEl();
      const host = lanUsersModalBodyEl();
      if (!bd?.classList.contains('open') || !host) return;
      void loadLanUsersDirectoryIntoHost(host);
    });
  }

  const panelHost = getClinicalTeamsPanelHost();
  if (panelHost && !panelHost._rpcLanDirOpenDelegated) {
    panelHost._rpcLanDirOpenDelegated = true;
    panelHost.addEventListener('click', (ev) => {
      const openBtn =
        ev.target instanceof Element
          ? ev.target.closest('#btn-open-lan-users-directory, .clinical-teams-open-lan-users-btn')
          : null;
      if (!openBtn) return;
      ev.preventDefault();
      void openLanUsersDirectoryModal();
    });
  }

  const openBtn = document.getElementById('btn-open-lan-users-directory');
  if (openBtn && !openBtn._rpcLanDirOpenWired) {
    openBtn._rpcLanDirOpenWired = true;
    openBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      void openLanUsersDirectoryModal();
    });
  }

  const bd = lanUsersModalBackdropEl();
  if (bd && !bd._rpcLanUsersBackdropWired) {
    bd._rpcLanUsersBackdropWired = true;
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd) closeLanUsersDirectoryModal();
    });
  }

  const closeBtn = document.getElementById('btn-clinical-lan-users-close');
  if (closeBtn && !closeBtn._rpcLanUsersCloseWired) {
    closeBtn._rpcLanUsersCloseWired = true;
    closeBtn.addEventListener('click', () => closeLanUsersDirectoryModal());
  }

  const host = lanUsersModalBodyEl();
  if (host && !host._rpcLanUsersAssignWired) {
    host._rpcLanUsersAssignWired = true;
    host.addEventListener('change', (ev) => {
      const teamSelect = ev.target instanceof Element ? ev.target.closest('.clinical-lan-assign-team') : null;
      if (teamSelect) syncLanAssignCycleSelect(teamSelect);
    });
    host.addEventListener('click', (ev) => {
      const delBtn =
        ev.target instanceof Element ? ev.target.closest('.clinical-lan-delete-user-btn') : null;
      if (delBtn) {
        void handleLanDeleteDirectoryUserClick(delBtn);
        return;
      }
      const btn = ev.target instanceof Element ? ev.target.closest('.clinical-lan-assign-btn') : null;
      if (btn) void handleLanAssignButtonClick(btn);
    });
  }
}