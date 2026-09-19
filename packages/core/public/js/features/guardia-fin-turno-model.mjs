/**
 * Fin de guardia — group Active coverings with open estudios by source_team_id.
 * Pure helpers; UI + resolve live in guardia-fin-turno-modal.
 */
import {
  listActiveProcedimientos,
  normalizePendientesJson,
} from '../../../lib/entrega/entrega-pendientes.mjs';

/**
 * @param {Record<string, unknown>|null|undefined} patient
 * @param {string} patientId
 * @returns {string}
 */
export function patientLabelForFinTurno(patient, patientId) {
  var id = String(patientId || '').trim();
  if (!patient || typeof patient !== 'object') {
    return id ? 'Paciente ' + id.slice(0, 8) : 'Paciente';
  }
  var bed = [patient.cuarto, patient.cama].filter(Boolean).join('-');
  if (!bed && patient.bed_label) bed = String(patient.bed_label).trim();
  var name = String(patient.name || patient.nombre || '').trim();
  var label = [bed, name].filter(Boolean).join(' · ');
  return label || (id ? 'Paciente ' + id.slice(0, 8) : 'Paciente');
}

/**
 * @param {unknown[]} patients
 * @returns {Map<string, Record<string, unknown>>}
 */
function indexPatientsById(patients) {
  /** @type {Map<string, Record<string, unknown>>} */
  var patientById = new Map();
  (patients || []).forEach(function (p) {
    if (!p || typeof p !== 'object' || !/** @type {any} */ (p).id) return;
    patientById.set(String(/** @type {any} */ (p).id), /** @type {any} */ (p));
  });
  return patientById;
}

/**
 * @param {(teamId: string) => string} labelFn
 * @param {string} sourceTeamId
 */
function emptyFinTurnoGroup(labelFn, sourceTeamId) {
  var tid = String(sourceTeamId || '').trim();
  return {
    sourceTeamId: tid,
    teamLabel: tid ? labelFn(tid) || 'Equipo' : 'Sin equipo / otros',
    openCount: 0,
    patients: /** @type {any[]} */ ([]),
  };
}

/**
 * @param {Record<string, unknown>} g
 * @param {string} coveringUserId
 * @returns {{ patientId: string, guardiaId: string, sourceTeamId: string, items: object[] }|null}
 */
function openCoveringPayload(g, coveringUserId) {
  if (String(g.status || 'Active') !== 'Active') return null;
  if (coveringUserId && String(g.covering_user_id || '') !== coveringUserId) return null;
  var items = listActiveProcedimientos(normalizePendientesJson(g.pendientes_json));
  if (!items.length) return null;
  var patientId = String(g.patient_id || '').trim();
  if (!patientId) return null;
  return {
    patientId: patientId,
    guardiaId: String(g.guardia_id || '').trim(),
    sourceTeamId: String(g.source_team_id || '').trim(),
    items: items,
  };
}

/**
 * @param {Map<string, ReturnType<typeof emptyFinTurnoGroup>>} groups
 * @param {(teamId: string) => string} labelFn
 * @param {Map<string, Record<string, unknown>>} patientById
 * @param {Record<string, unknown>} g
 * @param {string} coveringUserId
 */
function appendOpenCovering(groups, labelFn, patientById, g, coveringUserId) {
  var payload = openCoveringPayload(g, coveringUserId);
  if (!payload) return;
  var key = payload.sourceTeamId || '__none__';
  var group = groups.get(key);
  if (!group) {
    group = emptyFinTurnoGroup(labelFn, payload.sourceTeamId);
    groups.set(key, group);
  }
  group.patients.push({
    patientId: payload.patientId,
    guardiaId: payload.guardiaId,
    patientLabel: patientLabelForFinTurno(patientById.get(payload.patientId) || null, payload.patientId),
    itemLabels: payload.items
      .map(function (it) {
        return String(/** @type {any} */ (it).label || '').trim();
      })
      .filter(Boolean),
  });
  group.openCount += payload.items.length;
}

/**
 * @param {unknown[]} guardias
 * @param {unknown[]} patients
 * @param {{
 *   coveringUserId?: string,
 *   teamLabelById?: (teamId: string) => string,
 * }} [opts]
 * @returns {{
 *   sourceTeamId: string,
 *   teamLabel: string,
 *   openCount: number,
 *   patients: Array<{
 *     patientId: string,
 *     guardiaId: string,
 *     patientLabel: string,
 *     itemLabels: string[],
 *   }>,
 * }[]}
 */
export function collectOpenPendientesBySourceTeam(guardias, patients, opts) {
  var coveringUserId = String((opts && opts.coveringUserId) || '').trim();
  var labelFn =
    opts && typeof opts.teamLabelById === 'function'
      ? opts.teamLabelById
      : function (id) {
          return id ? 'Equipo ' + String(id).slice(0, 8) : 'Sin equipo / otros';
        };
  var patientById = indexPatientsById(patients);
  /** @type {Map<string, ReturnType<typeof emptyFinTurnoGroup>>} */
  var groups = new Map();
  (guardias || []).forEach(function (g) {
    if (!g || typeof g !== 'object') return;
    appendOpenCovering(groups, labelFn, patientById, /** @type {any} */ (g), coveringUserId);
  });
  return Array.from(groups.values()).sort(function (a, b) {
    if (a.sourceTeamId && !b.sourceTeamId) return -1;
    if (!a.sourceTeamId && b.sourceTeamId) return 1;
    return String(a.teamLabel).localeCompare(String(b.teamLabel), 'es');
  });
}

/**
 * @param {ReturnType<typeof collectOpenPendientesBySourceTeam>} groups
 * @returns {{ openCount: number, teamCount: number }}
 */
export function summarizeFinTurnoGroups(groups) {
  var list = Array.isArray(groups) ? groups : [];
  var openCount = 0;
  for (var i = 0; i < list.length; i++) openCount += Number(list[i].openCount) || 0;
  return { openCount: openCount, teamCount: list.length };
}

/**
 * @param {{ patients: Array<{ patientId: string, guardiaId: string }> }} group
 * @param {{ resolveOne: (opts: { patientId: string, guardiaId: string }) => Promise<{ ok?: boolean, resolved?: boolean }> }} deps
 */
export async function resolveGuardiasForSourceTeam(group, deps) {
  var patients = (group && group.patients) || [];
  var resolveOne = deps && deps.resolveOne;
  if (typeof resolveOne !== 'function') {
    return { resolved: 0, total: patients.length, failed: patients.length };
  }
  var resolved = 0;
  var failed = 0;
  for (var i = 0; i < patients.length; i++) {
    var row = patients[i];
    try {
      var res = await resolveOne({
        patientId: row.patientId,
        guardiaId: row.guardiaId,
      });
      if (res && res.ok !== false && res.resolved) resolved += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { resolved: resolved, total: patients.length, failed: failed };
}
