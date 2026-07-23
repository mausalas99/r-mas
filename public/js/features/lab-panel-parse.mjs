// Lab panel — procesar reporte y salida renderizada
import {
  looksLikeSomeLabReport,
} from '../labs.js';
import {
  buildBulkLabPreview,
  shouldShowBulkLabPreview,
  extractLabPatientFromBulkBlock,
} from '../lab-bulk-paste.mjs';
import {
  openLabBulkPreviewModal,
  shouldOfferBulkPreviewAddPatient,
} from './lab-bulk-preview-modal.mjs';
import { rt } from './lab-panel-runtime-state.mjs';
import { labPanelBridge } from './lab-panel-bridge.mjs';
import { finalizeBulkLabPaste } from './lab-panel-workbench.mjs';
import {
  resolveLabOutputFechaBanner,
  updateLabPatientBanner,
  attachSomeTablesParsed,
  appendResLabChunksToBox,
  syncLabOutputHistoryAfterRender,
  prepareLabOutputBox,
} from './lab-panel-output-helpers.mjs';

function runFinalizeWithFreshBlocks(text) {
  var freshBlocks = buildBulkLabPreview(text, { findPatientByRegistro: rt.findPatientByRegistro });
  var freshTotal = freshBlocks.reduce(function (acc, b) {
    return acc + b.okReportCount;
  }, 0);
  finalizeBulkLabPaste(text, freshBlocks, freshTotal);
}

/** Un reporte de paciente nuevo: alta directa, sin modal de confirmar. */
function tryOfferAddPatientThenProcess(text, blocks) {
  if (!blocks || blocks.length !== 1) return false;
  var block = blocks[0];
  if (!shouldOfferBulkPreviewAddPatient(block)) return false;
  if (typeof rt.openAddModalFromLabPatient !== 'function') return false;
  var labPatient = extractLabPatientFromBulkBlock(block);
  if (!labPatient) return false;
  rt.openAddModalFromLabPatient(labPatient, {
    fromBulkPreview: true,
    onSaved: function () {
      runFinalizeWithFreshBlocks(text);
    },
  });
  return true;
}

export function procesarReporte() {
  var text = document.getElementById('lab-input').value.trim();
  if (!text) { rt.showToast('Pega el texto del reporte primero', 'error'); return; }

  var blocks = buildBulkLabPreview(text, { findPatientByRegistro: rt.findPatientByRegistro });
  if (!blocks.length) {
    rt.showToast('No se detectaron reportes SOME en el texto pegado', 'error');
    return;
  }

  var totalOkReports = blocks.reduce(function (acc, b) {
    return acc + b.okReportCount;
  }, 0);
  if (!totalOkReports) {
    rt.showToast(
      looksLikeSomeLabReport(text)
        ? 'No se encontraron resultados de laboratorio en el texto pegado'
        : 'No parece un reporte de SOME. Copia desde «Expediente:» hasta el final del reporte.',
      'error'
    );
    return;
  }

  try {
    if (
      shouldShowBulkLabPreview(blocks, totalOkReports, {
        quickLabOutput: rt.getLabOutputPrefs().quickLabOutput,
      })
    ) {
      openLabBulkPreviewModal({
        blocks: blocks,
        sourceText: text,
        onConfirm: function () {
          runFinalizeWithFreshBlocks(text);
        },
      });
      return;
    }
    if (tryOfferAddPatientThenProcess(text, blocks)) return;
    finalizeBulkLabPaste(text, blocks, totalOkReports);
  } catch (e) {
    rt.showToast('Error al procesar el reporte', 'error');
    console.error(e);
  }
}

export function renderOutput(result, opts) {
  var patient = result.patient;
  var resLabs = result.resLabs;
  labPanelBridge.setActiveLab(result);
  if (!(opts && opts.fromHistory)) rt.onboardingAdvanceAfterParse();
  var fechaBanner = resolveLabOutputFechaBanner(patient);
  updateLabPatientBanner(patient, fechaBanner, rt.findPatientByRegistro);
  var box = prepareLabOutputBox(fechaBanner, rt);
  var src = String(result.sourceText || '').trim();
  attachSomeTablesParsed(result, src);
  appendResLabChunksToBox(box, resLabs, src, result, rt.getLabOutputPrefs(), rt);
  document.getElementById('lab-output-section').style.display = 'block';
  syncLabOutputHistoryAfterRender(opts, result, rt);
  labPanelBridge.syncLabOutputChrome();
  rt.wireAtbRisHoverPanels(box);
}
