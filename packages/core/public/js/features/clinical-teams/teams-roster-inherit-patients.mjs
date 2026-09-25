/**
 * Pure helpers: pick previous team + patients for month handoff
 * (e.g. choose Dr. Fer → inherit into Dra. Leslie).
 *
 * HARD BOUNDARY — only census team assignment helpers. Active entrega
 * pendientes must not block this path; leave-team resolves coverings separately.
 */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { activePatientTeamId } from '../../patient-team-assign-ui.mjs';
import { listBringableLocalPatients } from './teams-roster-bring-patients.mjs';

export function inheritTeamCatalog() {
  return [
    ...(clinicalSessionContext.teams || []),
    ...(clinicalSessionContext.scopeContext?.teams || []),
    ...(clinicalSessionContext.scopeContext?.teams_archived || []),
  ];
}

/**
 * @param {string} teamId
 * @param {Array<object>} [catalog]
 */
export function resolveInheritSourceTeamMeta(teamId, catalog = inheritTeamCatalog()) {
  const tid = String(teamId || '').trim();
  if (!tid) {
    return { teamId: '', name: 'Sin equipo', sala: '', cycle: '', archived: false };
  }
  const team = (catalog || []).find((t) => String(t?.team_id || '') === tid);
  if (!team) {
    return {
      teamId: tid,
      name: `Equipo anterior (${tid.slice(0, 8)}…)`,
      sala: '',
      cycle: '',
      archived: true,
    };
  }
  return {
    teamId: tid,
    name: String(team.name || team.service || 'Equipo').trim() || 'Equipo',
    sala: String(team.sala || '').trim(),
    cycle: String(team.sub_area_fraction || '').trim().toUpperCase(),
    archived: !!team.archived_at,
  };
}

/**
 * Prefer archived team with same sala + cycle as the new team (month handoff).
 * @param {{ sala?: string, sub_area_fraction?: string, team_id?: string }} targetTeam
 * @param {Array<object>} [catalog]
 */
export function preferredPreviousTeamId(targetTeam, catalog = inheritTeamCatalog()) {
  const sala = String(targetTeam?.sala || '').trim();
  const cycle = String(targetTeam?.sub_area_fraction || '').trim().toUpperCase();
  const selfId = String(targetTeam?.team_id || '').trim();
  if (!sala || !cycle) return '';
  const archived = (catalog || []).filter(
    (t) =>
      t &&
      t.archived_at &&
      String(t.team_id || '') !== selfId &&
      String(t.sala || '').trim() === sala &&
      String(t.sub_area_fraction || '').trim().toUpperCase() === cycle
  );
  if (!archived.length) return '';
  archived.sort((a, b) =>
    String(b.archived_at || b.updated_at || '').localeCompare(String(a.archived_at || a.updated_at || ''))
  );
  return String(archived[0].team_id || '');
}

/**
 * @param {string} targetTeamId
 * @param {object} [targetTeam]
 * @param {Array<object>} [localPatients]
 */
export function groupBringablePatientsForInherit(targetTeamId, targetTeam, localPatients) {
  const tid = String(targetTeamId || '').trim();
  const list = listBringableLocalPatients(tid, localPatients);
  const catalog = inheritTeamCatalog();
  const preferredId = preferredPreviousTeamId(
    targetTeam || (catalog || []).find((t) => String(t?.team_id) === tid) || {},
    catalog
  );

  /** @type {Map<string, { sourceTeamId: string, sourceLabel: string, preferred: boolean, patients: object[] }>} */
  const groups = new Map();

  for (const p of list) {
    const sourceId = activePatientTeamId(String(p.id)) || '';
    const meta = resolveInheritSourceTeamMeta(sourceId, catalog);
    const key = sourceId || '__none__';
    if (!groups.has(key)) {
      const preferred = !!(preferredId && sourceId === preferredId);
      const label = sourceId
        ? meta.archived
          ? `${meta.name} (mes anterior)`
          : meta.name
        : 'Sin equipo asignado';
      groups.set(key, {
        sourceTeamId: sourceId,
        sourceLabel: label,
        preferred,
        patients: [],
      });
    }
    groups.get(key).patients.push(p);
  }

  const rows = [...groups.values()];
  rows.sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    if (!!a.sourceTeamId !== !!b.sourceTeamId) return a.sourceTeamId ? -1 : 1;
    return a.sourceLabel.localeCompare(b.sourceLabel, 'es');
  });
  return { groups: rows, preferredSourceTeamId: preferredId, total: list.length };
}

function patientCountBySource(grouped) {
  const countBySource = new Map();
  for (const g of grouped?.groups || []) {
    countBySource.set(String(g.sourceTeamId || ''), (g.patients || []).length);
  }
  return countBySource;
}

function buildInheritSourceOption(id, meta, preferredId, patientCount, archived) {
  return {
    teamId: id,
    name: meta.name,
    sala: meta.sala,
    cycle: meta.cycle,
    preferred: id === preferredId,
    patientCount,
    archived,
  };
}

function archivedTeamMatchesSala(team, sala, selfId) {
  const id = String(team.team_id || '').trim();
  if (!id || id === selfId) return false;
  const teamSala = String(team.sala || '').trim();
  if (sala && teamSala && teamSala !== sala) return false;
  return true;
}

function addArchivedInheritSourceOptions(options, catalog, sala, selfId, preferredId, countBySource) {
  for (const t of catalog || []) {
    if (!t?.archived_at) continue;
    if (!archivedTeamMatchesSala(t, sala, selfId)) continue;
    const id = String(t.team_id || '').trim();
    const meta = resolveInheritSourceTeamMeta(id, catalog);
    options.set(
      id,
      buildInheritSourceOption(id, meta, preferredId, countBySource.get(id) || 0, true)
    );
  }
}

function addGroupedInheritSourceOptions(options, grouped, catalog, preferredId) {
  for (const g of grouped?.groups || []) {
    const id = String(g.sourceTeamId || '').trim();
    if (!id || options.has(id)) continue;
    const meta = resolveInheritSourceTeamMeta(id, catalog);
    options.set(
      id,
      buildInheritSourceOption(id, meta, preferredId, (g.patients || []).length, !!meta.archived)
    );
  }
}

function sortInheritSourceOptions(rows) {
  rows.sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    if ((b.patientCount || 0) !== (a.patientCount || 0)) {
      return (b.patientCount || 0) - (a.patientCount || 0);
    }
    return a.name.localeCompare(b.name, 'es');
  });
}

/**
 * Source teams the user can pick to inherit FROM (step 2).
 * Includes archived teams in the same sala + any source that already has local patients.
 * @param {object} targetTeam
 * @param {ReturnType<typeof groupBringablePatientsForInherit>} grouped
 * @param {Array<object>} [catalog]
 */
export function listInheritSourceOptions(targetTeam, grouped, catalog = inheritTeamCatalog()) {
  const sala = String(targetTeam?.sala || '').trim();
  const selfId = String(targetTeam?.team_id || '').trim();
  const preferredId = String(grouped?.preferredSourceTeamId || '').trim();
  const countBySource = patientCountBySource(grouped);

  /** @type {Map<string, { teamId: string, name: string, sala: string, cycle: string, preferred: boolean, patientCount: number, archived: boolean }>} */
  const options = new Map();

  addArchivedInheritSourceOptions(options, catalog, sala, selfId, preferredId, countBySource);
  addGroupedInheritSourceOptions(options, grouped, catalog, preferredId);

  const rows = [...options.values()];
  sortInheritSourceOptions(rows);

  return {
    sources: rows,
    unassignedCount: countBySource.get('') || 0,
    preferredSourceTeamId: preferredId,
  };
}

/**
 * Patients to show after a source pick (step 3).
 * @param {ReturnType<typeof groupBringablePatientsForInherit>} grouped
 * @param {string} sourceTeamId empty string = unassigned only; '__all__' = everything
 * @param {{ includeUnassigned?: boolean }} [opts]
 */
export function patientsForInheritSource(grouped, sourceTeamId, opts = {}) {
  const groups = Array.isArray(grouped?.groups) ? grouped.groups : [];
  const key = String(sourceTeamId || '');
  if (key === '__all__') {
    return groups.flatMap((g) => g.patients || []);
  }
  const primary = groups.find((g) => String(g.sourceTeamId || '') === key);
  const list = [...(primary?.patients || [])];
  if (opts.includeUnassigned && key) {
    const none = groups.find((g) => !g.sourceTeamId);
    for (const p of none?.patients || []) list.push(p);
  }
  return list;
}
