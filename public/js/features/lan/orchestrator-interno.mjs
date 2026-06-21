/** Interno vitals host sync bridge (IM-11). */
import { patients, saveState } from '../../app-state.mjs';
import { mergePatientMonitoreoFromImported } from '../estado-actual-data.mjs';
import { mergeCensoPatientFields } from '../../patient-diagnosticos.mjs';
import { mergePatientRegistrationMeta } from '../../patient-registration-meta.mjs';
import { refreshGuardiaCensusFromDb } from '../../clinical-access-runtime.mjs';
import { isLanSessionConfiguredForRest } from './transport.mjs';
import { lanFetchHostPatientRow } from './host-patient-http.mjs';
import { getLanRuntime } from './orchestrator-runtime.mjs';

/** @param {string} patientId */
/** Pull host monitoreo (interno vitals) into local patient row. */
export async function hydrateLocalPatientMonitoreoFromHost(patientId) {
  const pid = String(patientId || '').trim();
  if (!pid || !isLanSessionConfiguredForRest()) return { ok: false, error: 'not_configured' };
  const hostRow = await lanFetchHostPatientRow(pid);
  if (!hostRow) return { ok: false, error: 'not_found' };
  const local = patients.find((p) => p && String(p.id) === pid);
  if (!local) return { ok: false, error: 'local_missing' };
  const before = JSON.stringify(local.monitoreo || null);
  mergePatientMonitoreoFromImported(local, hostRow);
  if (hostRow.nombre && String(hostRow.nombre).trim()) local.nombre = hostRow.nombre;
  if (hostRow.cuarto) local.cuarto = hostRow.cuarto;
  if (hostRow.cama) local.cama = hostRow.cama;
  mergeCensoPatientFields(local, hostRow);
  mergePatientRegistrationMeta(local, hostRow);
  const changed = before !== JSON.stringify(local.monitoreo || null);
  if (changed) await saveState({ immediate: true });
  return { ok: true, changed };
}

/** Host Mac: interno vitals POST → IPC → refresh guardia census (LAN mode not required). */
export function wireInternoHostSyncBridge() {
  if (typeof window === 'undefined' || !window.electronAPI) return;
  if (typeof window.electronAPI.onInternoHostSync !== 'function') return;
  if (window.__rpcInternoHostSyncWired) return;
  window.__rpcInternoHostSyncWired = true;
  window.electronAPI.onInternoHostSync((payload) => {
    void handleInternoHostSyncBroadcast(payload);
  });
}

export async function handleInternoHostSyncBroadcast(detail) {
  const pid = String(detail?.patientId || '').trim();
  if (detail?.type === 'patients-updated' && pid) {
    const local = patients.find((p) => p && String(p.id) === pid);
    if (local && detail.monitoreo && typeof detail.monitoreo === 'object') {
      mergePatientMonitoreoFromImported(local, { monitoreo: detail.monitoreo });
      await saveState({ immediate: true });
    } else {
      await hydrateLocalPatientMonitoreoFromHost(pid);
    }
  }
  if (detail?.type === 'patients-updated' || detail?.type === 'guardias-updated') {
    await refreshGuardiaCensusFromDb();
    const runtime = getLanRuntime();
    if (typeof runtime.renderPatientList === 'function') runtime.renderPatientList();
    document.dispatchEvent(
      new CustomEvent('rpc-interno-vitals-synced', { detail: { patientId: pid } })
    );
  }
}
