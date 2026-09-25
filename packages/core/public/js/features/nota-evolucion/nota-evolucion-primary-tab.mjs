/**
 * "Nota de evolución" tab in Paciente. One merged screen: the classic .docx
 * fields (notes-indicaciones.mjs `renderNoteForm`) laid out S / O / A / P so
 * the whole note fits without scrolling. The old separate S/O/A/P screen and
 * its "Plantilla clásica" toggle were merged into this on 2026-09-23.
 */
import { renderNoteForm } from '../notes-indicaciones.mjs';

/** Renders the note into `#note-form` when it is in the DOM. */
export function renderNotaEvolucionPrimaryTab() {
  if (typeof document === 'undefined' || !document.getElementById('note-form')) return;
  renderNoteForm();
}

/** Kept for callers that used to force the classic view — there is one view now. */
export const showNotaEvolucionClassicView = renderNotaEvolucionPrimaryTab;

export const windowHandlers = {
  renderNotaEvolucionPrimaryTab,
};
