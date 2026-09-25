/**
 * Auto-alta de pacientes detectados en pegado masivo (stub sin ubicación).
 */
import { extractLabPatientFromBulkBlock } from '../lab-bulk-paste.mjs';
import { shouldOfferBulkPreviewAddPatient } from './lab-bulk-preview-modal.mjs';
import { commitStubPatientFromLab } from './patients-modal-commit.mjs';

/**
 * @param {object[]} blocks
 * @returns {object[]} pacientes creados o ya existentes
 */
export function autoAdmitStubPatientsFromBulkBlocks(blocks) {
  var admitted = [];
  (blocks || []).forEach(function (block) {
    if (!shouldOfferBulkPreviewAddPatient(block)) return;
    var labPatient = extractLabPatientFromBulkBlock(block);
    if (!labPatient) return;
    var patient = commitStubPatientFromLab(labPatient);
    if (patient) admitted.push(patient);
  });
  return admitted;
}

/**
 * @param {string} text
 * @param {Function} findPatientByRegistro
 * @param {import('../lab-bulk-paste.mjs').buildBulkLabPreview} buildPreview
 */
export function autoAdmitStubPatientsFromBulkText(text, findPatientByRegistro, buildPreview) {
  var initial = buildPreview(text, { findPatientByRegistro: findPatientByRegistro });
  var created = autoAdmitStubPatientsFromBulkBlocks(initial);
  if (!created.length) return { created: [], blocks: initial };
  var rebuilt = buildPreview(text, { findPatientByRegistro: findPatientByRegistro });
  return { created: created, blocks: rebuilt };
}
