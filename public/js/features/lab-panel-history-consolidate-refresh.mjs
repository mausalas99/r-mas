/**
 * Post-consolidate UI refresh: clear stale activeLab so renderLabHistoryPanel
 * reloads the merged keeper without requiring a page refresh.
 *
 * @param {{
 *   persistClinicalState: (opts?: object) => void,
 *   setActiveLab: (v: null) => void,
 *   renderLabHistoryPanel: () => void,
 *   refreshTendenciasOrCultivosPanel: () => void,
 *   setLabHistorySelectedSetId?: (pid: string, setId: string) => void,
 *   syncEstudiosTextarea?: (patientId: string) => void,
 *   addAuditEntry?: (action: string, status: string, n: number, detail: string) => void,
 *   showToast?: (msg: string, kind: string) => void,
 * }} deps
 * @param {string} patientId
 * @param {number} mergedCount
 * @param {{ preferSetId?: string }} [opts]
 */

function toastConsolidateResult_(deps, patientId, mergedCount) {
  var show = deps && deps.showToast;
  if (typeof show !== 'function') return;
  if (mergedCount > 0) {
    if (typeof deps.addAuditEntry === 'function') {
      deps.addAuditEntry('lab-history-consolidate', 'ok', mergedCount, String(patientId));
    }
    show('Fusionados ' + mergedCount + ' conjunto(s) ✓', 'success');
    return;
  }
  show('No había conjuntos para fusionar con la selección actual', 'success');
}

export function runLabConsolidateUiRefresh(deps, patientId, mergedCount, opts) {
  var d = deps || {};
  if (typeof d.persistClinicalState === 'function') d.persistClinicalState({ immediate: true });
  var preferSetId = opts && opts.preferSetId != null ? String(opts.preferSetId) : '';
  if (patientId && preferSetId && typeof d.setLabHistorySelectedSetId === 'function') {
    d.setLabHistorySelectedSetId(patientId, preferSetId);
  }
  // Critical: renderLabHistoryPanel skips loadLabHistorySetIntoOutput while activeLab is set.
  if (typeof d.setActiveLab === 'function') d.setActiveLab(null);
  if (typeof d.renderLabHistoryPanel === 'function') d.renderLabHistoryPanel();
  if (typeof d.refreshTendenciasOrCultivosPanel === 'function') d.refreshTendenciasOrCultivosPanel();
  if (typeof d.syncEstudiosTextarea === 'function') d.syncEstudiosTextarea(patientId);
  toastConsolidateResult_(d, patientId, mergedCount);
}

/**
 * @param {{ keeperIds?: string[] } | null | undefined} result
 * @returns {string}
 */
export function preferKeeperSetIdFromConsolidateResult(result) {
  if (!result || !result.keeperIds || !result.keeperIds.length) return '';
  return String(result.keeperIds[0]);
}
