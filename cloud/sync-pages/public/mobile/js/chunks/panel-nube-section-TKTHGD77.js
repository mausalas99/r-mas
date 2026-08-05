import {
  createNubeRuntime
} from "/mobile/js/chunks/chunk-6WGKVNXP.js";
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
} from "/mobile/js/chunks/chunk-KAAGGFX5.js";
import "/mobile/js/chunks/chunk-65TYIGXN.js";
import "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-E2YV5EEU.js";
import "/mobile/js/chunks/chunk-HQZG5N6A.js";
import "/mobile/js/chunks/chunk-3QVHQ4QK.js";
import "/mobile/js/chunks/chunk-CV62ZWIZ.js";
import "/mobile/js/chunks/chunk-GGQQKZC2.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import {
  STATUS_LABELS,
  applyConexionView,
  authFormsHtml,
  conexionShellHtml,
  connectedViewsHtml,
  equipoStepHtml,
  mountCloudMobileInviteInHost,
  nextStepHtml,
  roomActionsHtml,
  roomConnectedHtml,
  statusChipModifier,
  userHasJoinedTeam,
  wireCloudAuthTabs
} from "/mobile/js/chunks/chunk-GQ4IO4LN.js";
import "/mobile/js/chunks/chunk-OWLZMO5A.js";
import "/mobile/js/chunks/chunk-N7COVD6D.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-URSGTGGU.js";
import {
  canAccessCloudAdmin
} from "/mobile/js/chunks/chunk-N73GQSRB.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-4FTQ7XEU.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-34AJGDKI.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-XAKSV4LG.js";
import "/mobile/js/chunks/chunk-CLJUGM4X.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-RQRXI24X.js";
import "/mobile/js/chunks/chunk-64JY3O3H.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-2NLWSG7O.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-DIWJYISZ.js";
import "/mobile/js/chunks/chunk-IBKESWFJ.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import "/mobile/js/chunks/chunk-JFY46RJV.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-YAGCGSLT.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-UW56GTLS.js";
import "/mobile/js/chunks/chunk-PXDCZYH3.js";
import "/mobile/js/chunks/chunk-GWKS66VB.js";
import "/mobile/js/chunks/chunk-3566DTDN.js";
import {
  displayCloudSalaLabel,
  normalizeCloudSala,
  shouldShowNubePanel
} from "/mobile/js/chunks/chunk-IRC74J3Z.js";
import "/mobile/js/chunks/chunk-BRT2MMPP.js";
import "/mobile/js/chunks/chunk-HMTHREEE.js";
import "/mobile/js/chunks/chunk-CRJYUJ23.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import "/mobile/js/chunks/chunk-TYH5ME2D.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-TSLGFHIE.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";

// public/js/features/cloud-sync/panel-conexion-bootstrap.mjs
function adminShellHtml(hasCloudSession = false) {
  if (!canAccessCloudAdmin(clinicalSessionContext.user, { hasCloudSession })) return "";
  return '<div class="cloud-sync-admin-host" data-cloud-admin-host></div>';
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
  function goView(view) {
    applyConexionView(section, view, {
      onAdmin: ui.ensureAdminOpen,
      onMobile: function() {
        mountCloudMobileInviteInHost(
          section.querySelector("[data-cloud-mobile-invite-host]"),
          { runtime: deps.runtime }
        );
      }
    });
  }
  const clickActions = {
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
      const cur = section.dataset.cloudView || "status";
      goView(cur === "options" ? "status" : "options");
    },
    "save-url": () => {
      void ui.saveUrlFromUi().then(function() {
        ui.toast?.("URL guardada", "success");
      });
    }
  };
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
function bootstrapConexionState(section, deps, ui) {
  const roomId = deps.getCloudSyncRoomId();
  if (roomId && deps.getCloudSyncToken()) {
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
      const { mountCloudAdminPanel } = await import("/mobile/js/chunks/panel-admin-IHBLNSN5.js");
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
  return function renderStatusChip(status, detail) {
    const chip = section.querySelector("[data-cloud-status-chip]");
    if (!chip) return;
    chip.textContent = STATUS_LABELS[status] || status;
    chip.className = "cloud-sync-status-chip " + statusChipModifier(status);
    chip.setAttribute("data-status", status);
    const detailEl = section.querySelector("[data-cloud-status-detail]");
    if (detailEl) {
      const text = status === "error" ? String(detail || "").trim() : "";
      detailEl.textContent = text;
      detailEl.hidden = !text;
    }
    deps.setStatus?.(status, detail);
  };
}
function createEnsureTurn(deps, ui) {
  let inflight = null;
  let done = false;
  return async function tryAutoEnsureTurnRoom() {
    if (!deps.getCloudSyncToken() || done) return null;
    if (inflight) return inflight;
    const { ensureTurnRoom } = await import("/mobile/js/chunks/ensure-turn-room-JL3YCS6L.js");
    inflight = ensureTurnRoom({
      api: deps.getApi(),
      getSala: deps.getUserSala,
      getToken: deps.getCloudSyncToken,
      setCloudSyncRoomId: deps.setCloudSyncRoomId,
      setCloudSyncRoomSnapshot: deps.setCloudSyncRoomSnapshot,
      setCloudSyncRevision: deps.setCloudSyncRevision,
      onConnected() {
        done = true;
        deps.onCloudRoomChange?.(true);
      },
      toast: ui.toast
    }).finally(function() {
      inflight = null;
      done = true;
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
//# sourceMappingURL=/js/chunks/panel-nube-section-TKTHGD77.js.map
