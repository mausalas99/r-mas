/**
 * Administración · Usuarios (equipos): the panel's frame and the user list. Preact: same DOM, classes and
 * data-* hooks the old HTML strings had. UI only: models come from panel-admin-equipos-html.mjs; clicks,
 * filters, bulk selection and the row menu's selects are wired in panel-admin-equipos-*.mjs by those hooks,
 * and the row's team/cycle selects are refilled in place while a row is edited. Every draw replaces the
 * host's contents, so edits made after a draw are dropped on the next one, as they were with innerHTML.
 */
import { Head, Refresh, mount } from './panel-admin-view.jsx';

const Options = ({ list }) => list.map((o) => <option value={o.value} selected={o.selected}>{o.label}</option>);

/** Revoke / role / disable / delete for one Nube account (the row menu, no toggle of its own). */
function NubeActions({ id, handle }) {
  return (
    <div class="cloud-sync-admin-row-actions cloud-sync-admin-row-actions--compact">
      <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="revoke-sessions" data-user-id={id} data-user-handle={handle}>Revocar</button>
      <select class="profile-input cloud-sync-admin-role-select" data-admin-promote-role="" data-user-id={id} title="Rol Nube" aria-label="Rol Nube">
        <option value="admin">Admin</option>
        <option value="program_admin">Admin programa</option>
        <option value="member" selected>Miembro</option>
      </select>
      <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="promote-user" data-user-id={id} data-user-handle={handle}>Rol</button>
      <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="disable-user" data-user-id={id} data-user-handle={handle}>Deshabilitar</button>
      <button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="delete-user" data-user-id={id} data-user-handle={handle}>Eliminar Nube</button>
    </div>
  );
}

function EquiposRow({ m }) {
  return (
    <article
      class="cloud-sync-admin-equipos-row"
      data-user-id={m.userId}
      data-cloud-id={m.cloudId}
      data-cloud-username={m.handle}
      data-cloud-display={m.display}
      data-user-rank={m.rank}
      data-sala={m.sala}
      data-has-team={m.hasTeam}
      data-new={m.isNew}
      data-idle={m.idle}
      data-activity={m.activityHas}
      data-search={m.search}
    >
      <div class="cloud-sync-admin-equipos-row-head">
        <div class="cloud-sync-admin-equipos-row-main">
          <div class="cloud-sync-admin-equipos-row-identity">
            <label class="cloud-sync-admin-equipos-check-label" title="Incluir en Guardar seleccionados">
              <input type="checkbox" class="cloud-sync-admin-equipos-check" data-admin-equipos-select="" />
            </label>
            <span class="cloud-sync-avatar" aria-hidden="true">{m.initials}</span>
            <span class="cloud-sync-admin-equipos-name">{m.name}</span>
            <span class="cloud-sync-admin-equipos-handle">@{m.handle}</span>
            {m.pending ? (
              <span class={'cloud-sync-admin-badge' + (m.pending.pending ? ' cloud-sync-admin-equipos-pending' : '')} title={m.pending.title}>{m.pending.text}</span>
            ) : null}
          </div>
          <div class="cloud-sync-admin-equipos-row-meta-line">
            <span class="cloud-sync-admin-equipos-meta">{m.meta}</span>
            <span class={'cloud-sync-admin-equipos-activity cloud-sync-admin-equipos-activity--' + m.activity.tier} title={m.activity.title}>{m.activity.text}</span>
            <span class="cloud-sync-admin-equipos-placement">
              {m.placement == null ? <span class="cloud-sync-admin-equipos-unassigned">Sin equipo</span> : m.placement}
            </span>
            {m.history ? (
              <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact cloud-sync-admin-equipos-history-btn" data-admin-action="equipos-activity-history" data-equipos-handle={m.history.handle} data-equipos-display={m.history.display} data-equipos-history={m.history.json}>
                Historial<span class="cloud-sync-admin-equipos-history-count">{m.history.total}</span>
              </button>
            ) : null}
          </div>
        </div>
        <details class="cloud-sync-admin-equipos-edit wb-menu">
          <summary class="cloud-sync-admin-equipos-edit-summary" title="Editar asignación y cuenta Nube">⋯</summary>
          <div class="wb-menu-panel cloud-sync-admin-equipos-menu-panel">
            <div class="cloud-sync-admin-equipos-assign">
              <label class="cloud-sync-admin-equipos-field">
                <span class="cloud-sync-admin-equipos-field-label">Sala</span>
                <select class="profile-input cloud-sync-admin-equipos-user-sala" aria-label="Sala"><Options list={m.salaOptions} /></select>
              </label>
              <label class="cloud-sync-admin-equipos-field cloud-sync-admin-equipos-field--rank">
                <span class="cloud-sync-admin-equipos-field-label">Rango</span>
                <select class="profile-input cloud-sync-admin-equipos-rank" aria-label="Rango"><Options list={m.rankOptions} /></select>
              </label>
              <label class="cloud-sync-admin-equipos-field cloud-sync-admin-equipos-field--team">
                <span class="cloud-sync-admin-equipos-field-label">Equipo</span>
                <select class="profile-input cloud-sync-admin-equipos-team" aria-label="Equipo">
                  <Options list={m.teamOptions.options} />
                  {m.teamOptions.groups.map((g) => <optgroup label={g.sala}><Options list={g.options} /></optgroup>)}
                </select>
              </label>
              <label class="cloud-sync-admin-equipos-field">
                <span class="cloud-sync-admin-equipos-field-label">Ciclo</span>
                <select class="profile-input cloud-sync-admin-equipos-cycle" aria-label="Ciclo" disabled={m.cycleDisabled}><Options list={m.cycleOptions} /></select>
              </label>
            </div>
            {m.cloudId || m.purge ? (
              <div class="cloud-sync-admin-equipos-row-btns" role="group" aria-label="Acciones">
                {m.cloudId ? (
                  <button type="button" class="cloud-sync-btn cloud-sync-btn--compact cloud-sync-admin-equipos-reset" data-admin-action="reset-password" data-user-id={m.cloudId} data-user-handle={m.handle} title="Definir contraseña temporal de Nube">Restablecer clave</button>
                ) : null}
                {m.purge ? (
                  <button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact cloud-sync-admin-equipos-quit" data-admin-action="purge-equipo-user" data-user-id={m.userId} data-cloud-id={m.cloudId} data-cloud-username={m.handle} title={m.purge.title}>Quitar</button>
                ) : null}
              </div>
            ) : null}
            {m.cloudId ? (
              <>
                <p class="cloud-sync-admin-equipos-menu-label">Cuenta Nube</p>
                <div class="cloud-sync-admin-equipos-nube-wrap"><NubeActions id={m.cloudId} handle={m.handle} /></div>
              </>
            ) : null}
          </div>
        </details>
      </div>
    </article>
  );
}

/** @param {{ groups: { label: string, rows: object[] }[] }} props */
export function EquiposList({ groups }) {
  if (!groups.length) {
    return <p class="cloud-sync-hint">No hay usuarios Nube ni perfiles clínicos locales para asignar.</p>;
  }
  return (
    <div class="cloud-sync-admin-equipos-list">
      {groups.map((g) => (
        <>
          <p class="cloud-sync-admin-equipos-group-label">{g.label}</p>
          {g.rows.map((m) => <EquiposRow m={m} />)}
        </>
      ))}
    </div>
  );
}

/** The panel's frame: search, chips, sala filter, bulk bar and the (still loading) list. */
export function EquiposShell({ chips }) {
  return (
    <>
      <Head
        title="Usuarios"
        sub={<span data-admin-equipos-summary="" title="Usuarios = filas de esta lista (perfil clínico + cuenta Nube). Cuentas Nube = @usuarios únicos. Membresías = inscripciones en salas de sync (un usuario en varias salas cuenta varias veces).">Cargando…</span>}
        right={
          <>
            <input type="search" class="profile-input cloud-sync-admin-search" data-admin-equipos-search="" placeholder="Buscar @usuario o nombre" aria-label="Buscar usuario" />
            <Refresh action="refresh-equipos" />
          </>
        }
      />
      <div class="cloud-sync-admin-filters">
        <div class="cloud-sync-admin-chips" role="group" aria-label="Filtrar usuarios">
          {chips.map(([id, label], i) => (
            <button type="button" class={'cloud-sync-admin-chip' + (i === 0 ? ' is-active' : '')} data-admin-equipos-chip={id} aria-pressed={i === 0 ? 'true' : 'false'}>{label} <b data-admin-equipos-chip-count={id}></b></button>
          ))}
        </div>
        <label class="cloud-sync-admin-filter cloud-sync-admin-filters-end" for="cloud-admin-equipos-sala">
          <span>Sala</span>
          <select id="cloud-admin-equipos-sala" class="profile-input" data-admin-equipos-sala=""><option value="">Todas</option></select>
        </label>
      </div>
      <p class="cloud-sync-hint cloud-sync-admin-equipos-hint">Marca usuarios y usa <strong>Guardar seleccionados</strong> o <strong>Quitar seleccionados</strong>; ··· en cada fila cambia sala, rango, equipo y ciclo, y la cuenta Nube (Restablecer clave, rol, sesiones). Los filtros no quitan las marcas.</p>
      <div class="cloud-sync-admin-equipos-bulk">
        <label class="cloud-sync-admin-equipos-select-all-label">
          <input type="checkbox" class="cloud-sync-admin-equipos-check" data-admin-equipos-select-all="" /> Seleccionar visibles
        </label>
        <div class="cloud-sync-admin-equipos-bulk-actions" data-admin-equipos-bulk-actions="" hidden>
          <span class="cloud-sync-admin-equipos-bulk-count" data-admin-equipos-bulk-count=""></span>
          <button type="button" class="cloud-sync-btn cloud-sync-btn--primary cloud-sync-btn--compact" data-admin-action="save-equipos-bulk">Guardar seleccionados</button>
          <button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="purge-equipos-bulk" title="Elimina cuentas Nube y/o perfiles clínicos de los marcados">Quitar seleccionados</button>
        </div>
      </div>
      <div data-admin-equipos-list=""><p class="cloud-sync-hint">Cargando usuarios y equipos…</p></div>
    </>
  );
}

export const drawEquiposShell = (host, chips) => mount(host, <EquiposShell chips={chips} />);
export const drawEquiposList = (host, groups) => mount(host, <EquiposList groups={groups} />);
