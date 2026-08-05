/**
 * Compat shim — local delete clears live in sync-apply (Phase 3).
 */
export {
  clearPatientLocalStateMaps,
  clearPatientTodosLocal,
  clearPatientAgendaLocal,
} from '../sync-apply/patient-delete-local.mjs';
