import { saveState } from '../../app-state.mjs';
import { isCloudSyncActive } from '../cloud-sync/lan-override.mjs';
import { scheduleCloudSyncPush } from '../cloud-sync/mutate-bridge.mjs';
import { applyClinicalHistoryUppercase } from '../../../../lib/historia-clinica/clinical-text.mjs';
import { patients } from '../../app-state.mjs';
import { rt } from './runtime.mjs';
import { DATA_KEYS } from './catalogs.mjs';
import { syncSignosVitalesIngresoFromEstadoActual } from './data-normalize.mjs';
import { getDirtyKeys, hcState, resetDirtyKeys } from './state.mjs';

function touchPatientLanUpdatedAt(patientId) {
  const p = patients.find(function (row) {
    return String(row.id) === String(patientId);
  });
  if (p) p.lanUpdatedAt = new Date().toISOString();
}

function saveHistoriaLocally(root, patient, rerender) {
  patient.historiaClinica = { version: hcState.version + 1, data: Object.assign({}, hcState.data) };
  hcState.version += 1;
  hcState.editMode = false;
  hcState.pendingAck = [];
  resetDirtyKeys();
  saveState();
  touchPatientLanUpdatedAt(patient.id);
  if (typeof rerender === 'function') rerender(root);
  rt.showToast('Historia clínica guardada.', 'success');
  if (isCloudSyncActive()) scheduleCloudSyncPush();
}

export async function saveHistoria(root, patient, rerender, _skipAckCheck) {
  if (hcState.data) applyClinicalHistoryUppercase(hcState.data);
  syncSignosVitalesIngresoFromEstadoActual(patient);

  var dirtyKeys = getDirtyKeys();
  var dirty = Array.from(dirtyKeys);
  if (!dirty.length && hcState.version > 0) {
    rt.showToast('No hay cambios para guardar.', 'info');
    return;
  }
  if (!hcState.version && !dirty.length) {
    dirty = DATA_KEYS.slice();
  }

  void dirty;
  saveHistoriaLocally(root, patient, rerender);
}
