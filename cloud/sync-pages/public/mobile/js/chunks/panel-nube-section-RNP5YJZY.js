import {
  createNubeRuntime,
  getSharedNubeOutbox,
  getSharedNubeRuntime
} from "/mobile/js/chunks/chunk-FCD2IF5W.js";
import {
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleLogin,
  handleLogout,
  handleOpenRotation,
  handleRecover,
  handleRegenerateRecovery,
  handleRegister,
  renderAfterAuth
} from "/mobile/js/chunks/chunk-ONC67TEX.js";
import "/mobile/js/chunks/chunk-65TYIGXN.js";
import "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-BYJGS6YL.js";
import "/mobile/js/chunks/chunk-ETN66DDX.js";
import {
  humanizeCloudSyncErrorMessage
} from "/mobile/js/chunks/chunk-RB43CK2I.js";
import "/mobile/js/chunks/chunk-ZOXS3A7B.js";
import "/mobile/js/chunks/chunk-C6UFSJCE.js";
import "/mobile/js/chunks/chunk-AZX47ZAL.js";
import {
  STATUS_LABELS,
  applyConexionView,
  authFormsHtml,
  canAccessCloudAdmin,
  conexionShellHtml,
  connectedViewsHtml,
  copyToClipboardSafe,
  equipoStepHtml,
  mountCloudMobileInviteInHost,
  nextStepHtml,
  roomActionsHtml,
  roomConnectedHtml,
  statusChipModifier,
  userHasJoinedTeam,
  wireCloudAuthTabs
} from "/mobile/js/chunks/chunk-4RWHEAJO.js";
import "/mobile/js/chunks/chunk-T5MFACW3.js";
import "/mobile/js/chunks/chunk-L6DKKZAW.js";
import "/mobile/js/chunks/chunk-UYGGXIVE.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import {
  formatCloudDiagnosticsReport,
  getCloudSyncDiagnostics,
  isCloudMutateBridgeConfigured
} from "/mobile/js/chunks/chunk-3WHKYJ7V.js";
import "/mobile/js/chunks/chunk-4ZYP54QF.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-5OEZNMAY.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-WVWWVYPL.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import {
  patients
} from "/mobile/js/chunks/chunk-2VPNV3XW.js";
import "/mobile/js/chunks/chunk-MWUHDPML.js";
import "/mobile/js/chunks/chunk-S2OQTBTO.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import "/mobile/js/chunks/chunk-IFN2KBEN.js";
import "/mobile/js/chunks/chunk-K4LYOQAP.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-FXT4EGAN.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-VFWQPPKQ.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-J2US57NE.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-TRTQ4CW2.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-SUI526FO.js";
import "/mobile/js/chunks/chunk-W6RRSTLS.js";
import "/mobile/js/chunks/chunk-CCQC427D.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import {
  isCloudSyncActive,
  shouldShowNubePanel
} from "/mobile/js/chunks/chunk-ZWVJD7AP.js";
import {
  displayCloudSalaLabel,
  normalizeCloudSala
} from "/mobile/js/chunks/chunk-AETSFPDT.js";
import {
  getCloudSyncRoomSnapshot,
  getCloudSyncSettings
} from "/mobile/js/chunks/chunk-YYAEPGIH.js";
import "/mobile/js/chunks/chunk-2VO3CNBC.js";
import "/mobile/js/chunks/chunk-QPJXCZUR.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/features/cloud-sync/panel-cloud-diagnostics.mjs
function buildCloudDiagnosticsDeps(deps) {
  const settings = getCloudSyncSettings();
  const runtime = getSharedNubeRuntime();
  const outbox = getSharedNubeOutbox();
  return {
    status: runtime?.getStatus?.() || "idle",
    detail: runtime?.getDetail?.() || "",
    online: typeof navigator !== "undefined" ? navigator.onLine : null,
    bridgeConfigured: isCloudMutateBridgeConfigured(),
    runtimeActive: !!runtime,
    cloudActive: isCloudSyncActive(),
    baseUrl: settings.baseUrl,
    tokenPresent: !!settings.token,
    roomId: settings.roomId,
    revision: settings.revision,
    roomSnapshot: getCloudSyncRoomSnapshot(),
    localPatientCount: Array.isArray(patients) ? patients.length : 0,
    outboxEntries: outbox?.list?.() || [],
    toast: typeof deps?.toast === "function" ? deps.toast : function() {
    }
  };
}
function renderCloudDiagnosticsReport(host, deps) {
  const diagDeps = buildCloudDiagnosticsDeps(deps);
  const diag = getCloudSyncDiagnostics(diagDeps);
  const report = formatCloudDiagnosticsReport(diag);
  const pre = host.querySelector(".cloud-sync-diagnostics-pre");
  if (pre) pre.textContent = report;
  const badge = host.querySelector("[data-cloud-outbox-badge]");
  if (badge) {
    const n = Number(diag.outbox?.count || 0);
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = n + " pendiente" + (n !== 1 ? "s" : "");
    } else {
      badge.hidden = true;
      badge.textContent = "";
    }
  }
  const statusLine = host.querySelector("[data-cloud-diag-status]");
  if (statusLine) {
    const parts = [
      "Estado: " + String(diag.status || "\u2014"),
      diag.detail ? String(diag.detail) : "",
      diag.outbox?.count ? diag.outbox.count + " en cola" : "cola vac\xEDa"
    ].filter(Boolean);
    statusLine.textContent = parts.join(" \xB7 ");
  }
  return { diagDeps, diag, report };
}
function createDiagnosticsButton(label, marginTop) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cloud-sync-btn cloud-sync-btn--ghost";
  btn.style.width = "100%";
  if (marginTop) btn.style.marginTop = marginTop;
  btn.textContent = label;
  return btn;
}
function mountCloudSyncDiagnostics(host, deps) {
  if (!host) return;
  host.textContent = "";
  const wrap = document.createElement("div");
  wrap.className = "cloud-sync-diagnostics";
  const statusLine = document.createElement("p");
  statusLine.className = "cloud-sync-hint";
  statusLine.setAttribute("data-cloud-diag-status", "1");
  wrap.appendChild(statusLine);
  const badge = document.createElement("span");
  badge.className = "cloud-sync-outbox-badge";
  badge.setAttribute("data-cloud-outbox-badge", "1");
  badge.hidden = true;
  badge.style.cssText = "display:inline-block;margin:0 0 8px;font-size:11px;background:#f59e0b;color:#fff;padding:2px 8px;border-radius:10px;";
  wrap.appendChild(badge);
  const reportPre = document.createElement("pre");
  reportPre.className = "cloud-sync-diagnostics-pre lan-sync-diagnostics-pre";
  wrap.appendChild(reportPre);
  const copyBtn = createDiagnosticsButton("Copiar informe");
  copyBtn.onclick = function() {
    const built = renderCloudDiagnosticsReport(host, deps);
    void copyToClipboardSafe(built.report).then(function(ok) {
      deps?.toast?.(
        ok ? "Informe Nube copiado (tokens redactados)." : "No se pudo copiar el informe.",
        ok ? "success" : "error"
      );
    });
  };
  wrap.appendChild(copyBtn);
  const retryBtn = createDiagnosticsButton("Reintentar cola Nube", "6px");
  retryBtn.onclick = function() {
    const runtime = getSharedNubeRuntime();
    if (!runtime) {
      deps?.toast?.("Runtime Nube inactivo. Reconecta en Conexi\xF3n.", "warn");
      return;
    }
    void runtime.flushOutbox().then(function() {
      return runtime.syncCycle();
    }).then(function() {
      deps?.toast?.("Cola Nube reintentada. Revisa el informe.", "info");
      refreshCloudSyncDiagnostics(host, deps);
    }).catch(function() {
      deps?.toast?.("Fall\xF3 el reintento. Revisa el informe.", "error");
      refreshCloudSyncDiagnostics(host, deps);
    });
  };
  wrap.appendChild(retryBtn);
  const syncBtn = createDiagnosticsButton("Forzar sincronizaci\xF3n", "6px");
  syncBtn.onclick = function() {
    const runtime = getSharedNubeRuntime();
    if (!runtime) {
      deps?.toast?.("Runtime Nube inactivo. Reconecta en Conexi\xF3n.", "warn");
      return;
    }
    void runtime.syncCycle().then(function() {
      deps?.toast?.("Ciclo Nube ejecutado.", "info");
      refreshCloudSyncDiagnostics(host, deps);
    });
  };
  wrap.appendChild(syncBtn);
  host.appendChild(wrap);
  renderCloudDiagnosticsReport(host, deps);
}
function refreshCloudSyncDiagnostics(host, deps) {
  if (!host) return;
  if (!host.querySelector(".cloud-sync-diagnostics")) {
    mountCloudSyncDiagnostics(host, deps);
    return;
  }
  renderCloudDiagnosticsReport(host, deps);
}

// public/js/features/cloud-sync/panel-conexion-bootstrap.mjs
function adminShellHtml(hasCloudSession = false) {
  if (!canAccessCloudAdmin(clinicalSessionContext.user, { hasCloudSession })) return "";
  return '<div class="cloud-sync-admin-host" data-cloud-admin-host></div>';
}
function buildConexionGoView(section, deps, ui) {
  return function goView(view) {
    applyConexionView(section, view, {
      onAdmin: ui.ensureAdminOpen,
      onMobile() {
        mountCloudMobileInviteInHost(
          section.querySelector("[data-cloud-mobile-invite-host]"),
          { runtime: deps.runtime }
        );
      },
      onNube() {
        refreshCloudSyncDiagnostics(section.querySelector("[data-cloud-nube-diagnostics-host]"), {
          toast: ui.toast
        });
      }
    });
  };
}
function buildConexionClickActions(handlerDeps, ui, goView) {
  return {
    register: () => void handleRegister(handlerDeps),
    login: () => void handleLogin(handlerDeps),
    recover: () => void handleRecover(handlerDeps),
    "regenerate-recovery": () => void handleRegenerateRecovery(handlerDeps),
    "create-room": () => void handleCreateRoom(handlerDeps),
    "join-room": () => void handleJoinRoom(handlerDeps),
    "leave-room": () => void handleLeaveRoom(handlerDeps),
    logout: () => void handleLogout(handlerDeps),
    "open-rotation": () => void handleOpenRotation(ui.toast),
    "toggle-admin": () => void ui.ensureAdminOpen?.(),
    "nav-options": () => goView("options"),
    "nav-back": () => {
      const cur = handlerDeps.section.dataset.cloudView || "status";
      goView(cur === "options" ? "status" : "options");
    },
    "save-url": () => {
      void ui.saveUrlFromUi().then(function() {
        ui.toast?.("URL guardada", "success");
      });
    }
  };
}
function wireConexionClicks(section, deps, ui) {
  const handlerDeps = {
    renderLanPanel: deps.renderLanPanel,
    section,
    normalizedSala: ui.normalizedSala,
    toast: ui.toast,
    getApi: deps.getApi,
    getUserSala: deps.getUserSala,
    getCloudSyncToken: deps.getCloudSyncToken,
    setCloudSyncToken: deps.setCloudSyncToken,
    clearCloudSyncSession: deps.clearCloudSyncSession,
    getCloudSyncRoomId: deps.getCloudSyncRoomId,
    setCloudSyncRoomId: deps.setCloudSyncRoomId,
    getCloudSyncRoomSnapshot: deps.getCloudSyncRoomSnapshot,
    setCloudSyncRoomSnapshot: deps.setCloudSyncRoomSnapshot,
    getCloudSyncRevision: deps.getCloudSyncRevision,
    setCloudSyncRevision: deps.setCloudSyncRevision,
    onCloudRoomChange: deps.onCloudRoomChange,
    saveUrlFromUi: ui.saveUrlFromUi,
    tryAutoEnsureTurnRoom: ui.tryAutoEnsureTurnRoom,
    renderConnected: ui.renderConnected,
    renderDisconnected: ui.renderDisconnected,
    startRuntime: ui.startRuntime,
    stopRuntime: ui.stopRuntime,
    setCloudUser: ui.setCloudUser,
    getCloudUser: ui.getCloudUser,
    handleOpenRotation: () => handleOpenRotation(ui.toast),
    renderAfterAuth() {
      renderAfterAuth(handlerDeps);
    }
  };
  const goView = buildConexionGoView(section, deps, ui);
  const clickActions = buildConexionClickActions(handlerDeps, ui, goView);
  function onCloudActionClick(ev) {
    const btn = ev.target instanceof Element ? ev.target.closest("[data-cloud-action]") : null;
    if (!btn) return;
    if (!section.contains(btn) && btn.id !== "btn-connection-dropdown-back") return;
    const action = btn.getAttribute("data-cloud-action");
    if (action === "nav-view") {
      const view = btn.getAttribute("data-cloud-view");
      if (view) goView(view);
      return;
    }
    if (action && clickActions[action]) clickActions[action]();
  }
  section.addEventListener("click", onCloudActionClick);
  document.getElementById("connection-dropdown")?.addEventListener("click", onCloudActionClick);
}
function refreshConnectedEquipoStep(section, getToken) {
  const equipo = section.querySelector("[data-cloud-equipo-body]");
  if (userHasJoinedTeam() && equipo) {
    equipo.outerHTML = '<p class="cloud-sync-hint" data-cloud-equipo-body>Equipo configurado.</p>';
    return;
  }
  if (!userHasJoinedTeam() && !equipo) {
    const view = section.querySelector('[data-cloud-view="equipo"] .cloud-sync-view-body');
    if (view) view.insertAdjacentHTML("afterbegin", equipoStepHtml(getToken));
  }
}
function refreshDisconnectedNextStep(section, getToken) {
  const next = section.querySelector(".cloud-sync-next-step");
  if (userHasJoinedTeam() && next) next.remove();
  else if (!userHasJoinedTeam() && !next) {
    const anchor = section.querySelector(".cloud-sync-account");
    if (anchor) anchor.insertAdjacentHTML("afterend", nextStepHtml(getToken));
  }
}
function wireTeamsChangedListener(section, deps, ui) {
  document.addEventListener("rpc-clinical-teams-changed", function onTeamsChanged() {
    if (!section.isConnected) return;
    const roomId = deps.getCloudSyncRoomId();
    if (roomId && deps.getCloudSyncToken()) {
      refreshConnectedEquipoStep(section, deps.getCloudSyncToken);
      return;
    }
    if (deps.getCloudSyncToken()) {
      refreshDisconnectedNextStep(section, deps.getCloudSyncToken);
      ui.renderDisconnected();
    }
  });
}
function localRoomFromSession(deps, normalizedSala) {
  const roomId = deps.getCloudSyncRoomId();
  const token = deps.getCloudSyncToken();
  if (!roomId || !token) return null;
  const snap = deps.getCloudSyncRoomSnapshot ? deps.getCloudSyncRoomSnapshot() : null;
  const revision = Number(deps.getCloudSyncRevision() || 0) || 0;
  return {
    id: String(roomId),
    revision,
    sala: String(snap && snap.sala || normalizedSala || ""),
    code: String(snap && snap.code || ""),
    turnKey: String(snap && snap.turnKey || ""),
    name: String(snap && snap.name || "")
  };
}
function reconcileCanonicalCloudRoom(section, deps, ui, cachedRoomId) {
  if (typeof ui.tryAutoEnsureTurnRoom !== "function") return;
  void ui.tryAutoEnsureTurnRoom().then(function(room) {
    if (!room || !section.isConnected) return;
    const nextId = String(room.id || "").trim();
    if (!nextId || nextId === String(cachedRoomId || "").trim()) return;
    ui.renderConnected(room);
  });
}
function bootstrapConexionState(section, deps, ui) {
  const roomId = deps.getCloudSyncRoomId();
  if (roomId && deps.getCloudSyncToken()) {
    reconcileCanonicalCloudRoom(section, deps, ui, roomId);
    const optimistic = localRoomFromSession(deps, ui.normalizedSala);
    if (optimistic) {
      ui.renderConnected(optimistic);
      return;
    }
    void deps.getApi().getRoom(roomId).then(function(data) {
      if (!section.isConnected) return;
      ui.setCloudUser(null);
      ui.renderConnected(data.room || data);
    }).catch(function() {
      if (!section.isConnected) return;
      deps.clearCloudSyncSession();
      deps.onCloudRoomChange?.(false);
      ui.renderDisconnected();
    });
    return;
  }
  if (deps.getCloudSyncToken()) {
    ui.renderDisconnected();
    void ui.tryAutoEnsureTurnRoom().then(function(room) {
      if (room && section.isConnected) ui.renderConnected(room);
    });
    return;
  }
  ui.renderDisconnected();
}
function mountAdminShell(section, deps, toast) {
  let adminMount = null;
  async function ensureAdminOpen() {
    const host = section.querySelector("[data-cloud-admin-host]");
    if (!host) return;
    if (!adminMount) {
      const { mountCloudAdminPanel } = await import("/mobile/js/chunks/panel-admin-MZ23BT5N.js");
      host.textContent = "";
      adminMount = mountCloudAdminPanel(host, { getApi: deps.getApi, toast });
    } else {
      adminMount.refresh?.();
    }
  }
  return { ensureAdminOpen, toggleAdminPanel: ensureAdminOpen };
}

// public/js/features/cloud-sync/panel-conexion-ui.mjs
function createConexionRenderers(section, normalizedSala, deps, ctx) {
  const displaySala = String(ctx.displaySala || normalizedSala || "").trim() || normalizedSala;
  function renderShell(bodyHtml, status, detail) {
    section.innerHTML = conexionShellHtml(displaySala, bodyHtml, status, detail);
  }
  function renderConnectedBody(roomHtml) {
    const hasCloudSession = !!deps.getCloudSyncToken();
    renderShell(
      connectedViewsHtml({
        cloudUser: ctx.cloudUser,
        roomHtml,
        equipoHtml: equipoStepHtml(deps.getCloudSyncToken),
        adminHtml: adminShellHtml(hasCloudSession),
        url: deps.getCloudSyncUrl(),
        hasCloudSession
      }),
      "idle"
    );
    applyConexionView(section, "status", { onAdmin: ctx.ensureAdminOpen });
  }
  function renderConnected(room, opts) {
    renderConnectedBody(roomConnectedHtml(room, deps.getCloudSyncRevision));
    if (opts?.startRuntime !== false) ctx.startRuntime();
  }
  function renderDisconnected() {
    const hasToken = !!deps.getCloudSyncToken();
    if (!hasToken) {
      renderShell(authFormsHtml(deps.getCloudSyncUrl()), "offline");
      return;
    }
    renderConnectedBody(roomActionsHtml(displaySala));
  }
  return { renderConnected, renderDisconnected };
}
async function saveUrlFromUi(section, setCloudSyncUrl) {
  const input = section.querySelector("[data-cloud-sync-url]");
  if (input) setCloudSyncUrl(String(input.value || "").trim());
}

// public/js/features/cloud-sync/panel-conexion.mjs
function bindStatusChip(section, deps) {
  const toast = typeof deps.toast === "function" ? deps.toast : function() {
  };
  return function renderStatusChip(status, detail) {
    const chip = section.querySelector("[data-cloud-status-chip]");
    if (!chip) return;
    chip.textContent = STATUS_LABELS[status] || status;
    chip.className = "cloud-sync-status-chip " + statusChipModifier(status);
    chip.setAttribute("data-status", status);
    const detailEl = section.querySelector("[data-cloud-status-detail]");
    if (detailEl) {
      const text = status === "error" ? humanizeCloudSyncErrorMessage(String(detail || "").trim()) : "";
      detailEl.textContent = text;
      detailEl.hidden = !text;
    }
    deps.setStatus?.(status, detail);
    if (section.dataset.cloudView === "nube") {
      refreshCloudSyncDiagnostics(section.querySelector("[data-cloud-nube-diagnostics-host]"), {
        toast
      });
    }
  };
}
function createEnsureTurn(deps, ui) {
  let inflight = null;
  return async function tryAutoEnsureTurnRoom() {
    if (!deps.getCloudSyncToken()) return null;
    if (inflight) return inflight;
    const { ensureTurnRoom } = await import("/mobile/js/chunks/ensure-turn-room-HDWGOQKO.js");
    inflight = ensureTurnRoom({
      api: deps.getApi(),
      getSala: deps.getUserSala,
      getToken: deps.getCloudSyncToken,
      setCloudSyncRoomId: deps.setCloudSyncRoomId,
      setCloudSyncRoomSnapshot: deps.setCloudSyncRoomSnapshot,
      setCloudSyncRevision: deps.setCloudSyncRevision,
      onConnected() {
        deps.onCloudRoomChange?.(true);
      },
      toast: ui.toast
    }).finally(function() {
      inflight = null;
    });
    return inflight;
  };
}
function mountNubeSection(root, deps) {
  const sala = deps.getUserSala();
  if (!shouldShowNubePanel(sala)) return null;
  const toast = deps.toast || function() {
  };
  const normalizedSala = normalizeCloudSala(sala);
  const displaySala = displayCloudSalaLabel(sala);
  let cloudUser = null;
  const section = document.createElement("section");
  section.className = "cloud-sync-conexion";
  section.setAttribute("data-cloud-nube-section", "1");
  const { startRuntime, stopRuntime } = createNubeRuntime({
    getApi: deps.getApi,
    getCloudSyncRoomId: deps.getCloudSyncRoomId,
    getCloudSyncToken: deps.getCloudSyncToken,
    getCloudSyncRevision: deps.getCloudSyncRevision,
    setCloudSyncRevision: deps.setCloudSyncRevision,
    onStatus: bindStatusChip(section, deps),
    toast
  });
  const cloudUserRef = {
    get cloudUser() {
      return cloudUser;
    },
    set cloudUser(v) {
      cloudUser = v;
    },
    startRuntime,
    displaySala
  };
  const { renderConnected, renderDisconnected } = createConexionRenderers(
    section,
    normalizedSala,
    deps,
    cloudUserRef
  );
  const { ensureAdminOpen, toggleAdminPanel } = mountAdminShell(section, deps, toast);
  cloudUserRef.ensureAdminOpen = ensureAdminOpen;
  const ui = {
    normalizedSala,
    toast,
    saveUrlFromUi: () => saveUrlFromUi(section, deps.setCloudSyncUrl),
    tryAutoEnsureTurnRoom: createEnsureTurn(deps, { toast, renderConnected }),
    renderConnected,
    renderDisconnected,
    startRuntime,
    stopRuntime,
    setCloudUser(u) {
      cloudUser = u;
    },
    getCloudUser() {
      return cloudUser;
    },
    ensureAdminOpen,
    toggleAdminPanel
  };
  wireCloudAuthTabs(section);
  wireConexionClicks(section, deps, ui);
  wireTeamsChangedListener(section, deps, ui);
  bootstrapConexionState(section, deps, ui);
  root.appendChild(section);
  return { section, stop() {
    stopRuntime();
  } };
}
export {
  mountNubeSection
};
//# sourceMappingURL=/js/chunks/panel-nube-section-RNP5YJZY.js.map
