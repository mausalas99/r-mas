/** "Texto de egreso" modal body (title row, tab toggle, order lines, diet line, footer). Preact; same markup the string builder made. Lazy-loaded by medications-egreso-modal.mjs. */
import { render } from 'preact';

export function EgresoModalContent({ lines, dietLine, mode }) {
  const tab = (id, label) => (
    <button
      id={'med-egreso-modal-tab-' + id}
      type="button"
      role="tab"
      aria-selected={mode === id ? 'true' : 'false'}
      class={'med-output-tab' + (mode === id ? ' active' : '')}
      data-onclick="setMedEgresoModalTab"
      data-onclick-args={'["' + id + '"]'}
    >{label}</button>
  );
  return (
    <div class="lab-conflict-modal med-egreso-modal" style="max-width:620px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;padding:0;gap:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;flex-shrink:0;">
        <span style="font-size:16px;font-weight:700;color:var(--text);">Texto de egreso</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="med-output-tabs" id="med-egreso-modal-tabs-track" role="tablist" aria-label="Vista de texto de medicamentos" data-active={mode === 'simple' ? 'simple' : 'full'}>
            <span class="med-output-tab-pill" aria-hidden="true"></span>
            {tab('full', 'Completa')}
            {tab('simple', 'Nombre + Día')}
          </span>
          <button type="button" class="wb-btn wb-btn-ghost wb-btn-icon" title="Cerrar" aria-label="Cerrar" data-onclick="closeMedEgresoModal">×</button>
        </div>
      </div>
      <div style="flex:1;min-height:0;overflow-y:auto;padding:16px 20px 18px;font-size:14px;line-height:1.6;color:var(--text);">
        {lines.length ? (
          <ol id="med-egreso-modal-list" style="margin:0;padding-left:22px;max-width:68ch;display:flex;flex-direction:column;gap:6px;">
            {lines.map((line) => <li>{line}</li>)}
          </ol>
        ) : (
          <p class="med-empty-hint" style="margin:0;">No hay medicamentos activos para mostrar.</p>
        )}
        {dietLine ? <p id="med-egreso-modal-summary" style="margin:12px 0 0;">{dietLine}</p> : null}
      </div>
      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px 12px 20px;flex-shrink:0;">
        <span style="flex:1;font-size:12px;color:var(--text-muted);">{lines.length + (lines.length === 1 ? ' va' : ' van') + ' a la receta de egreso. Los excluidos no.'}</span>
        <button type="button" class="wb-btn wb-btn-primary" data-onclick="copiarMedEgresoModalTexto">Copiar</button>
      </div>
    </div>
  );
}

export function drawEgresoModal(backdrop, props) {
  render(<EgresoModalContent {...props} />, backdrop);
}
