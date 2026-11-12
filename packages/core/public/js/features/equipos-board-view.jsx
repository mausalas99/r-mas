/**
 * Equipos queue board markup (the ⇄ LAN dropdown card). Preact: same DOM, classes and ids the string
 * builders in equipos-board.mjs made. That file still owns fetching, the confirm dialogs and the click
 * handlers it attaches after each draw. Every draw replaces the host's contents.
 */
import { render } from 'preact';
import { DEVICE_LABELS, STATUS_LABELS } from '../../equipos/equipos-rotaciones.mjs';

// Same blanks as the old esc(): null, undefined and 0 print as nothing.
const s = (v) => String(v || '');

function DeviceRow({ dev, isAdmin }) {
  const label = DEVICE_LABELS[dev.device_type] || dev.device_type;
  const status = STATUS_LABELS[dev.status] || dev.status;
  return (
    <div class="equipos-desktop-row">
      <strong>{s(label)}</strong>{' — ' + s(status)}
      <div class="equipos-desktop-row-meta">
        {(dev.holder_name ? 'En uso: ' + s(dev.holder_name) + ' (' + s(dev.holder_rotation) + ')' : 'Disponible') + ' · Cola: ' + (dev.waitlist?.length || 0)}
      </div>
      {isAdmin && <button type="button" class="wb-btn wb-btn-danger-outline" data-purge={s(dev.device_type)}>Purgar cola</button>}
    </div>
  );
}

function Alert({ a }) {
  return (
    <div class="equipos-alert-banner" style="margin-bottom:8px;font-size:12px">
      {(a.kind === 'malfunction' ? 'Falla' : 'Material faltante') + ' — ' + s(DEVICE_LABELS[a.device_type])}
    </div>
  );
}

export function Board({ board, cloud, isAdmin }) {
  return (
    <>
      <div class="equipos-desktop-head">
        <span class="equipos-board-mode">Cloud</span>
        <a href={s(cloud.url)} target="_blank" rel="noopener" class="wb-btn wb-btn-secondary equipos-board-open-mobile">Abrir móvil</a>
      </div>
      <p class="equipos-board-storage-hint">Datos en Cloudflare (D1). No están en rplus-clinical.db local.</p>
      {(board.alerts || []).map((a) => <Alert a={a} />)}
      <div id="equipos-board-live">{(board.devices || []).map((d) => <DeviceRow dev={d} isAdmin={isAdmin} />)}</div>
      <div id="equipos-history-host" class="equipos-history-host" hidden></div>
      {isAdmin && (
        <div class="equipos-board-admin-actions">
          <button type="button" class="wb-btn wb-btn-secondary" id="btn-equipos-history">Historial de uso</button>
          <button type="button" class="wb-btn wb-btn-danger-outline" id="btn-equipos-purge-all">Purgar todo</button>
        </div>
      )}
    </>
  );
}

export const Message = ({ text }) => <p class="clinical-teams-empty">{s(text)}</p>;

/** Replace the host's contents with a one-line message (`{ message }`) or the board (`{ board, cloud, isAdmin }`). */
export function drawEquiposBoard(host, props) {
  render(null, host);
  host.textContent = '';
  render(props.message != null ? <Message text={props.message} /> : <Board {...props} />, host);
}
