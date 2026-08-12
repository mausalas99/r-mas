/**
 * Mi rotación — self-serve teams and membership.
 */
import {
  isBenignPushSkipCode,
  PROFILE_PUSH_FAILED_MSG,
} from '../../clinical-profile-cloud-stubs.mjs';
import { isCloudSyncActive } from '../cloud-sync/nube-sync-policy.mjs';
import { getCloudSyncToken } from '../cloud-sync/settings.mjs';
import { normalizeCloudSala } from '../cloud-sync/sala-allowlist.mjs';
import { dbApi, toast } from './shared.mjs';

/** Push teams/membership to sala ⇄ (same path as @usuario; uses sticky room membership). */
export async function publishClinicalTeamsToSync() {
  try {
    const mod = await import('../cloud-sync/mutate-bridge-clinical-ops.mjs');
    if (typeof mod.pushCloudClinicalOpsNow === 'function') {
      return mod.pushCloudClinicalOpsNow();
    }
  } catch {
    /* optional */
  }
  return { ok: false, code: 'NO_CLOUD' };
}

/** @param {{ ok?: boolean, code?: string }} lanPush */
export function toastTeamPublishResult(lanPush, localOkMessage) {
  if (!lanPush) {
    toast(localOkMessage, 'success');
    return;
  }
  if (
    lanPush.ok &&
    (lanPush.code === 'QUEUED' || (lanPush.channels && lanPush.channels.outbox))
  ) {
    toast(
      `${localOkMessage} Se publicará a la sala cuando vuelva la red (cola ⇄).`,
      'info'
    );
    return;
  }
  if (lanPush.ok) {
    if (lanPush.code === 'CONFLICT_RESOLVED') {
      toast(`${localOkMessage} Directorio alineado con el servidor.`, 'success');
      return;
    }
    if (lanPush.channels && lanPush.channels.http) {
      toast(`${localOkMessage} Publicado en sala ⇄.`, 'success');
      return;
    }
    toast(localOkMessage, 'success');
    return;
  }
  if (isBenignPushSkipCode(lanPush.code)) {
    toast(`${localOkMessage} (solo en esta Mac hasta conectar sala ⇄).`, 'info');
    return;
  }
  toast(PROFILE_PUSH_FAILED_MSG, 'warn');
}

const CLOUD_CLINICAL_OPS_PULL_MIN_MS = 12_000;
let cloudClinicalOpsPullLastAt = 0;
/** @type {Promise<boolean>|null} */
let cloudClinicalOpsPullInFlight = null;

function resolveCloudDirectorySalas(options = {}) {
  const salas = new Set();
  const browse = normalizeCloudSala(options.sala || options.browseSala || '');
  const home = normalizeCloudSala(options.homeSala || '');
  if (browse && browse !== '__all__') salas.add(browse);
  if (home) salas.add(home);
  return [...salas];
}

/** Pull clinicalOps from Nube sala room(s) into this Mac's SQLCipher. */
export async function pullClinicalOpsFromCloudRoom(options = {}) {
  const force = !!options.force;
  const now = Date.now();
  if (!force && now - cloudClinicalOpsPullLastAt < CLOUD_CLINICAL_OPS_PULL_MIN_MS) {
    return false;
  }
  if (cloudClinicalOpsPullInFlight) return cloudClinicalOpsPullInFlight;

  cloudClinicalOpsPullInFlight = (async () => {
    try {
      const { isCloudSala } = await import('../cloud-sync/sala-allowlist.mjs');
      const { clinicalSessionContext } = await import('../../clinical-access-runtime.mjs');
      const { getCloudSyncToken } = await import('../cloud-sync/settings.mjs');
      if (!getCloudSyncToken()) return false;

      const salas = resolveCloudDirectorySalas({
        sala: options.sala,
        browseSala: options.browseSala,
        homeSala: options.homeSala || clinicalSessionContext.user?.sala,
      }).filter((s) => isCloudSala(s));

      if (!salas.length) {
        const { autostartCloudSyncIfConfigured } = await import('../cloud-sync/autostart.mjs');
        const rtMod = await import('../cloud-sync/panel-conexion-runtime.mjs');
        let runtime = rtMod.getSharedNubeRuntime();
        if (!runtime) runtime = await autostartCloudSyncIfConfigured();
        if (!runtime || typeof runtime.syncCycle !== 'function') return false;
        await runtime.syncCycle();
        return true;
      }

      const { pullClinicalOpsForSala } = await import('../cloud-sync/cloud-clinical-ops-sala.mjs');
      // force → full snapshot once; otherwise incremental since cached sala revision
      const pullOpts = force ? { since: 0 } : {};
      const results = await Promise.all(
        salas.map((sala) => pullClinicalOpsForSala(sala, pullOpts).catch(() => null))
      );
      return results.some((res) => res?.ok);
    } catch {
      return false;
    } finally {
      cloudClinicalOpsPullLastAt = Date.now();
      cloudClinicalOpsPullInFlight = null;
    }
  })();
  return cloudClinicalOpsPullInFlight;
}

/** Background republish of local teams to their sala rooms (does not block Mi rotación). */
function scheduleBackgroundClinicalOpsPush(options = {}) {
  void (async () => {
    try {
      const { pushClinicalOpsForSalas, listLocalTeamSalas } = await import(
        '../cloud-sync/cloud-clinical-ops-sala.mjs'
      );
      const salas = resolveCloudDirectorySalas(options);
      const teamSalas = await listLocalTeamSalas();
      const targets = [...new Set([...salas, ...teamSalas])].filter(Boolean);
      if (targets.length) await pushClinicalOpsForSalas(targets);
    } catch {
      /* push optional */
    }
  })();
}

/** Refresh teams directory from Nube or LAN host before listing. */
export async function refreshClinicalOpsDirectory(options = {}) {
  // Pull team directories with Nube login alone — sala rooms are separate from census room.
  if (getCloudSyncToken()) {
    const pulled = await pullClinicalOpsFromCloudRoom(options);
    if (options.push !== false && isCloudSyncActive()) {
      scheduleBackgroundClinicalOpsPush(options);
    }
    return pulled || isCloudSyncActive();
  }
  return pullClinicalOpsFromRoom(options);
}

/** Push teams/membership to the team's Nube sala room (and LAN when applicable). */
export async function publishClinicalTeamsAfterChange(options = {}) {
  if (isCloudSyncActive()) {
    try {
      const { pushClinicalOpsForSala, pushClinicalOpsForSalas, listLocalTeamSalas } = await import(
        '../cloud-sync/cloud-clinical-ops-sala.mjs'
      );
      const sala = normalizeCloudSala(options.sala || '');
      const push = sala
        ? await pushClinicalOpsForSala(sala)
        : await pushClinicalOpsForSalas(await listLocalTeamSalas());
      if (push?.ok) return { ok: true, channel: 'nube' };
    } catch {
      /* fall through to LAN */
    }
  }
  return publishClinicalTeamsToSync();
}

/** Pull host clinicalOps into this Mac so partner @usuario and teams exist locally. */
export async function pullClinicalOpsFromRoom(_options = {}) {
  return false;
}

/** @param {string} handle — normalized @usuario without @ */
export async function resolveLocalUserIdByHandle(handle) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalUserLookup !== 'function') return '';
  const res = await api.dbClinicalUserLookup({ username: handle });
  return res?.ok && res.user?.user_id ? String(res.user.user_id) : '';
}
