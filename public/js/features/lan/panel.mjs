/**
 * LAN connection panel UI (IM-11).
 */

import { storage } from '../../storage.js';
import { patients } from '../../app-state.mjs';
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { hasElevatedTeamPrivileges, canManageInternoQr } from '../../clinical-privileges.mjs';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { isClinicalLocalOnlyMode, readRpcSettings } from '../../clinical-settings.mjs';
import { filterJoinedTeams } from '../clinical-teams.mjs';
import { appendLanHubStatusCard, appendLanHubRoomsCard } from '../lan-hub-panel-shell.mjs';
import { appendInternoQrPanel } from '../interno-qr-panel.mjs';
import {
  buildPermanentMobileJoinUrl,
  parseLanInviteInput,
  parseLanJoinQuery,
  resolveLiveSyncRoomIdFromSala,
  liveSyncRoomLabel,
} from '../../lan-join-link.mjs';
import {
  appendMobileSharerParamsToJoinUrl,
  mobileSharerDisplayLabel,
  resolveMobilePairingRoomId,
} from '../../mobile-sharer-sync.mjs';
import { outboxSize } from '../../live-sync-outbox.mjs';
import { getHostBundleBases } from '../../host-bundle-bases.mjs';
import { getRoomMembership } from '../../live-sync-membership.mjs';
import {
  getPinnedHostUrl,
  setPinnedHostUrl,
  clearPinnedHostUrl,
  isPinnedHostLocal,
  isPinnedHostRemote,
} from '../../lan-host-pin.mjs';
import {
  getLanSyncDiagnostics,
  formatDiagnosticsReport,
} from '../../lan-sync-diagnostics.mjs';
import {
  listLivePeerHostUrls,
  pingLanHostUrl,
} from '../../lan-surrogate-host.mjs';
import { discoverLanHostsOnSubnet } from '../../lan-host-subnet-discovery.mjs';
import {
  formatEscalationCountdown,
  getHostEscalationStatus,
  isWardTierHostMeta,
  markWardTierHostSeen,
  updateLanHostEscalationFromPeerMetas,
} from '../../lan-host-escalation.mjs';
import {
  canLocalMacBeLanHost,
  isClinicalRankConfiguredForLan,
  prefersLanHosting,
  fetchLanHostRank,
} from '../../lan-host-rank-policy.mjs';
import { buildLocalLanHostMeta } from '../../lan-host-rank.mjs';
import {
  lanClient,
  activeLiveSyncRoomId,
} from './runtime.mjs';
import { getRoomSyncPhase } from '../../lan-sync-state.mjs';
import {
  isLanSessionConfiguredForRest,
  isLanElectronDesktop,
  isLanRemoteJoinMode,
  ensureLanElectronHostReady,
  promoteThisMacToLanHost,
  resolveLanShareBaseUrl,
  resolveHostBearerToken,
  resolveLanTeamCodeForShare,
  ensureLanClientTeamCodeAligned,
  lanFetchAuthed,
  mintLanPairingFromUi,
  formatLanTicketExpiryLabel,
  ensureLanPairingForShare,
  buildShareJoinUrl,
  getLanTeamCodeFromConfig,
  maybeApplyLanHostUrlSwitch,
  exchangeLanJoinFromInvite,
  syncLanSavedTeamCodeWithEffectiveHostCode,
  isLocalLoopbackLanUrl,
  resolveLanHostUrlForShare,
  resolveLanHostUrlAuto,
  updateLanPairingDisplay,
  tryAutoJoinPreferredLanHost,
  reactToDiscoveredLanHost,
  syncLanHostClinicalMetaToDisk,
  tryConnectToPinnedHost,
  initLanHostPlugAndPlay,
  applyPinnedHostOverride,
  resolveOwnLanBaseForPin,
} from './transport.mjs';
import {
  joinLanRoom,
  leaveLiveSyncRoom,
  syncLiveSyncStatusChrome,
} from './room.mjs';
import {
  scheduleLiveSyncPush,
  flushLiveSyncOutbox,
  pushClinicalOpsLanNow,
} from './push.mjs';
import { recordLanSyncError } from '../../lan-sync-diagnostics.mjs';

const LAN_KNOWN_ROOMS_LS = 'rpc-lan-known-rooms';
const LAN_HOST_CODE_HINT_SEEN_KEY = 'rpc-lan-host-code-hint-seen';
const LAN_SPLIT_BRAIN_HINT_KEY = 'rpc-lan-split-brain-hint-shown';
var _lanPanelRenderGen = 0;
var _lanPanelRenderChain = Promise.resolve();
var _lanPanelDelegationWired = false;
var _lanScanTimer = null;
var LAN_SCAN_INTERVAL_MS = 5000;
var SUBNET_LAN_SCAN_MIN_MS = 25000;
var _lastSubnetLanScanAt = 0;
var _lanLastPingAt = null;
var _lanLastPingStatus = 0;
var LAN_DISCONNECT_BANNER_MSG =
  'Sin conexión al host LAN. LiveSync (salas y relay) puede estar limitado hasta reconectar.';
var _lanLastConnected = true;
const LAN_SYNC_DIAG_OPEN_KEY = 'rpc-lan-sync-diagnostics-open';
const LAN_INVITE_MOBILE_OPEN_KEY = 'rpc-lan-invite-mobile-open';
const LAN_INVITE_SALA_OPEN_KEY = 'rpc-lan-invite-sala-open';

/** @type {{ runtime?: object } | null} */
let panelRuntime = null;

export function registerLanSyncPanelRuntime(ctx) {
  if (!ctx || typeof ctx !== 'object') return;
  panelRuntime = Object.assign(panelRuntime || {}, ctx);
}

function runtime() {
  return (
    panelRuntime || {
      showToast() {},
      isMobileWeb() {
        return false;
      },
      renderPatientList() {},
      closeSettingsDropdown() {},
      appendLanConflictDraftsSection: null,
    }
  );
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function readLanKnownRooms() {
  try {
    var raw = localStorage.getItem(LAN_KNOWN_ROOMS_LS);
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(function (x) { return x && x.id; }) : [];
  } catch (_e) {
    return [];
  }
}
function writeLanKnownRooms(arr) {
  try {
    localStorage.setItem(LAN_KNOWN_ROOMS_LS, JSON.stringify(arr.slice(0, 12)));
  } catch (_e) {}
}
function migrateLanLastRoomToKnown() {
  var list = readLanKnownRooms();
  if (list.length) return;
  var last = '';
  try {
    last = String(localStorage.getItem('rpc-lan-last-room') || '').trim();
  } catch (_e) {}
  if (last) writeLanKnownRooms([{ id: last, label: 'Última sala', joinedAt: Date.now() }]);
}
export function forgetLanRoomSession(roomId) {
  var id = String(roomId || '').trim();
  if (!id) return;
  writeLanKnownRooms(readLanKnownRooms().filter(function (r) { return r.id !== id; }));
  try {
    if (String(localStorage.getItem('rpc-lan-last-room') || '').trim() === id) {
      localStorage.removeItem('rpc-lan-last-room');
    }
  } catch (_e) {}
}
export function rememberLanRoomJoined(roomId, displayName) {
  var id = String(roomId || '').trim();
  if (!id) return;
  var label = String(displayName || '').trim() || id.slice(0, 14);
  var next = [{ id: id, label: label, joinedAt: Date.now() }];
  readLanKnownRooms().forEach(function (r) {
    if (r.id !== id) next.push(r);
  });
  writeLanKnownRooms(next);
}
export function appendLanKnownSessionsSection(root) {
  if (!root) return;
  migrateLanLastRoomToKnown();
  var list = readLanKnownRooms();
  var sec = document.createElement('div');
  sec.style.marginBottom = '14px';
  sec.style.paddingBottom = '12px';
  sec.style.borderBottom = '1px solid var(--border)';
  var h = document.createElement('div');
  h.style.fontSize = '11px';
  h.style.fontWeight = '700';
  h.style.textTransform = 'uppercase';
  h.style.letterSpacing = '0.4px';
  h.style.color = 'var(--text-muted)';
  h.style.marginBottom = '8px';
  h.textContent = 'Sesiones guardadas';
  sec.appendChild(h);
  if (!list.length) {
    var empty = document.createElement('p');
    empty.style.fontSize = '12px';
    empty.style.color = 'var(--text-muted)';
    empty.style.margin = '0';
    empty.style.lineHeight = '1.45';
    empty.textContent =
      'Aún no hay salas guardadas. Cuando estés conectado por LAN, elige una sala abajo y pulsa «Unirse»; después podrás volver a entrar desde aquí.';
    sec.appendChild(empty);
    root.appendChild(sec);
    return;
  }
  list.forEach(function (rec) {
    var row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.alignItems = 'center';
    row.style.marginBottom = '6px';
    var lab = document.createElement('span');
    lab.style.flex = '1';
    lab.style.fontSize = '13px';
    lab.style.overflow = 'hidden';
    lab.style.textOverflow = 'ellipsis';
    lab.style.whiteSpace = 'nowrap';
    lab.textContent = String(rec.label || rec.id);
    lab.title = String(rec.id);
    var inThisRoom = String(activeLiveSyncRoomId || '') === String(rec.id || '');
    var join = document.createElement('button');
    join.type = 'button';
    join.className = 'btn-lan-secondary';
    join.style.flex = '0 0 auto';
    join.textContent = inThisRoom ? 'En sala' : 'Unirse';
    join.disabled = inThisRoom;
    join.setAttribute('data-lan-action', 'join-known');
    join.setAttribute('data-room-id', String(rec.id || ''));
    join.setAttribute('data-room-label', String(rec.label || rec.id || ''));
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-lan-danger';
    del.style.flex = '0 0 auto';
    del.textContent = 'Quitar';
    del.title = 'Quitar de la lista';
    del.setAttribute('data-lan-action', 'forget-known');
    del.setAttribute('data-room-id', String(rec.id || ''));
    row.appendChild(lab);
    row.appendChild(join);
    row.appendChild(del);
    sec.appendChild(row);
  });
  var hint = document.createElement('p');
  hint.style.fontSize = '10px';
  hint.style.color = 'var(--text-muted)';
  hint.style.margin = '4px 0 0 0';
  hint.style.lineHeight = '1.35';
  hint.textContent = 'Se actualizan al unirte a una sala (relay en vivo).';
  sec.appendChild(hint);
  root.appendChild(sec);
}
var LAN_DISCONNECT_BANNER_MSG =
  'Sin conexión al host LAN. LiveSync (salas y relay) puede estar limitado hasta reconectar.';
var _lanLastConnected = true;

function readLanHideDisconnectBanner() {
  return typeof storage.getLanHideDisconnectBanner === 'function' && storage.getLanHideDisconnectBanner();
}

export function updateLanConnectionBanner(connected) {
  _lanLastConnected = !!connected;
  var el = document.getElementById('lan-connection-banner');
  if (!el) return;
  var textEl = document.getElementById('lan-connection-banner-text');
  if (connected || readLanHideDisconnectBanner()) {
    el.hidden = true;
    return;
  }
  if (textEl) textEl.textContent = LAN_DISCONNECT_BANNER_MSG;
  el.hidden = false;
}

export function syncLanDisconnectBannerPrefUi() {
  var cb = document.getElementById('lan-hide-disconnect-banner');
  if (cb) cb.checked = readLanHideDisconnectBanner();
}

function readLanLwwOverwriteToast() {
  return typeof storage.getLanLwwOverwriteToast === 'function' && storage.getLanLwwOverwriteToast();
}

export function syncLanLwwOverwriteToastPrefUi() {
  var cb = document.getElementById('settings-lan-lww-toast');
  if (cb) cb.checked = readLanLwwOverwriteToast();
}

export function setLanLwwOverwriteToastFromUi(enabled) {
  if (typeof storage.setLanLwwOverwriteToast === 'function') {
    storage.setLanLwwOverwriteToast(!!enabled);
  }
}

var _lanLwwToastPrefWired = false;
function wireLanLwwToastPref() {
  if (_lanLwwToastPrefWired) return;
  var cb = document.getElementById('settings-lan-lww-toast');
  if (!cb) return;
  _lanLwwToastPrefWired = true;
  cb.addEventListener('change', function () {
    setLanLwwOverwriteToastFromUi(cb.checked);
  });
}

export function dismissLanDisconnectBanner() {
  if (typeof storage.saveLanHideDisconnectBanner === 'function') {
    storage.saveLanHideDisconnectBanner(true);
  }
  updateLanConnectionBanner(_lanLastConnected);
  syncLanDisconnectBannerPrefUi();
}

export function setLanHideDisconnectBannerFromUi(hide) {
  if (typeof storage.saveLanHideDisconnectBanner === 'function') {
    storage.saveLanHideDisconnectBanner(!!hide);
  }
  updateLanConnectionBanner(_lanLastConnected);
}

export function appendLanDisconnectBannerPref(root) {
  if (!root) return;
  var wrap = document.createElement('div');
  wrap.className = 'lan-connect-field';
  wrap.style.marginTop = '6px';
  var label = document.createElement('label');
  label.className = 'lan-disconnect-banner-pref';
  label.setAttribute('for', 'lan-hide-disconnect-banner');
  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'lan-hide-disconnect-banner';
  cb.checked = readLanHideDisconnectBanner();
  cb.onchange = function () {
    setLanHideDisconnectBannerFromUi(cb.checked);
  };
  var span = document.createElement('span');
  span.textContent = 'Ocultar la franja de aviso cuando se pierde la conexión LAN';
  label.appendChild(cb);
  label.appendChild(span);
  wrap.appendChild(label);
  root.appendChild(wrap);
}

lanClient.addEventListener('lan-status', function (ev) {
  updateLanConnectionBanner(!!(ev.detail && ev.detail.connected));
});
lanClient.addEventListener('lan-patch', function () {
  syncLiveSyncStatusChrome();
});

export function patchLanPanelJoinButtons() {
  if (typeof document === 'undefined') return;
  var root = document.getElementById('lan-connection-panel-root');
  if (!root) return;
  root.querySelectorAll('[data-lan-action="join-room"], [data-lan-action="join-known"]').forEach(function (btn) {
    var rid = btn.getAttribute('data-room-id') || '';
    var inRoom = String(activeLiveSyncRoomId || '') === String(rid);
    btn.textContent = inRoom ? 'En sala' : 'Unirse';
    btn.disabled = inRoom;
  });
}

export function wireClinicalOpsLanSyncEvents() {
  if (typeof document === 'undefined') return;
  if (!document._rpcClinicalOpsSyncedLanWired) {
    document._rpcClinicalOpsSyncedLanWired = true;
    document.addEventListener('rpc-clinical-ops-synced', function () {
      void refreshClinicalSessionTeams().then(function () {
        renderLanPanel();
      });
    });
  }
  if (!document._rpcClinicalTeamsChangedLanWired) {
    document._rpcClinicalTeamsChangedLanWired = true;
    document.addEventListener('rpc-clinical-teams-changed', function () {
      void pushClinicalOpsLanNow().catch(function () {});
      scheduleLiveSyncPush();
    });
  }
}

var _lanPanelDelegationWired = false;
export function wireLanPanelDelegation() {
  if (_lanPanelDelegationWired) return;
  if (typeof document === 'undefined') return;
  var root = document.getElementById('lan-connection-panel-root');
  if (!root) return;
  _lanPanelDelegationWired = true;
  wireClinicalOpsLanSyncEvents();
  root.addEventListener('click', function (ev) {
    var btn = /** @type {HTMLElement | null} */ (
      ev.target && ev.target.closest ? ev.target.closest('[data-lan-action]') : null
    );
    if (!btn || !root.contains(btn) || /** @type {HTMLButtonElement} */ (btn).disabled) return;
    var action = btn.getAttribute('data-lan-action') || '';
    if (!action) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (action === 'join-room' || action === 'join-known') {
      joinLanRoom(btn.getAttribute('data-room-id'), btn.getAttribute('data-room-label'));
    } else if (action === 'forget-known') {
      forgetLanRoomSession(btn.getAttribute('data-room-id'));
      renderLanPanel({ force: true });
    } else if (action === 'delete-room') {
      deleteLanRoom(btn.getAttribute('data-room-id'));
    } else if (action === 'join-invite') {
      if (isLanElectronDesktop() && typeof storage.saveLanUiRole === 'function') {
        storage.saveLanUiRole('client');
      }
      joinLanFromInviteUi();
    } else if (action === 'host-activate') {
      saveLanSettingsFromUi({ copyInviteAfter: true });
    } else if (action === 'mint-pairing-mobile') {
      void mintMobileLanPairingFromUi();
    } else if (action === 'mint-pairing-sala' || action === 'mint-pairing') {
      void mintSalaLanPairingFromUi();
    }
  });
}
function resetLanToLocalHostFromUi() {
  void promoteThisMacToLanHost({ skipToast: true }).then(function (ok) {
    if (!ok) return;
    runtime().showToast('Esta Mac vuelve a ser el servidor del turno. Crea o únete a una sala.', 'success');
  });
}

function appendLanMobileSharerCard(root) {
  if (!root || !runtime().isMobileWeb()) return;
  var card = document.createElement('div');
  card.className = 'lan-connect-card lan-mobile-sharer-card';
  var who = esc(mobileSharerDisplayLabel());
  card.innerHTML =
    '<div class="lan-connect-card-title">Turno compartido</div>' +
    '<p class="lan-connect-card-hint">Sincronizando con <strong>' +
    who +
    '</strong>. Este enlace copia su identidad en la red; no uses «Unirse» a sala como en el escritorio.</p>';
  root.appendChild(card);
}

function appendLanMobileJoinSection(root) {
  if (!root || !runtime().isMobileWeb()) return;
  var card = document.createElement('div');
  card.className = 'lan-connect-card lan-mobile-join-card';
  card.innerHTML =
    '<div class="lan-connect-card-title">Conectar al turno</div>' +
    '<p class="lan-connect-card-hint">Abre el <strong>enlace móvil</strong> que te compartieron (⇄ → invitación al turno) o pégalo aquí. Debe incluir el anfitrión y la identidad de quien lo compartió.</p>';
  var inputInvite = document.createElement('textarea');
  inputInvite.className = 'profile-input';
  inputInvite.id = 'lan-input-invite-link';
  inputInvite.rows = 2;
  inputInvite.autocomplete = 'off';
  inputInvite.placeholder = 'http://192.168.x.x:3738/join/req_…';
  card.appendChild(inputInvite);
  var row = document.createElement('div');
  row.className = 'lan-connect-actions-row';
  row.style.marginTop = '8px';
  var btnJoin = document.createElement('button');
  btnJoin.type = 'button';
  btnJoin.className = 'btn-lan-primary';
  btnJoin.style.flex = '1';
  btnJoin.textContent = 'Conectar';
  btnJoin.setAttribute('data-lan-action', 'join-invite');
  row.appendChild(btnJoin);
  card.appendChild(row);
  root.insertBefore(card, root.firstChild);
}

function appendLanJoinOtherMacSection(root, opts) {
  opts = opts || {};
  if (!root || !isLanElectronDesktop()) return;

  var prominent = !isLanSessionConfiguredForRest();
  var container;
  if (prominent) {
    container = document.createElement('div');
    container.className =
      'lan-connect-card lan-connect-other-mac lan-connect-other-mac--prominent';
    var title = document.createElement('div');
    title.className = 'lan-connect-card-title';
    title.textContent = 'Conectar al anfitrión del turno';
    container.appendChild(title);
  } else {
    container = document.createElement('details');
    container.className = 'rpc-disclosure lan-connect-other-mac';
    container.style.marginBottom = '8px';
    if (opts.open) container.open = true;
    var sum = document.createElement('summary');
    sum.className = 'rpc-disclosure__summary';
    sum.style.fontSize = '12px';
    sum.style.color = 'var(--text-muted)';
    sum.textContent = 'Unirme a la sala de otra computadora (enlace de invitación)';
    container.appendChild(sum);
  }

  var inner = document.createElement('div');
  inner.className = prominent ? 'lan-connect-other-mac-body' : 'rpc-disclosure__body';
  var hint = document.createElement('p');
  hint.className = 'lan-connect-card-hint';
  hint.style.marginTop = prominent ? '4px' : '0';
  hint.innerHTML = prominent
    ? 'Pega el enlace <strong>Otra Mac del equipo</strong> que copiaste del anfitrión (<code>http://…/join/req_…</code>), luego pulsa <strong>Unirse con enlace</strong>.'
    : 'Pega el enlace que te compartieron. Esta R+ dejará de usar el servidor de <strong>esta</strong> Mac y se conectará a la otra.';
  inner.appendChild(hint);
  var inputInvite = document.createElement('textarea');
  inputInvite.className = 'profile-input';
  inputInvite.id = 'lan-input-invite-link';
  inputInvite.rows = 2;
  inputInvite.autocomplete = 'off';
  inputInvite.placeholder = 'http://…/join/req_… o PIN del anfitrión';
  inner.appendChild(inputInvite);
  var row = document.createElement('div');
  row.className = 'lan-connect-actions-row';
  row.style.marginTop = '8px';
  var btnJoin = document.createElement('button');
  btnJoin.type = 'button';
  btnJoin.className = prominent ? 'btn-lan-primary' : 'btn-lan-secondary';
  btnJoin.style.flex = '1';
  btnJoin.textContent = 'Unirse con enlace';
  btnJoin.setAttribute('data-lan-action', 'join-invite');
  row.appendChild(btnJoin);
  inner.appendChild(row);
  container.appendChild(inner);
  root.appendChild(container);
}

function appendLanBackToLocalHostSection(root) {
  if (!root || !isLanElectronDesktop() || !isLanRemoteJoinMode() || !canLocalMacBeLanHost()) return;
  var row = document.createElement('div');
  row.className = 'lan-connect-actions-row';
  row.style.marginBottom = '12px';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-lan-secondary';
  btn.style.flex = '1';
  btn.textContent = 'Usar esta Mac como servidor del turno';
  btn.onclick = resetLanToLocalHostFromUi;
  row.appendChild(btn);
  root.appendChild(row);
}

function lanPanelRenderStale(gen) {
  return gen !== _lanPanelRenderGen;
}

function purgeDuplicateLanRoomsPanels(root) {
  if (!root) return;
  var panels = root.querySelectorAll('.lan-rooms-panel');
  for (var i = 0; i < panels.length - 1; i += 1) {
    panels[i].remove();
  }
}

function purgeDuplicateLanShiftPinCards(root) {
  if (!root) return;
  var cards = root.querySelectorAll('.lan-shift-pin-card');
  for (var i = 0; i < cards.length - 1; i += 1) {
    cards[i].remove();
  }
}

function isLanConnectionDropdownOpen() {
  var dd = document.getElementById('connection-dropdown');
  return !!(dd && dd.classList.contains('open'));
}

function getConnectionDropdownScrollEl() {
  return document.getElementById('connection-dropdown');
}

function captureConnectionDropdownScrollTop() {
  var dd = getConnectionDropdownScrollEl();
  if (!dd || !dd.classList.contains('open')) return 0;
  return dd.scrollTop;
}

function restoreConnectionDropdownScrollTop(scrollTop) {
  var dd = getConnectionDropdownScrollEl();
  if (!dd || !dd.classList.contains('open')) return;
  var top = Math.max(0, Number(scrollTop) || 0);
  function apply() {
    if (dd.scrollHeight > 0) dd.scrollTop = Math.min(top, dd.scrollHeight - dd.clientHeight);
  }
  apply();
  requestAnimationFrame(function () {
    apply();
    requestAnimationFrame(apply);
  });
  setTimeout(apply, 0);
  setTimeout(apply, 50);
}

/** @param {{ force?: boolean } | undefined} [opts] */
function normalizeLanPanelRenderOpts(opts) {
  if (opts && typeof opts === 'object') return { force: !!opts.force };
  return { force: false };
}

function captureLanPanelExpandState(root) {
  var state = {
    syncDiagnostics: false,
    inviteMobile: false,
    inviteSala: false,
  };
  try {
    if (sessionStorage.getItem(LAN_SYNC_DIAG_OPEN_KEY) === '1') state.syncDiagnostics = true;
    if (sessionStorage.getItem(LAN_INVITE_MOBILE_OPEN_KEY) === '1') state.inviteMobile = true;
    if (sessionStorage.getItem(LAN_INVITE_SALA_OPEN_KEY) === '1') state.inviteSala = true;
  } catch (_ss) {}
  if (!root) return state;
  var diag = root.querySelector('.lan-sync-diagnostics-panel');
  if (diag && diag.open) state.syncDiagnostics = true;
  var mobile = root.querySelector('.lan-invite-collapsible--mobile');
  if (mobile && mobile.open) state.inviteMobile = true;
  var sala = root.querySelector('.lan-invite-collapsible--sala');
  if (sala && sala.open) state.inviteSala = true;
  return state;
}

function restoreLanPanelExpandState(root, state) {
  if (!root || !state) return;
  var diag = root.querySelector('.lan-sync-diagnostics-panel');
  if (diag && state.syncDiagnostics) diag.open = true;
  var mobile = root.querySelector('.lan-invite-collapsible--mobile');
  if (mobile && state.inviteMobile) mobile.open = true;
  var sala = root.querySelector('.lan-invite-collapsible--sala');
  if (sala && state.inviteSala) sala.open = true;
}

function lanPanelHasBuiltChrome(root) {
  return !!(root && root.querySelector('.lan-hub-status-card'));
}

function lanPanelNeedsFullRebuild(root) {
  if (!lanPanelHasBuiltChrome(root)) return true;
  if (
    !runtime().isMobileWeb() &&
    !isLanSessionConfiguredForRest() &&
    !root.querySelector('#lan-input-invite-link')
  ) {
    return true;
  }
  return false;
}

/** Light refresh while ⇄ is open (avoids full rebuild + scroll jump on LAN scan). */
async function refreshLanPanelChromeInPlace() {
  if (!isLanConnectionDropdownOpen()) return;
  var root = document.getElementById('lan-connection-panel-root');
  if (!root) return;
  var scrollTop = captureConnectionDropdownScrollTop();
  var hubStatus = lanHubStatusCopy();
  var statusCard = root.querySelector('.lan-hub-status-card');
  if (statusCard) {
    var connected = !!hubStatus.connected;
    var line =
      String(hubStatus.line || '').trim() ||
      (connected
        ? 'Conectado a la red del hospital'
        : 'Sin red \u2014 buscando anfitri\u00f3n en la Wi\u2011Fi del hospital\u2026');
    var lineEl = statusCard.querySelector('.lan-hub-status-line');
    if (lineEl) {
      lineEl.innerHTML =
        (connected
          ? '<span class="lan-hub-status-dot lan-hub-status-dot--online"></span> '
          : '<span class="lan-hub-status-dot lan-hub-status-dot--offline"></span> ') + esc(line);
    }
    var hints = statusCard.querySelectorAll('.lan-connect-card-hint');
    var hintText = String(hubStatus.hint || '').trim();
    if (hintText) {
      if (hints.length) hints[0].textContent = hintText;
      else {
        var hintEl = document.createElement('p');
        hintEl.className = 'lan-connect-card-hint';
        hintEl.style.marginTop = '6px';
        hintEl.textContent = hintText;
        statusCard.appendChild(hintEl);
      }
    } else if (hints.length) hints[0].remove();
  }
  await refreshLanSyncDiagnosticsInPlace();
  restoreConnectionDropdownScrollTop(scrollTop);
}

function requestRenderLanPanelAfterScan() {
  renderLanPanel();
}

/** Update diagnostics block without rebuilding the whole ⇄ panel (keeps &lt;details&gt; open). */
async function refreshLanSyncDiagnosticsInPlace() {
  if (!isLanConnectionDropdownOpen()) return;
  var root = document.getElementById('lan-connection-panel-root');
  if (!root) return;
  var scrollTop = captureConnectionDropdownScrollTop();
  await appendLanSyncDiagnosticsSection(root);
  restoreConnectionDropdownScrollTop(scrollTop);
}

/**
 * @param {{ force?: boolean } | undefined} [opts] Pass `{ force: true }` after explicit user actions in ⇄.
 */
export function renderLanPanel(opts) {
  var o = normalizeLanPanelRenderOpts(opts);
  if (!o.force && isLanConnectionDropdownOpen()) {
    void refreshLanPanelChromeInPlace();
    patchLanPanelJoinButtons();
    return _lanPanelRenderChain;
  }
  _lanPanelRenderChain = _lanPanelRenderChain
    .catch(function () {})
    .then(function () {
      return renderLanPanelOnce();
    });
  return _lanPanelRenderChain;
}

function getClinicalSettings() {
  try {
    return JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_e) {
    return {};
  }
}

function getClinicalRank() {
  var s = getClinicalSettings();
  return String(s.clinicalRank || '').trim();
}

function getUserSala() {
  var s = getClinicalSettings();
  return String(s.clinicalSala || '').trim();
}

function isClinicalRegistered() {
  var s = getClinicalSettings();
  return s.clinicalRegistered === true;
}

function isLanHostActive() {
  return !!lanClient.connected;
}

/** Host Mac can mint /join tickets once LAN REST config exists (WS may still be connecting). */
function canOfferMobileLanShare() {
  if (!isLanElectronDesktop() || isLanRemoteJoinMode()) return false;
  if (lanClient.connected) return true;
  return isLanSessionConfiguredForRest();
}

function appendLanInviteShareCards(root) {
  if (!root || !canOfferMobileLanShare()) return;
  appendLanMobileInviteCard(root);
  appendLanSalaInviteCard(root);
}

/**
 * @param {HTMLElement} root
 * @param {{ title: string, openKey: string, extraClass: string, fill: (body: HTMLElement) => void }} opts
 */
function appendLanInviteCollapsible(root, opts) {
  var details = document.createElement('details');
  details.className =
    'rpc-disclosure lan-connect-card lan-invite-collapsible lan-hub-invite-card ' +
    String(opts.extraClass || '');
  try {
    details.open = sessionStorage.getItem(opts.openKey) === '1';
  } catch (_openKey) {}
  details.addEventListener('toggle', function () {
    try {
      sessionStorage.setItem(opts.openKey, details.open ? '1' : '0');
    } catch (_toggle) {}
  });
  var sum = document.createElement('summary');
  sum.className = 'rpc-disclosure__summary lan-invite-collapsible-summary';
  sum.textContent = opts.title;
  details.appendChild(sum);
  var body = document.createElement('div');
  body.className = 'rpc-disclosure__body lan-invite-collapsible-body';
  opts.fill(body);
  details.appendChild(body);
  root.appendChild(details);
}

function appendLanMobileInviteCard(root) {
  appendLanInviteCollapsible(root, {
    title: 'iPad / R+ Móvil',
    openKey: LAN_INVITE_MOBILE_OPEN_KEY,
    extraClass: 'lan-invite-collapsible--mobile lan-hub-invite-card--mobile',
    fill: function (body) {
      var hint = document.createElement('p');
      hint.className = 'lan-connect-card-hint';
      hint.style.margin = '0 0 8px';
      hint.innerHTML =
        'Para que alguien use <strong>tu turno</strong> en el iPad (tu @usuario y pacientes). Enlace <strong>permanente</strong> para favoritos en Safari. <strong>No</strong> lo uses si debe entrar con su propia cuenta.';
      body.appendChild(hint);
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn-lan-primary';
      copyBtn.style.width = '100%';
      copyBtn.textContent = 'Copiar enlace móvil';
      copyBtn.onclick = function () {
        void copyMobileLanLinkFromUi();
      };
      body.appendChild(copyBtn);
      var genBtn = document.createElement('button');
      genBtn.type = 'button';
      genBtn.className = 'btn-lan-secondary';
      genBtn.style.width = '100%';
      genBtn.style.marginTop = '6px';
      genBtn.textContent = 'Generar y mostrar';
      genBtn.setAttribute('data-lan-action', 'mint-pairing-mobile');
      body.appendChild(genBtn);
      var pairingBox = document.createElement('div');
      pairingBox.id = 'lan-pairing-display-mobile';
      pairingBox.hidden = true;
      pairingBox.style.marginTop = '8px';
      pairingBox.style.fontSize = '12px';
      body.appendChild(pairingBox);
    },
  });
}

function appendLanSalaInviteCard(root) {
  appendLanInviteCollapsible(root, {
    title: 'Otra Mac del equipo',
    openKey: LAN_INVITE_SALA_OPEN_KEY,
    extraClass: 'lan-invite-collapsible--sala lan-hub-invite-card--sala',
    fill: function (body) {
      var hint = document.createElement('p');
      hint.className = 'lan-connect-card-hint';
      hint.style.margin = '0 0 8px';
      hint.innerHTML =
        'Para que un compañero se conecte a la red y entre a la sala con <strong>su</strong> @usuario. El enlace <strong>no</strong> lleva tu identidad; después debe pulsar «Unirse» en su sala.';
      body.appendChild(hint);
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn-lan-secondary';
      copyBtn.style.width = '100%';
      copyBtn.textContent = 'Copiar enlace de sala';
      copyBtn.onclick = function () {
        void copyLanInviteLinkFromUi();
      };
      body.appendChild(copyBtn);
      var genBtn = document.createElement('button');
      genBtn.type = 'button';
      genBtn.className = 'btn-lan-secondary';
      genBtn.style.width = '100%';
      genBtn.style.marginTop = '6px';
      genBtn.textContent = 'Generar y mostrar';
      genBtn.setAttribute('data-lan-action', 'mint-pairing-sala');
      body.appendChild(genBtn);
      var pairingBox = document.createElement('div');
      pairingBox.id = 'lan-pairing-display-sala';
      pairingBox.hidden = true;
      pairingBox.style.marginTop = '8px';
      pairingBox.style.fontSize = '12px';
      body.appendChild(pairingBox);
    },
  });
}

async function resolvePermanentMobileShareUrl() {
  var hostUrl = await resolveLanShareBaseUrl();
  var teamCode = String(await resolveLanTeamCodeForShare()).trim();
  if (!hostUrl || !teamCode) return '';
  return appendMobileSharerParamsToJoinUrl(
    buildPermanentMobileJoinUrl(hostUrl, teamCode),
    activeLiveSyncRoomId
  );
}

export async function mintMobileLanPairingFromUi() {
  var link = await resolvePermanentMobileShareUrl();
  if (!link) {
    runtime().showToast(
      'No hay anfitrión o código del equipo. Conéctate a la red del turno e inténtalo de nuevo.',
      'error'
    );
    return;
  }
  var root = document.getElementById('lan-connection-panel-root');
  updateLanPairingDisplay(root, {
    boxId: 'lan-pairing-display-mobile',
    displayUrl: link,
    permanent: true,
  });
  runtime().showToast(
    'Enlace listo abajo. En el iPad ábrelo en Safari (verás la app cargar) y luego Añadir a pantalla de inicio. Si el acceso directo no sincroniza, borra el icono y repite desde este enlace.',
    'success'
  );
}

export function mintSalaLanPairingFromUi() {
  return mintLanPairingFromUi({
    mobileHints: false,
    boxId: 'lan-pairing-display-sala',
    toastMsg: 'Enlace de sala listo abajo. También puedes usar «Copiar enlace de sala».',
  });
}

function lanHostUrl() {
  return lanClient.baseUrl() || '';
}

function maybeAppendInternoQrPanel(root) {
  if (!isLanElectronDesktop() || !isLanHostActive()) return;
  if (!canManageInternoQr(clinicalSessionContext.user)) return;
  void resolveLanHostUrlAuto().then(function (hostBaseUrl) {
    void appendInternoQrPanel(root, {
      hostBaseUrl: hostBaseUrl,
      userId: getClinicalUserUserId(),
      showToast: runtime().showToast,
    });
  });
}

function getClinicalUserUserId() {
  try {
    var user = typeof clinicalSessionContext !== 'undefined' ? clinicalSessionContext.user : null;
    return user ? String(user.user_id || '') : '';
  } catch (_e) {
    return '';
  }
}

async function renderLanPanelOnce() {
  var gen = ++_lanPanelRenderGen;
  var root = document.getElementById('lan-connection-panel-root');
  if (!root) return;

  var registered = isClinicalRegistered();
  var userSala = getUserSala();
  var rank = getClinicalRank();
  var clinicalUserId = getClinicalUserUserId();
  var rankConfigured = isClinicalRankConfiguredForLan();

  if (rankConfigured) {
    try {
      await syncLanHostClinicalMetaToDisk();
      if (canLocalMacBeLanHost()) {
        if (isWardTierHostMeta(buildLocalLanHostMeta())) {
          markWardTierHostSeen();
        }
        await ensureLanElectronHostReady();
      }
    } catch (_hostReadyErr) {
      // Non-fatal — still render panel so ⇄ stays usable offline.
    }
    if (getPinnedHostUrl() && !isLanConnectionDropdownOpen()) {
      void applyPinnedHostOverride(getLanTeamCodeFromConfig(), { quiet: true, boot: true });
    }
  }
  if (lanPanelRenderStale(gen)) return;
  if (isLanConnectionDropdownOpen() && lanPanelHasBuiltChrome(root) && !lanPanelNeedsFullRebuild(root)) {
    await refreshLanPanelChromeInPlace();
    patchLanPanelJoinButtons();
    return;
  }

  var expandState = captureLanPanelExpandState(root);
  var dropdownScrollTop = captureConnectionDropdownScrollTop();
  root.innerHTML = '';

  if (!registered && !clinicalUserId) {
    var unregCard = document.createElement('div');
    unregCard.className = 'lan-connect-card';
    unregCard.innerHTML =
      '<p class="lan-connect-card-hint">Desbloquea la base de datos y completa <strong>Configura tu rotación</strong> para acceder a la red del hospital.</p>';
    root.appendChild(unregCard);
    return;
  }

  if (!registered && clinicalUserId) {
    var preRegCard = document.createElement('div');
    preRegCard.className = 'lan-connect-card';
    preRegCard.innerHTML =
      '<p class="lan-connect-card-hint">Opcional: activa la red del turno y pulsa <strong>Unirse</strong> en tu sala para sincronizar con el equipo. Puedes registrar <strong>@usuario</strong> sin ⇄ si no hay red.</p>';
    root.appendChild(preRegCard);
  }

  if (registered && !userSala && !hasElevatedTeamPrivileges(clinicalSessionContext.user)) {
    var noSalaCard = document.createElement('div');
    noSalaCard.className = 'lan-connect-card';
    noSalaCard.innerHTML =
      '<p class="lan-connect-card-hint">No tienes una Sala asignada. Contacta a un R4 o Admin.</p>';
    root.appendChild(noSalaCard);
    return;
  }

  if (registered && !rankConfigured) {
    var needRankCard = document.createElement('div');
    needRankCard.className = 'lan-connect-card';
    needRankCard.innerHTML =
      '<p class="lan-connect-card-hint">Primero completa <strong>Configura tu rotación</strong> (rango y sala). Después R+ buscará al anfitrión del turno en la Wi\u2011Fi.</p>';
    root.appendChild(needRankCard);
    return;
  }

  var isElevated = hasElevatedTeamPrivileges(clinicalSessionContext.user);

  var hubStatus = lanHubStatusCopy();
  var needsInvitePaste = !runtime().isMobileWeb() && !isLanSessionConfiguredForRest();
  appendLanHubStatusCard(root, {
    connected: hubStatus.connected,
    statusLine: hubStatus.line,
    statusHint: hubStatus.hint,
    isElectronDesktop: isLanElectronDesktop(),
    showBecomeHost: canLocalMacBeLanHost(),
    showInvitePaste: needsInvitePaste,
    onBecomeHost: function () {
      void promoteThisMacToLanHost();
    },
  });

  await appendLanShiftPinSection(root, gen);
  if (lanPanelRenderStale(gen)) return;

  if (runtime().isMobileWeb() && !hubStatus.connected) {
    appendLanMobileJoinSection(root);
  }
  if (runtime().isMobileWeb() && hubStatus.connected) {
    appendLanMobileSharerCard(root);
  }

  if (isLanElectronDesktop() && !needsInvitePaste) {
    if (canOfferMobileLanShare()) {
      appendLanInviteShareCards(root);
    }
    appendLanJoinOtherMacSection(root, {
      open: isLanRemoteJoinMode() || !canOfferMobileLanShare(),
    });
  } else if (isLanElectronDesktop() && canOfferMobileLanShare()) {
    appendLanInviteShareCards(root);
  }

  var salaDefs = [
    { id: 'sala-1', label: 'Sala 1', key: 'Sala 1' },
    { id: 'sala-2', label: 'Sala 2', key: 'Sala 2' },
    { id: 'sala-e', label: 'Sala E', key: 'Sala E' }
  ];

  var visibleSalaDefs;
  if (isElevated) {
    visibleSalaDefs = salaDefs;
  } else if (userSala) {
    visibleSalaDefs = salaDefs.filter(function (d) {
      return d.key === userSala;
    });
    if (!visibleSalaDefs.length) visibleSalaDefs = salaDefs;
  } else if (!registered && clinicalUserId) {
    visibleSalaDefs = salaDefs;
  } else {
    visibleSalaDefs = [];
  }

  if (!runtime().isMobileWeb() || !hubStatus.connected) {
    appendLanHubRoomsCard(root, {
      visibleSalaDefs: visibleSalaDefs,
      activeRoomId: activeLiveSyncRoomId,
    });
  }

  if (rank === 'R1') {
    buildR1Section(root);
  } else if (rank === 'R2') {
    buildR2Section(root);
  } else if (isElevated) {
    buildR4Section(root);
  }

  appendLanHostPinSection(root);
  var appendConflictDrafts = runtime().appendLanConflictDraftsSection;
  if (typeof appendConflictDrafts === 'function') {
    void appendConflictDrafts(root);
  }
  await appendLanSyncDiagnosticsSection(root);
  if (lanPanelRenderStale(gen)) return;
  purgeDuplicateLanShiftPinCards(root);
  restoreLanPanelExpandState(root, expandState);
  restoreConnectionDropdownScrollTop(dropdownScrollTop);
  maybeAppendInternoQrPanel(root);
}

function appendLanHostPinSection(root) {
  if (!root || !isLanElectronDesktop() || !canLocalMacBeLanHost()) return;
  var hostUrl = lanHostUrl();
  if (!hostUrl && !getPinnedHostUrl()) return;
  var wrap = document.createElement('div');
  wrap.className = 'lan-connect-card lan-host-pin-card';
  var label = document.createElement('label');
  label.className = 'lan-host-pin-label';
  label.setAttribute('for', 'lan-pin-host-checkbox');
  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'lan-pin-host-checkbox';
  var ownBase = hostUrl || '';
  var pinned = getPinnedHostUrl();
  void resolveOwnLanBaseForPin().then(function (resolvedOwn) {
    var ownForPin = resolvedOwn || ownBase;
    cb.checked =
      !!pinned &&
      (pinned === String(hostUrl || '').replace(/\/+$/, '') ||
        isPinnedHostLocal(ownForPin) ||
        (ownForPin && pinned === ownForPin));
    cb.disabled = false;
    cb.onchange = function () {
      if (cb.checked) {
        void resolveLanShareBaseUrl().then(function (shareUrl) {
          var pinUrl = shareUrl || hostUrl || resolvedOwn;
          setPinnedHostUrl(pinUrl);
          void applyPinnedHostOverride(getLanTeamCodeFromConfig(), {}).then(function (ok) {
            if (ok) {
              runtime().showToast(
                'Anfitrión fijado: esta Mac asume el servidor del turno.',
                'success'
              );
            }
            renderLanPanel({ force: true });
          });
        });
      } else {
        clearPinnedHostUrl();
        runtime().showToast(
          'Anfitrión ya no está fijado; la red puede sugerir otro servidor.',
          'info'
        );
        renderLanPanel({ force: true });
      }
    };
  });
  label.appendChild(cb);
  label.appendChild(document.createTextNode(' Fijar anfitrión del turno (solo en la Mac servidor)'));
  wrap.appendChild(label);
  var hint = document.createElement('p');
  hint.className = 'lan-connect-card-hint';
  hint.style.marginTop = '6px';
  if (isLanRemoteJoinMode()) {
    hint.textContent =
      'Marca la casilla para forzar esta Mac como anfitrión (anula modo cliente y elección automática).';
  } else {
    hint.textContent =
      'Override del turno: esta Mac será el servidor aunque haya otros en la red. Desmarca para volver a elección automática.';
  }
  wrap.appendChild(hint);
  if (pinned) {
    void resolveOwnLanBaseForPin().then(function (resolvedOwn) {
      var ownResolved = resolvedOwn || ownBase;
      if (!isPinnedHostLocal(ownResolved) && isLanRemoteJoinMode()) {
        var remoteHint = document.createElement('p');
        remoteHint.className = 'lan-connect-card-hint';
        remoteHint.style.marginTop = '4px';
        remoteHint.textContent = 'Conectando al anfitrión fijado: ' + pinned;
        wrap.appendChild(remoteHint);
      } else if (isPinnedHostLocal(ownResolved) && isLanRemoteJoinMode()) {
        var localHint = document.createElement('p');
        localHint.className = 'lan-connect-card-hint';
        localHint.style.marginTop = '4px';
        localHint.textContent =
          'Fijado en esta Mac (' +
          pinned +
          '). La casilla fuerza servidor local (override).';
        wrap.appendChild(localHint);
      }
    });
  }
  root.appendChild(wrap);
}

/** Shared ward PIN for registration (reusable until shift TTL). */
async function appendLanShiftPinSection(root, gen) {
  if (!root || !isLanElectronDesktop()) return;
  if (lanPanelRenderStale(gen)) return;
  var bearer = await resolveHostBearerToken();
  if (!bearer || lanPanelRenderStale(gen)) return;
  try {
    var resp = await lanFetchAuthed('/api/lan/v1/auth/shift-pin');
    if (!resp.ok || lanPanelRenderStale(gen)) return;
    var body = await resp.json();
    var pin = String(body.pin || '').trim();
    if (!/^\d{6}$/.test(pin) || lanPanelRenderStale(gen)) return;

    root.querySelectorAll('.lan-shift-pin-card').forEach(function (el) {
      el.remove();
    });

    var wrap = document.createElement('div');
    wrap.className = 'lan-connect-card lan-shift-pin-card';
    wrap.setAttribute('data-lan-shift-pin', '1');

    var title = document.createElement('p');
    title.className = 'lan-connect-card-title';
    title.textContent = 'PIN del turno';
    wrap.appendChild(title);

    var lead = document.createElement('p');
    lead.className = 'lan-shift-pin-lead';
    lead.textContent =
      'Comparte este PIN al registrar @usuario (Configura tu rotación). Válido hasta fin de mes.';
    wrap.appendChild(lead);

    var display = document.createElement('p');
    display.className = 'lan-shift-pin-display';
    var code = document.createElement('code');
    code.id = 'lan-shift-pin-code';
    code.textContent = pin;
    display.appendChild(code);
    wrap.appendChild(display);

    var actions = document.createElement('div');
    actions.className = 'lan-shift-pin-actions';

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn-med-secondary';
    copyBtn.id = 'lan-copy-shift-pin';
    copyBtn.textContent = 'Copiar PIN';
    copyBtn.addEventListener('click', function () {
      copyToClipboardSafe(pin);
      runtime().showToast('PIN del turno copiado.', 'success');
    });
    actions.appendChild(copyBtn);

    var regenBtn = document.createElement('button');
    regenBtn.type = 'button';
    regenBtn.className = 'btn-med-secondary';
    regenBtn.id = 'lan-regen-shift-pin';
    regenBtn.textContent = 'Nuevo PIN';
    regenBtn.addEventListener('click', function () {
      void lanFetchAuthed('/api/lan/v1/auth/shift-pin/regenerate', { method: 'POST' }).then(
        function (r) {
          if (r && r.ok) {
            runtime().showToast('PIN del turno renovado.', 'success');
            renderLanPanel({ force: true });
          } else {
            runtime().showToast('No se pudo renovar el PIN.', 'error');
          }
        }
      );
    });
    actions.appendChild(regenBtn);
    wrap.appendChild(actions);

    if (body.expiresAt) {
      var exp = document.createElement('p');
      exp.className = 'lan-shift-pin-expiry';
      try {
        exp.textContent =
          'Válido hasta ' +
          new Date(body.expiresAt).toLocaleString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short',
          });
      } catch (_eExp) {
        exp.textContent = 'Válido hasta ' + String(body.expiresAt);
      }
      wrap.appendChild(exp);
    }

    if (lanPanelRenderStale(gen)) return;
    var anchor = root.querySelector('.lan-hub-status-card');
    if (anchor && anchor.nextSibling) {
      root.insertBefore(wrap, anchor.nextSibling);
    } else if (anchor) {
      anchor.insertAdjacentElement('afterend', wrap);
    } else {
      root.prepend(wrap);
    }
  } catch (_e) {}
}

async function buildLanSyncDiagnosticsDeps() {
  var roomId = String(activeLiveSyncRoomId || '').trim();
  var bases = roomId ? getHostBundleBases(roomId) : { revision: 0 };
  var outCount = 0;
  if (roomId) {
    try {
      outCount = await outboxSize(roomId);
    } catch (_e) {}
  }
  var aligned = false;
  try {
    aligned = !!(await ensureLanClientTeamCodeAligned());
  } catch (_e2) {}
  var clientId = typeof getLanClientId === 'function' ? getLanClientId() : '';
  var peerHosts =
    typeof listLivePeerHostUrls === 'function' ? listLivePeerHostUrls(clientId) : [];
  return {
    hostUrl: lanHostUrl(),
    pingAt: _lanLastPingAt,
    pingStatus: _lanLastPingStatus,
    wsSync: !!lanClient.connected,
    wsLive: !!lanClient.liveConnected,
    liveRoomId: String(lanClient.liveRoomId || ''),
    roomId: roomId,
    phase: getRoomSyncPhase(roomId),
    bundleRevision: Number(bases.revision || 0),
    outboxCount: outCount,
    pinnedHost: getPinnedHostUrl(),
    teamCodeAligned: aligned,
    peerHostCount: peerHosts.length,
  };
}

async function appendLanSyncDiagnosticsSection(root) {
  if (!root) return;
  var deps = await buildLanSyncDiagnosticsDeps();
  var diag = getLanSyncDiagnostics(deps);
  var report = formatDiagnosticsReport(diag);
  var existing = root.querySelector('.lan-sync-diagnostics-panel');
  if (existing) {
    var pre = existing.querySelector('.lan-sync-diagnostics-pre');
    if (pre) pre.textContent = report;
    var splitHint = existing.querySelector('.lan-sync-diagnostics-split-hint');
    var showSplit =
      diag.phase === 'live' &&
      diag.wsLive &&
      Number(diag.peerHostCount || 0) === 0 &&
      isLanElectronDesktop() &&
      !isLanRemoteJoinMode();
    if (showSplit && !splitHint) {
      var hint = document.createElement('p');
      hint.className = 'lan-connect-card-hint lan-sync-diagnostics-split-hint';
      hint.style.marginTop = '8px';
      hint.innerHTML =
        'Si el equipo no aparece en el directorio pero <strong>hostUrl</strong> difiere entre las Macs, hay <strong>dos servidores</strong> en la misma sala. Una Mac debe ser anfitrión y la otra conectarse con el enlace de invitación (⇄). Desactiva «Fijar anfitrión» si apunta a tu propia IP.';
      var insertPre = existing.querySelector('.lan-sync-diagnostics-pre');
      if (insertPre) existing.insertBefore(hint, insertPre);
      else existing.appendChild(hint);
    } else if (!showSplit && splitHint) {
      splitHint.remove();
    }
    return;
  }
  var details = document.createElement('details');
  details.className = 'rpc-disclosure lan-connect-card lan-sync-diagnostics-panel';
  try {
    details.open = sessionStorage.getItem(LAN_SYNC_DIAG_OPEN_KEY) === '1';
  } catch (_open) {}
  details.addEventListener('toggle', function () {
    try {
      sessionStorage.setItem(LAN_SYNC_DIAG_OPEN_KEY, details.open ? '1' : '0');
    } catch (_t) {}
  });
  var sum = document.createElement('summary');
  sum.className = 'rpc-disclosure__summary';
  sum.textContent = 'Estado de sincronización';
  details.appendChild(sum);
  var diagBody = document.createElement('div');
  diagBody.className = 'rpc-disclosure__body';
  var pre = document.createElement('pre');
  pre.className = 'lan-sync-diagnostics-pre';
  pre.textContent = report;
  if (
    diag.phase === 'live' &&
    diag.wsLive &&
    Number(diag.peerHostCount || 0) === 0 &&
    isLanElectronDesktop() &&
    !isLanRemoteJoinMode()
  ) {
    var hint = document.createElement('p');
    hint.className = 'lan-connect-card-hint lan-sync-diagnostics-split-hint';
    hint.style.margin = '0';
    hint.innerHTML =
      'Si el equipo no aparece en el directorio pero <strong>hostUrl</strong> difiere entre las Macs, hay <strong>dos servidores</strong> en la misma sala. Una Mac debe ser anfitrión y la otra conectarse con el enlace de invitación (⇄). Desactiva «Fijar anfitrión» si apunta a tu propia IP.';
    diagBody.appendChild(hint);
  }
  diagBody.appendChild(pre);
  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn-lan-secondary';
  copyBtn.style.width = '100%';
  copyBtn.textContent = 'Copiar informe';
  copyBtn.onclick = function () {
    var report = formatDiagnosticsReport(getLanSyncDiagnostics(deps));
    void copyToClipboardSafe(report).then(function (ok) {
      runtime().showToast(
        ok ? 'Informe copiado (códigos redactados).' : 'No se pudo copiar el informe.',
        ok ? 'success' : 'error'
      );
    });
  };
  diagBody.appendChild(copyBtn);
  var retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'btn-lan-secondary';
  retryBtn.style.marginTop = '6px';
  retryBtn.style.width = '100%';
  retryBtn.textContent = 'Reintentar cola de sincronización';
  retryBtn.onclick = function () {
    var rid =
      String(activeLiveSyncRoomId || '').trim() ||
      String((getRoomMembership() && getRoomMembership().roomId) || '').trim();
    if (!rid) {
      runtime().showToast('No hay sala activa para reintentar.', 'warn');
      return;
    }
    void flushLiveSyncOutbox(rid).then(function () {
      runtime().showToast('Cola reintentada. Revisa el informe abajo.', 'info');
      renderLanPanel({ force: true });
    });
  };
  diagBody.appendChild(retryBtn);
  details.appendChild(diagBody);
  root.appendChild(details);
}
function buildR1Section(root) {
  var userSala = getUserSala();
  var card = document.createElement('div');
  card.className = 'lan-connect-card lan-hub-team-card';
  card.innerHTML = '<div class="lan-connect-card-title">Mi equipo</div>';

  var user = clinicalSessionContext.user || {};
  var joined = filterJoinedTeams(clinicalSessionContext.teams || [], user);
  var myTeam = joined[0] || null;

  if (myTeam) {
    var teamName = document.createElement('p');
    teamName.className = 'lan-hub-team-name';
    teamName.textContent = 'Mi equipo: ' + (myTeam.name || 'Sin nombre');
    card.appendChild(teamName);
  } else {
    var noTeam = document.createElement('p');
    noTeam.className = 'lan-connect-card-hint';
    noTeam.innerHTML = 'Sin equipo — <button type="button" class="lan-hub-link-btn" id="lan-hub-join-team">Unirse a un equipo</button>';
    card.appendChild(noTeam);
  }

  root.appendChild(card);
  var joinTeamBtn = card.querySelector('#lan-hub-join-team');
  if (joinTeamBtn) {
    joinTeamBtn.onclick = function () {
      var availCard = document.getElementById('lan-hub-available-teams');
      if (availCard) {
        availCard.remove();
        return;
      }
      var avail = document.createElement('div');
      avail.id = 'lan-hub-available-teams';
      avail.className = 'lan-connect-card';
      avail.innerHTML = '<div class="lan-connect-card-title">Equipos disponibles</div>';
      buildAvailableTeamsSection(avail, userSala);
      card.parentNode.insertBefore(avail, card.nextSibling);
    };
  }

}

function buildR2Section(root) {
  buildR1Section(root);

  var user = clinicalSessionContext.user || {};
  var myTeam = filterJoinedTeams(clinicalSessionContext.teams || [], user)[0] || null;

  if (!myTeam) return;

  var entregaCard = document.createElement('div');
  entregaCard.className = 'lan-connect-card lan-hub-entrega-card';
  entregaCard.innerHTML = '<div class="lan-connect-card-title">Solicitar entrega</div>';

  var guardiasForTeam = (clinicalSessionContext.guardias || []).filter(function (g) {
    return g && String(g.source_team_id) === String(myTeam.team_id);
  });

  if (!guardiasForTeam.length) {
    var emptyHint = document.createElement('p');
    emptyHint.className = 'lan-connect-card-hint';
    emptyHint.textContent = 'No hay pacientes entregados por tu equipo.';
    entregaCard.appendChild(emptyHint);
  } else {
    var entregaList = document.createElement('ul');
    entregaList.style.listStyle = 'none';
    entregaList.style.padding = '0';
    entregaList.style.margin = '0';
    guardiasForTeam.forEach(function (g) {
      var li = document.createElement('li');
      li.style.marginBottom = '6px';
      li.style.fontSize = '12px';
      li.textContent = 'Paciente ' + String(g.patient_id || '').slice(0, 8) + '\u2026' + ' \u2014 ' + (g.covering_user_id || '');
      entregaList.appendChild(li);
    });
    entregaCard.appendChild(entregaList);
  }

  root.appendChild(entregaCard);
}

async function openR4TeamCreationModal() {
  try {
    var mod = await import('../clinical-teams.mjs');
    if (typeof mod.openClinicalTeamsPanel === 'function') {
      mod.openClinicalTeamsPanel();
    } else {
      runtime().showToast('Panel de equipos no disponible.', 'error');
    }
  } catch (_e) {
    runtime().showToast('Panel de equipos no disponible.', 'error');
  }
}

async function handleFinalizarRotacion() {
  var api = typeof window !== 'undefined' ? (window.rplusDb || window.electronAPI) : null;
  if (!api || typeof api.dbRotationNueva !== 'function') {
    runtime().showToast('Operación no disponible.', 'error');
    return;
  }
  var user = typeof clinicalSessionContext !== 'undefined' ? clinicalSessionContext.user : null;
  var userId = user ? String(user.user_id || '') : '';
  var res = await api.dbRotationNueva({ userId: userId });
  if (res && res.ok) {
    runtime().showToast('Rotación finalizada. Crea nuevos equipos para el siguiente mes.', 'success');
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
    renderLanPanel({ force: true });
  } else {
    runtime().showToast(res && res.error || 'No se pudo finalizar la rotación.', 'error');
  }
}

function buildR4Section(root) {
  var teamCard = document.createElement('div');
  teamCard.className = 'lan-connect-card lan-hub-team-create-card';
  teamCard.innerHTML = '<div class="lan-connect-card-title">Crear equipos del mes</div>';

  var btnCreate = document.createElement('button');
  btnCreate.type = 'button';
  btnCreate.className = 'btn-lan-primary';
  btnCreate.style.width = '100%';
  btnCreate.textContent = 'Crear equipos del mes';
  btnCreate.onclick = function () {
    openR4TeamCreationModal();
  };
  teamCard.appendChild(btnCreate);
  root.appendChild(teamCard);

  var censusCard = document.createElement('div');
  censusCard.className = 'lan-connect-card lan-hub-census-card';
  censusCard.innerHTML = '<div class="lan-connect-card-title">Censo global</div>';

  var teams = clinicalSessionContext.teams || [];
  var allPatients = patients || [];
  var salas = ['Sala 1', 'Sala 2', 'Sala E'];

  salas.forEach(function (salaName) {
    var salaTeams = teams.filter(function (t) {
      return teamSalaKey(t) === salaName;
    });
    var salaPatientCount = allPatients.filter(function (p) {
      return p && String(p.sala || '') === salaName;
    }).length;

    var row = document.createElement('p');
    row.className = 'lan-connect-card-hint';
    row.style.marginBottom = '4px';
    row.textContent =
      salaName + ': ' + salaTeams.length + ' equipos · ' + salaPatientCount + ' pacientes';
    censusCard.appendChild(row);
  });

  var viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'btn-lan-secondary';
  viewBtn.style.width = '100%';
  viewBtn.style.marginTop = '8px';
  viewBtn.textContent = 'Ver censo en lista de pacientes';
  viewBtn.onclick = function () {
    try {
      localStorage.setItem('clinical.browseSala', '__all__');
      localStorage.setItem('clinical.censusFilterSala', '__all__');
    } catch (_e) {}
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
    if (typeof runtime().renderPatientList === 'function') runtime().renderPatientList();
    runtime().showToast('Censo global — usa los filtros en la lista de pacientes.', 'info');
  };
  censusCard.appendChild(viewBtn);

  root.appendChild(censusCard);

  var rotCard = document.createElement('div');
  rotCard.className = 'lan-connect-card lan-hub-rotation-card';
  rotCard.innerHTML = '<div class="lan-connect-card-title">Rotación</div>';
  var btnFinalizar = document.createElement('button');
  btnFinalizar.type = 'button';
  btnFinalizar.className = 'btn-lan-secondary';
  btnFinalizar.style.width = '100%';
  btnFinalizar.style.color = 'var(--danger)';
  btnFinalizar.textContent = 'Finalizar rotación (archivar equipos)';
  btnFinalizar.onclick = function () {
    void handleFinalizarRotacion();
  };
  rotCard.appendChild(btnFinalizar);
  root.appendChild(rotCard);
}

function teamSalaKey(team) {
  return String(team && team.sala || '').trim();
}

function buildAvailableTeamsSection(root, userSala) {
  var teams = clinicalSessionContext.teams || [];
  var user = clinicalSessionContext.user || {};
  var salaKey = String(userSala || '').trim();
  var alreadyInIds = filterJoinedTeams(teams, user).map(function (t) {
    return String(t.team_id);
  });
  var available = teams.filter(function (t) {
    return teamSalaKey(t) === salaKey && !t.archived_at && alreadyInIds.indexOf(String(t.team_id)) === -1;
  });

  if (!available.length) {
    var empty = document.createElement('p');
    empty.className = 'lan-connect-card-hint';
    empty.textContent = 'No hay equipos disponibles en tu Sala.';
    root.appendChild(empty);
    return;
  }

  var list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';
  available.forEach(function (t) {
    var li = document.createElement('li');
    li.style.display = 'flex';
    li.style.gap = '8px';
    li.style.alignItems = 'center';
    li.style.marginBottom = '6px';

    var info = document.createElement('span');
    info.style.flex = '1';
    info.style.fontSize = '12px';
    var cycle = t.sub_area_fraction ? String(t.sub_area_fraction) : '';
    info.textContent =
      (t.name || 'Equipo') +
      ' · ' +
      (t.service || '') +
      (cycle ? ' · ciclo ' + cycle : '');

    var joinBtn = document.createElement('button');
    joinBtn.type = 'button';
    joinBtn.className = 'btn-lan-secondary';
    joinBtn.style.flex = '0 0 auto';
    joinBtn.textContent = 'Unirse';
    joinBtn.onclick = function () {
      void joinClinicalTeam(String(t.team_id));
    };

    li.appendChild(info);
    li.appendChild(joinBtn);
    list.appendChild(li);
  });
  root.appendChild(list);
}

async function joinClinicalTeam(teamId) {
  var api = typeof window !== 'undefined' ? (window.rplusDb || window.electronAPI) : null;
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    runtime().showToast('Base de datos no disponible.', 'error');
    return;
  }
  var userId = getClinicalUserUserId();
  if (!userId) {
    runtime().showToast('No hay sesión clínica activa.', 'error');
    return;
  }

  var addRes = await api.dbClinicalTeamsMemberAdd({ teamId: teamId, userId: userId });
  if (!addRes || addRes.ok === false) {
    runtime().showToast(addRes?.error || 'No se pudo unir al equipo.', 'error');
    return;
  }

  var rank = getClinicalRank();
  if (rank === 'R2' && api && typeof api.dbClinicalTeamsPromoteLeader === 'function') {
    var promoteRes = await api.dbClinicalTeamsPromoteLeader({ teamId: teamId, userId: userId });
    if (!promoteRes || promoteRes.ok === false) {
      runtime().showToast('Unido al equipo pero no se pudo asignar como líder.', 'warn');
    }
  }

  runtime().showToast('Unido al equipo.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await refreshClinicalSessionTeams();
  renderLanPanel({ force: true });
}

export async function refreshClinicalSessionTeams() {
  var api = typeof window !== 'undefined' ? (window.rplusDb || window.electronAPI) : null;
  if (!api) return;
  if (typeof api.dbClinicalScopeContext === 'function') {
    var userId = getClinicalUserUserId();
    var res = await api.dbClinicalScopeContext({ userId: userId });
    if (res && res.ok && Array.isArray(res.context?.teams)) {
      clinicalSessionContext.teams = res.context.teams;
      if (res.context && typeof res.context === 'object') {
        clinicalSessionContext.scopeContext = res.context;
      }
      return;
    }
  }
  if (typeof api.dbClinicalTeamsList === 'function') {
    var listRes = await api.dbClinicalTeamsList();
    if (listRes && listRes.ok && Array.isArray(listRes.teams)) {
      clinicalSessionContext.teams = listRes.teams;
    }
  }
}
export function classifyAutoJoinSource() {
  if (typeof location !== 'undefined') {
    var parsedUrl = parseLanJoinQuery(location.search, location.origin);
    if (String(parsedUrl.roomId || '').trim()) return 'url';
  }
  var mem = getRoomMembership();
  if (mem && mem.roomId) return 'membership';
  try {
    var s = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    if (resolveLiveSyncRoomIdFromSala(s.clinicalSala)) return 'settings_sala';
  } catch (_e) {
    return 'none';
  }
  return 'none';
}

export function resolveAutoJoinRoomId(explicitRoomId) {
  var rid = String(explicitRoomId || '').trim();
  if (rid) return rid;
  if (typeof location !== 'undefined') {
    var parsed = parseLanJoinQuery(location.search, location.origin);
    rid = String(parsed.roomId || '').trim();
    if (rid) return rid;
  }
  var mem = getRoomMembership();
  if (mem && mem.roomId) return String(mem.roomId).trim();
  try {
    var s = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    return resolveLiveSyncRoomIdFromSala(s.clinicalSala);
  } catch (_e) {
    return '';
  }
}

export function lanHubStatusCopy() {
  if (!lanClient.connected) {
    if (!isClinicalRankConfiguredForLan()) {
      return {
        connected: false,
        line: 'Configura tu rotación para usar la red del turno',
        hint: 'Abre «Configura tu rotación» y confirma rango y sala; después buscaremos al anfitrión en la Wi\u2011Fi.',
      };
    }
    if (!canLocalMacBeLanHost()) {
      var esc = getHostEscalationStatus();
      var nextRank = ['R3', 'R2', 'R1'][esc.tier] || '';
      var escHint =
        esc.tier < 3 && esc.msUntilNext > 0
          ? 'Sin R4/admin en la red: en ' +
            formatEscalationCountdown(esc.msUntilNext) +
            ' podrá anfitrionar ' +
            nextRank +
            ' (escalada automática 10+10+10 min).'
          : 'R1\u2013R3 esperan anfitri\u00f3n R4 o escalada. Pide enlace (\u21C4) o pégalo abajo.';
      return {
        connected: false,
        line: 'Sin red \u2014 buscando anfitri\u00f3n en la Wi\u2011Fi del hospital\u2026',
        hint: escHint,
      };
    }
    return {
      connected: false,
      line: 'Sin red \u2014 buscando anfitri\u00f3n en la Wi\u2011Fi del hospital\u2026',
      hint: 'Si otra Mac ya es anfitri\u00f3n, pide su enlace (\u21C4 \u2192 Copiar enlace de sala) o pégalo abajo.',
    };
  }
  if (isLanRemoteJoinMode()) {
    var remoteUrl = String(lanClient.baseUrl() || '').replace(/\/+$/, '');
    return {
      connected: true,
      line: 'Conectado al anfitri\u00f3n del turno',
      hint: remoteUrl ? 'Servidor: ' + remoteUrl : '',
    };
  }
  return {
    connected: true,
    line: activeLiveSyncRoomId
      ? 'Esta Mac es el servidor del turno'
      : 'Servidor local activo \u2014 comparte el enlace de invitaci\u00f3n',
    hint:
      'Comparte el enlace de sala (\u21C4 \u2192 Copiar enlace de sala). Para iPad usa «Copiar enlace móvil». No activen otro servidor salvo suplente.',
  };
}

function lanAutoJoinConfirmedSessionKey(roomId) {
  return 'rpc-lan-auto-join-confirmed-' + String(roomId || '').trim();
}

export function hasLanAutoJoinConfirmed(roomId) {
  try {
    return sessionStorage.getItem(lanAutoJoinConfirmedSessionKey(roomId)) === '1';
  } catch (_e) {
    return false;
  }
}

export function setLanAutoJoinConfirmed(roomId) {
  try {
    sessionStorage.setItem(lanAutoJoinConfirmedSessionKey(roomId), '1');
  } catch (_e) {}
}

export function startLanAutoDiscovery() {
  if (isClinicalLocalOnlyMode(readRpcSettings())) return;
  if (_lanScanTimer) return;
  _lanScanTimer = setInterval(function () {
    void scanLanHosts();
  }, LAN_SCAN_INTERVAL_MS);
  void scanLanHosts();
}

export function stopLanAutoDiscovery() {
  if (_lanScanTimer) {
    clearInterval(_lanScanTimer);
    _lanScanTimer = null;
  }
}

async function scanLanHosts() {
  if (!isLanElectronDesktop()) return;
  if (!isClinicalRankConfiguredForLan()) return;

  var teamCode = getLanTeamCodeFromConfig();
  if (!teamCode) return;

  if (getPinnedHostUrl()) {
    if (await applyPinnedHostOverride(teamCode, { quiet: true })) {
      await refreshLanPanelChromeInPlace();
      return;
    }
  }

  if (isLanRemoteJoinMode()) return;

  try {
    var clientId = typeof getLanClientId === 'function' ? getLanClientId() : '';
    var wsPeers =
      typeof listLivePeerHostUrls === 'function' ? listLivePeerHostUrls(clientId) : [];
    var seen = new Set();
    var peers = [];
    var peerMetasForEscalation = [];

    function addPeer(url) {
      var u = String(url || '')
        .trim()
        .replace(/\/+$/, '');
      if (!u || seen.has(u)) return;
      seen.add(u);
      peers.push(u);
    }

    for (var wi = 0; wi < wsPeers.length; wi += 1) {
      var wsUrl = wsPeers[wi];
      if (!wsUrl) continue;
      var alive = await pingLanHostUrl(wsUrl, teamCode);
      if (!alive) continue;
      var wsMeta = await fetchLanHostRank(wsUrl, teamCode);
      if (wsMeta) peerMetasForEscalation.push(wsMeta);
      addPeer(wsUrl);
      if (typeof reactToDiscoveredLanHost === 'function') {
        if (await reactToDiscoveredLanHost(wsUrl, teamCode)) {
          requestRenderLanPanelAfterScan();
          return;
        }
      }
    }

    var now = Date.now();
    if (now - _lastSubnetLanScanAt >= SUBNET_LAN_SCAN_MIN_MS) {
      _lastSubnetLanScanAt = now;
      var ownUrl = lanHostUrl() || (await resolveLanShareBaseUrl());
      var scanned = await discoverLanHostsOnSubnet(teamCode, ownUrl);
      var wardHosts = [];
      for (var hi = 0; hi < scanned.length; hi += 1) {
        var peerMeta = await fetchLanHostRank(scanned[hi], teamCode);
        if (peerMeta) {
          peerMetasForEscalation.push(peerMeta);
          if (prefersLanHosting(peerMeta)) wardHosts.push(scanned[hi]);
        }
      }
      if (wardHosts.length && !wsPeers.length && !sessionStorage.getItem(LAN_SPLIT_BRAIN_HINT_KEY)) {
        try {
          sessionStorage.setItem(LAN_SPLIT_BRAIN_HINT_KEY, '1');
        } catch (_ss) {}
        runtime().showToast(
          'Otra R+ en la red (' +
            wardHosts[0] +
            '). Para ver el directorio juntos, una Mac debe ser anfitri\u00f3n.',
          'warning'
        );
      }
      for (var si = 0; si < scanned.length; si += 1) {
        addPeer(scanned[si]);
        if (typeof reactToDiscoveredLanHost === 'function') {
          if (await reactToDiscoveredLanHost(scanned[si], teamCode)) {
            requestRenderLanPanelAfterScan();
            return;
          }
        }
      }
    }

    updateLanHostEscalationFromPeerMetas(peerMetasForEscalation);

    if (peers.length && typeof tryAutoJoinPreferredLanHost === 'function') {
      var joined = await tryAutoJoinPreferredLanHost();
      if (joined) {
        requestRenderLanPanelAfterScan();
        return;
      }
    }

    if (canLocalMacBeLanHost() && !isLanRemoteJoinMode()) {
      void initLanHostPlugAndPlay();
    }
    void refreshLanPanelChromeInPlace();
  } catch (_scanErr) {
    // scan errors are non-fatal
  }
}

export async function saveLanHostTeamCodeFromUi() {
  if (!window.electronAPI || typeof window.electronAPI.writeLanHostTeamCode !== 'function') {
    runtime().showToast('Solo disponible en la app Electron', 'error');
    return;
  }
  var input = document.getElementById('settings-lan-host-team-code-input');
  var plain = input && input.value;
  var res;
  try {
    res = await window.electronAPI.writeLanHostTeamCode(plain);
  } catch (e) {
    runtime().showToast(e && e.message ? e.message : 'Error al guardar', 'error');
    return;
  }
  if (res && res.ok) {
    var plainTrim = String(plain || '').trim();
    if (!plainTrim) {
      runtime().showToast('Escribe un token de al menos 32 caracteres.', 'error');
      return;
    }
    var cfg = typeof storage.getLanConfig === 'function' ? (storage.getLanConfig() || {}) : {};
    var hostUrl = String(cfg.hostUrl || '').trim().replace(/\/+$/, '');
    if (hostUrl && plainTrim) {
      storage.saveLanConfig({ hostUrl: hostUrl, teamCode: plainTrim });
      lanClient.configure({ hostUrl: hostUrl, teamCode: plainTrim });
      try {
        lanClient.disconnect();
        lanClient.connectSyncChannel();
      } catch (_e) {}
    }
    runtime().showToast('Guardado. Reinicia R+ para que el proceso del servidor relea el archivo.', 'success');
  } else {
    runtime().showToast(res && res.error ? res.error : 'Error al guardar', 'error');
  }
}

export async function resetLanSquadHostStateFromUi() {
  if (!window.electronAPI || typeof window.electronAPI.resetLanSquadHostState !== 'function') {
    runtime().showToast('Solo disponible en la app de escritorio.', 'error');
    return;
  }
  if (
    !confirm(
      'Se borrará el archivo lan-squad-host-state.json en esta computadora (salas, pacientes del host LAN y la caché clinicalOps del bundle). Los equipos, directorio y guardias en la base clínica SQLCipher no se borran. ¿Seguir?'
    )
  ) {
    return;
  }
  var res;
  try {
    res = await window.electronAPI.resetLanSquadHostState();
  } catch (e) {
    runtime().showToast(e && e.message ? e.message : 'Error al restablecer', 'error');
    return;
  }
  if (res && res.ok) {
    var synced = await syncLanSavedTeamCodeWithEffectiveHostCode();
    runtime().showToast(
      synced
        ? 'Estado LAN del host borrado. El «Código del equipo» guardado en esta R+ quedó alineado con archivo / variable de entorno / valor por defecto del servidor.'
        : 'Estado LAN del host borrado. Si sigues con error 401, escribe en «Código del equipo» el mismo texto que el servidor (o reinicia R+ tras cambiar el archivo).',
      'success'
    );
    renderLanPanel({ force: true });
  } else {
    runtime().showToast(res && res.error ? res.error : 'No se pudo borrar el archivo.', 'error');
  }
}

export async function copyMobileLanLinkFromUi(opts) {
  opts = opts || {};
  var silent = !!opts.silent;
  var link = await resolvePermanentMobileShareUrl();
  if (!link) {
    if (!silent) {
      runtime().showToast(
        'Falta la dirección del anfitrión o el código del equipo. Revisa ⇄ y que esta Mac sea anfitriona.',
        'error'
      );
    }
    return false;
  }
  var copied = await copyToClipboardSafe(link);
  if (copied) {
    if (!silent) {
      var roomHint = resolveMobilePairingRoomId(activeLiveSyncRoomId);
      var roomMsg = roomHint
        ? ''
        : ' Primero únete tú a una sala en ⇄ (Unirse) para que el iPad reciba pacientes.';
      runtime().showToast(
        'Enlace móvil copiado. Abre /mobile/?token=… en Safari y luego Añadir a pantalla de inicio (así no se pierde el token).' +
          roomMsg,
        roomHint ? 'success' : 'warn'
      );
    }
    return true;
  }
  if (!silent) runtime().showToast('No se pudo copiar al portapapeles.', 'error');
  return false;
}

export async function copyLanInviteLinkFromUi(opts) {
  opts = opts || {};
  var silent = !!opts.silent;
  var share;
  try {
    share = await ensureLanPairingForShare({ forceNew: true });
  } catch (e) {
    if (!silent) {
      if (e && e.code === 'no_host_url') {
        runtime().showToast(
          'Falta la dirección del servidor (o no pudimos detectar la IP en esta computadora).',
          'error'
        );
      } else {
        runtime().showToast('Genera primero un enlace / PIN o revisa el token del anfitrión.', 'error');
      }
    }
    return false;
  }
  var link = buildShareJoinUrl(share.hostUrl, share.pairing.ticketId);
  var copied = await copyToClipboardSafe(link);
  if (copied) {
    if (!silent) {
      var pinHint = share.pairing.pin ? ' PIN: ' + share.pairing.pin + '.' : '';
      var inviteExpiry = formatLanTicketExpiryLabel(share.pairing.expiresAt);
      runtime().showToast(
        'Enlace de sala copiado (sin tu identidad).' +
          pinHint +
          (inviteExpiry ? ' Válido hasta ' + inviteExpiry + '.' : ''),
        'success'
      );
    }
    return true;
  }
  if (!silent) runtime().showToast('No se pudo copiar al portapapeles.', 'error');
  return false;
}

export function joinLanFromInviteUi() {
  var input = document.getElementById('lan-input-invite-link');
  var raw = String(input && input.value ? input.value : '').trim();
  if (!raw) {
    runtime().showToast('Pega el enlace de invitación que te envió el anfitrión.', 'error');
    return;
  }
  var parsed = parseLanInviteInput(raw);
  if (parsed.legacyInvite) {
    runtime().showToast(
      'Este enlace ya no es válido. Pide al anfitrión un nuevo enlace o PIN.',
      'error'
    );
    return;
  }
  var teamCode = String(parsed.teamCode || '').trim();
  if (teamCode && parsed.hostUrl) {
    var mobileJoin = parseLanJoinQuery(raw.includes('?') ? raw.slice(raw.indexOf('?')) : '', parsed.hostUrl);
    configureLanFromMobileJoin(
      parsed.hostUrl,
      teamCode,
      mobileJoin.roomId || parsed.roomId
    );
    return;
  }
  var ticketId = String(parsed.ticketId || '').trim();
  if (ticketId) {
    var hostUrl = String(parsed.hostUrl || '')
      .trim()
      .replace(/\/+$/, '');
    if (!hostUrl) {
      var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
      hostUrl = String(cfg.hostUrl || '')
        .trim()
        .replace(/\/+$/, '');
    }
    if (!hostUrl) {
      runtime().showToast(
        'Pega el enlace completo (http://…/join/req_…) con la dirección del anfitrión.',
        'error'
      );
      return;
    }
    void exchangeLanJoinFromInvite(hostUrl, ticketId, parsed.roomId);
    return;
  }
  runtime().showToast(
    'No reconocimos un enlace válido. Pide al anfitrión un enlace /join/req_… o el PIN actual.',
    'error'
  );
}

export async function saveLanSettingsFromUi(opts) {
  opts = opts || {};
  var copyInviteAfter = !!opts.copyInviteAfter;
  var uiRole = typeof storage.getLanUiRole === 'function' ? storage.getLanUiRole() : 'client';
  var hostInput = document.getElementById('lan-input-host-url');
  if (hostInput && !String(hostInput.value || '').trim()) {
    var autoHost = await resolveLanHostUrlForShare();
    if (autoHost) hostInput.value = autoHost;
  }
  var hostUrl = String(hostInput && hostInput.value ? hostInput.value : '')
    .trim()
    .replace(/\/+$/, '');
  var teamCode = '';
  if (uiRole === 'host') {
    teamCode = String(await resolveHostBearerToken()).trim();
  } else {
    teamCode = String(await resolveLanTeamCodeForShare()).trim();
  }
  if (!hostUrl || !teamCode) {
    runtime().showToast(
      !hostUrl
        ? uiRole === 'host'
          ? 'No pudimos detectar la IP. Escribe la dirección http://… que verán las otras R+.'
          : 'Escribe la dirección del servidor que te dio el anfitrión.'
        : uiRole === 'host'
          ? 'No hay token seguro del servidor en esta Mac. Reinicia R+ como anfitrión.'
          : 'Únete con el enlace o PIN que te dio quien abrió la sala.',
      'error'
    );
    return;
  }
  var cfg = { hostUrl: hostUrl.replace(/\/+$/, ''), teamCode: teamCode };
  storage.saveLanConfig(cfg);
  lanClient.configure(cfg);
  lanClient.disconnect();
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {}
  var pingOk = false;
  var pingStatus = 0;
  try {
    var r = await lanClient.fetch('/api/lan/v1/ping');
    pingStatus = r && r.status ? r.status : 0;
    pingOk = !!(r && r.ok);
    _lanLastPingAt = new Date().toISOString();
    _lanLastPingStatus = pingStatus;
  } catch (pingErr) {
    _lanLastPingAt = new Date().toISOString();
    _lanLastPingStatus = 0;
    recordLanSyncError({
      op: 'ping',
      code: 'NETWORK',
      message: pingErr && pingErr.message ? pingErr.message : 'ping failed',
    });
  }
  var copiedOk = false;
  if (copyInviteAfter && pingStatus !== 401) {
    copiedOk = await copyLanInviteLinkFromUi({ silent: true });
  }
  if (pingStatus === 401) {
    recordLanSyncError({ op: 'ping', code: '401', message: 'team code rejected' });
  }
  if (pingOk) {
    var autoRoomId = resolveAutoJoinRoomId('');
    if (autoRoomId) {
      var joinSource = classifyAutoJoinSource();
      var needsConfirm =
        joinSource === 'settings_sala' && !hasLanAutoJoinConfirmed(autoRoomId);
      if (needsConfirm) {
        var salaLabel = liveSyncRoomLabel(autoRoomId);
        if (
          typeof confirm !== 'function' ||
          !confirm('¿Unirte a ' + salaLabel + '?')
        ) {
          renderLanPanel({ force: true });
          return;
        }
        setLanAutoJoinConfirmed(autoRoomId);
      }
      joinLanRoom(autoRoomId, liveSyncRoomLabel(autoRoomId));
    }
    void import('../../historia-clinica-lan-sync.mjs').then(function (m) {
      return m.scheduleFlushAllPendingHistoriaClinicaLanSync();
    });
    void maybeShowLanMigrationNotice();
    if (copyInviteAfter) {
      runtime().showToast(
        copiedOk
          ? 'Anfitrión listo. La invitación ya está en el portapapeles; compártela por WhatsApp o correo.'
          : 'Anfitrión listo, pero no se pudo copiar solo. Pulsa «Copiar enlace de sala» o «Generar y mostrar» en ⇄.',
        copiedOk ? 'success' : 'error'
      );
    } else {
      runtime().showToast('Listo: ya iniciaste sesión en la sala del equipo.', 'success');
    }
  } else if (pingStatus === 401) {
    runtime().showToast('El código no coincide con el del servidor. Pide el código correcto a quien tiene la computadora anfitriona.', 'error');
  } else {
    if (copyInviteAfter && copiedOk) {
      runtime().showToast(
        'Invitación copiada al portapapeles. Aun así no hubo respuesta del servidor: revisa el Wi‑Fi o que R+ siga abierto en el anfitrión.',
        'error'
      );
    } else {
      runtime().showToast(
        'Guardamos los datos, pero no hubo respuesta del servidor. Revisa la dirección y que ambas computadoras estén en el mismo Wi‑Fi.',
        'error'
      );
    }
  }
  renderLanPanel({ force: true });
}

export async function createLanRoomFromUi() {
  if (!isLanSessionConfiguredForRest()) {
    runtime().showToast('Falta la dirección LAN. Configura la conexión en ⇄ y vuelve a intentar.', 'error');
    return;
  }
  await ensureLanClientTeamCodeAligned();
  var input = document.getElementById('lan-input-room-name');
  var displayName = String(input && input.value ? input.value : '').trim();
  if (!displayName) {
    runtime().showToast('Escribe un nombre de sala', 'error');
    return;
  }
  var resp;
  try {
    resp = await lanFetchAuthed('/api/lan/v1/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName })
    });
  } catch (_e) {
    runtime().showToast('No se pudo crear la sala', 'error');
    return;
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      runtime().showToast(
        'El código del equipo no coincide con el servidor. Igualálo al conectar y en lan-team-code.txt; reinicia R+ en el anfitrión si cambiaste el archivo.',
        'error'
      );
    } else {
      runtime().showToast('No se pudo crear la sala', 'error');
    }
    return;
  }
  var created;
  try {
    created = await resp.json();
  } catch (_eJson) {
    created = null;
  }
  var newRoom = created && created.room;
  if (newRoom && newRoom.id) {
    joinLanRoom(newRoom.id, newRoom.displayName || displayName);
  }
  if (input) input.value = '';
  runtime().showToast(
    newRoom && newRoom.id ? 'Sala creada y conectada' : 'Sala creada — pulsa Unirse',
    'success'
  );
  renderLanPanel({ force: true });
}

export async function deleteLanRoom(roomId) {
  if (!isLanSessionConfiguredForRest()) {
    runtime().showToast('Falta configuración LAN para eliminar salas.', 'error');
    return;
  }
  await ensureLanClientTeamCodeAligned();
  var id = String(roomId || '').trim();
  if (!id) return;
  if (activeLiveSyncRoomId === id) {
    leaveLiveSyncRoom({ silentLeave: true });
  }
  var resp;
  try {
    resp = await lanFetchAuthed('/api/lan/v1/rooms/' + encodeURIComponent(id), { method: 'DELETE' });
  } catch (_e) {
    runtime().showToast('No se pudo eliminar la sala', 'error');
    return;
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      runtime().showToast('El código del equipo no coincide con el servidor; no se pudo eliminar la sala.', 'error');
    } else {
      runtime().showToast('No se pudo eliminar la sala', 'error');
    }
    return;
  }
  runtime().showToast('Sala eliminada', 'success');
  renderLanPanel({ force: true });
}
function syncLanHostFirstTimeHintUi() {
  var hint = document.getElementById('lan-host-first-time-hint');
  if (hint) hint.style.display = 'none';
}

export function dismissLanHostFirstTimeHint() {
  try {
    localStorage.setItem(LAN_HOST_CODE_HINT_SEEN_KEY, '1');
  } catch (_e) {}
  syncLanHostFirstTimeHintUi();
}

export function syncSettingsLanHostDiskSection() {
  var acc = document.getElementById('settings-accordion-lan-host-disk');
  if (!acc) return;
  var desktop = isLanElectronDesktop();
  acc.style.display = desktop && !isLanRemoteJoinMode() ? '' : 'none';
  if (desktop && !isLanRemoteJoinMode()) {
    syncLanHostTeamCodeSettingsInput();
    syncLanHostFirstTimeHintUi();
    if (!acc.dataset.lanHostToggleBound) {
      acc.dataset.lanHostToggleBound = '1';
      acc.addEventListener('toggle', function () {
        if (acc.open) {
          syncLanHostTeamCodeSettingsInput();
          syncLanHostFirstTimeHintUi();
        }
      });
    }
  }
}

export async function syncLanHostTeamCodeSettingsInput() {
  var input = document.getElementById('settings-lan-host-team-code-input');
  if (!input) return;
  var code = await resolveHostBearerToken();
  if (!String(input.value || '').trim() && code) input.value = code;
}
export function closeConnectionDropdown() {
  var dd = document.getElementById('connection-dropdown');
  var bg = document.getElementById('connection-dropdown-backdrop');
  if (dd) dd.classList.remove('open');
  if (bg) bg.classList.remove('open');
  var syncBtn = document.getElementById('btn-header-team-sync');
  if (syncBtn) syncBtn.setAttribute('aria-expanded', 'false');
}

export function openConnectionDropdown() {
  runtime().closeSettingsDropdown();
  var dd = document.getElementById('connection-dropdown');
  var bg = document.getElementById('connection-dropdown-backdrop');
  if (!dd) return;
  dd.classList.add('open');
  if (bg) bg.classList.add('open');
  var syncBtn = document.getElementById('btn-header-team-sync');
  if (syncBtn) syncBtn.setAttribute('aria-expanded', 'true');
  wireLanPanelDelegation();
  wireLanLwwToastPref();
  syncLanLwwOverwriteToastPrefUi();
  renderLanPanel({ force: true });
}

export function toggleConnectionDropdown(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var dd = document.getElementById('connection-dropdown');
  if (!dd) return;
  if (dd.classList.contains('open')) closeConnectionDropdown();
  else openConnectionDropdown();
}

/** Compat: tours / ayuda que aún llamen al atajo ⇄ — abre el panel LAN (no Ajustes). */
export function openTeamSyncFromHeader() {
  openConnectionDropdown();
}