/** Pure rules about which bulk-preview blocks offer "Agregar al censo". Shared by the modal and its list view. */
export function shouldOfferBulkPreviewAddPatient(block) {
  return !!(block && block.okReportCount > 0 && block.status === 'no-patient');
}

/** Same unregistered chart number as an earlier block: one add covers both. */
export function isRepeatOfEarlierMissingPatient(blocks, idx) {
  var key = blocks[idx] && blocks[idx].primaryExpediente;
  if (!key || !shouldOfferBulkPreviewAddPatient(blocks[idx])) return false;
  for (var i = 0; i < idx; i++) {
    if (blocks[i].primaryExpediente === key && shouldOfferBulkPreviewAddPatient(blocks[i])) return true;
  }
  return false;
}
