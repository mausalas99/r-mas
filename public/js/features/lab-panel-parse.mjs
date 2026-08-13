// Lab panel — procesar reporte y salida renderizada
import {
  looksLikeSomeLabReport,
} from '../labs.js';
import {
  buildBulkLabPreview,
  shouldShowBulkLabPreview,
} from '../lab-bulk-paste.mjs';
import {
  openLabBulkPreviewModal,
  shouldOfferBulkPreviewAddPatient,
} from './lab-bulk-preview-modal.mjs';
import { rt } from './lab-panel-runtime-state.mjs';
import { labPanelBridge } from './lab-panel-bridge.mjs';
import { finalizeBulkLabPaste } from './lab-panel-workbench.mjs';
import { autoAdmitStubPatientsFromBulkText } from './lab-bulk-stub-admit.mjs';
import {
  resolveLabOutputFechaBanner,
  updateLabPatientBanner,
  attachSomeTablesParsed,
  appendResLabChunksToBox,
  appendLabHourGroupHeader,
  syncLabOutputHistoryAfterRender,
  prepareLabOutputBox,
} from './lab-panel-output-helpers.mjs';

function runFinalizeWithFreshBlocks(text) {
  var admit = autoAdmitStubPatientsFromBulkText(text, rt.findPatientByRegistro, buildBulkLabPreview);
  if (admit.created.length) {
    rt.showToast(
      admit.created.length +
        ' paciente' +
        (admit.created.length === 1 ? '' : 's') +
        ' agregado' +
        (admit.created.length === 1 ? '' : 's') +
        ' al censo — completa ubicación',
      'success'
    );
  }
  var freshBlocks = admit.blocks;
  var freshTotal = freshBlocks.reduce(function (acc, b) {
    return acc + b.okReportCount;
  }, 0);
  finalizeBulkLabPaste(text, freshBlocks, freshTotal);
}

/** Un reporte de paciente nuevo: alta stub + procesar (completar ubicación desde sidebar). */
function tryOfferAddPatientThenProcess(text, blocks) {
  if (!blocks || blocks.length !== 1) return false;
  var block = blocks[0];
  if (!shouldOfferBulkPreviewAddPatient(block)) return false;
  runFinalizeWithFreshBlocks(text);
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
  var groups = opts && opts.dayGroups;
  if (groups && groups.length) {
    groups.forEach(function (group) {
      if (groups.length > 1) appendLabHourGroupHeader(box, group);
      appendResLabChunksToBox(
        box,
        group.resLabs,
        group.sourceText || src,
        result,
        rt.getLabOutputPrefs(),
        rt
      );
    });
  } else {
    appendResLabChunksToBox(box, resLabs, src, result, rt.getLabOutputPrefs(), rt);
  }
  document.getElementById('lab-output-section').style.display = 'block';
  var labRoot = document.getElementById('appcontent-lab');
  if (labRoot) labRoot.classList.remove('is-lab-chunk-loading');
  syncLabOutputHistoryAfterRender(opts, result, rt);
  labPanelBridge.syncLabOutputChrome();
  rt.wireAtbRisHoverPanels(box);
}
