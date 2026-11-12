/**
 * Indicaciones / Nota preview dialog, Preact. Same markup doc-preview-html.mjs used to write as a string.
 * Static: doc-preview-html.mjs fills the title and iframe, and wires the buttons by id.
 */
import { render } from 'preact';

export function DocPreviewModal() {
  return (
    <div class="modal-backdrop censo-preview-backdrop" id="doc-preview-backdrop" aria-hidden="true">
      <div class="modal censo-preview-modal" role="dialog" aria-modal="true" aria-labelledby="doc-preview-title">
        <div class="censo-preview-modal-head">
          <h3 id="doc-preview-title" class="modal-title"></h3>
          <p class="profile-hint censo-preview-hint">Así se verá el documento. Para cambiar algo, cierra y edítalo.</p>
        </div>
        <iframe id="doc-preview-frame" class="censo-preview-frame" title="Vista previa"></iframe>
        <div class="modal-actions">
          <button type="button" class="wb-btn wb-btn-secondary" id="doc-preview-close">Cerrar</button>
          <button type="button" class="wb-btn wb-btn-secondary" id="doc-preview-print">Imprimir</button>
          <button type="button" class="wb-btn wb-btn-secondary rpc-doc-export" id="doc-preview-docx">Generar .docx</button>
          <button type="button" class="wb-btn wb-btn-primary wb-btn-lg rpc-doc-export" id="doc-preview-pdf">Generar PDF</button>
        </div>
      </div>
    </div>
  );
}

/** The backdrop element, ready to append to the body. */
export function buildDocPreviewElement() {
  const host = document.createElement('div');
  render(<DocPreviewModal />, host);
  return host.firstElementChild;
}
