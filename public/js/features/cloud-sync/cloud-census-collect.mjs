/**
 * Cloud census collection — avoids LAN runtime stub race (buildPatientEntry null until registerLanRuntime).
 */
import { patients } from '../../app-state.mjs';
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
