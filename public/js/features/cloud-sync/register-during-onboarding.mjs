/**
 * Cloud account + ensure-turn + pull/seed during onboarding / cutover.
 */
import { bridgeCloudIdentityToLocal } from './identity-bridge.mjs';
import { createCloudSyncApi } from './api-client.mjs';
import {
  getCloudSyncUrl,
  getCloudSyncToken,
  setCloudSyncToken,
  setCloudSyncRoomId,
  setCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncRevision,
} from './settings.mjs';
import { ensureTurnRoom } from './ensure-turn-room.mjs';
import { applyCloudPullResult } from './pull-apply.mjs';
import { hydrateClinicalTeamsAfterCloudPull } from './clinical-ops-hydrate.mjs';
import { configureCloudMutateBridge } from './mutate-bridge.mjs';
import { startCloudSyncRuntime } from './sync-runtime.mjs';
import { createOutbox } from './outbox.mjs';
import { setCloudRoomConnected } from './nube-sync-policy.mjs';
import { isCloudSala } from './sala-allowlist.mjs';
import { showRecoveryCodeModal } from './recovery-modal.mjs';

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
    await authAndBridge(client, opts.mode, chosenUser, password);
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

async function authAndBridge(client, mode, chosenUser, password) {
  const body = {
    username: chosenUser.username,
    password,
    displayName: chosenUser.displayName,
  };
  const data = mode === 'login' ? await client.login(body) : await client.register(body);
  setCloudSyncToken(data.token);
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
    setCloudSyncRoomId,
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

async function pullOrSeed(client, roomId, setStatus) {
  setStatus('Sincronizando equipos y censo…');
  const pull = await client.pull(roomId, 0);
  await applyCloudPullResult(pull);
  if (pull?.revision != null) setCloudSyncRevision(Number(pull.revision) || 0);
  await hydrateClinicalTeamsAfterCloudPull();
  if (Number(getCloudSyncRevision() || 0) > 0) {
    setStatus('Sincronizado con la sala nube.');
    return;
  }
  setStatus('Sala lista — crea o únete a un equipo en Mi rotación.');
}

function startCloudPushAndRuntime(chosenUser) {
  const outbox = createOutbox();
  configureCloudMutateBridge({
    getApi: createApi,
    getRoomId: getCloudSyncRoomId,
    getToken: getCloudSyncToken,
    getRevision: getCloudSyncRevision,
    setRevision: setCloudSyncRevision,
    outbox,
    getActorId: () => chosenUser.username || 'local',
  });
  startCloudSyncRuntime({
    getApi: createApi,
    getRoomId: getCloudSyncRoomId,
    getToken: getCloudSyncToken,
    getRevision: getCloudSyncRevision,
    setRevision: setCloudSyncRevision,
    outbox,
    getActorId: () => chosenUser.username || 'local',
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
