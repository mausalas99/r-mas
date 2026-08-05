/**
 * Cloud census collection — avoids LAN runtime stub race (buildPatientEntry null until registerLanRuntime).
 */
import { patients } from '../../app-state.mjs';
import { storage } from '../../storage.js';
import { getLanRuntime } from '../lan/orchestrator-runtime.mjs';
import { collectPatientEntriesForLanSync } from '../lan/orchestrator-collect.mjs';

/** @returns {boolean} */
export function isLanPatientEntryCollectorReady() {
  if (!patients.length) return true;
  const first = patients.find(function (p) {
    return p && p.id && String(p.id).indexOf('demo-') !== 0;
  });
  if (!first?.id) return true;
  return !!getLanRuntime().buildPatientEntry(first.id);
}

/** @returns {Promise<object[]>} */
export async function collectPatientEntriesForCloudPush() {
  const fromLan = collectPatientEntriesForLanSync();
  if (fromLan.length || !patients.length) return fromLan;

  const { buildPatientEntry } = await import('../patients-modal-commit.mjs');
  const out = [];
  for (let i = 0; i < patients.length; i += 1) {
    const p = patients[i];
    if (!p?.id || String(p.id).indexOf('demo-') === 0) continue;
    const entry = buildPatientEntry(p.id);
    if (entry) out.push(entry);
  }
  return out;
}

/** @returns {Record<string, unknown[]>} */
export function collectTodosMapForCloudPush() {
  const out = {};
  for (let i = 0; i < patients.length; i += 1) {
    const p = patients[i];
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
