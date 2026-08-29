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
} from "/mobile/js/chunks/chunk-KRIEMMKT.js";
import {
  mountCloudMobileInviteInHost
} from "/mobile/js/chunks/chunk-JTTNXS5E.js";
import {
  applyConexionView,
  authFormsHtml,
  conexionShellHtml,
  connectedViewsHtml,
  equipoEmbedHostHtml,
  formatCloudStatusChipLabel,
  nextStepHtml,
  refreshCloudSyncDiagnostics,
  roomActionsHtml,
  roomConnectedHtml,
  statusChipModifier,
  userHasJoinedTeam,
  wireCloudAuthTabs
} from "/mobile/js/chunks/chunk-L6C4JZGU.js";
import "/mobile/js/chunks/chunk-36QQC646.js";
import "/mobile/js/chunks/chunk-HABESGMS.js";
import {
  canAccessCloudAdmin
} from "/mobile/js/chunks/chunk-BH7QFRSK.js";
import "/mobile/js/chunks/chunk-OBGB2GI4.js";
import {
  createNubeRuntime,
  getSharedNubeOutbox,
  getSharedNubeRuntime
} from "/mobile/js/chunks/chunk-FN6TV54N.js";
import {
  promptAndApplyRemotePatientDeletes
} from "/mobile/js/chunks/chunk-A3RN2FNA.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-BZFH7ZFF.js";
import "/mobile/js/chunks/chunk-O5BLBOGB.js";
import {
  hydrateRoomDeksFromPersistence,
  isRoomUnprotected,
  retryRoomDekIfUnprotected
} from "/mobile/js/chunks/chunk-PVAHDYTI.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-7E4ACOES.js";
import "/mobile/js/chunks/chunk-EP7FYMO7.js";
import "/mobile/js/chunks/chunk-HHBM77OL.js";
import "/mobile/js/chunks/chunk-CBI7THZ4.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-JGESXDLG.js";
import "/mobile/js/chunks/chunk-SHV4FR3K.js";
import {
  mountEquipoTeamsPanel,
  wireClinicalTeamsFormDelegation
} from "/mobile/js/chunks/chunk-6P7TSNN6.js";
import "/mobile/js/chunks/chunk-JNMJGW22.js";
import "/mobile/js/chunks/chunk-WEWTMUQK.js";
import "/mobile/js/chunks/chunk-PJD3LECG.js";
import "/mobile/js/chunks/chunk-LN2N4VIO.js";
import "/mobile/js/chunks/chunk-2GD37PRJ.js";
import "/mobile/js/chunks/chunk-5CRK7XGO.js";
import "/mobile/js/chunks/chunk-4EH4XZVS.js";
import "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import "/mobile/js/chunks/chunk-PLO52CII.js";
import "/mobile/js/chunks/chunk-WEOKZTSW.js";
import "/mobile/js/chunks/chunk-7XJNQXQX.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-VAFCBXBV.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-QLSLJE42.js";
import "/mobile/js/chunks/chunk-EASTAY6S.js";
import "/mobile/js/chunks/chunk-B7NNRK4H.js";
import {
  humanizeCloudSyncErrorMessage
} from "/mobile/js/chunks/chunk-ZDAIWZ25.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-MLLRKYO6.js";
import "/mobile/js/chunks/chunk-2SJQGKPU.js";
import "/mobile/js/chunks/chunk-EZ7GA6IL.js";
import {
  shouldShowNubePanel
} from "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-K4PQIQOH.js";
import "/mobile/js/chunks/chunk-BTIFFDH4.js";
import "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-Y2YRXJMM.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-XV2TMACY.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import {
  displayCloudSalaLabel,
  normalizeCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  getStoredRoomDeks
} from "/mobile/js/chunks/chunk-FLGCYVFI.js";

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
      },
      onEquipo() {
        mountEquipoTeamsPanel(section.querySelector("[data-cloud-equipo-host]"), {
          toast: ui.toast
        });
      },
      onStatusHome() {
        ui.refreshStatusChipFromRuntime?.();
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
    getCloudSyncRemember: deps.getCloudSyncRemember,
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
    if (action === "review-remote-delete") {
      const patientId = btn.getAttribute("data-patient-id") || "";
      const deletedAt = btn.getAttribute("data-deleted-at") || "";
      if (patientId) {
        void promptAndApplyRemotePatientDeletes([{ patientId, deletedAt }]).then(function() {
          handlerDeps.renderConnected(handlerDeps.getCloudSyncRoomSnapshot?.());
        });
      }
      return;
    }
    if (action && clickActions[action]) clickActions[action]();
  }
  section.addEventListener("click", onCloudActionClick);
  document.getElementById("connection-dropdown")?.addEventListener("click", onCloudActionClick);
  wireClinicalTeamsFormDelegation(section);
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
  const snapCode = String(deps.getCloudSyncRoomSnapshot?.()?.code || "").trim();
  void ui.tryAutoEnsureTurnRoom().then(function(room) {
    if (!room || !section.isConnected) return;
    const nextId = String(room.id || "").trim();
    const cachedId = String(cachedRoomId || "").trim();
    const roomCode = String(room.code || "").trim();
    if (roomCode && (!snapCode || nextId && nextId !== cachedId)) {
      ui.renderConnected(room);
    }
  });
}
function bootstrapConexionState(section, deps, ui) {
  const roomId = deps.getCloudSyncRoomId();
  if (roomId && deps.getCloudSyncToken()) {
    void hydrateRoomDeksFromPersistence(getStoredRoomDeks());
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
    }).catch(function(err) {
      if (!section.isConnected) return;
      const status = Number(err && err.status) || 0;
      if (status === 401 || status === 403) {
        deps.clearCloudSyncSession();
        deps.onCloudRoomChange?.(false);
        ui.renderDisconnected();
        return;
      }
      deps.onCloudRoomChange?.(false);
      ui.renderDisconnected();
      void ui.tryAutoEnsureTurnRoom?.().then(function(room) {
        if (room && section.isConnected) ui.renderConnected(room);
      });
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
      const { mountCloudAdminPanel } = await import("/mobile/js/chunks/panel-admin-SE3FY6KW.js");
      host.textContent = "";
      adminMount = mountCloudAdminPanel(host, { getApi: deps.getApi, toast });
    } else {
      adminMount.refresh?.();
    }
  }
  return { ensureAdminOpen, toggleAdminPanel: ensureAdminOpen };
}

// public/js/features/cloud-sync/cloud-sync-status-snapshot.mjs
function resolveCloudConexionChipStatus() {
  const runtime = getSharedNubeRuntime();
  let status = String(runtime?.getStatus?.() || "idle");
  const detail = String(runtime?.getDetail?.() || "");
  const transport = runtime?.getTransportState?.() || "poll";
  const pending = getSharedNubeOutbox()?.list?.().length || 0;
  if (pending > 0 && status === "idle") status = "pending";
  return { status, detail, transport };
}

// public/js/features/cloud-sync/panel-conexion-ui.mjs
function createConexionRenderers(section, normalizedSala, deps, ctx) {
  const displaySala = String(ctx.displaySala || normalizedSala || "").trim() || normalizedSala;
  function renderShell(bodyHtml, status, detail) {
    section.innerHTML = conexionShellHtml(displaySala, bodyHtml, status, detail);
  }
  function renderConnectedBody(roomHtml) {
    const hasCloudSession = !!deps.getCloudSyncToken();
    const chip = resolveCloudConexionChipStatus();
    renderShell(
      connectedViewsHtml({
        cloudUser: ctx.cloudUser,
        roomHtml,
        equipoHtml: equipoEmbedHostHtml(),
        adminHtml: adminShellHtml(hasCloudSession),
        url: deps.getCloudSyncUrl(),
        hasCloudSession
      }),
      chip.status,
      chip.detail
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
      wireCloudAuthTabs(section);
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

// public/js/features/cloud-sync/cloud-sync-header-chrome.mjs
var HEADER_MODIFIERS = ["idle", "live", "syncing", "degraded", "local"];
function cloudHeaderSyncModifier(status, transport) {
  const key = String(status || "idle");
  const mode = String(transport || "poll");
  if (key === "syncing") return "syncing";
  if (key === "error" || key === "offline" || key === "pending") return "degraded";
  if (key === "idle" && mode === "ws") return "live";
  if (key === "idle" && mode === "poll") return "local";
  return "idle";
}
function applyHeaderTeamSyncVisual(status, transport) {
  if (typeof document === "undefined") return;
  const btn = document.getElementById("btn-header-team-sync");
  if (!btn) return;
  const mod = cloudHeaderSyncModifier(status, transport);
  HEADER_MODIFIERS.forEach(function(name) {
    btn.classList.remove("btn-livesync-header--" + name);
  });
  btn.classList.add("btn-livesync-header--" + mod);
}

// public/js/features/cloud-sync/panel-conexion.mjs
function checkRoomUnprotectedBadge(deps) {
  const snap = deps.getCloudSyncRoomSnapshot?.();
  const roomId = snap?.id;
  const unprotected = Boolean(roomId && isRoomUnprotected(roomId));
  if (unprotected) void retryRoomDekIfUnprotected(deps.getApi(), roomId, snap.code);
  return unprotected;
}
function statusDetailText(unprotected, resolvedStatus, resolvedDetail) {
  if (unprotected) return "Esta sala no est\xE1 protegida ahora mismo.";
  if (resolvedStatus !== "error") return "";
  return humanizeCloudSyncErrorMessage(String(resolvedDetail || "").trim());
}
function bindStatusChip(section, deps) {
  const toast = typeof deps.toast === "function" ? deps.toast : function() {
  };
  function renderStatusChip(status, detail) {
    const chip = section.querySelector("[data-cloud-status-chip]");
    const live = resolveCloudConexionChipStatus();
    const resolvedStatus = live.status || status;
    const resolvedDetail = live.detail || detail;
    const transport = live.transport || getSharedNubeRuntime()?.getTransportState?.() || "poll";
    if (chip) {
      chip.textContent = formatCloudStatusChipLabel(resolvedStatus, transport);
      chip.className = "cloud-sync-status-chip " + statusChipModifier(resolvedStatus);
      chip.setAttribute("data-status", resolvedStatus);
      chip.setAttribute("data-cloud-transport", transport);
    }
    const detailEl = section.querySelector("[data-cloud-status-detail]");
    if (detailEl) {
      const text = statusDetailText(checkRoomUnprotectedBadge(deps), resolvedStatus, resolvedDetail);
      detailEl.textContent = text;
      detailEl.hidden = !text;
    }
    applyHeaderTeamSyncVisual(resolvedStatus, transport);
    deps.setStatus?.(resolvedStatus, resolvedDetail);
    if (section.dataset.cloudView === "nube") {
      refreshCloudSyncDiagnostics(section.querySelector("[data-cloud-nube-diagnostics-host]"), {
        toast
      });
    }
  }
  function refreshStatusChipFromRuntime() {
    const live = resolveCloudConexionChipStatus();
    renderStatusChip(live.status, live.detail);
  }
  return { renderStatusChip, refreshStatusChipFromRuntime };
}
function createEnsureTurn(deps, ui) {
  let inflight = null;
  return async function tryAutoEnsureTurnRoom() {
    if (!deps.getCloudSyncToken()) return null;
    if (inflight) return inflight;
    const { ensureTurnRoom } = await import("/mobile/js/chunks/ensure-turn-room-57XFBPZG.js");
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
  const statusChip = bindStatusChip(section, deps);
  const { startRuntime: startRuntimeInner, stopRuntime } = createNubeRuntime({
    getApi: deps.getApi,
    getCloudSyncRoomId: deps.getCloudSyncRoomId,
    getCloudSyncToken: deps.getCloudSyncToken,
    getCloudSyncRevision: deps.getCloudSyncRevision,
    setCloudSyncRevision: deps.setCloudSyncRevision,
    onStatus: statusChip.renderStatusChip,
    toast
  });
  function startRuntime() {
    startRuntimeInner();
    statusChip.refreshStatusChipFromRuntime();
  }
  const cloudUserRef = {
    get cloudUser() {
      return cloudUser;
    },
    set cloudUser(v) {
      cloudUser = v;
    },
    startRuntime,
    refreshStatusChipFromRuntime: statusChip.refreshStatusChipFromRuntime,
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
    refreshStatusChipFromRuntime: statusChip.refreshStatusChipFromRuntime,
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
//# sourceMappingURL=/js/chunks/panel-nube-section-37C72VQW.js.map
