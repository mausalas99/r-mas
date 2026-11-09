/**
 * Body of the Estado actual «Historial» window (`#ea-vital-history-body`). Preact (Phase 3): same
 * DOM, classes and data-* hooks the string builders in estado-actual-panel-snapshot-html.mjs made.
 * The backdrop shell stays in overlays.html; estado-actual-vital-history-modal.mjs picks the view and
 * the title, and the delegated data-onclick handler still owns the «Capturar turnos» button.
 */
import { render } from 'preact';
import { ioTurnosBreakdown } from './estado-actual-io.mjs';

/** @param {{ entries: Array<{ value: string, unit?: string, stamp?: string, altered?: boolean }> }} props */
export function VitalHistoryList({ entries }) {
  if (!entries.length) return <p class="ea-muted">Sin lecturas registradas.</p>;
  return (
    <ol class="ea-vital-history-list">
      {entries.map((entry, idx) => {
        let cls = 'ea-vital-history-row' + (idx === 0 ? ' ea-vital-history-row--latest' : '');
        if (entry.altered) cls += ' ea-vital-history-row--altered';
        return (
          <li class={cls}>
            <div class="ea-vital-history-metric">
              <span class="ea-vital-history-value">{entry.value}</span>
              {entry.unit ? <span class="ea-vital-history-unit">{entry.unit}</span> : null}
            </div>
            <div class="ea-vital-history-meta">
              {entry.stamp ? <span class="ea-vital-history-stamp">{entry.stamp}</span> : null}
              {idx === 0 ? <span class="ea-vital-history-badge">Actual</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const cell = (v) => (v == null ? '—' : String(v));

/**
 * Tabla T1/T2/T3 del último registro con turnos: ingresos, egresos, balance y eventos.
 * @param {{ turnos: { ingTurnos?: unknown[], egrTurnos?: unknown[], eventos?: unknown[] } | null | undefined }} props
 */
export function TurnosBalance({ turnos }) {
  return (
    <>
      <table class="ea-turnos-table">
        <thead><tr><th>Turno</th><th>Ingresos</th><th>Egresos</th><th>Balance</th><th>Eventos</th></tr></thead>
        <tbody>
          {ioTurnosBreakdown(turnos).map((r) => {
            const num = typeof r.bal === 'number';
            const balCls = num ? (r.bal > 0 ? ' ea-balance-live--pos' : r.bal < 0 ? ' ea-balance-live--neg' : '') : '';
            return (
              <tr>
                <th scope="row">{r.turno}</th>
                <td>{cell(r.ing)}</td>
                <td>{cell(r.egr)}</td>
                <td class={'ea-turnos-bal' + balCls}>{num ? (r.bal > 0 ? '+' : '') + r.bal : cell(r.bal)}</td>
                <td class="ea-turnos-events">{r.eventos.map((e, i) => [i ? <br /> : null, e])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p class="ea-muted ea-turnos-foot">
        {turnos ? 'Valores en mL del último registro.' : 'Aún no hay ingresos ni egresos por turno.'}
      </p>
      <button type="button" class="ea-btn ea-turnos-add" data-onclick="closeEaVitalHistoryModal" data-onclick-2="openEstadoActualRegistroModal">Capturar turnos o evento</button>
    </>
  );
}

export const drawVitalHistoryList = (host, entries) => render(<VitalHistoryList entries={entries} />, host);
export const drawTurnosBalance = (host, turnos) => render(<TurnosBalance turnos={turnos} />, host);
