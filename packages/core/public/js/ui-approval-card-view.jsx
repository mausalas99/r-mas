/**
 * Destructive confirm dialog (title + lead + optional list), Preact.
 * Same markup ui-approval-card.mjs used to write as a string.
 */
import { render } from 'preact';

/** @param {{ title?: string, question?: string, items?: string[], confirmLabel?: string, cancelLabel?: string }} opts */
export function ConfirmDialog(opts) {
  let title = String(opts.title || '').trim();
  let lead = String(opts.question || '').trim();
  if (!title && lead) {
    title = lead;
    lead = '';
  }
  const items = Array.isArray(opts.items) ? opts.items.filter(Boolean) : [];
  return (
    <div class="lab-conflict-modal material-glass ui-overlay-dialog ui-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="ui-confirm-title">
      <div class="ui-confirm ui-approval-card ui-approval-card--confirm">
        <h3 class="ui-confirm-title" id="ui-confirm-title">{title}</h3>
        {lead ? <p class="ui-confirm-lead" id="ui-confirm-lead">{lead}</p> : null}
        {items.length ? <ul class="ui-confirm-list">{items.map((item) => <li>{item}</li>)}</ul> : null}
        <div class="ui-confirm-actions">
          <button type="button" class="wb-btn wb-btn-secondary ui-pressable" data-approval-cancel>{opts.cancelLabel || 'Cancelar'}</button>
          <button type="button" class="wb-btn wb-btn-danger ui-pressable" data-approval-confirm>{opts.confirmLabel || 'Eliminar'}</button>
        </div>
      </div>
    </div>
  );
}

/** Draw the dialog inside an existing backdrop element. */
export function drawConfirmDialog(backdrop, opts) {
  render(<ConfirmDialog {...(opts || {})} />, backdrop);
}
