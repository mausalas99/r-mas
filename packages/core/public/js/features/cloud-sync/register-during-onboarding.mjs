/**
 * Cloud account + ensure-turn + pull/seed during onboarding.
 */
import { bridgeCloudIdentityToLocal } from './identity-bridge.mjs';
import { createCloudSyncApi } from './api-client.mjs';
import {
  getCloudSyncUrl,
  getCloudSyncToken,
  setCloudSyncToken,
  setCloudSyncRoomId,
  setCloudSyncRevision,
  setCloudSyncRoomSnapshot,
  getCloudSyncRoomId,
  getCloudSyncRevision,
  getCloudSyncRoomSnapshot,
} from './settings.mjs';
import { ensureTurnRoom } from './ensure-turn-room.mjs';
import { applyCloudPullResult } from './pull-apply.mjs';
import { cloudPullProgress } from '../../clinical-session-context.mjs';
import { hydrateClinicalTeamsAfterCloudPull } from './clinical-ops-hydrate.mjs';
import { startSharedNubeRuntime } from './panel-conexion-runtime.mjs';
import { setCloudRoomConnected } from './nube-sync-policy.mjs';
import { isCloudSala } from './sala-allowlist.mjs';
import { showRecoveryCodeModal } from './recovery-modal.mjs';
import { loadRoomDek } from './room-dek.mjs';

function createApi() {
  return createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken,
  });
}

/**
 * @param {{
 *   mode: 'login'|'register',
 *   username: string,
 *   displayName: string,
 *   sala: string,
 *   password: string,
 *   remember?: boolean,
 *   toast?: (msg: string, kind?: string) => void,
 *   setStatus?: (msg: string) => void,
 * }} opts
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function registerCloudDuringOnboarding(opts) {
  const password = String(opts.password || '');
  if (!isCloudSala(opts.sala)) return { ok: true };
  if (password.length < 10) {
    return { ok: false, error: 'Contraseña nube: mínimo 10 caracteres.' };
  }
  const toast = typeof opts.toast === 'function' ? opts.toast : () => {};
  const setStatus = typeof opts.setStatus === 'function' ? opts.setStatus : () => {};
  const chosenUser = {
    username: opts.username,
    displayName: opts.displayName,
    sala: opts.sala,
  };
  const client = createApi();
  setStatus(opts.mode === 'login' ? 'Iniciando sesión nube…' : 'Creando cuenta nube…');
  try {
    await authAndBridge(client, opts.mode, chosenUser, password, !!opts.remember);
    return completeCloudOnboardingSync({
      username: chosenUser.username,
      displayName: chosenUser.displayName,
      sala: chosenUser.sala,
      toast,
      setStatus,
    });
  } catch (err) {
    const msg = err?.data?.message || err?.message || 'Error de Nube';
    setStatus(msg);
    return { ok: false, error: msg };
  }
}

/**
 * Login only (token + bridge) — used by onboarding "Ya tengo cuenta".
 * @param {{ username: string, password: string, remember?: boolean, setStatus?: (msg: string) => void }} opts
 */
export async function loginCloudDuringOnboarding(opts) {
  const password = String(opts.password || '');
  if (password.length < 10) {
    return { ok: false, error: 'Contraseña nube: mínimo 10 caracteres.' };
  }
  const setStatus = typeof opts.setStatus === 'function' ? opts.setStatus : () => {};
  const client = createApi();
  setStatus('Iniciando sesión nube…');
  try {
    const data = await client.login({ username: opts.username, password });
    setCloudSyncToken(data.token, { remember: !!opts.remember });
    const cloudUser = data.user || {};
    const displayName = String(cloudUser.displayName || '').trim();
    setStatus('Sesión nube iniciada.');
    return {
      ok: true,
      displayName,
      rank: String(cloudUser.rank || '').trim() || undefined,
    };
  } catch (err) {
    const msg = err?.data?.message || err?.message || 'Error de Nube';
    setStatus(msg);
    return { ok: false, error: msg };
  }
}

/**
 * Ensure turn room, pull censo, start sync runtime (after auth).
 * @param {{
 *   username: string,
 *   displayName: string,
 *   sala: string,
 *   toast?: (msg: string, kind?: string) => void,
 *   setStatus?: (msg: string) => void,
 * }} opts
 */
export async function completeCloudOnboardingSync(opts) {
  const toast = typeof opts.toast === 'function' ? opts.toast : () => {};
  const setStatus = typeof opts.setStatus === 'function' ? opts.setStatus : () => {};
  const chosenUser = {
    username: opts.username,
    displayName: opts.displayName,
    sala: opts.sala,
  };
  const client = createApi();
  try {
    setStatus('Uniéndote a la sala de turno…');
    const roomId = await joinTurnRoom(client, chosenUser, toast, setStatus);
    if (!roomId) return { ok: false, error: 'No se pudo asegurar la sala nube.' };
    await pullOrSeed(client, roomId, setStatus);
    startCloudPushAndRuntime(chosenUser);
    await scheduleOptionalPush();
    setStatus('Nube lista.');
    toast('Nube sincronizada.', 'success');
    return { ok: true };
  } catch (err) {
    const msg = err?.data?.message || err?.message || 'Error de Nube';
    setStatus(msg);
    return { ok: false, error: msg };
  }
}

async function authAndBridge(client, mode, chosenUser, password, remember = false) {
  const body = {
    username: chosenUser.username,
    password,
    displayName: chosenUser.displayName,
  };
  const data = mode === 'login' ? await client.login(body) : await client.register(body);
  setCloudSyncToken(data.token, { remember });
  if (data.recoveryCode) await showRecoveryCodeModal({ code: data.recoveryCode });
  await bridgeCloudIdentityToLocal({
    username: chosenUser.username,
    displayName: chosenUser.displayName,
  });
}

async function joinTurnRoom(client, chosenUser, toast, setStatus) {
  const room = await ensureTurnRoom({
    api: client,
    getSala: () => chosenUser.sala,
    getToken: getCloudSyncToken,
    explicit: true, // the user just picked this sala in onboarding
    setCloudSyncRoomId,
    setCloudSyncRoomSnapshot,
    setCloudSyncRevision,
    onConnected: () => setCloudRoomConnected(true),
    toast,
  });
  const roomId = getCloudSyncRoomId() || room?.id;
  if (!roomId) {
    setStatus('Sin sala de turno.');
    toast('No se pudo asegurar la sala nube.', 'error');
    return '';
  }
  return roomId;
}

/**
 * A late joiner's first pull happens here, not in the runtime's runPullLatest —
 * flag it the same way so the sidebar reads «Descargando pacientes…» meanwhile
 * instead of «Sin pacientes aún».
 */
async function pullShowingDownload(client, roomId) {
  cloudPullProgress.freshInFlight = true;
  await import('../patients-list.mjs').then((m) => m.showPatientListDownloadingIfEmpty()).catch(() => {});
  try {
    return await client.pull(roomId, 0);
  } finally {
    cloudPullProgress.freshInFlight = false;
    void import('../patients-list.mjs').then((m) => m.settlePatientListAfterDownload()).catch(() => {});
  }
}

async function pullOrSeed(client, roomId, setStatus) {
  setStatus('Sincronizando equipos y censo…');
  // Key first: a sala with a key sends registro, diagnoses and clinical
  // content encrypted — pulled before the key, they would be dropped.
  await loadRoomDek(client, roomId, getCloudSyncRoomSnapshot()?.code || '').catch(() => null);
  const pull = await pullShowingDownload(client, roomId);
  await applyCloudPullResult(pull);
  // Still locked (key not opened): keep the revision at 0 so the runtime's
  // next pull asks for everything again instead of skipping what was dropped.
  if (pull?.revision != null && !pull.locked) setCloudSyncRevision(Number(pull.revision) || 0);
  await hydrateClinicalTeamsAfterCloudPull();
  if (Number(getCloudSyncRevision() || 0) > 0) {
    setStatus('Sincronizado con la sala nube.');
    return;
  }
  setStatus('Sala lista — crea o únete a un equipo en Mi rotación.');
}

function startCloudPushAndRuntime() {
  startSharedNubeRuntime({
    getApi: createApi,
    getCloudSyncRoomId,
    getCloudSyncToken,
    getCloudSyncRevision,
    setCloudSyncRevision,
    onStatus: function () {},
  });
}

async function scheduleOptionalPush() {
  try {
    const { scheduleCloudSyncPush } = await import('./mutate-bridge.mjs');
    scheduleCloudSyncPush();
  } catch {
    /* optional */
  }
}
