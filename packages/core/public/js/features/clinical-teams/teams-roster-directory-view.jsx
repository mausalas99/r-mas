/**
 * LAN directory modal body (`#clinical-directory-users-panel-body`): messages, toolbar, rank groups, user rows.
 * Preact: same DOM, classes and data-* hooks the string builders in teams-roster-directory-render.mjs made.
 * Data comes in as props (see directoryUsersModalBodyProps); wiring runs after the draw.
 */
import { render } from 'preact';

export function DirectoryMessage({ text }) {
  return <p class="clinical-teams-empty">{text}</p>;
}

function Options({ options }) {
  return options.map((o) => <option value={o.value} selected={o.selected}>{o.label}</option>);
}

export function DirectoryEmpty({ hostUsers, mergeDeferred }) {
  return (
    <>
      {hostUsers > 0 ? (
        mergeDeferred ? (
          <p class="clinical-teams-empty">El anfitrión reporta <strong>{hostUsers}</strong> perfil(es) registrados, pero la base clínica no pudo fusionarlos (sesión bloqueada). Desbloquea la base clínica y pulsa <strong>Actualizar desde ⇄</strong>.</p>
        ) : (
          <p class="clinical-teams-empty">El anfitrión ya tiene <strong>{hostUsers}</strong> perfil(es) en ⇄, pero aún no aparecen en esta Mac. Con LiveSync conectado, pulsa <strong>Actualizar desde ⇄</strong>.</p>
        )
      ) : null}
      <p class="clinical-teams-empty">Aún no hay otros @usuario en esta Mac. Cada residente debe conectarse a tu LAN, abrir <strong>⇄ → Unirse</strong> en la misma sala y guardar <strong>Mi rotación → Guardar perfil</strong>. Luego los asignas al equipo desde aquí (no hace falta que ya tengan equipo).</p>
    </>
  );
}

export function DirectoryToolbar({ salas, query, status, activity, sala }) {
  return (
    <div class="clinical-directory-toolbar">
      <label class="clinical-directory-search-wrap">
        <span class="visually-hidden">Buscar usuario</span>
        <input type="search" id="clinical-directory-search" class="profile-input clinical-directory-search" placeholder="Buscar @usuario o nombre…" value={query} autocomplete="off" />
      </label>
      <label class="clinical-directory-filter">
        <span class="clinical-directory-filter-label">Actividad</span>
        <select id="clinical-directory-activity-filter" class="profile-input">
          <option value="all" selected={activity === 'all'}>Todas</option>
          <option value="active" selected={activity === 'active'}>Activos (24 h)</option>
          <option value="inactive" selected={activity === 'inactive'}>Inactivos</option>
        </select>
      </label>
      <label class="clinical-directory-filter">
        <span class="clinical-directory-filter-label">Equipo</span>
        <select id="clinical-directory-status-filter" class="profile-input">
          <option value="all" selected={status === 'all'}>Todos</option>
          <option value="unassigned" selected={status === 'unassigned'}>Sin equipo</option>
          <option value="assigned" selected={status === 'assigned'}>Con equipo</option>
        </select>
      </label>
      <label class="clinical-directory-filter">
        <span class="clinical-directory-filter-label">Sala</span>
        <select id="clinical-directory-sala-filter" class="profile-input">
          <option value="" selected={!sala}>Todas</option>
          {salas.map((s) => <option value={s} selected={sala === s}>{s}</option>)}
        </select>
      </label>
      <span class="clinical-directory-match-count" aria-live="polite"></span>
    </div>
  );
}

export function DirectoryUserRow(r) {
  return (
    <article class="clinical-lan-user-card clinical-lan-user-row" data-user-id={r.userId} data-user-rank={r.rank} data-preferred-cycle={r.preferredCycle} data-sala={r.sala} data-has-team={r.hasTeam ? '1' : '0'} data-activity-tier={r.activityTier} data-search={r.search}>
      <div class="clinical-lan-user-card-main">
        <div class="clinical-lan-user-card-identity">
          {r.handle
            ? <span class="clinical-directory-users-handle">@{r.handle}</span>
            : <span class="clinical-directory-users-handle clinical-directory-users-handle--pending" title="Falta registrar @usuario en Mi rotación">sin @usuario</span>}
          <span class="clinical-directory-users-name" title={r.name}>{r.name}</span>
          <span class="clinical-lan-user-sala-chip">{r.sala || '—'}</span>
          <span class={`clinical-lan-user-activity-chip clinical-lan-user-activity-chip--${r.activityTier}`} title={r.activityDetail}>{r.activityLabel}</span>
        </div>
        <p class="clinical-lan-user-card-placement" title={r.placementLabel}>
          {r.hasTeam ? r.placementShort : <span class="clinical-directory-users-placement clinical-directory-users-placement--none">Sin equipo asignado</span>}
        </p>
        <p class="clinical-lan-user-card-activity">{r.activityDetail}</p>
      </div>
      <div class="clinical-lan-user-card-assign">
        <label class="visually-hidden" for={`clinical-lan-team-${r.userId}`}>Equipo</label>
        <select id={`clinical-lan-team-${r.userId}`} class="profile-input clinical-directory-assign-team" title="Asignar equipo"><Options options={r.teamOptions} /></select>
        <label class="visually-hidden" for={`clinical-lan-cycle-${r.userId}`}>Ciclo</label>
        <select id={`clinical-lan-cycle-${r.userId}`} class="profile-input clinical-directory-assign-cycle" title="Ciclo del integrante" disabled={!r.hasTeam}>
          {r.preferredCycle
            ? <option value={r.preferredCycle} selected>{r.cycleLabel}</option>
            : <option value="">— Ciclo —</option>}
        </select>
        <span class="clinical-directory-assign-actions" role="group" aria-label="Acciones">
          <button type="button" class="wb-btn wb-btn-primary wb-btn-lg clinical-directory-assign-btn" data-user-id={r.userId}>Asignar</button>
          <button type="button" class={`wb-btn wb-btn-danger-outline clinical-directory-delete-user-btn${r.canDelete ? '' : ' clinical-directory-delete-user-btn--placeholder'}`} data-user-id={r.userId} data-user-label={r.deleteLabel} title="Quitar de la base clínica (se publica por R+ Cloud)" {...(r.canDelete ? {} : { disabled: true, tabindex: -1, 'aria-hidden': 'true' })}>Quitar</button>
        </span>
      </div>
    </article>
  );
}

function RankGroup({ rank, open, rows }) {
  return (
    <details class="clinical-directory-rank-group" open={open} data-lan-rank-group={rank} data-lan-rank-count={rows.length}>
      <summary class="clinical-directory-rank-group-summary">
        <span class="clinical-directory-rank-group-title">{rank}</span>
        <span class="clinical-directory-rank-group-count">{rows.length}</span>
      </summary>
      <div class="clinical-lan-user-cards">
        {rows.map((r) => <DirectoryUserRow {...r} />)}
      </div>
    </details>
  );
}

export function DirectoryUsersModalBody(p) {
  if (p.empty) return <DirectoryEmpty hostUsers={p.hostUsers} mergeDeferred={p.mergeDeferred} />;
  return (
    <>
      <div class="clinical-directory-head">
        <p class="clinical-directory-users-modal-lead">Asigna residentes a equipos activos en esta Mac. <strong>Actualizar desde ⇄</strong> trae usuarios de todas las salas (Sala 1–E, Interconsultas, UX, Eme, etc.).{' '}
          <button type="button" class="wb-btn wb-btn-secondary clinical-directory-refresh-btn">Actualizar desde ⇄</button>
        </p>
        <DirectoryToolbar {...p.toolbar} />
      </div>
      {p.teamsHint ? <p class="clinical-teams-empty">Crea un equipo vacío en Mi rotación para poder asignar residentes.</p> : null}
      <div class="clinical-directory-rank-groups">
        {p.groups.map((g) => <RankGroup {...g} />)}
      </div>
    </>
  );
}

/** Draw a one-line message («Cargando…», load error) into the host. */
export function drawDirectoryMessage(host, text) {
  if (!host) return;
  render(null, host);
  render(<DirectoryMessage text={text} />, host);
}

/** Draw the directory body into the host. Callers wire the rows after. */
export function drawDirectoryBody(host, props) {
  if (!host) return;
  render(null, host);
  render(<DirectoryUsersModalBody {...props} />, host);
}
