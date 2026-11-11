import { esc } from '../../dom-escape.mjs';
import {
  formatCycleOptionLabel,
  resolveUserPlacement,
} from '../clinical-teams/teams-roster-directory-render.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import {
  clinicalUserActivityTier,
  formatClinicalUserActivityBadge,
  formatClinicalUserActivityHistory,
  formatClinicalUserLastActivity,
} from '../../../../lib/clinical-user-activity.mjs';
import { equiposRowHistoryButton } from './panel-admin-equipos-history-modal.mjs';
import { assignTeamOptions, cycleOptions, rankOptions, userSalaOptions } from './panel-admin-equipos-html-fields.mjs';

export {
  CLINICAL_RANK_OPTIONS,
  renderEquiposAssignTeamOptionsHtml,
  cycleOptionsForTeam,
} from './panel-admin-equipos-html-fields.mjs';

/** Board «Admin · Usuarios» chips: id → label (counts fill in after the list loads). */
export const EQUIPOS_CHIPS = [
  ['all', 'Todos'],
  ['unassigned', 'Sin equipo'],
  ['nosala', 'Sin sala'],
  ['new', 'Nuevos'],
  ['idle', 'Sin uso 30 d'],
];

/** The filter select is refilled in place (its value is kept), so it stays a string. @param {string[]} salas */
export function equiposSalaOptionsHtml(salas) {
  const opts = (salas || [])
    .map((s) => '<option value="' + esc(String(s)) + '">' + esc(String(s)) + '</option>')
    .join('');
  return '<option value="">Todas las salas</option>' + opts;
}

/** @param {object} row @param {number} nowMs */
function activityParts(row, nowMs) {
  const iso = String(row.last_activity_at || '');
  const tier = clinicalUserActivityTier(iso, nowMs);
  const has = tier === 'unknown' ? 'none' : 'has';
  const badgeText = formatClinicalUserActivityBadge(iso, nowMs);
  const historyText = formatClinicalUserActivityHistory(row.activity_history);
  const title = [formatClinicalUserLastActivity(iso, nowMs), historyText].filter(Boolean).join(' | ');
  return { tier, has, badgeText, historyText, title };
}

/** «Dra. Ana Ríos» → «AR»; falls back to the @usuario. @param {string} name @param {string} handle */
function equiposInitials(name, handle) {
  const words = String(name || '')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/^(dra?|dr)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.length && name !== 'Sin nombre'
    ? words[0].charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : '')
    : String(handle || '').slice(0, 2);
  return letters.toUpperCase() || '?';
}

/** @param {object} row */
function pendingBadge(row) {
  if (!row.hasLocalProfile) {
    return { text: 'Nuevo', title: 'Se creará perfil clínico al asignar', pending: true };
  }
  if (row.clinicalOnly) return { text: 'Solo clínico', title: 'Solo en base clínica (sin cuenta Nube)', pending: false };
  return null;
}

/** @param {string} userId @param {string} cloudId */
function purgeTitle(userId, cloudId) {
  return cloudId && !userId
    ? 'Eliminar cuenta Nube (sin perfil clínico local)'
    : 'Quitar del equipo / base clínica' + (cloudId ? ' y cuenta Nube' : '');
}

/** The lowercase text the search box matches against. */
function searchHaystack(row, placement, act) {
  return [
    row.username, row.clinical_name, row.rank, row.sala, placement?.teamName, act.badgeText, act.historyText,
    act.has === 'has' ? 'con actividad' : 'sin actividad', row.clinicalOnly ? 'clinico test' : '',
  ].map((p) => String(p || '').trim()).filter(Boolean).join(' ').toLowerCase();
}

/** The row menu's selects: sala, rango, equipo and ciclo. */
function assignModel(row, teams, placement, userId, rank) {
  const sala = String(row.sala || '');
  const team = placement?.teamId ? teams.find((t) => String(t.team_id) === String(placement.teamId)) : null;
  return {
    salaOptions: userSalaOptions(sala),
    rankOptions: rankOptions(rank),
    teamOptions: assignTeamOptions(teams, placement?.teamId, sala.trim()),
    cycleOptions: cycleOptions(team, userId, rank, placement?.cycle),
    cycleDisabled: !placement?.teamId,
  };
}

/** The data-* flags the filters read. */
function flagsModel(row, placement, act) {
  return {
    hasTeam: placement?.teamId ? '1' : '0',
    isNew: row.hasLocalProfile ? '0' : '1',
    idle: act.tier === 'stale' || act.tier === 'unknown' ? '1' : '0',
    activityHas: act.has,
    search: searchHaystack(row, placement, act),
  };
}

/** The text lines: name, initials, sala · rango, activity and team. */
function labelsModel(row, placement, act, handle, rank) {
  const nameText = String(row.clinical_name || '').trim() || 'Sin nombre';
  return {
    name: nameText,
    // Initials come from the escaped name, as they always did.
    initials: equiposInitials(esc(nameText), handle),
    meta: [String(row.sala || '').trim() || 'Sin sala', rank].join(' · '),
    activity: { tier: act.tier, title: act.title, text: act.badgeText },
    placement: placement?.teamId
      ? [placement.teamName, placement.cycle ? formatCycleOptionLabel(placement.cycle, rank) : ''].filter(Boolean).join(' · ')
      : null,
  };
}

/** Everything one user row shows, as plain strings. @param {object} row @param {object[]} teams @param {number} nowMs */
function equiposRowModel(row, teams, nowMs) {
  const userId = String(row.user_id || '').trim();
  const rank = String(row.rank || 'R1');
  const handle = normalizeUsername(row.username || '');
  const cloudId = String(row.cloudId || '').trim();
  const placement = userId ? resolveUserPlacement(userId, teams) : null;
  const act = activityParts(row, nowMs);
  return {
    userId, cloudId, handle, rank,
    sala: String(row.sala || ''),
    display: String(row.clinical_name || ''),
    ...flagsModel(row, placement, act),
    ...labelsModel(row, placement, act, handle, rank),
    pending: pendingBadge(row),
    history: equiposRowHistoryButton(handle, String(row.clinical_name || '').trim(), row.activity_history),
    ...assignModel(row, teams, placement, userId, rank),
    purge: userId || cloudId ? { title: purgeTitle(userId, cloudId) } : null,
  };
}

/**
 * Rows grouped «Sin equipo · N» first, then one group per team «Equipo · N»
 * (rows arrive sorted that way from sortEquiposRowsForAdmin).
 * @param {object[]} rows @param {object[]} teams @param {number} [nowMs]
 * @returns {{ label: string, rows: ReturnType<typeof equiposRowModel>[] }[]}
 */
export function equiposListModel(rows, teams, nowMs = Date.now()) {
  const groups = [];
  for (const row of rows) {
    const placement = resolveUserPlacement(String(row.user_id || ''), teams);
    const key = placement?.teamId ? String(placement.teamName || placement.teamId) : 'Sin equipo';
    const last = groups[groups.length - 1];
    const model = equiposRowModel(row, teams, nowMs);
    if (last && last.key === key) last.rows.push(model);
    else groups.push({ key, rows: [model] });
  }
  return groups.map((g) => ({ label: g.key + ' · ' + g.rows.length, rows: g.rows }));
}
