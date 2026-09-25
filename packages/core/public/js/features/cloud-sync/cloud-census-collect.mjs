/**
 * Cloud census collection — always uses patients-modal-commit builder (LAN runtime
 * stub returns null on Nube boot until registerLanRuntime). Applies the same team
 * scope as LAN for R1–R3 so peers receive the charts they can see. Scope is
 * applied to the raw patient list before the (expensive) full entry is built,
 * so out-of-scope patients never pay for labs/vitals/meds assembly.
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
import { filterPatientsForGuardiaCensus } from '../patients-clinical-filter.mjs';
import { censusFiltersAreActive, elevatedPatientFilters } from '../clinical-census-filters-state.mjs';

/** @returns {boolean} */
export function isLanPatientEntryCollectorReady() {
  if (!getSyncablePatients().length) return true;
  const first = getSyncablePatients().find(function (p) {
    return p && p.id && String(p.id).indexOf('demo-') !== 0;
  });
  if (!first?.id) return true;
  return !!buildPatientEntry(first.id);
}

/**
 * This device unambiguously owns a patient it just admitted, even before a
 * patient_team_assignment row exists locally to structurally prove it. Without
 * this, a brand-new admission that doesn't yet match the admitting user's own
 * joined team is stripped from every push (not just the first) until some
 * unrelated later edit happens to touch it again — so it can go unsent to the
 * cloud, and therefore to every other device, indefinitely.
 */
const OWN_PATIENT_PUSH_GRACE_MS = 60_000;

function isFreshLocalAdmission(patient) {
  const at = Date.parse(String(patient?.lanUpdatedAt || ''));
  if (Number.isNaN(at)) return false;
  return Date.now() - at < OWN_PATIENT_PUSH_GRACE_MS;
}

/**
 * Team-scope the raw patient list before any per-patient entry is built.
 * @param {object[]} patients
 * @returns {object[]}
 */
function scopePatientsForCloudPush(patients) {
  const list = (patients || []).filter(function (p) {
    return p?.id && String(p.id).indexOf('demo-') !== 0;
  });
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return list;
  if (shouldUseElevatedPatientCensus(user)) return list;
  // Scope not ready yet — push full local census so the room is seeded; apply filters peers.
  if (!isClinicalScopeReadyForPatientApply()) return list;
  const pseudoEntries = list.map(function (p) {
    return { patient: p };
  });
  const scoped = filterPatientEntriesForLanTeamScope(
    pseudoEntries,
    user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap
  );
  const allowedIds = new Set(scoped.map((e) => e.patient.id));
  return list.filter((p) => allowedIds.has(p.id) || isFreshLocalAdmission(p));
}

/** @param {object[]} patients @returns {Promise<object[]>} */
export async function buildLocalPatientEntries(patients) {
  const { buildPatientEntry } = await import('../patients-modal-commit.mjs');
  const out = [];
  for (let i = 0; i < patients.length; i += 1) {
    const entry = buildPatientEntry(patients[i].id);
    if (entry) out.push(entry);
  }
  return out;
}

/**
 * Split a team-scoped patient list by the user's active Filtros (sala/equipo/servicio):
 * `priority` is exactly what the sidebar shows right now, `remaining` is the rest of the
 * team-scoped census. Lets a caller build the priority set first (cheap) and the
 * remaining set later, instead of paying for every patient's full entry up front.
 * @param {object[]} patients
 * @returns {{ priority: object[], remaining: object[] }}
 */
function splitPatientsByActiveFilters(patients) {
  if (!censusFiltersAreActive()) return { priority: patients, remaining: [] };
  const user = clinicalSessionContext.user;
  const scopeContext = getClinicalScopeContextForEvaluate();
  if (!user?.user_id || !scopeContext) return { priority: patients, remaining: [] };
  const visible = filterPatientsForGuardiaCensus(
    patients,
    user,
    scopeContext,
    clinicalSessionContext.guardiasMap,
    elevatedPatientFilters
  );
  const visibleIds = new Set(visible.map((p) => p.id));
  const remaining = patients.filter((p) => !visibleIds.has(p.id));
  return { priority: visible, remaining };
}

/** @returns {Promise<object[]>} */
export async function collectPatientEntriesForCloudPush() {
  if (!getSyncablePatients().length) return [];
  const patients = scopePatientsForCloudPush(getSyncablePatients());
  return buildLocalPatientEntries(patients);
}

/**
 * Same team-scoped patients as collectPatientEntriesForCloudPush, but as a raw-patient
 * split by active Filtros — nothing is built into a full entry yet. Use for backfill-style
 * pushes: build+push `priority` immediately, `remaining` on a deferred pass, so a narrow
 * Filtros doesn't stall startup but still finishes the whole census shortly after.
 * @returns {{ priority: object[], remaining: object[] }}
 */
export function scopePatientsForCloudPushSplitByFilters() {
  if (!getSyncablePatients().length) return { priority: [], remaining: [] };
  const scoped = scopePatientsForCloudPush(getSyncablePatients());
  return splitPatientsByActiveFilters(scoped);
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
