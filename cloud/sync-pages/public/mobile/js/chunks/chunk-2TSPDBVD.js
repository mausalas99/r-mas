import {
  syncClinicalContextBarVisibility
} from "/mobile/js/chunks/chunk-PKYRHIWH.js";
import {
  needsClinicalOnboarding,
  needsTeamOnboarding
} from "/mobile/js/chunks/chunk-OSPRJYRJ.js";
import {
  filterJoinedTeams,
  getUserSala,
  syncGuardiaRotationToolbar
} from "/mobile/js/chunks/chunk-OJH7L2CJ.js";
import {
  hasElevatedTeamPrivileges
} from "/mobile/js/chunks/chunk-NW6K73WP.js";
import {
  isGuardiaMode
} from "/mobile/js/chunks/chunk-F55OGCCZ.js";
import {
  subscribeRoomSyncPhase
} from "/mobile/js/chunks/chunk-I4VH6GH2.js";
import {
  isLanSkipShiftPin
} from "/mobile/js/chunks/chunk-5TQC2RCD.js";
import {
  storage
} from "/mobile/js/chunks/chunk-76D6GOCM.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings
} from "/mobile/js/chunks/chunk-3566DTDN.js";
import {
  isCloudSala
} from "/mobile/js/chunks/chunk-6VYBWSQE.js";
import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import {
  clinicalSessionContext,
  isDbMode
} from "/mobile/js/chunks/chunk-LMOJUVZ4.js";

// public/js/features/clinical-rotation-entry-status.mjs
function buildEntryStatusEarly() {
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    return { primary: "Solo este equipo", sub: "Ajeno a medicina interna \xB7 sin LAN", pending: false };
  }
  if (needsClinicalOnboarding()) {
    return {
      primary: "Configura tu rotaci\xF3n",
      sub: "Usuario LAN, rango y sala \u2014 equipos despu\xE9s en Mi rotaci\xF3n",
      pending: true
    };
  }
  const user = clinicalSessionContext.user;
  if (!user?.user_id) {
    return { primary: "Mi rotaci\xF3n", sub: "Completa la configuraci\xF3n inicial abajo", pending: true };
  }
  return null;
}
function buildEntryStatusPrimary(user) {
  const handle = normalizeUsername(user.username || "");
  const rank = String(user.rank || "").trim();
  const sala = String(user.sala || "").trim();
  const parts = [];
  if (handle) parts.push("@" + handle);
  if (rank) parts.push(rank);
  if (sala) parts.push(sala);
  return parts.length ? parts.join(" \xB7 ") : "Mi rotaci\xF3n";
}
function buildEntryStatusSub(user, teams) {
  const name = String(user.clinical_name || "").trim();
  if (hasElevatedTeamPrivileges(user)) {
    return name || "Supervisi\xF3n de rotaciones \u2014 sin equipo requerido";
  }
  if (teams.length === 1) return "Equipo: " + String(teams[0].name || "\u2014");
  if (teams.length > 1) return teams.length + " equipos";
  if (needsTeamOnboarding()) return "Sin equipo \u2014 abre para buscar en tu sala o unirte";
  return name || "Equipos, entregas y perfil cl\xEDnico";
}
function buildClinicalRotationEntryStatus() {
  const early = buildEntryStatusEarly();
  if (early) return early;
  const user = clinicalSessionContext.user;
  const teams = filterJoinedTeams(clinicalSessionContext.teams || [], user);
  return {
    primary: buildEntryStatusPrimary(user),
    sub: buildEntryStatusSub(user, teams),
    pending: false
  };
}

// public/js/features/clinical-rotation-entry.mjs
var entryControlsWired = false;
async function openLanConnectPanelForPin() {
  try {
    const { openConnectionDropdown, focusLanShiftPinInput } = await import("/mobile/js/chunks/lan-sync-C2VAOY3Q.js");
    if (typeof openConnectionDropdown === "function") openConnectionDropdown();
    if (!isLanSkipShiftPin() && typeof focusLanShiftPinInput === "function") {
      window.setTimeout(() => focusLanShiftPinInput(), 80);
    }
  } catch {
    if (typeof window.showToast === "function") {
      window.showToast(
        isLanSkipShiftPin() ? "Abre \u21C4 (Wi\u2011Fi) y pulsa Conectar al turno o pega el enlace del anfitri\xF3n." : "Abre \u21C4 (Wi\u2011Fi) arriba e ingresa el PIN del turno.",
        "info"
      );
    }
  }
}
async function handleLanConnectCtaClick() {
  const savedPin = typeof storage.getLanShiftPin === "function" ? storage.getLanShiftPin() : "";
  const bypass = isLanSkipShiftPin();
  if (bypass || /^\d{6}$/.test(savedPin)) {
    try {
      const { tryEasyLanShiftPinConnect } = await import("/mobile/js/chunks/lan-shift-pin-connect-FXDJ6TCU.js");
      const result = await tryEasyLanShiftPinConnect({
        force: true,
        shiftPin: savedPin || void 0
      });
      if (result.ok) {
        syncClinicalRotationEntryChrome();
        return;
      }
      if (bypass && typeof window.showToast === "function") {
        window.showToast(
          "No encontramos el anfitri\xF3n en esta red. Pega el enlace del R4 en \u21C4 o revisa el Wi\u2011Fi.",
          "error"
        );
        await openLanConnectPanelForPin();
        return;
      }
    } catch (_e) {
      void _e;
    }
  }
  await openLanConnectPanelForPin();
}
function needsLanConnectCta() {
  if (isClinicalLocalOnlyMode(readRpcSettings())) return false;
  if (needsClinicalOnboarding()) return false;
  return true;
}
async function isLanConnectCtaVisible() {
  if (!needsLanConnectCta()) return false;
  if (isCloudSala(getUserSala())) return false;
  try {
    const lan = await import("/mobile/js/chunks/lan-sync-C2VAOY3Q.js");
    if (!lan.isLanSessionConfiguredForRest?.()) return true;
    const { getRoomSyncPhase, RoomSyncPhase } = await import("/mobile/js/chunks/lan-sync-state-I2ZRXMWH.js");
    const roomId = typeof lan.getActiveLiveSyncRoomId === "function" ? lan.getActiveLiveSyncRoomId() : "";
    if (!roomId) return true;
    return getRoomSyncPhase(roomId) !== RoomSyncPhase.live;
  } catch {
    return true;
  }
}
function syncLanConnectCta(show) {
  const section = document.getElementById("clinical-rotation-section");
  if (!section) return;
  let btn = document.getElementById("btn-clinical-lan-connect");
  if (!show) {
    if (btn) btn.remove();
    return;
  }
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btn-clinical-lan-connect";
    btn.type = "button";
    btn.className = "app-bar-lan-connect-cta";
    btn.textContent = "Conectar al turno";
    btn.title = isLanSkipShiftPin() ? "Busca el anfitri\xF3n del turno en la Wi\u2011Fi del hospital" : "Usa el PIN de 6 d\xEDgitos del anfitri\xF3n (\u21C4)";
    btn.addEventListener("click", () => void handleLanConnectCtaClick());
    section.appendChild(btn);
  }
}
async function openMiRotacion() {
  if (!isDbMode()) {
    if (typeof window.showToast === "function") {
      window.showToast("Mi rotaci\xF3n requiere la base de datos cl\xEDnica.", "info");
    }
    return;
  }
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    if (typeof window.showToast === "function") {
      window.showToast(
        "Mi rotaci\xF3n y equipos LAN no est\xE1n disponibles en modo solo este equipo (ajeno a medicina interna).",
        "info"
      );
    }
    return;
  }
  const { openClinicalTeamsPanel } = await import("/mobile/js/chunks/teams-roster-GRYOT5FL.js");
  await openClinicalTeamsPanel();
  syncClinicalRotationEntryChrome();
}
function buildEntryStatus() {
  return buildClinicalRotationEntryStatus();
}
function syncClinicalRotationEntryChrome() {
  const rotationSection = document.getElementById("clinical-rotation-section");
  const show = isDbMode() && !isClinicalLocalOnlyMode(readRpcSettings()) && !isGuardiaMode();
  if (rotationSection) rotationSection.hidden = !show;
  if (!show) {
    syncLanConnectCta(false);
    syncGuardiaRotationToolbar();
    syncClinicalContextBarVisibility();
    return;
  }
  const status = buildEntryStatus();
  const entryBtn = document.getElementById("btn-sidebar-mi-rotacion");
  const entryPrimary = document.getElementById("clinical-rotation-entry-primary");
  const entrySub = document.getElementById("clinical-rotation-entry-sub");
  if (entryBtn) {
    entryBtn.classList.toggle("is-pending", status.pending);
    const base = status.pending ? "Completa rango y rotaci\xF3n (sala)" : "Usuario LAN, equipos y entregas";
    entryBtn.setAttribute("title", `${base} \u2014 ${status.primary}: ${status.sub}`);
  }
  if (entryPrimary) entryPrimary.textContent = status.primary;
  if (entrySub) entrySub.textContent = status.sub;
  void isLanConnectCtaVisible().then((visible) => syncLanConnectCta(visible));
  syncGuardiaRotationToolbar();
  syncClinicalContextBarVisibility();
}
function wireClinicalRotationEntryControls() {
  if (entryControlsWired) return;
  entryControlsWired = true;
  const bind = (id) => {
    const el = document.getElementById(id);
    if (!el || el._rpcMiRotacionWired) return;
    el._rpcMiRotacionWired = true;
    el.addEventListener("click", () => void openMiRotacion());
  };
  bind("btn-sidebar-mi-rotacion");
  if (typeof document !== "undefined") {
    document.addEventListener("rpc-clinical-teams-changed", () => {
      syncClinicalRotationEntryChrome();
    });
    document.addEventListener("rpc-clinical-ops-synced", () => {
      syncClinicalRotationEntryChrome();
    });
    subscribeRoomSyncPhase(() => {
      syncClinicalRotationEntryChrome();
    });
  }
}
var windowHandlers = {
  openMiRotacion
};

export {
  openMiRotacion,
  syncClinicalRotationEntryChrome,
  wireClinicalRotationEntryControls,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-2TSPDBVD.js.map
