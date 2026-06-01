// Built from app.js refactor — LAN / LiveSync
import { storage } from "../storage.js";
import { isPitchPatientIsolationActive } from "../tour-pitch-demo-seed.mjs";
import { LanClient } from "../lan-client.mjs";
import {
  mergeLiveSyncBundles,
  buildRoomSnapshotFromStorage,
  nextRoomSnapshotGeneration,
  isLiveSyncEnvelope,
  todoEntityKey,
} from "../live-sync-room.mjs";
import {
  mergeLanPatientEntrySources,
  filterEntriesByPatientDeletes,
} from "../lan-patient-merge.mjs";
import {
  buildLiveSyncPatientIdMap,
  remapTodosPatientIds,
  remapAgendaPatientIds,
  mergeTodoListsById,
  attachTodosMapToPatientEntries,
} from "../livesync-patient-ids.mjs";
import {
  getRoomMembership,
  setRoomMembership,
  clearRoomMembership,
  migrateLastRoomToMembership,
} from "../live-sync-membership.mjs";
import { enqueueOutbox, drainOutbox } from "../live-sync-outbox.mjs";
import {
  collectManejoRoomPayload,
  mergeManejoFromSources,
  applyManejoRoomDataToLocal,
} from "../manejo-room-data.mjs";
import { mergePatientMonitoreoFromImported } from "./estado-actual-data.mjs";
import { mergeCensoPatientFields } from "../patient-diagnosticos.mjs";
import { filterTodosRespectingDismissals } from "../manejo-todo-dismiss.mjs";
import { copyToClipboardSafe } from "./soap-estado.mjs";
import { buildLanJoinUrls, parseLanInviteInput } from "../lan-join-link.mjs";
import { createMutationBuilder, wrapLiveSyncPatch } from "../versioned-mutation.mjs";
import { guardAndSignLiveSyncMutation } from "../clinical-access-runtime.mjs";
import {
  saveDraftConflict,
  deleteDraftConflict,
  listDraftConflicts,
  getDraftConflict,
} from "../draft-conflict-store.mjs";
import { openClinicalConflictViewer } from "./clinical-conflict-viewer.mjs";
import {
  hostBundlePutBodyFromEnvelope,
  getHostBundleBases,
  setHostBundleBases,
} from "../host-bundle-bases.mjs";
import {
  applyClinicalOpsLanSnapshot,
  getCachedClinicalOpsSnapshot,
  isClinicalOpsLanAvailable,
  mergeClinicalOpsFromSources,
  refreshClinicalOpsSnapshotCache,
} from "../clinical-ops-lan.mjs";
import {
  rememberPrimaryHostUrl,
  getPrimaryHostUrl,
  recordLivePeer,
  listLivePeerHostUrls,
  surrogateElectionDelayMs,
  pingLanHostUrl,
  getSurrogateHostState,
  setSurrogateHostState,
  clearSurrogateHostState,
  isSurrogateHostActive,
} from "../lan-surrogate-host.mjs";
import {
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  medPharmProfileByPatient,
  vpoByPatient,
  recetaHuByPatient,
  listadoProblemas,
  medNotaSelectionByPatient,
  setPatients,
  setSaveStateHooks,
  saveState,
} from "../app-state.mjs";

let runtime = {
  showToast() {},
  renderPatientList() {},
  renderNoteForm() {},
  renderLabHistoryPanel() {},
  getActiveId() {
    return null;
  },
  setActiveId() {},
  getActiveAppTab() {
    return "lab";
  },
  selectPatient() {},
  isMobileWeb() {
    return false;
  },
  renderProcedureAgendaPanel() {},
  refreshAllTodoUIs() {},
  syncWorkContextChrome() {},
  findPatientByRegistro() {
    return null;
  },
  ensureUniquePatientName(x) {
    return x;
  },
  applyImportEntry() {
    return "";
  },
  syncSettingsLanHostDiskSection() {},
  buildPatientEntry() {
    return null;
  },
  closeSettingsDropdown() {},
};

export function registerLanRuntime(partial) {
  if (!partial || typeof partial !== "object") return;
  Object.assign(runtime, partial);
  void initLanHostPlugAndPlay();
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

var lanClient = new LanClient();
var activeLiveSyncRoomId = '';
var activeLiveSyncRoomLabel = '';
var _liveSyncPushTimer = null;
var LIVE_SYNC_PUSH_DEBOUNCE_MS = 900;
var LIVE_SYNC_OUTBOX_FLUSH_MS = 60000;
var _liveSyncReconnectTimer = null;
var _liveSyncReconnectAttempt = 0;
var _liveSyncOutboxFlushTimer = null;
var _surrogateFailoverTimer = null;
var _lanPanelRenderGen = 0;
var _lanPanelRenderChain = Promise.resolve();
var LIVE_SYNC_ENTITIES_LS = 'rpc-lan-live-entities';
var LAN_HOST_CODE_HINT_SEEN_KEY = 'rpc-lan-host-code-hint-seen';
var LAN_MIGRATION_NOTICE_KEY = 'rplus.lan.migrationNoticeShown';
var LAN_KNOWN_ROOMS_LS = 'rpc-lan-known-rooms';
var _lastLanPairing = null;
function readLanKnownRooms() {
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
function forgetLanRoomSession(roomId) {
  var id = String(roomId || '').trim();
  if (!id) return;
  writeLanKnownRooms(readLanKnownRooms().filter(function (r) { return r.id !== id; }));
  try {
    if (String(localStorage.getItem('rpc-lan-last-room') || '').trim() === id) {
      localStorage.removeItem('rpc-lan-last-room');
    }
  } catch (_e) {}
}
function rememberLanRoomJoined(roomId, displayName) {
  var id = String(roomId || '').trim();
  if (!id) return;
  var label = String(displayName || '').trim() || id.slice(0, 14);
  var next = [{ id: id, label: label, joinedAt: Date.now() }];
  readLanKnownRooms().forEach(function (r) {
    if (r.id !== id) next.push(r);
  });
  writeLanKnownRooms(next);
}
/** Salas REST no requieren WebSocket; el botón no debe depender solo de `lanClient.connected`. */
function isLanSessionConfiguredForRest() {
  try {
    var c = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() : null;
    return !!(c && String(c.hostUrl || '').trim());
  } catch (_e) {
    return false;
  }
}

function trimStoredLanBearer(code) {
  return String(code || '').trim();
}

function persistLanClientConfig(hostUrl, teamCode) {
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
async function ensureLanClientTeamCodeAligned() {
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

async function lanFetchAuthed(path, opts) {
  await ensureLanClientTeamCodeAligned();
  var resp = await lanClient.fetch(path, opts);
  if (resp.status !== 401) return resp;
  if (window.electronAPI && typeof window.electronAPI.getLanEffectiveTeamCode === 'function') {
    await syncLanSavedTeamCodeWithEffectiveHostCode();
  }
  return lanClient.fetch(path, opts);
}

/** Bearer del anfitrión: config guardada o lan-team-code.txt vía IPC. */
async function resolveHostBearerToken() {
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

async function mintLanPairingTicket() {
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
  _lastLanPairing = {
    ticketId: String(body.ticketId || ''),
    pin: String(body.pin || ''),
    joinUrl: String(body.joinUrl || ''),
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

async function maybeShowLanMigrationNotice() {
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

function updateLanPairingDisplay(root) {
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
  box.innerHTML =
    '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);">Comparte el PIN o el enlace (válido unos minutos, un solo uso):</p>' +
    '<div><strong>PIN:</strong> <code>' +
    esc(p.pin) +
    '</code></div>' +
    '<div><strong>Ticket:</strong> <code>' +
    esc(p.ticketId) +
    '</code></div>' +
    joinLine;
}

async function mintLanPairingFromUi() {
  try {
    await mintLanPairingTicket();
    var root = document.getElementById('lan-connection-panel-root');
    updateLanPairingDisplay(root);
    runtime.showToast('Enlace y PIN generados. Compártelos con el equipo.', 'success');
  } catch (e) {
    if (e && e.code === 'no_host_bearer') {
      runtime.showToast(
        'No hay token seguro del servidor en esta Mac. Reinicia R+ como anfitrión o revisa lan-team-code.txt.',
        'error'
      );
      return;
    }
    if (e && e.status === 401) {
      runtime.showToast('No autorizado para generar invitación. Revisa el token del anfitrión.', 'error');
      return;
    }
    runtime.showToast('No se pudo generar enlace / PIN. Intenta de nuevo.', 'error');
  }
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

async function exchangeLanJoinFromInvite(hostUrl, ticketId, roomId) {
  var base = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  var tid = String(ticketId || '').trim();
  if (!base || !tid) {
    runtime.showToast('Falta la dirección del servidor o el ticket de invitación.', 'error');
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
    runtime.showToast('Error de red al unirse. Revisa Wi‑Fi y que R+ siga abierto en el anfitrión.', 'error');
    return;
  }
  if (!res.ok) {
    runtime.showToast(
      'Este enlace o PIN ya no es válido. Pide al anfitrión un nuevo enlace o PIN.',
      'error'
    );
    return;
  }
  var data;
  try {
    data = await res.json();
  } catch (_eJson) {
    runtime.showToast('Respuesta inválida del servidor.', 'error');
    return;
  }
  await persistGuestBearerFromExchange(data);
  configureLanFromMobileJoin(String(data.hostUrl || base), data.token, roomId);
}

/** En anfitrión Electron: alinea rpc-lan-config con el código efectivo del servidor. */
async function syncLanSavedTeamCodeWithEffectiveHostCode() {
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

function isLanElectronDesktop() {
  return !!(
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.getLanCandidateBaseUrl === 'function'
  );
}

function isLanRemoteJoinMode() {
  return typeof storage.getLanUiRole === 'function' && storage.getLanUiRole() === 'client';
}

async function resolveLanHostUrlAuto() {
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var fromCfg = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (fromCfg) return fromCfg;
  if (!isLanElectronDesktop()) return '';
  try {
    return String((await window.electronAPI.getLanCandidateBaseUrl()) || '')
      .trim()
      .replace(/\/+$/, '');
  } catch (_e) {
    return '';
  }
}

/** Corrige rol «cliente» en escritorio sin URL guardada (UI antigua con pestañas). */
function migrateLanElectronStaleClientRole() {
  if (!isLanElectronDesktop() || !isLanRemoteJoinMode()) return;
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() : null;
  if (cfg && String(cfg.hostUrl || '').trim()) return;
  if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('host');
}

/** Escritorio: detecta IP, alinea código y deja lista la URL del servidor embebido. */
async function ensureLanElectronHostReady() {
  migrateLanElectronStaleClientRole();
  if (!isLanElectronDesktop() || isLanRemoteJoinMode()) return false;
  await syncLanSavedTeamCodeWithEffectiveHostCode();
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var url = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (url) {
    persistLanClientConfig(url, cfg.teamCode);
    return false;
  }
  var autoUrl = await resolveLanHostUrlAuto();
  if (!autoUrl) return false;
  var bearer = await resolveHostBearerToken();
  if (!bearer) return false;
  persistLanClientConfig(autoUrl, bearer);
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {}
  return true;
}

async function initLanHostPlugAndPlay() {
  if (!isLanElectronDesktop() || isLanRemoteJoinMode()) return;
  await ensureLanElectronHostReady();
}

async function resolveLanTeamCodeForShare() {
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
function appendLanKnownSessionsSection(root) {
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
function initLanClientFromStorage() {
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() : null;
  if (!cfg || !String(cfg.hostUrl || '').trim()) return;
  persistLanClientConfig(cfg.hostUrl, cfg.teamCode);
  try {
    lanClient.connectSyncChannel();
  } catch (_e) {}
  setTimeout(function () {
    bootLanRoomMembership();
  }, 0);
}
if (typeof document !== 'undefined') {
  initLanClientFromStorage();
  wireLanPanelDelegation();
}

var LAN_DISCONNECT_BANNER_MSG =
  'Sin conexión al host LAN. LiveSync (salas y relay) puede estar limitado hasta reconectar.';
var _lanLastConnected = true;

function readLanHideDisconnectBanner() {
  return typeof storage.getLanHideDisconnectBanner === 'function' && storage.getLanHideDisconnectBanner();
}

function updateLanConnectionBanner(connected) {
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

function syncLanDisconnectBannerPrefUi() {
  var cb = document.getElementById('lan-hide-disconnect-banner');
  if (cb) cb.checked = readLanHideDisconnectBanner();
}

function dismissLanDisconnectBanner() {
  if (typeof storage.saveLanHideDisconnectBanner === 'function') {
    storage.saveLanHideDisconnectBanner(true);
  }
  updateLanConnectionBanner(_lanLastConnected);
  syncLanDisconnectBannerPrefUi();
}

function setLanHideDisconnectBannerFromUi(hide) {
  if (typeof storage.saveLanHideDisconnectBanner === 'function') {
    storage.saveLanHideDisconnectBanner(!!hide);
  }
  updateLanConnectionBanner(_lanLastConnected);
}

function appendLanDisconnectBannerPref(root) {
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

function patchLanPanelJoinButtons() {
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

var _lanPanelDelegationWired = false;
function wireLanPanelDelegation() {
  if (_lanPanelDelegationWired) return;
  if (typeof document === 'undefined') return;
  var root = document.getElementById('lan-connection-panel-root');
  if (!root) return;
  _lanPanelDelegationWired = true;
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
      renderLanPanel();
    } else if (action === 'delete-room') {
      deleteLanRoom(btn.getAttribute('data-room-id'));
    } else if (action === 'join-invite') {
      if (isLanElectronDesktop() && typeof storage.saveLanUiRole === 'function') {
        storage.saveLanUiRole('client');
      }
      joinLanFromInviteUi();
    } else if (action === 'host-activate') {
      saveLanSettingsFromUi({ copyInviteAfter: true });
    } else if (action === 'mint-pairing') {
      void mintLanPairingFromUi();
    }
  });
}
function readLiveSyncEntityMap() {
  try {
    var raw = localStorage.getItem(LIVE_SYNC_ENTITIES_LS);
    var parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_e) {
    return {};
  }
}

function liveSyncEntityStoreKey(entityType, entityId, patientId) {
  if (entityType === 'todo') return 'todo:' + String(patientId || '') + ':' + String(entityId || '');
  if (entityType === 'agenda') return 'agenda:' + String(entityId || '');
  if (entityType === 'patient') return 'patient:' + String(entityId || '');
  return String(entityType || '') + ':' + String(entityId || '');
}

function getLiveSyncEntityBase(entityType, entityId, patientId) {
  var map = readLiveSyncEntityMap();
  return map[liveSyncEntityStoreKey(entityType, entityId, patientId)] || null;
}

function rememberLiveSyncEntity(entityType, entityId, patientId, version, data) {
  var map = readLiveSyncEntityMap();
  var row = Object.assign({}, data || {}, { version: Number(version || 1) });
  map[liveSyncEntityStoreKey(entityType, entityId, patientId)] = row;
  try {
    localStorage.setItem(LIVE_SYNC_ENTITIES_LS, JSON.stringify(map));
  } catch (_e) {}
}

function stampTodosWithEntityVersions(todosMap, entityVersions) {
  var versions = entityVersions && typeof entityVersions === 'object' ? entityVersions : {};
  var out = {};
  Object.keys(todosMap || {}).forEach(function (pid) {
    out[pid] = (todosMap[pid] || []).map(function (t) {
      if (!t || !t.id) return t;
      var key = todoEntityKey(pid, t.id);
      if (versions[key] == null) return t;
      return Object.assign({}, t, { version: Number(versions[key]) });
    });
  });
  return out;
}

function rememberTodosFromMap(todosMap) {
  Object.keys(todosMap || {}).forEach(function (pid) {
    (todosMap[pid] || []).forEach(function (t) {
      if (!t || !t.id) return;
      var ver = Number(t.version || 0);
      if (!ver) return;
      rememberLiveSyncEntity('todo', t.id, pid, ver, t);
    });
  });
}

function buildLiveSyncMutationFromDesired(entityType, entityId, desired, extra) {
  extra = extra || {};
  var patientId = extra.patientId;
  var cached = getLiveSyncEntityBase(entityType, entityId, patientId);
  var base = cached
    ? Object.assign({}, cached)
    : { id: entityId, version: Number(desired && desired.version != null ? desired.version : 0) };
  if (entityType === 'todo' && patientId && !base.patientId) base.patientId = patientId;
  var builder = createMutationBuilder(entityType, entityId).captureBase(base);
  var hasChange = false;
  Object.keys(desired || {}).forEach(function (key) {
    if (key === 'version') return;
    if (desired[key] !== base[key]) {
      builder.set(key, desired[key]);
      hasChange = true;
    }
  });
  if (!hasChange && desired) {
    Object.keys(desired).forEach(function (key) {
      if (key === 'version') return;
      builder.set(key, desired[key]);
    });
  }
  return builder.build(extra);
}

function sendLiveSyncMutation(mutation) {
  if (!activeLiveSyncRoomId || !lanClient.liveConnected || !mutation) return;
  var envelope = wrapLiveSyncPatch(activeLiveSyncRoomId, getLanClientId(), mutation);
  void guardAndSignLiveSyncMutation(mutation, envelope)
    .then(function () {
      lanClient.sendLive(envelope);
    })
    .catch(function (err) {
      if (err && err.code === 'CLINICAL_ACCESS_DENIED') {
        runtime.showToast(String(err.message || 'Acceso clínico denegado'), 'error');
      }
    });
}

function isRoomBundleConflictDraft(draft) {
  return !!(draft && (draft.scope || draft.localBundle || draft.entityType === 'roomBundle'));
}

async function clearConflictDraft(draftId) {
  if (!draftId) return;
  try {
    await deleteDraftConflict(draftId);
  } catch (_e) {}
  void renderLanPanel();
}

async function discardDraftsForConflictEntity(payload) {
  if (!payload || !payload.entityType || !payload.entityId) return;
  var drafts = [];
  try {
    drafts = await listDraftConflicts();
  } catch (_eList) {
    return;
  }
  var roomId = payload.roomId || null;
  for (var i = 0; i < drafts.length; i += 1) {
    var d = drafts[i];
    if (!d || !d.id || isRoomBundleConflictDraft(d)) continue;
    if (d.entityType !== payload.entityType || String(d.entityId) !== String(payload.entityId)) continue;
    if (roomId != null && d.roomId != null && String(d.roomId) !== String(roomId)) continue;
    try {
      await deleteDraftConflict(d.id);
    } catch (_eDel) {}
  }
}

async function applyRoomBundleServerChoice(draft) {
  var bundle = draft && draft.serverBundle;
  var rid = draft && draft.roomId;
  if (rid && bundle) {
    setHostBundleBases(rid, bundle);
    applyLiveSyncMerged(
      mergeLiveSyncFullBundles([
        {
          agenda: bundle.agenda || [],
          todos: bundle.todos || {},
          entries: bundle.entries || [],
          manejo: bundle.manejo,
          clinicalOps: bundle.clinicalOps,
        },
      ])
    );
  }
  await clearConflictDraft(draft && draft.id);
}

async function applyConflictUseServer(payload) {
  var server = payload && payload.serverSnapshot;
  if (server && server.data) {
    applyLiveSyncApplied({
      roomId: payload.roomId || activeLiveSyncRoomId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      patientId: payload.patientId,
      version: server.version,
      data: server.data,
    });
  }
  if (payload.draftId) {
    await clearConflictDraft(payload.draftId);
  }
}

function formatConflictDraftLabel(draft) {
  var type = 'entidad';
  if (draft && draft.entityType === 'roomBundle') type = 'sala';
  else if (draft && draft.entityType) type = String(draft.entityType);
  else if (isRoomBundleConflictDraft(draft)) type = 'sala';
  var id = draft && draft.entityId ? String(draft.entityId) : '';
  var keys =
    draft && Array.isArray(draft.conflictingKeys) && draft.conflictingKeys.length
      ? ' · ' + draft.conflictingKeys.slice(0, 3).join(', ')
      : '';
  var when = '';
  try {
    when = new Date(draft.savedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  } catch (_eWhen) {}
  return type + (id ? ' ' + id : '') + keys + (when ? ' — ' + when : '');
}

function draftRecordToConflictPayload(draft) {
  return {
    transport: draft.transport,
    entityType: draft.entityType,
    entityId: draft.entityId,
    roomId: draft.roomId,
    patientId: draft.patientId,
    conflictingKeys: draft.conflictingKeys || [],
    localSnapshot: draft.localSnapshot,
    serverSnapshot: draft.serverSnapshot,
  };
}

function mergeConflictSnapshotData(snap) {
  if (!snap) return {};
  var base = snap.baseData && typeof snap.baseData === 'object' ? snap.baseData : {};
  var patch = snap.data && typeof snap.data === 'object' ? snap.data : {};
  return Object.assign({}, base, patch);
}

function conflictDataForViewer(payload) {
  var local = mergeConflictSnapshotData(payload && payload.localSnapshot);
  var server =
    payload && payload.serverSnapshot && payload.serverSnapshot.data
      ? Object.assign({}, payload.serverSnapshot.data)
      : {};
  if (payload && payload.entityType === 'todo' && (!server.text || server.completed == null)) {
    var cached = getLiveSyncEntityBase('todo', payload.entityId, payload.patientId);
    if (cached) server = Object.assign({}, cached, server);
  }
  return { localData: local, serverData: server };
}

function shouldAutoResolveTodoConflict(payload) {
  if (!payload || payload.entityType !== 'todo') return false;
  if (payload.localSnapshot && payload.localSnapshot.op === 'delete') return true;
  var local = mergeConflictSnapshotData(payload.localSnapshot);
  var server = payload.serverSnapshot && payload.serverSnapshot.data;
  return !!(local.completed || (server && server.completed));
}

function tryAutoResolveTodoConflict(payload) {
  var server = payload.serverSnapshot;
  if (!server || server.version == null || !payload.patientId) return false;
  var local = mergeConflictSnapshotData(payload.localSnapshot);
  var merged = Object.assign({}, server.data || {}, local, {
    id: payload.entityId,
    version: server.version,
  });
  if (payload.localSnapshot && payload.localSnapshot.op === 'delete') {
    emitLiveSyncTodoDelete(payload.patientId, merged);
    return true;
  }
  if (local.completed) {
    merged.completed = true;
    emitLiveSyncTodoUpsert(payload.patientId, merged);
    return true;
  }
  return false;
}

function conflictViewerContext(payload) {
  var local = payload && payload.localSnapshot;
  var server = payload && payload.serverSnapshot;
  var localData = mergeConflictSnapshotData(local);
  var serverData = server && server.data;
  var ctx = {
    entityType: payload && payload.entityType,
    entityId: payload && payload.entityId,
    patientId: payload && payload.patientId,
    transport: payload && payload.transport,
    localVersion: local && local.expectedVersion != null ? local.expectedVersion : local && local.version,
    serverVersion: server && server.version,
    localOp: local && local.op,
  };
  if (payload && payload.patientId) {
    var row = patients.find(function (p) {
      return p && String(p.id) === String(payload.patientId);
    });
    if (row && row.nombre) ctx.patientDisplayName = String(row.nombre);
  }
  if (payload && payload.entityType === 'todo') {
    var preview =
      (localData && String(localData.text || '').trim()) ||
      (serverData && String(serverData.text || '').trim()) ||
      '';
    if (preview) ctx.itemPreview = preview;
    if (local && local.op === 'delete') ctx.intent = 'todo-delete';
    else if (localData.completed) ctx.intent = 'todo-complete';
  }
  return ctx;
}

function conflictEditDraftHandler(payload) {
  var resolved = false;
  if (
    payload &&
    payload.entityType === 'todo' &&
    payload.localSnapshot &&
    payload.localSnapshot.op === 'delete' &&
    payload.serverSnapshot &&
    payload.patientId
  ) {
    var todo = Object.assign({}, payload.serverSnapshot.data || {}, {
      id: payload.entityId,
      version: payload.serverSnapshot.version,
    });
    emitLiveSyncTodoDelete(payload.patientId, todo);
    resolved = true;
  }
  if (resolved && payload.draftId) {
    void clearConflictDraft(payload.draftId);
  }
}

async function reopenConflictDraftFromStore(draftId) {
  var draft = await getDraftConflict(draftId);
  if (!draft) {
    runtime.showToast('No se encontró el borrador de conflicto', 'error');
    void renderLanPanel();
    return;
  }
  if (isRoomBundleConflictDraft(draft)) {
    openClinicalConflictViewer({
      draftId: draft.id,
      conflictingKeys: draft.conflictingKeys || ['*'],
      localData: draft.localBundle || {},
      serverData: draft.serverBundle || {},
      context: {
        entityType: 'roomBundle',
        roomId: draft.roomId,
        transport: draft.transport || 'http',
      },
      onUseServer: function () {
        void applyRoomBundleServerChoice(draft);
      },
      onEditDraft: function () {},
      onClose: function () {},
    });
    return;
  }
  var payload = draftRecordToConflictPayload(draft);
  var viewerData = conflictDataForViewer(payload);
  openClinicalConflictViewer({
    draftId: draft.id,
    conflictingKeys: payload.conflictingKeys,
    localData: viewerData.localData,
    serverData: viewerData.serverData,
    context: conflictViewerContext(payload),
    onUseServer: function () {
      void applyConflictUseServer(Object.assign({}, payload, { draftId: draft.id }));
    },
    onEditDraft: function () {
      conflictEditDraftHandler(Object.assign({}, payload, { draftId: draft.id }));
    },
    onClose: function () {},
  });
}

async function appendLanConflictDraftsSection(root) {
  if (!root) return;
  var drafts = [];
  try {
    drafts = await listDraftConflicts();
  } catch (_eList) {
    drafts = [];
  }
  var prev = root.querySelector('#lan-conflict-drafts-card');
  if (prev) prev.remove();

  var card = document.createElement('div');
  card.id = 'lan-conflict-drafts-card';
  card.className = 'lan-connect-card';

  var title = document.createElement('div');
  title.className = 'lan-connect-card-title';
  title.textContent = 'Borradores de conflicto (' + drafts.length + ')';
  card.appendChild(title);

  if (!drafts.length) {
    var empty = document.createElement('p');
    empty.className = 'lan-connect-card-hint';
    empty.textContent =
      'No hay borradores guardados. Si cierras el visor tras un conflicto de sincronización, vuelve aquí para retomarlo.';
    card.appendChild(empty);
  } else {
    var hint = document.createElement('p');
    hint.className = 'lan-connect-card-hint';
    hint.textContent = 'Toca un borrador para volver a abrir el comparador y resolver el conflicto.';
    card.appendChild(hint);
    var list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '0';
    list.style.margin = '8px 0 0';
    drafts.forEach(function (draft) {
      if (!draft || !draft.id) return;
      var li = document.createElement('li');
      li.style.marginBottom = '6px';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-lan-secondary';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.textContent = formatConflictDraftLabel(draft);
      btn.addEventListener('click', function () {
        void reopenConflictDraftFromStore(draft.id);
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
    card.appendChild(list);
  }
  root.appendChild(card);
}

async function handleSyncConflict(payload) {
  if (shouldAutoResolveTodoConflict(payload) && tryAutoResolveTodoConflict(payload)) {
    await discardDraftsForConflictEntity(payload);
    void renderLanPanel();
    runtime.showToast('Pendiente alineado con la sala', 'info');
    return;
  }
  var draftId = await saveDraftConflict({
    transport: payload.transport,
    entityType: payload.entityType,
    entityId: payload.entityId,
    roomId: payload.roomId || null,
    patientId: payload.patientId || null,
    localSnapshot: payload.localSnapshot,
    serverSnapshot: payload.serverSnapshot,
    conflictingKeys: payload.conflictingKeys,
  });
  var viewerData = conflictDataForViewer(payload);
  openClinicalConflictViewer({
    draftId: draftId,
    conflictingKeys: payload.conflictingKeys,
    localData: viewerData.localData,
    serverData: viewerData.serverData,
    context: conflictViewerContext(payload),
    onUseServer: function () {
      void applyConflictUseServer(Object.assign({}, payload, { draftId: draftId }));
    },
    onEditDraft: function () {
      conflictEditDraftHandler(Object.assign({}, payload, { draftId: draftId }));
    },
    onClose: function () {},
  });
  void renderLanPanel();
}

function wsConflictDetailToPayload(detail) {
  return {
    transport: 'ws',
    entityType: detail.entityType,
    entityId: detail.entityId,
    roomId: detail.roomId,
    patientId: detail.patientId,
    conflictingKeys: detail.conflictingKeys || [],
    localSnapshot: {
      expectedVersion: detail.client && detail.client.version != null ? detail.client.version : detail.expectedVersion,
      data: detail.client && detail.client.data,
      baseData: getLiveSyncEntityBase(detail.entityType, detail.entityId, detail.patientId) || undefined,
      op: detail.client && detail.client.op,
    },
    serverSnapshot: {
      version: detail.server && detail.server.version,
      data: detail.server && detail.server.data,
    },
  };
}

/** @param {string} patientId */
export async function lanFetchHostPatientRow(patientId) {
  var pid = String(patientId || '').trim();
  if (!pid || !isLanSessionConfiguredForRest()) return null;
  var resp = await lanFetchAuthed('/api/lan/v1/patients');
  if (!resp.ok) return null;
  var body = {};
  try {
    body = await resp.json();
  } catch (_e) {}
  var list = Array.isArray(body.patients) ? body.patients : [];
  return (
    list.find(function (row) {
      return row && String(row.id) === pid;
    }) || null
  );
}

export async function lanPushPatientVersioned(patientId, mutation) {
  var pid = String(patientId || '').trim();
  if (!pid || !mutation) return { ok: false, error: 'invalid_args' };
  var resp = await lanFetchAuthed('/api/lan/v1/patients/' + encodeURIComponent(pid), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mutation),
  });
  if (resp.status === 409) {
    var body = {};
    try {
      body = await resp.json();
    } catch (_eJson) {}
    await handleSyncConflict({
      transport: 'http',
      entityType: body.entityType || 'patient',
      entityId: body.entityId || pid,
      roomId: null,
      patientId: pid,
      conflictingKeys: body.conflictingKeys || [],
      localSnapshot: {
        expectedVersion: mutation.expectedVersion,
        changedKeys: mutation.changedKeys,
        baseData: mutation.baseData,
        data: mutation.data,
        op: mutation.op,
      },
      serverSnapshot: { version: body.serverVersion, data: body.serverData },
    });
    return { ok: false, conflict: true, body: body };
  }
  if (!resp.ok) {
    return { ok: false, status: resp.status };
  }
  var out = {};
  try {
    out = await resp.json();
  } catch (_eOut) {}
  if (out && out.version != null && out.data) {
    rememberLiveSyncEntity('patient', pid, null, out.version, out.data);
  }
  return { ok: true, body: out, version: out.version, data: out.data };
}

export async function lanPushHistoriaClinica(patientId, mutation) {
  var pid = String(patientId || '').trim();
  if (!pid || !mutation) return { ok: false, error: 'invalid_args' };
  var resp = await lanFetchAuthed(
    '/api/lan/v1/patients/' + encodeURIComponent(pid) + '/historia-clinica',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mutation),
    }
  );
  if (resp.status === 409) {
    var body = {};
    try {
      body = await resp.json();
    } catch (_eJson) {}
    await handleSyncConflict({
      transport: 'http',
      entityType: body.entityType || 'historiaClinica',
      entityId: body.entityId || pid,
      roomId: mutation.roomId || null,
      patientId: pid,
      conflictingKeys: body.conflictingKeys || [],
      localSnapshot: {
        expectedVersion: mutation.expectedVersion,
        changedKeys: mutation.changedKeys,
        baseData: mutation.baseData,
        data: mutation.data,
        op: mutation.op,
      },
      serverSnapshot: { version: body.serverVersion, data: body.serverData },
    });
    return { ok: false, conflict: true, body: body };
  }
  if (!resp.ok) {
    return { ok: false, status: resp.status };
  }
  var out = {};
  try {
    out = await resp.json();
  } catch (_eOut) {}
  return { ok: true, version: out.version, data: out.data, body: out };
}

/** Sync patient.archived to LAN host (triggers historia archive when archived: true). */
export async function lanSyncPatientArchivedFlag(patient) {
  if (!patient || !patient.id || !isLanSessionConfiguredForRest()) {
    return { ok: false, error: 'not_configured' };
  }
  var resp = await lanFetchAuthed('/api/lan/v1/patients');
  if (!resp.ok) return { ok: false, status: resp.status };
  var body = {};
  try {
    body = await resp.json();
  } catch (_e) {}
  var list = Array.isArray(body.patients) ? body.patients : [];
  var hostRow = list.find(function (row) {
    return row && String(row.id) === String(patient.id);
  });
  if (!hostRow) return { ok: false, error: 'patient_not_on_host' };
  var mutation = {
    expectedVersion: Number(hostRow.version || 1),
    changedKeys: ['archived'],
    baseData: hostRow,
    data: Object.assign({}, hostRow, { archived: !!patient.archived }),
  };
  return lanPushPatientVersioned(patient.id, mutation);
}

export async function lanFetchHistoriaClinica(patientId, roomId) {
  var pid = String(patientId || '').trim();
  var rid = String(roomId || '').trim();
  if (!pid || !rid || !isLanSessionConfiguredForRest()) {
    return { ok: false, error: 'not_configured' };
  }
  var resp = await lanFetchAuthed(
    '/api/lan/v1/patients/' +
      encodeURIComponent(pid) +
      '/historia-clinica?roomId=' +
      encodeURIComponent(rid)
  );
  if (resp.status === 404) return { ok: true, missing: true };
  if (!resp.ok) return { ok: false, status: resp.status };
  var body = await resp.json();
  return { ok: true, version: body.version, data: body.data };
}

function getLanClientId() {
  try {
    var id = localStorage.getItem('rpc-lan-client-id');
    if (id && String(id).trim()) return String(id).trim();
    var gen = 'lc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('rpc-lan-client-id', gen);
    return gen;
  } catch (_e) {
    return 'lc_anon';
  }
}

function getLanTeamCodeFromConfig() {
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  return trimStoredLanBearer(cfg.teamCode);
}

async function resolveSelfLanAdvertiseHostUrl() {
  if (!isLanElectronDesktop() || isLanRemoteJoinMode()) return '';
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var fromCfg = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (fromCfg) return fromCfg;
  return resolveLanHostUrlAuto();
}

function buildLiveSyncHelloPayload(roomId) {
  var rid = String(roomId || '').trim();
  var prev = storage.getLanRoomSnapshot(rid);
  var payload = {
    type: 'livesync:hello',
    roomId: rid,
    clientId: getLanClientId(),
    snapshotAt: prev && prev.savedAt ? prev.savedAt : null,
    generation: prev && prev.generation != null ? prev.generation : 0,
    canHost: isLanElectronDesktop(),
    isSurrogate: isSurrogateHostActive(),
  };
  return payload;
}

async function enrichLiveSyncHelloPayload(payload) {
  if (!payload || !payload.canHost) return payload;
  var url = await resolveSelfLanAdvertiseHostUrl();
  if (url) payload.hostUrl = url;
  return payload;
}

function applyLanHostUrlSwitch(hostUrl, teamCode, opts) {
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

function stopSurrogateFailoverTimer() {
  if (_surrogateFailoverTimer) {
    clearTimeout(_surrogateFailoverTimer);
    _surrogateFailoverTimer = null;
  }
}

function scheduleSurrogateFailoverCheck() {
  if (!activeLiveSyncRoomId || !getRoomMembership()) return;
  stopSurrogateFailoverTimer();
  _surrogateFailoverTimer = setTimeout(function () {
    _surrogateFailoverTimer = null;
    void runSurrogateFailoverCheck();
  }, 1200);
}

async function tryReconnectLanToHostUrl(hostUrl, teamCode) {
  if (!applyLanHostUrlSwitch(hostUrl, teamCode, { skipRememberPrimary: true })) return false;
  var ok = await pingLanHostUrl(hostUrl, teamCode);
  if (!ok) return false;
  var rid = activeLiveSyncRoomId;
  if (rid) {
    try {
      lanClient.connectLiveChannel(rid);
    } catch (_e) {}
    await syncLiveSyncAfterRoomJoin(rid);
    startLiveSyncReconnectLoop();
  }
  syncLiveSyncStatusChrome();
  patchLanPanelJoinButtons();
  return true;
}

async function promoteSelfToSurrogateHost() {
  if (!isLanElectronDesktop() || !isLanRemoteJoinMode()) return false;
  if (!activeLiveSyncRoomId) return false;
  if (isSurrogateHostActive()) return false;
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var formerUrl = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  var formerCode = getLanTeamCodeFromConfig();
  var localUrl = await resolveLanHostUrlAuto();
  if (!localUrl) return false;
  if (formerUrl && (await pingLanHostUrl(formerUrl, formerCode))) return false;
  setSurrogateHostState({
    formerHostUrl: formerUrl || getPrimaryHostUrl(),
    formerTeamCode: formerCode,
    localHostUrl: localUrl,
    roomId: activeLiveSyncRoomId,
    promotedAt: new Date().toISOString(),
  });
  applyLanHostUrlSwitch(localUrl, formerCode, { skipRememberPrimary: true });
  var bundle = buildLiveSyncBundleEnvelope(activeLiveSyncRoomId);
  await pushRoomSyncBundleToHost(activeLiveSyncRoomId, bundle);
  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
    lanClient.connectLiveChannel(activeLiveSyncRoomId);
  } catch (_e) {}
  await syncLiveSyncAfterRoomJoin(activeLiveSyncRoomId);
  startLiveSyncReconnectLoop();
  var handoff = await enrichLiveSyncHelloPayload(buildLiveSyncHelloPayload(activeLiveSyncRoomId));
  handoff.type = 'livesync:host-handoff';
  handoff.newHostUrl = localUrl;
  handoff.reason = 'surrogate-promoted';
  try {
    lanClient.sendLive(handoff);
  } catch (_e2) {}
  runtime.showToast(
    'El anfitrión se desconectó: esta Mac asume el servidor hasta que vuelva. Comparte de nuevo la invitación si alguien no reconecta solo.',
    'success'
  );
  renderLanPanel();
  return true;
}

async function maybeRevertSurrogateToPrimary() {
  var st = getSurrogateHostState();
  if (!st || !st.formerHostUrl) return false;
  var code = st.formerTeamCode || getLanTeamCodeFromConfig();
  if (!(await pingLanHostUrl(st.formerHostUrl, code))) return false;
  if (activeLiveSyncRoomId) {
    var bundle = buildLiveSyncBundleEnvelope(activeLiveSyncRoomId);
    var prevUrl = lanClient.baseUrl();
    applyLanHostUrlSwitch(st.formerHostUrl, code, { skipRememberPrimary: true });
    await pushRoomSyncBundleToHost(activeLiveSyncRoomId, bundle);
    if (!(await pingLanHostUrl(st.formerHostUrl, code))) {
      applyLanHostUrlSwitch(prevUrl, code, { skipRememberPrimary: true });
      return false;
    }
  }
  clearSurrogateHostState();
  applyLanHostUrlSwitch(st.formerHostUrl, code, { skipRememberPrimary: false });
  if (activeLiveSyncRoomId) {
    try {
      lanClient.connectLiveChannel(activeLiveSyncRoomId);
    } catch (_e) {}
    await syncLiveSyncAfterRoomJoin(activeLiveSyncRoomId);
  }
  runtime.showToast('El anfitrión original volvió: esta Mac dejó de ser servidor temporal.', 'success');
  renderLanPanel();
  return true;
}

async function runSurrogateFailoverCheck() {
  if (!activeLiveSyncRoomId || !getRoomMembership()) return;
  if (lanClient.connected && lanClient.liveConnected) return;
  var teamCode = getLanTeamCodeFromConfig();
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var currentUrl = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (currentUrl && (await pingLanHostUrl(currentUrl, teamCode))) {
    try {
      if (!lanClient.connected) lanClient.connectSyncChannel();
      if (activeLiveSyncRoomId) lanClient.connectLiveChannel(activeLiveSyncRoomId);
    } catch (_pingOk) {}
    if (isSurrogateHostActive()) void maybeRevertSurrogateToPrimary();
    return;
  }
  if (isSurrogateHostActive()) {
    if (await maybeRevertSurrogateToPrimary()) return;
  }
  var targets = [];
  var primary = getPrimaryHostUrl();
  if (primary && primary !== currentUrl) targets.push(primary);
  listLivePeerHostUrls(getLanClientId()).forEach(function (u) {
    if (u && targets.indexOf(u) === -1 && u !== currentUrl) targets.push(u);
  });
  for (var i = 0; i < targets.length; i += 1) {
    if (await tryReconnectLanToHostUrl(targets[i], teamCode)) {
      if (targets[i] !== primary) {
        runtime.showToast('Reconectado al nuevo anfitrión de la sala.', 'success');
      } else if (!isSurrogateHostActive()) {
        runtime.showToast('Anfitrión original de vuelta.', 'success');
      }
      return;
    }
  }
  if (!isLanElectronDesktop() || !isLanRemoteJoinMode()) return;
  await new Promise(function (r) {
    setTimeout(r, surrogateElectionDelayMs(getLanClientId()));
  });
  if (lanClient.connected && lanClient.liveConnected) return;
  if (primary && (await pingLanHostUrl(primary, teamCode))) {
    await tryReconnectLanToHostUrl(primary, teamCode);
    return;
  }
  for (var j = 0; j < targets.length; j += 1) {
    if (await pingLanHostUrl(targets[j], teamCode)) {
      await tryReconnectLanToHostUrl(targets[j], teamCode);
      return;
    }
  }
  await promoteSelfToSurrogateHost();
}

function collectPatientIdsForLiveSync() {
  return patients
    .filter(function (p) {
      return p && p.id && String(p.id).indexOf('demo-') !== 0;
    })
    .map(function (p) {
      return String(p.id);
    });
}
function collectTodosMapForLiveSync() {
  var out = {};
  collectPatientIdsForLiveSync().forEach(function (pid) {
    var list = storage.getTodos(pid);
    if (list.length) out[pid] = list;
  });
  return out;
}
function collectPatientEntriesForLanSync() {
  var out = [];
  patients.forEach(function (p) {
    if (!p || !p.id || String(p.id).indexOf('demo-') === 0) return;
    var entry = runtime.buildPatientEntry(p.id);
    if (entry) out.push(entry);
  });
  return out;
}

/*
 * V2 clinical ops LAN merge (rotation_cycles, patient_team_assignment,
 * team_guardia_today, teams, active_guardias) — LiveSync room names unchanged.
 *
 * - team_guardia_today: last-write per team_id by declared_at
 * - teams metadata: last-write per team_id (created_at tie-break)
 * - patient_team_assignment, team_membership: union — never silent delete
 * - active_guardias: last-write per patient by assigned_at
 * - rotation.nueva: signed audit event; peers apply archive + guardia clear when
 *   incoming rotationNuevaAt is newer than local (see lib/db/clinical-ops-sync.mjs)
 *
 * Host sync-bundle and WS livesync:bundle carry `clinicalOps` snapshot; renderer
 * applies via db:clinical-ops-merge. db:clinical-save-all also accepts clinicalOps blob.
 */

function mergeLiveSyncFullBundles(sources) {
  var base = mergeLiveSyncBundles(sources);
  var entries = mergeLanPatientEntrySources(sources);
  entries = filterEntriesByPatientDeletes(entries, base.patientDeletes || []);
  base.entries = attachTodosMapToPatientEntries(entries, base.todos);
  base.manejo = mergeManejoFromSources(sources);
  base.clinicalOps = mergeClinicalOpsFromSources(sources);
  return base;
}

function touchPatientLanUpdatedAt(patientId) {
  var p = patients.find(function (x) {
    return x && x.id === patientId;
  });
  if (p) p.lanUpdatedAt = new Date().toISOString();
}

function saveEntryTodosOnLocalPatient(localPatientId, entry) {
  if (!localPatientId || !entry) return;
  var incoming = Array.isArray(entry.todos) ? entry.todos : [];
  if (!incoming.length) return;
  storage.saveTodos(
    localPatientId,
    filterTodosRespectingDismissals(
      localPatientId,
      mergeTodoListsById(storage.getTodos(localPatientId), incoming)
    )
  );
}

function applyLanPatientEntries(entries) {
  if (!entries || !entries.length) return { added: 0, updated: 0 };
  var added = 0;
  var updated = 0;
  for (var i = 0; i < entries.length; i += 1) {
    var entry = entries[i];
    if (!entry || !entry.patient) continue;
    var reg = String(entry.patient.registro || '').trim();
    var existing = reg ? runtime.findPatientByRegistro(reg) : null;
    if (!existing && entry.patient.id) {
      existing = patients.find(function (p) {
        return p && p.id === entry.patient.id;
      });
    }
    if (existing) {
      existing.nombre = entry.patient.nombre || existing.nombre;
      existing.edad = entry.patient.edad || existing.edad;
      existing.sexo = entry.patient.sexo || existing.sexo;
      existing.area = entry.patient.area || existing.area;
      existing.servicio = entry.patient.servicio || existing.servicio;
      existing.cuarto = entry.patient.cuarto || existing.cuarto;
      existing.cama = entry.patient.cama || existing.cama;
      existing.peso = entry.patient.peso || existing.peso;
      existing.talla = entry.patient.talla || existing.talla;
      existing.viaAcceso = entry.patient.viaAcceso || existing.viaAcceso;
      mergeCensoPatientFields(existing, entry.patient);
      existing.registro = entry.patient.registro || existing.registro;
      if (entry.patient.fromLab) existing.fromLab = true;
      if (entry.patient.eventualidades && typeof entry.patient.eventualidades === 'object') {
        existing.eventualidades = entry.patient.eventualidades;
      }
      notes[existing.id] = entry.note || {};
      indicaciones[existing.id] = entry.indicaciones || {};
      labHistory[existing.id] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
      if (entry.medReceta) medRecetaByPatient[existing.id] = entry.medReceta;
      else delete medRecetaByPatient[existing.id];
      if (entry.medPharmProfile) medPharmProfileByPatient[existing.id] = entry.medPharmProfile;
      else delete medPharmProfileByPatient[existing.id];
      if (entry.vpo) vpoByPatient[existing.id] = entry.vpo;
      else delete vpoByPatient[existing.id];
      if (entry.listadoProblemas) listadoProblemas[existing.id] = entry.listadoProblemas;
      mergePatientMonitoreoFromImported(existing, entry.patient);
      saveEntryTodosOnLocalPatient(existing.id, entry);
      updated += 1;
    } else {
      var remoteId = String(entry.patient.id || '').trim();
      var idTaken =
        remoteId &&
        patients.some(function (p) {
          return p && p.id === remoteId;
        });
      var newId;
      if (remoteId && !idTaken) {
        var newPat = {
          id: remoteId,
          nombre: runtime.ensureUniquePatientName(entry.patient.nombre || 'PACIENTE SIN NOMBRE'),
          area: entry.patient.area || '',
          servicio: entry.patient.servicio || '',
          cuarto: entry.patient.cuarto || '',
          cama: entry.patient.cama || '',
          peso: entry.patient.peso || '',
          talla: entry.patient.talla || '',
          viaAcceso: entry.patient.viaAcceso || '',
          edad: entry.patient.edad || '',
          sexo: entry.patient.sexo || 'F',
          registro: entry.patient.registro || '',
          fromLab: !!entry.patient.fromLab,
        };
        mergePatientMonitoreoFromImported(newPat, entry.patient);
        mergeCensoPatientFields(newPat, entry.patient);
        if (entry.patient.eventualidades && typeof entry.patient.eventualidades === 'object') {
          newPat.eventualidades = entry.patient.eventualidades;
        }
        patients.unshift(newPat);
        notes[remoteId] = entry.note || {};
        indicaciones[remoteId] = entry.indicaciones || {};
        labHistory[remoteId] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
        if (entry.medReceta) medRecetaByPatient[remoteId] = entry.medReceta;
        if (entry.medPharmProfile) medPharmProfileByPatient[remoteId] = entry.medPharmProfile;
        if (entry.vpo) vpoByPatient[remoteId] = entry.vpo;
        newId = remoteId;
      } else {
        newId = runtime.applyImportEntry(entry, 'duplicate', null);
      }
      if (entry.listadoProblemas && newId) listadoProblemas[newId] = entry.listadoProblemas;
      saveEntryTodosOnLocalPatient(newId, entry);
      added += 1;
    }
  }
  if (added || updated) {
    saveState({ immediate: true });
    runtime.renderPatientList();
    if (runtime.getActiveId()) {
      try {
        runtime.renderNoteForm();
      } catch (_e) {}
      try {
        runtime.renderLabHistoryPanel();
      } catch (_e2) {}
    }
  }
  return { added: added, updated: updated };
}

export function removePatientLocally(patientId) {
  var pid = String(patientId || '').trim();
  if (!pid || pid.indexOf('demo-') === 0) return false;
  if (!patients.some(function (p) {
    return p && p.id === pid;
  })) {
    return false;
  }
  setPatients(patients.filter(function (p) {
    return p.id !== pid;
  }));
  delete notes[pid];
  delete indicaciones[pid];
  if (labHistory && labHistory[pid]) delete labHistory[pid];
  if (medRecetaByPatient && medRecetaByPatient[pid]) delete medRecetaByPatient[pid];
  if (medPharmProfileByPatient && medPharmProfileByPatient[pid]) delete medPharmProfileByPatient[pid];
  if (typeof vpoByPatient !== 'undefined' && vpoByPatient && vpoByPatient[pid]) delete vpoByPatient[pid];
  if (recetaHuByPatient && recetaHuByPatient[pid]) delete recetaHuByPatient[pid];
  if (medNotaSelectionByPatient && medNotaSelectionByPatient[pid]) delete medNotaSelectionByPatient[pid];
  if (listadoProblemas && listadoProblemas[pid]) delete listadoProblemas[pid];
  try {
    var rawTodosMap = localStorage.getItem('rpc-todos');
    if (rawTodosMap) {
      var todosMap = JSON.parse(rawTodosMap);
      if (todosMap && typeof todosMap === 'object' && todosMap[pid]) {
        delete todosMap[pid];
        localStorage.setItem('rpc-todos', JSON.stringify(todosMap));
      }
    }
  } catch (_e) {}
  try {
    if (storage.removeScheduledProceduresForPatient) storage.removeScheduledProceduresForPatient(pid);
  } catch (_eAg) {}
  if (runtime.getActiveId() === pid) runtime.setActiveId(patients.length ? patients[0].id : null);
  return true;
}

function applyLiveSyncPatientDeletes(deletes, idMap) {
  if (!deletes || !deletes.length) return false;
  var changed = false;
  for (var i = 0; i < deletes.length; i += 1) {
    var d = deletes[i];
    if (!d || !d.deleted) continue;
    var remoteId = String(d.id || '').trim();
    var localId = remoteId && idMap && idMap[remoteId] ? idMap[remoteId] : remoteId;
    if (localId && removePatientLocally(localId)) {
      changed = true;
      continue;
    }
    var reg = String(d.registro || '').trim();
    if (reg) {
      var existing = runtime.findPatientByRegistro(reg);
      if (existing && removePatientLocally(existing.id)) changed = true;
    }
  }
  return changed;
}

function applyLiveSyncMerged(merged) {
  if (!merged) return;
  if (isPitchPatientIsolationActive()) return;
  var entries = merged.entries || [];
  if (entries.length) {
    applyLanPatientEntries(entries);
  }
  var idMap = buildLiveSyncPatientIdMap(entries, patients, merged.todos || {});
  var patientRemoved = applyLiveSyncPatientDeletes(merged.patientDeletes || [], idMap);
  storage.saveScheduledProcedures(remapAgendaPatientIds(merged.agenda || [], idMap));
  var todosMap = remapTodosPatientIds(merged.todos || {}, idMap);
  if (activeLiveSyncRoomId) {
    var entityVersions = getHostBundleBases(activeLiveSyncRoomId).entityVersions;
    todosMap = stampTodosWithEntityVersions(todosMap, entityVersions);
    rememberTodosFromMap(todosMap);
  }
  var saveTodoPids = Object.create(null);
  Object.keys(todosMap).forEach(function (pid) {
    saveTodoPids[pid] = true;
  });
  (merged.todoTouchedPatientIds || []).forEach(function (pid) {
    var mapped = idMap[pid] || pid;
    if (mapped) saveTodoPids[mapped] = true;
  });
  Object.keys(saveTodoPids).forEach(function (pid) {
    var todoList = todosMap[pid] || [];
    storage.saveTodos(pid, filterTodosRespectingDismissals(pid, todoList));
  });
  if (patientRemoved) {
    runtime.renderPatientList();
    if (runtime.getActiveId()) runtime.selectPatient(runtime.getActiveId());
    else {
      var pv = document.getElementById('patient-view');
      var es = document.getElementById('empty-state');
      if (pv) pv.style.display = 'none';
      if (es) es.style.display = 'flex';
      runtime.syncWorkContextChrome();
    }
  }
  if (runtime.getActiveAppTab() === 'agenda' || runtime.isMobileWeb()) {
    runtime.renderProcedureAgendaPanel();
  }
  runtime.refreshAllTodoUIs();
  if (runtime.getActiveId()) {
    try {
      runtime.renderNoteForm();
    } catch (_eNote) {}
    try {
      runtime.renderLabHistoryPanel();
    } catch (_eLab) {}
  }
  if (merged.manejo) {
    applyManejoRoomDataToLocal(merged.manejo);
  }
  if (merged.clinicalOps && isClinicalOpsLanAvailable()) {
    void applyClinicalOpsLanSnapshot(merged.clinicalOps).then(function (ok) {
      if (ok) {
        void refreshClinicalOpsSnapshotCache();
        document.dispatchEvent(new CustomEvent('rpc-clinical-ops-synced'));
      }
    });
  }
}
function liveSyncBundleHasPayload(bundle) {
  if (!bundle) return false;
  if (Array.isArray(bundle.entries) && bundle.entries.length > 0) return true;
  if (Array.isArray(bundle.agenda) && bundle.agenda.length > 0) return true;
  var todos = bundle.todos;
  if (!todos || typeof todos !== 'object') return false;
  var keys = Object.keys(todos);
  for (var i = 0; i < keys.length; i += 1) {
    if (Array.isArray(todos[keys[i]]) && todos[keys[i]].length > 0) return true;
  }
  var manejo = bundle.manejo;
  if (manejo && typeof manejo === 'object') {
    if (Array.isArray(manejo.customProtocols) && manejo.customProtocols.length > 0) return true;
    if (manejo.overrides && Object.keys(manejo.overrides).length > 0) return true;
    if (Array.isArray(manejo.favorites) && manejo.favorites.length > 0) return true;
  }
  var clinicalOps = bundle.clinicalOps;
  if (clinicalOps && typeof clinicalOps === 'object') {
    if (
      (Array.isArray(clinicalOps.rotation_cycles) && clinicalOps.rotation_cycles.length > 0) ||
      (Array.isArray(clinicalOps.patient_team_assignment) &&
        clinicalOps.patient_team_assignment.length > 0) ||
      (Array.isArray(clinicalOps.team_guardia_today) && clinicalOps.team_guardia_today.length > 0) ||
      (Array.isArray(clinicalOps.active_guardias) && clinicalOps.active_guardias.length > 0)
    ) {
      return true;
    }
  }
  return false;
}
function hostBundleBodyFromEnvelope(envelope, roomId) {
  var body = hostBundlePutBodyFromEnvelope(roomId, envelope);
  body.uploadedByClientId = envelope.clientId || getLanClientId();
  return body;
}
function pushRoomSyncBundleToHost(roomId, envelope) {
  if (!isLanSessionConfiguredForRest()) return Promise.resolve(false);
  var rid = String(roomId || '').trim();
  if (!rid || !envelope || !liveSyncBundleHasPayload(envelope)) return Promise.resolve(false);
  return lanClient
    .fetch('/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/sync-bundle', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bundle: hostBundleBodyFromEnvelope(envelope, rid),
      }),
    })
    .then(function (resp) {
      if (!resp) return false;
      if (resp.status === 409) {
        return resp.json().then(function (body) {
          var conflicts = body && Array.isArray(body.conflicts) ? body.conflicts : [];
          var conflictKeys = conflicts.map(function (c) {
            return c && c.key ? String(c.key) : '';
          }).filter(Boolean);
          var bundleConflictKeys = conflictKeys.length ? conflictKeys : ['*'];
          return saveDraftConflict({
            scope: 'room:' + rid,
            entityType: 'roomBundle',
            transport: 'http',
            roomId: rid,
            localBundle: envelope,
            serverBundle: body && body.bundle ? body.bundle : null,
            conflicts: conflicts,
            conflictingKeys: bundleConflictKeys,
          }).then(function (draftId) {
            var roomDraft = {
              id: draftId,
              roomId: rid,
              serverBundle: body && body.bundle ? body.bundle : null,
            };
            openClinicalConflictViewer({
              draftId: draftId,
              conflictingKeys: bundleConflictKeys,
              localData: envelope,
              serverData: body && body.bundle ? body.bundle : {},
              context: {
                entityType: 'roomBundle',
                roomId: rid,
                transport: 'http',
              },
              onUseServer: function () {
                void applyRoomBundleServerChoice(roomDraft);
              },
              onEditDraft: function () {},
              onClose: function () {},
            });
            void renderLanPanel();
            return false;
          });
        });
      }
      if (resp.ok) {
        return resp.json().then(function (body) {
          if (body && body.bundle) setHostBundleBases(rid, body.bundle);
          return true;
        });
      }
      return false;
    })
    .catch(function () {
      return false;
    });
}
function flushLiveSyncOutbox(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid || !isLanSessionConfiguredForRest()) return Promise.resolve();
  var items = drainOutbox(rid);
  if (!items.length) return Promise.resolve();
  var chain = Promise.resolve();
  items.forEach(function (item) {
    chain = chain.then(function () {
      if (!item || item.kind !== 'bundle' || !item.payload) return;
      return pushRoomSyncBundleToHost(rid, item.payload).then(function (ok) {
        if (!ok) enqueueOutbox(rid, item);
      });
    });
  });
  return chain;
}
function scheduleLiveSyncOutboxFlush() {
  if (_liveSyncOutboxFlushTimer) return;
  _liveSyncOutboxFlushTimer = setInterval(function () {
    var m = getRoomMembership();
    if (!m || !m.roomId) return;
    flushLiveSyncOutbox(m.roomId);
  }, LIVE_SYNC_OUTBOX_FLUSH_MS);
}
function stopLiveSyncReconnectLoop() {
  if (_liveSyncReconnectTimer) {
    clearTimeout(_liveSyncReconnectTimer);
    _liveSyncReconnectTimer = null;
  }
}
function startLiveSyncReconnectLoop() {
  stopLiveSyncReconnectLoop();
  var m = getRoomMembership();
  if (!m || !m.roomId) return;
  function tick() {
    var mem = getRoomMembership();
    if (!mem || !mem.roomId) {
      stopLiveSyncReconnectLoop();
      return;
    }
    if (!activeLiveSyncRoomId) {
      activeLiveSyncRoomId = mem.roomId;
      activeLiveSyncRoomLabel = mem.label;
    }
    if (lanClient.liveConnected && String(lanClient.liveRoomId || '') === mem.roomId) {
      _liveSyncReconnectAttempt = 0;
      syncLiveSyncStatusChrome();
      scheduleReconnect();
      return;
    }
    if (typeof lanClient.isLiveChannelBusy === 'function' && lanClient.isLiveChannelBusy(mem.roomId)) {
      syncLiveSyncStatusChrome();
      scheduleReconnect();
      return;
    }
    if (isLanSessionConfiguredForRest()) {
      try {
        if (!lanClient.connected) lanClient.connectSyncChannel();
        lanClient.connectLiveChannel(mem.roomId);
        syncLiveSyncAfterRoomJoin(mem.roomId);
      } catch (_e) {}
    }
    _liveSyncReconnectAttempt += 1;
    if (_liveSyncReconnectAttempt >= 3) scheduleSurrogateFailoverCheck();
    syncLiveSyncStatusChrome();
    scheduleReconnect();
  }
  function scheduleReconnect() {
    var delay = Math.min(30000, 1000 * Math.pow(2, Math.min(_liveSyncReconnectAttempt, 5)));
    _liveSyncReconnectTimer = setTimeout(tick, delay);
  }
  tick();
}
export function getActiveLiveSyncRoomId() {
  return activeLiveSyncRoomId;
}

export function bootLanRoomMembership() {
  migrateLastRoomToMembership();
  var m = getRoomMembership();
  if (!m || !m.roomId || !isLanSessionConfiguredForRest()) return;
  activeLiveSyncRoomId = m.roomId;
  activeLiveSyncRoomLabel = m.label;
  scheduleLiveSyncOutboxFlush();
  reconcileLiveSyncRoom(m.roomId)
    .then(function () {
      return flushLiveSyncOutbox(m.roomId);
    })
    .then(function () {
      if (!getRoomMembership()) return;
      try {
        if (!lanClient.connected) lanClient.connectSyncChannel();
        lanClient.connectLiveChannel(m.roomId);
      } catch (_e) {}
      startLiveSyncReconnectLoop();
      syncLiveSyncStatusChrome();
    });
}
function saveLocalRoomSnapshot(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid) return;
  var snap = buildRoomSnapshotFromStorage(storage, collectPatientIdsForLiveSync());
  var prev = storage.getLanRoomSnapshot(rid);
  var entries = collectPatientEntriesForLanSync();
  storage.saveLanRoomSnapshot(rid, {
    savedAt: snap.savedAt,
    generation: nextRoomSnapshotGeneration(prev),
    agenda: snap.agenda,
    todos: snap.todos,
    entries: entries,
    manejo: collectManejoRoomPayload(),
    clinicalOps: getCachedClinicalOpsSnapshot(),
  });
}
function buildLiveSyncBundleEnvelope(roomId) {
  var rid = String(roomId || '').trim();
  var snap = buildRoomSnapshotFromStorage(storage, collectPatientIdsForLiveSync());
  var prev = storage.getLanRoomSnapshot(rid);
  var entries = collectPatientEntriesForLanSync();
  return {
    type: 'livesync:bundle',
    roomId: rid,
    clientId: getLanClientId(),
    savedAt: snap.savedAt,
    generation: nextRoomSnapshotGeneration(prev),
    agenda: snap.agenda,
    todos: snap.todos,
    entries: entries,
    manejo: collectManejoRoomPayload(),
    clinicalOps: getCachedClinicalOpsSnapshot(),
  };
}
function scheduleLiveSyncPush() {
  if (!activeLiveSyncRoomId) return;
  if (isPitchPatientIsolationActive()) return;
  if (_liveSyncPushTimer) clearTimeout(_liveSyncPushTimer);
  _liveSyncPushTimer = setTimeout(function () {
    _liveSyncPushTimer = null;
    var roomId = activeLiveSyncRoomId;
    if (!roomId) return;
    void (async function () {
      if (isClinicalOpsLanAvailable()) {
        await refreshClinicalOpsSnapshotCache();
      }
      var bundle = buildLiveSyncBundleEnvelope(roomId);
      if (lanClient.liveConnected) {
        try {
          lanClient.sendLive(bundle);
        } catch (_e) {}
      }
      saveLocalRoomSnapshot(roomId);
      if (isLanSessionConfiguredForRest()) {
        pushRoomSyncBundleToHost(roomId, bundle).then(function (ok) {
          if (!ok) enqueueOutbox(roomId, { kind: 'bundle', payload: bundle });
        });
      }
    })();
  }, LIVE_SYNC_PUSH_DEBOUNCE_MS);
}

function syncLiveSyncStatusChrome() {
  var el = document.getElementById('lan-livesync-status');
  if (!el) return;
  if (!activeLiveSyncRoomId) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  el.style.display = 'block';
  var label = activeLiveSyncRoomLabel || activeLiveSyncRoomId;
  if (lanClient.liveConnected) {
    el.textContent = 'Sala: ' + label + ' · sincronizando pacientes, labs, agenda y pendientes';
  } else if (getRoomMembership() && getRoomMembership().roomId === activeLiveSyncRoomId) {
    el.textContent = 'Sala: ' + label + ' · reconectando…';
  } else {
    el.textContent = 'Sala: ' + label + ' · solo local (sin sync en vivo)';
  }
}
function emitLiveSyncAgendaUpsert(eventObj) {
  if (!eventObj || !eventObj.id) return;
  var mutation = buildLiveSyncMutationFromDesired('agenda', eventObj.id, eventObj, {
    roomId: activeLiveSyncRoomId,
    op: 'upsert',
  });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncAgendaDelete(id, updatedAt) {
  var eid = String(id || '').trim();
  if (!eid) return;
  var base = getLiveSyncEntityBase('agenda', eid, null) || { id: eid, version: 0, updatedAt: updatedAt };
  var mutation = createMutationBuilder('agenda', eid)
    .captureBase(base)
    .build({ roomId: activeLiveSyncRoomId, op: 'delete' });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncTodoUpsert(patientId, todo) {
  if (!todo) return;
  if (String(patientId || '').indexOf('demo-') === 0) return;
  var mutation = buildLiveSyncMutationFromDesired('todo', todo.id, todo, {
    roomId: activeLiveSyncRoomId,
    patientId: patientId,
    op: 'upsert',
  });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncTodoDelete(patientId, todoRef, updatedAt) {
  var todo = todoRef && typeof todoRef === 'object' ? todoRef : null;
  var eid = todo ? String(todo.id || '').trim() : String(todoRef || '').trim();
  if (!eid) return;
  var cached = getLiveSyncEntityBase('todo', eid, patientId);
  var base = cached
    ? Object.assign({}, cached)
    : Object.assign({}, todo || { id: eid, updatedAt: updatedAt }, { id: eid, patientId: patientId });
  if (todo && todo.version != null && (cached == null || cached.version == null)) {
    base.version = Number(todo.version);
  }
  if (base.version == null) base.version = Number(todo && todo.version != null ? todo.version : 0);
  var mutation = createMutationBuilder('todo', eid)
    .captureBase(base)
    .build({ roomId: activeLiveSyncRoomId, patientId: patientId, op: 'delete' });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncPatientDelete(patient) {
  if (!patient) return;
  if (String(patient.id || '').indexOf('demo-') === 0) return;
  var mutation = buildLiveSyncMutationFromDesired(
    'patient',
    patient.id,
    { id: patient.id, registro: patient.registro || '' },
    { roomId: activeLiveSyncRoomId, op: 'delete' }
  );
  sendLiveSyncMutation(mutation);
}

function applyLiveSyncApplied(msg) {
  if (!msg || isPitchPatientIsolationActive()) return;
  if (msg.roomId && activeLiveSyncRoomId && msg.roomId !== activeLiveSyncRoomId) return;
  var entityType = msg.entityType;
  var entityId = String(msg.entityId || '').trim();
  var patientId = msg.patientId;
  var version = Number(msg.version || 1);
  var entityData = msg.data || {};
  if (!entityType || !entityId) return;

  rememberLiveSyncEntity(entityType, entityId, patientId, version, entityData);

  if (entityType === 'agenda') {
    var agenda = storage.getScheduledProcedures();
    if (entityData._deleted) {
      agenda = agenda.filter(function (ev) {
        return ev && ev.id !== entityId;
      });
    } else {
      var agendaFound = false;
      agenda = agenda.map(function (ev) {
        if (ev && ev.id === entityId) {
          agendaFound = true;
          return Object.assign({}, ev, entityData, { id: entityId, version: version });
        }
        return ev;
      });
      if (!agendaFound) {
        agenda.push(Object.assign({}, entityData, { id: entityId, version: version }));
      }
    }
    storage.saveScheduledProcedures(agenda);
    if (runtime.getActiveAppTab() === 'agenda' || runtime.isMobileWeb()) {
      runtime.renderProcedureAgendaPanel();
    }
  } else if (entityType === 'todo' && patientId) {
    var pid = String(patientId);
    if (pid.indexOf('demo-') !== 0) {
      var todos = storage.getTodos(pid);
      if (entityData._deleted) {
        todos = todos.filter(function (t) {
          return t && t.id !== entityId;
        });
      } else {
        var todoFound = false;
        todos = todos.map(function (t) {
          if (t && t.id === entityId) {
            todoFound = true;
            return Object.assign({}, t, entityData, { id: entityId, version: version });
          }
          return t;
        });
        if (!todoFound) {
          todos.push(Object.assign({}, entityData, { id: entityId, version: version }));
        }
      }
      storage.saveTodos(pid, filterTodosRespectingDismissals(pid, todos));
    }
    runtime.refreshAllTodoUIs();
  } else if (entityType === 'patient') {
    var row = patients.find(function (p) {
      return p && p.id === entityId;
    });
    if (row && !entityData._deleted) {
      Object.assign(row, entityData, { version: version });
      saveState({ immediate: true });
      runtime.renderPatientList();
      if (runtime.getActiveId() === entityId) {
        try {
          runtime.renderNoteForm();
        } catch (_eNote) {}
        try {
          runtime.renderLabHistoryPanel();
        } catch (_eLab) {}
      }
    }
  }

  if (msg.autoMerged) {
    runtime.showToast('Cambios fusionados automáticamente con el servidor.', 'success');
  }
}
function onLiveSyncWireMessage(data) {
  if (!data || !isLiveSyncEnvelope(data)) return;
  if (data.roomId && activeLiveSyncRoomId && data.roomId !== activeLiveSyncRoomId) return;
  var myId = getLanClientId();
  if (data.type === 'livesync:hello' || data.type === 'livesync:host-handoff') {
    if (data.clientId !== myId) {
      recordLivePeer(data.clientId, {
        hostUrl: data.newHostUrl || data.hostUrl,
        canHost: !!data.canHost,
      });
      if (data.type === 'livesync:host-handoff' && data.newHostUrl) {
        var newUrl = String(data.newHostUrl || '')
          .trim()
          .replace(/\/+$/, '');
        var cfgNow = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
        var curUrl = String(cfgNow.hostUrl || '')
          .trim()
          .replace(/\/+$/, '');
        if (newUrl && newUrl !== curUrl && isLanRemoteJoinMode()) {
          void tryReconnectLanToHostUrl(newUrl, getLanTeamCodeFromConfig());
        }
      }
    }
    if (data.type === 'livesync:hello' && data.clientId !== myId && activeLiveSyncRoomId) {
      lanClient.sendLive(buildLiveSyncBundleEnvelope(activeLiveSyncRoomId));
    }
    return;
  }
  if (data.type === 'livesync:leave' && data.bundle && data.clientId !== myId) {
    applyLiveSyncMerged(
      mergeLiveSyncFullBundles([
        {
          agenda: storage.getScheduledProcedures(),
          todos: collectTodosMapForLiveSync(),
          entries: collectPatientEntriesForLanSync(),
        },
        data.bundle,
      ])
    );
    return;
  }
  if (data.clientId === myId && data.type !== 'livesync:hello') return;
  if (data.type === 'livesync:bundle') {
    var mergedBundle = mergeLiveSyncFullBundles([
      {
        agenda: storage.getScheduledProcedures(),
        todos: collectTodosMapForLiveSync(),
        entries: collectPatientEntriesForLanSync(),
      },
      data,
    ]);
    applyLiveSyncMerged(mergedBundle);
    return;
  }
  if (data.type === 'livesync:applied') {
    applyLiveSyncApplied(data);
    return;
  }
}
async function reconcileLiveSyncRoom(roomId) {
  var sources = [];
  var local = storage.getLanRoomSnapshot(roomId);
  if (local) sources.push(local);
  sources.push({
    agenda: storage.getScheduledProcedures(),
    todos: collectTodosMapForLiveSync(),
    entries: collectPatientEntriesForLanSync(),
  });
  try {
    var resp = await lanClient.fetch(
      '/api/lan/v1/rooms/' + encodeURIComponent(roomId) + '/sync-bundle'
    );
    if (resp.ok) {
      var j = await resp.json();
      if (j && j.bundle) {
        setHostBundleBases(roomId, j.bundle);
        sources.push(j.bundle);
      }
    }
  } catch (_e) {}
  if (sources.length) {
    applyLiveSyncMerged(mergeLiveSyncFullBundles(sources));
  }
  return flushLiveSyncOutbox(roomId);
}
function syncLiveSyncAfterRoomJoin(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid) return Promise.resolve();
  return reconcileLiveSyncRoom(rid).then(function () {
    if (activeLiveSyncRoomId !== rid) return;
    if (lanClient.liveConnected) {
      void enrichLiveSyncHelloPayload(buildLiveSyncHelloPayload(rid)).then(function (hello) {
        if (activeLiveSyncRoomId !== rid) return;
        try {
          lanClient.sendLive(hello);
        } catch (_hello) {}
      });
    }
    syncLiveSyncStatusChrome();
    runtime.renderProcedureAgendaPanel();
    runtime.refreshAllTodoUIs();
    runtime.renderPatientList();
  });
}
function leaveLiveSyncRoom(opts) {
  opts = opts || {};
  var roomId = activeLiveSyncRoomId;
  if (roomId) {
    var bundle = buildLiveSyncBundleEnvelope(roomId);
    if (!opts.silentLeave) {
      lanClient.sendLive({
        type: 'livesync:leave',
        roomId: roomId,
        clientId: getLanClientId(),
        bundle: bundle,
      });
    }
    saveLocalRoomSnapshot(roomId);
    if (liveSyncBundleHasPayload(bundle)) {
      pushRoomSyncBundleToHost(roomId, bundle);
    }
  }
  activeLiveSyncRoomId = '';
  activeLiveSyncRoomLabel = '';
  clearRoomMembership();
  stopLiveSyncReconnectLoop();
  lanClient.disconnectLiveChannel();
  syncLiveSyncStatusChrome();
  patchLanPanelJoinButtons();
  if (typeof renderLanPanel === 'function') renderLanPanel();
}
lanClient.addEventListener('lan-live', function (ev) {
  onLiveSyncWireMessage(ev.detail);
});
lanClient.addEventListener('lan-applied', function (ev) {
  applyLiveSyncApplied(ev.detail);
});
lanClient.addEventListener('lan-conflict', function (ev) {
  if (!ev.detail) return;
  void handleSyncConflict(wsConflictDetailToPayload(ev.detail));
});
lanClient.addEventListener('lan-status', function (ev) {
  if (!ev.detail || ev.detail.connected) return;
  if (activeLiveSyncRoomId && getRoomMembership()) scheduleSurrogateFailoverCheck();
});
lanClient.addEventListener('lan-live-status', function (ev) {
  if (!ev.detail) return;
  if (ev.detail.connected && activeLiveSyncRoomId) {
    syncLiveSyncAfterRoomJoin(activeLiveSyncRoomId);
    flushLiveSyncOutbox(activeLiveSyncRoomId);
    void maybeRevertSurrogateToPrimary();
  } else if (!ev.detail.connected && activeLiveSyncRoomId) {
    saveLocalRoomSnapshot(activeLiveSyncRoomId);
    startLiveSyncReconnectLoop();
    if (!lanClient.connected) scheduleSurrogateFailoverCheck();
  }
  syncLiveSyncStatusChrome();
});
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', function () {
    if (activeLiveSyncRoomId) saveLocalRoomSnapshot(activeLiveSyncRoomId);
  });
}

/** Escritorio unido a otra Mac: volver a usar el servidor de esta computadora. */
function resetLanToLocalHostFromUi() {
  if (!isLanElectronDesktop()) return;
  if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('host');
  storage.saveLanConfig(null);
  lanClient.disconnect();
  activeLiveSyncRoomId = '';
  activeLiveSyncRoomLabel = '';
  clearRoomMembership();
  void ensureLanElectronHostReady().then(function () {
    renderLanPanel();
    runtime.showToast('Esta Mac vuelve a ser el servidor del turno. Crea o únete a una sala.', 'success');
  });
}

function appendLanJoinOtherMacSection(root) {
  if (!root || !isLanElectronDesktop() || isLanRemoteJoinMode()) return;
  var details = document.createElement('details');
  details.className = 'lan-connect-other-mac';
  details.style.marginBottom = '12px';
  var sum = document.createElement('summary');
  sum.style.cursor = 'pointer';
  sum.style.fontSize = '12px';
  sum.style.color = 'var(--text-muted)';
  sum.textContent = 'Unirme a la sala de otra computadora (enlace de invitación)';
  details.appendChild(sum);
  var inner = document.createElement('div');
  inner.style.marginTop = '8px';
  var hint = document.createElement('p');
  hint.className = 'lan-connect-card-hint';
  hint.style.marginTop = '0';
  hint.innerHTML =
    'Pega el enlace que te compartieron. Esta R+ dejará de usar el servidor de <strong>esta</strong> Mac y se conectará a la otra.';
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
  btnJoin.className = 'btn-lan-secondary';
  btnJoin.style.flex = '1';
  btnJoin.textContent = 'Unirse con enlace';
  btnJoin.setAttribute('data-lan-action', 'join-invite');
  row.appendChild(btnJoin);
  inner.appendChild(row);
  details.appendChild(inner);
  root.appendChild(details);
}

function appendLanBackToLocalHostSection(root) {
  if (!root || !isLanElectronDesktop() || !isLanRemoteJoinMode()) return;
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

function renderLanPanel() {
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

function lanHostUrl() {
  return lanClient.baseUrl() || '';
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

  await ensureLanElectronHostReady();
  if (lanPanelRenderStale(gen)) return;

  root.innerHTML = '';

  var registered = isClinicalRegistered();
  var userSala = getUserSala();
  var rank = getClinicalRank();

  if (!registered) {
    var unregCard = document.createElement('div');
    unregCard.className = 'lan-connect-card';
    unregCard.innerHTML =
      '<p class="lan-connect-card-hint">Completa el <strong>Registro de guardia</strong> para acceder a la red del hospital.</p>';
    root.appendChild(unregCard);
    return;
  }

  if (!userSala && rank !== 'Admin' && rank !== 'R4') {
    var noSalaCard = document.createElement('div');
    noSalaCard.className = 'lan-connect-card';
    noSalaCard.innerHTML =
      '<p class="lan-connect-card-hint">No tienes una Sala asignada. Contacta a un R4 o Admin.</p>';
    root.appendChild(noSalaCard);
    return;
  }

  var isElevated = rank === 'Admin' || rank === 'R4';

  var statusCard = document.createElement('div');
  statusCard.className = 'lan-connect-card lan-hub-status-card';
  var connected = isLanHostActive();
  statusCard.innerHTML =
    '<div class="lan-hub-status-line">' +
    (connected
      ? '<span class="lan-hub-status-dot lan-hub-status-dot--online"></span> Conectado a la red del hospital'
      : '<span class="lan-hub-status-dot lan-hub-status-dot--offline"></span> Sin red \u2014 buscando\u2026') +
    '</div>';
  if (!connected && isLanElectronDesktop()) {
    var becomeHostBtn = document.createElement('button');
    becomeHostBtn.type = 'button';
    becomeHostBtn.className = 'btn-lan-primary';
    becomeHostBtn.style.marginTop = '8px';
    becomeHostBtn.style.width = '100%';
    becomeHostBtn.textContent = 'Convertirse en host';
    becomeHostBtn.onclick = function () {
      void ensureLanElectronHostReady().then(function (activated) {
        if (!activated) return;
        renderLanPanel();
        runtime.showToast('Esta Mac ahora es el servidor del turno.', 'success');
      });
    };
    statusCard.appendChild(becomeHostBtn);
  }
  root.appendChild(statusCard);

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
  } else {
    visibleSalaDefs = [];
  }

  var roomsCard = document.createElement('div');
  roomsCard.className = 'lan-connect-card lan-rooms-panel';
  roomsCard.innerHTML = '<div class="lan-connect-card-title">Salas de guardia</div>';

  if (visibleSalaDefs.length) {
    var list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '0';
    list.style.margin = '0';
    visibleSalaDefs.forEach(function (d) {
      var li = document.createElement('li');
      li.style.display = 'flex';
      li.style.gap = '8px';
      li.style.alignItems = 'center';
      li.style.marginBottom = '8px';

      var name = document.createElement('span');
      name.style.flex = '1';
      name.style.fontSize = '13px';
      name.textContent = d.label;

      var joinBtn = document.createElement('button');
      joinBtn.type = 'button';
      joinBtn.className = 'btn-lan-secondary';
      joinBtn.style.flex = '0 0 auto';
      var inRoom = activeLiveSyncRoomId === d.id;
      joinBtn.textContent = inRoom ? 'En sala' : 'Unirse';
      joinBtn.disabled = inRoom;
      joinBtn.setAttribute('data-lan-action', 'join-room');
      joinBtn.setAttribute('data-room-id', d.id);
      joinBtn.setAttribute('data-room-label', d.label);

      li.appendChild(name);
      li.appendChild(joinBtn);
      list.appendChild(li);
    });
    roomsCard.appendChild(list);
  }
  root.appendChild(roomsCard);

  if (rank === 'R1') {
    buildR1Section(root);
  } else if (rank === 'R2') {
    buildR2Section(root);
  } else if (isElevated) {
    buildR4Section(root);
  }
}

function buildR1Section(root) {
  var card = document.createElement('div');
  card.className = 'lan-connect-card lan-hub-team-card';
  card.innerHTML = '<div class="lan-connect-card-title">Mi equipo</div>';

  var userId = String(getClinicalUserUserId());
  var teams = clinicalSessionContext.teams || [];
  var myTeam = teams.find(function (t) {
    return (t.members || []).some(function (m) {
      return String(m.user_id) === userId;
    });
  });

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

  var modoCard = document.createElement('div');
  modoCard.className = 'lan-connect-card lan-hub-modo-card';
  var modoLabel = document.createElement('label');
  modoLabel.className = 'lan-hub-modo-label';
  modoLabel.setAttribute('for', 'lan-hub-guardia-toggle');
  var modoCheck = document.createElement('input');
  modoCheck.type = 'checkbox';
  modoCheck.id = 'lan-hub-guardia-toggle';
  modoCheck.className = 'lan-hub-guardia-check';
  modoCheck.checked = !!clinicalSessionContext.guardiaMode;
  modoCheck.onchange = function () {
    clinicalSessionContext.guardiaMode = modoCheck.checked;
    if (typeof renderGuardiaBoard === 'function') {
      var s = {};
      try { s = JSON.parse(localStorage.getItem('rpc-settings') || '{}'); } catch (_e) {}
      renderGuardiaBoard(s);
    }
  };
  modoLabel.appendChild(modoCheck);
  modoLabel.appendChild(document.createTextNode(' Modo Guardia'));
  modoCard.appendChild(modoLabel);
  root.appendChild(modoCard);

  if (isLanElectronDesktop() && isLanHostActive()) {
    var mobileCard = document.createElement('div');
    mobileCard.className = 'lan-connect-card lan-hub-mobile-card';
    mobileCard.innerHTML = '<div class="lan-connect-card-title">Enlace móvil</div>';
    var mobileBtn = document.createElement('button');
    mobileBtn.type = 'button';
    mobileBtn.className = 'btn-lan-primary';
    mobileBtn.style.width = '100%';
    mobileBtn.textContent = 'Copiar enlace para iPad';
    mobileBtn.onclick = function () {
      void generateMobilePairingLink().then(function (url) {
        if (url) {
          copyToClipboardSafe(url);
          runtime.showToast('Enlace móvil copiado. Pégalo en Safari en el iPad.', 'success');
        }
      });
    };
    mobileCard.appendChild(mobileBtn);
    root.appendChild(mobileCard);
  }
}

function buildR2Section(root) {
  buildR1Section(root);

  var userId = String(getClinicalUserUserId());
  var teams = clinicalSessionContext.teams || [];
  var myTeam = teams.find(function (t) {
    return (t.members || []).some(function (m) {
      return String(m.user_id) === userId;
    });
  });

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

function buildR4Section(root) {
  // Task 8 fills this in
}

async function resolveLanHostUrlForShare() {
  var el = document.getElementById('lan-input-host-url');
  var fromInput = el && String(el.value || '').trim();
  if (fromInput) return fromInput.replace(/\/+$/, '');
  return resolveLanHostUrlAuto();
}

async function saveLanHostTeamCodeFromUi() {
  if (!window.electronAPI || typeof window.electronAPI.writeLanHostTeamCode !== 'function') {
    runtime.showToast('Solo disponible en la app Electron', 'error');
    return;
  }
  var input = document.getElementById('settings-lan-host-team-code-input');
  var plain = input && input.value;
  var res;
  try {
    res = await window.electronAPI.writeLanHostTeamCode(plain);
  } catch (e) {
    runtime.showToast(e && e.message ? e.message : 'Error al guardar', 'error');
    return;
  }
  if (res && res.ok) {
    var plainTrim = String(plain || '').trim();
    if (!plainTrim) {
      runtime.showToast('Escribe un token de al menos 32 caracteres.', 'error');
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
    runtime.showToast('Guardado. Reinicia R+ para que el proceso del servidor relea el archivo.', 'success');
  } else {
    runtime.showToast(res && res.error ? res.error : 'Error al guardar', 'error');
  }
}

async function resetLanSquadHostStateFromUi() {
  if (!window.electronAPI || typeof window.electronAPI.resetLanSquadHostState !== 'function') {
    runtime.showToast('Solo disponible en la app de escritorio.', 'error');
    return;
  }
  if (
    !confirm(
      'Se borrará el archivo lan-squad-host-state.json en esta computadora (salas y datos de pacientes del host LAN guardados ahí). ¿Seguir?'
    )
  ) {
    return;
  }
  var res;
  try {
    res = await window.electronAPI.resetLanSquadHostState();
  } catch (e) {
    runtime.showToast(e && e.message ? e.message : 'Error al restablecer', 'error');
    return;
  }
  if (res && res.ok) {
    var synced = await syncLanSavedTeamCodeWithEffectiveHostCode();
    runtime.showToast(
      synced
        ? 'Estado LAN del host borrado. El «Código del equipo» guardado en esta R+ quedó alineado con archivo / variable de entorno / valor por defecto del servidor.'
        : 'Estado LAN del host borrado. Si sigues con error 401, escribe en «Código del equipo» el mismo texto que el servidor (o reinicia R+ tras cambiar el archivo).',
      'success'
    );
    if (typeof renderLanPanel === 'function') renderLanPanel();
  } else {
    runtime.showToast(res && res.error ? res.error : 'No se pudo borrar el archivo.', 'error');
  }
}

async function ensureLanPairingForShare() {
  var hostUrl = await resolveLanHostUrlForShare();
  if (!hostUrl) {
    var errUrl = new Error('no_host_url');
    errUrl.code = 'no_host_url';
    throw errUrl;
  }
  if (!_lastLanPairing || !_lastLanPairing.ticketId) {
    await mintLanPairingTicket();
  }
  if (!_lastLanPairing || !_lastLanPairing.ticketId) {
    var errTicket = new Error('no_ticket');
    errTicket.code = 'no_ticket';
    throw errTicket;
  }
  return { hostUrl: hostUrl, pairing: _lastLanPairing };
}

async function copyMobileLanLinkFromUi(opts) {
  opts = opts || {};
  var silent = !!opts.silent;
  var share;
  try {
    share = await ensureLanPairingForShare();
  } catch (e) {
    if (!silent) {
      if (e && e.code === 'no_host_url') {
        runtime.showToast(
          'Falta la dirección del servidor (o no pudimos detectar la IP en esta computadora).',
          'error'
        );
      } else {
        runtime.showToast('Genera primero un enlace / PIN o revisa el token del anfitrión.', 'error');
      }
    }
    return false;
  }
  var urls = buildLanJoinUrls(share.hostUrl, share.pairing.ticketId);
  var link = share.pairing.joinUrl || urls.mobileUrl;
  var copied = await copyToClipboardSafe(link);
  if (copied) {
    var root = document.getElementById('lan-connection-panel-root');
    updateLanPairingDisplay(root);
    if (!silent) {
      runtime.showToast(
        'Enlace móvil copiado. Ábrelo en Safari en la misma Wi‑Fi; luego elige la sala LiveSync.',
        'success'
      );
    }
    return true;
  }
  if (!silent) runtime.showToast('No se pudo copiar al portapapeles.', 'error');
  return false;
}

async function copyLanInviteLinkFromUi(opts) {
  opts = opts || {};
  var silent = !!opts.silent;
  var share;
  try {
    share = await ensureLanPairingForShare();
  } catch (e) {
    if (!silent) {
      if (e && e.code === 'no_host_url') {
        runtime.showToast(
          'Falta la dirección del servidor (o no pudimos detectar la IP en esta computadora).',
          'error'
        );
      } else {
        runtime.showToast('Genera primero un enlace / PIN o revisa el token del anfitrión.', 'error');
      }
    }
    return false;
  }
  var urls = buildLanJoinUrls(share.hostUrl, share.pairing.ticketId);
  var link = share.pairing.joinUrl || urls.joinUrl;
  var copied = await copyToClipboardSafe(link);
  if (copied) {
    var root = document.getElementById('lan-connection-panel-root');
    updateLanPairingDisplay(root);
    if (!silent) {
      var pinHint = share.pairing.pin ? ' PIN: ' + share.pairing.pin + '.' : '';
      runtime.showToast('Enlace de invitación copiado.' + pinHint, 'success');
    }
    return true;
  }
  if (!silent) runtime.showToast('No se pudo copiar al portapapeles.', 'error');
  return false;
}

function joinLanFromInviteUi() {
  var input = document.getElementById('lan-input-invite-link');
  var raw = String(input && input.value ? input.value : '').trim();
  if (!raw) {
    runtime.showToast('Pega el enlace de invitación que te envió el anfitrión.', 'error');
    return;
  }
  var parsed = parseLanInviteInput(raw);
  if (parsed.legacyInvite) {
    runtime.showToast(
      'Este enlace ya no es válido. Pide al anfitrión un nuevo enlace o PIN.',
      'error'
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
      runtime.showToast(
        'Pega el enlace completo (http://…/join/req_…) con la dirección del anfitrión.',
        'error'
      );
      return;
    }
    void exchangeLanJoinFromInvite(hostUrl, ticketId, parsed.roomId);
    return;
  }
  runtime.showToast(
    'No reconocimos un enlace válido. Pide al anfitrión un enlace /join/req_… o el PIN actual.',
    'error'
  );
}

async function saveLanSettingsFromUi(opts) {
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
    runtime.showToast(
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
  } catch (_e) {}
  var copiedOk = false;
  if (copyInviteAfter && pingStatus !== 401) {
    copiedOk = await copyLanInviteLinkFromUi({ silent: true });
  }
  if (pingOk) {
    void maybeShowLanMigrationNotice();
    if (copyInviteAfter) {
      runtime.showToast(
        copiedOk
          ? 'Anfitrión listo. La invitación ya está en el portapapeles; compártela por WhatsApp o correo.'
          : 'Anfitrión listo, pero no se pudo copiar solo. Pulsa «Generar enlace / PIN» o «Copiar enlace de invitación».',
        copiedOk ? 'success' : 'error'
      );
    } else {
      runtime.showToast('Listo: ya iniciaste sesión en la sala del equipo.', 'success');
    }
  } else if (pingStatus === 401) {
    runtime.showToast('El código no coincide con el del servidor. Pide el código correcto a quien tiene la computadora anfitriona.', 'error');
  } else {
    if (copyInviteAfter && copiedOk) {
      runtime.showToast(
        'Invitación copiada al portapapeles. Aun así no hubo respuesta del servidor: revisa el Wi‑Fi o que R+ siga abierto en el anfitrión.',
        'error'
      );
    } else {
      runtime.showToast(
        'Guardamos los datos, pero no hubo respuesta del servidor. Revisa la dirección y que ambas computadoras estén en el mismo Wi‑Fi.',
        'error'
      );
    }
  }
  renderLanPanel();
}

function joinLanRoom(roomId, displayName) {
  var id = String(roomId || '').trim();
  if (!id) {
    runtime.showToast('No se pudo identificar la sala. Vuelve a abrir ⇄ e inténtalo.', 'error');
    return;
  }
  if (!isLanSessionConfiguredForRest()) {
    runtime.showToast(
      'Primero conecta al servidor del equipo (Activar sala en vivo o pega el enlace de invitación).',
      'error'
    );
    return;
  }
  if (!lanClient.baseUrl()) {
    try {
      initLanClientFromStorage();
    } catch (_boot) {}
  }
  if (!lanClient.baseUrl()) {
    runtime.showToast('Falta la dirección del servidor LAN. Configúrala en ⇄ antes de unirte.', 'error');
    return;
  }
  if (
    activeLiveSyncRoomId === id &&
    String(lanClient.liveRoomId || '') === id &&
    lanClient.liveConnected
  ) {
    syncLiveSyncAfterRoomJoin(id);
    syncLiveSyncStatusChrome();
    patchLanPanelJoinButtons();
    runtime.showToast('Ya estás en esta sala', 'success');
    return;
  }
  if (activeLiveSyncRoomId && activeLiveSyncRoomId !== id) {
    leaveLiveSyncRoom({ silentLeave: false });
  }
  activeLiveSyncRoomId = id;
  activeLiveSyncRoomLabel = displayName != null ? String(displayName) : id;
  try {
    if (!lanClient.connected) {
      try {
        lanClient.connectSyncChannel();
      } catch (_sync) {}
    }
    lanClient.connectLiveChannel(id);
    setRoomMembership({ roomId: id, label: activeLiveSyncRoomLabel });
    rememberLanRoomJoined(id, activeLiveSyncRoomLabel);
    scheduleLiveSyncOutboxFlush();
    startLiveSyncReconnectLoop();
  } catch (_e) {
    activeLiveSyncRoomId = '';
    activeLiveSyncRoomLabel = '';
    runtime.showToast('No se pudo activar relay de sala', 'error');
    return;
  }
  runtime.showToast('Sala: sincronizando expediente, agenda y pendientes', 'success');
  syncLiveSyncStatusChrome();
  patchLanPanelJoinButtons();
  syncLiveSyncAfterRoomJoin(id);
}

async function createLanRoomFromUi() {
  if (!isLanSessionConfiguredForRest()) {
    runtime.showToast('Falta la dirección LAN. Configura la conexión en ⇄ y vuelve a intentar.', 'error');
    return;
  }
  await ensureLanClientTeamCodeAligned();
  var input = document.getElementById('lan-input-room-name');
  var displayName = String(input && input.value ? input.value : '').trim();
  if (!displayName) {
    runtime.showToast('Escribe un nombre de sala', 'error');
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
    runtime.showToast('No se pudo crear la sala', 'error');
    return;
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      runtime.showToast(
        'El código del equipo no coincide con el servidor. Igualálo al conectar y en lan-team-code.txt; reinicia R+ en el anfitrión si cambiaste el archivo.',
        'error'
      );
    } else {
      runtime.showToast('No se pudo crear la sala', 'error');
    }
    return;
  }
  if (input) input.value = '';
  runtime.showToast('Sala creada', 'success');
  renderLanPanel();
}

async function deleteLanRoom(roomId) {
  if (!isLanSessionConfiguredForRest()) {
    runtime.showToast('Falta configuración LAN para eliminar salas.', 'error');
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
    runtime.showToast('No se pudo eliminar la sala', 'error');
    return;
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      runtime.showToast('El código del equipo no coincide con el servidor; no se pudo eliminar la sala.', 'error');
    } else {
      runtime.showToast('No se pudo eliminar la sala', 'error');
    }
    return;
  }
  runtime.showToast('Sala eliminada', 'success');
  renderLanPanel();
}

function syncLanHostFirstTimeHintUi() {
  var hint = document.getElementById('lan-host-first-time-hint');
  if (hint) hint.style.display = 'none';
}

function dismissLanHostFirstTimeHint() {
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

async function syncLanHostTeamCodeSettingsInput() {
  var input = document.getElementById('settings-lan-host-team-code-input');
  if (!input) return;
  var code = await resolveHostBearerToken();
  if (!String(input.value || '').trim() && code) input.value = code;
}
function closeConnectionDropdown() {
  var dd = document.getElementById('connection-dropdown');
  var bg = document.getElementById('connection-dropdown-backdrop');
  if (dd) dd.classList.remove('open');
  if (bg) bg.classList.remove('open');
  var syncBtn = document.getElementById('btn-header-team-sync');
  if (syncBtn) syncBtn.setAttribute('aria-expanded', 'false');
}

function openConnectionDropdown() {
  runtime.closeSettingsDropdown();
  var dd = document.getElementById('connection-dropdown');
  var bg = document.getElementById('connection-dropdown-backdrop');
  if (!dd) return;
  dd.classList.add('open');
  if (bg) bg.classList.add('open');
  var syncBtn = document.getElementById('btn-header-team-sync');
  if (syncBtn) syncBtn.setAttribute('aria-expanded', 'true');
  wireLanPanelDelegation();
  if (typeof renderLanPanel === 'function') renderLanPanel();
}

function toggleConnectionDropdown(ev) {
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
function openTeamSyncFromHeader() {
  openConnectionDropdown();
}
function configureLanFromMobileJoin(hostUrl, teamCode, roomId) {
  var cfg = { hostUrl: hostUrl.replace(/\/+$/, ''), teamCode: String(teamCode || '').trim() };
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
        runtime.showToast(
          'No se pudo conectar al servidor. Revisa Wi‑Fi y que R+ esté abierto en el anfitrión.',
          'error'
        );
        renderLanPanel();
        setTimeout(function () {
          if (typeof openConnectionDropdown === 'function') openConnectionDropdown();
        }, 400);
        return;
      }
      void maybeShowLanMigrationNotice();
      var rid = String(roomId || '').trim();
      if (rid) {
        joinLanRoom(rid, '');
        runtime.showToast('Sincronizando con la sala LiveSync del equipo', 'success');
        return;
      }
      runtime.showToast('Conectado al servidor. Elige la misma sala LiveSync en ⇄', 'success');
      renderLanPanel();
      setTimeout(function () {
        if (typeof openConnectionDropdown === 'function') openConnectionDropdown();
      }, 500);
    })
    .catch(function () {
      runtime.showToast('Error de red al conectar con el anfitrión', 'error');
      renderLanPanel();
    });
}

export function registerLanSaveHooks(deps) {
  var post =
    deps && typeof deps.scheduleLabHistoryPostSaveMaintenance === 'function'
      ? deps.scheduleLabHistoryPostSaveMaintenance
      : function () {};
  setSaveStateHooks({
    before() {
      var aid = runtime.getActiveId();
      if (activeLiveSyncRoomId && aid) touchPatientLanUpdatedAt(aid);
    },
    after() {
      post();
      scheduleLiveSyncPush();
    },
  });
}

export {
  emitLiveSyncAgendaUpsert,
  emitLiveSyncAgendaDelete,
  emitLiveSyncTodoUpsert,
  emitLiveSyncTodoDelete,
  emitLiveSyncPatientDelete,
  scheduleLiveSyncPush,
  renderLanPanel,
  configureLanFromMobileJoin,
  syncLanHostTeamCodeSettingsInput,
  syncLanHostFirstTimeHintUi,
  closeConnectionDropdown,
  openConnectionDropdown,
  isLanSessionConfiguredForRest,
};

export const windowHandlers = {
  toggleConnectionDropdown,
  closeConnectionDropdown,
  openConnectionDropdown,
  openTeamSyncFromHeader,
  saveLanSettingsFromUi,
  saveLanHostTeamCodeFromUi,
  resetLanSquadHostStateFromUi,
  dismissLanHostFirstTimeHint,
  dismissLanDisconnectBanner,
  setLanHideDisconnectBannerFromUi,
  joinLanRoom,
  joinLanFromInviteUi,
  createLanRoomFromUi,
  deleteLanRoom,
  copyLanInviteLinkFromUi,
};
