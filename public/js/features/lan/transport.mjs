/**
 * LAN HTTP transport, pairing, and host URL resolution (IM-11).
 */

import { storage } from '../../storage.js';
import { buildLanJoinUrls, resolveLanJoinHostUrl, liveSyncRoomLabel } from '../../lan-join-link.mjs';
import {
  rememberPrimaryHostUrl,
  pingLanHostUrl,
} from '../../lan-surrogate-host.mjs';
import { getPinnedHostUrl } from '../../lan-host-pin.mjs';
import { discoverLanHostsOnSubnet } from '../../lan-host-subnet-discovery.mjs';
import {
  evaluatePeerHostAction,
  fetchLanHostRank,
  getLocalLanHostMeta,
  pickPreferredLanPeerHost,
  resolveHostElection,
  syncLanHostClinicalMetaToDisk,
} from '../../lan-host-rank-policy.mjs';
import {
  pushBundleToHostUrl as pushBundleToHostUrlCore,
  runConsolidateIntoHost,
} from '../../lan-host-consolidation.mjs';
import { lanHostBasesSameMachine, normalizeLanHostBase } from '../../lan-host-subnet-discovery.mjs';
import {
  lanClient,
  clearActiveLiveSyncRoom,
  getLanClientId,
} from './runtime.mjs';
import { listLivePeerHostUrls } from '../../lan-surrogate-host.mjs';
import { clearRoomMembership, getRoomMembership } from '../../live-sync-membership.mjs';

const LAN_MIGRATION_NOTICE_KEY = 'rplus.lan.migrationNoticeShown';
const LAN_CONSOLIDATE_COOLDOWN_MS = 10 * 60 * 1000;
let _lastLanPairing = null;
/** @type {Map<string, number>} */
const _lanDeclinedConsolidateUntil = new Map();
let _lanSplitBrainWarned = false;

/** @type {{ runtime?: object, renderLanPanel?: () => void, joinLanRoom?: Function, resolveAutoJoinRoomId?: Function, openConnectionDropdown?: Function, bootLanRoomMembership?: Function } | null} */
let transportDeps = null;

export function registerLanSyncTransportDeps(deps) {
  transportDeps = deps && typeof deps === 'object' ? deps : null;
}

function deps() {
  if (!transportDeps) throw new Error('lan-sync-transport: registerLanSyncTransportDeps() not called');
  return transportDeps;
}

function runtime() {
  return deps().runtime || { showToast() {} };
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Salas REST no requieren WebSocket; el botón no debe depender solo de `lanClient.connected`. */
export function isLanSessionConfiguredForRest() {
  try {
    var c = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() : null;
    return !!(c && String(c.hostUrl || '').trim());
  } catch (_e) {
    return false;
  }
}

export function trimStoredLanBearer(code) {
  return String(code || '').trim();
}

export function persistLanClientConfig(hostUrl, teamCode) {
  var url = String(hostUrl || '').trim().replace(/\/+$/, '');
  var code = trimStoredLanBearer(teamCode);
  if (!url || !code) return false;
  var prev = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var prevUrl = String(prev.hostUrl || '').trim().replace(/\/+$/, '');
  var prevCode = trimStoredLanBearer(prev.teamCode);
  var changed = prevUrl !== url || prevCode !== code;
  storage.saveLanConfig({ hostUrl: url, teamCode: code });
  lanClient.configure({ hostUrl: url, teamCode: code });
  if (isLanRemoteJoinMode()) rememberPrimaryHostUrl(url);
  if (changed) {
    try {
      lanClient.disconnect();
      lanClient.connectSyncChannel();
    } catch (_e) {}
  }
  return changed;
}

/** Alinea rpc-lan-config / LanClient con el Bearer del anfitrión (archivo / IPC). */
export async function ensureLanClientTeamCodeAligned() {
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var hostUrl = String(cfg.hostUrl || '').trim().replace(/\/+$/, '');
  var uiRole = typeof storage.getLanUiRole === 'function' ? storage.getLanUiRole() : 'client';
  if (
    uiRole === 'host' &&
    window.electronAPI &&
    typeof window.electronAPI.getLanEffectiveTeamCode === 'function'
  ) {
    return !!(await syncLanSavedTeamCodeWithEffectiveHostCode());
  }
  if (!hostUrl) return false;
  return persistLanClientConfig(hostUrl, cfg.teamCode);
}

export async function lanFetchAuthed(path, opts) {
  await ensureLanClientTeamCodeAligned();
  var resp = await lanClient.fetch(path, opts);
  if (resp.status !== 401) return resp;
  if (window.electronAPI && typeof window.electronAPI.getLanEffectiveTeamCode === 'function') {
    await syncLanSavedTeamCodeWithEffectiveHostCode();
  }
  return lanClient.fetch(path, opts);
}

/** Bearer del anfitrión: config guardada o lan-team-code.txt vía IPC. */
export async function resolveHostBearerToken() {
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var fromCfg = trimStoredLanBearer(cfg.teamCode);
  if (fromCfg.length >= 32) return fromCfg;
  if (window.electronAPI && typeof window.electronAPI.getLanEffectiveTeamCode === 'function') {
    try {
      var info = await window.electronAPI.getLanEffectiveTeamCode();
      if (info && info.ok && info.code) return String(info.code).trim();
    } catch (_e) {}
  }
  return '';
}

export async function mintLanPairingTicket() {
  await ensureLanClientTeamCodeAligned();
  var bearer = await resolveHostBearerToken();
  if (!bearer) {
    var err = new Error('no_host_bearer');
    err.code = 'no_host_bearer';
    throw err;
  }
  var resp = await lanFetchAuthed('/api/lan/v1/auth/tickets', { method: 'POST' });
  if (!resp.ok) {
    var errHttp = new Error('ticket_mint_failed');
    errHttp.status = resp.status;
    throw errHttp;
  }
  var body = await resp.json();
  var ticketId = String(body.ticketId || '');
  var shareHost = await resolveLanShareBaseUrl();
  _lastLanPairing = {
    ticketId: ticketId,
    pin: String(body.pin || ''),
    joinUrl: shareHost && ticketId ? buildShareJoinUrl(shareHost, ticketId) : String(body.joinUrl || ''),
    expiresAt: body.expiresAt,
  };
  return _lastLanPairing;
}
function showLanMigrationNoticeModal() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lan-migration-notice-backdrop')) return;
  var backdrop = document.createElement('div');
  backdrop.id = 'lan-migration-notice-backdrop';
  backdrop.className = 'modal-backdrop open';
  backdrop.style.zIndex = '10050';
  backdrop.innerHTML =
    '<div class="lab-conflict-modal" style="max-width:420px;">' +
    '<h3>Seguridad de red del equipo</h3>' +
    '<p>El código LAN débil (<code>1234</code> u otro antiguo) se sustituyó por un token seguro en esta Mac anfitriona. Tus pacientes y salas LAN se conservaron.</p>' +
    '<p style="font-size:12px;color:var(--text-muted);">Quienes se unan deben usar un <strong>enlace o PIN nuevo</strong> que generes aquí (⇄). Los enlaces viejos con <code>?code=</code> ya no funcionan.</p>' +
    '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">' +
    '<button type="button" id="lan-migration-notice-ok" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Entendido</button>' +
    '</div></div>';
  document.body.appendChild(backdrop);
  var ok = backdrop.querySelector('#lan-migration-notice-ok');
  if (ok) {
    ok.onclick = function () {
      backdrop.remove();
    };
  }
  backdrop.addEventListener('click', function (ev) {
    if (ev.target === backdrop) backdrop.remove();
  });
}

export async function maybeShowLanMigrationNotice() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (sessionStorage.getItem(LAN_MIGRATION_NOTICE_KEY)) return;
  } catch (_e) {}
  if (!isLanSessionConfiguredForRest()) return;
  var resp;
  try {
    resp = await lanFetchAuthed('/api/lan/v1/host-status');
  } catch (_eNet) {
    return;
  }
  if (!resp || !resp.ok) return;
  var data;
  try {
    data = await resp.json();
  } catch (_eJson) {
    return;
  }
  if (!data || !data.requiresMigrationNotice) return;
  try {
    sessionStorage.setItem(LAN_MIGRATION_NOTICE_KEY, '1');
  } catch (_eSet) {}
  showLanMigrationNoticeModal();
}

async function persistGuestBearerFromExchange(data) {
  if (!data || !data.persist || data.storageTarget !== 'userData') return;
  if (!window.electronAPI || typeof window.electronAPI.lanGuestWriteBearer !== 'function') return;
  var token = trimStoredLanBearer(data.token);
  if (!token) return;
  try {
    await window.electronAPI.lanGuestWriteBearer({ token: token });
  } catch (_e) {}
}

export async function exchangeLanJoinFromInvite(hostUrl, ticketId, roomId) {
  var base = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  var tid = String(ticketId || '').trim();
  if (!base || !tid) {
    runtime().showToast('Falta la dirección del servidor o el ticket de invitación.', 'error');
    return;
  }
  var res;
  try {
    res = await fetch(base + '/api/lan/v1/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: tid }),
    });
  } catch (_e) {
    runtime().showToast('Error de red al unirse. Revisa Wi‑Fi y que R+ siga abierto en el anfitrión.', 'error');
    return;
  }
  if (!res.ok) {
    runtime().showToast(
      'Este enlace o PIN ya no es válido. Pide al anfitrión un nuevo enlace o PIN.',
      'error'
    );
    return;
  }
  var data;
  try {
    data = await res.json();
  } catch (_eJson) {
    runtime().showToast('Respuesta inválida del servidor.', 'error');
    return;
  }
  await persistGuestBearerFromExchange(data);
  configureLanFromMobileJoin(String(data.hostUrl || base), data.token, roomId);
}

/** En anfitrión Electron: alinea rpc-lan-config con el código efectivo del servidor. */
export async function syncLanSavedTeamCodeWithEffectiveHostCode() {
  if (!window.electronAPI || typeof window.electronAPI.getLanEffectiveTeamCode !== 'function') {
    return false;
  }
  var info;
  try {
    info = await window.electronAPI.getLanEffectiveTeamCode();
  } catch (_e) {
    return false;
  }
  if (!info || !info.ok || !info.code) return false;
  var cfg = typeof storage.getLanConfig === 'function' ? (storage.getLanConfig() || {}) : {};
  var hostUrl = String(cfg.hostUrl || '').trim().replace(/\/+$/, '');
  if (!hostUrl && window.electronAPI && typeof window.electronAPI.getLanCandidateBaseUrl === 'function') {
    try {
      hostUrl = String(await window.electronAPI.getLanCandidateBaseUrl() || '').trim().replace(/\/+$/, '');
    } catch (_eUrl) {}
  }
  persistLanClientConfig(hostUrl || String(cfg.hostUrl || '').trim().replace(/\/+$/, ''), info.code);
  return true;
}
export function isLanElectronDesktop() {
  return !!(
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.getLanCandidateBaseUrl === 'function'
  );
}

export function isLanRemoteJoinMode() {
  return typeof storage.getLanUiRole === 'function' && storage.getLanUiRole() === 'client';
}

export function isLocalLoopbackLanUrl(url) {
  try {
    const u = new URL(String(url || '').trim());
    return /^(localhost|127\.0\.0\.1)$/i.test(u.hostname);
  } catch (_e) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(String(url || '').trim());
  }
}

/** IP LAN para compartir con iPad / otras R+ (nunca localhost si hay interfaz). */
export async function resolveLanShareBaseUrl() {
  if (isLanElectronDesktop() && window.electronAPI && typeof window.electronAPI.getLanCandidateBaseUrl === 'function') {
    try {
      var fromElectron = String((await window.electronAPI.getLanCandidateBaseUrl()) || '')
        .trim()
        .replace(/\/+$/, '');
      if (fromElectron && !isLocalLoopbackLanUrl(fromElectron)) return fromElectron;
    } catch (_e) {}
  }
  var el = document.getElementById('lan-input-host-url');
  var fromInput = el && String(el.value || '').trim().replace(/\/+$/, '');
  if (fromInput && !isLocalLoopbackLanUrl(fromInput)) return fromInput;
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var fromCfg = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (fromCfg && !isLocalLoopbackLanUrl(fromCfg)) return fromCfg;
  return '';
}

export function buildShareJoinUrl(hostUrl, ticketId) {
  return buildLanJoinUrls(hostUrl, ticketId).joinUrl;
}

export async function resolveLanHostUrlAuto() {
  var shareUrl = await resolveLanShareBaseUrl();
  if (shareUrl) return shareUrl;
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var fromCfg = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (fromCfg) return fromCfg;
  if (!isLanElectronDesktop()) return '';
  return 'http://127.0.0.1:3738';
}

/** Corrige rol «cliente» en escritorio sin URL guardada (UI antigua con pestañas). */
function migrateLanElectronStaleClientRole() {
  if (!isLanElectronDesktop() || !isLanRemoteJoinMode()) return;
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() : null;
  if (cfg && String(cfg.hostUrl || '').trim()) return;
  if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('host');
}

/** Escritorio: detecta IP, alinea código y deja lista la URL del servidor embebido. */
export async function ensureLanElectronHostReady(opts) {
  opts = opts || {};
  migrateLanElectronStaleClientRole();
  if (!isLanElectronDesktop()) return false;
  if (opts.forceLocal) {
    if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('host');
  } else if (isLanRemoteJoinMode()) {
    return false;
  }
  await syncLanSavedTeamCodeWithEffectiveHostCode();
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var url = opts.forceLocal
    ? ''
    : String(cfg.hostUrl || '')
        .trim()
        .replace(/\/+$/, '');
  var autoUrl = await resolveLanHostUrlAuto();
  var bearer = await resolveHostBearerToken();
  if (!bearer) return false;

  if (url) {
    var isLocalUrl = (autoUrl && url === autoUrl) || isLocalLoopbackLanUrl(url);
    if (!isLocalUrl) {
      var reachable = await pingLanHostUrl(url, cfg.teamCode || bearer);
      if (!reachable) url = '';
    }
  }

  if (!url) url = autoUrl || 'http://127.0.0.1:3738';
  var shareUrl = await resolveLanShareBaseUrl();
  if (shareUrl && isLocalLoopbackLanUrl(url)) url = shareUrl;
  persistLanClientConfig(url, bearer);
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {}
  return true;
}

export async function pushBundleToHostUrl(winnerUrl, teamCode, roomId, envelope) {
  return pushBundleToHostUrlCore(winnerUrl, teamCode, roomId, envelope);
}

export async function consolidateIntoHost(winnerUrl, teamCode, opts) {
  opts = opts || {};
  const room = await import('./room.mjs');
  const roomId =
    typeof room.getActiveLiveSyncRoomId === 'function' ? room.getActiveLiveSyncRoomId() : '';
  return runConsolidateIntoHost(
    { winnerUrl, teamCode, requireConfirm: !!opts.requireConfirm },
    {
      getRoomId: () => roomId,
      buildBundle: (rid) => room.buildLiveSyncBundleEnvelope(rid),
      pushBundle: (url, code, rid, env) => pushBundleToHostUrl(url, code, rid, env),
      broadcastHandoff: async (url) => {
        const handoff = await room.enrichLiveSyncHelloPayload(
          room.buildLiveSyncHelloPayload(roomId)
        );
        handoff.type = 'livesync:host-handoff';
        handoff.newHostUrl = url;
        handoff.reason = 'consolidate-rank';
        lanClient.sendLive(handoff);
      },
      switchToClient: async (url, code) => {
        applyLanHostUrlSwitch(url, code, { skipRememberPrimary: false });
        if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('client');
        persistLanClientConfig(url, code);
        rememberPrimaryHostUrl(url);
        await room.tryReconnectLanToHostUrl?.(url, code);
      },
      confirmYield: () => {
        if (typeof confirm !== 'function') return true;
        const yes = confirm(
          opts.confirmMessage ||
            'Un anfitrión de mayor rango ya está activo. ¿Combinar y conectar como cliente?'
        );
        if (!yes) {
          _lanDeclinedConsolidateUntil.set(
            normalizeLanHostBase(winnerUrl),
            Date.now() + LAN_CONSOLIDATE_COOLDOWN_MS
          );
        }
        return yes;
      },
      showToast: (msg, kind) => runtime().showToast(msg, kind),
    }
  );
}

function lanConsolidateCooldownActive(peerUrl) {
  const until = _lanDeclinedConsolidateUntil.get(peerUrl) || 0;
  return Date.now() < until;
}

/**
 * Apply election matrix for one discovered peer host URL.
 * @returns {Promise<boolean>} true if role/connection changed
 */
export async function reactToDiscoveredLanHost(peerUrl, teamCode, opts) {
  opts = opts || {};
  const url = normalizeLanHostBase(peerUrl);
  const code = String(teamCode || '').trim();
  if (!url || !code) return false;
  if (getPinnedHostUrl()) return false;

  const ownUrl = normalizeLanHostBase((await resolveLanShareBaseUrl()) || '');
  if (!ownUrl || lanHostBasesSameMachine(url, ownUrl)) return false;

  const peer = await fetchLanHostRank(url, code);
  if (!peer) return false;
  const selfMeta = getLocalLanHostMeta();
  const election = resolveHostElection(selfMeta, peer, { selfUrl: ownUrl, peerUrl: url });
  const action = evaluatePeerHostAction(selfMeta, peer, election);

  if (action === 'stay-warn') {
    if (!_lanSplitBrainWarned) {
      _lanSplitBrainWarned = true;
      runtime().showToast(
        'Otro servidor R+ activo en ' +
          url +
          '. Solo debe haber un anfitrión en el turno.',
        'warning'
      );
    }
    return false;
  }
  if (action === 'noop') return false;
  if (action === 'silent-join') {
    return joinRemoteLanHostAsClient(url, code, {
      requireConfirm: false,
      toastLabel: peer.rank || 'R4',
    });
  }
  if (action === 'confirm-consolidate') {
    if (lanConsolidateCooldownActive(url)) return false;
    return consolidateIntoHost(url, code, {
      requireConfirm: true,
      confirmMessage:
        'Un anfitrión de mayor rango (' +
        (peer.rank || 'R4') +
        ') está en ' +
        url +
        '. ¿Combinar servidores y conectar como cliente?',
    });
  }
  return false;
}

/** Sin red o host remoto caído: usar el servidor embebido de esta Mac. */
export async function promoteThisMacToLanHost(opts) {
  opts = opts || {};
  if (!isLanElectronDesktop()) {
    runtime().showToast('Solo disponible en la app de escritorio.', 'info');
    return false;
  }
  if (!opts.skipOtherHostCheck) {
    const teamCode = getLanTeamCodeFromConfig();
    const ownUrl = (await resolveLanShareBaseUrl()) || '';
    if (teamCode && ownUrl) {
      const peers = await discoverLanHostsOnSubnet(teamCode, ownUrl);
      if (peers.length) {
        const peer = peers[0];
        const msg =
          'Ya hay un servidor R+ activo en ' +
          peer +
          '. ¿Activar otro servidor en esta Mac de todos modos?';
        if (typeof confirm === 'function' && !confirm(msg)) return false;
      }
    }
  }
  var wasRemoteClient = isLanRemoteJoinMode();
  if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('host');
  storage.saveLanConfig(null);
  lanClient.disconnect();
  if (wasRemoteClient) {
    clearActiveLiveSyncRoom();
    clearRoomMembership();
  }
  var ok = await ensureLanElectronHostReady({ forceLocal: true });
  deps().renderLanPanel();
  if (ok && !opts.skipToast) {
    runtime().showToast('Esta Mac ahora es el servidor del turno.', 'success');
  }
  if (!ok) {
    runtime().showToast('No se pudo activar el servidor local. Reinicia R+ e inténtalo de nuevo.', 'error');
  }
  return ok;
}

/**
 * Descubre anfitrión de mayor prioridad (R4 / admin) y conecta como cliente.
 * @param {{ boot?: boolean }} [opts]
 */
export { syncLanHostClinicalMetaToDisk } from '../../lan-host-rank-policy.mjs';

export async function tryAutoJoinPreferredLanHost(opts) {
  opts = opts || {};
  if (!isLanElectronDesktop() || isLanRemoteJoinMode()) return false;
  const teamCode = getLanTeamCodeFromConfig();
  if (!teamCode) return false;

  await syncLanHostClinicalMetaToDisk();

  if (getPinnedHostUrl()) return false;

  const ownUrl = (await resolveLanShareBaseUrl()) || '';
  let peers = listLivePeerHostUrls(getLanClientId());
  const subnetPeers = await discoverLanHostsOnSubnet(teamCode, ownUrl);
  const seen = new Set();
  peers = [...peers, ...subnetPeers].filter((u) => {
    const n = normalizeLanHostBase(u);
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
  if (!peers.length) return false;

  for (const peerUrl of peers) {
    const reacted = await reactToDiscoveredLanHost(peerUrl, teamCode);
    if (reacted) {
      if (!opts.boot) deps().renderLanPanel?.();
      return true;
    }
  }

  const pick = await pickPreferredLanPeerHost(peers, teamCode, ownUrl);
  if (!pick || !pick.url) return false;

  const joined = await joinRemoteLanHostAsClient(pick.url, teamCode, {
    requireConfirm: false,
    toastLabel: pick.peer?.rank || 'R4',
  });
  if (joined && !opts.boot) {
    deps().renderLanPanel?.();
  }
  return joined;
}

/** Cambia a cliente y apunta al anfitrión remoto. */
export async function joinRemoteLanHostAsClient(hostUrl, teamCode, opts) {
  opts = opts || {};
  const url = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (!url) return false;
  const ownUrl = (await resolveLanShareBaseUrl()) || '';
  if (ownUrl && url === ownUrl.replace(/\/+$/, '')) return false;

  if (isLanElectronDesktop() && typeof storage.saveLanUiRole === 'function') {
    storage.saveLanUiRole('client');
  }
  const switched = maybeApplyLanHostUrlSwitch(url, teamCode, {
    skipRememberPrimary: true,
    requireConfirm: !!opts.requireConfirm,
    confirmMessage: opts.confirmMessage,
  });
  if (!switched) return false;
  try {
    const room = await import('./room.mjs');
    if (typeof room.tryReconnectLanToHostUrl === 'function') {
      await room.tryReconnectLanToHostUrl(url, teamCode);
    }
  } catch (_e) {}
  const label = String(opts.toastLabel || '').trim();
  runtime().showToast(
    label
      ? 'Conectado al anfitrión del turno (' + label + ').'
      : 'Conectado al anfitrión del turno.',
    'success'
  );
  return true;
}

export async function initLanHostPlugAndPlay() {
  if (!isLanElectronDesktop() || isLanRemoteJoinMode()) return;
  await syncLanHostClinicalMetaToDisk();
  const joined = await tryAutoJoinPreferredLanHost({ boot: true });
  if (joined) return;
  await ensureLanElectronHostReady();
}

export async function resolveLanTeamCodeForShare() {
  var cfg = typeof storage.getLanConfig === 'function' ? (storage.getLanConfig() || {}) : {};
  var uiRole = typeof storage.getLanUiRole === 'function' ? storage.getLanUiRole() : 'client';
  if (uiRole === 'host') {
    var hostBearer = await resolveHostBearerToken();
    if (hostBearer) return hostBearer;
  }
  var teamInput = document.getElementById('lan-input-team-code');
  var fromInput = teamInput && teamInput.value != null ? String(teamInput.value).trim() : '';
  if (fromInput) return fromInput;
  return trimStoredLanBearer(cfg.teamCode);
}
export function getLanTeamCodeFromConfig() {
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  return trimStoredLanBearer(cfg.teamCode);
}

export function applyLanHostUrlSwitch(hostUrl, teamCode, opts) {
  opts = opts || {};
  var url = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  var code = trimStoredLanBearer(teamCode);
  if (!url) return false;
  if (!opts.skipRememberPrimary && isLanRemoteJoinMode()) rememberPrimaryHostUrl(url);
  persistLanClientConfig(url, code);
  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
  } catch (_e) {}
  return true;
}

/** When pin is set, block auto host URL changes unless user confirms (IM-08). */
export function maybeApplyLanHostUrlSwitch(hostUrl, teamCode, opts) {
  opts = opts || {};
  var url = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (!url) return false;
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var currentUrl = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  var pinned = getPinnedHostUrl();
  if (url === currentUrl) return applyLanHostUrlSwitch(url, teamCode, opts);
  if (opts.blockSwitch) return false;
  if (pinned) {
    if (url === pinned) return applyLanHostUrlSwitch(url, teamCode, opts);
    runtime().showToast('Anfitrión fijado: ' + pinned + '.', 'info');
    return false;
  }
  if (opts.requireConfirm) {
    var msg =
      opts.confirmMessage ||
      '¿Cambiar al anfitrión ' + url + '?';
    if (typeof confirm === 'function' && !confirm(msg)) return false;
  }
  return applyLanHostUrlSwitch(url, teamCode, opts);
}
export function formatLanTicketExpiryLabel(expiresAt) {
  var raw = String(expiresAt || '').trim();
  if (!raw) return '';
  var d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch (_e) {
    return d.toISOString().slice(11, 16);
  }
}

export function lanTicketExpirySoon(expiresAt) {
  var raw = String(expiresAt || '').trim();
  if (!raw) return false;
  var d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() - Date.now() < 60000;
}
export async function ensureLanPairingForShare(opts) {
  opts = opts || {};
  var hostUrl = await resolveLanHostUrlForShare();
  if (!hostUrl) {
    var errUrl = new Error('no_host_url');
    errUrl.code = 'no_host_url';
    throw errUrl;
  }
  if (opts.forceNew || !_lastLanPairing || !_lastLanPairing.ticketId) {
    await mintLanPairingTicket();
  }
  if (!_lastLanPairing || !_lastLanPairing.ticketId) {
    var errTicket = new Error('no_ticket');
    errTicket.code = 'no_ticket';
    throw errTicket;
  }
  return { hostUrl: hostUrl, pairing: _lastLanPairing };
}
export function configureLanFromMobileJoin(hostUrl, teamCode, roomId) {
  var resolvedHost =
    resolveLanJoinHostUrl(hostUrl, typeof location !== 'undefined' ? location.origin : '') ||
    String(hostUrl || '')
      .trim()
      .replace(/\/+$/, '');
  var cfg = { hostUrl: resolvedHost, teamCode: String(teamCode || '').trim() };
  if (!cfg.teamCode) return;
  if (isLanElectronDesktop() && typeof storage.saveLanUiRole === 'function') {
    storage.saveLanUiRole('client');
  }
  storage.saveLanConfig(cfg);
  rememberPrimaryHostUrl(cfg.hostUrl);
  lanClient.configure(cfg);
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {}
  lanClient
    .fetch('/api/lan/v1/ping')
    .then(function (r) {
      if (!r || !r.ok) {
        runtime().showToast(
          'No se pudo conectar al servidor. Revisa Wi‑Fi y que R+ esté abierto en el anfitrión.',
          'error'
        );
        deps().renderLanPanel();
        setTimeout(function () {
          if (typeof deps().openConnectionDropdown === 'function') deps().openConnectionDropdown();
        }, 400);
        return;
      }
      void maybeShowLanMigrationNotice();
      var rid = deps().resolveAutoJoinRoomId(roomId);
      if (rid) {
        deps().joinLanRoom(rid, liveSyncRoomLabel(rid));
        runtime().showToast(
          'Sincronizando pacientes de ' + liveSyncRoomLabel(rid) + '…',
          'success'
        );
        return;
      }
      runtime().showToast(
        'Conectado al servidor, pero el enlace no trae sala. Pide un enlace nuevo desde ⇄ en la Mac.',
        'warn'
      );
      deps().renderLanPanel();
      setTimeout(function () {
        if (typeof deps().openConnectionDropdown === 'function') deps().openConnectionDropdown();
      }, 500);
    })
    .catch(function () {
      runtime().showToast('Error de red al conectar con el anfitrión', 'error');
      deps().renderLanPanel();
    });
}

export async function resolveLanHostUrlForShare() {
  return resolveLanShareBaseUrl();
}

export function getLastLanPairing() {
  return _lastLanPairing;
}

export function updateLanPairingDisplay(root) {
  if (!root) return;
  var box = root.querySelector('#lan-pairing-display');
  if (!box) return;
  if (!_lastLanPairing || !_lastLanPairing.ticketId) {
    box.hidden = true;
    box.textContent = '';
    return;
  }
  box.hidden = false;
  var p = _lastLanPairing;
  var joinLine = p.joinUrl
    ? '<div><strong>Enlace:</strong> <code style="word-break:break-all;">' + esc(p.joinUrl) + '</code></div>'
    : '';
  var expiryLabel = formatLanTicketExpiryLabel(p.expiresAt);
  var expirySoon = lanTicketExpirySoon(p.expiresAt);
  var expiryLine = expiryLabel
    ? '<p class="lan-pairing-expiry' +
      (expirySoon ? ' lan-pairing-expiry--soon' : '') +
      '" style="margin:8px 0 0;font-size:12px;">Válido hasta <strong>' +
      esc(expiryLabel) +
      '</strong></p>'
    : '';
  box.innerHTML =
    '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);">Comparte el PIN o el enlace (un solo uso por ticket):</p>' +
    '<div><strong>PIN:</strong> <code>' + esc(p.pin) + '</code></div>' +
    '<div><strong>Ticket:</strong> <code>' + esc(p.ticketId) + '</code></div>' +
    joinLine +
    expiryLine;
}

export async function mintLanPairingFromUi() {
  try {
    await mintLanPairingTicket();
    var root = document.getElementById('lan-connection-panel-root');
    updateLanPairingDisplay(root);
    runtime().showToast('Enlace y PIN generados. Compártelos con el equipo.', 'success');
  } catch (e) {
    if (e && e.code === 'no_host_bearer') {
      runtime().showToast(
        'No hay token seguro del servidor en esta Mac. Reinicia R+ como anfitrión o revisa lan-team-code.txt.',
        'error'
      );
      return;
    }
    if (e && e.status === 401) {
      runtime().showToast('No autorizado para generar invitación. Revisa el token del anfitrión.', 'error');
      return;
    }
    runtime().showToast('No se pudo generar enlace / PIN. Intenta de nuevo.', 'error');
  }
}

export function initLanClientFromStorage() {
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() : null;
  if (!cfg || !String(cfg.hostUrl || '').trim()) return;
  persistLanClientConfig(cfg.hostUrl, cfg.teamCode);
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {}
  setTimeout(function () {
    var d = deps();
    var mem = getRoomMembership();
    if (mem && mem.roomId && typeof d.bootLanRoomMembership === 'function') {
      d.bootLanRoomMembership();
      return;
    }
    if (typeof d.resolveAutoJoinRoomId !== 'function' || typeof d.joinLanRoom !== 'function') return;
    var autoRoomId = d.resolveAutoJoinRoomId('');
    if (!autoRoomId) return;
    void d.joinLanRoom(autoRoomId, liveSyncRoomLabel(autoRoomId));
  }, 500);
}
