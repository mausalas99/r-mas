import {
  isCloudMobileClient
} from "/mobile/js/chunks/chunk-OXN2ZL25.js";
import {
  getUserSala
} from "/mobile/js/chunks/chunk-Q2YIMSEE.js";
import {
  closeModalAnimated
} from "/mobile/js/chunks/chunk-QWJHEGH4.js";

// public/js/features/cloud-sync/connection-panel.mjs
var _cloudNubeMount = null;
function nubeSectionInDom() {
  return !!(typeof document !== "undefined" && document.querySelector(".cloud-sync-conexion"));
}
async function mountCloudConnectionPanel(root, deps) {
  const { shouldShowNubePanel } = await import("/mobile/js/chunks/nube-sync-policy-NUQXIAXS.js");
  if (!shouldShowNubePanel(getUserSala())) return;
  if (_cloudNubeMount && nubeSectionInDom()) {
    const el = root.querySelector(".cloud-sync-conexion");
    if (el && root.firstChild !== el) root.insertBefore(el, root.firstChild);
    return;
  }
  if (_cloudNubeMount && typeof _cloudNubeMount.stop === "function") {
    _cloudNubeMount.stop();
    _cloudNubeMount = null;
  }
  const settings = await import("/mobile/js/chunks/settings-KQZK5HV5.js");
  const { createCloudSyncApi } = await import("/mobile/js/chunks/api-client-UUICDQ3F.js");
  const { getSessionAdminKey } = await import("/mobile/js/chunks/panel-admin-MAB55KLO.js");
  const { mountNubeSection } = await import("/mobile/js/chunks/panel-nube-section-DY5MMLGX.js");
  const { setCloudRoomConnected } = await import("/mobile/js/chunks/nube-sync-policy-NUQXIAXS.js");
  const api = createCloudSyncApi({
    getBaseUrl: settings.getCloudSyncUrl,
    getToken: settings.getCloudSyncToken,
    getAdminKey: getSessionAdminKey
  });
  _cloudNubeMount = mountNubeSection(root, {
    renderLanPanel: function() {
      return mountCloudConnectionPanel(root, deps);
    },
    getUserSala,
    getCloudSyncUrl: settings.getCloudSyncUrl,
    setCloudSyncUrl: settings.setCloudSyncUrl,
    getCloudSyncToken: settings.getCloudSyncToken,
    setCloudSyncToken: settings.setCloudSyncToken,
    clearCloudSyncSession: settings.clearCloudSyncSession,
    getCloudSyncRoomId: settings.getCloudSyncRoomId,
    setCloudSyncRoomId: settings.setCloudSyncRoomId,
    getCloudSyncRoomSnapshot: settings.getCloudSyncRoomSnapshot,
    setCloudSyncRoomSnapshot: settings.setCloudSyncRoomSnapshot,
    getCloudSyncRevision: settings.getCloudSyncRevision,
    setCloudSyncRevision: settings.setCloudSyncRevision,
    getApi: function() {
      return api;
    },
    toast: function(msg, kind) {
      deps.runtime().showToast?.(msg, kind);
    },
    onCloudRoomChange: function(connected) {
      setCloudRoomConnected(connected);
      try {
        void import("/mobile/js/chunks/clinical-rotation-entry-2SRV3X5Y.js").then((m) => m.syncClinicalRotationEntryChrome?.());
      } catch {
      }
    }
  });
}
async function renderConnectionPanel(opts) {
  const root = document.getElementById("lan-connection-panel-root");
  if (!root) return;
  const runtime = function() {
    return {
      showToast() {
      },
      closeSettingsDropdown() {
      },
      isMobileWeb() {
        return false;
      }
    };
  };
  try {
    const shell = await import("/mobile/js/chunks/app-shell-UFTFFCNV.js");
    runtime.showToast = shell.showToast;
    runtime.closeSettingsDropdown = shell.closeSettingsDropdown || function() {
    };
  } catch {
  }
  await mountCloudConnectionPanel(root, { runtime });
  void opts;
}

// public/js/features/cloud-sync/panel-chrome.mjs
var connectionModalChromeWired = false;
function isLanConnectionDropdownOpen() {
  const bg = document.getElementById("connection-dropdown-backdrop");
  return !!(bg && bg.classList.contains("open"));
}
function wireConnectionModalChromeOnce(closeConnectionDropdown2) {
  if (connectionModalChromeWired) return;
  connectionModalChromeWired = true;
  document.getElementById("btn-connection-dropdown-close")?.addEventListener("click", () => {
    closeConnectionDropdown2();
  });
  const bg = document.getElementById("connection-dropdown-backdrop");
  bg?.addEventListener("click", (ev) => {
    if (ev.target === bg) closeConnectionDropdown2();
  });
}
function getRuntime() {
  return {
    showToast(msg, kind) {
      try {
        import("/mobile/js/chunks/app-shell-UFTFFCNV.js").then((m) => m.showToast?.(msg, kind));
      } catch {
      }
    },
    closeSettingsDropdown() {
      try {
        import("/mobile/js/chunks/app-shell-UFTFFCNV.js").then((m) => m.closeSettingsDropdown?.());
      } catch {
      }
    }
  };
}
function setConnectionDropdownOpen(open) {
  const dd = document.getElementById("connection-dropdown");
  const bg = document.getElementById("connection-dropdown-backdrop");
  const syncBtn = document.getElementById("btn-header-team-sync");
  if (!dd && !bg) return;
  function finishClose() {
    if (dd) dd.classList.remove("open");
    if (bg) {
      bg.classList.remove("open");
      bg.setAttribute("aria-hidden", "true");
    }
    if (syncBtn) syncBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("connection-dropdown-open");
  }
  if (!open) {
    if (bg) closeModalAnimated(bg, finishClose);
    else finishClose();
    return;
  }
  getRuntime().closeSettingsDropdown();
  wireConnectionModalChromeOnce(closeConnectionDropdown);
  if (bg) {
    bg.classList.add("open");
    bg.setAttribute("aria-hidden", "false");
  }
  if (dd) dd.classList.add("open");
  document.body.classList.add("connection-dropdown-open");
  if (syncBtn) syncBtn.setAttribute("aria-expanded", "true");
  void renderConnectionPanel({ force: true });
}
function closeConnectionDropdown() {
  setConnectionDropdownOpen(false);
}
function openConnectionDropdown() {
  if (isCloudMobileClient()) {
    getRuntime().showToast(
      "R+ M\xF3vil usa la nube autom\xE1ticamente. Si no ves pacientes, deja R+ abierto en el Mac del turno y recarga.",
      "info"
    );
    return;
  }
  setConnectionDropdownOpen(true);
}
function toggleConnectionDropdown(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  if (isLanConnectionDropdownOpen()) closeConnectionDropdown();
  else openConnectionDropdown();
}
function openTeamSyncFromHeader() {
  openConnectionDropdown();
}
function syncSettingsLanHostDiskSection() {
}
var windowHandlers = {
  toggleConnectionDropdown,
  closeConnectionDropdown,
  openConnectionDropdown,
  openTeamSyncFromHeader,
  saveLanSettingsFromUi: async function() {
  },
  saveLanHostTeamCodeFromUi: async function() {
  },
  resetLanSquadHostStateFromUi: async function() {
  },
  resetLanTurnConnectionFromUi: async function() {
  },
  dismissLanHostFirstTimeHint: function() {
  },
  dismissLanDisconnectBanner: function() {
  },
  setLanHideDisconnectBannerFromUi: function() {
  },
  joinLanRoom: async function() {
  },
  joinLanFromInviteUi: function() {
  },
  createLanRoomFromUi: async function() {
  },
  deleteLanRoom: async function() {
  },
  copyLanInviteLinkFromUi: function() {
  },
  copyMobileLanLinkFromUi: function() {
  }
};

export {
  isLanConnectionDropdownOpen,
  closeConnectionDropdown,
  openConnectionDropdown,
  toggleConnectionDropdown,
  openTeamSyncFromHeader,
  syncSettingsLanHostDiskSection,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-CNQU7XB3.js.map
