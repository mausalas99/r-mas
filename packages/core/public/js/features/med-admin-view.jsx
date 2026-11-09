/**
 * Medicamentos «Administración» markup: the daily dose grid, the hidden-meds footer and the PRN modal.
 * Preact (Phase 2): same DOM, classes and data-med-admin-* hooks the string builders drew.
 * med-admin-panel.mjs still owns the state, the click/keydown delegation and the row fitting.
 */
import { render } from 'preact';
import { medAdminScheduleForItem } from '../med-admin-schedule.mjs';
import { extractMedBaseName } from '../med-pharm-profile-core.mjs';
import { effectiveDiaTratamiento } from '../med-receta-dates.mjs';

function nowHHMM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

const prnCriterion = (dosisRaw) => String(dosisRaw || '').split('//').pop().trim();

function PrnFab({ count }) {
  return (
    <button type="button" class="med-admin-prn-fab" data-med-admin-open-prn>PRN<span class="med-admin-prn-fab-count">{count}</span></button>
  );
}

function Grid({ items, times, medAdmin, fecha, prnCount }) {
  return (
    <>
      <div class="med-pharm-grid-scope med-admin-panel">
        <div class="med-admin-head">
          <span class="med-admin-title">Administración</span>
          <span class="med-admin-sub">{'hoy · ' + items.length + ' medicamentos'}</span>
          {prnCount > 0 && <PrnFab count={prnCount} />}
        </div>
        <div class="some-grid-wrap med-pharm-scroll">
          <table class="some-grid-unified">
            <colgroup>
              <col class="col-med med-admin-col-med" />
              {times.map(() => <col class="col-day" />)}
            </colgroup>
            <thead>
              <tr class="hdr-row-1">
                <th class="col-meta-hdr col-med">Medicamento</th>
                {times.map((t) => <th class="day-hdr">{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const sched = medAdminScheduleForItem(item);
                const dia = item.diaTratamiento != null ? effectiveDiaTratamiento(item.diaTratamiento, fecha) : null;
                return (
                  <tr key={item.id}>
                    <td class="col-med">
                      <div class="med-admin-row-head">
                        <span class="med-cell-name" title={item.nombreRaw}>{extractMedBaseName(item.nombreRaw)}</span>
                        {dia != null && <span class="med-admin-dia-pill">{'día ' + dia}</span>}
                        <button type="button" class="med-admin-hide-btn" data-med-admin-hide={String(item.id)} aria-label={'Ocultar ' + item.nombreRaw + ' de la lista'}>×</button>
                      </div>
                    </td>
                    {times.map((t) => {
                      if (sched.defaultTimes.indexOf(t) === -1) return <td class="day-pad day-pad-empty"></td>;
                      const key = item.id + '|' + t;
                      const given = !medAdmin.notAdmin[key];
                      return (
                        <td class={'day-pad indicated' + (given ? '' : ' not-admin')} tabindex="0" role="button" data-med-admin-key={key} aria-pressed={String(given)}
                          aria-label={item.nombreRaw + ', toma de las ' + t + ', ' + (given ? 'administrada. Activar para marcar que no se dio.' : 'no administrada. Activar para marcar que sí se dio.')}></td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div class="med-admin-legend">
        <span><span class="med-admin-legend-swatch med-admin-legend-swatch--on"></span>Dado (por defecto)</span>
        <span><span class="med-admin-legend-swatch med-admin-legend-swatch--off"></span>No dado · clic en la toma</span>
      </div>
    </>
  );
}

function HiddenFooter({ hiddenItems, expanded }) {
  if (!hiddenItems.length) return null;
  const n = hiddenItems.length;
  return (
    <div class="med-admin-hidden-footer">
      <button type="button" class="med-admin-hidden-toggle" data-med-admin-toggle-hidden aria-expanded={String(!!expanded)}>
        <span class="rp-dot" aria-hidden="true"></span>{' ' + n + (n === 1 ? ' medicamento oculto' : ' medicamentos ocultos')}
      </button>
      {expanded && (
        <div class="med-admin-hidden-list">
          {hiddenItems.map((item) => (
            <div class="med-admin-hidden-row">
              <span title={item.nombreRaw}>{extractMedBaseName(item.nombreRaw)}</span>
              <button type="button" class="med-admin-unhide-btn" data-med-admin-unhide={String(item.id)}>Mostrar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** props: { items (visible), times, medAdmin, fecha, prnCount, hiddenItems, expanded } */
export function Panel(p) {
  return (
    <>
      {p.items.length
        ? <Grid {...p} />
        : <><div class="med-admin-panel med-admin-empty">Todos los medicamentos con horario están ocultos.</div>{p.prnCount > 0 && <PrnFab count={p.prnCount} />}</>}
      <HiddenFooter hiddenItems={p.hiddenItems} expanded={p.expanded} />
    </>
  );
}

function PrnRows({ prnItems, medAdmin }) {
  const log = (medAdmin && medAdmin.prnLog) || {};
  return prnItems.map((item) => {
    const times = (log[item.id] || []).slice().sort();
    return (
      <div class="med-admin-prn-row">
        <div class="med-admin-prn-info">
          <span class="med-admin-name">{item.nombreRaw}</span>
          <span class="med-admin-meta">{item.viaRaw + ' · ' + prnCriterion(item.dosisRaw)}</span>
          {times.length > 0 && (
            <div class="med-admin-prn-log">
              {times.map((t) => (
                <span class="med-admin-prn-chip">{t}<button type="button" class="med-admin-prn-chip-x" data-med-admin-prn-remove={item.id + '|' + t} aria-label={'Quitar registro de las ' + t}>×</button></span>
              ))}
            </div>
          )}
        </div>
        <div class="med-admin-prn-add">
          <input type="time" class="med-admin-prn-time" data-med-admin-prn-time={String(item.id)} value={nowHHMM()} />
          <button type="button" class="med-admin-prn-register" data-med-admin-prn-register={String(item.id)}>Registrar</button>
        </div>
      </div>
    );
  });
}

export function PrnModal({ prnItems, medAdmin }) {
  return (
    <div class="lab-conflict-modal med-admin-prn-modal">
      <div class="med-admin-prn-modal-header">
        <span class="med-admin-prn-modal-title">Registrar PRN</span>
        <button type="button" class="med-admin-prn-modal-close" data-med-admin-prn-close aria-label="Cerrar">×</button>
      </div>
      <div class="med-admin-prn-modal-subtitle">No se marcan por defecto. Elige la hora y registra cada dosis administrada.</div>
      <div class="med-admin-prn-modal-body"><PrnRows prnItems={prnItems} medAdmin={medAdmin} /></div>
    </div>
  );
}

/** Redraw from scratch: the cached expediente panes swap this host's children behind Preact's back. */
function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  if (vnode) render(vnode, host);
}

export const drawMedAdminPanel = (host, props) => draw(host, <Panel {...props} />);
export const drawMedAdminEmpty = (host) => draw(host, <div class="med-admin-panel med-admin-empty">Sin medicamentos activos en la receta.</div>);
export const clearMedAdminPanel = (host) => draw(host, null);
export const drawMedAdminPrnModal = (host, props) => draw(host, <PrnModal {...props} />);
