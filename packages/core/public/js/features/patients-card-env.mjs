import { isModeSala } from '../mode-features.mjs';
import { isMobileWeb } from '../mobile-web.mjs';
import { isPatientBulkSelectMode, isPatientBulkSelected } from './patients-bulk-select.mjs';
import { isPatientAdmissionIncomplete } from '../patient-admission-incomplete.mjs';
import { canDeletePatientChart } from '../patient-delete-auth.mjs';
import { clinicalSessionContext, getClinicalScopeContextForEvaluate } from '../clinical-access-runtime.mjs';
import { rt } from './patients-runtime-state.mjs';
import { getConsultInfo } from './patient-dashboard/consult-band.mjs';
import { requestingServiceHue, isInterconsultaModeUi } from './patients-card-html.mjs';

/**
 * What the sidebar cards need to know about the world right now (see patients-list-model.mjs `CardEnv`).
 * Interconsulta mode: every patient already has a home (their team's board lane), so pin-to-top has
 * no purpose there. The `pinned` field/storage is shared with Sala mode (buildPatientListZones,
 * command palette, copy team-labs/estado-actual) — only the UI trigger is dropped, not the field.
 */
export function buildPatientCardEnv() {
  var settings = rt.getSettings();
  return {
    activeId: rt.getActiveId(),
    bulkMode: isPatientBulkSelectMode(),
    isBulkSelected: isPatientBulkSelected,
    showServicio: !isModeSala(settings),
    showPin: !isInterconsultaModeUi(),
    mobile: isMobileWeb(),
    canDelete: function (id) {
      return canDeletePatientChart(clinicalSessionContext.user, id, getClinicalScopeContextForEvaluate());
    },
    isIncomplete: function (p) {
      return isPatientAdmissionIncomplete(p, settings);
    },
    svcHue: requestingServiceHue,
    requestingService: function (p) {
      return getConsultInfo(p).requestingService;
    },
  };
}
