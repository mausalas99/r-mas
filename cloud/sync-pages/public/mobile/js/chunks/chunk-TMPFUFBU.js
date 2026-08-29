import {
  formatUpdaterReleaseNotesPlain
} from "/mobile/js/chunks/chunk-WQ5L4FZX.js";
import {
  GUIDED_TOUR_LS_KEY
} from "/mobile/js/chunks/chunk-ONL4KPJ3.js";
import {
  canGenerateDocumentsOffline,
  renderPatientList,
  selectPatient,
  shouldShowLocalServerOfflineBanner
} from "/mobile/js/chunks/chunk-U6BZK27B.js";
import {
  shouldSurfaceUpdateCheckError,
  updateNotAvailableToastKind
} from "/mobile/js/chunks/chunk-SZR4MTGX.js";
import {
  patientsVisibleInSidebar
} from "/mobile/js/chunks/chunk-YCVXJOA7.js";
import {
  closeSettingsDropdown,
  showSettingsPanel
} from "/mobile/js/chunks/chunk-IXDNIHYC.js";
import {
  formatProgressLine,
  sanitizeUpdaterUserMessage
} from "/mobile/js/chunks/chunk-AIC37VNN.js";
import {
  buildPatientEntry,
  ensureUniquePatientName,
  findPatientByRegistro,
  generatePatientId,
  isTourDemoPatientId
} from "/mobile/js/chunks/chunk-D4NKXSWN.js";
import {
  RELEASES_LATEST_URL,
  UPDATE_DISMISS_VER_KEY,
  UPDATE_SNOOZE_KEY,
  getPlatformRuntime,
  getUpdateChannel,
  installUpdate,
  migrateUpdateChannelToStableDefault,
  sendUpdateTelemetry,
  syncUpdateChannelUI,
  syncUpdateModalChannelPill,
  syncUpdateTelemetryUI,
  updaterState
} from "/mobile/js/chunks/chunk-6P7TSNN6.js";
import {
  openConfirm
} from "/mobile/js/chunks/chunk-EASTAY6S.js";
import {
  getIndicaciones,
  getLabHistory,
  getListadoProblemas,
  getMedPharmProfileByPatient,
  getMedRecetaByPatient,
  getNotes,
  getPatients,
  persistClinicalState,
  replaceAppStateFromBackupData,
  setIndicaciones,
  setLabHistory,
  setMedPharmProfileByPatient,
  setMedRecetaByPatient,
  setNotes,
  setPatients
} from "/mobile/js/chunks/chunk-MLLRKYO6.js";
import {
  storage
} from "/mobile/js/chunks/chunk-EZ7GA6IL.js";
import {
  applyMedCatalogOverlay,
  applySomePharmCatalogOverlay,
  mergeCensoPatientFields,
  mergePatientMonitoreoFromImported,
  mergePatientRegistrationMeta
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  setAsyncButtonLoading
} from "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-XV2TMACY.js";

// public/js/features/platform/shared.mjs
var AUDIT_LOG_KEY = "rpc-audit-log";
var AUTO_BACKUP_SETTINGS_KEY = "rpc-auto-backup-settings";
var AUTO_BACKUP_INDEX_KEY = "rpc-auto-backup-index";
var AUTO_BACKUP_MAX = 14;
var PREIMPORT_BACKUP_KEY = "rpc-preimport-backup";
var IDLE_LOCK_LS_KEY = "rpc-idle-lock";
var IDLE_LOCK_HASH_LS_KEY = "rpc-idle-lock-hash";
var IDLE_LOCK_DEBOUNCE_MS = 500;
var IDLE_LOCK_VALID_MINUTES = [0, 5, 10, 30];
function formatDateSlug(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function downloadBlob(blob, fileName) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
function downloadJsonPayload(payload, fileName) {
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, fileName);
}
function downloadTextPayload(content, fileName, mimeType) {
  var blob = new Blob([content], { type: (mimeType || "text/plain") + ";charset=utf-8" });
  downloadBlob(blob, fileName);
}

// public/js/features/platform/audit.mjs
var rt = getPlatformRuntime();
var _dbAuditCache = null;
function forensicEventVisible(eventType) {
  var t = String(eventType || "");
  return /^(clinical|auth|system|lan)\./.test(t);
}
function mapForensicAuditRow(row) {
  return {
    timestamp: row.timestamp,
    action: row.event_type,
    result: "ok",
    count: 0,
    detail: row.client_id || "",
    forensicId: row.id,
    payloadHash: row.payload_hash,
    currentHash: row.current_hash
  };
}
async function fetchDbAuditLog(limit) {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbAuditExport !== "function") {
    return null;
  }
  try {
    var res = await window.electronAPI.dbAuditExport({ limit: limit || 200 });
    if (!res || res.ok === false) return [];
    return (res.entries || []).filter(function(row) {
      return forensicEventVisible(row.event_type);
    }).map(mapForensicAuditRow);
  } catch {
    return [];
  }
}
function getAuditLog() {
  if (isDbMode() && _dbAuditCache) return _dbAuditCache;
  try {
    var raw = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
async function refreshDbAuditCache() {
  if (!isDbMode()) {
    _dbAuditCache = null;
    return getAuditLog();
  }
  _dbAuditCache = await fetchDbAuditLog(200);
  return _dbAuditCache;
}
function addAuditEntry(action, result, count, detail) {
  var list = getAuditLog();
  list.unshift({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    action: action || "unknown",
    result: result || "ok",
    count: Number.isFinite(count) ? count : 0,
    detail: detail || ""
  });
  if (list.length > 200) list = list.slice(0, 200);
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(list));
}
async function exportAuditLog() {
  var log;
  if (isDbMode() && window.electronAPI && typeof window.electronAPI.dbAuditExport === "function") {
    log = await fetchDbAuditLog(5e3);
  } else {
    log = getAuditLog();
  }
  downloadJsonPayload(
    {
      format: isDbMode() ? "r-plus-forensic-audit" : "r-plus-audit-log",
      version: isDbMode() ? 2 : 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      entries: log
    },
    "R-plus-bitacora-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json"
  );
  rt.showToast("Bit\xE1cora exportada", "success");
}
async function lockClinicalDatabaseNow() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbLock !== "function") {
    rt.showToast("Solo disponible con la base de datos cifrada en la app de escritorio.", "error");
    return;
  }
  var lockResult = await openConfirm({
    weight: "consequence",
    title: "\xBFBloquear la base de datos ahora?",
    consequenceText: "R+ la volver\xE1 a abrir autom\xE1ticamente en este equipo al reiniciar o recargar.",
    confirmLabel: "Bloquear"
  });
  if (lockResult !== "confirm") {
    return;
  }
  try {
    var res = await window.electronAPI.dbLock();
    if (!res || res.ok === false) {
      rt.showToast(res && res.error || "No se pudo bloquear la base de datos", "error");
      return;
    }
    rt.showToast("Base de datos bloqueada", "success");
    location.reload();
  } catch {
    rt.showToast("No se pudo bloquear la base de datos", "error");
  }
}
async function verifyForensicAuditChain() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbAuditVerify !== "function") {
    rt.showToast("La verificaci\xF3n forense solo est\xE1 en la app de escritorio con base cifrada.", "error");
    return;
  }
  rt.showToast("Verificando cadena de integridad\u2026", "info");
  try {
    var res = await window.electronAPI.dbAuditVerify({ mode: "full" });
    if (!res || res.ok === false) {
      rt.showToast(res && res.error || "No se pudo verificar la bit\xE1cora", "error");
      return;
    }
    if (res.valid) {
      rt.showToast("Bit\xE1cora forense \xEDntegra (verificaci\xF3n completa).", "success");
    } else {
      rt.showToast(
        "Cadena comprometida: revisa el registro #" + (res.brokenAtId != null ? res.brokenAtId : "?"),
        "error"
      );
    }
  } catch {
    rt.showToast("No se pudo verificar la bit\xE1cora", "error");
  }
}
async function exportRecoverCensusRangeJson() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbRecoverCensusRangeExport !== "function") {
    rt.showToast("Recuperaci\xF3n solo disponible con base cifrada en escritorio.", "error");
    return;
  }
  try {
    var res = await window.electronAPI.dbRecoverCensusRangeExport();
    if (!res || res.ok === false) {
      rt.showToast(res && res.error || "No se encontraron pacientes para exportar", "error");
      return;
    }
    downloadJsonPayload(
      res.payload,
      "R-plus-recuperacion-censo-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json"
    );
    rt.showToast(
      "Exportados " + (res.count || 0) + " paciente(s) \u2014 importa con Importar rango\u2026",
      "success"
    );
  } catch {
    rt.showToast("No se pudo exportar el censo recuperable", "error");
  }
}
async function exportClinicalDbBackupJson() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbBackupExportJson !== "function") {
    rt.showToast("Exportaci\xF3n solo disponible con base cifrada en escritorio.", "error");
    return;
  }
  var jsonBackupResult = await openConfirm({
    weight: "consequence",
    title: "\xBFContinuar y guardar en un lugar seguro?",
    consequenceText: "El respaldo JSON incluye informaci\xF3n cl\xEDnica identificable en texto plano.",
    confirmLabel: "Continuar"
  });
  if (jsonBackupResult !== "confirm") {
    return;
  }
  try {
    var res = await window.electronAPI.dbBackupExportJson();
    if (!res || res.ok === false) {
      rt.showToast(res && res.error || "No se pudo exportar el respaldo", "error");
      return;
    }
    var envelope = res.envelope || res;
    downloadJsonPayload(
      envelope,
      "R-plus-respaldo-sqlcipher-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json"
    );
    rt.showToast("Respaldo JSON exportado", "success");
  } catch {
    rt.showToast("No se pudo exportar el respaldo", "error");
  }
}
async function exportClinicalDbBackupDb() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbBackupExportDb !== "function") {
    rt.showToast("Exportaci\xF3n solo disponible con base cifrada en escritorio.", "error");
    return;
  }
  var dbBackupResult = await openConfirm({
    weight: "consequence",
    title: "\xBFContinuar?",
    consequenceText: "Se copiar\xE1 el archivo .db cifrado. Prot\xE9gelo como datos cl\xEDnicos sensibles.",
    confirmLabel: "Continuar"
  });
  if (dbBackupResult !== "confirm") {
    return;
  }
  try {
    var res = await window.electronAPI.dbBackupExportDb();
    if (res && res.canceled) return;
    if (!res || res.ok === false) {
      rt.showToast(res && res.error || "No se pudo exportar la copia .db", "error");
      return;
    }
    rt.showToast("Copia .db guardada" + (res.path ? ": " + res.path : ""), "success");
  } catch {
    rt.showToast("No se pudo exportar la copia .db", "error");
  }
}
var MED_CATALOG_MERGE_CAP = 400;
function mergeMedCatalogStored(incoming) {
  var cur = storage.getMedCatalog();
  var incAcc = incoming.accents && typeof incoming.accents === "object" ? incoming.accents : {};
  var accents = Object.assign({}, cur.accents, incAcc);
  function mergeArr(a, b) {
    var seen = /* @__PURE__ */ Object.create(null);
    var out = [];
    function add(list) {
      (list || []).forEach(function(t) {
        var s = String(t || "").trim();
        if (!s) return;
        var k = s.toUpperCase();
        if (seen[k]) return;
        seen[k] = 1;
        out.push(s);
      });
    }
    add(a);
    add(b);
    return out.slice(0, MED_CATALOG_MERGE_CAP);
  }
  var st = cur.soapTokens || {};
  var si = incoming.soapTokens && typeof incoming.soapTokens === "object" ? incoming.soapTokens : {};
  function mergeSomePharm(curSp, incSp) {
    var out = /* @__PURE__ */ Object.create(null);
    var cTok = curSp && curSp.tokens ? curSp.tokens : {};
    var iTok = incSp && incSp.tokens ? incSp.tokens : {};
    var keys = Object.keys(cTok).concat(Object.keys(iTok));
    keys.forEach(function(cat) {
      out[cat] = mergeArr(cTok[cat], iTok[cat]);
    });
    return { tokens: out };
  }
  return {
    v: 1,
    accents,
    soapTokens: {
      vasop: mergeArr(st.vasop, si.vasop),
      abx: mergeArr(st.abx, si.abx),
      analgesia: mergeArr(st.analgesia, si.analgesia),
      antihta: mergeArr(st.antihta, si.antihta)
    },
    somePharm: mergeSomePharm(cur.somePharm, incoming.somePharm)
  };
}
function exportMedCatalogBundle() {
  var data = storage.getMedCatalog();
  downloadJsonPayload(
    {
      format: "r-plus-med-catalog",
      version: 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      accents: data.accents || {},
      soapTokens: data.soapTokens || { vasop: [], abx: [], analgesia: [], antihta: [] },
      somePharm: data.somePharm || { tokens: {} }
    },
    "R-plus-catalogo-medicamentos-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json"
  );
  addAuditEntry("med-catalog-export", "ok", Object.keys(data.accents || {}).length, "soap-export");
  rt.showToast("Cat\xE1logo exportado", "success");
}
function triggerImportMedCatalog() {
  var el = document.getElementById("med-catalog-file-input");
  if (el) el.click();
}
function normalizeMedCatalogImportPayload(payload) {
  var accents = payload.accents;
  var soapTokens = payload.soapTokens;
  var somePharm = payload.somePharm;
  var hasAcc = accents && typeof accents === "object";
  var hasSoap = soapTokens && typeof soapTokens === "object";
  var hasSome = somePharm && typeof somePharm === "object";
  if (!hasAcc && !hasSoap && !hasSome) return null;
  return {
    accents: hasAcc ? accents : {},
    soapTokens: hasSoap ? soapTokens : {},
    somePharm: hasSome ? somePharm : {}
  };
}
function finishMedCatalogImport(merged) {
  storage.saveMedCatalog(merged);
  applyMedCatalogOverlay(merged);
  applySomePharmCatalogOverlay(merged);
  var nAcc = Object.keys(merged.accents || {}).length;
  var nTok = (merged.soapTokens.vasop || []).length + (merged.soapTokens.abx || []).length + (merged.soapTokens.analgesia || []).length + (merged.soapTokens.antihta || []).length;
  addAuditEntry("med-catalog-import", "ok", nTok, "accents:" + nAcc);
  rt.showToast("Cat\xE1logo importado (fusionado con el tuyo)", "success");
}
function handleMedCatalogFileText(rawText) {
  try {
    var json = JSON.parse(String(rawText || ""));
    var payload = json && typeof json === "object" ? json : {};
    var normalized = normalizeMedCatalogImportPayload(payload);
    if (!normalized) {
      rt.showToast(
        "El archivo no es un cat\xE1logo v\xE1lido (faltan accents, soapTokens o somePharm).",
        "error"
      );
      return;
    }
    finishMedCatalogImport(mergeMedCatalogStored(normalized));
  } catch {
    rt.showToast("No se pudo leer el cat\xE1logo", "error");
  }
}
function onMedCatalogFileChosen(ev) {
  var input = ev.target;
  var f = input.files && input.files[0];
  input.value = "";
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function() {
    handleMedCatalogFileText(reader.result);
  };
  reader.readAsText(f);
}

// public/js/features/platform/offline-rpc-health.mjs
var rt2 = getPlatformRuntime();
var pendingJobs = 0;
var rpcOffline = false;
function setRpcOfflineVisible(show) {
  var b = document.getElementById("rpc-offline-banner");
  if (!b) return;
  var visible = shouldShowLocalServerOfflineBanner(show);
  b.classList.toggle("visible", visible);
  if (!visible) {
    b.hidden = true;
    b.setAttribute("aria-hidden", "true");
  } else {
    b.hidden = false;
    b.removeAttribute("aria-hidden");
  }
}
function renderPendingJobsPill() {
  try {
    var pill = document.getElementById("pending-jobs-pill");
    if (!pill) return;
    if (pendingJobs > 0) {
      pill.textContent = "Procesando (" + pendingJobs + ")";
      pill.classList.add("visible");
    } else {
      pill.textContent = "";
      pill.classList.remove("visible");
    }
  } catch (e) {
    console.error("renderPendingJobsPill error:", e && e.message);
  }
}
function incrementPendingJobs() {
  pendingJobs += 1;
  renderPendingJobsPill();
}
function decrementPendingJobs() {
  pendingJobs = Math.max(0, pendingJobs - 1);
  renderPendingJobsPill();
}
function syncDocExportButtonOfflineState(btn) {
  if (!btn) return;
  if (rpcOffline && !canGenerateDocumentsOffline()) {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    btn.dataset.rpcOffline = "1";
    return;
  }
  if (btn.dataset.rpcOffline) delete btn.dataset.rpcOffline;
  if (!btn.classList.contains("loading")) {
    btn.disabled = false;
    btn.removeAttribute("aria-disabled");
  }
}
function syncOfflineButtonStates() {
  try {
    var exportButtons = document.querySelectorAll(".rpc-doc-export, #censo-export-confirm");
    exportButtons.forEach(function(b) {
      syncDocExportButtonOfflineState(b);
    });
  } catch (e) {
    console.error("syncOfflineButtonStates error:", e && e.message);
  }
}
function setRpcOffline(offline) {
  var prev = rpcOffline;
  rpcOffline = !!offline;
  setRpcOfflineVisible(rpcOffline);
  syncOfflineButtonStates();
  if (canGenerateDocumentsOffline()) return;
  if (!prev && rpcOffline) {
    try {
      rt2.showToast("Sin conexi\xF3n con el servidor local. Generaci\xF3n de documentos desactivada.", "error");
    } catch (_e) {
      void _e;
    }
  } else if (prev && !rpcOffline) {
    try {
      rt2.showToast("Servidor local reconectado.", "success");
    } catch (_e) {
      void _e;
    }
  }
}
function isRpcOffline() {
  return rpcOffline;
}
function isCloudMobileSurface() {
  try {
    if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) return true;
    if (typeof document !== "undefined" && document.documentElement && (document.documentElement.dataset.cloudMobile === "1" || document.documentElement.classList.contains("rpc-cloud-mobile"))) {
      return true;
    }
  } catch (_e) {
    void _e;
  }
  return false;
}
function checkRpcServerHealth() {
  if (isCloudMobileSurface()) {
    try {
      rpcOffline = false;
      setRpcOfflineVisible(false);
      var offlineBanner = document.getElementById("rpc-offline-banner");
      if (offlineBanner) {
        offlineBanner.hidden = true;
        offlineBanner.classList.remove("visible");
      }
      var lanBanner = document.getElementById("lan-connection-banner");
      if (lanBanner) lanBanner.hidden = true;
    } catch (_e) {
      void _e;
    }
    return;
  }
  if (canGenerateDocumentsOffline()) {
    setRpcOffline(false);
    return;
  }
  try {
    fetch("/health", { method: "GET", cache: "no-store" }).then(function(r) {
      if (r.status === 429) return;
      if (!r.ok) throw new Error("bad status");
      return r.json();
    }).then(function(j) {
      if (j === void 0) return;
      try {
        if (!j || !j.ok) throw new Error("bad payload");
        setRpcOffline(false);
      } catch (e) {
        setRpcOffline(true);
        console.error("health payload error:", e && e.message);
      }
    }).catch(function() {
      try {
        setRpcOffline(true);
      } catch (e) {
        console.error("setRpcOffline error:", e && e.message);
      }
    });
  } catch (e) {
    console.error("checkRpcServerHealth crashed:", e && e.message);
    try {
      setRpcOffline(true);
    } catch (_e) {
      void _e;
    }
  }
}
function initRpcServerHealthWatch() {
  if (isCloudMobileSurface()) {
    checkRpcServerHealth();
    return;
  }
  if (canGenerateDocumentsOffline()) {
    checkRpcServerHealth();
    return;
  }
  checkRpcServerHealth();
  setInterval(checkRpcServerHealth, 15e3);
}

// public/js/features/platform/offline.mjs
var rt3 = getPlatformRuntime();
var idleLockTimerId = null;
var idleLockDebounceId = null;
var idleLockIsActive = false;
var idleLockEnabledMinutes = 0;
function getIdleLockMinutes() {
  var raw = parseInt(localStorage.getItem(IDLE_LOCK_LS_KEY) || "0", 10);
  if (!Number.isFinite(raw)) raw = 0;
  return IDLE_LOCK_VALID_MINUTES.indexOf(raw) !== -1 ? raw : 0;
}
function setIdleLockMinutesStored(mins) {
  var n = IDLE_LOCK_VALID_MINUTES.indexOf(mins) !== -1 ? mins : 0;
  if (n === 0) localStorage.removeItem(IDLE_LOCK_LS_KEY);
  else localStorage.setItem(IDLE_LOCK_LS_KEY, String(n));
}
function getIdleLockPinHash() {
  return localStorage.getItem(IDLE_LOCK_HASH_LS_KEY) || "";
}
function setIdleLockPinHash(hashHex) {
  if (hashHex) localStorage.setItem(IDLE_LOCK_HASH_LS_KEY, hashHex);
  else localStorage.removeItem(IDLE_LOCK_HASH_LS_KEY);
}
function isIdleLockPinFormatValid(pin) {
  return /^\d{4,8}$/.test(String(pin == null ? "" : pin));
}
async function computeSha256Hex(text) {
  if (!window.crypto || !window.crypto.subtle) throw new Error("WebCrypto no disponible");
  var enc = new TextEncoder();
  var buf = await crypto.subtle.digest("SHA-256", enc.encode(String(text)));
  var bytes = new Uint8Array(buf);
  var hex = "";
  for (var i = 0; i < bytes.length; i += 1) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}
async function promptForIdleLockPinSetup(reason) {
  var label = reason === "change" ? "Ingresa un nuevo PIN de 4 a 8 d\xEDgitos para el bloqueo:" : "Elige un PIN de 4 a 8 d\xEDgitos para el bloqueo por inactividad:";
  var p1 = prompt(label, "");
  if (p1 == null) return { ok: false, cancelled: true };
  if (!isIdleLockPinFormatValid(p1)) {
    rt3.showToast("PIN inv\xE1lido (solo 4-8 d\xEDgitos).", "error");
    return { ok: false, cancelled: false };
  }
  var p2 = prompt("Confirma el PIN:", "");
  if (p2 == null) return { ok: false, cancelled: true };
  if (p1 !== p2) {
    rt3.showToast("Los PIN no coinciden.", "error");
    return { ok: false, cancelled: false };
  }
  try {
    var hash = await computeSha256Hex(p1);
    setIdleLockPinHash(hash);
    addAuditEntry("idle-lock-pin-set", "ok", 0, reason === "change" ? "changed" : "created");
    return { ok: true, cancelled: false };
  } catch {
    rt3.showToast("WebCrypto no disponible en este entorno.", "error");
    addAuditEntry("idle-lock-pin-set", "error", 0, "no-webcrypto");
    return { ok: false, cancelled: false };
  }
}
function syncIdleLockSelectUi() {
  var sel = document.getElementById("settings-idle-lock");
  if (sel) sel.value = String(getIdleLockMinutes());
}
async function onIdleLockSelectChange(value) {
  var parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) parsed = 0;
  if (IDLE_LOCK_VALID_MINUTES.indexOf(parsed) === -1) parsed = 0;
  if (parsed === 0) {
    setIdleLockMinutesStored(0);
    addAuditEntry("idle-lock-disable", "ok", 0, "");
    restartIdleLockTimer();
    syncIdleLockSelectUi();
    rt3.showToast("Bloqueo por inactividad desactivado.", "success");
    return;
  }
  if (!getIdleLockPinHash()) {
    var setup = await promptForIdleLockPinSetup("create");
    if (!setup.ok) {
      syncIdleLockSelectUi();
      return;
    }
  }
  setIdleLockMinutesStored(parsed);
  addAuditEntry("idle-lock-enable", "ok", parsed, "");
  restartIdleLockTimer();
  syncIdleLockSelectUi();
  rt3.showToast("Bloqueo activo: " + parsed + " min.", "success");
}
async function changeIdleLockPin() {
  var existing = getIdleLockPinHash();
  if (existing) {
    var current = prompt("Ingresa el PIN actual para continuar:", "");
    if (current == null) return;
    if (!isIdleLockPinFormatValid(current)) {
      rt3.showToast("PIN con formato inv\xE1lido.", "error");
      addAuditEntry("idle-lock-pin-change", "error", 0, "invalid-format");
      return;
    }
    try {
      var hash = await computeSha256Hex(current);
      if (hash !== existing) {
        rt3.showToast("PIN incorrecto.", "error");
        addAuditEntry("idle-lock-pin-change", "error", 0, "wrong-pin");
        return;
      }
    } catch {
      rt3.showToast("WebCrypto no disponible.", "error");
      addAuditEntry("idle-lock-pin-change", "error", 0, "no-webcrypto");
      return;
    }
  }
  var setup = await promptForIdleLockPinSetup("change");
  if (setup.ok) {
    rt3.showToast("PIN actualizado \u2713", "success");
    restartIdleLockTimer();
  }
}
function restartIdleLockTimer() {
  if (idleLockDebounceId) {
    clearTimeout(idleLockDebounceId);
    idleLockDebounceId = null;
  }
  if (idleLockTimerId) {
    clearTimeout(idleLockTimerId);
    idleLockTimerId = null;
  }
  idleLockEnabledMinutes = getIdleLockMinutes();
  if (idleLockEnabledMinutes <= 0 || idleLockIsActive) return;
  idleLockTimerId = setTimeout(triggerIdleLock, idleLockEnabledMinutes * 60 * 1e3);
}
function onIdleActivity() {
  if (idleLockEnabledMinutes <= 0 || idleLockIsActive) return;
  if (idleLockDebounceId) return;
  idleLockDebounceId = setTimeout(function() {
    idleLockDebounceId = null;
    if (idleLockTimerId) clearTimeout(idleLockTimerId);
    idleLockTimerId = setTimeout(triggerIdleLock, idleLockEnabledMinutes * 60 * 1e3);
  }, IDLE_LOCK_DEBOUNCE_MS);
}
function triggerIdleLock() {
  if (idleLockIsActive) return;
  if (!getIdleLockPinHash()) return;
  idleLockIsActive = true;
  if (idleLockTimerId) {
    clearTimeout(idleLockTimerId);
    idleLockTimerId = null;
  }
  if (idleLockDebounceId) {
    clearTimeout(idleLockDebounceId);
    idleLockDebounceId = null;
  }
  showIdleLockOverlay();
  addAuditEntry("idle-lock-lock", "ok", idleLockEnabledMinutes, "inactivity");
}
function showIdleLockOverlay() {
  var overlay = document.getElementById("rpc-idle-lock-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  overlay.setAttribute("aria-hidden", "false");
  var err = document.getElementById("rpc-idle-lock-error");
  if (err) {
    err.style.display = "none";
    err.textContent = "";
  }
  var input = document.getElementById("rpc-idle-lock-pin");
  if (input) {
    input.value = "";
    setTimeout(function() {
      try {
        input.focus();
      } catch (_e) {
        void _e;
      }
    }, 60);
  }
}
function hideIdleLockOverlay() {
  var overlay = document.getElementById("rpc-idle-lock-overlay");
  if (!overlay) return;
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden", "true");
}
async function submitIdleLockPin() {
  var input = document.getElementById("rpc-idle-lock-pin");
  var err = document.getElementById("rpc-idle-lock-error");
  var pin = input ? input.value : "";
  if (!isIdleLockPinFormatValid(pin)) {
    if (err) {
      err.style.display = "block";
      err.textContent = "Formato inv\xE1lido (4-8 d\xEDgitos).";
    }
    addAuditEntry("idle-lock-unlock", "error", 0, "invalid-format");
    if (input) {
      input.value = "";
      input.focus();
    }
    return;
  }
  var expected = getIdleLockPinHash();
  if (!expected) {
    idleLockIsActive = false;
    hideIdleLockOverlay();
    addAuditEntry("idle-lock-unlock", "ok", 0, "no-hash-bypass");
    restartIdleLockTimer();
    return;
  }
  try {
    var h = await computeSha256Hex(pin);
    if (h === expected) {
      idleLockIsActive = false;
      hideIdleLockOverlay();
      addAuditEntry("idle-lock-unlock", "ok", 0, "");
      restartIdleLockTimer();
    } else {
      if (err) {
        err.style.display = "block";
        err.textContent = "PIN incorrecto.";
      }
      addAuditEntry("idle-lock-unlock", "error", 0, "bad-pin");
      if (input) {
        input.value = "";
        input.focus();
      }
    }
  } catch {
    if (err) {
      err.style.display = "block";
      err.textContent = "WebCrypto no disponible.";
    }
    addAuditEntry("idle-lock-unlock", "error", 0, "no-webcrypto");
  }
}
function initIdleLockFeature() {
  idleLockEnabledMinutes = getIdleLockMinutes();
  syncIdleLockSelectUi();
  if (idleLockEnabledMinutes > 0 && !getIdleLockPinHash()) {
    setIdleLockMinutesStored(0);
    idleLockEnabledMinutes = 0;
    syncIdleLockSelectUi();
    addAuditEntry("idle-lock-reset", "ok", 0, "missing-hash");
  }
  var onActivity = function() {
    onIdleActivity();
  };
  window.addEventListener("mousemove", onActivity, { passive: true });
  window.addEventListener("keydown", function(e) {
    if (idleLockIsActive) {
      if (e.key === "Enter") {
        var overlay = document.getElementById("rpc-idle-lock-overlay");
        if (overlay && overlay.style.display !== "none") {
          e.preventDefault();
          submitIdleLockPin();
        }
      }
      return;
    }
    onActivity();
  }, true);
  window.addEventListener("click", onActivity, { passive: true });
  restartIdleLockTimer();
}
var wipeModalWired = false;
function showWipeStep(stepId) {
  var steps = ["choose", "cache", "full"];
  steps.forEach(function(id) {
    var node = document.getElementById("rpc-wipe-step-" + id);
    if (!node) return;
    node.hidden = id !== stepId;
  });
  var modal = document.getElementById("rpc-wipe-modal");
  if (!modal) return;
  var titleId = stepId === "cache" ? "rpc-wipe-cache-title" : stepId === "full" ? "rpc-wipe-full-title" : "rpc-wipe-title";
  modal.setAttribute("aria-labelledby", titleId);
}
function resetWipeConfirmUi() {
  showWipeStep("choose");
  var input = document.getElementById("rpc-wipe-full-input");
  if (input) input.value = "";
  var err = document.getElementById("rpc-wipe-full-error");
  if (err) {
    err.textContent = "";
    err.hidden = true;
  }
}
function wireWipeDataModalOnce() {
  if (wipeModalWired) return;
  var panel = document.querySelector("#rpc-wipe-modal .rpc-wipe-panel");
  if (!panel) return;
  wipeModalWired = true;
  panel.addEventListener("click", function(ev) {
    var btn = ev.target.closest("[data-wipe-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-wipe-action");
    if (action === "close") closeWipeDataModal();
    else if (action === "choose") showWipeStep("choose");
    else if (action === "cache-exec") executeWipeCache();
    else if (action === "full-exec") executeWipeAll();
  });
  var input = document.getElementById("rpc-wipe-full-input");
  if (input) {
    input.addEventListener("keydown", function(ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        executeWipeAll();
      }
    });
  }
}
function openWipeDataModal() {
  closeSettingsDropdown();
  wireWipeDataModalOnce();
  var m = document.getElementById("rpc-wipe-modal");
  if (!m) return;
  resetWipeConfirmUi();
  m.style.display = "flex";
  m.setAttribute("aria-hidden", "false");
}
function closeWipeDataModal() {
  var m = document.getElementById("rpc-wipe-modal");
  if (!m) return;
  m.style.display = "none";
  m.setAttribute("aria-hidden", "true");
  resetWipeConfirmUi();
}
function collectCacheWipeKeys() {
  var keys = [];
  for (var i = 0; i < localStorage.length; i += 1) {
    var k = localStorage.key(i);
    if (!k) continue;
    if (k.indexOf("rpc-preimport-") === 0) keys.push(k);
    else if (k === AUDIT_LOG_KEY) keys.push(k);
    else if (k.indexOf("rpc-auto-backup-") === 0) keys.push(k);
    else if (k === IDLE_LOCK_LS_KEY) keys.push(k);
  }
  return keys;
}
function collectFullWipeKeys() {
  var keys = [];
  for (var i = 0; i < localStorage.length; i += 1) {
    var k = localStorage.key(i);
    if (!k) continue;
    if (k.indexOf("rpc-") === 0 || k === "theme" || k === "rplus-last-seen-app-version") {
      keys.push(k);
    }
  }
  return keys;
}
function wipeCacheConfirmed() {
  wireWipeDataModalOnce();
  showWipeStep("cache");
}
function wipeAllConfirmed() {
  wireWipeDataModalOnce();
  showWipeStep("full");
  var input = document.getElementById("rpc-wipe-full-input");
  if (input) setTimeout(function() {
    try {
      input.focus();
    } catch (_e) {
      void _e;
    }
  }, 60);
}
function executeWipeCache() {
  var keys = collectCacheWipeKeys();
  addAuditEntry("data-wipe-cache", "ok", keys.length, "pre-wipe");
  keys.forEach(function(k) {
    try {
      localStorage.removeItem(k);
    } catch (_e) {
      void _e;
    }
  });
  idleLockEnabledMinutes = 0;
  if (idleLockTimerId) {
    clearTimeout(idleLockTimerId);
    idleLockTimerId = null;
  }
  if (idleLockDebounceId) {
    clearTimeout(idleLockDebounceId);
    idleLockDebounceId = null;
  }
  addAuditEntry("data-wipe-cache", "ok", keys.length, "completed");
  closeWipeDataModal();
  syncIdleLockSelectUi();
  rt3.showToast("Se eliminaron " + keys.length + " elementos temporales.", "success");
}
function executeWipeAll() {
  var input = document.getElementById("rpc-wipe-full-input");
  var err = document.getElementById("rpc-wipe-full-error");
  var typed = String(input && input.value != null ? input.value : "").trim().toUpperCase();
  if (typed !== "BORRAR") {
    addAuditEntry("data-wipe-full", "cancelled", 0, "confirmation-failed");
    if (err) {
      err.textContent = "Escribe BORRAR en may\xFAsculas para continuar.";
      err.hidden = false;
    }
    if (input) input.focus();
    return;
  }
  if (err) {
    err.textContent = "";
    err.hidden = true;
  }
  var keys = collectFullWipeKeys();
  addAuditEntry("data-wipe-full", "ok", keys.length, "pre-wipe");
  keys.forEach(function(k) {
    try {
      localStorage.removeItem(k);
    } catch (_e) {
      void _e;
    }
  });
  closeWipeDataModal();
  if (window.electronAPI && typeof window.electronAPI.relaunchApp === "function") {
    try {
      window.electronAPI.relaunchApp();
      return;
    } catch (_e) {
      void _e;
    }
  }
  location.reload();
}
function openUserDataFolderFromSettings() {
  if (!window.electronAPI || !window.electronAPI.openUserDataFolder) {
    rt3.showToast("Solo disponible en la aplicaci\xF3n de escritorio.", "error");
    return;
  }
  window.electronAPI.openUserDataFolder().then(function(res) {
    if (res && res.ok) rt3.showToast("Carpeta abierta", "success");
    else rt3.showToast(res && res.error || "No se pudo abrir la carpeta", "error");
  }).catch(function() {
    rt3.showToast("No se pudo abrir la carpeta", "error");
  });
}
function safeExportSlug(str) {
  var s = (str || "paciente").replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+/g, "_").replace(/^_|_$/g, "");
  return (s || "paciente").slice(0, 48);
}

// public/js/features/platform/import-backup/backup-payload.mjs
var rt4 = getPlatformRuntime();
function buildBackupDataFromMemory() {
  var filteredPatients = getPatients().filter(function(p) {
    return p && !p.isDemo;
  });
  var notesPersist = {};
  Object.keys(getNotes() || {}).forEach(function(k) {
    if (getNotes()[k] && !String(k).startsWith("demo-")) notesPersist[k] = getNotes()[k];
  });
  var indPersist = {};
  Object.keys(getIndicaciones() || {}).forEach(function(k) {
    if (getIndicaciones()[k] && !String(k).startsWith("demo-")) indPersist[k] = getIndicaciones()[k];
  });
  var lhPersist = {};
  Object.keys(getLabHistory() || {}).forEach(function(k) {
    if (!String(k).startsWith("demo-")) lhPersist[k] = getLabHistory()[k];
  });
  var medPersist = {};
  Object.keys(getMedRecetaByPatient() || {}).forEach(function(k) {
    if (!String(k).startsWith("demo-")) medPersist[k] = getMedRecetaByPatient()[k];
  });
  var medPharmPersist = {};
  Object.keys(getMedPharmProfileByPatient() || {}).forEach(function(k) {
    if (!String(k).startsWith("demo-")) medPharmPersist[k] = getMedPharmProfileByPatient()[k];
  });
  var listPersist = {};
  Object.keys(getListadoProblemas() || {}).forEach(function(k) {
    if (getListadoProblemas()[k] && !String(k).startsWith("demo-")) listPersist[k] = getListadoProblemas()[k];
  });
  var settings = rt4.getSettings();
  if (!settings || typeof settings !== "object" || !Object.keys(settings).length) {
    settings = storage.getSettings();
  }
  return {
    patients: filteredPatients,
    notes: notesPersist,
    indicaciones: indPersist,
    labHistory: lhPersist,
    medRecetaByPatient: medPersist,
    medPharmProfileByPatient: medPharmPersist,
    listadoProblemas: listPersist,
    scheduledProcedures: storage.getScheduledProcedures(),
    settings,
    medCatalog: storage.getMedCatalog()
  };
}
function buildFullBackupPayload() {
  return {
    format: "r-plus-backup",
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null,
    theme: localStorage.getItem("theme") || "light",
    guidedTourDoneForVersion: localStorage.getItem(GUIDED_TOUR_LS_KEY),
    data: buildBackupDataFromMemory()
  };
}
async function persistFullBackupPayload(payload) {
  if (!payload || !payload.data) throw new Error("invalid-backup");
  replaceAppStateFromBackupData(payload.data);
  try {
    localStorage.setItem(
      "rpc-scheduled-procedures",
      JSON.stringify(
        Array.isArray(payload.data.scheduledProcedures) ? payload.data.scheduledProcedures : []
      )
    );
  } catch (_e) {
    void _e;
  }
  localStorage.setItem("rpc-settings", JSON.stringify(payload.data.settings || {}));
  if (payload.data.medCatalog && typeof payload.data.medCatalog === "object") {
    storage.saveMedCatalog(payload.data.medCatalog);
  }
  if (payload.theme === "dark" || payload.theme === "light") {
    localStorage.setItem("theme", payload.theme);
  }
  if (payload.guidedTourDoneForVersion) {
    localStorage.setItem(GUIDED_TOUR_LS_KEY, payload.guidedTourDoneForVersion);
  } else {
    localStorage.removeItem(GUIDED_TOUR_LS_KEY);
  }
  var result = await persistClinicalState({ immediate: true });
  if (!result || !result.ok) {
    throw new Error(result && result.code || "SAVE_FAILED");
  }
  return result;
}

// public/js/features/platform/import-backup/auto-backup.mjs
var rt5 = getPlatformRuntime();
var autoBackupSchedulerId = null;
function defaultAutoBackupSettings() {
  return { frequency: "off", retention: 7, lastRunAt: 0 };
}
function getAutoBackupSettings() {
  try {
    var saved = JSON.parse(localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY) || "{}");
    var frequency = saved.frequency === "daily" || saved.frequency === "weekly" ? saved.frequency : "off";
    var retention = parseInt(saved.retention, 10);
    if (retention !== 3 && retention !== 7 && retention !== 14) retention = 7;
    var lastRunAt = parseInt(saved.lastRunAt, 10);
    return { frequency, retention, lastRunAt: Number.isFinite(lastRunAt) ? lastRunAt : 0 };
  } catch {
    return defaultAutoBackupSettings();
  }
}
function saveAutoBackupSettings(cfg) {
  localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(cfg));
}
function getAutoBackupIndex() {
  try {
    var list = JSON.parse(localStorage.getItem(AUTO_BACKUP_INDEX_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function saveAutoBackupIndex(list) {
  localStorage.setItem(AUTO_BACKUP_INDEX_KEY, JSON.stringify(list.slice(0, AUTO_BACKUP_MAX)));
}
function syncAutoBackupUi() {
  var cfg = getAutoBackupSettings();
  var freqEl = document.getElementById("auto-backup-frequency");
  var retEl = document.getElementById("auto-backup-retention");
  if (freqEl) freqEl.value = cfg.frequency;
  if (retEl) retEl.value = String(cfg.retention);
}
function updateAutoBackupSettingsFromUi() {
  var cfg = getAutoBackupSettings();
  var freqEl = document.getElementById("auto-backup-frequency");
  var retEl = document.getElementById("auto-backup-retention");
  cfg.frequency = freqEl ? freqEl.value : cfg.frequency;
  cfg.retention = retEl ? parseInt(retEl.value, 10) : cfg.retention;
  if (cfg.retention !== 3 && cfg.retention !== 7 && cfg.retention !== 14) cfg.retention = 7;
  saveAutoBackupSettings(cfg);
  addAuditEntry("auto-backup-config", "ok", cfg.retention, cfg.frequency);
  maybeRunScheduledAutoBackup();
}
function shouldRunScheduledBackup(cfg) {
  if (!cfg || cfg.frequency === "off") return false;
  var now = Date.now();
  var delta = cfg.frequency === "weekly" ? 7 * 24 * 36e5 : 24 * 36e5;
  return !cfg.lastRunAt || now - cfg.lastRunAt >= delta;
}
function maybeRunScheduledAutoBackup() {
  var cfg = getAutoBackupSettings();
  if (!shouldRunScheduledBackup(cfg)) return;
  runAutoBackupNow(true);
}
function restartAutoBackupScheduler() {
  if (autoBackupSchedulerId) clearInterval(autoBackupSchedulerId);
  autoBackupSchedulerId = setInterval(function() {
    maybeRunScheduledAutoBackup();
  }, 30 * 60 * 1e3);
}
async function runAutoBackupNow(isScheduled) {
  await persistClinicalState({ immediate: true });
  var cfg = getAutoBackupSettings();
  var payload = buildFullBackupPayload();
  payload.autoBackup = { scheduled: !!isScheduled };
  var ts = Date.now();
  var fileName = "R-plus-auto-respaldo-" + formatDateSlug(new Date(ts)) + "-" + String(ts).slice(-6) + ".json";
  downloadJsonPayload(payload, fileName);
  var idx = getAutoBackupIndex();
  idx.unshift({ id: ts, fileName, createdAt: new Date(ts).toISOString(), patients: (payload.data.patients || []).length });
  idx = idx.slice(0, cfg.retention);
  saveAutoBackupIndex(idx);
  cfg.lastRunAt = ts;
  saveAutoBackupSettings(cfg);
  addAuditEntry("backup-auto", "ok", (payload.data.patients || []).length, isScheduled ? "scheduled" : "manual");
  rt5.showToast("Auto-respaldo generado", "success");
}

// public/js/features/platform/import-backup/preimport.mjs
var rt6 = getPlatformRuntime();
function syncPreimportBackupUi() {
  var wrap = document.getElementById("settings-preimport-restore-wrap");
  if (!wrap) return;
  var raw = localStorage.getItem(PREIMPORT_BACKUP_KEY);
  var has = false;
  var meta = "";
  try {
    if (raw) {
      var p = JSON.parse(raw);
      if (p && p.format === "r-plus-backup" && p.version === 1 && p.data) {
        has = true;
        var n = (p.data.patients || []).length;
        var when = p.exportedAt ? String(p.exportedAt).slice(0, 19).replace("T", " ") : "";
        meta = (when ? when + " \xB7 " : "") + n + " paciente(s)";
      }
    }
  } catch (_e) {
    void _e;
  }
  wrap.style.display = has ? "block" : "none";
  var el = document.getElementById("settings-preimport-meta");
  if (el) el.textContent = has ? meta : "\u2014";
}
async function restorePreimportBackupPrompt() {
  var raw = localStorage.getItem(PREIMPORT_BACKUP_KEY);
  if (!raw) {
    rt6.showToast(
      "No hay copia autom\xE1tica previa a una importaci\xF3n. Revisa Descargas por archivos R-plus-respaldo- o R-plus-auto-respaldo-.",
      "error"
    );
    syncPreimportBackupUi();
    return;
  }
  var payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    rt6.showToast("La copia autom\xE1tica previa est\xE1 da\xF1ada.", "error");
    return;
  }
  if (!payload || payload.format !== "r-plus-backup" || payload.version !== 1 || !payload.data) {
    rt6.showToast("Formato de respaldo no v\xE1lido.", "error");
    return;
  }
  var n = (payload.data.patients || []).length;
  var result = await openConfirm({
    weight: "destructive",
    title: "\xBFRestaurar la copia guardada autom\xE1ticamente antes de la \xFAltima importaci\xF3n completa? (" + n + " pacientes). La aplicaci\xF3n se recargar\xE1.",
    confirmLabel: "Restaurar"
  });
  if (result !== "confirm") {
    return;
  }
  if (typeof pushUndoSnapshot === "function") rt6.pushUndoSnapshot("Antes de restaurar copia pre-importaci\xF3n");
  persistFullBackupPayload(payload).then(function() {
    addAuditEntry("preimport-restore", "ok", n, payload.exportedAt || "");
    location.reload();
  }).catch(function() {
    rt6.showToast("No se pudo restaurar la copia autom\xE1tica.", "error");
  });
}

// public/js/features/platform/import-backup/date-utils.mjs
function parseDateDMY(value) {
  var t = String(value || "").trim();
  var m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  var day = parseInt(m[1], 10);
  var month = parseInt(m[2], 10);
  var y = parseInt(m[3], 10);
  if (y < 100) y += 2e3;
  var d = new Date(y, month - 1, day);
  if (isNaN(d.getTime())) return null;
  if (d.getFullYear() !== y || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}
function parseDateRangePrompt(raw) {
  var txt = String(raw || "").trim();
  var m = txt.match(/^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+-\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})$/);
  if (!m) return null;
  var from = parseDateDMY(m[1]);
  var to = parseDateDMY(m[2]);
  if (!from || !to) return null;
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  if (from.getTime() > to.getTime()) return null;
  return { from, to, fromLabel: m[1], toLabel: m[2] };
}
function patientInDateRange(entry, range) {
  var nDate = entry && entry.note ? parseDateDMY(entry.note.fecha) : null;
  var iDate = entry && entry.indicaciones ? parseDateDMY(entry.indicaciones.fecha) : null;
  var nMs = nDate ? nDate.getTime() : null;
  var iMs = iDate ? iDate.getTime() : null;
  var min = range.from.getTime();
  var max = range.to.getTime();
  return nMs !== null && nMs >= min && nMs <= max || iMs !== null && iMs >= min && iMs <= max;
}

// public/js/features/platform/import-backup/import-core.mjs
var rt7 = getPlatformRuntime();
function askConflictAction(label) {
  if (typeof window !== "undefined" && window.__rpcPreferImportOverwrite === true) {
    return "overwrite";
  }
  var answer = prompt('Conflicto detectado para "' + label + '". Escribe: O = sobrescribir, D = duplicar, C = cancelar.', "O");
  var v = String(answer || "").trim().toUpperCase();
  if (v === "O") return "overwrite";
  if (v === "D") return "duplicate";
  return "cancel";
}
function copyImportClinicalData(patientId, entry) {
  getNotes()[patientId] = entry.note || {};
  getIndicaciones()[patientId] = entry.indicaciones || {};
  getLabHistory()[patientId] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  if (entry.medReceta) getMedRecetaByPatient()[patientId] = entry.medReceta;
  else delete getMedRecetaByPatient()[patientId];
  if (entry.medPharmProfile) getMedPharmProfileByPatient()[patientId] = entry.medPharmProfile;
  else delete getMedPharmProfileByPatient()[patientId];
}
function applyImportOverwrite(existing, entry) {
  existing.nombre = entry.patient.nombre || existing.nombre;
  existing.edad = entry.patient.edad || existing.edad;
  existing.sexo = entry.patient.sexo || existing.sexo;
  existing.area = entry.patient.area || existing.area;
  existing.servicio = entry.patient.servicio || existing.servicio;
  existing.cuarto = entry.patient.cuarto || existing.cuarto;
  existing.cama = entry.patient.cama || existing.cama;
  if (entry.patient.viaAcceso) existing.viaAcceso = entry.patient.viaAcceso;
  mergeCensoPatientFields(existing, entry.patient);
  mergePatientRegistrationMeta(existing, entry.patient);
  existing.registro = entry.patient.registro || existing.registro;
  mergePatientMonitoreoFromImported(existing, entry.patient);
  copyImportClinicalData(existing.id, entry);
  return existing.id;
}
function applyImportDuplicate(entry) {
  var newId = generatePatientId();
  var newPatient = {
    id: newId,
    nombre: ensureUniquePatientName(entry.patient.nombre || "PACIENTE SIN NOMBRE"),
    area: entry.patient.area || "",
    servicio: entry.patient.servicio || "",
    cuarto: entry.patient.cuarto || "",
    cama: entry.patient.cama || "",
    edad: entry.patient.edad || "",
    sexo: entry.patient.sexo || "F",
    registro: entry.patient.registro || "",
    fromLab: !!entry.patient.fromLab
  };
  mergePatientMonitoreoFromImported(newPatient, entry.patient);
  mergeCensoPatientFields(newPatient, entry.patient);
  mergePatientRegistrationMeta(newPatient, entry.patient);
  getPatients().unshift(newPatient);
  copyImportClinicalData(newId, entry);
  return newId;
}
function applyImportEntry(entry, action, existing) {
  if (action === "overwrite" && existing) return applyImportOverwrite(existing, entry);
  return applyImportDuplicate(entry);
}
function importEntriesWithConflicts(entries, actionLabel) {
  var out = { imported: 0, overwritten: 0, duplicated: 0, cancelled: false };
  var patientsBefore = JSON.parse(JSON.stringify(getPatients()));
  var notesBefore = JSON.parse(JSON.stringify(getNotes()));
  var indicacionesBefore = JSON.parse(JSON.stringify(getIndicaciones()));
  var labHistoryBefore = JSON.parse(JSON.stringify(getLabHistory()));
  var medRecetaBefore = JSON.parse(JSON.stringify(getMedRecetaByPatient()));
  var medPharmBefore = JSON.parse(JSON.stringify(getMedPharmProfileByPatient()));
  for (var i = 0; i < entries.length; i += 1) {
    var entry = entries[i];
    if (!entry || !entry.patient) continue;
    var reg = String(entry.patient.registro || "").trim();
    var exists = findPatientByRegistro(reg);
    if (exists) {
      var action = askConflictAction(entry.patient.nombre || reg || "sin nombre");
      if (action === "cancel") {
        out.cancelled = true;
        break;
      }
      applyImportEntry(entry, action, exists);
      if (action === "overwrite") out.overwritten += 1;
      if (action === "duplicate") out.duplicated += 1;
    } else {
      applyImportEntry(entry, "duplicate", null);
      out.imported += 1;
    }
  }
  if (out.cancelled) {
    setPatients(patientsBefore);
    setNotes(notesBefore);
    setIndicaciones(indicacionesBefore);
    setLabHistory(labHistoryBefore);
    setMedRecetaByPatient(medRecetaBefore);
    setMedPharmProfileByPatient(medPharmBefore);
  } else {
    persistClinicalState();
    renderPatientList();
  }
  addAuditEntry(
    actionLabel,
    out.cancelled ? "cancelled" : "ok",
    out.imported + out.overwritten + out.duplicated,
    "new:" + out.imported + ",overwrite:" + out.overwritten + ",duplicate:" + out.duplicated
  );
  return out;
}
function patientExportPayloadToEntry(payload) {
  return {
    patient: payload.patient,
    note: payload.note || {},
    indicaciones: payload.indicaciones || {},
    labHistory: Array.isArray(payload.labHistory) ? payload.labHistory : [],
    medReceta: payload.medReceta || null,
    medPharmProfile: payload.medPharmProfile || null
  };
}
function applySinglePatientExportPayload(payload) {
  var imported = payload.patient || {};
  var registro = String(imported.registro || "").trim();
  var existsByRegistro = findPatientByRegistro(registro);
  var entry = patientExportPayloadToEntry(payload);
  if (existsByRegistro) {
    applyImportEntry(entry, "overwrite", existsByRegistro);
    rt7.setActiveId(existsByRegistro.id);
    return registro;
  }
  var newId = applyImportEntry(entry, "duplicate", null);
  rt7.setActiveId(newId);
  return registro;
}
async function importPatientExportPayloads(payloads, sourceLabel) {
  if (!payloads || !payloads.length) {
    rt7.showToast("No hay pacientes para importar.", "error");
    return false;
  }
  if (payloads.length > 1) {
    var names = payloads.map(function(p) {
      return p.patient && p.patient.nombre || "Sin nombre";
    }).join(", ");
    var multiResult = await openConfirm({
      weight: "destructive",
      title: "Se importar\xE1n " + payloads.length + " pacientes: " + names + ". Si ya existen por registro, se preguntar\xE1 qu\xE9 hacer con cada uno. \xBFContinuar?",
      confirmLabel: "Continuar"
    });
    if (multiResult !== "confirm") {
      return false;
    }
    if (typeof pushUndoSnapshot === "function") {
      rt7.pushUndoSnapshot("Importar pacientes demo (" + payloads.length + ")");
    }
    var entries = payloads.map(patientExportPayloadToEntry);
    var res = importEntriesWithConflicts(entries, "backup-patient-import");
    if (res.cancelled) {
      rt7.showToast("Importaci\xF3n cancelada", "error");
      return false;
    }
    rt7.showToast(
      "Pacientes importados: " + (res.imported + res.overwritten + res.duplicated),
      "success"
    );
    if (rt7.getActiveId()) selectPatient(rt7.getActiveId());
    return true;
  }
  var payload = payloads[0];
  var imported = payload.patient || {};
  var registro = String(imported.registro || "").trim();
  var existsByRegistro = findPatientByRegistro(registro);
  var msg = existsByRegistro ? "Ya existe un paciente con el registro " + registro + ". Esto sobrescribir\xE1 su nota, indicaciones y labs. \xBFContinuar?" : 'Se importar\xE1 el paciente "' + (imported.nombre || "Sin nombre") + '". \xBFContinuar?';
  var singleResult = await openConfirm({
    weight: "destructive",
    title: msg,
    confirmLabel: "Continuar"
  });
  if (singleResult !== "confirm") return false;
  applySinglePatientExportPayload(payload);
  persistClinicalState();
  renderPatientList();
  if (rt7.getActiveId()) selectPatient(rt7.getActiveId());
  addAuditEntry("backup-patient-import", "ok", 1, (sourceLabel || "") + registro);
  rt7.showToast("Paciente importado correctamente.", "success");
  return true;
}

// public/js/features/platform/import-backup/export-backup.mjs
var rt8 = getPlatformRuntime();
async function exportDataBackup() {
  await persistClinicalState({ immediate: true });
  var payload = buildFullBackupPayload();
  var n = (payload.data.patients || []).length;
  downloadJsonPayload(payload, "R-plus-respaldo-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json");
  addAuditEntry("backup-full-export", "ok", n, "");
  if (n === 0) {
    rt8.showToast(
      "Respaldo descargado sin pacientes. Si esperabas datos, revisa la lista y exporta de nuevo.",
      "error"
    );
  } else {
    rt8.showToast("Respaldo descargado (" + n + " paciente" + (n === 1 ? "" : "s") + ")", "success");
  }
}
function exportActivePatientBackup() {
  var aid = rt8.getActiveId();
  if (!aid) {
    rt8.showToast("Selecciona un paciente en la lista.", "error");
    return;
  }
  if (isTourDemoPatientId(aid, getPatients())) {
    rt8.showToast("El paciente de demostraci\xF3n no se exporta.", "error");
    return;
  }
  var patient = getPatients().find(function(p) {
    return p.id === aid;
  });
  if (!patient) return;
  persistClinicalState();
  var payload = {
    format: "r-plus-patient-export",
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null,
    patient,
    note: getNotes()[aid] || null,
    indicaciones: getIndicaciones()[aid] || null,
    labHistory: getLabHistory()[aid] || [],
    medReceta: getMedRecetaByPatient()[aid] || null,
    medPharmProfile: getMedPharmProfileByPatient()[aid] || null
  };
  downloadJsonPayload(payload, "R-plus-paciente-" + safeExportSlug(patient.nombre) + "-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json");
  addAuditEntry("backup-patient-export", "ok", 1, String(patient.registro || ""));
  rt8.showToast("Paciente exportado", "success");
}
function exportRangeBackupPrompt() {
  var raw = prompt("Rango de fechas (dd/mm/yyyy - dd/mm/yyyy):", "");
  if (raw == null) return;
  var range = parseDateRangePrompt(raw);
  if (!range) {
    rt8.showToast("Rango inv\xE1lido. Usa dd/mm/yyyy - dd/mm/yyyy", "error");
    return;
  }
  var entries = [];
  getPatients().forEach(function(p) {
    var entry = buildPatientEntry(p.id);
    if (entry && patientInDateRange(entry, range)) entries.push(entry);
  });
  if (!entries.length) {
    rt8.showToast("No hay pacientes en ese rango.", "error");
    return;
  }
  var payload = {
    format: "r-plus-range-export",
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    from: range.fromLabel,
    to: range.toLabel,
    entries
  };
  downloadJsonPayload(payload, "R-plus-rango-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json");
  addAuditEntry("range-export", "ok", entries.length, payload.from + " a " + payload.to);
  rt8.showToast("Rango exportado", "success");
}

// public/js/features/platform/import-backup/export-patients-selection.mjs
function buildPatientsSelectionExportPayload(patientIds) {
  var entries = [];
  for (var i = 0; i < patientIds.length; i += 1) {
    var entry = buildPatientEntry(patientIds[i]);
    if (entry) entries.push(entry);
  }
  var n = entries.length;
  return {
    format: "r-plus-range-export",
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    from: "Selecci\xF3n manual",
    to: n + " paciente" + (n === 1 ? "" : "s"),
    entries
  };
}
function sortPatientsForExportPicker(list) {
  return list.slice().sort(function(a, b) {
    var ca = String(a.cuarto || "");
    var cb = String(b.cuarto || "");
    if (ca !== cb) return ca.localeCompare(cb, "es", { numeric: true });
    var ka = String(a.cama || "");
    var kb = String(b.cama || "");
    if (ka !== kb) return ka.localeCompare(kb, "es", { numeric: true });
    return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
  });
}

// public/js/features/platform/import-backup/export-patients-modal.mjs
var rt9 = getPlatformRuntime();
function exportablePatientsForPicker() {
  var visible = patientsVisibleInSidebar();
  var source = visible.length ? visible : getPatients();
  return sortPatientsForExportPicker(
    source.filter(function(p) {
      return p && p.id && !isTourDemoPatientId(p.id, getPatients());
    })
  );
}
function patientPickerLabel(p) {
  var bed = [p.cuarto, p.cama].filter(Boolean).join("-");
  var reg = p.registro ? " \u2022 " + p.registro : "";
  var archived = p.archived ? " (archivado)" : "";
  return (bed ? bed + " \u2014 " : "") + (p.nombre || "Sin nombre") + reg + archived;
}
function selectedPatientIdsFromBackdrop(backdrop) {
  var ids = [];
  backdrop.querySelectorAll(".export-patients-cb:checked").forEach(function(cb) {
    var pid = cb.getAttribute("data-patient-id");
    if (pid) ids.push(pid);
  });
  return ids;
}
function syncExportPatientsActions(backdrop) {
  var countEl = backdrop.querySelector("#export-patients-count");
  var exportBtn = backdrop.querySelector("#export-patients-ok");
  var ids = selectedPatientIdsFromBackdrop(backdrop);
  var n = ids.length;
  if (countEl) {
    countEl.textContent = n === 0 ? "Ning\xFAn paciente seleccionado" : n + " paciente" + (n === 1 ? "" : "s") + " seleccionado" + (n === 1 ? "" : "s");
  }
  if (exportBtn) {
    exportBtn.disabled = n === 0;
    exportBtn.setAttribute("aria-disabled", n === 0 ? "true" : "false");
    exportBtn.style.opacity = n === 0 ? "0.55" : "";
    exportBtn.style.cursor = n === 0 ? "not-allowed" : "pointer";
  }
}
function closeExportPatientsModal(backdrop) {
  if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
}
function buildExportPatientsListHtml(candidates, activeId) {
  return candidates.map(function(p) {
    var checked = p.id === activeId ? " checked" : "";
    return '<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" class="export-patients-cb" data-patient-id="' + esc(p.id) + '"' + checked + ' style="margin-top:3px;flex-shrink:0;" /><span>' + esc(patientPickerLabel(p)) + "</span></label></li>";
  }).join("");
}
function runExportPatientsSelection(patientIds) {
  persistClinicalState();
  var payload = buildPatientsSelectionExportPayload(patientIds);
  if (!payload.entries.length) {
    rt9.showToast("No hay pacientes exportables en la selecci\xF3n.", "error");
    return;
  }
  downloadJsonPayload(payload, "R-plus-pacientes-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json");
  addAuditEntry("selection-export", "ok", payload.entries.length, payload.to);
  rt9.showToast(
    "Exportados " + payload.entries.length + " paciente" + (payload.entries.length === 1 ? "" : "s"),
    "success"
  );
}
function wireExportPatientsModal(backdrop, candidates) {
  var ordered = candidates;
  backdrop.querySelector("#export-patients-all")?.addEventListener("click", function() {
    backdrop.querySelectorAll(".export-patients-cb").forEach(function(cb) {
      cb.checked = true;
    });
    syncExportPatientsActions(backdrop);
  });
  backdrop.querySelector("#export-patients-none")?.addEventListener("click", function() {
    backdrop.querySelectorAll(".export-patients-cb").forEach(function(cb) {
      cb.checked = false;
    });
    syncExportPatientsActions(backdrop);
  });
  backdrop.querySelector("#export-patients-cancel")?.addEventListener("click", function() {
    closeExportPatientsModal(backdrop);
  });
  backdrop.addEventListener("change", function(ev) {
    if (ev.target && ev.target.classList && ev.target.classList.contains("export-patients-cb")) {
      syncExportPatientsActions(backdrop);
    }
  });
  backdrop.querySelector("#export-patients-ok")?.addEventListener("click", function() {
    var ids = selectedPatientIdsFromBackdrop(backdrop);
    if (!ids.length) return;
    closeExportPatientsModal(backdrop);
    runExportPatientsSelection(ids);
  });
  backdrop.addEventListener("click", function(ev) {
    if (ev.target === backdrop) closeExportPatientsModal(backdrop);
  });
  syncExportPatientsActions(backdrop);
  if (!ordered.length) {
    var exportBtn = backdrop.querySelector("#export-patients-ok");
    if (exportBtn) exportBtn.disabled = true;
  }
}
function openExportPatientsModal() {
  var candidates = exportablePatientsForPicker();
  var listHtml = candidates.length ? buildExportPatientsListHtml(candidates, rt9.getActiveId()) : '<li style="font-size:13px;color:var(--text-muted);">No hay pacientes exportables en el censo visible.</li>';
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px;";
  backdrop.innerHTML = '<div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;"><h3 style="margin:0 0 8px;">Exportar pacientes</h3><p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca los pacientes que quieres incluir. El archivo JSON se puede importar con <strong>Importar paciente\u2026</strong> o <strong>Importar rango\u2026</strong>.</p><div style="overflow-y:auto;flex:0 1 auto;max-height:42vh;padding-right:4px;"><ul style="margin:0;padding-left:0;list-style:none;font-size:13px;">' + listHtml + '</ul></div><p id="export-patients-count" style="font-size:12px;color:var(--text-muted);margin:10px 0 6px;">Ning\xFAn paciente seleccionado</p><div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;"><button type="button" id="export-patients-none" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Quitar todos</button><button type="button" id="export-patients-all" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Seleccionar todos</button><button type="button" id="export-patients-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button><button type="button" id="export-patients-ok" disabled aria-disabled="true" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Exportar JSON\u2026</button></div></div>';
  document.body.appendChild(backdrop);
  wireExportPatientsModal(backdrop, candidates);
}

// public/js/patient-export-payloads.mjs
var RANGE_EXPORT_FORMAT = "r-plus-range-export";
function resolveDemoBundle(root) {
  if (root.format !== DEMO_BUNDLE_FORMAT || Number(root.version) !== PATIENT_EXPORT_VERSION || !Array.isArray(root.patients)) {
    return [];
  }
  return root.patients.flatMap(function(item) {
    return resolvePatientImportPayloadsInner(item);
  });
}
function resolveRangeExport(root) {
  if (root.format !== RANGE_EXPORT_FORMAT || !Array.isArray(root.entries)) return [];
  const payloads = [];
  for (const entry of root.entries) {
    const normalized = entryToPatientExportPayload(
      /** @type {Record<string, unknown>} */
      entry
    );
    if (normalized) payloads.push(normalized);
  }
  return payloads;
}
function resolvePatientImportPayloadsInner(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap(function(item) {
      return resolvePatientImportPayloadsInner(item);
    });
  }
  if (typeof raw !== "object") return [];
  const root = (
    /** @type {Record<string, unknown>} */
    raw
  );
  if (isRPlusPatientExportPayload(root)) return [root];
  if (!root.format && root.patient) {
    const normalized = entryToPatientExportPayload(root);
    return normalized ? [normalized] : [];
  }
  const demo = resolveDemoBundle(root);
  if (demo.length) return demo;
  return resolveRangeExport(root);
}
function resolvePatientImportPayloads(raw) {
  return resolvePatientImportPayloadsInner(raw);
}

// public/js/patient-export-format.mjs
var PATIENT_EXPORT_FORMAT = "r-plus-patient-export";
var PATIENT_EXPORT_VERSION = 1;
var DEMO_BUNDLE_FORMAT = "r-plus-pitch-demo-bundle";
var RANGE_EXPORT_FORMAT2 = "r-plus-range-export";
function stripJsonBom(text) {
  const s = String(text == null ? "" : text);
  if (s.charCodeAt(0) === 65279) return s.slice(1);
  return s;
}
function entryToPatientExportPayload(entry) {
  if (!entry || typeof entry !== "object" || !entry.patient || typeof entry.patient !== "object") {
    return null;
  }
  if (Array.isArray(entry.patient)) return null;
  return {
    format: PATIENT_EXPORT_FORMAT,
    version: PATIENT_EXPORT_VERSION,
    exportedAt: typeof entry.exportedAt === "string" ? entry.exportedAt : (/* @__PURE__ */ new Date()).toISOString(),
    appVersion: entry.appVersion != null ? entry.appVersion : null,
    patient: entry.patient,
    note: entry.note != null ? entry.note : null,
    indicaciones: entry.indicaciones != null ? entry.indicaciones : null,
    labHistory: Array.isArray(entry.labHistory) ? entry.labHistory : [],
    medReceta: entry.medReceta != null ? entry.medReceta : null
  };
}
function isRPlusPatientExportPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  const p = (
    /** @type {Record<string, unknown>} */
    payload
  );
  if (p.format !== PATIENT_EXPORT_FORMAT) return false;
  if (Number(p.version) !== PATIENT_EXPORT_VERSION) return false;
  if (!p.patient || typeof p.patient !== "object" || Array.isArray(p.patient)) return false;
  return true;
}
function parsePatientImportJsonText(text) {
  const trimmed = stripJsonBom(text).trim();
  const parsed = JSON.parse(trimmed);
  return { parsed, payloads: resolvePatientImportPayloads(parsed) };
}
function describePatientImportRejection(raw) {
  if (raw == null) {
    return "El archivo est\xE1 vac\xEDo o no es JSON.";
  }
  if (typeof raw !== "object") {
    return "El archivo no contiene un objeto JSON v\xE1lido.";
  }
  if (Array.isArray(raw)) {
    return "Es una lista JSON; usa un solo objeto de exportaci\xF3n o el bundle demo.";
  }
  const root = (
    /** @type {Record<string, unknown>} */
    raw
  );
  const format = String(root.format || "(sin format)");
  if (format === DEMO_BUNDLE_FORMAT) {
    const n = Array.isArray(root.patients) ? root.patients.length : 0;
    if (!n) return 'Bundle demo sin pacientes en el arreglo "patients".';
    return "Bundle demo: actualiza R+ (npm run build:ui) o usa demo-perez.json.";
  }
  if (format === "r-plus-backup") {
    return "Es un respaldo completo. Usa \xABImportar copia de seguridad\u2026\xBB, no \xABImportar paciente\u2026\xBB.";
  }
  if (format === "r-plus-purge-ghosts-backup") {
    return "Es un respaldo de fantasmas (formato anterior). Usa \xABImportar copia de seguridad\u2026\xBB.";
  }
  if (format === RANGE_EXPORT_FORMAT2) {
    return "Es export por rango: tambi\xE9n puedes usar \xABImportar paciente\u2026\xBB (versi\xF3n reciente) o \xABImportar rango\u2026\xBB.";
  }
  if (!root.format && root.patient) {
    return 'Tiene "patient" pero falta format; vuelve a generar con npm run export:demo-patients.';
  }
  return 'Se esperaba format "' + PATIENT_EXPORT_FORMAT + '" v' + PATIENT_EXPORT_VERSION + ' con patient; se encontr\xF3 "' + format + '".';
}

// public/js/features/platform/import-backup/backup-host-merge.mjs
var PURGE_GHOSTS_FORMAT = "r-plus-purge-ghosts-backup";
function collectHostBundleEntries(bundleEntriesByRoom) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const entries of Object.values(bundleEntriesByRoom || {})) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const pid = String(entry?.patient?.id || "").trim();
      if (!pid || pid.indexOf("demo-") === 0 || seen.has(pid)) continue;
      seen.add(pid);
      out.push(entry);
    }
  }
  return out;
}
function patientPresenceIndex(patients) {
  const byId = /* @__PURE__ */ new Set();
  const byRegistro = /* @__PURE__ */ new Set();
  for (const p of patients || []) {
    if (!p?.id) continue;
    byId.add(String(p.id));
    const reg = String(p.registro || "").trim();
    if (reg) byRegistro.add(reg);
  }
  return { byId, byRegistro };
}
function isPatientAlreadyPresent(patient, index) {
  const id = String(patient?.id || "").trim();
  const reg = String(patient?.registro || "").trim();
  if (id && index.byId.has(id)) return true;
  return !!(reg && index.byRegistro.has(reg));
}
function cloneObjectMap(value) {
  return value && typeof value === "object" ? { ...value } : {};
}
function cloneBackupDataMaps(data) {
  return {
    patients: Array.isArray(data.patients) ? data.patients.slice() : [],
    notes: cloneObjectMap(data.notes),
    indicaciones: cloneObjectMap(data.indicaciones),
    labHistory: cloneObjectMap(data.labHistory),
    medRecetaByPatient: cloneObjectMap(data.medRecetaByPatient),
    medPharmProfileByPatient: cloneObjectMap(data.medPharmProfileByPatient),
    listadoProblemas: cloneObjectMap(data.listadoProblemas),
    scheduledProcedures: Array.isArray(data.scheduledProcedures) ? data.scheduledProcedures.slice() : [],
    settings: cloneObjectMap(data.settings),
    medCatalog: cloneObjectMap(data.medCatalog)
  };
}
function mergeHostBundleEntriesIntoBackupData(data, bundleEntriesByRoom) {
  if (!data || typeof data !== "object") return data;
  const merged = cloneBackupDataMaps(data);
  const index = patientPresenceIndex(merged.patients);
  for (const entry of collectHostBundleEntries(bundleEntriesByRoom)) {
    const patient = entry.patient;
    if (!patient?.id || isPatientAlreadyPresent(patient, index)) continue;
    const pid = String(patient.id);
    merged.patients.push(patient);
    index.byId.add(pid);
    const reg = String(patient.registro || "").trim();
    if (reg) index.byRegistro.add(reg);
    if (entry.note) merged.notes[pid] = entry.note;
    if (entry.indicaciones) merged.indicaciones[pid] = entry.indicaciones;
    if (Array.isArray(entry.labHistory)) merged.labHistory[pid] = entry.labHistory;
    if (entry.medReceta) merged.medRecetaByPatient[pid] = entry.medReceta;
    if (entry.medPharmProfile) merged.medPharmProfileByPatient[pid] = entry.medPharmProfile;
    if (entry.listadoProblemas) merged.listadoProblemas[pid] = entry.listadoProblemas;
  }
  return merged;
}
function normalizeFullBackupImportPayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.format === "r-plus-backup" && raw.version === 1 && raw.data) {
    return raw;
  }
  if (raw.format !== PURGE_GHOSTS_FORMAT || raw.version !== 1 || !raw.local) {
    return null;
  }
  const local = raw.local;
  if (local.format !== "r-plus-backup" || local.version !== 1 || !local.data) {
    return null;
  }
  const bundles = raw.host?.bundleEntriesByRoom || {};
  return {
    ...local,
    exportedAt: raw.exportedAt || local.exportedAt,
    data: mergeHostBundleEntriesIntoBackupData(local.data, bundles)
  };
}

// public/js/features/platform/import-backup/import-handlers.mjs
var rt10 = getPlatformRuntime();
function triggerImportRangeBackup() {
  var input = document.getElementById("range-backup-file-input");
  if (input) input.click();
}
function onRangeBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function() {
    try {
      var payload = JSON.parse(reader.result);
      if (!payload || payload.format !== "r-plus-range-export" || payload.version !== 1 || !Array.isArray(payload.entries)) {
        rt10.showToast("Archivo de rango inv\xE1lido.", "error");
        return;
      }
      if (typeof pushUndoSnapshot === "function") rt10.pushUndoSnapshot("Importar rango (" + payload.entries.length + ")");
      var res = importEntriesWithConflicts(payload.entries, "range-import");
      if (res.cancelled) {
        rt10.showToast("Importaci\xF3n cancelada", "error");
      } else {
        rt10.showToast("Rango importado: " + (res.imported + res.overwritten + res.duplicated), "success");
      }
    } catch {
      rt10.showToast("No se pudo leer el archivo de rango.", "error");
      addAuditEntry("range-import", "error", 0, "read-error");
    }
  };
  reader.readAsText(f);
}
function triggerImportBackup() {
  document.getElementById("backup-file-input").click();
}
function triggerImportActivePatientBackup() {
  var input = document.getElementById("patient-backup-file-input");
  if (input) input.click();
}
function onPatientBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  var reader = new FileReader();
  reader.onload = async function() {
    try {
      var result = parsePatientImportJsonText(reader.result);
      var parsed = result.parsed;
      var payloads = result.payloads;
      if (!payloads.length) {
        rt10.showToast(
          "El archivo no es una exportaci\xF3n v\xE1lida de paciente. " + describePatientImportRejection(parsed),
          "error"
        );
        return;
      }
      await importPatientExportPayloads(payloads, f.name + ":");
    } catch {
      rt10.showToast("No se pudo leer la exportaci\xF3n de paciente.", "error");
      addAuditEntry("backup-patient-import", "error", 0, "read-error");
    }
  };
  reader.readAsText(f);
}
async function importBundledDemoPatients() {
  var files = ["demo-perez.json"];
  var payloads = [];
  for (var i = 0; i < files.length; i += 1) {
    var name = files[i];
    try {
      var res = await fetch("demo-patients/" + name, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var result = parsePatientImportJsonText(await res.text());
      payloads = payloads.concat(result.payloads);
    } catch {
      rt10.showToast(
        "No se encontr\xF3 " + name + " en la app. Regenera con npm run export:demo-patients y npm run build:ui.",
        "error"
      );
      return;
    }
  }
  if (!payloads.length) {
    rt10.showToast("Los JSON demo no tienen formato de importaci\xF3n v\xE1lido.", "error");
    return;
  }
  await importPatientExportPayloads(payloads, "bundled:");
}
function importBundledDemoPerez() {
  importBundledDemoPatients();
}
function buildFullBackupConfirmMsg(n) {
  var confirmMsg = "Esto reemplaza todos los pacientes y datos locales en esta computadora (" + n + " pacientes en el archivo). No se puede deshacer.";
  if (n === 0) {
    confirmMsg += "\n\nEl archivo no trae pacientes (solo ajustes/plantillas). Si esperabas pacientes, pide un respaldo nuevo desde el equipo origen.";
  }
  return confirmMsg + "\n\n\xBFContinuar?";
}
function reportFullBackupImportError(err) {
  var code = err && err.message;
  if (code === "SAVE_FAILED" || code === "QUOTA_EXCEEDED") {
    rt10.showToast(
      "No se pudo guardar el respaldo: almacenamiento local lleno. Libera espacio e intenta de nuevo.",
      "error"
    );
  } else {
    rt10.showToast("No se pudo leer el respaldo", "error");
  }
  addAuditEntry("backup-full-import", "error", 0, code || "read-error");
}
async function processFullBackupFile(rawPayload) {
  const payload = normalizeFullBackupImportPayload(rawPayload);
  if (!payload) {
    rt10.showToast("El archivo no es un respaldo v\xE1lido de R+", "error");
    return;
  }
  var n = (payload.data.patients || []).length;
  var result = await openConfirm({
    weight: "destructive",
    title: buildFullBackupConfirmMsg(n),
    confirmLabel: "Continuar"
  });
  if (result !== "confirm") return;
  if (typeof pushUndoSnapshot === "function") rt10.pushUndoSnapshot("Importar respaldo completo");
  await persistClinicalState({ immediate: true });
  try {
    localStorage.setItem("rpc-preimport-backup", JSON.stringify(buildFullBackupPayload()));
  } catch (_e) {
    void _e;
  }
  await persistFullBackupPayload(payload);
  addAuditEntry("backup-full-import", "ok", n, "");
  rt10.showToast(
    "Respaldo importado (" + n + " paciente" + (n === 1 ? "" : "s") + "). Recargando\u2026",
    "success"
  );
  location.reload();
}
function onBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  var reader = new FileReader();
  reader.onload = async function() {
    try {
      await processFullBackupFile(JSON.parse(reader.result));
    } catch (err) {
      reportFullBackupImportError(err);
    }
  };
  reader.readAsText(f);
}

// public/js/features/platform/import-backup/sync-crypto.mjs
var rt11 = getPlatformRuntime();
function bytesToBase64(bytes) {
  var binary = "";
  for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToBytes(base64) {
  var binary = atob(base64);
  var out = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}
async function encryptSyncPayload(obj, passphrase) {
  if (!window.crypto || !window.crypto.subtle) throw new Error("WebCrypto no disponible");
  var enc = new TextEncoder();
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  var key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 12e4, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  var plain = enc.encode(JSON.stringify(obj));
  var encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    encrypted: true,
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: 12e4,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted))
  };
}
async function decryptSyncPayload(payload, passphrase) {
  if (!window.crypto || !window.crypto.subtle) throw new Error("WebCrypto no disponible");
  var enc = new TextEncoder();
  var dec = new TextDecoder();
  var keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  var key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: base64ToBytes(payload.salt), iterations: payload.iterations || 12e4, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  var plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext)
  );
  return JSON.parse(dec.decode(plainBuffer));
}
function collectSyncEntries() {
  var entries = [];
  getPatients().forEach(function(p) {
    var entry = buildPatientEntry(p.id);
    if (entry) entries.push(entry);
  });
  return entries;
}
async function exportSyncBundlePrompt() {
  var entries = collectSyncEntries();
  if (!entries.length) {
    rt11.showToast("No hay datos para sincronizar.", "error");
    return;
  }
  var passphrase = prompt("Passphrase opcional para cifrar (deja vac\xEDo para sin cifrado):", "");
  var base = {
    format: "r-plus-sync-bundle",
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null
  };
  if (passphrase && String(passphrase).trim()) {
    try {
      base.payload = await encryptSyncPayload({ entries }, String(passphrase));
    } catch {
      rt11.showToast("No se pudo cifrar: WebCrypto no disponible.", "error");
      addAuditEntry("sync-export", "error", 0, "crypto-unavailable");
      return;
    }
  } else {
    base.payload = { encrypted: false, entries };
  }
  downloadJsonPayload(base, "R-plus-sync-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json");
  addAuditEntry("sync-export", "ok", entries.length, base.payload.encrypted ? "encrypted" : "plain");
  rt11.showToast("Paquete sync exportado", "success");
}
function triggerImportSyncBundle() {
  var input = document.getElementById("sync-bundle-file-input");
  if (input) input.click();
}
function onSyncBundleFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  var reader = new FileReader();
  reader.onload = async function() {
    try {
      var bundle = JSON.parse(reader.result);
      if (!bundle || bundle.format !== "r-plus-sync-bundle" || bundle.version !== 1 || !bundle.payload) {
        rt11.showToast("Paquete sync inv\xE1lido.", "error");
        return;
      }
      var data = bundle.payload;
      if (data.encrypted) {
        var passphrase = prompt("Este paquete est\xE1 cifrado. Ingresa la passphrase:", "");
        if (!passphrase) {
          rt11.showToast("Importaci\xF3n cancelada.", "error");
          addAuditEntry("sync-import", "cancelled", 0, "no-passphrase");
          return;
        }
        data = await decryptSyncPayload(data, passphrase);
      }
      if (!data || !Array.isArray(data.entries)) {
        rt11.showToast("Contenido sync inv\xE1lido.", "error");
        addAuditEntry("sync-import", "error", 0, "invalid-content");
        return;
      }
      if (typeof pushUndoSnapshot === "function") rt11.pushUndoSnapshot("Importar paquete sync (" + data.entries.length + ")");
      var res = importEntriesWithConflicts(data.entries, "sync-import");
      if (res.cancelled) rt11.showToast("Sync cancelado", "error");
      else rt11.showToast("Sync importado: " + (res.imported + res.overwritten + res.duplicated), "success");
    } catch {
      rt11.showToast("No se pudo importar el paquete sync.", "error");
      addAuditEntry("sync-import", "error", 0, "read-error");
    }
  };
  reader.readAsText(f);
}

// public/js/features/platform/updater/modal-ui.mjs
function resetUpdateCheckButtons() {
  ["settings-check-updates-btn", "settings-repair-update-btn", "min-version-check-btn"].forEach(
    function(id) {
      setAsyncButtonLoading(document.getElementById(id), false);
    }
  );
}
function getUpdateSnoozeUntil() {
  var raw = localStorage.getItem(UPDATE_SNOOZE_KEY);
  var n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}
function setUpdateSnooze(hours) {
  var h = hours || 24;
  localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + h * 36e5));
}
function isSnoozeActiveForVersion(version) {
  var dismissed = localStorage.getItem(UPDATE_DISMISS_VER_KEY);
  if (dismissed !== version) return false;
  return Date.now() < getUpdateSnoozeUntil();
}
function markDismissedVersion(version) {
  localStorage.setItem(UPDATE_DISMISS_VER_KEY, version || "");
  setUpdateSnooze(24);
}
function showUpdateModal() {
  var el = document.getElementById("update-modal-backdrop");
  if (!el) return;
  el.style.display = "flex";
  el.setAttribute("aria-hidden", "false");
  var modal = document.getElementById("update-modal");
  if (modal) setTimeout(function() {
    try {
      modal.focus();
    } catch (_e) {
      void _e;
    }
  }, 50);
}
function hideUpdateModal() {
  if (updaterState.updateModalMode === "downgrade" && window.electronAPI && window.electronAPI.resetUpdateFeed) {
    try {
      window.electronAPI.resetUpdateFeed();
    } catch (_e) {
      void _e;
    }
  }
  updaterState.updateModalMode = "upgrade";
  updaterState.pendingDowngradeVersion = null;
  var el = document.getElementById("update-modal-backdrop");
  if (!el) return;
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}
function resetUpdateModalPanels() {
  var err = document.getElementById("update-modal-error");
  var wrap = document.getElementById("update-modal-progress-wrap");
  if (err) {
    err.style.display = "none";
    err.textContent = "";
  }
  if (wrap) wrap.style.display = "block";
}
function stripHtmlToPlainText(html) {
  if (html == null || html === "") return "";
  var raw = String(html).trim();
  if (!raw) return "";
  try {
    var doc = new DOMParser().parseFromString(raw, "text/html");
    var t = doc.body && doc.body.textContent ? doc.body.textContent : "";
    t = t.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
    if (t) return t;
  } catch {
  }
  return raw.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}
function renderUpdateError(msg) {
  resetUpdateModalPanels();
  var box = document.getElementById("update-modal-error");
  var state = document.getElementById("update-modal-state");
  var wrap = document.getElementById("update-modal-progress-wrap");
  var label = document.getElementById("update-modal-progress-label");
  var pill = document.getElementById("update-modal-version-pill");
  var notes = document.getElementById("update-modal-notes");
  var safeMsg = sanitizeUpdaterUserMessage(
    msg,
    "No se pudo completar la actualizaci\xF3n. Prueba de nuevo o instala desde GitHub."
  );
  if (box) {
    box.style.display = "block";
    box.textContent = safeMsg;
  }
  if (state) state.textContent = "";
  if (wrap) wrap.style.display = "none";
  if (label) label.textContent = "";
  if (pill) pill.style.display = "none";
  if (notes) notes.textContent = "";
  var title = document.getElementById("update-modal-title");
  if (title && title.firstChild && title.firstChild.nodeType === 3) {
    title.firstChild.textContent = "Actualizaciones";
  }
  var actions = document.getElementById("update-modal-actions-primary");
  var sec = document.getElementById("update-modal-actions-secondary");
  if (actions) {
    actions.innerHTML = "";
    var retry = document.createElement("button");
    retry.className = "btn-primary";
    retry.textContent = "Reintentar";
    retry.onclick = function() {
      resetUpdateModalPanels();
      if (window.electronAPI && window.electronAPI.checkForUpdates) window.electronAPI.checkForUpdates();
      hideUpdateModal();
    };
    actions.appendChild(retry);
  }
  if (sec) sec.innerHTML = "";
  showUpdateModal();
}

// public/js/features/platform/updater/version-compare.mjs
function compareSemver(a, b) {
  function parse(v) {
    var m = String(v == null ? "" : v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-.+].*)?$/);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  }
  var pa = parse(a);
  var pb = parse(b);
  if (!pa || !pb) return 0;
  for (var i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

// lib/update-feed.mjs
var UPDATE_WORKER_URL = "https://rmas-update-feed.rmas-workersdev.workers.dev/";

// public/js/min-version-fetch.mjs
var REMOTE_MIN_VERSION_URL = "https://raw.githubusercontent.com/mausalas99/r-mas/main/min-version.json";
async function fetchMinVersionPayload() {
  if (typeof fetch !== "function") return null;
  const urls = [`${UPDATE_WORKER_URL}min-version.json`, REMOTE_MIN_VERSION_URL, "/min-version.json"];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && typeof data === "object" && data.minVersion) {
        return {
          minVersion: String(data.minVersion),
          message: data.message ? String(data.message) : void 0
        };
      }
    } catch {
    }
  }
  return null;
}

// lib/update-downgrade.mjs
var GITHUB_RELEASES_BASE = "https://github.com/mausalas99/r-mas/releases/download";
var STABLE_VERSIONS_RAW_URL = "https://raw.githubusercontent.com/mausalas99/r-mas/main/stable-versions.json";
function parseSemverCore(version) {
  const m = String(version || "").trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-.+].*)?$/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}
function compareSemverCore(a, b) {
  const pa = parseSemverCore(a);
  const pb = parseSemverCore(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}
function isValidDowngradeTargetVersion(target, current) {
  if (!parseSemverCore(target) || !parseSemverCore(current)) return false;
  return compareSemverCore(target, current) < 0;
}
function pickMacArch(arch) {
  return arch === "arm64" ? "arm64" : "x64";
}
function buildManualInstallerUrl(version, platform, arch) {
  const v = String(version || "").replace(/^v/, "");
  if (!parseSemverCore(v)) throw new Error(`Versi\xF3n inv\xE1lida: ${version}`);
  const macArch = pickMacArch(arch);
  let fileName;
  if (platform === "darwin") {
    fileName = `R+-${v}-${macArch}.dmg`;
  } else if (platform === "win32") {
    fileName = `R+-${v}-x64.exe`;
  } else {
    throw new Error(`Plataforma no soportada: ${platform}`);
  }
  return `${GITHUB_RELEASES_BASE}/v${v}/${fileName}`;
}
function filterDowngradeCandidates(entries, currentVersion) {
  const list = Array.isArray(entries) ? entries : [];
  return list.filter((e) => e && isValidDowngradeTargetVersion(e.version, currentVersion)).sort((a, b) => compareSemverCore(b.version, a.version));
}

// public/js/features/platform/updater/min-version.mjs
function resolveDownloadUrl(version, platform, arch) {
  try {
    return buildManualInstallerUrl(version, platform, arch);
  } catch (_e) {
    return RELEASES_LATEST_URL;
  }
}
function downloadLabel(platform, arch) {
  if (platform === "darwin") {
    return pickMacArch(arch) === "arm64" ? "Descargar \u2014 Mac Apple Silicon" : "Descargar \u2014 Mac Intel";
  }
  if (platform === "win32") return "Descargar \u2014 Windows";
  return "Descargar desde GitHub";
}
function openUrl(url) {
  if (window.electronAPI && typeof window.electronAPI.openExternal === "function") {
    window.electronAPI.openExternal(url);
  } else {
    try {
      window.open(url, "_blank");
    } catch (_e) {
      void _e;
    }
  }
}
function showMinVersionBlockingModal(current, minVersion, message, platformInfo) {
  var bd = document.getElementById("min-version-backdrop");
  if (!bd) return;
  var meta = document.getElementById("min-version-meta");
  var msg = document.getElementById("min-version-message");
  if (msg && message) msg.textContent = String(message);
  if (meta) {
    meta.textContent = "Versi\xF3n actual: v" + current + " \xB7 M\xEDnima soportada: v" + minVersion;
  }
  var platform = platformInfo && platformInfo.platform;
  var arch = platformInfo && platformInfo.arch;
  var directUrl = platform ? resolveDownloadUrl(minVersion, platform, arch || "x64") : null;
  var checkBtn = document.getElementById("min-version-check-btn");
  var relBtn = document.getElementById("min-version-releases-btn");
  if (checkBtn) {
    checkBtn.onclick = function() {
      if (window.electronAPI && typeof window.electronAPI.checkForUpdates === "function") {
        setAsyncButtonLoading(checkBtn, true, { loadingText: "Buscando\u2026" });
        try {
          window.electronAPI.checkForUpdates();
        } catch (_e) {
          void _e;
        }
      } else {
        openUrl(directUrl || RELEASES_LATEST_URL);
      }
    };
  }
  if (relBtn) {
    if (directUrl) {
      relBtn.textContent = downloadLabel(platform, arch || "x64");
      relBtn.onclick = function() {
        openUrl(directUrl);
      };
    } else {
      relBtn.onclick = function() {
        openUrl(RELEASES_LATEST_URL);
      };
    }
  }
  var snoozed = document.getElementById("update-modal-backdrop");
  if (snoozed) {
    snoozed.style.display = "none";
    snoozed.setAttribute("aria-hidden", "true");
  }
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  if (!updaterState.minVersionGateKeydownBound) {
    updaterState.minVersionGateKeydownBound = true;
    document.addEventListener("keydown", function(e) {
      var active = document.getElementById("min-version-backdrop");
      if (!active || !active.classList.contains("open")) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  }
}
function checkMinVersionGate() {
  if (typeof fetch !== "function") return;
  var api = window.electronAPI || null;
  var currentVersionPromise = api && typeof api.getAppVersion === "function" ? api.getAppVersion().catch(function() {
    return null;
  }) : Promise.resolve(null);
  var platformPromise = api && typeof api.getPlatform === "function" ? api.getPlatform().catch(function() {
    return null;
  }) : Promise.resolve(null);
  var archPromise = api && typeof api.getArch === "function" ? api.getArch().catch(function() {
    return null;
  }) : Promise.resolve(null);
  var payloadPromise = fetchMinVersionPayload().catch(function() {
    return null;
  });
  Promise.all([currentVersionPromise, payloadPromise, platformPromise, archPromise]).then(function(res) {
    var currentVersion = res[0];
    var payload = res[1];
    var platform = res[2];
    var arch = res[3];
    if (!currentVersion || !payload || typeof payload !== "object" || !payload.minVersion) return;
    if (compareSemver(currentVersion, payload.minVersion) < 0) {
      var platformInfo = platform ? { platform, arch: arch || "x64" } : null;
      showMinVersionBlockingModal(currentVersion, payload.minVersion, payload.message, platformInfo);
    }
  }).catch(function() {
  });
}

// public/js/stable-downgrade-ui.mjs
var RELEASES_PAGE = "https://github.com/mausalas99/r-mas/releases";
var GITHUB_RELEASES_API = "https://api.github.com/repos/mausalas99/r-mas/releases?per_page=40";
function filterEntriesWithGitHubReleases(entries, publishedVersions) {
  const list = Array.isArray(entries) ? entries : [];
  if (!publishedVersions || !publishedVersions.length) return list;
  const set = new Set(
    publishedVersions.map(function(v) {
      return String(v || "").replace(/^v/, "");
    })
  );
  return list.filter(function(e) {
    return e && set.has(String(e.version).replace(/^v/, ""));
  });
}
async function fetchGitHubPublishedVersions() {
  if (typeof fetch !== "function") return null;
  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map(function(r) {
      return String(r && r.tag_name || "").replace(/^v/, "");
    }).filter(Boolean);
  } catch {
    return null;
  }
}
var EMBEDDED_STABLE_CATALOG = {
  schema: 1,
  entries: [
    {
      version: "6.5.0",
      label: "6.5.0",
      summary: "Historia Cl\xEDnica y expediente Sala (canal Estable en GitHub).",
      recommended: true
    },
    {
      version: "6.4.2",
      label: "6.4.2",
      summary: "Estable anterior si necesitas volver m\xE1s atr\xE1s."
    }
  ]
};
var downgradeUiWired = false;
var downgradeDeps = null;
function pickDefaultDowngradeVersion(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  const rec = list.find((e) => e.recommended);
  return rec ? rec.version : list[0] ? list[0].version : "";
}
function isBlockedByMinVersion(target, minVersion) {
  if (!minVersion) return false;
  return compareSemverCore(target, minVersion) < 0;
}
async function getCurrentAppVersion() {
  if (typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.getAppVersion === "function") {
    return window.electronAPI.getAppVersion().catch(function() {
      return "0.0.0";
    });
  }
  return "0.0.0";
}
function resolveDowngradeEntries(raw, current, source) {
  const entries = filterDowngradeCandidates(raw.entries || [], current);
  return { entries, source, updatedAt: raw.updatedAt || "" };
}
async function applyPublishedReleaseFilter(resolved, publishedVersions) {
  const filtered = filterEntriesWithGitHubReleases(resolved.entries, publishedVersions);
  return {
    entries: filtered.length ? filtered : resolved.entries,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
    filteredByGithub: filtered.length > 0 && filtered.length < resolved.entries.length
  };
}
async function fetchStableVersionsCatalog() {
  const current = await getCurrentAppVersion();
  const publishedPromise = fetchGitHubPublishedVersions();
  if (typeof fetch !== "function") {
    const embedded = resolveDowngradeEntries(EMBEDDED_STABLE_CATALOG, current, "embedded");
    const published2 = await publishedPromise;
    return applyPublishedReleaseFilter(embedded, published2);
  }
  let resolved = null;
  const catalogUrls = [`${UPDATE_WORKER_URL}stable-versions.json`, STABLE_VERSIONS_RAW_URL];
  for (const url of catalogUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const raw = await res.json();
      const remote = resolveDowngradeEntries(raw, current, "remote");
      if (remote.entries.length) {
        resolved = remote;
        break;
      }
    } catch {
    }
  }
  if (!resolved) {
    resolved = resolveDowngradeEntries(EMBEDDED_STABLE_CATALOG, current, "embedded");
  }
  const published = await publishedPromise;
  return applyPublishedReleaseFilter(resolved, published);
}
async function fetchMinVersion() {
  const data = await fetchMinVersionPayload();
  return data?.minVersion ? String(data.minVersion) : null;
}
function openExternal(url) {
  if (window.electronAPI && typeof window.electronAPI.openExternal === "function") {
    window.electronAPI.openExternal(url);
  } else {
    try {
      window.open(url, "_blank");
    } catch (_e) {
      void _e;
    }
  }
}
async function openManualInstallerForVersion(version) {
  if (window.electronAPI && typeof window.electronAPI.openDowngradeInstaller === "function") {
    await window.electronAPI.openDowngradeInstaller(version);
    return;
  }
  if (window.electronAPI && typeof window.electronAPI.getPlatform === "function") {
    const platform = await window.electronAPI.getPlatform();
    const arch = platform === "darwin" && typeof process !== "undefined" ? process.arch : "x64";
    openExternal(buildManualInstallerUrl(version, platform, arch));
    return;
  }
  openExternal(RELEASES_PAGE);
}
var SETTINGS_UPDATES_PANEL_EVENT = "rpc-settings-updates-panel-shown";
function populateDowngradeSelect(select, entries) {
  select.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Sin versiones anteriores";
    select.appendChild(empty);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  entries.forEach(function(e) {
    const opt = document.createElement("option");
    opt.value = e.version;
    opt.textContent = e.label + (e.summary ? " \u2014 " + e.summary : "");
    select.appendChild(opt);
  });
  select.value = pickDefaultDowngradeVersion(entries);
}
async function loadDowngradeCatalogBundle() {
  return Promise.race([
    Promise.all([fetchStableVersionsCatalog(), fetchMinVersion(), getCurrentAppVersion()]),
    new Promise(function(_resolve, reject) {
      setTimeout(function() {
        reject(new Error("downgrade catalog timeout"));
      }, 12e3);
    })
  ]);
}
function renderDowngradeLoadError(hint, select, githubBtn) {
  if (hint) {
    hint.textContent = "No se pudo cargar el cat\xE1logo de versiones. Revisa la red o abre el instalador en GitHub.";
  }
  populateDowngradeSelect(select, []);
  if (githubBtn) {
    githubBtn.disabled = false;
    githubBtn.onclick = function() {
      openExternal(RELEASES_PAGE);
    };
  }
}
function wireDowngradeGithubButton(githubBtn, select, entries) {
  if (!githubBtn) return;
  githubBtn.disabled = false;
  githubBtn.onclick = function() {
    const version = select.value || pickDefaultDowngradeVersion(entries);
    if (version) openManualInstallerForVersion(version);
    else openExternal(RELEASES_PAGE);
  };
}
function wireDowngradeStableButton(deps, btn, select, entries, minVersion) {
  btn.disabled = false;
  btn.onclick = function() {
    const version = select.value;
    if (!version) return;
    if (isBlockedByMinVersion(version, minVersion)) {
      deps.showToast(
        "Esa versi\xF3n ya no es compatible con tus datos (m\xEDnimo v" + minVersion + ").",
        "error"
      );
      return;
    }
    const entry = entries.find(function(e) {
      return e.version === version;
    });
    deps.confirmDowngrade(version, entry);
  };
}
function renderDowngradeHint(hint, catalog) {
  if (!hint) return;
  const srcNote = catalog.source === "embedded" ? " (lista integrada \u2014 cat\xE1logo en main a\xFAn no publicado)" : "";
  const ghNote = catalog.filteredByGithub ? " Solo versiones con instalador en GitHub Releases." : "";
  hint.textContent = "Si esta versi\xF3n falla (p. ej. \xABnative binding\xBB), restaura una publicada en GitHub. Tus datos locales no se borran." + ghNote + srcNote;
}
async function refreshStableDowngradeSettings(deps) {
  const section = document.getElementById("settings-downgrade-section");
  const select = document.getElementById("rpc-stable-downgrade-select");
  const btn = document.getElementById("settings-downgrade-stable-btn");
  const githubBtn = document.getElementById("settings-downgrade-github-btn");
  const hint = document.getElementById("settings-downgrade-hint");
  if (!section || !select || !btn) return { entries: [], source: "none" };
  if (typeof window === "undefined" || !window.electronAPI) {
    section.hidden = true;
    return { entries: [], source: "none" };
  }
  section.hidden = false;
  btn.disabled = true;
  select.disabled = true;
  if (hint) {
    hint.textContent = "Cargando versiones estables anteriores\u2026";
  }
  let catalog = { entries: [], source: "none", filteredByGithub: false };
  let minVersion = null;
  let currentVersion = "0.0.0";
  try {
    const results = await loadDowngradeCatalogBundle();
    catalog = results[0];
    minVersion = results[1];
    currentVersion = results[2];
  } catch {
    renderDowngradeLoadError(hint, select, githubBtn);
    return { entries: [], source: "error" };
  }
  const entries = catalog.entries;
  const source = catalog.source;
  if (!entries.length) {
    if (hint) {
      hint.textContent = "No hay versiones anteriores a v" + currentVersion + " en el cat\xE1logo. Abre Releases en GitHub para instalar manualmente.";
    }
    populateDowngradeSelect(select, []);
    btn.disabled = true;
    wireDowngradeGithubButton(githubBtn, select, entries);
    return { entries, source };
  }
  populateDowngradeSelect(select, entries);
  renderDowngradeHint(hint, catalog);
  wireDowngradeStableButton(deps, btn, select, entries, minVersion);
  wireDowngradeGithubButton(githubBtn, select, entries);
  return { entries, source };
}
function wireSettingsDowngradeAccordion(deps) {
  if (downgradeUiWired) return;
  downgradeUiWired = true;
  document.addEventListener(SETTINGS_UPDATES_PANEL_EVENT, function() {
    void refreshStableDowngradeSettings(deps);
  });
}
async function initStableDowngradeSettings(deps) {
  downgradeDeps = deps;
  wireSettingsDowngradeAccordion(deps);
  await refreshStableDowngradeSettings(deps);
}
function openSettingsDowngradeSection() {
  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn && typeof settingsBtn.click === "function") settingsBtn.click();
  const acc = document.getElementById("settings-accordion-updates");
  if (acc) {
    showSettingsPanel("settings-accordion-updates");
    if (downgradeDeps) void refreshStableDowngradeSettings(downgradeDeps);
  }
  const section = document.getElementById("settings-downgrade-section");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// public/js/features/platform/updater/downgrade.mjs
async function confirmDowngrade(version, entry) {
  var summary = entry && entry.summary ? entry.summary : "";
  var result = await openConfirm({
    weight: "destructive",
    title: "Restaurar R+ a v" + version + "?",
    message: summary + "\n\nLa app se reiniciar\xE1. Tus pacientes y ajustes locales se conservan.",
    confirmLabel: "Restaurar"
  });
  if (result !== "confirm") return;
  updaterState.pendingDowngradeVersion = version;
  updaterState.updateModalMode = "downgrade";
  resetUpdateModalPanels();
  showUpdateModal();
  var title = document.getElementById("update-modal-title");
  if (title && title.firstChild) title.firstChild.textContent = "Restaurando versi\xF3n estable";
  if (window.electronAPI && window.electronAPI.downgradeToStable) {
    window.electronAPI.downgradeToStable(version);
  }
}
function renderDowngradeFallback(payload) {
  updaterState.updateModalMode = "upgrade";
  updaterState.pendingDowngradeVersion = null;
  resetUpdateCheckButtons();
  var raw = payload && payload.message ? payload.message : "No se pudo descargar la versi\xF3n.";
  var safe = sanitizeUpdaterUserMessage(
    raw,
    "No se pudo descargar esa versi\xF3n. Abre el instalador en GitHub."
  );
  if (safe.indexOf("GitHub") === -1) {
    safe += " Puedes abrir el instalador en GitHub.";
  }
  renderUpdateError(safe);
  var actions = document.getElementById("update-modal-actions-primary");
  if (actions && payload && (payload.manualUrl || payload.version)) {
    var openBtn = document.createElement("button");
    openBtn.className = "btn-primary";
    openBtn.textContent = "Abrir instalador en GitHub";
    openBtn.onclick = function() {
      if (window.electronAPI && window.electronAPI.openDowngradeInstaller) {
        window.electronAPI.openDowngradeInstaller(payload.version);
      } else if (window.electronAPI && window.electronAPI.openExternal && payload.manualUrl) {
        window.electronAPI.openExternal(payload.manualUrl);
      }
    };
    actions.innerHTML = "";
    actions.appendChild(openBtn);
  }
  if (window.electronAPI && window.electronAPI.resetUpdateFeed) {
    window.electronAPI.resetUpdateFeed();
  }
}

// public/js/features/platform/updater/native-recovery.mjs
function hideNativeRecoveryChrome() {
  var wrap = document.getElementById("update-modal-progress-wrap");
  if (wrap) wrap.style.display = "none";
  var pill = document.getElementById("update-modal-version-pill");
  if (pill) pill.style.display = "none";
  var err = document.getElementById("update-modal-error");
  if (err) err.style.display = "none";
}
function populateNativeRecoveryContent(msg) {
  var title = document.getElementById("update-modal-title");
  if (title && title.firstChild && title.firstChild.nodeType === 3) {
    title.firstChild.textContent = "Problema de instalaci\xF3n";
  }
  var notes = document.getElementById("update-modal-notes");
  if (notes) notes.textContent = msg;
  var state = document.getElementById("update-modal-state");
  if (state) {
    state.textContent = "Usa Ajustes \u2192 Reinstalar versi\xF3n actual, Restaurar versi\xF3n estable, o descarga el instalador desde GitHub Releases.";
  }
}
function populateNativeRecoveryActions() {
  var actions = document.getElementById("update-modal-actions-primary");
  var sec = document.getElementById("update-modal-actions-secondary");
  if (actions) {
    actions.innerHTML = "";
    var settingsBtn = document.createElement("button");
    settingsBtn.className = "btn-primary";
    settingsBtn.textContent = "Abrir restaurar versi\xF3n estable\u2026";
    settingsBtn.onclick = function() {
      hideUpdateModal();
      openSettingsDowngradeSection();
    };
    actions.appendChild(settingsBtn);
    var ghBtn = document.createElement("button");
    ghBtn.className = "btn-secondary";
    ghBtn.textContent = "Ver releases en GitHub";
    ghBtn.onclick = function() {
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal("https://github.com/mausalas99/r-mas/releases");
      }
    };
    actions.appendChild(ghBtn);
  }
  if (sec) {
    sec.innerHTML = "";
    var closeBtn = document.createElement("button");
    closeBtn.className = "btn-secondary";
    closeBtn.textContent = "Continuar de todos modos";
    closeBtn.onclick = function() {
      hideUpdateModal();
    };
    sec.appendChild(closeBtn);
  }
}
function showNativeRuntimeRecoveryModal(status) {
  if (updaterState.nativeRecoveryModalShown || !status || status.ok) return;
  updaterState.nativeRecoveryModalShown = true;
  var msg = (status.userMessage || status.message || "R+ no pudo cargar un componente nativo.") + (status.detail ? "\n\n" + status.detail : "");
  resetUpdateModalPanels();
  populateNativeRecoveryContent(msg);
  hideNativeRecoveryChrome();
  populateNativeRecoveryActions();
  showUpdateModal();
}
function checkNativeRuntimeOnBoot() {
  if (!window.electronAPI || typeof window.electronAPI.getNativeRuntimeStatus !== "function") {
    return;
  }
  window.electronAPI.getNativeRuntimeStatus().then(function(status) {
    if (!status || status.ok) return;
    showNativeRuntimeRecoveryModal(status);
  }).catch(function() {
  });
}

// public/js/features/platform/updater/init.mjs
var rt12 = getPlatformRuntime();
function initUpdateChannelAndGate() {
  migrateUpdateChannelToStableDefault();
  syncUpdateChannelUI();
  syncUpdateTelemetryUI();
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === "function") {
    try {
      window.electronAPI.setUpdateChannel(getUpdateChannel());
    } catch (_e) {
      void _e;
    }
  }
  initStableDowngradeSettings({
    showToast: rt12.showToast.bind(rt12),
    confirmDowngrade
  });
  setTimeout(checkNativeRuntimeOnBoot, 800);
  setTimeout(function() {
    checkMinVersionGate();
  }, 1200);
}

// public/js/features/platform/updater/electron-handlers.mjs
var rt13 = getPlatformRuntime();
function updateAvailableTitle(isDowngrade, isRepair) {
  if (isDowngrade) return "Restaurando versi\xF3n estable";
  if (isRepair) return "Actualizaci\xF3n de reparaci\xF3n";
  return "Nueva versi\xF3n";
}
function wireUpdateAvailableActions(version, isDowngrade) {
  var actions = document.getElementById("update-modal-actions-primary");
  if (actions) {
    actions.innerHTML = "";
    if (!isDowngrade) {
      var later = document.createElement("button");
      later.className = "btn-secondary";
      later.textContent = "M\xE1s tarde";
      later.onclick = function() {
        markDismissedVersion(version);
        hideUpdateModal();
      };
      actions.appendChild(later);
    }
  }
  var sec = document.getElementById("update-modal-actions-secondary");
  if (sec) {
    sec.innerHTML = "";
    if (!isDowngrade) {
      var link = document.createElement("button");
      link.type = "button";
      link.className = "btn-link";
      link.textContent = "Ver notas en GitHub";
      link.onclick = function() {
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal("https://github.com/mausalas99/r-mas/releases");
        }
      };
      sec.appendChild(link);
    }
  }
}
function populateUpdateAvailableDom(version, releaseNotes, isDowngrade, isRepair) {
  var title = document.getElementById("update-modal-title");
  if (title && title.firstChild && title.firstChild.nodeType === 3) {
    title.firstChild.textContent = updateAvailableTitle(isDowngrade, isRepair);
  }
  var pill = document.getElementById("update-modal-version-pill");
  if (pill) {
    pill.textContent = "v" + version;
    pill.style.display = "inline-block";
  }
  syncUpdateModalChannelPill(updaterState.pendingUpdaterIsPrerelease);
  var notes = document.getElementById("update-modal-notes");
  if (notes) {
    var clipped = String(releaseNotes || "");
    if (clipped.length > 600) clipped = clipped.slice(0, 599).replace(/\s+\S*$/, "") + "\u2026";
    notes.textContent = clipped;
  }
  var state = document.getElementById("update-modal-state");
  if (state) state.textContent = "Conectando\u2026 La descarga comenzar\xE1 en breve.";
  var fill = document.getElementById("update-modal-progress-fill");
  if (fill) fill.style.width = "0%";
  var label = document.getElementById("update-modal-progress-label");
  if (label) label.textContent = "";
}
function handleUpdateAvailable(payload) {
  resetUpdateCheckButtons();
  var version = payload && payload.version ? payload.version : String(payload || "");
  var rawNotes = payload && payload.releaseNotes != null ? String(payload.releaseNotes) : "";
  var releaseNotes = formatUpdaterReleaseNotesPlain(version, rawNotes) || stripHtmlToPlainText(rawNotes);
  updaterState.pendingUpdaterTargetVersion = version;
  updaterState.pendingUpdaterIsPrerelease = !!(payload && payload.prerelease);
  updaterState.updateReadyToInstall = false;
  var isDowngrade = updaterState.updateModalMode === "downgrade";
  var isRepair = updaterState.pendingRepairUpdateCheck;
  if (isRepair) updaterState.pendingRepairUpdateCheck = false;
  if (!isDowngrade && !isRepair && isSnoozeActiveForVersion(version)) return;
  resetUpdateModalPanels();
  populateUpdateAvailableDom(version, releaseNotes, isDowngrade, isRepair);
  wireUpdateAvailableActions(version, isDowngrade);
  showUpdateModal();
}
function handleUpdateProgress(payload) {
  var pct = typeof payload === "number" ? payload : payload && payload.percent != null ? payload.percent : 0;
  var transferred = payload && payload.transferred;
  var total = payload && payload.total;
  var bps = payload && payload.bytesPerSecond;
  if (updaterState.pendingUpdaterTargetVersion && updaterState.updateModalMode !== "downgrade" && isSnoozeActiveForVersion(updaterState.pendingUpdaterTargetVersion)) return;
  resetUpdateModalPanels();
  syncUpdateModalChannelPill(updaterState.pendingUpdaterIsPrerelease);
  var state = document.getElementById("update-modal-state");
  if (state) state.textContent = "Descargando\u2026";
  var fill = document.getElementById("update-modal-progress-fill");
  if (fill) fill.style.width = pct + "%";
  var label = document.getElementById("update-modal-progress-label");
  if (label) {
    if (transferred != null && total != null) {
      label.textContent = formatProgressLine({
        transferred,
        total,
        bytesPerSecond: bps
      });
    } else {
      label.textContent = "Progreso: " + pct + "%";
    }
  }
  showUpdateModal();
}
function wireUpdateReadyActions(isDowngrade) {
  var actions = document.getElementById("update-modal-actions-primary");
  if (actions) {
    actions.innerHTML = "";
    var go = document.createElement("button");
    go.className = "btn-primary";
    go.textContent = isDowngrade ? "Restaurar y reiniciar" : "Instalar y reiniciar";
    go.onclick = function() {
      updaterState.updateModalMode = "upgrade";
      updaterState.pendingDowngradeVersion = null;
      installUpdate();
    };
    actions.appendChild(go);
    if (!isDowngrade) {
      var later = document.createElement("button");
      later.className = "btn-secondary";
      later.textContent = "Instalar al cerrar";
      later.onclick = function() {
        hideUpdateModal();
      };
      actions.appendChild(later);
    }
  }
  var sec = document.getElementById("update-modal-actions-secondary");
  if (sec) sec.innerHTML = "";
}
function handleUpdateReady(payload) {
  var version = payload && payload.version ? payload.version : String(payload || "");
  var isDowngrade = updaterState.updateModalMode === "downgrade";
  updaterState.updateReadyToInstall = !isDowngrade;
  try {
    sendUpdateTelemetry("success", version);
  } catch (_e) {
    void _e;
  }
  if (!isDowngrade && isSnoozeActiveForVersion(version)) return;
  resetUpdateModalPanels();
  syncUpdateModalChannelPill(updaterState.pendingUpdaterIsPrerelease);
  var state = document.getElementById("update-modal-state");
  if (state) {
    state.textContent = isDowngrade ? "Listo para restaurar. R+ se reiniciar\xE1 en la versi\xF3n seleccionada." : "Listo para instalar. Tambi\xE9n se instalar\xE1 al cerrar la aplicaci\xF3n si eliges esperar.";
  }
  var fill = document.getElementById("update-modal-progress-fill");
  if (fill) fill.style.width = "100%";
  var label = document.getElementById("update-modal-progress-label");
  if (label) label.textContent = "Descarga completa.";
  wireUpdateReadyActions(isDowngrade);
  showUpdateModal();
}
function handleUpdateNotAvailable(payload) {
  resetUpdateCheckButtons();
  var wasRepair = updaterState.pendingRepairUpdateCheck;
  var toastKind = updateNotAvailableToastKind(updaterState, payload);
  updaterState.pendingRepairUpdateCheck = false;
  updaterState.pendingUpdaterTargetVersion = null;
  updaterState.pendingUpdaterIsPrerelease = false;
  updaterState.updateReadyToInstall = false;
  updaterState.checkFeedback = false;
  syncUpdateModalChannelPill(false);
  if (toastKind === "repair-error" || wasRepair || payload && payload.reinstallFailed) {
    var v = payload && payload.version ? String(payload.version) : "";
    var detail = payload && payload.detail ? String(payload.detail) : "";
    var msg = "No se encontr\xF3 en GitHub una build reinstalable" + (v ? " para v" + v : "") + ". Publica o actualiza el release en GitHub (latest-mac.yml / latest.yml e instaladores) y vuelve a intentar.";
    if (detail) msg += " Detalle: " + detail;
    msg += " Tambi\xE9n puedes usar \xABAbrir instalador en GitHub\xBB en Restaurar versi\xF3n estable.";
    rt13.showToast(msg, "error");
  } else if (toastKind === "up-to-date") {
    rt13.showToast("R+ est\xE1 actualizado.", "success");
  }
}
function handleUpdateError(msg) {
  var show = shouldSurfaceUpdateCheckError(updaterState);
  updaterState.checkFeedback = false;
  resetUpdateCheckButtons();
  if (!show) return;
  try {
    sendUpdateTelemetry("fail");
  } catch (_e) {
    void _e;
  }
  renderUpdateError(msg);
}
function handleDowngradeFailed(payload) {
  resetUpdateCheckButtons();
  renderDowngradeFallback(payload);
}

// public/js/features/platform/updater/electron-bridge.mjs
function safeHandler(fn, label) {
  return function wrapped(payload) {
    try {
      fn(payload);
    } catch (e) {
      console.error(label + " callback error:", e && e.message);
    }
  };
}
function registerElectronUpdateListeners() {
  if (typeof window === "undefined" || !window.electronAPI) return;
  window.electronAPI.onUpdateAvailable(safeHandler(handleUpdateAvailable, "onUpdateAvailable"));
  window.electronAPI.onUpdateProgress(safeHandler(handleUpdateProgress, "onUpdateProgress"));
  window.electronAPI.onUpdateReady(safeHandler(handleUpdateReady, "onUpdateReady"));
  window.electronAPI.onUpdateNotAvailable(safeHandler(handleUpdateNotAvailable, "onUpdateNotAvailable"));
  window.electronAPI.onUpdateError(safeHandler(handleUpdateError, "onUpdateError"));
  if (window.electronAPI.onDowngradeFailed) {
    window.electronAPI.onDowngradeFailed(safeHandler(handleDowngradeFailed, "onDowngradeFailed"));
  }
}
registerElectronUpdateListeners();

// public/js/features/platform/import-backup/init.mjs
function initGoalGFeatures() {
  syncAutoBackupUi();
  maybeRunScheduledAutoBackup();
  restartAutoBackupScheduler();
  initUpdateChannelAndGate();
}

export {
  formatDateSlug,
  downloadBlob,
  downloadJsonPayload,
  downloadTextPayload,
  getAuditLog,
  refreshDbAuditCache,
  addAuditEntry,
  exportAuditLog,
  lockClinicalDatabaseNow,
  verifyForensicAuditChain,
  exportRecoverCensusRangeJson,
  exportClinicalDbBackupJson,
  exportClinicalDbBackupDb,
  mergeMedCatalogStored,
  exportMedCatalogBundle,
  triggerImportMedCatalog,
  onMedCatalogFileChosen,
  incrementPendingJobs,
  decrementPendingJobs,
  syncOfflineButtonStates,
  setRpcOffline,
  isRpcOffline,
  checkRpcServerHealth,
  initRpcServerHealthWatch,
  syncIdleLockSelectUi,
  onIdleLockSelectChange,
  changeIdleLockPin,
  submitIdleLockPin,
  initIdleLockFeature,
  openWipeDataModal,
  closeWipeDataModal,
  wipeCacheConfirmed,
  wipeAllConfirmed,
  openUserDataFolderFromSettings,
  safeExportSlug,
  buildFullBackupPayload,
  defaultAutoBackupSettings,
  getAutoBackupSettings,
  saveAutoBackupSettings,
  getAutoBackupIndex,
  saveAutoBackupIndex,
  syncAutoBackupUi,
  updateAutoBackupSettingsFromUi,
  shouldRunScheduledBackup,
  maybeRunScheduledAutoBackup,
  restartAutoBackupScheduler,
  runAutoBackupNow,
  syncPreimportBackupUi,
  restorePreimportBackupPrompt,
  parseDateDMY,
  parseDateRangePrompt,
  patientInDateRange,
  askConflictAction,
  applyImportEntry,
  importEntriesWithConflicts,
  exportDataBackup,
  exportActivePatientBackup,
  exportRangeBackupPrompt,
  openExportPatientsModal,
  triggerImportRangeBackup,
  onRangeBackupFileChosen,
  triggerImportBackup,
  triggerImportActivePatientBackup,
  onPatientBackupFileChosen,
  importBundledDemoPerez,
  onBackupFileChosen,
  bytesToBase64,
  base64ToBytes,
  encryptSyncPayload,
  decryptSyncPayload,
  collectSyncEntries,
  exportSyncBundlePrompt,
  triggerImportSyncBundle,
  onSyncBundleFileChosen,
  hideUpdateModal,
  compareSemver,
  checkMinVersionGate,
  initUpdateChannelAndGate,
  initGoalGFeatures
};
//# sourceMappingURL=/js/chunks/chunk-TMPFUFBU.js.map
