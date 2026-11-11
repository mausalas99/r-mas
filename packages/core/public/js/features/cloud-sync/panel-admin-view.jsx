/**
 * Administración (Nube) sections that are redrawn whole when their data loads: Resumen (+ extras),
 * Salas, room detail, Pacientes (Red) and Registro. Preact: same DOM, classes and data-* hooks the
 * old HTML strings had. UI only: models come from panel-admin-html.mjs (resumenModel, salasModel,
 * networkCensusModel…); clicks, filters and checkboxes are still wired there by the data-admin-*
 * hooks, and the filters hide rows by toggling `hidden` on the drawn DOM. Every draw replaces the
 * host's contents (see `mount`), so imperative edits made after a draw are dropped on the next one,
 * as they were with innerHTML.
 */
import { render } from 'preact';

/** Drop what Preact drew before and anything written into the host by hand, then draw `vnode`. */
export function mount(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export function Head({ title, sub, right }) {
  // A <div>, not <header>: layout.css styles every <header> as the app bar.
  return (
    <div class="cloud-sync-admin-head">
      <div class="cloud-sync-admin-head-text">
        <h4 class="cloud-sync-admin-h">{title}</h4>
        {sub ? <p class="cloud-sync-admin-sub">{sub}</p> : null}
      </div>
      {right ? <div class="cloud-sync-admin-head-right">{right}</div> : null}
    </div>
  );
}

export const Refresh = ({ action }) => (
  <button type="button" class="cloud-sync-btn" data-admin-action={action}>Actualizar</button>
);

function StatCard({ label, value, meta, id }) {
  return (
    <div class="cloud-sync-admin-card" data-admin-stat={id || undefined}>
      <span class="cloud-sync-admin-card-label">{label}</span>
      <span class="cloud-sync-admin-card-value">{value}</span>
      <span class="cloud-sync-admin-card-meta">{meta}</span>
    </div>
  );
}

export function AdminResumen({ model }) {
  return (
    <>
      <Head title="Resumen" sub={model.sub} right={<Refresh action="refresh-resumen" />} />
      <div class="cloud-sync-admin-cards">{model.cards.map((c) => <StatCard {...c} />)}</div>
      <div class="cloud-sync-admin-resumen-extras" data-admin-resumen-extras=""></div>
    </>
  );
}

export function AdminResumenExtras({ model }) {
  return (
    <>
      {model.attention.length ? (
        <section class="cloud-sync-admin-block">
          <h5 class="cloud-sync-options-label">Necesita atención</h5>
          <div class="cloud-sync-inset-group">
            {model.attention.map((a) => (
              <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-admin-attention">
                <span>{a.text}</span>
                <button type="button" class="cloud-sync-btn" data-admin-tab={a.tab}>{a.cta}</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {model.space.length ? (
        <section class="cloud-sync-admin-block">
          <h5 class="cloud-sync-options-label">Espacio por sala</h5>
          <div class="cloud-sync-inset-group cloud-sync-admin-space">
            {model.space.map((s) => (
              <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-admin-space-row">
                <span class="cloud-sync-admin-space-name">{s.name}</span>
                <span class="cloud-sync-admin-space-track" aria-hidden="true"><span style={{ width: s.pct + '%' }}></span></span>
                <span class="cloud-sync-admin-space-value">{s.value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function SalaCard({ c }) {
  return (
    <article class={'cloud-sync-admin-sala' + (c.mine ? ' is-mine' : '')} data-admin-sala-card="" data-sala={c.sala} data-turn={c.turn}>
      <div class="cloud-sync-admin-sala-top">
        <h5 class="cloud-sync-admin-sala-name">{c.name}</h5>
        {c.mine ? <span class="cloud-sync-admin-pill">Tu sala</span> : null}
        <span class="cloud-sync-admin-sala-bytes">{c.bytes}</span>
      </div>
      <code class="cloud-sync-admin-sala-code">{c.code || '—'}</code>
      <p class="cloud-sync-admin-sala-meta">{c.meta}</p>
      <div class="cloud-sync-admin-sala-actions">
        <button type="button" class="cloud-sync-btn" data-admin-action="room-detail" data-room-id={c.id}>Ver detalle</button>
        <details class="cloud-sync-admin-more wb-menu">
          <summary class="cloud-sync-admin-more-btn" aria-label={c.moreLabel}>···</summary>
          <div class="wb-menu-panel">
            <button type="button" class="wb-menu-item" data-admin-action="rotate-code" data-room-id={c.id}>Cambiar código</button>
            <button type="button" class="wb-menu-item" data-admin-action="copy-room-invite" data-room-code={c.code}>Copiar invitación</button>
            <button type="button" class="wb-menu-item wb-menu-item--danger" data-admin-action="purge-room" data-room-id={c.id} data-room-code={c.code}>Purgar sala…</button>
          </div>
        </details>
      </div>
    </article>
  );
}

export function AdminSalas({ model }) {
  return (
    <>
      <Head title="Salas" sub="Cada sala de guardia tiene su propio espacio por mes." right={<Refresh action="refresh-salas" />} />
      <div class="cloud-sync-admin-filters">
        {model.months.length > 1 ? (
          <label class="cloud-sync-admin-filter">
            <span>Mes</span>
            <select class="profile-input" data-admin-salas-month="">
              {model.months.map((m) => <option value={m.key} selected={m.selected}>{m.label}</option>)}
              <option value="">Todos</option>
            </select>
          </label>
        ) : null}
        <input type="search" class="profile-input cloud-sync-admin-search" data-admin-salas-search="" placeholder="Buscar sala" aria-label="Buscar sala" />
      </div>
      {model.cards.length ? (
        <div class="cloud-sync-admin-sala-grid" data-admin-sala-grid="">{model.cards.map((c) => <SalaCard c={c} />)}</div>
      ) : (
        <p class="cloud-sync-hint">Sin salas todavía.</p>
      )}
      {model.detailHost ? <div class="cloud-sync-admin-room-detail" data-admin-room-detail=""></div> : null}
    </>
  );
}

export function AdminRoomDetail({ model }) {
  return (
    <>
      <p class="cloud-sync-room-title">{model.title}</p>
      <dl class="cloud-sync-room-meta">
        <div><dt>ID</dt><dd>{model.id}</dd></div>
        <div><dt>Mes</dt><dd>{model.month}</dd></div>
        <div><dt>Revisión</dt><dd>{model.revision}</dd></div>
        <div><dt>Storage</dt><dd>{model.storage}</dd></div>
      </dl>
      <p class="cloud-sync-hint">Miembros ({model.members.length})</p>
      {model.members.length ? (
        <div class="cloud-sync-admin-table-wrap">
          <table class="cloud-sync-admin-table">
            <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Unido</th></tr></thead>
            <tbody>
              {model.members.map((m) => (
                <tr><td>{m.username}</td><td>{m.displayName}</td><td>{m.role}</td><td>{m.joinedAt}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p class="cloud-sync-hint">Sin registros.</p>
      )}
      <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="close-room-detail">Cerrar detalle</button>
    </>
  );
}

function Select({ filter, label, children }) {
  return <select class="profile-input" data-network-filter={filter} aria-label={label}>{children}</select>;
}

function RedRow({ r, noTeam }) {
  const archived = r.archived ? '1' : '0';
  const roomId = String(r.roomId || '');
  const patientId = String(r.patientId || '');
  const registro = String(r.registro || '');
  return (
    <tr
      data-sala={r.sala}
      data-team-id={r.teamId || noTeam}
      data-archived={archived}
      data-inactive={r.inactive ? '1' : '0'}
      data-no-labs={r.lastLabAt ? '0' : '1'}
      data-search={(r.nombre + ' ' + r.registro).toLowerCase()}
      class={r.staleLabs ? 'cloud-sync-admin-row--stale-labs' : undefined}
    >
      <td>
        <input type="checkbox" data-network-select="" data-room-id={roomId} data-patient-id={patientId} data-registro={registro} data-archived={archived} aria-label="Seleccionar paciente" />
      </td>
      <td>{r.sala}</td>
      <td>{r.nombre}</td>
      <td>{r.cama}</td>
      <td>{r.cuarto}</td>
      <td>{r.servicio}</td>
      <td><span class={'cloud-sync-admin-dot is-' + r.estado.tone}></span>{r.estado.text}</td>
      <td>
        {r.activity ? (
          <>{r.activity.text}<br /><span class="cloud-sync-hint">{r.activity.who}</span></>
        ) : (
          <span class="cloud-sync-hint">Nadie del equipo</span>
        )}
      </td>
      <td>
        {r.labs.kind === 'never' ? <span class="cloud-sync-admin-stale-labs">Nunca</span>
          : r.labs.kind === 'nodata' ? <span class="cloud-sync-hint">Sin datos</span>
          : r.labs.kind === 'stale' ? <span class="cloud-sync-admin-stale-labs">{r.labs.text}</span>
          : r.labs.text}
      </td>
      <td>
        <div class="cloud-sync-admin-row-actions">
          <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="switch-network-room" data-room-code={String(r.code || '')} data-patient-id={patientId}>Abrir expediente</button>
          <details class="cloud-sync-admin-equipos-edit wb-menu">
            <summary class="cloud-sync-admin-equipos-edit-summary" title="Más acciones">⋯</summary>
            <div class="wb-menu-panel">
              <button type="button" class="wb-menu-item" data-admin-action="archive-network-patient" data-room-id={roomId} data-patient-id={patientId} data-archived={archived}>{r.archived ? 'Restaurar' : 'Archivar'}</button>
              <button type="button" class="wb-menu-item" data-admin-action="delete-network-patient" data-room-id={roomId} data-patient-id={patientId} data-registro={registro}>Eliminar</button>
            </div>
          </details>
        </div>
      </td>
    </tr>
  );
}

export function AdminRed({ model }) {
  return (
    <>
      <Head
        title="Pacientes"
        sub="Todos los pacientes de la red, con su sala actual."
        right={
          <>
            <input type="search" class="profile-input cloud-sync-admin-search" data-network-filter="q" placeholder="Buscar" aria-label="Buscar paciente o registro" />
            <Refresh action="refresh-red" />
          </>
        }
      />
      <div class="cloud-sync-admin-filters cloud-sync-admin-red-filters">
        <Select filter="sala" label="Filtrar por área">
          <option value="">Todas las áreas</option>
          {model.salas.map((s) => <option value={s}>{s}</option>)}
        </Select>
        <Select filter="team" label="Filtrar por equipo">
          <option value="">Todos los equipos</option>
          <option value={model.noTeamValue}>Sin equipo</option>
          {model.teams.map(([id, label]) => <option value={id}>{label}</option>)}
        </Select>
        <Select filter="activity" label="Filtrar por estado">
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos (7+ días)</option>
          <option value="archived">Archivados</option>
        </Select>
        <Select filter="labs" label="Filtrar por labs">
          <option value="">Todos</option>
          <option value="stale">Más de 6 días</option>
          <option value="fresh">Menos de 6 días</option>
        </Select>
        <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-admin-filters-end" data-admin-action="verify-red-labs" title="Consulta el repositorio de labs por cada paciente visible">Verificar labs</button>
      </div>
      {model.banner ? (
        <div class="cloud-sync-admin-banner" role="status">
          <span><b>{model.banner.text}</b> Parecen vacíos o repetidos.</span>
          <button type="button" class="cloud-sync-btn" data-admin-action="filter-unnamed">{model.banner.button}</button>
        </div>
      ) : null}
      {model.errorText ? <p class="cloud-sync-hint">{model.errorText}</p> : null}
      {model.rows.length ? (
        <div class="cloud-sync-admin-table-wrap">
          <table class="cloud-sync-admin-table">
            <thead>
              <tr>
                <th><input type="checkbox" data-network-select-all="" aria-label="Seleccionar todos los visibles" /></th>
                <th>Sala</th><th>Nombre</th><th>Cama</th><th>Cuarto</th><th>Servicio</th>
                <th>Estado</th><th>Últ. actividad del equipo</th><th>Últ. labs</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>{model.rows.map((r) => <RedRow r={r} noTeam={model.noTeamValue} />)}</tbody>
          </table>
        </div>
      ) : (
        <p class="cloud-sync-hint">Sin pacientes en ninguna área.</p>
      )}
      {/* Board: the action bar appears only after rows are picked. */}
      <div class="cloud-sync-admin-bulkbar" data-admin-red-bulk-actions="" hidden>
        <span class="cloud-sync-admin-equipos-bulk-count" data-admin-red-bulk-count=""></span>
        <button type="button" class="cloud-sync-btn" data-admin-action="bulk-archive-network">Archivar</button>
        <button type="button" class="cloud-sync-btn cloud-sync-btn--danger" data-admin-action="bulk-delete-network">Eliminar…</button>
        <button type="button" class="cloud-sync-admin-bulkbar-close" data-admin-action="clear-network-selection" aria-label="Quitar selección">×</button>
      </div>
    </>
  );
}

function MutationEvent({ e }) {
  return (
    <details class="cloud-sync-admin-event">
      <summary>
        <span class="cloud-sync-avatar" aria-hidden="true">{e.initials}</span>
        <span class="cloud-sync-options-entry-text">
          <span><b>{e.who}</b> {e.verb}</span>
          <span class="cloud-sync-admin-event-meta">{e.meta}</span>
        </span>
        <span class="cloud-sync-admin-event-time">{e.time}</span>
      </summary>
      <dl class="cloud-sync-admin-event-kv">
        <dt>Qué cambió</dt><dd>{e.path}</dd>
        <dt>Operaciones</dt><dd>{e.opCount}</dd>
        <dt>Equipo</dt><dd>{e.mutationId}</dd>
        <dt>ID de usuario</dt><dd>{e.actorId}</dd>
      </dl>
      <code class="cloud-sync-admin-ops" tabindex={0}>{e.ops}</code>
    </details>
  );
}

export function AdminMutations({ model }) {
  return (
    <>
      <div class="cloud-sync-admin-cards">{model.cards.map((c) => <StatCard {...c} />)}</div>
      <div class="cloud-sync-inset-group cloud-sync-admin-events">
        {model.items.map((it) => (it.group ? <div class="cloud-sync-admin-event-group">{it.group}</div> : <MutationEvent e={it.event} />))}
      </div>
    </>
  );
}

const Icon = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{children}</svg>
);

const ICONS = {
  resumen: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  salas: <><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" /><path d="M2 21h20" /><path d="M14 12h.01" /></>,
  red: <><path d="M2 18V6" /><path d="M2 14h20v4" /><path d="M22 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="10.5" r="2" /></>,
  equipos: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14a6 6 0 0 1 3.5 6" /></>,
  solicitudes: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6" /><path d="M22 11h-6" /></>,
  mutaciones: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  peligro: <><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4" /><path d="M12 17h.01" /></>,
};

function NavItem({ t, active }) {
  return (
    <button type="button" class={'cloud-sync-admin-nav-item' + (t.danger ? ' cloud-sync-admin-nav-item--danger' : '') + (active ? ' is-active' : '')} role="tab" data-admin-tab={t.id} aria-selected={active ? 'true' : 'false'}>
      <Icon>{ICONS[t.id]}</Icon>
      <span>{t.label}</span>
      {t.count ? <span class="cloud-sync-admin-nav-count" data-admin-count={t.id}></span> : null}
    </button>
  );
}

const Skeleton = () => (
  <div class="cloud-sync-admin-skeleton" aria-busy="true" aria-label="Cargando">
    <span class="cloud-sync-admin-skeleton-bar"></span>
    <span class="cloud-sync-admin-skeleton-bar"></span>
    <span class="cloud-sync-admin-skeleton-bar cloud-sync-admin-skeleton-bar--short"></span>
  </div>
);

/** The panel's frame: side menu, optional key box and one (hidden but the first) panel per section. */
export function AdminShell({ model }) {
  return (
    <div class="cloud-sync-admin-shell">
      <nav class="cloud-sync-admin-nav" role="tablist" aria-orientation="vertical" aria-label="Secciones de administración">
        {model.main.map((t, i) => <NavItem t={t} active={i === 0} />)}
        <span class="cloud-sync-admin-nav-spacer" aria-hidden="true"></span>
        {model.danger.map((t) => <NavItem t={t} active={false} />)}
      </nav>
      <div class="cloud-sync-admin-main">
        {model.showBootstrap ? (
          <div class="cloud-sync-admin-bootstrap" data-admin-bootstrap="">
            <p class="cloud-sync-hint">Clave de administración (solo esta sesión) para promover tu cuenta.</p>
            <div class="cloud-sync-field">
              <label for="cloud-sync-admin-key">Clave de sesión</label>
              <input id="cloud-sync-admin-key" type="password" class="profile-input" data-admin-key-input="" autocomplete="off" spellcheck="false" placeholder="Clave de sesión" />
            </div>
            <div class="cloud-sync-admin-bootstrap-actions">
              <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="save-key">Guardar clave</button>
              <button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-admin-action="promote-self">Promover a admin</button>
            </div>
          </div>
        ) : null}
        <div class="cloud-sync-admin-panels">
          {model.panels.map((p) => (
            <div class="cloud-sync-admin-panel" role="tabpanel" data-admin-section={p.id} {...{ ['data-admin-' + p.id]: '' }} hidden={p.hidden}>
              {p.skeleton ? <Skeleton /> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Registro: the room menu is filled in place later; the list loads when a sala is picked. */
export const AdminMutacionesShell = () => (
  <>
    <Head
      title="Registro de cambios"
      sub="Quién cambió qué, en cada sala. Se carga solo al elegir sala."
      right={<select class="profile-input cloud-sync-admin-search" data-admin-mutations-room="" aria-label="Sala"><option value="">— Elige una sala —</option></select>}
    />
    <div data-admin-mutations-list=""></div>
  </>
);

export const AdminPeligro = () => (
  <>
    <Head title="Zona de peligro" sub="Solo afecta datos en Nube. Lo guardado en cada equipo no se borra." />
    <div class="cloud-sync-admin-danger">
      <section class="cloud-sync-admin-danger-card">
        <h5 class="cloud-sync-admin-danger-title">Purgar sala</h5>
        <p class="cloud-sync-hint">Elimina miembros, cambios, estado y la sala. No se puede deshacer.</p>
        <div class="cloud-sync-admin-toolbar">
          <label class="cloud-sync-admin-toolbar-label" for="cloud-admin-peligro-room">Sala</label>
          <select id="cloud-admin-peligro-room" class="profile-input" data-admin-peligro-room=""><option value="">— Elige una sala —</option></select>
          <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="purge-room-selected">Purgar…</button>
        </div>
      </section>
      <section class="cloud-sync-admin-danger-card">
        <h5 class="cloud-sync-admin-danger-title">Cuentas</h5>
        <p class="cloud-sync-hint">Revocar sesiones, deshabilitar o borrar cuentas se hace en Usuarios.</p>
        <button type="button" class="cloud-sync-btn" data-admin-tab="equipos">Ir a Usuarios</button>
      </section>
    </div>
  </>
);

export const AdminSolicitudesShell = () => (
  <>
    <div class="cloud-sync-admin-toolbar">
      <button type="button" class="cloud-sync-btn is-active" data-sol-filter="pending">Pendientes</button>
      <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-sol-filter="resolved">Resueltas</button>
    </div>
    <div data-sol-list=""></div>
    <p class="cloud-sync-hint">Al aprobar, la persona entra a la sala y aparece en la lista de usuarios clínicos.</p>
  </>
);

export const AdminError = ({ message }) => <p class="cloud-sync-admin-error">{message}</p>;
export const AdminHint = ({ text }) => <p class="cloud-sync-hint">{text}</p>;

export const drawAdminShell = (host, model) => mount(host, <AdminShell model={model} />);
export const drawAdminMutacionesShell = (host) => mount(host, <AdminMutacionesShell />);
export const drawAdminPeligro = (host) => mount(host, <AdminPeligro />);
export const drawAdminSolicitudesShell = (host) => mount(host, <AdminSolicitudesShell />);
export const drawAdminError = (host, message) => mount(host, <AdminError message={message} />);
export const drawAdminHint = (host, text) => mount(host, <AdminHint text={text} />);

export const drawAdminResumen = (host, model) => mount(host, <AdminResumen model={model} />);
export const drawAdminResumenExtras = (host, model) => mount(host, <AdminResumenExtras model={model} />);
export const drawAdminSalas = (host, model) => mount(host, <AdminSalas model={model} />);
export const drawAdminRoomDetail = (host, model) => mount(host, <AdminRoomDetail model={model} />);
export const drawAdminRed = (host, model) => mount(host, <AdminRed model={model} />);
export const drawAdminMutations = (host, model) => mount(host, <AdminMutations model={model} />);
