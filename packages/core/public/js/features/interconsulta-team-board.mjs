/**
 * Interconsulta team board — Sala-style cards in two modes.
 *
 * "Asignar": one row per team on top (guardia, activo x2, postguardia, any
 * overflow teams) and every unassigned patient below ("Por asignar"), all
 * visible at once. Rows and the tray are drop targets (`data-drop-team-id`).
 * "Mi equipo": one team's patients as full Sala cards, grouped by bucket.
 *
 * Plain HTML-string rendering, like patients-card-html.mjs.
 */
import { getInterconsultaTeamRoles } from '../../../lib/clinical-scope/interconsulta-team-roles.mjs';
import { classifyInterconsultaBoardBucket } from '../../../lib/clinical-scope/interconsulta-board-buckets.mjs';
import { requestingServiceHue } from './patients-card-html.mjs';
import { getConsultInfo, triageRank, icTriageTagHtml, icTimerHtml } from './patient-dashboard/consult-band.mjs';
import { cardTagsHtml, cornerBtnHtml } from './sala-view-variants.mjs';
import { escHtml } from '../dom-escape.mjs';

const BUCKET_LABELS = {
  preop: 'Preop / Nuevas hoy',
  pendientes: 'Pendientes',
  under: 'Under',
};

function teamLabel(team, fallback) {
  return String(team?.name || team?.service || fallback || 'Equipo').trim() || 'Equipo';
}

/** Received (Recibida stamped, not yet Respondida) first, then triage order
 * (VPO, Críticos, IC, Seguimiento, no group). Stable sort. */
const isReceivedOpen = (p) => (p?.consultInfo?.receivedAt && !p.consultInfo.answeredAt ? 0 : 1);
function byTriage(patients) {
  return (patients || []).slice().sort((a, b) => isReceivedOpen(a) - isReceivedOpen(b) || triageRank(a) - triageRank(b));
}

function groupByBucket(patients, isGuardiaTeam, now) {
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
function titleCaseName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/(^|[\s'-])(\S)/g, (m, sep, ch, off) => {
      const word = m.trim() && String(name).toLowerCase().slice(off + sep.length).split(/\s/)[0];
      return sep + (sep && LOWER_WORDS.has(word) ? ch : ch.toUpperCase());
    });
}

/** "Cto. 432 · Cama 3" → "432 · 3". */
function shortBed(p) {
  return [p.cuarto, p.cama].map((x) => String(x || '').trim()).filter(Boolean).join(' · ') || 'Sin cama';
}

/** Requesting service chip with its colored dot, shared by cards and rows. */
function svcHtml(p) {
  const svcName = String(getConsultInfo(p).requestingService || '').trim();
  const hue = requestingServiceHue(p);
  return svcName
    ? '<span class="ic-svc"><i class="ic-svc__dot" style="--h:' + (hue == null ? 220 : hue) + '"></i>' + escHtml(svcName) + '</span>'
    : '<span class="sv-none">Sin servicio</span>';
}

/** One-row patient line. Cells, in grid order: [grip], triage, critical-lab dot, bed, name,
 * requesting service, motivo, timer, then archive ("Mi equipo") or the "Asignar ▾" button
 * (`opts.assign`, Por asignar rows). `opts.grip` adds the drag handle first. */
export function icRowHtml(p, opts = {}) {
  const assign = !!opts.assign;
  const grip = !!opts.grip;
  const id = escHtml(String(p.id));
  const reason = String(getConsultInfo(p).reason || '').trim();
  const triage = getConsultInfo(p).triage;
  const triageCell =
    triage === 'seguimiento' ? '<span class="ic-line__muted">Seguimiento</span>' : icTriageTagHtml(p);
  // A red dot stands in for the "Lab crítico" tag, as in icCardHtml.
  const critDot = cardTagsHtml(p).includes('Lab crítico')
    ? '<span class="ic-crit-dot" title="Lab crítico" role="img" aria-label="Lab crítico"></span>'
    : '';
  return (
    '<div class="ic-line sv-card-wrap' + (grip ? ' ic-line--grip' : '') + (assign ? ' ic-line--assign' : '') + '" draggable="true" data-ic-line data-patient-id="' + id + '" data-ic-open="' + id + '">' +
    (grip ? '<span class="ic-line__grip"' + (assign ? ' aria-hidden="true"' : ' data-ic-assign-open="' + id + '" role="button" title="Mover o quitar equipo" aria-label="Mover o quitar equipo"') + '>⋮⋮</span>' : '') +
    '<span class="ic-line__triage">' + triageCell + '</span>' +
    '<span class="ic-line__crit">' + critDot + '</span>' +
    '<span class="ic-line__bed">' + escHtml(shortBed(p)) + '</span>' +
    '<span class="ic-line__name" title="' + escHtml([p.registro].filter(Boolean).join(' · ')) + '">' + escHtml(titleCaseName(p.nombre) || 'Sin nombre') + '</span>' +
    '<span class="ic-line__svc">' + svcHtml(p) + '</span>' +
    '<span class="ic-line__motivo">' + (reason ? escHtml(reason) : '<span class="sv-none">Sin motivo</span>') + '</span>' +
    '<span class="ic-line__timer">' + (assign ? '' : icTimerHtml(p)) + '</span>' +
    (assign
      ? '<button type="button" class="ic-line__assign" data-ic-assign-open="' + id + '" aria-haspopup="menu">Asignar ▾</button>'
      : '<span class="ic-line__archive">' + cornerBtnHtml(p) + '</span>') +
    '</div>'
  );
}

/** Two fixed activo slots; any further real teams become extra rows. */
function laneSlots(roles) {
  const activo = roles.activo || [];
  return { activo: [activo[0] || null, activo[1] || null], overflow: activo.slice(2) };
}

function groupPatientsByTeamId(patients) {
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
function computeKnownTeamIds(roles, slots) {
  return new Set(
    [roles.guardia, roles.postguardia, ...slots.activo, ...slots.overflow]
      .filter(Boolean)
      .map((t) => String(t.team_id || ''))
  );
}

/** One Asignar section: heading with count, then a flat triage-sorted row list (no buckets). */
function sectionHtml({ role, team, title, patients, emptyText, note }) {
  const list = byTriage(patients);
  const dropAttr = team ? ' data-drop-team-id="' + escHtml(String(team.team_id || '')) + '"' : '';
  const rows = list.map((p) => icRowHtml(p, { grip: true })).join('');
  let body;
  if (!team) body = '<div class="ic-lines"><p class="ic-line__muted ic-lines__empty">' + escHtml(emptyText) + '</p></div>';
  else if (!list.length) body = '<div class="ic-lines"' + dropAttr + '><p class="ic-line__muted ic-lines__empty">Suelta un paciente aquí</p></div>';
  else body = '<div class="ic-lines"' + dropAttr + '>' + rows + '</div>';
  return (
    '<section class="ic-board-section ic-board-section--' + role + '" data-role="' + role + '"' + dropAttr + '>' +
    '<h2 class="ic-board-section__title">' + escHtml(title) + ' <span>' + list.length + '</span>' +
    (note ? '<em>' + escHtml(note) + '</em>' : '') +
    '</h2>' + body + '</section>'
  );
}

/** "Por asignar" section: only shown while some patient has no known team. */
function sinEquipoHtml(unassigned) {
  if (!unassigned.length) return '';
  return (
    '<section class="ic-board-section ic-board-section--sin" data-role="sin-equipo" data-drop-team-id="">' +
    '<h2 class="ic-board-section__title">Por asignar <span>' + unassigned.length + '</span>' +
    '<em>Elige un equipo con el menú o con las teclas 1 a 4</em></h2>' +
    '<div class="ic-lines ic-lines--sin">' + unassigned.map((p) => icRowHtml(p, { assign: true, grip: true })).join('') + '</div>' +
    '</section>'
  );
}

/**
 * "Asignar" mode as an HTML string.
 * @param {object[]} patients — patients already scoped to interconsulta, each with `censusTeamId`
 * @param {object[]} teams — all clinical teams (filtered internally to Interconsultas)
 * @param {Date|string} [now]
 * @param {{ filterGuardiaOnly?: boolean, hidePostguardia?: boolean }} [opts]
 * @returns {string}
 */
export function renderInterconsultaTeamBoardHtml(patients, teams, now = new Date(), opts = {}) {
  const { filterGuardiaOnly = false, hidePostguardia = false } = opts || {};
  const roles = getInterconsultaTeamRoles(teams, now);
  const byTeam = groupPatientsByTeamId(patients);
  const patientsFor = (team) => (team ? byTeam.get(String(team.team_id || '')) || [] : []);
  const slots = laneSlots(roles);

  if (filterGuardiaOnly) {
    const preop = groupByBucket(patientsFor(roles.guardia), true, now).preop;
    return '<div class="ic-team-board ic-team-board--filtered">' + sectionHtml({
      role: 'guardia', team: roles.guardia, title: teamLabel(roles.guardia, 'Guardia'), patients: preop, emptyText: 'Sin equipo de guardia hoy.',
    }) + '</div>';
  }

  // Computed BEFORE hidePostguardia: postguardia's patients stay "known" even when its section is hidden.
  const known = computeKnownTeamIds(roles, slots);
  const unassigned = (patients || []).filter((p) => !known.has(String(p?.censusTeamId || '')));
  // Weekends: only the on-call team is present.
  const weekend = [0, 6].includes(new Date(now).getDay());
  const sections = [
    sectionHtml({ role: 'guardia', team: roles.guardia, title: teamLabel(roles.guardia, 'Guardia'), patients: patientsFor(roles.guardia), emptyText: 'Sin equipo de guardia hoy.' }),
  ];
  if (!weekend) {
    slots.activo.forEach((team, i) =>
      sections.push(sectionHtml({ role: 'activo', team, title: teamLabel(team, 'Activo ' + (i + 1)), patients: patientsFor(team), emptyText: 'Sin equipo asignado.' }))
    );
    slots.overflow.forEach((team) => sections.push(sectionHtml({ role: 'activo', team, title: teamLabel(team), patients: patientsFor(team), emptyText: '' })));
    if (!hidePostguardia) {
      sections.push(sectionHtml({
        role: 'postguardia', team: roles.postguardia, title: teamLabel(roles.postguardia, 'Post-guardia'), patients: patientsFor(roles.postguardia),
        emptyText: 'Sin equipo.', note: 'No presencial hoy. Sus pacientes pasan al resto del equipo.',
      }));
    }
  }
  return '<div class="ic-team-board">' + sinEquipoHtml(byTriage(unassigned)) + sections.join('') + '</div>';
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

/** "Mi equipo" strip: patients with no known team, each with a "Tomar" button (needs a team). */
function tomarStripHtml(unassigned, teamId) {
  if (!teamId || !unassigned.length) return '';
  const rows = byTriage(unassigned)
    .map((p) => {
      const id = escHtml(String(p.id));
      return (
        '<div class="ic-take__row">' +
        '<span class="ic-line__bed">' + escHtml(shortBed(p)) + '</span>' +
        '<span class="ic-line__name">' + escHtml(titleCaseName(p.nombre) || 'Sin nombre') + '</span>' +
        '<span class="ic-line__svc">' + svcHtml(p) + '</span>' +
        '<span class="ic-take__triage">' + icTriageTagHtml(p) + icTimerHtml(p) + '</span>' +
        '<button type="button" class="ic-take__btn" data-ic-take="' + id + '" data-ic-take-team="' + escHtml(String(teamId)) + '">Tomar</button>' +
        '</div>'
      );
    })
    .join('');
  return (
    '<section class="ic-take"><h3 class="ic-take__title">Sin equipo <span>' + unassigned.length + ' pacientes esperan</span></h3>' +
    '<div class="ic-lines ic-lines--sin">' + rows + '</div></section>'
  );
}

export function renderInterconsultaTeamViewHtml(patients, teams, now = new Date(), teamId = '') {
  const roles = getInterconsultaTeamRoles(teams, now);
  const isGuardiaTeam = !!roles.guardia && String(roles.guardia.team_id || '') === String(teamId);
  const known = computeKnownTeamIds(roles, laneSlots(roles));
  const unassigned = (patients || []).filter((p) => !known.has(String(p?.censusTeamId || '')));
  const mine = (patients || []).filter((p) => String(p?.censusTeamId || '') === String(teamId));
  const groups = groupByBucket(mine, isGuardiaTeam, now);
  const body = ['preop', 'pendientes', 'under']
    .filter((key) => groups[key].length)
    .map(
      (key) =>
        '<section class="ic-team-view__bucket"><h3 class="ic-team-view__label">' + BUCKET_LABELS[key] + ' · ' + groups[key].length + '</h3>' +
        '<div class="ic-lines" data-drop-team-id="' + escHtml(String(teamId)) + '">' + groups[key].map((p) => icRowHtml(p)).join('') + '</div></section>'
    )
    .join('');
  return '<div class="ic-team-view">' + tomarStripHtml(unassigned, teamId) + (body || '<p class="sv-none">Sin pacientes en este equipo.</p>') + '</div>';
}

/**
 * Mounts the board into `container` and wires drag/drop team reassignment.
 *
 * @param {HTMLElement} container
 * @param {object[]} patients
 * @param {object[]} teams
 * @param {{
 *   now?: Date|string,
 *   mode?: 'asignar'|'equipo',
 *   teamId?: string,
 *   filterGuardiaOnly?: boolean,
 *   hidePostguardia?: boolean,
 *   assignTeam?: (patientId: string, teamId: string) => Promise<any>,
 *   onAssignTeam?: (result: any) => void,
 * }} opts
 */
export function mountInterconsultaTeamBoard(container, patients, teams, opts = {}) {
  if (!container) return;
  const now = opts.now || new Date();
  container.innerHTML =
    opts.mode === 'equipo'
      ? renderInterconsultaTeamViewHtml(patients, teams, now, opts.teamId)
      : renderInterconsultaTeamBoardHtml(patients, teams, now, {
          filterGuardiaOnly: opts.filterGuardiaOnly,
          hidePostguardia: opts.hidePostguardia,
        });
  wireTeamBoardDragAndDrop(container, opts);
}

/** Drag an `.ic-line` from any row or the tray, drop it on any element with
 * `data-drop-team-id` ("" = Por asignar) to reassign that patient's team via
 * `opts.assignTeam`. Native HTML5 DnD — no library needed for a same-page move.
 * The listeners go on the container, which the header re-render keeps, so they
 * are attached once. */
function wireTeamBoardDragAndDrop(container, opts) {
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
