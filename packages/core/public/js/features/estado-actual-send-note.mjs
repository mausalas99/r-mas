import {
  applyEstadoActualToNote,
  buildNotePatchFromEstadoActual,
  noteEvolucionHasContent,
} from './note-from-estado-actual.mjs';

/**
 * Resuelve volcado de EA → nota de evolución.
 * @param {Record<string, unknown>} patient
 * @param {Record<string, unknown>} note
 * @param {{ replaceEvolucion?: boolean, getEstadoActualText?: (p: Record<string, unknown>) => string }} [options]
 * @returns {{ status: 'empty' | 'confirm' | 'applied', changed?: boolean }}
 */
export function resolveEaNoteSend(patient, note, options) {
  options = options || {};
  var patch = buildNotePatchFromEstadoActual(patient, {
    getEstadoActualText: options.getEstadoActualText,
  });
  if (!String(patch.evolucion || '').trim()) {
    return { status: 'empty' };
  }
  if (!options.replaceEvolucion && noteEvolucionHasContent(note)) {
    return { status: 'confirm' };
  }
  var changed = applyEstadoActualToNote(note, patch, {
    replaceEvolucion: !!options.replaceEvolucion,
  });
  return { status: 'applied', changed: changed };
}
