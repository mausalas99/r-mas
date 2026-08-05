/**
 * Compat shim — patient entry apply lives in sync-apply (Phase 3).
 */
export {
  configureLanPatientEntries,
  lanJsonEqual,
  touchPatientLanUpdatedAt,
  applyLanPatientEntries,
} from '../sync-apply/patient-entries.mjs';
