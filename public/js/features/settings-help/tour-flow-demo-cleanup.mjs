/** Tear down demo patients when tour ends. */
import { limpiarReporte } from '../lab-panel.mjs';
import { renderPatientList, selectPatient } from '../patients.mjs';
import { getPatients, persistClinicalState } from '../../app-state.mjs';
import { isTourDemoPatientId } from '../../tour-demo-patient.mjs';
import {
  closeLabBulkTourHintModal,
  hideTourDock,
} from './tour-engine.mjs';
import { purgeTourDemoPatientsFromState } from './tour-demo-seed.mjs';
import { getSettingsHelpRuntime } from './runtime.mjs';
import { tourState, publishTourGuardContext } from './tour-state.mjs';

const rt = getSettingsHelpRuntime();

function destroyIcBoardDemo() {
  void import('../interconsulta-demo-toggle.mjs').then((m) => {
    if (m.isInterconsultaDemoActive()) m.clearInterconsultaDemoFromMainApp();
  });
}

function destroyDemoAndClose() {
  closeLabBulkTourHintModal();
  destroyIcBoardDemo();
  purgeTourDemoPatientsFromState();
  tourState.guidedTourActive = false;
  tourState.tourStepId = null;
  tourState.guidedTourBranch = null;
  publishTourGuardContext();
  hideTourDock();
  if (isTourDemoPatientId(rt.getActiveId(), getPatients())) {
    rt.setActiveId(getPatients().length ? getPatients()[0].id : null);
  }
  limpiarReporte();
  persistClinicalState();
  renderPatientList();
  if (rt.getActiveId()) selectPatient(rt.getActiveId());
  else {
    var pv = document.getElementById('patient-view');
    var es = document.getElementById('empty-state');
    if (pv) pv.style.display = 'none';
    if (es) es.style.display = 'flex';
  }
}

export { destroyDemoAndClose };
