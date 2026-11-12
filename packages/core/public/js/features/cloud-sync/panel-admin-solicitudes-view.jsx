/**
 * Administración · Solicitudes: the list of sala requests (pending or resolved). Preact: same DOM, classes and
 * data-* hooks the old HTML strings had. UI only: the panel's clicks are wired in panel-admin-solicitudes.mjs by
 * those hooks. Every draw replaces the host's contents (see `mount`).
 */
import { CLOUD_SALAS } from './sala-allowlist.mjs';
import { mount } from './panel-admin-view.jsx';

const WHEN = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

/** @param {{ status: string, assignedSala?: string|null }} r */
const statusText = (r) => (r.status === 'approved' ? 'Aprobada · ' + (r.assignedSala || '') : 'Rechazada');

/** What the list draws: one plain row per request. @param {object[]} rows @param {boolean} pending */
export function solicitudesModel(rows, pending) {
  return {
    pending,
    rows: rows.map((r) => ({
      id: r.id,
      who: r.displayName || r.username,
      username: r.username,
      when: WHEN.format(new Date(r.createdAt)),
      requested: r.requestedSala,
      status: statusText(r),
    })),
  };
}

function Row({ r, pending }) {
  return (
    <tr data-sol-id={r.id}>
      <td><b>{r.who}</b><br /><span class="cloud-sync-hint">@{r.username} · {r.when}</span></td>
      <td>{r.requested}</td>
      <td>
        {pending ? (
          <select class="cloud-sync-select" data-sol-sala="" aria-label="Sala asignada">
            {CLOUD_SALAS.map((s) => <option selected={s === r.requested}>{s}</option>)}
          </select>
        ) : r.status}
      </td>
      <td>
        {pending ? (
          <>
            <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-sol-reject="">Rechazar</button>{' '}
            <button type="button" class="cloud-sync-btn" data-sol-approve="">Aprobar</button>
          </>
        ) : null}
      </td>
    </tr>
  );
}

export function SolicitudesList({ model }) {
  if (!model.rows.length) {
    return <p class="cloud-sync-hint">{model.pending ? 'No hay solicitudes pendientes.' : 'Sin solicitudes resueltas.'}</p>;
  }
  return (
    <div class="cloud-sync-admin-table-wrap">
      <table class="cloud-sync-admin-table">
        <thead><tr><th>Persona</th><th>Pidió</th><th>{model.pending ? 'Asignar' : 'Estado'}</th><th></th></tr></thead>
        <tbody>{model.rows.map((r) => <Row r={r} pending={model.pending} />)}</tbody>
      </table>
    </div>
  );
}

export const drawSolicitudesList = (host, model) => mount(host, <SolicitudesList model={model} />);
