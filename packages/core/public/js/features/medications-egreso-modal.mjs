/**
 * "Texto de egreso" modal — Manejo tab. Styled preview of the numbered
 * medication order lines + diet summary, with the Completa / Nombre + Día
 * toggle. Copiar still copies the same EMR-paste text the inline card uses
 * (unchanged clipboard contract); this modal only fixes the display.
 */
import { getMedRecetaByPatient } from '../app-state.mjs';
import { buildMedRecetaCopyText, buildMedRecetaNameOnlyText } from '../med-receta-core.mjs';
import { copyToClipboardSafe } from './soap-estado.mjs';
import { manejoDiaOpts } from './medications-utils.mjs';
import { buildMedEgresoListLines, buildMedEgresoDietSummaryLine } from './medications-egreso-text.mjs';
import { rt, medOutputTab, setMedOutputTabState } from './medications-runtime-state.mjs';
import { medToast } from './medications-runtime-state.mjs';

var MODAL_BACKDROP_ID = 'med-egreso-modal-backdrop';

function closeMedEgresoModal() {
  var backdrop = document.getElementById(MODAL_BACKDROP_ID);
  if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
}

async function renderMedEgresoModalContent() {
  var backdrop = document.getElementById(MODAL_BACKDROP_ID);
  if (!backdrop) return;
  var activeId = rt.getActiveId();
  var block = activeId ? getMedRecetaByPatient()[activeId] : null;
  var items = block && block.items ? block.items : [];
  var diaOpts = manejoDiaOpts(block && block.fechaActualizacion);
  var mode = medOutputTab === 'simple' ? 'simple' : 'full';
  var lines = buildMedEgresoListLines(items, diaOpts, mode);
  var dietLine = buildMedEgresoDietSummaryLine(block);
  (await import('./medications-egreso-modal-view.jsx')).drawEgresoModal(backdrop, { lines: lines, dietLine: dietLine, mode: mode });
}

/** Switches the modal's own toggle (shared medOutputTab state with the inline card). */
export function setMedEgresoModalTab(tab) {
  if (tab !== 'full' && tab !== 'simple') return;
  setMedOutputTabState(tab);
  renderMedEgresoModalContent();
}

export function copiarMedEgresoModalTexto() {
  var activeId = rt.getActiveId();
  var block = activeId ? getMedRecetaByPatient()[activeId] : null;
  if (!block || !block.items || !block.items.length) {
    medToast('No hay medicamentos procesados', 'error');
    return;
  }
  var diaOpts = manejoDiaOpts(block.fechaActualizacion);
  var text =
    medOutputTab === 'simple'
      ? buildMedRecetaNameOnlyText(block.items, diaOpts)
      : buildMedRecetaCopyText(block.items, diaOpts);
  if (!text.trim()) {
    medToast('No hay medicamentos activos para copiar', 'error');
    return;
  }
  copyToClipboardSafe(text).then(function (ok) {
    medToast(ok ? 'Medicamentos copiados al portapapeles' : 'Error al copiar al portapapeles', ok ? 'success' : 'error');
  });
}

/** Opens the "Texto de egreso" modal for the active patient. */
export function openMedEgresoModal() {
  var activeId = rt.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId]) {
    medToast('No hay medicamentos procesados', 'error');
    return;
  }
  closeMedEgresoModal();
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = MODAL_BACKDROP_ID;
  document.body.appendChild(backdrop);
  renderMedEgresoModalContent();
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeMedEgresoModal();
  });
}

export { closeMedEgresoModal };

export const windowHandlers = {
  openMedEgresoModal,
  closeMedEgresoModal,
  setMedEgresoModalTab,
  copiarMedEgresoModalTexto,
};
