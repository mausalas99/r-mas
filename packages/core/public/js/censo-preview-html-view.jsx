/**
 * Censo preview dialog and its «Columnas» checkboxes. Preact: same DOM the string builders in
 * censo-preview-html.mjs made. That file keeps the wiring, the hidden-columns memory and the
 * iframe. Every draw unmounts and empties the host first, so the DOM is rebuilt from scratch like
 * the old `innerHTML` swap.
 */
import { render } from 'preact';

export function CensoPreviewModal() {
  return (
    <div class="modal censo-preview-modal" role="dialog" aria-modal="true" aria-labelledby="censo-preview-title">
      <div class="censo-preview-modal-head">
        <h3 id="censo-preview-title" class="modal-title">Vista previa del censo</h3>
        <p class="profile-hint censo-preview-hint">Así se verá el PDF. Haz clic en una celda para editarla.</p>
        <div class="censo-col-chips" id="censo-preview-cols" role="group" aria-label="Columnas visibles" />
      </div>
      <iframe id="censo-preview-frame" class="censo-preview-frame" title="Vista previa del censo" />
      <div class="modal-actions">
        <button type="button" class="wb-btn wb-btn-secondary" id="censo-preview-close">Cerrar</button>
        <button type="button" class="wb-btn wb-btn-secondary" id="censo-preview-print">Imprimir</button>
        <button type="button" class="wb-btn wb-btn-primary wb-btn-lg" id="censo-preview-generate">Generar PDF</button>
      </div>
    </div>
  );
}

/** `cols` are the column defs ({ key, title }) without «num»; a column is checked unless its key is in `hidden`. */
export function CensoColumnChips({ cols, hidden }) {
  return (
    <>
      {cols.map((c) => (
        <label class="censo-col-chip">
          <input type="checkbox" data-censo-col={c.key} checked={hidden.indexOf(c.key) < 0} />
          {c.title}
        </label>
      ))}
    </>
  );
}

function redraw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawCensoPreviewModal = (backdrop) => redraw(backdrop, <CensoPreviewModal />);
export const drawCensoColumnChips = (host, cols, hidden) => redraw(host, <CensoColumnChips cols={cols} hidden={hidden} />);
