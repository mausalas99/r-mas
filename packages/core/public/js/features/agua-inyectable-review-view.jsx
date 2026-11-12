/**
 * Agua inyectable review modal. Preact: same DOM, classes and data-* hooks the string builder in
 * agua-inyectable-review.mjs made. Drawn once into the scrim; the row states, count and Agregar
 * label are then edited in place by that module's refresh(), so nothing here may re-render.
 */
import { render } from 'preact';

export const VIAS = ['VIA ORAL', 'VIA SUBCUTANEA', 'VIA INTRAVENOSA', 'VIA INTRAMUSCULAR', 'VIA SUBLINGUAL', 'VIA TOPICA', 'VIA RECTAL'];

function sentenceCase(t) {
  const s = String(t || '').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Row({ a, i }) {
  const via = a.viaRaw || a.item.viaRaw;
  const id = 'agua-iny-name-' + i;
  const list = via && VIAS.indexOf(via) === -1 ? [via].concat(VIAS) : VIAS;
  return (
    <li class="wb-row agua-iny-row" data-row={String(i)}>
      <label class="rpc-switch"><input type="checkbox" class="rpc-switch-input" role="switch" data-f="add" checked aria-labelledby={id} />
        <span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label>
      <input class="agua-iny-in agua-iny-in--name" id={id} data-f="nombre" aria-label="Medicamento" value={a.farmaco} />
      <input class="agua-iny-in agua-iny-in--dose" data-f="dosis" aria-label="Dosis" placeholder="Falta dosis" value={a.dosis} />
      <select class="agua-iny-in" data-f="via" aria-label="Vía">
        {list.map((v) => <option value={v} selected={v === via}>{v}</option>)}
      </select>
      <p class="agua-iny-some">{'SOME: ' + sentenceCase(a.texto)}</p>
    </li>
  );
}

export function AguaInyModal({ alerts }) {
  return (
    <div class="wb-confirm-modal agua-iny-modal" role="dialog" aria-modal="true" aria-labelledby="agua-iny-title">
      <div class="wb-confirm-body">
        <span class="wb-confirm-title" id="agua-iny-title">Medicamentos dentro de agua inyectable</span>
        <span class="wb-confirm-message">SOME no los tiene en catálogo. Revisa nombre, dosis y vía de cada uno.</span>
      </div>
      <div class="agua-iny-table">
        <div class="wb-table-colhead agua-iny-grid" aria-hidden="true"><span>Agregar</span><span>Medicamento</span><span>Dosis</span><span>Vía</span></div>
        <ul class="agua-iny-list">{alerts.map((a, i) => <Row a={a} i={i} />)}</ul>
      </div>
      <div class="wb-confirm-footer wb-confirm-footer--rail">
        <span class="agua-iny-count" data-count=""></span>
        <div class="wb-confirm-footer-actions">
          <button type="button" class="wb-btn wb-btn-secondary" data-cancel="">Omitir todos</button>
          <button type="button" class="wb-btn wb-btn-primary" data-save="">Agregar</button>
        </div>
      </div>
    </div>
  );
}

export function drawAguaInyModal(scrim, alerts) {
  render(<AguaInyModal alerts={alerts} />, scrim);
}
