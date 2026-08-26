/**
 * Cloud census collection — always uses patients-modal-commit builder (LAN runtime
 * stub returns null on Nube boot until registerLanRuntime). Applies the same team
 * scope as LAN for R1–R3 so peers receive the charts they can see.
 */
import { getSyncablePatients } from '../../app-state.mjs';
import { storage } from '../../storage.js';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import {
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForPatientApply,
} from '../../clinical-access-runtime.mjs';
import { shouldUseElevatedPatientCensus } from '../../clinical-privileges.mjs';
import { filterPatientEntriesForLanTeamScope } from '../../patient-team-scope.mjs';
import { buildPatientEntry } from '../patients-modal-commit.mjs';

/** @returns {boolean} */
export function isLanPatientEntryCollectorReady() {
  if (!getSyncablePatients().length) return true;
  const first = getSyncablePatients().find(function (p) {
    return p && p.id && String(p.id).indexOf('demo-') !== 0;
  });
  if (!first?.id) return true;
  return !!buildPatientEntry(first.id);
}

/** @returns {Promise<object[]>} */
async function buildAllLocalPatientEntries() {
  const { buildPatientEntry } = await import('../patients-modal-commit.mjs');
  const out = [];
  for (let i = 0; i < getSyncablePatients().length; i += 1) {
    const p = getSyncablePatients()[i];
    if (!p?.id || String(p.id).indexOf('demo-') === 0) continue;
    const entry = buildPatientEntry(p.id);
    if (entry) out.push(entry);
  }
  return out;
}

/**
 * @param {object[]} entries
 * @returns {object[]}
 */
function scopeEntriesForCloudPush(entries) {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return entries;
  if (shouldUseElevatedPatientCensus(user)) return entries;
  // Scope not ready yet — push full local census so the room is seeded; apply filters peers.
  if (!isClinicalScopeReadyForPatientApply()) return entries;
  return filterPatientEntriesForLanTeamScope(
    entries,
    user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap
  );
}

/** @returns {Promise<object[]>} */
export async function collectPatientEntriesForCloudPush() {
  if (!getSyncablePatients().length) return [];
  const entries = await buildAllLocalPatientEntries();
  return scopeEntriesForCloudPush(entries);
}

/** @returns {Record<string, unknown[]>} */
export function collectTodosMapForCloudPush() {
  const out = {};
  for (let i = 0; i < getSyncablePatients().length; i += 1) {
    const p = getSyncablePatients()[i];
    if (!p?.id || String(p.id).indexOf('demo-') === 0) continue;
    const list = storage.getTodos(p.id);
    if (list.length) out[p.id] = list;
  }
  return out;
}

/** @returns {unknown[]} */
export function collectAgendaForCloudPush() {
  return storage.getScheduledProcedures().filter(function (ev) {
    return ev && String(ev.patientId || '').indexOf('demo-') !== 0;
  });
}
