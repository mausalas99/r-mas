/**
 * On-device board assembly for Interno (replaces what the Worker used to build
 * server-side before clinicalOps/monitoreo were E2EE). Pure — no DOM, no fetch —
 * so it's unit-testable, unlike interno-app.mjs which runs `void init()` at
 * module scope.
 */
import {
  decryptValue,
  encryptValue,
  importDekRaw,
  isEncryptedEnvelope,
} from '../js/features/cloud-sync/crypto.mjs';
import {
  buildInternoScopeFromClinicalOps,
  censusPatientIdsFromEntries,
  entriesToPatients,
  resolveInternoBoardPatients,
} from '../../lib/interno/interno-scope.mjs';
import { buildInternoBoardDto } from '../../lib/interno/interno-board.mjs';
import { applyInternoMedicionToPatient, buildInternoMedicion } from '../../lib/interno/interno-vitals.mjs';

export { importDekRaw as importInternoSubkeyRaw };

/** @param {string} hash e.g. "#k=BASE64" or "?t=...#k=BASE64" */
export function subkeyB64FromLocationHash(hash) {
  const m = /(?:^|[#&])k=([^&]+)/.exec(String(hash || ''));
  return m ? decodeURIComponent(m[1]) : '';
}

/**
 * Decrypts only what this subkey covers: clinicalOps and each entry's
 * monitoreo. Everything else in an entry (identity fields) is already
 * plaintext from the Worker. A legacy pre-E2EE room's fields simply aren't
 * envelopes, so decryptValue passes them through unchanged.
 * @param {CryptoKey} subkey
 * @param {{ entries?: object[], clinicalOps?: unknown }} relayBoard
 */
export async function decryptInternoRelayBoard(subkey, relayBoard) {
  const clinicalOps = await decryptValue(subkey, relayBoard?.clinicalOps ?? null);
  const entries = await Promise.all(
    (relayBoard?.entries || []).map(async (entry) => {
      if (!isEncryptedEnvelope(entry?.monitoreo)) return entry;
      return { ...entry, monitoreo: await decryptValue(subkey, entry.monitoreo) };
    })
  );
  return { clinicalOps, entries };
}

/**
 * Mirrors the board DTO the Worker used to assemble server-side
 * (cloud/sync-worker/src/interno/board.js's old readInternoBoard), now run
 * on-device with decrypted data — same functions, moved, not rewritten.
 * @param {string} sala
 * @param {object[]} entries decrypted
 * @param {object|null} clinicalOps decrypted
 */
export function assembleInternoBoard(sala, entries, clinicalOps) {
  const activeGuardias = (clinicalOps?.active_guardias || []).filter(
    (row) => String(row?.status || 'Active') === 'Active'
  );
  const scope = buildInternoScopeFromClinicalOps(clinicalOps);
  const patients = resolveInternoBoardPatients(entriesToPatients(entries), activeGuardias, sala, scope, {
    censusPatientIds: censusPatientIdsFromEntries(entries),
  });

  const guardiasByPatientId = new Map();
  for (const guardia of activeGuardias) {
    guardiasByPatientId.set(String(guardia.patient_id), guardia);
  }

  return buildInternoBoardDto(sala, patients, guardiasByPatientId);
}

/**
 * What the phone's refreshBoard() needs: fetch the relay shape from `/board`,
 * decrypt it, assemble the same DTO shape the render() code already expects.
 * An inactive/no-room relay board has nothing to decrypt — passed through.
 * @param {CryptoKey} subkey
 * @param {{ sala?: string, active?: boolean, inactive?: boolean, entries?: object[], clinicalOps?: unknown }} relayBoard
 */
export async function decryptAndAssembleInternoBoard(subkey, relayBoard) {
  if (!relayBoard?.active) return relayBoard;
  const { clinicalOps, entries } = await decryptInternoRelayBoard(subkey, relayBoard);
  const assembled = assembleInternoBoard(relayBoard.sala, entries, clinicalOps);
  return { ...assembled, entries };
}

/**
 * Builds and encrypts a new medición entirely on-device — the Worker never
 * sees plaintext vitals. `currentMonitoreoEnvelope` is the patient's current
 * `monitoreo` field exactly as the relay board returned it (still an
 * envelope, or already plaintext for a legacy room).
 * @param {CryptoKey} subkey
 * @param {unknown} currentMonitoreoEnvelope
 * @param {{ vitals?: object, glucometrias?: object[], reporterName?: string, sala?: string }} payload
 */
export async function buildEncryptedInternoVitals(subkey, currentMonitoreoEnvelope, payload) {
  const built = buildInternoMedicion(payload);
  if (!built.ok) return { ok: false, error: built.error };

  const currentMonitoreo = await decryptValue(
    subkey,
    currentMonitoreoEnvelope ?? { historial: [], estadoClinico: {}, confirmado: {} }
  );
  const patient = {
    monitoreo:
      currentMonitoreo && typeof currentMonitoreo === 'object'
        ? currentMonitoreo
        : { historial: [] },
  };
  const applied = applyInternoMedicionToPatient(patient, built.medicion);
  if (!applied.ok) return { ok: false, error: 'apply_failed' };

  const monitoreoEnvelope = await encryptValue(subkey, patient.monitoreo);
  return {
    ok: true,
    monitoreoEnvelope,
    medicionId: built.medicion.id,
    hasAlterations: built.hasAlterations,
  };
}
