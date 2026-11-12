/**
 * Workbench undo toast, Preact. Same markup undo-toast.mjs used to write as a string.
 */
import { render } from 'preact';

/** @param {{ message?: string, undoLabel?: string }} p */
export function UndoToast({ message = '', undoLabel = 'Deshacer' }) {
  return (
    <div class="wb-undo-toast om-rise" role="status">
      <span class="wb-undo-toast-message">{message}</span>
      {undoLabel ? <button type="button" class="wb-undo-toast-btn" data-wb-undo>{undoLabel}</button> : null}
      <button type="button" class="wb-undo-toast-close" data-wb-undo-close aria-label="Cerrar aviso">×</button>
    </div>
  );
}

/** The toast element, ready to append anywhere (static markup; the caller wires the buttons). */
export function buildUndoToastElement(opts) {
  const host = document.createElement('div');
  render(<UndoToast message={opts.message} undoLabel={opts.undoLabel} />, host);
  return host.firstElementChild;
}
