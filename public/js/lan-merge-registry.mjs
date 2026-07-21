/**
 * Domain merge dispatch for LAN room bundles (IM-12).
 */

import { mergeLiveSyncBundles } from './live-sync-room.mjs';
import {
  mergeLanPatientEntrySources,
  filterEntriesByPatientDeletes,
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

/**
 * Merge LAN room bundle sources (agenda/todos, patients, clinicalOps).
 * @param {object[]} sources
 */
export function mergeLiveSyncFullBundles(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const base = domainMergers.agendaTodosPatients(list);
  let entries = domainMergers.patientEntries(list);
  entries = filterEntriesByPatientDeletes(entries, base.patientDeletes || []);
  base.entries = attachTodosMapToPatientEntries(entries, base.todos, base.todoTouchedPatientIds);
  base.clinicalOps = domainMergers.clinicalOps(list);
  var overlay = domainMergers.labPanelOverlay(list);
  if (overlay && overlay.length) base.labPanelOverlay = overlay;
  return base;
}

export { domainMergers };
