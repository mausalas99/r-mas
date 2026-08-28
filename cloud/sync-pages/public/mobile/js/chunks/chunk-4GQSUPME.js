import {
  MOBILE_LAB_HISTORY_DAYS
} from "/mobile/js/chunks/chunk-N3UTXQGG.js";
import {
  isCloudMobileClient
} from "/mobile/js/chunks/chunk-OXN2ZL25.js";
import {
  hasActiveCloudNetworkFailure
} from "/mobile/js/chunks/chunk-LF5B36KU.js";
import {
  getLabHistory,
  getPatients
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import {
  getCloudSyncRevision,
  getCloudSyncRoomId
} from "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/cloud-mobile/lab-sync-diagnostics.mjs
var MAX_TRACE = 12;
var lastPullIngress = {};
var lastApply = {};
var lastPush = {};
var trace = [];
function pushTrace(kind, detail) {
  trace.unshift({
    at: (/* @__PURE__ */ new Date()).toISOString(),
    kind: String(kind || "event"),
    detail: detail && typeof detail === "object" ? { ...detail } : {}
  });
  if (trace.length > MAX_TRACE) trace.length = MAX_TRACE;
}
function countLabSidecarsInState(state) {
  const map = state && typeof state === "object" ? (
    /** @type {{ labSidecars?: unknown }} */
    state.labSidecars
  ) : null;
  if (!map || typeof map !== "object") return { patients: 0, sets: 0 };
  let patients = 0;
  let sets = 0;
  Object.keys(map).forEach(function(patientId) {
    const row = (
      /** @type {Record<string, unknown>} */
      map[patientId]
    );
    if (!row || typeof row !== "object") return;
    const n = Object.keys(row).length;
    if (!n) return;
    patients += 1;
    sets += n;
  });
  return { patients, sets };
}
function countLabOpsInPullResult(result) {
  if (!result || typeof result !== "object") return 0;
  const row = (
    /** @type {{ needSnapshot?: boolean, state?: unknown, ops?: unknown[] }} */
    result
  );
  if (row.needSnapshot && row.state) return countLabSidecarsInState(row.state).sets;
  const ops = Array.isArray(row.ops) ? row.ops : [];
  let n = 0;
  for (let i = 0; i < ops.length; i += 1) {
    if (String(ops[i]?.path || "").startsWith("labSidecars/")) n += 1;
  }
  return n;
}
function recordLabPullIngress(row) {
  lastPullIngress = {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    needSnapshot: !!row?.needSnapshot,
    revision: row?.revision != null ? Number(row.revision) : null,
    opsCount: Number(row?.opsCount || 0),
    labOpsInPayload: Number(row?.labOpsInPayload || 0),
    rawSidecars: row?.rawSidecars || { patients: 0, sets: 0 },
    filteredSidecars: row?.filteredSidecars || row?.rawSidecars || { patients: 0, sets: 0 }
  };
  pushTrace("pull_ingress", lastPullIngress);
}
function updateLabPullIngressFilter(filteredSidecars) {
  if (!lastPullIngress.at) return;
  lastPullIngress.filteredSidecars = filteredSidecars;
  pushTrace("pull_filter", { filteredSidecars });
}
function recordLabPullApply(row) {
  lastApply = {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    patientsUpdated: Number(row?.patientsUpdated || 0),
    labSetsReceived: Number(row?.labSetsReceived || 0),
    labSetsKeptAfterWindow: Number(row?.labSetsKeptAfterWindow || 0),
    activePatientId: row?.activePatientId != null ? String(row.activePatientId) : null
  };
  pushTrace("pull_apply", lastApply);
}
function recordLabPushAttempt(row) {
  lastPush = {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    patientId: String(row?.patientId || ""),
    setCount: Number(row?.setCount || 0),
    ok: !!row?.ok,
    reason: String(row?.reason || ""),
    totalOps: Number(row?.totalOps || 0)
  };
  pushTrace("push", lastPush);
}
function summarizeLocalLabHistory(activePatientId) {
  let patientsWithLabs = 0;
  let totalSets = 0;
  Object.keys(getLabHistory() || {}).forEach(function(pid2) {
    const n = Array.isArray(getLabHistory()[pid2]) ? getLabHistory()[pid2].length : 0;
    if (!n) return;
    patientsWithLabs += 1;
    totalSets += n;
  });
  const pid = String(activePatientId || "").trim();
  const activeSets = pid && Array.isArray(getLabHistory()[pid]) ? getLabHistory()[pid].length : 0;
  const activePatient = pid && getPatients().find(function(p) {
    return p && String(p.id) === pid;
  });
  return {
    patientsWithLabs,
    totalSets,
    activePatientId: pid || null,
    activePatientName: activePatient ? String(activePatient.nombre || "").trim() : "",
    activeSets
  };
}
function buildCloudNetworkLabIssues() {
  if (!hasActiveCloudNetworkFailure()) return [];
  return [
    "Sin contacto estable con Nube (Failed to fetch / red intermitente). Revisa Wi\u2011Fi o VPN, recarga R+ M\xF3vil y usa Forzar pull cuando la red est\xE9 bien. Hasta entonces los labs no bajar\xE1n ni la cola local se enviar\xE1."
  ];
}
function addPullMissingIssue(ingress, networkBlocking, issues) {
  if (!ingress.at) {
    if (!networkBlocking) issues.push("A\xFAn no hay un pull Nube registrado en esta sesi\xF3n.");
    return;
  }
  if (!networkBlocking && Number(ingress.labOpsInPayload || 0) === 0 && Number(ingress.rawSidecars?.sets || 0) === 0) {
    issues.push(
      "El \xFAltimo pull no trajo labSidecars. En escritorio: reinicia R+ con el c\xF3digo nuevo, reconecta Nube y procesa o re-sincroniza labs."
    );
  }
}
function addPullFilteredIssue(ingress, issues) {
  if (!ingress.at) return;
  const raw = Number(ingress.rawSidecars?.sets || 0);
  const filtered = Number(ingress.filteredSidecars?.sets || 0);
  if (raw <= filtered) return;
  issues.push(
    "El worker filtr\xF3 " + (raw - filtered) + " estudio(s) por ventana m\xF3vil (" + MOBILE_LAB_HISTORY_DAYS + " d\xEDas)."
  );
}
function addLocalHistoryIssues(local, apply, issues) {
  if (local.totalSets > 0 && local.activeSets === 0 && local.activePatientId) {
    issues.push(
      "Hay labs en el dispositivo para otros pacientes, pero el paciente activo no tiene estudios en ventana m\xF3vil."
    );
  }
  if (apply.at && Number(apply.labSetsReceived || 0) > 0 && local.activeSets === 0 && local.activePatientId) {
    issues.push("Se aplicaron labSidecars en pull pero el paciente activo sigue sin historial local.");
  }
}
function addPushFailedIssue(issues) {
  if (lastPush.at && !lastPush.ok) {
    issues.push("\xDAltimo push de labs desde escritorio fall\xF3: " + (lastPush.reason || "desconocido") + ".");
  }
}
function buildLabSyncDiagnosticsIssues(opts) {
  const local = summarizeLocalLabHistory(opts?.activePatientId);
  const issues = [...buildCloudNetworkLabIssues()];
  const ingress = lastPullIngress;
  const apply = lastApply;
  const networkBlocking = issues.length > 0;
  addPullMissingIssue(ingress, networkBlocking, issues);
  addPullFilteredIssue(ingress, issues);
  addLocalHistoryIssues(local, apply, issues);
  addPushFailedIssue(issues);
  if (!issues.length && local.activeSets === 0 && local.activePatientId) {
    issues.push("Sin estudios locales para el paciente activo tras el \xFAltimo pull.");
  }
  return issues;
}
function getLabSyncDiagnosticsSnapshot(opts) {
  const local = summarizeLocalLabHistory(opts?.activePatientId);
  return {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    client: isCloudMobileClient() ? "mobile" : "desktop",
    revision: Number(getCloudSyncRevision() || 0),
    roomId: String(getCloudSyncRoomId() || ""),
    mobileWindowDays: MOBILE_LAB_HISTORY_DAYS,
    local,
    lastPullIngress: { ...lastPullIngress },
    lastApply: { ...lastApply },
    lastPush: { ...lastPush },
    issues: buildLabSyncDiagnosticsIssues(opts),
    trace: trace.map(function(row) {
      return { at: row.at, kind: row.kind, detail: { ...row.detail } };
    })
  };
}
function formatLabSyncDiagnosticsText(opts) {
  const snap = getLabSyncDiagnosticsSnapshot(opts);
  const lines = [
    "=== R+ Labs \xB7 diagn\xF3stico Nube ===",
    "Generado: " + snap.at,
    "Cliente: " + snap.client,
    "Sala: " + (snap.roomId || "(sin sala)") + " \xB7 rev " + snap.revision,
    "",
    "Paciente activo: " + (snap.local.activePatientName || snap.local.activePatientId || "(ninguno)"),
    "Labs locales (activo): " + snap.local.activeSets,
    "Labs locales (todos): " + snap.local.totalSets + " en " + snap.local.patientsWithLabs + " paciente(s)",
    "",
    "\xDAltimo pull:",
    snap.lastPullIngress.at ? "  " + snap.lastPullIngress.at + " \xB7 snapshot=" + (snap.lastPullIngress.needSnapshot ? "s\xED" : "no") + " \xB7 ops=" + snap.lastPullIngress.opsCount + " \xB7 labOps=" + snap.lastPullIngress.labOpsInPayload + " \xB7 sidecars raw " + snap.lastPullIngress.rawSidecars.sets + " \u2192 filtrados " + snap.lastPullIngress.filteredSidecars.sets : "  (ninguno)",
    "",
    "\xDAltima aplicaci\xF3n:",
    snap.lastApply.at ? "  " + snap.lastApply.at + " \xB7 recibidos=" + snap.lastApply.labSetsReceived + " \xB7 en ventana=" + snap.lastApply.labSetsKeptAfterWindow + " \xB7 pacientes tocados=" + snap.lastApply.patientsUpdated : "  (ninguna)",
    "",
    "\xDAltimo push escritorio:",
    snap.lastPush.at ? "  " + snap.lastPush.at + " \xB7 paciente=" + (snap.lastPush.patientId || "\u2014") + " \xB7 sets=" + snap.lastPush.setCount + " \xB7 ok=" + (snap.lastPush.ok ? "s\xED" : "no") + (snap.lastPush.reason ? " \xB7 " + snap.lastPush.reason : "") : "  (ninguno \u2014 normal en iPad)",
    "",
    "Problemas detectados:"
  ];
  if (!snap.issues.length) lines.push("  (ninguno obvio)");
  else snap.issues.forEach(function(msg) {
    lines.push("  \u2022 " + msg);
  });
  lines.push("", "Traza reciente:");
  if (!snap.trace.length) lines.push("  (vac\xEDa)");
  else {
    snap.trace.slice(0, 8).forEach(function(row) {
      lines.push("  " + row.at + " [" + row.kind + "] " + JSON.stringify(row.detail));
    });
  }
  return lines.join("\n");
}
function diagHost() {
  if (typeof document === "undefined") return null;
  return document.getElementById("lab-mobile-sync-diag");
}
function ensureLabMobileSyncDiagPanel() {
  if (typeof document === "undefined") return null;
  var host = diagHost();
  if (host && host.parentNode) host.parentNode.removeChild(host);
  return null;
}
function refreshLabMobileSyncDiagPanel(activePatientId) {
  void activePatientId;
  ensureLabMobileSyncDiagPanel();
}
function toggleLabMobileSyncDiag() {
  ensureLabMobileSyncDiagPanel();
}
async function copyLabMobileSyncDiag() {
  ensureLabMobileSyncDiagPanel();
}
async function forceLabMobileSyncPull() {
  ensureLabMobileSyncDiagPanel();
  if (!isCloudMobileClient()) return;
  try {
    const { getCloudMobileRuntime } = await import("/mobile/js/chunks/runtime-ZESOTYXU.js");
    const runtime = getCloudMobileRuntime();
    if (!runtime?.syncCycle) {
      const { showToast: showToast2 } = await import("/mobile/js/chunks/ui-toast-T4BVS2KN.js");
      showToast2("Sync Nube no est\xE1 activo en esta sesi\xF3n", "error");
      return;
    }
    const { showToast } = await import("/mobile/js/chunks/ui-toast-T4BVS2KN.js");
    showToast("Sincronizando con Nube\u2026", "info");
    await runtime.syncCycle();
    const { refreshMobileLabReferencePanel } = await import("/mobile/js/chunks/mobile-web-3WDKXX26.js");
    refreshMobileLabReferencePanel();
    showToast("Sincronizaci\xF3n completada", "success");
  } catch (err) {
    const { showToast } = await import("/mobile/js/chunks/ui-toast-T4BVS2KN.js");
    showToast("Sync fall\xF3: " + (err?.message || String(err)), "error");
  }
}
function clearLabSyncDiagnostics() {
  lastPullIngress = {};
  lastApply = {};
  lastPush = {};
  trace.length = 0;
}

export {
  countLabSidecarsInState,
  countLabOpsInPullResult,
  recordLabPullIngress,
  updateLabPullIngressFilter,
  recordLabPullApply,
  recordLabPushAttempt,
  summarizeLocalLabHistory,
  buildLabSyncDiagnosticsIssues,
  getLabSyncDiagnosticsSnapshot,
  formatLabSyncDiagnosticsText,
  ensureLabMobileSyncDiagPanel,
  refreshLabMobileSyncDiagPanel,
  toggleLabMobileSyncDiag,
  copyLabMobileSyncDiag,
  forceLabMobileSyncPull,
  clearLabSyncDiagnostics
};
//# sourceMappingURL=/js/chunks/chunk-4GQSUPME.js.map
