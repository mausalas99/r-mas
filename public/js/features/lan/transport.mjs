/**
 * LAN HTTP transport, pairing, and host URL resolution (IM-11).
 */

import { storage } from '../../storage.js';
import { buildLanJoinUrls, resolveLanJoinHostUrl, liveSyncRoomLabel } from '../../lan-join-link.mjs';
import { isMobileWeb } from '../../mobile-web.mjs';
import { restoreMobilePairingFromStorage } from '../../mobile-lan-query-persist.mjs';
import {
  applyMobileSharerContextFromUrl,
  appendMobileSharerParamsToJoinUrl,
  hydrateMobileSharerSessionFromSettings,
  mobileSharerDisplayLabel,
} from '../../mobile-sharer-sync.mjs';
import {
  rememberPrimaryHostUrl,
  pingLanHostUrl,
} from '../../lan-surrogate-host.mjs';
import {
  getPinnedHostUrl,
  hasPinnedHostOverride,
  isPinnedHostLocal,
} from '../../lan-host-pin.mjs';
import { lanHostBasesSameMachine, normalizeLanHostBase } from '../../lan-host-subnet-discovery.mjs';
import { discoverLanHostsOnSubnet } from '../../lan-host-subnet-discovery.mjs';
import {
  recordAutoHostDetectSuccess,
  resumeAutoHostDetect,
} from '../../lan-host-detect-guard.mjs';
import { isWardTierHostMeta, markWardTierHostSeen } from '../../lan-host-escalation.mjs';
import { buildLocalLanHostMeta } from '../../lan-host-rank.mjs';
import {
  canLocalMacBeLanHost,
  evaluatePeerHostAction,
  fetchLanHostRank,
  getLocalLanHostMeta,
  isClinicalRankConfiguredForLan,
  pickPreferredLanPeerHost,
  prefersLanHosting,
  resolveHostElection,
  syncLanHostClinicalMetaToDisk,
} from '../../lan-host-rank-policy.mjs';
import {
  pushBundleToHostUrl as pushBundleToHostUrlCore,
  runConsolidateIntoHost,
} from '../../lan-host-consolidation.mjs';
import {
  lanClient,
  activeLiveSyncRoomId,
  clearActiveLiveSyncRoom,
  getLanClientId,
} from './runtime.mjs';
import { getRoomSyncPhase, RoomSyncPhase } from '../../lan-sync-state.mjs';
import { isClinicalLocalOnlyMode, readRpcSettings } from '../../clinical-settings.mjs';
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
    return !!(
      c &&
      String(c.hostUrl || '').trim() &&
      trimStoredLanBearer(c.teamCode)
    );
  } catch (_e) {
    return false;
  }
}

/** True when REST hostUrl is this Mac (split-brain: live locally but not on ward host). */
export async function isLanRestHostOwnMachine() {
  if (!isLanSessionConfiguredForRest()) return false;
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var restHost = normalizeLanHostBase(String(cfg.hostUrl || '').trim());
  if (!restHost) return false;
  var own = normalizeLanHostBase((await resolveOwnLanBaseForPin()) || '');
  if (!own) return false;
  return lanHostBasesSameMachine(restHost, own) || restHost === own;
}

/** Client PIN entry on ⇄ (R1–R3, or not live on remote host). */
export async function shouldShowLanShiftPinClientConnect() {
  if (!isLanElectronDesktop()) return false;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return false;
  if (canLocalMacBeLanHost() && !isLanRemoteJoinMode()) return false;

  var rid = String(activeLiveSyncRoomId || '').trim();
  var phase = rid ? getRoomSyncPhase(rid) : RoomSyncPhase.offline;
  if (!rid || phase !== RoomSyncPhase.live) return true;
  if (isLanRemoteJoinMode()) return false;
  return isLanRestHostOwnMachine();
}

/** Host PIN display for R4+ acting as turn anfitrión. */
export function shouldShowLanShiftPinHostDisplay() {
  if (!isLanElectronDesktop()) return false;
  if (!canLocalMacBeLanHost() || isLanRemoteJoinMode()) return false;
  return true;
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

function fixMobileLanHostUrl(hostUrl) {
  var raw = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (!isMobileWeb() || typeof location === 'undefined') return raw;
  var fixed = resolveLanJoinHostUrl(raw, location.origin);
  if (fixed) return fixed;
  if (isLocalLoopbackLanUrl(raw)) {
    return String(location.origin || '')
      .trim()
      .replace(/\/+$/, '');
  }
  return raw;
}

export async function exchangeLanJoinFromInvite(hostUrl, ticketId, roomId) {
  var base = fixMobileLanHostUrl(hostUrl);
  var tid = String(ticketId || '').trim();
  if (!base || !tid) {
    runtime().showToast('Falta la dirección del servidor o el ticket de invitación.', 'error');
    return;
  }
  var ctrl = new AbortController();
  var timer = setTimeout(function () {
    ctrl.abort();
  }, 12000);
  var res;
  try {
    res = await fetch(base + '/api/lan/v1/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: tid }),
      signal: ctrl.signal,
    });
  } catch (_e) {
    runtime().showToast('Error de red al unirse. Revisa Wi‑Fi y que R+ siga abierto en el anfitrión.', 'error');
    return;
  } finally {
    clearTimeout(timer);
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

/**
 * Wi‑Fi may not expose IPv4 until after link-up; retry instead of sticking on 127.0.0.1.
 * @param {{ ensureServer?: boolean, tries?: number, delayMs?: number }} [opts]
 */
async function refreshElectronLanCandidateUrl(opts) {
  opts = opts || {};
  if (!isLanElectronDesktop() || !window.electronAPI?.getLanCandidateBaseUrl) return '';
  const tries = Math.max(1, Number(opts.tries) || 5);
  const delayMs = Math.max(50, Number(opts.delayMs) || 300);
  for (let i = 0; i < tries; i += 1) {
    if (opts.ensureServer && i === 0 && typeof window.electronAPI.ensureLanServerReady === 'function') {
      try {
        await window.electronAPI.ensureLanServerReady();
      } catch (_e) {}
    }
    try {
      const url = String((await window.electronAPI.getLanCandidateBaseUrl()) || '')
        .trim()
        .replace(/\/+$/, '');
      if (url && !isLocalLoopbackLanUrl(url)) return url;
    } catch (_e) {}
    if (i < tries - 1) {
      await new Promise(function (resolve) {
        setTimeout(resolve, delayMs);
      });
    }
  }
  return '';
}

/** IP LAN para compartir con iPad / otras R+ (nunca localhost si hay interfaz). */
export async function resolveLanShareBaseUrl() {
  var fromElectron = await refreshElectronLanCandidateUrl({ ensureServer: true });
  if (fromElectron) return fromElectron;
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

/** Best-effort LAN base for this Mac (share URL, config, Electron candidate). */
export async function resolveOwnLanBaseForPin() {
  const share = normalizeLanHostBase((await resolveLanShareBaseUrl()) || '');
  if (share && !isLocalLoopbackLanUrl(share)) return share;
  const cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  const fromCfg = normalizeLanHostBase(String(cfg.hostUrl || '').trim());
  if (fromCfg && !isLocalLoopbackLanUrl(fromCfg)) return fromCfg;
  if (isLanElectronDesktop() && window.electronAPI?.getLanCandidateBaseUrl) {
    try {
      const fromElectron = normalizeLanHostBase(
        String((await window.electronAPI.getLanCandidateBaseUrl()) || '').trim()
      );
      if (fromElectron && !isLocalLoopbackLanUrl(fromElectron)) return fromElectron;
    } catch (_e) {}
  }
  return share || fromCfg || '';
}

function pinTargetsThisMac(pinned, ownBase) {
  const target = normalizeLanHostBase(pinned);
  const own = normalizeLanHostBase(ownBase || '');
  if (!target || !own) return false;
  return isPinnedHostLocal(own) || lanHostBasesSameMachine(target, own);
}

/**
 * Pin wins over rank election: local pin → promote this Mac; remote pin → join that URL.
 * @param {string} [teamCode]
 * @param {{ boot?: boolean, quiet?: boolean }} [opts]
 */
export async function applyPinnedHostOverride(teamCode, opts) {
  opts = opts || {};
  const pinned = getPinnedHostUrl();
  const code = String(teamCode || getLanTeamCodeFromConfig() || '').trim();
  if (!pinned || !code) return false;
  if (!isClinicalRankConfiguredForLan()) return false;

  const ownUrl = await resolveOwnLanBaseForPin();
  if (pinTargetsThisMac(pinned, ownUrl)) {
    if (!canLocalMacBeLanHost()) {
      if (!opts.quiet) {
        runtime().showToast(
          'No puedes fijar esta Mac como anfitrión con tu rango todavía (escalada o R4/admin).',
          'info'
        );
      }
      return false;
    }
    if (isWardTierHostMeta(buildLocalLanHostMeta())) markWardTierHostSeen();
    const current = normalizeLanHostBase(lanClient.baseUrl() || '');
    const alreadyHost =
      !isLanRemoteJoinMode() &&
      current &&
      (pinTargetsThisMac(pinned, current) || lanHostBasesSameMachine(pinned, current));
    if (alreadyHost) {
      await ensureLanElectronHostReady({ forceLocal: true });
      return true;
    }
    return promoteThisMacToLanHost({
      skipOtherHostCheck: true,
      skipToast: !!opts.quiet || !!opts.boot,
    });
  }

  return tryConnectToPinnedHost(code, opts);
}

/** Corrige rol «cliente» en escritorio sin URL guardada (UI antigua con pestañas). */
function migrateLanElectronStaleClientRole() {
  if (!isLanElectronDesktop() || !isLanRemoteJoinMode()) return;
  if (!canLocalMacBeLanHost()) return;
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() : null;
  if (cfg && String(cfg.hostUrl || '').trim()) return;
  if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('host');
}

/** Escritorio: detecta IP, alinea código y deja lista la URL del servidor embebido. */
function demoteIneligibleLanHostUiRole() {
  if (!isLanElectronDesktop() || !isClinicalRankConfiguredForLan()) return;
  if (hasPinnedHostOverride()) return;
  if (canLocalMacBeLanHost()) return;
  if (typeof storage.getLanUiRole !== 'function' || storage.getLanUiRole() !== 'host') return;
  if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('client');
}

export async function ensureLanElectronHostReady(opts) {
  opts = opts || {};
  demoteIneligibleLanHostUiRole();
  migrateLanElectronStaleClientRole();
  if (!isLanElectronDesktop()) return false;
  if (!opts.forceLocal && !canLocalMacBeLanHost()) return false;
  if (opts.forceLocal && !canLocalMacBeLanHost()) return false;
  if (opts.forceLocal) {
    if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('host');
  } else if (isLanRemoteJoinMode()) {
    return false;
  } else if (typeof storage.saveLanUiRole === 'function') {
    storage.saveLanUiRole('host');
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

  if (!url || isLocalLoopbackLanUrl(url)) {
    var shareUrl = await resolveLanShareBaseUrl();
    if (shareUrl) url = shareUrl;
  }
  if (!url) url = autoUrl || 'http://127.0.0.1:3738';
  if (isLocalLoopbackLanUrl(url)) {
    var retried = await refreshElectronLanCandidateUrl({ ensureServer: true, tries: 6, delayMs: 400 });
    if (retried) url = retried;
  }
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
  if (!isClinicalRankConfiguredForLan()) return false;

  const pinned = getPinnedHostUrl();
  const ownUrl = await resolveOwnLanBaseForPin();
  if (pinned) {
    if (pinTargetsThisMac(pinned, ownUrl)) return false;
    if (normalizeLanHostBase(pinned) !== url) return false;
    return joinRemoteLanHostAsClient(url, code, {
      requireConfirm: false,
      toastLabel: 'fijado',
    });
  }

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
  if (!isClinicalRankConfiguredForLan()) {
    runtime().showToast(
      'Completa «Configura tu rotación» (rango y sala) antes de usar la red del turno.',
      'info'
    );
    return false;
  }
  if (!canLocalMacBeLanHost()) {
    const { getHostEscalationStatus, formatEscalationCountdown } = await import(
      '../../lan-host-escalation.mjs'
    );
    const esc = getHostEscalationStatus();
    const nextRank = ['R3', 'R2', 'R1'][esc.tier] || 'R1';
    const msg =
      esc.tier < 3 && esc.msUntilNext > 0
        ? 'Sin R4 en la red: en ' +
          formatEscalationCountdown(esc.msUntilNext) +
          ' podrá anfitrionar ' +
          nextRank +
          ' (escalada 10 min por nivel).'
        : 'Aún no puedes ser anfitrión en esta Mac. Busca al R4 o espera la escalada automática.';
    runtime().showToast(msg, 'info');
    return false;
  }
  if (!opts.skipOtherHostCheck) {
    const teamCode = getLanTeamCodeFromConfig();
    const ownUrl = (await resolveLanShareBaseUrl()) || '';
    if (teamCode && ownUrl) {
      const scanned = await discoverLanHostsOnSubnet(teamCode, ownUrl);
      const peers = [];
      for (const url of scanned) {
        const peerMeta = await fetchLanHostRank(url, teamCode);
        if (peerMeta && prefersLanHosting(peerMeta)) peers.push(url);
      }
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
  if (ok) {
    resumeAutoHostDetect();
    recordAutoHostDetectSuccess();
  }
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

/**
 * When pin targets a remote host, connect as client (IM-08 client-side pin).
 * @param {{ boot?: boolean, quiet?: boolean }} [opts]
 */
export async function tryConnectToPinnedHost(teamCode, opts) {
  opts = opts || {};
  const pinned = getPinnedHostUrl();
  const code = String(teamCode || '').trim();
  if (!pinned || !code) return false;

  const ownUrl = await resolveOwnLanBaseForPin();
  if (pinTargetsThisMac(pinned, ownUrl)) {
    return applyPinnedHostOverride(code, opts);
  }

  const target = normalizeLanHostBase(pinned);
  const current = normalizeLanHostBase(
    isLanRemoteJoinMode() ? lanClient.baseUrl() || '' : ownUrl
  );
  if (current && (current === target || lanHostBasesSameMachine(current, target))) {
    return false;
  }

  const alive = await pingLanHostUrl(target, code);
  if (!alive) {
    if (!opts.quiet && !opts.boot) {
      runtime().showToast(
        'Anfitrión fijado no responde (' + target + '). Verifica la red o el enlace.',
        'warning'
      );
    }
    return false;
  }

  const joined = await joinRemoteLanHostAsClient(target, code, {
    requireConfirm: false,
    toastLabel: 'fijado',
  });
  if (joined && !opts.boot) {
    deps().renderLanPanel?.();
  }
  return joined;
}

export async function tryAutoJoinPreferredLanHost(opts) {
  opts = opts || {};
  if (!isLanElectronDesktop()) return false;
  if (!isClinicalRankConfiguredForLan()) return false;
  const teamCode = getLanTeamCodeFromConfig();
  if (!teamCode) return false;

  await syncLanHostClinicalMetaToDisk();

  if (getPinnedHostUrl()) {
    return applyPinnedHostOverride(teamCode, opts);
  }

  if (isLanRemoteJoinMode()) return false;

  const ownUrl = normalizeLanHostBase((await resolveLanShareBaseUrl()) || '');

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
  const ownUrl = (await resolveOwnLanBaseForPin()) || '';
  if (ownUrl && (url === ownUrl.replace(/\/+$/, '') || lanHostBasesSameMachine(url, ownUrl))) {
    return false;
  }

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
  recordAutoHostDetectSuccess();
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
  if (!isLanElectronDesktop()) return;
  demoteIneligibleLanHostUiRole();
  if (!isClinicalRankConfiguredForLan()) return;
  try {
    const pinMod = await import('../../lan-shift-pin-connect.mjs');
    if (typeof pinMod.tryEasyLanShiftPinConnect === 'function') {
      const easy = await pinMod.tryEasyLanShiftPinConnect({ silent: true });
      if (easy.ok) return;
    }
  } catch (_ePin) {}
  await syncLanHostClinicalMetaToDisk();
  if (getPinnedHostUrl()) {
    if (await applyPinnedHostOverride(getLanTeamCodeFromConfig(), { boot: true })) return;
  }
  if (isLanRemoteJoinMode()) return;
  const joined = await tryAutoJoinPreferredLanHost({ boot: true });
  if (joined) return;
  if (canLocalMacBeLanHost()) {
    await ensureLanElectronHostReady();
  }
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
/**
 * R+ Móvil: mirror the sharer's sala bundle (invite room / identity), not manual «Unirse» UX.
 * @param {string} [hintRoomId]
 */
export async function syncMobileWithSharedInvite(hintRoomId) {
  if (!isMobileWeb()) return false;
  if (!isLanSessionConfiguredForRest()) return false;
  applyMobileSharerContextFromUrl();
  hydrateMobileSharerSessionFromSettings();
  var d = deps();
  if (!lanClient.baseUrl()) return false;
  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
  } catch (_e) {}
  var rid = '';
  if (typeof d.resolveAutoJoinRoomId === 'function') {
    rid = String(d.resolveAutoJoinRoomId(hintRoomId || '') || '').trim();
  }
  if (!rid) {
    runtime().showToast(
      'Conectado al anfitrión. Pide a quien compartió el enlace que esté en una sala ⇄ activa antes de abrir R+ Móvil.',
      'warn'
    );
    d.renderLanPanel?.();
    return false;
  }
  if (typeof d.joinLanRoom !== 'function') return false;
  runtime().showToast(
    'Sincronizando el turno de ' + mobileSharerDisplayLabel() + '…',
    'info'
  );
  d.renderLanPanel?.();
  void d
    .joinLanRoom(rid, liveSyncRoomLabel(rid), { silent: true, mobileSharerSync: true })
    .catch(function () {});
  return true;
}

/** @deprecated Use syncMobileWithSharedInvite */
export async function resumeMobileLanRoomJoin(hintRoomId) {
  return syncMobileWithSharedInvite(hintRoomId);
}

export function configureLanFromMobileJoin(hostUrl, teamCode, roomId) {
  var resolvedHost = fixMobileLanHostUrl(hostUrl);
  if (!resolvedHost) {
    resolvedHost =
      resolveLanJoinHostUrl(hostUrl, typeof location !== 'undefined' ? location.origin : '') ||
      String(hostUrl || '')
        .trim()
        .replace(/\/+$/, '');
  }
  var cfg = { hostUrl: resolvedHost, teamCode: String(teamCode || '').trim() };
  if (!cfg.teamCode || !cfg.hostUrl) return;
  if (isLanElectronDesktop() && typeof storage.saveLanUiRole === 'function') {
    storage.saveLanUiRole('client');
  }
  storage.saveLanConfig(cfg);
  if (isMobileWeb() && roomId) {
    try {
      var merged = Object.assign({}, cfg, { roomId: String(roomId || '').trim() });
      if (merged.roomId) storage.saveLanConfig(merged);
    } catch (_eRoom) {}
  }
  rememberPrimaryHostUrl(cfg.hostUrl);
  lanClient.configure(cfg);
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {}
  var pingMs = isMobileWeb() ? 3000 : 5000;
  var pingCtrl = new AbortController();
  var pingTimer = setTimeout(function () {
    pingCtrl.abort();
  }, pingMs);
  lanClient
    .fetch('/api/lan/v1/ping', { signal: pingCtrl.signal, cache: 'no-store' })
    .then(function (r) {
      clearTimeout(pingTimer);
      if (!r || !r.ok) {
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent('rpc-mobile-lan-sync-settled'));
        }
        runtime().showToast(
          'No se pudo conectar al servidor. Revisa Wi‑Fi y que R+ esté abierto en el anfitrión.',
          'error'
        );
        deps().renderLanPanel?.();
        return;
      }
      void maybeShowLanMigrationNotice();
      applyMobileSharerContextFromUrl();
      void syncMobileWithSharedInvite(roomId);
      deps().renderLanPanel?.();
    })
    .catch(function () {
      clearTimeout(pingTimer);
      if (isMobileWeb() && typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('rpc-mobile-lan-sync-settled'));
      }
      runtime().showToast('Error de red al conectar con el anfitrión', 'error');
      deps().renderLanPanel?.();
    });
}

export async function resolveLanHostUrlForShare() {
  return resolveLanShareBaseUrl();
}

export function getLastLanPairing() {
  return _lastLanPairing;
}

/**
 * @param {HTMLElement|null} root
 * @param {{ boxId?: string, mobileHints?: boolean, activeRoomId?: string, displayUrl?: string, permanent?: boolean }} [opts]
 */
export function updateLanPairingDisplay(root, opts) {
  opts = opts || {};
  var boxId = String(opts.boxId || 'lan-pairing-display-sala').trim();
  if (!root) root = document.getElementById('lan-connection-panel-root');
  if (!root) return;
  var box = root.querySelector('#' + boxId);
  if (!box) return;
  var displayUrl = String(opts.displayUrl || '').trim();
  var pairing = _lastLanPairing;
  if (!displayUrl) {
    if (!pairing || !pairing.ticketId) {
      box.hidden = true;
      box.textContent = '';
      return;
    }
    displayUrl = pairing.joinUrl || '';
    if (opts.mobileHints && displayUrl) {
      displayUrl = appendMobileSharerParamsToJoinUrl(displayUrl, opts.activeRoomId);
    }
  }
  box.hidden = false;
  var joinLine = displayUrl
    ? '<div><strong>Enlace:</strong> <code style="word-break:break-all;">' + esc(displayUrl) + '</code></div>'
    : '';
  var lead;
  var pinLine = '';
  var expiryLine = '';
  if (opts.permanent) {
    lead =
      'Enlace permanente para Safari (favoritos). Incluye tu identidad; no caduca mientras el código del equipo no cambie. No lo compartas fuera del turno.';
  } else if (opts.mobileHints) {
    lead = 'Enlace móvil (incluye tu identidad). Un solo uso por ticket:';
  } else {
    lead = 'Enlace de sala (sin tu identidad). Un solo uso por ticket:';
  }
  if (!opts.permanent && pairing) {
    pinLine = '<div><strong>PIN:</strong> <code>' + esc(pairing.pin) + '</code></div>';
    var expiryLabel = formatLanTicketExpiryLabel(pairing.expiresAt);
    var expirySoon = lanTicketExpirySoon(pairing.expiresAt);
    if (expiryLabel) {
      expiryLine =
        '<p class="lan-pairing-expiry' +
        (expirySoon ? ' lan-pairing-expiry--soon' : '') +
        '" style="margin:8px 0 0;font-size:12px;">Válido hasta <strong>' +
        esc(expiryLabel) +
        '</strong></p>';
    }
  }
  box.innerHTML =
    '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);">' + esc(lead) + '</p>' +
    pinLine +
    joinLine +
    expiryLine;
}

/**
 * @param {{ mobileHints?: boolean, boxId?: string, activeRoomId?: string, toastMsg?: string }} [opts]
 */
export async function mintLanPairingFromUi(opts) {
  opts = opts || {};
  try {
    await mintLanPairingTicket();
    var root = document.getElementById('lan-connection-panel-root');
    updateLanPairingDisplay(root, {
      boxId: opts.boxId || (opts.mobileHints ? 'lan-pairing-display-mobile' : 'lan-pairing-display-sala'),
      mobileHints: !!opts.mobileHints,
      activeRoomId: opts.activeRoomId,
    });
    runtime().showToast(
      opts.toastMsg ||
        (opts.mobileHints
          ? 'Enlace móvil generado. Cópialo abajo o usa «Copiar enlace móvil».'
          : 'Enlace de sala generado. Cópialo abajo o usa «Copiar enlace de sala».'),
      'success'
    );
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
  if (isMobileWeb()) restoreMobilePairingFromStorage();
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() : null;
  if (!cfg || !String(cfg.hostUrl || '').trim()) return;
  var hostUrl = fixMobileLanHostUrl(cfg.hostUrl);
  var teamCode = cfg.teamCode;
  if (hostUrl !== String(cfg.hostUrl || '').trim().replace(/\/+$/, '')) {
    storage.saveLanConfig({ hostUrl: hostUrl, teamCode: teamCode });
  }
  persistLanClientConfig(hostUrl, teamCode);
  if (isMobileWeb()) {
    return;
  }
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
