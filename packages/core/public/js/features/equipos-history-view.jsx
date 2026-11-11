/**
 * Equipos custody history (the «Historial de uso» block): loading line, error line, and the sessions table.
 * Preact: same DOM and classes the old HTML strings had. UI only: the rows come from `sessionRows` in
 * equipos-history.mjs, which also wires the close button. Every draw replaces the host's contents.
 */
import { render } from 'preact';

function mount(host, vnode) {
  render(null, host);
  host.textContent = '';
  if (vnode) render(vnode, host);
}

const Loading = () => <p class="equipos-history-loading">Cargando historial…</p>;
const Message = ({ text }) => <p class="equipos-history-empty">{text}</p>;

export function HistoryPanel({ rows }) {
  return (
    <>
      <div class="equipos-history-head">
        <h3 class="equipos-history-title">Historial de uso</h3>
        <button type="button" class="wb-btn wb-btn-secondary equipos-history-close" data-eq-history-close="">Cerrar</button>
      </div>
      {rows.length ? (
        <div class="equipos-history-scroll">
          <table class="equipos-history-table">
            <thead>
              <tr><th>Equipo</th><th>Residente</th><th>Rotación</th><th>Tomó</th><th>Devolvió</th><th>Duración</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr><td>{r.device}</td><td>{r.holder}</td><td>{r.rotation}</td><td>{r.out}</td><td>{r.back}</td><td>{r.duration}</td><td>{r.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Message text="Sin registros de uso todavía." />
      )}
    </>
  );
}

export const drawHistoryLoading = (host) => mount(host, <Loading />);
export const drawHistoryError = (host, text) => mount(host, <Message text={text} />);
export const drawHistoryPanel = (host, rows) => mount(host, <HistoryPanel rows={rows} />);
export const clearHistory = (host) => mount(host, null);
