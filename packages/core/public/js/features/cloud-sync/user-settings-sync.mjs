/**
 * Glue for the per-user "datos para documentos" sync: outbox push on local
 * change, apply newer server values on pull. Model rules: user-settings-model.mjs.
 */
import { writeRpcSettings } from '../../clinical-settings.mjs';
import { createCloudSyncApi } from './api-client.mjs';
import { getCloudSyncToken, getCloudSyncUrl } from './settings.mjs';
import {
  enqueueCloudMutation,
  flushCloudSyncOutbox,
  isCloudMutateBridgeConfigured,
  resolveCloudActorId,
} from './mutate-bridge.mjs';
import { cloudOp } from './mutate-bridge-ops.mjs';
import { cloudSyncNowIso } from './cloud-sync-clock.mjs';
import { isCloudSyncActive } from './nube-sync-policy.mjs';
import { isEncryptedEnvelope } from './crypto.mjs';
import { planRemoteUserSettingsApply, planUserSettingsPush } from './user-settings-model.mjs';

const SETTINGS_KEY = 'rpc-settings';
const STAMP_KEY = 'rpc-user-settings-stamp';

/** @type {{ token: string, id: string } | null} */
let cachedUser = null;

/** Nube user id for the current token ('' when unknown). Cached per token. */
async function resolveNubeUserId() {
  const token = getCloudSyncToken();
  if (!token) return '';
  if (cachedUser && cachedUser.token === token) return cachedUser.id;
  const api = createCloudSyncApi({ getBaseUrl: getCloudSyncUrl, getToken: getCloudSyncToken });
  const me = await api.me();
  const id = String(me?.user?.id || '').trim();
  if (id) cachedUser = { token, id };
  return id;
}

function readSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  writeRpcSettings(settings);
}

function readStamp() {
  try {
    const raw = JSON.parse(localStorage.getItem(STAMP_KEY) || 'null');
    return raw && typeof raw === 'object' ? raw : null;
  } catch {
    return null;
  }
}

function writeStamp(stamp) {
  localStorage.setItem(STAMP_KEY, JSON.stringify(stamp));
}

/**
 * Call after any local change to a synced field. Enqueues one op when the
 * fields differ from the last stamp, then flushes the outbox (unless flush is
 * false: inside a pull, the next sync cycle sends it).
 * @param {{ flush?: boolean }} [opts]
 */
export async function publishUserSettingsChange(opts = {}) {
  try {
    if (!isCloudSyncActive() || !getCloudSyncToken() || !isCloudMutateBridgeConfigured()) return;
    const userId = await resolveNubeUserId();
    const plan = planUserSettingsPush({
      userId,
      settings: readSettings(),
      stamp: readStamp(),
      nowIso: cloudSyncNowIso(),
    });
    if (!plan) return;
    writeStamp(plan.stamp);
    const path = `settings/${userId}`;
    enqueueCloudMutation(`${path}:${plan.updatedAt}`, [
      cloudOp({ path, value: plan.value, updatedAt: plan.updatedAt, actorId: resolveCloudActorId() }),
    ]);
    if (opts.flush !== false) await flushCloudSyncOutbox();
  } catch (err) {
    console.warn('[user-settings] push failed', err);
  }
}

/**
 * Pull hook. `userSettings` is the Worker's `{ [callerId]: value }`, already
 * decrypted by api-client. Absent value on the server: push this device once.
 * @param {Record<string, unknown> | undefined} userSettings
 */
export async function applyRemoteUserSettings(userSettings) {
  try {
    const userId = await resolveNubeUserId();
    if (!userId) return false;
    const remote = userSettings ? userSettings[userId] : undefined;
    if (remote === undefined) {
      await publishUserSettingsChange({ flush: false });
      return false;
    }
    // Still sealed: this device has no key yet. Leave local values alone.
    if (isEncryptedEnvelope(remote)) return false;
    const plan = planRemoteUserSettingsApply({
      userId,
      remote,
      settings: readSettings(),
      stamp: readStamp(),
    });
    if (!plan) return false;
    writeSettings(plan.settings);
    writeStamp(plan.stamp);
    if (typeof globalThis.invalidateInnerTabRenderCache === 'function') {
      globalThis.invalidateInnerTabRenderCache();
    }
    return true;
  } catch (err) {
    console.warn('[user-settings] apply failed', err);
    return false;
  }
}
