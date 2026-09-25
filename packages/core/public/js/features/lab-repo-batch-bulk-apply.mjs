/** Bulk text join/preview/apply for lab-repo batch import. */
import { buildBulkLabPreview, LAB_BULK_PATIENT_SEPARATOR } from '../lab-bulk-paste.mjs';
import {
  buildLabRepoPreviewBlocks,
  buildLabRepoBulkText,
  shouldSilentImportLabRepo,
} from './lab-repo-import-gate.mjs';
import { openLabBulkPreviewModal } from './lab-bulk-preview-modal.mjs';
import { finalizeBulkLabPaste } from './lab-panel-workbench.mjs';
import { filterProcessableBulkBlocks, storeProcessableBulkBlocks } from './lab-panel-workbench-finalize.mjs';
import { autosendLabsEventualidadForStored } from './lab-eventualidad-autosend.mjs';

export function countBlocksOkAndPatients(blocks) {
  var totalOk = 0;
  var patientIds = new Set();
  (blocks || []).forEach(function (b) {
    totalOk += b && b.okReportCount ? b.okReportCount : 0;
    if (b && b.canProcess && b.patient && b.patient.id) {
      patientIds.add(String(b.patient.id));
    }
  });
  return { totalOk: totalOk, patientCount: patientIds.size };
}

export function joinPatientBulkTexts(texts) {
  return (texts || [])
    .map(function (t) {
      return String(t || '').trim();
    })
    .filter(Boolean)
    .join('\n\n' + LAB_BULK_PATIENT_SEPARATOR + '\n\n');
}

export function previewBlocksFromBulkText(text, rt) {
  if (typeof rt.rebuildBulkLabPreviewBlocks === 'function') {
    return rt.rebuildBulkLabPreviewBlocks(text);
  }
  return buildBulkLabPreview(text, { findPatientByRegistro: rt.findPatientByRegistro });
}

/**
 * Actualizar labs re-consulta el repositorio: la toma re-descargada reemplaza
 * el set existente en su fecha+hora (replaceOnMatch), no lo mezcla con lo viejo —
 * evita que se acumulen líneas repetidas o parcialmente corregidas al re-actualizar.
 */
export function finalizeJoinedBulkTexts(texts, rt) {
  var text = joinPatientBulkTexts(texts);
  if (!text) return { importedPatients: 0, totalOk: 0 };
  var blocks = previewBlocksFromBulkText(text, rt);
  var counts = countBlocksOkAndPatients(blocks);
  if (!counts.totalOk) return { importedPatients: 0, totalOk: 0 };
  finalizeBulkLabPaste(text, blocks, counts.totalOk, { replaceOnMatch: true });
  return { importedPatients: counts.patientCount, totalOk: counts.totalOk };
}

/**
 * @param {{ row: { id: string, registro: string }, studies: unknown[], errors: unknown[] }} g
 * @param {{ findPatientByRegistro: Function }} rt
 * @returns {{ text: string, silent: boolean, patientCount: number } | null}
 */
export function classifyPatientStudyGroup(g, rt) {
  if (!g || !g.studies || !g.studies.length) return null;
  var text = buildLabRepoBulkText(g.studies);
  if (!text) return null;
  var blocks = buildLabRepoPreviewBlocks(g.studies, rt.findPatientByRegistro);
  var counts = countBlocksOkAndPatients(blocks);
  if (!counts.totalOk) return { text: text, silent: false, patientCount: 0 };
  var registro = g.row && g.row.registro ? String(g.row.registro) : '';
  var gate = shouldSilentImportLabRepo({
    blocks: blocks,
    // Folio/PDF noise must not force review when usable labs already exist.
    fetchErrors: [],
    requestedRegistro: registro,
    activePatientRegistro: registro,
    activePatientId: g.row && g.row.id ? String(g.row.id) : null,
  });
  return {
    text: text,
    silent: !!gate.silent,
    patientCount: counts.patientCount || 1,
  };
}

/** Save one patient's labs without switching away from the open patient. */
function storePatientTextInBackground(text, rt) {
  var blocks = previewBlocksFromBulkText(text, rt);
  var summary = storeProcessableBulkBlocks(blocks, filterProcessableBulkBlocks(blocks), { replaceOnMatch: true });
  if (!summary.storedSets && !summary.mergedSets) return;
  void autosendLabsEventualidadForStored(summary.storedByPatient, {
    showToast: function (msg, type) {
      rt.showToast(msg, type);
    },
  });
}

/**
 * Apply one patient's studies the moment they arrive, so a long team run
 * shows each patient's labs as soon as that patient is done.
 * The open patient goes through the full paste flow (output + note refresh);
 * the others are saved in the background.
 * @returns {{ imported: number, reviewText: string }}
 */
export function applyBatchStudyGroupNow(g, rt) {
  var outcome = classifyPatientStudyGroup(g, rt);
  if (!outcome) return { imported: 0, reviewText: '' };
  if (!outcome.silent) return { imported: 0, reviewText: outcome.text };
  var activeId = typeof rt.getActiveId === 'function' ? String(rt.getActiveId() || '') : '';
  if (g.row && String(g.row.id) === activeId) finalizeJoinedBulkTexts([outcome.text], rt);
  else storePatientTextInBackground(outcome.text, rt);
  return { imported: outcome.patientCount, reviewText: '' };
}

export function openBatchReviewPreview(reviewTexts, rt) {
  var reviewText = joinPatientBulkTexts(reviewTexts);
  var reviewBlocks = previewBlocksFromBulkText(reviewText, rt);
  openLabBulkPreviewModal({
    blocks: reviewBlocks,
    sourceText: reviewText,
    onConfirm: function () {
      finalizeBulkLabPaste(
        reviewText,
        reviewBlocks,
        countBlocksOkAndPatients(reviewBlocks).totalOk,
        { replaceOnMatch: true }
      );
    },
  });
}

/**
 * Apply each patient's studies separately so mixed expedientes across the team
 * never collapse into one "Varios expedientes" block.
 * @param {{ row: { id: string, registro: string }, studies: unknown[], errors: unknown[] }[]} groups
 * @param {{ findPatientByRegistro: Function }} rt
 */
export function applyBatchStudyGroups(groups, rt) {
  var silentTexts = [];
  var reviewTexts = [];
  var importedPatients = 0;

  (groups || []).forEach(function (g) {
    var outcome = classifyPatientStudyGroup(g, rt);
    if (!outcome) return;
    if (outcome.silent) {
      silentTexts.push(outcome.text);
      importedPatients += outcome.patientCount;
      return;
    }
    reviewTexts.push(outcome.text);
  });

  if (silentTexts.length) finalizeJoinedBulkTexts(silentTexts, rt);
  if (!reviewTexts.length) {
    return { needsReview: false, importedPatients: importedPatients };
  }
  openBatchReviewPreview(reviewTexts, rt);
  return { needsReview: true, importedPatients: importedPatients };
}
