import { persistClinicalState } from '../app-state.mjs';
import { touchClinicalSessionActivity } from '../clinical-access-runtime.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import { isCloudSyncActive } from './cloud-sync/nube-sync-policy.mjs';
import { filterNewEventualidades } from '../../../lib/drive-import/merge-eventualidades.mjs';
import { appendEventualidad } from './eventualidades-store.mjs';
import { ensureEventualidades } from './eventualidades-render.mjs';

export async function applyDriveImportEventualidades(patient, incoming) {
  if (!patient) return { ok: false, added: 0, skipped: 0 };
  let store = ensureEventualidades(patient);
  const { toAdd, skipped } = filterNewEventualidades(store.entries, incoming || []);
  for (let i = 0; i < toAdd.length; i += 1) {
    store = appendEventualidad(store, toAdd[i].text, '', toAdd[i].at);
  }
  if (!toAdd.length) return { ok: true, added: 0, skipped };
  patient.eventualidades = store;
  await persistClinicalState({ immediate: true });
  touchClinicalSessionActivity({ force: true });
  if (isCloudSyncActive()) scheduleCloudSyncPush();
  return { ok: true, added: toAdd.length, skipped };
}
