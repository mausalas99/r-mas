// Built from app.js refactor — LAN / LiveSync
import { storage } from "../storage.js";
import { LanClient } from "../lan-client.mjs";
import {
  mergeLiveSyncBundles,
  buildRoomSnapshotFromStorage,
  nextRoomSnapshotGeneration,
  isLiveSyncEnvelope,
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
import { filterTodosRespectingDismissals } from "../manejo-todo-dismiss.mjs";
import {
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  recetaHuByPatient,
  listadoProblemas,
  medNotaSelectionByPatient,
  setPatients,
  setSaveStateHooks,
  saveState,
} from "../app-state.mjs";

export const DEFAULT_LAN_TEAM_CODE = "1234";
/** Tokens opacos de versiones anteriores; el servidor ya usa 1234 por defecto. */
var LEGACY_RANDOM_LAN_TEAM_CODE_RE = /^[a-f0-9]{32}$/i;

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
var _lanPanelRenderGen = 0;
var _lanPanelRenderChain = Promise.resolve();
var LAN_HOST_CODE_HINT_SEEN_KEY = 'rpc-lan-host-code-hint-seen';
var LAN_KNOWN_ROOMS_LS = 'rpc-lan-known-rooms';
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

function normalizeStoredLanTeamCode(code) {
  var t = String(code || '').trim();
  if (!t || LEGACY_RANDOM_LAN_TEAM_CODE_RE.test(t)) return DEFAULT_LAN_TEAM_CODE;
  return t;
}

function persistLanClientConfig(hostUrl, teamCode) {
  var url = String(hostUrl || '').trim().replace(/\/+$/, '');
  var code = normalizeStoredLanTeamCode(teamCode);
  if (!url || !code) return false;
  var prev = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var prevUrl = String(prev.hostUrl || '').trim().replace(/\/+$/, '');
  var prevCode = normalizeStoredLanTeamCode(prev.teamCode);
  var changed = prevUrl !== url || prevCode !== code;
  storage.saveLanConfig({ hostUrl: url, teamCode: code });
  lanClient.configure({ hostUrl: url, teamCode: code });
  if (changed) {
    try {
      lanClient.disconnect();
      lanClient.connectSyncChannel();
    } catch (_e) {}
  }
  return changed;
}

/** Alinea rpc-lan-config / LanClient antes de REST (p. ej. migrar token legacy → 1234). */
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
  } else {
    var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
    persistLanClientConfig(cfg.hostUrl, DEFAULT_LAN_TEAM_CODE);
  }
  return lanClient.fetch(path, opts);
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
  persistLanClientConfig(autoUrl, cfg.teamCode || DEFAULT_LAN_TEAM_CODE);
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
  if (uiRole === 'host' && window.electronAPI && typeof window.electronAPI.getLanEffectiveTeamCode === 'function') {
    try {
      var info = await window.electronAPI.getLanEffectiveTeamCode();
      if (info && info.ok && info.code) return String(info.code);
    } catch (_e) {}
  }
  var teamInput = document.getElementById('lan-input-team-code');
  var fromInput = teamInput && teamInput.value != null ? String(teamInput.value).trim() : '';
  if (fromInput) return fromInput;
  if (cfg.teamCode) return normalizeStoredLanTeamCode(cfg.teamCode);
  return DEFAULT_LAN_TEAM_CODE;
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
    join.onclick = function () {
      if (inThisRoom) return;
      joinLanRoom(rec.id, rec.label);
    };
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-lan-danger';
    del.style.flex = '0 0 auto';
    del.textContent = 'Quitar';
    del.title = 'Quitar de la lista';
    del.onclick = function () {
      forgetLanRoomSession(rec.id);
      renderLanPanel();
    };
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
initLanClientFromStorage();

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
  if (typeof renderLanPanel === 'function') renderLanPanel();
});
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

function mergeLiveSyncFullBundles(sources) {
  var base = mergeLiveSyncBundles(sources);
  var entries = mergeLanPatientEntrySources(sources);
  entries = filterEntriesByPatientDeletes(entries, base.patientDeletes || []);
  base.entries = attachTodosMapToPatientEntries(entries, base.todos);
  base.manejo = mergeManejoFromSources(sources);
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
      existing.registro = entry.patient.registro || existing.registro;
      if (entry.patient.fromLab) existing.fromLab = true;
      notes[existing.id] = entry.note || {};
      indicaciones[existing.id] = entry.indicaciones || {};
      labHistory[existing.id] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
      if (entry.medReceta) medRecetaByPatient[existing.id] = entry.medReceta;
      else delete medRecetaByPatient[existing.id];
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
        patients.unshift(newPat);
        notes[remoteId] = entry.note || {};
        indicaciones[remoteId] = entry.indicaciones || {};
        labHistory[remoteId] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
        if (entry.medReceta) medRecetaByPatient[remoteId] = entry.medReceta;
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
  var entries = merged.entries || [];
  if (entries.length) {
    applyLanPatientEntries(entries);
  }
  var idMap = buildLiveSyncPatientIdMap(entries, patients, merged.todos || {});
  var patientRemoved = applyLiveSyncPatientDeletes(merged.patientDeletes || [], idMap);
  storage.saveScheduledProcedures(remapAgendaPatientIds(merged.agenda || [], idMap));
  var todosMap = remapTodosPatientIds(merged.todos || {}, idMap);
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
  return false;
}
function hostBundleBodyFromEnvelope(envelope) {
  return {
    updatedAt: envelope.savedAt || new Date().toISOString(),
    uploadedByClientId: envelope.clientId || getLanClientId(),
    agenda: envelope.agenda || [],
    todos: envelope.todos || {},
    entries: envelope.entries || [],
    manejo: envelope.manejo || null,
  };
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
        bundle: hostBundleBodyFromEnvelope(envelope),
      }),
    })
    .then(function (resp) {
      return !!(resp && resp.ok);
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
  };
}
function scheduleLiveSyncPush() {
  if (!activeLiveSyncRoomId) return;
  if (_liveSyncPushTimer) clearTimeout(_liveSyncPushTimer);
  _liveSyncPushTimer = setTimeout(function () {
    _liveSyncPushTimer = null;
    var roomId = activeLiveSyncRoomId;
    if (!roomId) return;
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
  if (!activeLiveSyncRoomId || !lanClient.liveConnected || !eventObj) return;
  lanClient.sendLive({
    type: 'livesync:patch',
    roomId: activeLiveSyncRoomId,
    clientId: getLanClientId(),
    entity: 'agenda',
    op: 'upsert',
    id: eventObj.id,
    body: eventObj,
    updatedAt: eventObj.updatedAt,
  });
}
function emitLiveSyncAgendaDelete(id, updatedAt) {
  if (!activeLiveSyncRoomId || !lanClient.liveConnected) return;
  lanClient.sendLive({
    type: 'livesync:patch',
    roomId: activeLiveSyncRoomId,
    clientId: getLanClientId(),
    entity: 'agenda',
    op: 'delete',
    id: id,
    updatedAt: updatedAt,
  });
}
function emitLiveSyncTodoUpsert(patientId, todo) {
  if (!activeLiveSyncRoomId || !lanClient.liveConnected || !todo) return;
  if (String(patientId || '').indexOf('demo-') === 0) return;
  lanClient.sendLive({
    type: 'livesync:patch',
    roomId: activeLiveSyncRoomId,
    clientId: getLanClientId(),
    entity: 'todo',
    op: 'upsert',
    id: todo.id,
    patientId: patientId,
    body: todo,
    updatedAt: todo.updatedAt,
  });
}
function emitLiveSyncTodoDelete(patientId, id, updatedAt) {
  if (!activeLiveSyncRoomId || !lanClient.liveConnected) return;
  lanClient.sendLive({
    type: 'livesync:patch',
    roomId: activeLiveSyncRoomId,
    clientId: getLanClientId(),
    entity: 'todo',
    op: 'delete',
    id: id,
    patientId: patientId,
    updatedAt: updatedAt,
  });
}
function emitLiveSyncPatientDelete(patient) {
  if (!activeLiveSyncRoomId || !lanClient.liveConnected || !patient) return;
  if (String(patient.id || '').indexOf('demo-') === 0) return;
  lanClient.sendLive({
    type: 'livesync:patch',
    roomId: activeLiveSyncRoomId,
    clientId: getLanClientId(),
    entity: 'patient',
    op: 'delete',
    id: patient.id,
    registro: patient.registro || '',
    updatedAt: new Date().toISOString(),
  });
}
function onLiveSyncWireMessage(data) {
  if (!data || !isLiveSyncEnvelope(data)) return;
  if (data.roomId && activeLiveSyncRoomId && data.roomId !== activeLiveSyncRoomId) return;
  var myId = getLanClientId();
  if (data.type === 'livesync:hello') {
    if (data.clientId !== myId && activeLiveSyncRoomId) {
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
  if (data.type === 'livesync:patch') {
    var mergedPatch = mergeLiveSyncBundles([
      { agenda: storage.getScheduledProcedures(), todos: collectTodosMapForLiveSync() },
      data,
    ]);
    applyLiveSyncMerged(mergedPatch);
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
      if (j && j.bundle) sources.push(j.bundle);
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
      var prev = storage.getLanRoomSnapshot(rid);
      lanClient.sendLive({
        type: 'livesync:hello',
        roomId: rid,
        clientId: getLanClientId(),
        snapshotAt: prev && prev.savedAt ? prev.savedAt : null,
        generation: prev && prev.generation != null ? prev.generation : 0,
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
  if (typeof renderLanPanel === 'function') renderLanPanel();
}
lanClient.addEventListener('lan-live', function (ev) {
  onLiveSyncWireMessage(ev.detail);
});
lanClient.addEventListener('lan-live-status', function (ev) {
  if (!ev.detail) return;
  if (ev.detail.connected && activeLiveSyncRoomId) {
    syncLiveSyncAfterRoomJoin(activeLiveSyncRoomId);
    flushLiveSyncOutbox(activeLiveSyncRoomId);
  } else if (!ev.detail.connected && activeLiveSyncRoomId) {
    saveLocalRoomSnapshot(activeLiveSyncRoomId);
    startLiveSyncReconnectLoop();
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
  inputInvite.placeholder = 'http://…/join?code=… o …/mobile/?code=…';
  inner.appendChild(inputInvite);
  var row = document.createElement('div');
  row.className = 'lan-connect-actions-row';
  row.style.marginTop = '8px';
  var btnJoin = document.createElement('button');
  btnJoin.type = 'button';
  btnJoin.className = 'btn-lan-secondary';
  btnJoin.style.flex = '1';
  btnJoin.textContent = 'Unirse con enlace';
  btnJoin.onclick = function () {
    if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('client');
    joinLanFromInviteUi();
  };
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

async function renderLanPanelOnce() {
  var gen = ++_lanPanelRenderGen;
  var root = document.getElementById('lan-connection-panel-root');
  if (!root) return;

  await ensureLanElectronHostReady();

  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var desktopHost = isLanElectronDesktop() && !isLanRemoteJoinMode();

  if (!lanClient.baseUrl()) {
    root.innerHTML = '';
    appendLanKnownSessionsSection(root);
    appendLanJoinOtherMacSection(root);
    var card = document.createElement('div');
    card.className = 'lan-connect-card';

    var title = document.createElement('div');
    title.className = 'lan-connect-card-title';
    title.textContent = desktopHost ? 'Activar sala en vivo' : 'Unirse al equipo';
    card.appendChild(title);

    var hint = document.createElement('p');
    hint.className = 'lan-connect-card-hint';
    if (desktopHost) {
      hint.innerHTML =
        'Esta Mac comparte el servidor del turno. Las otras R+ deben estar en la <strong>misma Wi‑Fi</strong>. Después crea una sala o únete a una existente; comparte el enlace de invitación con el equipo.';
    } else {
      hint.innerHTML =
        'Pega el <strong>enlace de invitación</strong> que te compartieron (WhatsApp, correo). También puedes abrirlo en Safari en iPad.';
    }
    card.appendChild(hint);

    if (desktopHost) {
      var fieldHost = document.createElement('div');
      fieldHost.className = 'lan-connect-field';
      var labelHost = document.createElement('label');
      labelHost.className = 'profile-field-label';
      labelHost.textContent = 'Dirección en la red (opcional)';
      labelHost.setAttribute('for', 'lan-input-host-url');
      var inputHost = document.createElement('input');
      inputHost.className = 'profile-input';
      inputHost.id = 'lan-input-host-url';
      inputHost.type = 'text';
      inputHost.autocomplete = 'off';
      inputHost.placeholder = 'Ejemplo: http://192.168.0.15:3738';
      inputHost.value = String(cfg.hostUrl || '');
      fieldHost.appendChild(labelHost);
      fieldHost.appendChild(inputHost);
      card.appendChild(fieldHost);
    } else {
      var fieldInvite = document.createElement('div');
      fieldInvite.className = 'lan-connect-field';
      var labelInvite = document.createElement('label');
      labelInvite.className = 'profile-field-label';
      labelInvite.textContent = 'Enlace de invitación';
      labelInvite.setAttribute('for', 'lan-input-invite-link');
      var inputInvite = document.createElement('textarea');
      inputInvite.className = 'profile-input';
      inputInvite.id = 'lan-input-invite-link';
      inputInvite.rows = 3;
      inputInvite.autocomplete = 'off';
      inputInvite.placeholder = 'Pega aquí el enlace (http://…/join?… o …/mobile/?…)';
      fieldInvite.appendChild(labelInvite);
      fieldInvite.appendChild(inputInvite);
      card.appendChild(fieldInvite);
    }

    var actions = document.createElement('div');
    actions.className = 'lan-connect-actions';
    var row = document.createElement('div');
    row.className = 'lan-connect-actions-row';
    if (desktopHost) {
      var btnHostStart = document.createElement('button');
      btnHostStart.type = 'button';
      btnHostStart.className = 'btn-lan-primary';
      btnHostStart.style.flex = '1';
      btnHostStart.textContent = 'Activar y copiar invitación';
      btnHostStart.onclick = function () {
        saveLanSettingsFromUi({ copyInviteAfter: true });
      };
      row.appendChild(btnHostStart);
    } else {
      var btnJoinLink = document.createElement('button');
      btnJoinLink.type = 'button';
      btnJoinLink.className = 'btn-lan-primary';
      btnJoinLink.style.flex = '1';
      btnJoinLink.textContent = 'Unirse con enlace';
      btnJoinLink.onclick = function () {
        if (isLanElectronDesktop() && typeof storage.saveLanUiRole === 'function') {
          storage.saveLanUiRole('client');
        }
        joinLanFromInviteUi();
      };
      row.appendChild(btnJoinLink);
    }
    actions.appendChild(row);
    card.appendChild(actions);

    if (desktopHost) {
      var postHint = document.createElement('p');
      postHint.className = 'lan-connect-card-hint';
      postHint.style.marginTop = '2px';
      postHint.textContent =
        'Si el campo de dirección está vacío, usamos la IP que detectamos en esta Mac.';
      card.appendChild(postHint);
    }

    root.appendChild(card);
    appendLanDisconnectBannerPref(root);
    if (desktopHost && !String(cfg.hostUrl || '').trim()) {
      resolveLanHostUrlForShare().then(function (u) {
        if (lanPanelRenderStale(gen)) return;
        var inp = document.getElementById('lan-input-host-url');
        if (inp && u && !String(inp.value || '').trim()) inp.value = u;
      });
    }
    return;
  }

  await ensureLanClientTeamCodeAligned();
  var roomsFetch = { ok: false, rooms: [], httpStatus: 0, errorDetail: '', networkError: false };
  try {
    var respRooms = await lanFetchAuthed('/api/lan/v1/rooms');
    if (lanPanelRenderStale(gen)) return;
    if (!respRooms.ok) {
      roomsFetch.httpStatus = respRooms.status;
      try {
        roomsFetch.errorDetail = await respRooms.text();
      } catch (_eTxt) {}
    } else {
      var payloadRooms;
      try {
        payloadRooms = await respRooms.json();
      } catch (_eJson) {
        payloadRooms = {};
      }
      roomsFetch.ok = true;
      roomsFetch.rooms = Array.isArray(payloadRooms && payloadRooms.rooms) ? payloadRooms.rooms : [];
    }
  } catch (_eNet) {
    if (lanPanelRenderStale(gen)) return;
    roomsFetch.networkError = true;
  }
  if (lanPanelRenderStale(gen)) return;

  root.innerHTML = '';
  appendLanBackToLocalHostSection(root);
  appendLanKnownSessionsSection(root);
  appendLanJoinOtherMacSection(root);

  var statusCard = document.createElement('div');
  statusCard.className = 'lan-connect-card';
  var stTitle = document.createElement('div');
  stTitle.className = 'lan-connect-card-title';
  stTitle.textContent = isLanRemoteJoinMode()
    ? 'Conectado a la sala de otra Mac'
    : 'Red del equipo lista';
  statusCard.appendChild(stTitle);
  var topRow = document.createElement('p');
  topRow.className = 'lan-connect-card-hint';
  topRow.style.marginBottom = '10px';
  topRow.innerHTML = '<strong>Dirección:</strong> ' + esc(lanClient.baseUrl());
  statusCard.appendChild(topRow);
  var liveStatus = document.createElement('p');
  liveStatus.id = 'lan-livesync-status';
  liveStatus.className = 'lan-connect-card-hint';
  liveStatus.style.marginTop = '6px';
  statusCard.appendChild(liveStatus);
  syncLiveSyncStatusChrome();
  if (activeLiveSyncRoomId) {
    var leaveLiveRow = document.createElement('div');
    leaveLiveRow.className = 'lan-connect-actions-row';
    leaveLiveRow.style.marginTop = '8px';
    var btnLeaveLive = document.createElement('button');
    btnLeaveLive.type = 'button';
    btnLeaveLive.className = 'btn-lan-secondary';
    btnLeaveLive.style.flex = '1';
    btnLeaveLive.textContent = 'Salir de sala (LiveSync)';
    btnLeaveLive.onclick = function () {
      leaveLiveSyncRoom({});
    };
    leaveLiveRow.appendChild(btnLeaveLive);
    statusCard.appendChild(leaveLiveRow);
  }
  var rowInvite = document.createElement('div');
  rowInvite.className = 'lan-connect-actions-row';
  var btnCopyStored = document.createElement('button');
  btnCopyStored.type = 'button';
  btnCopyStored.className = 'btn-lan-secondary';
  btnCopyStored.style.flex = '1';
  btnCopyStored.textContent = 'Copiar invitación para enviar';
  btnCopyStored.onclick = function () {
    copyLanInviteLinkFromUi();
  };
  var btnCopyMobile = document.createElement('button');
  btnCopyMobile.type = 'button';
  btnCopyMobile.className = 'btn-lan-secondary';
  btnCopyMobile.style.flex = '1';
  btnCopyMobile.textContent = 'Copiar enlace móvil';
  btnCopyMobile.title = 'Solo URL para iPad o teléfono (Safari, misma Wi‑Fi)';
  btnCopyMobile.onclick = function () {
    copyMobileLanLinkFromUi();
  };
  rowInvite.appendChild(btnCopyStored);
  rowInvite.appendChild(btnCopyMobile);
  statusCard.appendChild(rowInvite);
  root.appendChild(statusCard);

  var roomsCard = document.createElement('div');
  roomsCard.className = 'lan-connect-card lan-rooms-panel';
  var roomsTitle = document.createElement('div');
  roomsTitle.className = 'lan-connect-card-title';
  roomsTitle.textContent = 'Salas en vivo';
  roomsCard.appendChild(roomsTitle);
  var roomsHint = document.createElement('p');
  roomsHint.className = 'lan-connect-card-hint';
  roomsHint.textContent =
    'Cada sala es un canal para que varias R+ compartan señal en tiempo real. Si no ves salas, pide a un compañero que cree una o créala tú.';
  roomsCard.appendChild(roomsHint);

  var createRow = document.createElement('div');
  createRow.style.display = 'flex';
  createRow.style.flexWrap = 'wrap';
  createRow.style.gap = '8px';
  createRow.style.alignItems = 'center';
  createRow.style.marginBottom = '4px';

  var newRoomInput = document.createElement('input');
  newRoomInput.id = 'lan-input-room-name';
  newRoomInput.className = 'profile-input';
  newRoomInput.type = 'text';
  newRoomInput.placeholder = 'Nombre de la nueva sala';
  newRoomInput.style.flex = '1';
  newRoomInput.style.minWidth = '160px';

  var createBtn = document.createElement('button');
  createBtn.type = 'button';
  createBtn.className = 'btn-lan-primary';
  createBtn.textContent = 'Crear sala';
  createBtn.disabled = !isLanSessionConfiguredForRest();
  createBtn.onclick = createLanRoomFromUi;

  createRow.appendChild(newRoomInput);
  createRow.appendChild(createBtn);
  roomsCard.appendChild(createRow);

  if (roomsFetch.networkError) {
    runtime.showToast('No se pudo consultar salas LAN', 'error');
    var errNet = document.createElement('p');
    errNet.className = 'lan-connect-card-hint';
    errNet.textContent = 'No se pudo consultar la lista de salas. Revisa el Wi‑Fi o la dirección del servidor.';
    roomsCard.appendChild(errNet);
  } else if (!roomsFetch.ok) {
    runtime.showToast('Error al cargar salas LAN', 'error');
    var errHttp = document.createElement('p');
    errHttp.className = 'lan-connect-card-hint';
    if (roomsFetch.httpStatus === 401) {
      errHttp.innerHTML =
        'El <strong>código del equipo</strong> que guardaste en esta R+ no coincide con el que usa el proceso servidor (archivo <code>lan-team-code.txt</code>, variable <code>R_PLUS_LAN_TEAM_CODE</code> o el valor por defecto <code>' +
        esc(DEFAULT_LAN_TEAM_CODE) +
        '</code>). Deben ser <strong>exactamente el mismo texto</strong> en ambos sitios. Tras cambiar el archivo, reinicia R+.';
    } else {
      var rawBody = String(roomsFetch.errorDetail || '');
      var detail = '';
      try {
        var jo = JSON.parse(rawBody);
        if (jo && jo.error) detail = String(jo.error);
      } catch (_e3) {
        if (rawBody) detail = rawBody.replace(/\s+/g, ' ').trim().slice(0, 200);
      }
      var hint500 =
        detail && /team code mismatch|host file/i.test(detail)
          ? ' El archivo <code>lan-squad-host-state.json</code> se creó con <strong>otro</strong> código: o vuelves al código anterior, o (solo si puedes perder salas/pacientes LAN de prueba en ese archivo) cierra R+, borra ese JSON en datos de la app y vuelve a abrir para regenerarlo con el código actual.'
          : '';
      errHttp.innerHTML =
        '<strong>HTTP ' +
        esc(String(roomsFetch.httpStatus)) +
        '</strong>' +
        (detail ? ': ' + esc(detail) : '.') +
        (hint500 ? hint500 : ' Comprueba la URL del anfitrión y que R+ siga abierto en esa máquina.');
    }
    roomsCard.appendChild(errHttp);
  } else if (!roomsFetch.rooms.length) {
    var empty = document.createElement('p');
    empty.className = 'lan-connect-card-hint';
    empty.textContent = 'Todavía no hay salas. Crea una arriba o espera a que alguien del equipo la cree.';
    roomsCard.appendChild(empty);
  } else {
    var list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '0';
    list.style.margin = '0';
    roomsFetch.rooms.forEach(function (room) {
      var id = room && room.id ? String(room.id) : '';
      if (!id) return;
      var li = document.createElement('li');
      li.style.display = 'flex';
      li.style.gap = '8px';
      li.style.alignItems = 'center';
      li.style.marginBottom = '8px';

      var name = document.createElement('span');
      name.style.flex = '1';
      name.style.fontSize = '13px';
      var disp = String(room.displayName || room.name || id);
      name.textContent = disp;

      var joinBtn = document.createElement('button');
      joinBtn.type = 'button';
      joinBtn.className = 'btn-lan-secondary';
      joinBtn.style.flex = '0 0 auto';
      joinBtn.textContent = activeLiveSyncRoomId === id ? 'En sala' : 'Unirse';
      joinBtn.disabled = activeLiveSyncRoomId === id;
      joinBtn.onclick = function () {
        joinLanRoom(id, disp);
      };

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-lan-danger';
      delBtn.textContent = 'Eliminar';
      delBtn.disabled = !lanClient.connected;
      delBtn.onclick = function () {
        deleteLanRoom(id);
      };

      li.appendChild(name);
      li.appendChild(joinBtn);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
    roomsCard.appendChild(list);
  }
  if (lanPanelRenderStale(gen)) return;
  root.appendChild(roomsCard);
  appendLanDisconnectBannerPref(root);
  purgeDuplicateLanRoomsPanels(root);
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
    var plainTrim = String(plain || '').trim() || DEFAULT_LAN_TEAM_CODE;
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

async function copyMobileLanLinkFromUi(opts) {
  opts = opts || {};
  var silent = !!opts.silent;
  var hostUrl = await resolveLanHostUrlForShare();
  var teamCode = String(await resolveLanTeamCodeForShare()).trim();
  if (!hostUrl || !teamCode) {
    if (!silent) {
      runtime.showToast(
        !hostUrl
          ? 'Falta la dirección del servidor (o no pudimos detectar la IP en esta computadora).'
          : 'Falta el código del equipo.',
        'error'
      );
    }
    return false;
  }
  var roomId = String(activeLiveSyncRoomId || '').trim();
  var urls = buildLanJoinUrls(hostUrl, teamCode, roomId);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(urls.mobileUrl);
      if (!silent) {
        runtime.showToast(
          roomId
            ? 'Enlace móvil copiado (incluye sala). Ábrelo en Safari en la misma Wi‑Fi.'
            : 'Enlace móvil copiado. En el iPad elige la misma sala LiveSync que el equipo.',
          'success'
        );
      }
      return true;
    }
    if (!silent) runtime.showToast('Tu navegador no permite copiar automáticamente.', 'error');
    return false;
  } catch (_e) {
    if (!silent) runtime.showToast('No se pudo copiar al portapapeles.', 'error');
    return false;
  }
}

async function copyLanInviteLinkFromUi(opts) {
  opts = opts || {};
  var silent = !!opts.silent;
  var hostUrl = await resolveLanHostUrlForShare();
  var teamCode = String(await resolveLanTeamCodeForShare()).trim();
  if (!hostUrl || !teamCode) {
    if (!silent) {
      runtime.showToast(
        !hostUrl
          ? 'Falta la dirección del servidor (o no pudimos detectar la IP en esta computadora).'
          : 'Falta el código del equipo.',
        'error'
      );
    }
    return false;
  }
  var roomId = String(activeLiveSyncRoomId || '').trim();
  var urls = buildLanJoinUrls(hostUrl, teamCode, roomId);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(urls.joinUrl);
      if (!silent) {
        runtime.showToast(
          roomId
            ? 'Enlace de invitación copiado (incluye sala). Compártelo por WhatsApp, correo o una nota.'
            : 'Enlace de invitación copiado. Compártelo por WhatsApp, correo o una nota.',
          'success'
        );
      }
      return true;
    }
    if (!silent) runtime.showToast('Tu navegador no permite copiar automáticamente.', 'error');
    return false;
  } catch (_e) {
    if (!silent) runtime.showToast('No se pudo copiar al portapapeles.', 'error');
    return false;
  }
}

function joinLanFromInviteUi() {
  var input = document.getElementById('lan-input-invite-link');
  var raw = String(input && input.value ? input.value : '').trim();
  if (!raw) {
    runtime.showToast('Pega el enlace de invitación que te envió el anfitrión.', 'error');
    return;
  }
  var parsed = parseLanInviteInput(raw);
  var hostUrl = String(parsed.hostUrl || '').trim().replace(/\/+$/, '');
  var teamCode = String(parsed.teamCode || '').trim();
  var roomId = String(parsed.roomId || '').trim();
  if (!hostUrl || !teamCode) {
    runtime.showToast(
      'No reconocimos un enlace válido. Pide al anfitrión que te reenvíe el enlace (…/join?code=… o …/mobile/?code=…).',
      'error'
    );
    return;
  }
  configureLanFromMobileJoin(hostUrl, teamCode, roomId);
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
  var teamCode = String(await resolveLanTeamCodeForShare()).trim();
  if (!hostUrl || !teamCode) {
    runtime.showToast(
      !hostUrl
        ? uiRole === 'host'
          ? 'No pudimos detectar la IP. Escribe la dirección http://… que verán las otras R+.'
          : 'Escribe la dirección del servidor que te dio el anfitrión.'
        : uiRole === 'host'
          ? 'Escribe el código del equipo (por defecto ' + DEFAULT_LAN_TEAM_CODE + ').'
          : 'Escribe el código que te dio quien abrió la sala.',
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
    if (copyInviteAfter) {
      runtime.showToast(
        copiedOk
          ? 'Anfitrión listo. La invitación ya está en el portapapeles; compártela por WhatsApp o correo.'
          : 'Anfitrión listo, pero no se pudo copiar solo. Pulsa «Copiar invitación otra vez».',
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
  if (!id) return;
  if (
    activeLiveSyncRoomId === id &&
    String(lanClient.liveRoomId || '') === id &&
    lanClient.liveConnected
  ) {
    syncLiveSyncAfterRoomJoin(id);
    syncLiveSyncStatusChrome();
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
  renderLanPanel();
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
  var code = DEFAULT_LAN_TEAM_CODE;
  if (window.electronAPI && typeof window.electronAPI.getLanEffectiveTeamCode === 'function') {
    try {
      var info = await window.electronAPI.getLanEffectiveTeamCode();
      if (info && info.ok && info.code) code = String(info.code);
    } catch (_e) {}
  }
  if (!String(input.value || '').trim()) input.value = code;
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
