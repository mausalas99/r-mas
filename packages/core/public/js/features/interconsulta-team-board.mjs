/**
 * Interconsulta team board — Sala-style cards in two modes.
 *
 * "Asignar": one row per team on top (guardia, activo x2, postguardia, any
 * overflow teams) and every unassigned patient below ("Por asignar"), all
 * visible at once. Rows and the tray are drop targets (`data-drop-team-id`).
 * "Mi equipo": one team's patients as full Sala cards, grouped by bucket.
 *
 * Pure helpers and drag/drop wiring live here; the markup is Preact, in
 * interconsulta-team-board-view.jsx (which also exports the mount function).
 */
import { getInterconsultaTeamRoles } from '../../../lib/clinical-scope/interconsulta-team-roles.mjs';
import { classifyInterconsultaBoardBucket } from '../../../lib/clinical-scope/interconsulta-board-buckets.mjs';
import { triageRank } from './patient-dashboard/consult-band.mjs';

export const BUCKET_LABELS = {
  preop: 'Preop / Nuevas hoy',
  pendientes: 'Pendientes',
  under: 'Under',
};

export function teamLabel(team, fallback) {
  return String(team?.name || team?.service || fallback || 'Equipo').trim() || 'Equipo';
}

/** Received (Recibida stamped, not yet Respondida) first, then triage order
 * (VPO, Críticos, IC, Seguimiento, no group). Stable sort. */
const isReceivedOpen = (p) => (p?.consultInfo?.receivedAt && !p.consultInfo.answeredAt ? 0 : 1);
export function byTriage(patients) {
  return (patients || []).slice().sort((a, b) => isReceivedOpen(a) - isReceivedOpen(b) || triageRank(a) - triageRank(b));
}

export function groupByBucket(patients, isGuardiaTeam, now) {
  /** @type {Record<string, object[]>} */
  const groups = { preop: [], pendientes: [], under: [], archivado: [] };
  for (const p of byTriage(patients)) {
    const bucket = classifyInterconsultaBoardBucket(p, { isGuardiaTeam, now });
    (groups[bucket] || groups.pendientes).push(p);
  }
  return groups;
}

const LOWER_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);

/** "JOSE JUAN LEAL GALLEGOS" → "Jose Juan Leal Gallegos". Charts store names in capitals. */
export function titleCaseName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/(^|[\s'-])(\S)/g, (m, sep, ch, off) => {
      const word = m.trim() && String(name).toLowerCase().slice(off + sep.length).split(/\s/)[0];
      return sep + (sep && LOWER_WORDS.has(word) ? ch : ch.toUpperCase());
    });
}

/** "Cto. 432 · Cama 3" → "432 · 3". */
export function shortBed(p) {
  return [p.cuarto, p.cama].map((x) => String(x || '').trim()).filter(Boolean).join(' · ') || 'Sin cama';
}

/** Two fixed activo slots; any further real teams become extra rows. */
export function laneSlots(roles) {
  const activo = roles.activo || [];
  return { activo: [activo[0] || null, activo[1] || null], overflow: activo.slice(2) };
}

export function groupPatientsByTeamId(patients) {
  const byTeam = new Map();
  for (const p of patients || []) {
    const teamId = String(p?.censusTeamId || '');
    if (!teamId) continue;
    if (!byTeam.has(teamId)) byTeam.set(teamId, []);
    byTeam.get(teamId).push(p);
  }
  return byTeam;
}

// Computed BEFORE hidePostguardia filtering — postguardia's patients must
// stay "known" even when its row is hidden, or they'd wrongly leak into the
// "Por asignar" tray.
export function computeKnownTeamIds(roles, slots) {
  return new Set(
    [roles.guardia, roles.postguardia, ...slots.activo, ...slots.overflow]
      .filter(Boolean)
      .map((t) => String(t.team_id || ''))
  );
}

/** Teams that can be "mine", in board order: [{ id, label }]. Empty when no real team exists. */
export function interconsultaTeamOptions(teams, now = new Date()) {
  const roles = getInterconsultaTeamRoles(teams, now);
  const slots = laneSlots(roles);
  return [roles.guardia, ...slots.activo, roles.postguardia, ...slots.overflow]
    .filter(Boolean)
    .map((t) => ({ id: String(t.team_id || ''), label: teamLabel(t) }));
}

/** Next focused row id in `ids` (DOM order). Clamps at the ends; first id when `currentId` is missing. */
export function stepFocusId(ids, currentId, dir) {
  if (!ids.length) return '';
  const i = ids.indexOf(currentId);
  if (i < 0) return ids[0];
  return ids[Math.min(ids.length - 1, Math.max(0, i + dir))];
}

/** Team id for a digit key ('1'..'9') = Nth option; '' when the key is not a digit or the list is shorter. */
export function assignKeyToTeamId(options, key) {
  if (!/^[1-9]$/.test(String(key || ''))) return '';
  const opt = (options || [])[Number(key) - 1];
  return opt ? opt.id : '';
}

/** Display name of the team on call today, or '' when no interconsult team is on guardia. */
export function guardiaTeamLabel(teams, now = new Date()) {
  const guardia = getInterconsultaTeamRoles(teams, now).guardia;
  return guardia ? teamLabel(guardia) : '';
}

/** Drag an `.ic-line` from any row or the tray, drop it on any element with
 * `data-drop-team-id` ("" = Por asignar) to reassign that patient's team via
 * `opts.assignTeam`. Native HTML5 DnD — no library needed for a same-page move.
 * The listeners go on the container, which the header re-render keeps, so they
 * are attached once. */
export function wireTeamBoardDragAndDrop(container, opts) {
  container._icDndOpts = opts;
  if (container.dataset.icDndWired) return;
  container.dataset.icDndWired = '1';
  const CARD = '.ic-card[data-patient-id], .ic-line[data-patient-id]';
  const ZONE = '[data-drop-team-id]';

  container.addEventListener('dragstart', (ev) => {
    const card = ev.target.closest && ev.target.closest(CARD);
    if (!card) return;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', card.getAttribute('data-patient-id') || '');
    card.classList.add('ic-board-card--dragging');
  });

  const clearOver = () => container.querySelectorAll('.ic-drop-over').forEach((el) => el.classList.remove('ic-drop-over'));

  container.addEventListener('dragend', (ev) => {
    const card = ev.target.closest && ev.target.closest(CARD);
    if (card) card.classList.remove('ic-board-card--dragging');
    clearOver();
  });

  container.addEventListener('dragover', (ev) => {
    const zone = ev.target.closest && ev.target.closest(ZONE);
    if (!zone) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    if (!zone.classList.contains('ic-drop-over')) {
      clearOver();
      zone.classList.add('ic-drop-over');
    }
  });

  container.addEventListener('dragleave', (ev) => {
    const zone = ev.target.closest && ev.target.closest(ZONE);
    if (zone && !zone.contains(ev.relatedTarget)) zone.classList.remove('ic-drop-over');
  });

  container.addEventListener('drop', async (ev) => {
    const zone = ev.target.closest && ev.target.closest(ZONE);
    if (!zone) return;
    ev.preventDefault();
    clearOver();
    const patientId = ev.dataTransfer.getData('text/plain');
    const teamId = zone.getAttribute('data-drop-team-id') || '';
    const cur = container._icDndOpts;
    if (!patientId || typeof cur.assignTeam !== 'function') return;
    const result = await cur.assignTeam(patientId, teamId);
    if (typeof cur.onAssignTeam === 'function') cur.onAssignTeam(result);
  });
}
