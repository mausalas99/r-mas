/** Bulk text join/preview/apply for lab-repo batch import. */
import { buildBulkLabPreview, LAB_BULK_PATIENT_SEPARATOR } from '../lab-bulk-paste.mjs';
import {
  buildLabRepoPreviewBlocks,
  buildLabRepoBulkText,
  shouldSilentImportLabRepo,
} from './lab-repo-import-gate.mjs';
import { openLabBulkPreviewModal } from './lab-bulk-preview-modal.mjs';
import { finalizeBulkLabPaste } from './lab-panel-workbench.mjs';

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

export function finalizeJoinedBulkTexts(texts, rt) {
  var text = joinPatientBulkTexts(texts);
  if (!text) return { importedPatients: 0, totalOk: 0 };
  var blocks = previewBlocksFromBulkText(text, rt);
  var counts = countBlocksOkAndPatients(blocks);
  if (!counts.totalOk) return { importedPatients: 0, totalOk: 0 };
  finalizeBulkLabPaste(text, blocks, counts.totalOk);
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
        countBlocksOkAndPatients(reviewBlocks).totalOk
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
