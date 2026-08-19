/**
 * "Texto de egreso" modal — Manejo tab. Styled preview of the numbered
 * medication order lines + diet summary, with the Completa / Nombre + Día
 * toggle. Copiar still copies the same EMR-paste text the inline card uses
 * (unchanged clipboard contract); this modal only fixes the display.
 */
import { getMedRecetaByPatient } from '../app-state.mjs';
import { buildMedRecetaCopyText, buildMedRecetaNameOnlyText } from '../med-receta-core.mjs';
import { esc } from '../dom-escape.mjs';
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

function buildEgresoListHtml(lines) {
  if (!lines.length) {
    return '<p class="med-empty-hint" style="margin:0;">No hay medicamentos activos para mostrar.</p>';
  }
  return (
    '<ol id="med-egreso-modal-list" style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:6px;">' +
    lines
      .map(function (line) {
        return '<li>' + esc(line) + '</li>';
      })
      .join('') +
    '</ol>'
  );
}

function buildSummaryHtml(dietLine) {
  if (!dietLine) return '';
  return '<p id="med-egreso-modal-summary" style="margin:12px 0 0;">' + esc(dietLine) + '</p>';
}

function buildEgresoModalHtml(lines, dietLine, mode) {
  return (
    '<div class="lab-conflict-modal" style="max-width:620px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;padding:0;gap:0;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0;">' +
    '<span style="font-size:14px;font-weight:700;color:var(--text);">Texto de egreso</span>' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<span class="med-output-tabs" id="med-egreso-modal-tabs-track" role="tablist" aria-label="Vista de texto de medicamentos" data-active="' +
    (mode === 'simple' ? 'simple' : 'full') +
    '">' +
    '<span class="med-output-tab-pill" aria-hidden="true"></span>' +
    '<button id="med-egreso-modal-tab-full" type="button" role="tab" aria-selected="' +
    (mode === 'full' ? 'true' : 'false') +
    '" class="med-output-tab' +
    (mode === 'full' ? ' active' : '') +
    '" onclick="setMedEgresoModalTab(\'full\')">Completa</button>' +
    '<button id="med-egreso-modal-tab-simple" type="button" role="tab" aria-selected="' +
    (mode === 'simple' ? 'true' : 'false') +
    '" class="med-output-tab' +
    (mode === 'simple' ? ' active' : '') +
    '" onclick="setMedEgresoModalTab(\'simple\')">Nombre + Día</button>' +
    '</span>' +
    '<button type="button" class="btn-generate" style="padding:7px 14px;font-size:12.5px;min-height:0;" onclick="copiarMedEgresoModalTexto()">Copiar</button>' +
    '<button type="button" title="Cerrar" aria-label="Cerrar" style="width:30px;height:30px;border:none;background:transparent;color:var(--text-muted);border-radius:8px;font-size:18px;line-height:1;cursor:pointer;" onclick="closeMedEgresoModal()">×</button>' +
    '</div></div>' +
    '<div style="flex:1;min-height:0;overflow-y:auto;padding:16px 18px 20px;font-family:var(--font-mono);font-size:12.5px;line-height:1.85;color:var(--text);">' +
    buildEgresoListHtml(lines) +
    buildSummaryHtml(dietLine) +
    '</div></div>'
  );
}

function renderMedEgresoModalContent() {
  var backdrop = document.getElementById(MODAL_BACKDROP_ID);
  if (!backdrop) return;
  var activeId = rt.getActiveId();
  var block = activeId ? getMedRecetaByPatient()[activeId] : null;
  var items = block && block.items ? block.items : [];
  var diaOpts = manejoDiaOpts(block && block.fechaActualizacion);
  var mode = medOutputTab === 'simple' ? 'simple' : 'full';
  var lines = buildMedEgresoListLines(items, diaOpts, mode);
  var dietLine = buildMedEgresoDietSummaryLine(block);
  backdrop.innerHTML = buildEgresoModalHtml(lines, dietLine, mode);
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
    medToast(ok ? 'Medicamentos copiados al portapapeles ✓' : 'Error al copiar al portapapeles', ok ? 'success' : 'error');
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
