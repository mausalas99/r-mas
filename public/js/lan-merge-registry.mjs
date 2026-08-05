/**
 * Domain merge dispatch for LAN room bundles (IM-12).
 */

import { mergeLiveSyncBundles } from './live-sync-room.mjs';
import {
  mergeLanPatientEntrySources,
  filterEntriesByPatientDeletes,
  derivePatientDeletesFromHostCensus,
  mergePatientDeleteRecords,
} from './lan-patient-merge.mjs';
import { attachTodosMapToPatientEntries } from './livesync-patient-ids.mjs';
import { mergeClinicalOpsFromSources } from './clinical-ops-lan.mjs';
import { mergeLabPanelOverlayLww } from './labs-panel-overlay.mjs';

/** @type {Record<string, (sources: object[]) => unknown>} */
const domainMergers = {
  agendaTodosPatients(sources) {
    return mergeLiveSyncBundles(sources);
  },
  patientEntries(sources) {
    return mergeLanPatientEntrySources(sources);
  },
  clinicalOps(sources) {
    return mergeClinicalOpsFromSources(sources);
  },
  labPanelOverlay(sources) {
    var acc = [];
    for (var i = 0; i < sources.length; i += 1) {
      var s = sources[i];
      if (s && Array.isArray(s.labPanelOverlay) && s.labPanelOverlay.length) {
        acc = mergeLabPanelOverlayLww(acc, s.labPanelOverlay);
      }
    }
    return acc;
  },
};

function resolveHostSnapshotDeleteHints(sources) {
  let hostEntries = null;
  let snapshotEntries = null;
  for (const src of sources || []) {
    if (!src) continue;
    if (src._hostCensusAuthoritative) {
      hostEntries = Array.isArray(src.entries) ? src.entries : [];
    }
    if (src._localRoomSnapshot) {
      snapshotEntries = Array.isArray(src.entries) ? src.entries : [];
    }
  }
  if (!hostEntries || !snapshotEntries) return [];
  return derivePatientDeletesFromHostCensus(snapshotEntries, hostEntries);
}

/**
 * Merge LAN room bundle sources (agenda/todos, patients, clinicalOps).
 * @param {object[]} sources
 */
export function mergeLiveSyncFullBundles(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const base = domainMergers.agendaTodosPatients(list);
  let entries = domainMergers.patientEntries(list);
  const patientDeletes = mergePatientDeleteRecords(
    base.patientDeletes,
    resolveHostSnapshotDeleteHints(list)
  );
  entries = filterEntriesByPatientDeletes(entries, patientDeletes);
  base.patientDeletes = patientDeletes;
  base.entries = attachTodosMapToPatientEntries(entries, base.todos, base.todoTouchedPatientIds);
  base.clinicalOps = domainMergers.clinicalOps(list);
  var overlay = domainMergers.labPanelOverlay(list);
  if (overlay && overlay.length) base.labPanelOverlay = overlay;
  return base;
}

export { domainMergers };
