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

/** Sala card (`.sv-card`) plus what only interconsultas has: the requesting
 * service chip. `compact` (team rows, tray) is three short lines: bed, name,
 * service. Full cards (Mi equipo) add the motivo de IC. `archivable` adds the Sala
 * archive corner. */
export function icCardHtml(p, compact, archivable) {
  const id = escHtml(String(p.id));
  const svcName = String(getConsultInfo(p).requestingService || '').trim();
  const hue = requestingServiceHue(p);
  const svc = svcName
    ? '<span class="ic-svc"><i class="ic-svc__dot" style="--h:' + (hue == null ? 220 : hue) + '"></i>' + escHtml(svcName) + '</span>'
    : '<span class="sv-none">Sin servicio</span>';
  let motivo = '';
  if (!compact) {
    const reason = String(getConsultInfo(p).reason || '').trim();
    motivo =
      '<span class="sv-label">Motivo de IC</span>' +
      (reason ? '<span class="sv-motivo">' + escHtml(reason) + '</span>' : '<span class="sv-none">Sin motivo</span>');
  }
  // Compact cards sit under a heading or a team, which already say Críticos / Seguimiento.
  const triageTag = compact && ['critico', 'seguimiento'].includes(getConsultInfo(p).triage) ? '' : icTriageTagHtml(p);
  // A red dot stands in for the "Lab crítico" tag.
  const tags = cardTagsHtml(p).replace(
    '<span class="sv-tag sv-tag--dnr">Lab crítico</span>',
    '<span class="ic-crit-dot" title="Lab crítico" role="img" aria-label="Lab crítico"></span>'
  );
  return (
    '<div class="sv-card-wrap">' +
    '<button type="button" class="sv-card ic-card' + (compact ? ' ic-card--compact' : '') +
    '" title="' + escHtml(p.nombre || '') + '" draggable="true" data-ic-open="' + id + '" data-patient-id="' + id + '">' +
    '<span class="sv-card-top"><span class="sv-bed">' + escHtml(shortBed(p)) + '</span>' + triageTag + tags + '</span>' +
    '<span class="sv-name" title="' + escHtml([p.registro].filter(Boolean).join(' · ')) + '">' + escHtml(titleCaseName(p.nombre) || 'Sin nombre') + '</span>' +
    (compact ? '<span class="sv-ic">' + svc + '</span>' : '<span class="sv-label">Servicio solicitante</span><span class="sv-ic">' + svc + '</span>') +
    motivo +
    '</button>' +
    (archivable ? cornerBtnHtml(p) : '') +
    icTimerHtml(p) +
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

/** A team row. `team` null = empty slot: a slim, non-droppable placeholder. */
const MAX_CHIP_BEDS = 3;

/** Team chip body: a fixed-height line of bed pills ("+4 más" for the rest). Each pill opens the chart. */
function chipBedsHtml(patients) {
  const sorted = byTriage(patients);
  const pills = sorted
    .slice(0, MAX_CHIP_BEDS)
    .map((p) => {
      const bed = [p.cuarto, p.cama].map((x) => String(x || '').trim()).filter(Boolean).join(' · ') || 'Sin cama';
      return '<button type="button" class="ic-bed" data-ic-open="' + escHtml(String(p.id)) + '" title="' + escHtml(p.nombre || '') + '">' + escHtml(bed) + '</button>';
    })
    .join('');
  const more = sorted.length > MAX_CHIP_BEDS ? '<span class="ic-bed-more">+' + (sorted.length - MAX_CHIP_BEDS) + ' más</span>' : '';
  return pills + more || '<p class="ic-board-empty">Suelta un paciente aquí</p>';
}

function renderTeamRowHtml({ role, team, title, pill, note, emptyText, patients, buckets, isGuardiaTeam, now, chip }) {
  const count = team ? '<span class="sv-tag ic-row__count">' + patients.length + '</span>' : '';
  let body;
  if (!team) {
    body = '<p class="ic-board-empty">' + escHtml(emptyText) + '</p>';
  } else if (chip) {
    body = chipBedsHtml(patients);
  } else {
    const groups = groupByBucket(patients, isGuardiaTeam, now);
    body =
      buckets
        .filter((key) => groups[key].length)
        .map(
          (key) =>
            '<div class="ic-row__bucket' + (key === 'preop' ? ' ic-row__bucket--accent' : '') + '">' +
            '<span class="sv-label">' + BUCKET_LABELS[key] + ' · ' + groups[key].length + '</span>' +
            '<div class="ic-row__cards">' + groups[key].map((p) => icCardHtml(p, true)).join('') + '</div>' +
            '</div>'
        )
        .join('') || '<p class="ic-board-empty">Suelta un paciente aquí</p>';
  }
  const drop = team ? ' data-drop-team-id="' + escHtml(String(team.team_id || '')) + '"' : '';
  return (
    '<section class="ic-board-lane ic-row ic-row--' + role + (team ? '' : ' ic-row--empty') + '" data-role="' + role + '"' + drop + '>' +
    '<div class="ic-row__head">' +
    '<h3 class="ic-board-lane__title">' + escHtml(title) + '</h3>' +
    (pill ? '<span class="sv-tag ic-row__pill">' + escHtml(pill) + '</span>' : '') +
    count +
    (note ? '<span class="ic-row__note">' + escHtml(note) + '</span>' : '') +
    '</div>' +
    '<div class="ic-board-lane__body ic-row__body">' + body + '</div>' +
    '</section>'
  );
}

/** Tray groups: Urgentes = triage "Críticos"; everything else is Seguimiento. */
const TRAY_GROUPS = [
  { key: 'urgente', title: 'Urgentes', test: (p) => getConsultInfo(p).triage === 'critico' },
  { key: 'seguimiento', title: 'Seguimiento', test: (p) => getConsultInfo(p).triage !== 'critico' },
];

function renderTrayGroupHtml(group, patients) {
  const list = byTriage(patients.filter(group.test));
  if (!list.length) return '';
  return (
    '<div class="ic-tray__group"><div class="ic-tray__group-head">' +
    '<span class="ic-tray__dot ic-tray__dot--' + group.key + '"></span>' +
    '<h4 class="ic-tray__group-title">' + group.title + '</h4>' +
    '<span class="ic-tray__group-count">' + list.length + '</span></div>' +
    '<div class="sv-grid">' + list.map((p) => icCardHtml(p, true, true)).join('') + '</div></div>'
  );
}

function renderTrayHtml(patients) {
  const body = patients.length
    ? TRAY_GROUPS.map((g) => renderTrayGroupHtml(g, patients)).join('')
    : '<p class="ic-board-empty">Todos tienen equipo.</p>';
  return (
    '<section class="ic-board-lane ic-tray' + (patients.length ? '' : ' ic-tray--empty') + '" data-role="sin-equipo" data-drop-team-id="">' +
    '<div class="ic-row__head"><h3 class="ic-board-lane__title">Por asignar</h3>' +
    '<span class="sv-tag ic-row__count">' + patients.length + '</span>' +
    '<span class="ic-row__note">Arrastra cada tarjeta a un equipo</span></div>' +
    '<div class="ic-board-lane__body ic-tray__body">' + body + '</div>' +
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
  const row = (spec) => renderTeamRowHtml({ now, patients: patientsFor(spec.team), ...spec });

  const guardia = {
    role: 'guardia', team: roles.guardia, title: teamLabel(roles.guardia, 'Guardia'), pill: 'Guardia',
    emptyText: 'Sin equipo de guardia hoy.', isGuardiaTeam: true, buckets: ['preop', 'pendientes', 'under'],
  };
  if (filterGuardiaOnly) {
    return '<div class="ic-team-board ic-team-board--filtered">' + row({ ...guardia, buckets: ['preop'] }) + '</div>';
  }

  // While patients wait in the tray, teams stay one-line chips; once all are assigned they expand to full cards.
  const known = computeKnownTeamIds(roles, slots);
  const unassigned = (patients || []).filter((p) => !known.has(String(p?.censusTeamId || '')));
  const chip = unassigned.length > 0;
  const active = { isGuardiaTeam: false, buckets: ['pendientes', 'under'], chip };
  // Weekends: only the on-call team is present, so only its chip shows.
  const weekend = [0, 6].includes(new Date(now).getDay());
  const rows = weekend ? [row({ ...guardia, chip })] : [
    row({ ...guardia, chip }),
    ...slots.activo.map((team, i) =>
      row({ ...active, role: 'activo', team, title: teamLabel(team, 'Activo ' + (i + 1)), emptyText: 'Sin equipo asignado.' })
    ),
  ];
  if (!hidePostguardia && !weekend) {
    rows.push(
      row({
        ...active, role: 'postguardia', team: roles.postguardia,
        title: teamLabel(roles.postguardia, 'Post-guardia'), pill: 'Post-guardia',
        note: 'No presencial hoy — pacientes repartidos al resto del equipo.', emptyText: 'Sin equipo.',
      })
    );
  }
  for (const team of weekend ? [] : slots.overflow) {
    rows.push(row({ ...active, role: 'activo', team, title: teamLabel(team), emptyText: '' }));
  }

  return '<div class="ic-team-board' + (unassigned.length ? ' ic-team-board--sorting' : ' ic-team-board--expanded') + '"><div class="ic-rows">' + rows.join('') + '</div>' + renderTrayHtml(unassigned) + '</div>';
}

/** Teams that can be "mine", in board order: [{ id, label }]. Empty when no real team exists. */
export function interconsultaTeamOptions(teams, now = new Date()) {
  const roles = getInterconsultaTeamRoles(teams, now);
  const slots = laneSlots(roles);
  return [roles.guardia, ...slots.activo, roles.postguardia, ...slots.overflow]
    .filter(Boolean)
    .map((t) => ({ id: String(t.team_id || ''), label: teamLabel(t) }));
}

/** "Mi equipo" mode: one team's patients as full Sala cards, grouped by bucket. */
export function renderInterconsultaTeamViewHtml(patients, teams, now = new Date(), teamId = '') {
  const roles = getInterconsultaTeamRoles(teams, now);
  const isGuardiaTeam = !!roles.guardia && String(roles.guardia.team_id || '') === String(teamId);
  const mine = (patients || []).filter((p) => String(p?.censusTeamId || '') === String(teamId));
  const groups = groupByBucket(mine, isGuardiaTeam, now);
  const body = ['preop', 'pendientes', 'under']
    .filter((key) => groups[key].length)
    .map(
      (key) =>
        '<section class="ic-team-view__bucket"><h3 class="ic-team-view__label">' + BUCKET_LABELS[key] + ' · ' + groups[key].length + '</h3>' +
        '<div class="sv-grid" data-drop-team-id="' + escHtml(String(teamId)) + '">' + groups[key].map((p) => icCardHtml(p, false, true)).join('') + '</div></section>'
    )
    .join('');
  return '<div class="ic-team-view">' + (body || '<p class="sv-none">Sin pacientes en este equipo.</p>') + '</div>';
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

/** Drag a `.ic-card` from any row or the tray, drop it on any element with
 * `data-drop-team-id` ("" = Por asignar) to reassign that patient's team via
 * `opts.assignTeam`. Native HTML5 DnD — no library needed for a same-page move.
 * The listeners go on the container, which the header re-render keeps, so they
 * are attached once. */
function wireTeamBoardDragAndDrop(container, opts) {
  container._icDndOpts = opts;
  if (container.dataset.icDndWired) return;
  container.dataset.icDndWired = '1';
  const CARD = '.ic-card[data-patient-id]';
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
