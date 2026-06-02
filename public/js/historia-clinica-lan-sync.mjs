import { patients, saveState } from './app-state.mjs';
import { createMutationBuilder } from './versioned-mutation.mjs';
import { migrateLegacyHistoriaData } from '../../lib/historia-clinica/migrate-legacy.mjs';
import appConditions from '../../lib/historia-clinica/catalogs/app-conditions.json' with { type: 'json' };
import ahfConditions from '../../lib/historia-clinica/catalogs/ahf-conditions.json' with { type: 'json' };
import ipasSystems from '../../lib/historia-clinica/catalogs/ipas-systems.json' with { type: 'json' };
import {
  lanPushHistoriaClinica,
  getActiveLiveSyncRoomId,
  isLanSessionConfiguredForRest,
} from './features/lan-sync.mjs';

const CATALOGS = { appConditions, ahfConditions, ipasSystems };

const HC_SYNC_KEYS = [
  'identificacion',
  'motivoConsulta',
  'apnp',
  'app',
  'ahf',
  'genero',
  'sexual',
  'padecimientoActual',
  'datosNegados',
  'ipas',
  'signosVitalesIngreso',
  'labsAtAdmission',
  'labAnchor',
  'meta',
  'labLookbackHours',
];

/** @type {Map<string, Promise<unknown>>} */
const _inFlight = new Map();

/**
 * @param {object} patient
 * @param {{ expectedVersion: number, baseData: object, changedKeys: string[], source?: string }} pending
 */
export function markHistoriaPendingLanSync(patient, pending) {
  if (!patient) return;
  if (!patient.historiaClinica) patient.historiaClinica = { version: 0, data: {} };
  patient.historiaClinica.pendingLanSync = true;
  patient.historiaClinica.lanSyncPending = {
    expectedVersion: Number(pending.expectedVersion || 0),
    baseData: pending.baseData,
    changedKeys: (pending.changedKeys || []).slice(),
    source: pending.source ? String(pending.source) : 'pending-lan-sync',
  };
}

/**
 * @param {object} patient
 * @returns {Promise<{ ok: boolean, skipped?: boolean, deferred?: boolean, conflict?: boolean }>}
 */
export async function flushPendingHistoriaClinicaLanSync(patient) {
  if (!patient || !patient.historiaClinica || !patient.historiaClinica.pendingLanSync) {
    return { ok: true, skipped: true };
  }
  const roomId = getActiveLiveSyncRoomId() || '';
  if (!isLanSessionConfiguredForRest() || !roomId) {
    return { ok: false, deferred: true };
  }

  const hc = patient.historiaClinica;
  const snap = hc.lanSyncPending;
  const changedKeys =
    snap && snap.changedKeys && snap.changedKeys.length
      ? snap.changedKeys.slice()
      : HC_SYNC_KEYS.filter(function (k) {
          return hc.data && hc.data[k] !== undefined;
        });
  if (!changedKeys.length) {
    delete hc.pendingLanSync;
    delete hc.lanSyncPending;
    return { ok: true, skipped: true };
  }

  const expectedVersion =
    snap && snap.expectedVersion != null ? Number(snap.expectedVersion) : Math.max(0, Number(hc.version || 1) - 1);
  const baseData =
    snap && snap.baseData != null
      ? snap.baseData
      : expectedVersion > 0
        ? {}
        : {};

  const builder = createMutationBuilder('historiaClinica', patient.id).captureBase({
    version: expectedVersion,
    data: baseData,
  });
  changedKeys.forEach(function (k) {
    if (hc.data[k] !== undefined) builder.set(k, hc.data[k]);
  });

  const mutation = builder.build({
    roomId: roomId,
    patientId: patient.id,
    clientId: localStorage.getItem('rpc-lan-client-id') || 'local',
    audit: {
      sections: changedKeys,
      source: snap && snap.source ? snap.source : 'pending-lan-sync',
    },
  });

  try {
    const out = await lanPushHistoriaClinica(patient.id, mutation);
    if (out && out.conflict) {
      const body = out.body && typeof out.body === 'object' ? out.body : {};
      if (body.serverVersion != null || body.serverData) {
        applyServerHistoriaClinicaToPatient(
          patient,
          body.serverVersion != null ? body.serverVersion : hc.version,
          body.serverData || hc.data
        );
      } else {
        delete hc.pendingLanSync;
        delete hc.lanSyncPending;
        saveState();
      }
      return { ok: false, conflict: true, deferred: true };
    }
    if (out && out.ok) {
      hc.version = out.version;
      hc.data = migrateLegacyHistoriaData(out.data, CATALOGS);
      delete hc.pendingLanSync;
      delete hc.lanSyncPending;
      saveState();
      return { ok: true };
    }
  } catch (_e) {
    /* host unreachable — keep pending */
  }
  return { ok: false, deferred: true };
}

/** @param {object} patient */
export function schedulePendingHistoriaClinicaLanSync(patient) {
  const id = String(patient && patient.id ? patient.id : '').trim();
  if (!id || !patient.historiaClinica || !patient.historiaClinica.pendingLanSync) return;
  if (_inFlight.has(id)) return;

  const run = flushPendingHistoriaClinicaLanSync(patient).finally(function () {
    _inFlight.delete(id);
    const p = patients.find(function (x) {
      return x.id === id;
    });
    if (p && p.historiaClinica && p.historiaClinica.pendingLanSync) {
      schedulePendingHistoriaClinicaLanSync(p);
    }
  });
  _inFlight.set(id, run);
}

export async function flushAllPendingHistoriaClinicaLanSync() {
  if (!isLanSessionConfiguredForRest() || !getActiveLiveSyncRoomId()) return;
  const pending = patients.filter(function (p) {
    return p.historiaClinica && p.historiaClinica.pendingLanSync;
  });
  for (let i = 0; i < pending.length; i += 1) {
    await flushPendingHistoriaClinicaLanSync(pending[i]);
  }
}

export function scheduleFlushAllPendingHistoriaClinicaLanSync() {
  void flushAllPendingHistoriaClinicaLanSync();
}

/**
 * Aplica copia del host y detiene reintentos de sync pendiente.
 * @param {object} patient
 * @param {number} serverVersion
 * @param {object} serverData
 */
export function applyServerHistoriaClinicaToPatient(patient, serverVersion, serverData) {
  if (!patient) return;
  if (!patient.historiaClinica) patient.historiaClinica = { version: 0, data: {} };
  const hc = patient.historiaClinica;
  hc.version = Number(serverVersion != null ? serverVersion : hc.version || 0);
  if (serverData && typeof serverData === 'object') {
    hc.data = migrateLegacyHistoriaData(serverData, CATALOGS);
  }
  delete hc.pendingLanSync;
  delete hc.lanSyncPending;
  saveState();
}
