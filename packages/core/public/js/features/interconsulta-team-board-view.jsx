/**
 * Interconsulta team board markup. Preact: same DOM, classes, ids and data-* hooks the string builders
 * in interconsulta-team-board.mjs made. interconsulta-mode-chrome.mjs still owns every handler: it
 * delegates clicks on `data-ic-*`, moves focus with `.is-focused`, and ticks `[data-ic-since]`.
 * It repaints by replacing the whole mount node, so each mount draws into a fresh container.
 */
import { render } from 'preact';
import { getInterconsultaTeamRoles } from '../../../lib/clinical-scope/interconsulta-team-roles.mjs';
import { requestingServiceHue } from './patients-card-html.mjs';
import { getConsultInfo, icTimes, formatElapsed, TRIAGE_LABELS } from './patient-dashboard/consult-band.mjs';
import { cardTagsHtml } from './sala-view-variants.mjs';
import {
  BUCKET_LABELS, teamLabel, byTriage, groupByBucket, titleCaseName, shortBed, laneSlots,
  groupPatientsByTeamId, computeKnownTeamIds, wireTeamBoardDragAndDrop,
} from './interconsulta-team-board.mjs';

const svgProps = { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
const ArchiveIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...svgProps}><rect x="3" y="4" width="18" height="4" rx="1"></rect><path d="M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z"></path><path d="M10 12h4"></path></svg>
);
const RestoreIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...svgProps}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path></svg>
);

/** Archive / restore button of a "Mi equipo" row (same markup as sala-view-variants cornerBtnHtml). */
function CornerBtn({ p }) {
  const arch = !!p.archived;
  return (
    <button type="button" class={arch ? 'sv-card-restore' : 'sv-card-archive'} title={arch ? 'Restaurar a sala' : 'Archivar paciente'}
      aria-label={(arch ? 'Restaurar ' : 'Archivar ') + (p.nombre || 'paciente')}
      data-onclick="togglePatientArchived" data-onclick-args={JSON.stringify([p.id])} data-onclick-pass="event">
      {arch ? <><RestoreIcon /><span>Restaurar</span></> : <ArchiveIcon />}
    </button>
  );
}

/** Text tag for the triage group (VPO / IC / ...). Empty when no group is set. */
function TriageTag({ p }) {
  const key = getConsultInfo(p).triage;
  const label = TRIAGE_LABELS[key];
  return label ? <span class={'ic-tag ic-tag--' + key}>{label}</span> : null;
}

/** Response timer: start buttons, running clock (`data-ic-since` is ticked by the mode chrome), or the final time. */
function Timer({ p }) {
  const id = String(p.id);
  if (getConsultInfo(p).triage === 'seguimiento') return null;
  const { received, answered } = icTimes(p);
  if (received == null) {
    return (
      <div class="ic-timer">
        <button type="button" class="ic-timer__btn ic-timer__btn--go" data-ic-timer="start" data-ic-timer-id={id}>Recibida</button>
        <button type="button" class="ic-timer__link" data-ic-timer="followup" data-ic-timer-id={id}>Es seguimiento</button>
      </div>
    );
  }
  if (answered == null) {
    return (
      <div class="ic-timer">
        <span class="ic-timer__t" data-ic-since={String(received)}>{formatElapsed(Date.now() - received)}</span>
        <button type="button" class="ic-timer__btn" data-ic-timer="stop" data-ic-timer-id={id}>Respondida</button>
      </div>
    );
  }
  return <div class="ic-timer"><span class="ic-timer__t is-done">{formatElapsed(answered - received)}</span><span class="ic-timer__s">Respondida</span></div>;
}

/** Requesting service chip with its colored dot, shared by cards and rows. */
function Svc({ p }) {
  const svcName = String(getConsultInfo(p).requestingService || '').trim();
  const hue = requestingServiceHue(p);
  return svcName
    ? <span class="ic-svc"><i class="ic-svc__dot" style={'--h:' + (hue == null ? 220 : hue)}></i>{svcName}</span>
    : <span class="sv-none">Sin servicio</span>;
}

/** One-row patient line. Cells, in grid order: [grip], triage, critical-lab dot, bed, name,
 * requesting service, motivo, timer, then archive ("Mi equipo") or the "Asignar ▾" button
 * (`assign`, Por asignar rows). `grip` adds the drag handle first. */
export function IcRow({ p, assign = false, grip = false }) {
  const id = String(p.id);
  const reason = String(getConsultInfo(p).reason || '').trim();
  const triage = getConsultInfo(p).triage;
  return (
    <div class={'ic-line sv-card-wrap' + (grip ? ' ic-line--grip' : '') + (assign ? ' ic-line--assign' : '')} draggable="true" data-ic-line="" data-patient-id={id} data-ic-open={id}>
      {grip && (assign
        ? <span class="ic-line__grip" aria-hidden="true">⋮⋮</span>
        : <span class="ic-line__grip" data-ic-assign-open={id} role="button" title="Mover o quitar equipo" aria-label="Mover o quitar equipo">⋮⋮</span>)}
      <span class="ic-line__triage">{triage === 'seguimiento' ? <span class="ic-line__muted">Seguimiento</span> : <TriageTag p={p} />}</span>
      {/* A red dot stands in for the "Lab crítico" tag, as in the Sala cards. */}
      <span class="ic-line__crit">
        {cardTagsHtml(p).includes('Lab crítico') && <span class="ic-crit-dot" title="Lab crítico" role="img" aria-label="Lab crítico"></span>}
      </span>
      <span class="ic-line__bed">{shortBed(p)}</span>
      <span class="ic-line__name" title={[p.registro].filter(Boolean).join(' · ')}>{titleCaseName(p.nombre) || 'Sin nombre'}</span>
      <span class="ic-line__svc"><Svc p={p} /></span>
      <span class="ic-line__motivo">{reason || <span class="sv-none">Sin motivo</span>}</span>
      <span class="ic-line__timer">{assign ? null : <Timer p={p} />}</span>
      {assign
        ? <button type="button" class="ic-line__assign" data-ic-assign-open={id} aria-haspopup="menu">Asignar ▾</button>
        : <span class="ic-line__archive"><CornerBtn p={p} /></span>}
    </div>
  );
}

/** One Asignar section: heading with count, then a flat triage-sorted row list (no buckets). */
function Section({ role, team, title, patients, emptyText, note }) {
  const list = byTriage(patients);
  const drop = team ? { 'data-drop-team-id': String(team.team_id || '') } : {};
  let body;
  if (!team) body = <div class="ic-lines"><p class="ic-line__muted ic-lines__empty">{emptyText}</p></div>;
  else if (!list.length) body = <div class="ic-lines" {...drop}><p class="ic-line__muted ic-lines__empty">Suelta un paciente aquí</p></div>;
  else body = <div class="ic-lines" {...drop}>{list.map((p) => <IcRow p={p} grip />)}</div>;
  return (
    <section class={'ic-board-section ic-board-section--' + role} data-role={role} {...drop}>
      <h2 class="ic-board-section__title">{title} <span>{list.length}</span>{note ? <em>{note}</em> : null}</h2>
      {body}
    </section>
  );
}

/** "Por asignar" section: only shown while some patient has no known team. */
function SinEquipo({ unassigned }) {
  if (!unassigned.length) return null;
  return (
    <section class="ic-board-section ic-board-section--sin" data-role="sin-equipo" data-drop-team-id="">
      <h2 class="ic-board-section__title">Por asignar <span>{unassigned.length}</span><em>Elige un equipo con el menú o con las teclas 1 a 4</em></h2>
      <div class="ic-lines ic-lines--sin">{unassigned.map((p) => <IcRow p={p} assign grip />)}</div>
    </section>
  );
}

/**
 * "Asignar" mode.
 * @param {{ patients: object[], teams: object[], now?: Date|string, filterGuardiaOnly?: boolean, hidePostguardia?: boolean }} props
 *   patients — already scoped to interconsulta, each with `censusTeamId`; teams — all clinical teams.
 */
export function TeamBoard({ patients, teams, now = new Date(), filterGuardiaOnly = false, hidePostguardia = false }) {
  const roles = getInterconsultaTeamRoles(teams, now);
  const byTeam = groupPatientsByTeamId(patients);
  const patientsFor = (team) => (team ? byTeam.get(String(team.team_id || '')) || [] : []);
  const slots = laneSlots(roles);

  if (filterGuardiaOnly) {
    const preop = groupByBucket(patientsFor(roles.guardia), true, now).preop;
    return (
      <div class="ic-team-board ic-team-board--filtered">
        <Section role="guardia" team={roles.guardia} title={teamLabel(roles.guardia, 'Guardia')} patients={preop} emptyText="Sin equipo de guardia hoy." />
      </div>
    );
  }

  // Computed BEFORE hidePostguardia: postguardia's patients stay "known" even when its section is hidden.
  const known = computeKnownTeamIds(roles, slots);
  const unassigned = (patients || []).filter((p) => !known.has(String(p?.censusTeamId || '')));
  // Weekends: only the on-call team is present.
  const weekend = [0, 6].includes(new Date(now).getDay());
  return (
    <div class="ic-team-board">
      <SinEquipo unassigned={byTriage(unassigned)} />
      <Section role="guardia" team={roles.guardia} title={teamLabel(roles.guardia, 'Guardia')} patients={patientsFor(roles.guardia)} emptyText="Sin equipo de guardia hoy." />
      {!weekend && slots.activo.map((team, i) => (
        <Section role="activo" team={team} title={teamLabel(team, 'Activo ' + (i + 1))} patients={patientsFor(team)} emptyText="Sin equipo asignado." />
      ))}
      {!weekend && slots.overflow.map((team) => (
        <Section role="activo" team={team} title={teamLabel(team)} patients={patientsFor(team)} emptyText="" />
      ))}
      {!weekend && !hidePostguardia && (
        <Section role="postguardia" team={roles.postguardia} title={teamLabel(roles.postguardia, 'Post-guardia')} patients={patientsFor(roles.postguardia)}
          emptyText="Sin equipo." note="No presencial hoy. Sus pacientes pasan al resto del equipo." />
      )}
    </div>
  );
}

/** "Mi equipo" strip: patients with no known team, each with a "Tomar" button (needs a team). */
function TomarStrip({ unassigned, teamId }) {
  if (!teamId || !unassigned.length) return null;
  return (
    <section class="ic-take">
      <h3 class="ic-take__title">Sin equipo <span>{unassigned.length} pacientes esperan</span></h3>
      <div class="ic-lines ic-lines--sin">
        {byTriage(unassigned).map((p) => (
          <div class="ic-take__row">
            <span class="ic-line__bed">{shortBed(p)}</span>
            <span class="ic-line__name">{titleCaseName(p.nombre) || 'Sin nombre'}</span>
            <span class="ic-line__svc"><Svc p={p} /></span>
            <span class="ic-take__triage"><TriageTag p={p} /><Timer p={p} /></span>
            <button type="button" class="ic-take__btn" data-ic-take={String(p.id)} data-ic-take-team={String(teamId)}>Tomar</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Mi equipo" mode: one team's patients as rows, grouped by bucket. */
export function TeamView({ patients, teams, now = new Date(), teamId = '' }) {
  const roles = getInterconsultaTeamRoles(teams, now);
  const isGuardiaTeam = !!roles.guardia && String(roles.guardia.team_id || '') === String(teamId);
  const known = computeKnownTeamIds(roles, laneSlots(roles));
  const unassigned = (patients || []).filter((p) => !known.has(String(p?.censusTeamId || '')));
  const mine = (patients || []).filter((p) => String(p?.censusTeamId || '') === String(teamId));
  const groups = groupByBucket(mine, isGuardiaTeam, now);
  const keys = ['preop', 'pendientes', 'under'].filter((key) => groups[key].length);
  return (
    <div class="ic-team-view">
      <TomarStrip unassigned={unassigned} teamId={teamId} />
      {keys.length
        ? keys.map((key) => (
          <section class="ic-team-view__bucket">
            <h3 class="ic-team-view__label">{BUCKET_LABELS[key] + ' · ' + groups[key].length}</h3>
            <div class="ic-lines" data-drop-team-id={String(teamId)}>{groups[key].map((p) => <IcRow p={p} />)}</div>
          </section>
        ))
        : <p class="sv-none">Sin pacientes en este equipo.</p>}
    </div>
  );
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
  render(null, container); // unmount first: drag classes and timer ticks edit this DOM behind Preact's back
  render(
    opts.mode === 'equipo'
      ? <TeamView patients={patients} teams={teams} now={now} teamId={opts.teamId} />
      : <TeamBoard patients={patients} teams={teams} now={now} filterGuardiaOnly={opts.filterGuardiaOnly} hidePostguardia={opts.hidePostguardia} />,
    container,
  );
  wireTeamBoardDragAndDrop(container, opts);
}
