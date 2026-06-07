import {
  needsClinicalOnboarding,
  needsTeamOnboarding
} from "/js/chunks/chunk-MS7DBMIV.js";
import {
  clinicalSessionContext,
  filterJoinedTeams,
  isGuardiaMode,
  syncGuardiaRotationToolbar
} from "/js/chunks/chunk-JNK22B43.js";
import {
  storage
} from "/js/chunks/chunk-2TZHN5MF.js";
import {
  isDbMode
} from "/js/chunks/chunk-K6QXHWFW.js";
import {
  isClinicalLocalOnlyMode,
  normalizeUsername,
  readRpcSettings
} from "/js/chunks/chunk-2VRIL4MF.js";
import {
  subscribeRoomSyncPhase
} from "/js/chunks/chunk-FWKRNT2R.js";

// public/js/features/clinical-context-bar.mjs
function clinicalContextBarEl() {
  return document.getElementById("clinical-context-bar");
}
function syncClinicalContextBarVisibility() {
  const bar = clinicalContextBarEl();
  if (!bar) return;
  const rotation = document.getElementById("clinical-rotation-section");
  const filtersMount = document.getElementById("clinical-census-filters-mount");
  const hasRotation = rotation && !rotation.hidden && !isGuardiaMode();
  const hasFilters = filtersMount && !filtersMount.hidden && !!document.getElementById("clinical-census-filters");
  bar.hidden = !(hasRotation || hasFilters);
}

// public/js/features/clinical-rotation-entry.mjs
var entryControlsWired = false;
async function openLanConnectPanelForPin() {
  try {
    const { openConnectionDropdown, focusLanShiftPinInput } = await import("/js/chunks/lan-sync-3Y3SJWIF.js");
    if (typeof openConnectionDropdown === "function") openConnectionDropdown();
    if (typeof focusLanShiftPinInput === "function") {
      window.setTimeout(() => focusLanShiftPinInput(), 80);
    }
  } catch (_e) {
    if (typeof window.showToast === "function") {
      window.showToast("Abre \u21C4 (Wi\u2011Fi) arriba e ingresa el PIN del turno.", "info");
    }
  }
}
async function handleLanConnectCtaClick() {
  const savedPin = typeof storage.getLanShiftPin === "function" ? storage.getLanShiftPin() : "";
  if (/^\d{6}$/.test(savedPin)) {
    try {
      const { tryEasyLanShiftPinConnect } = await import("/js/chunks/lan-shift-pin-connect-A27PJKQ7.js");
      const result = await tryEasyLanShiftPinConnect({ force: true });
      if (result.ok) {
        syncClinicalRotationEntryChrome();
        return;
      }
    } catch (_e) {
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
  try {
    const lan = await import("/js/chunks/lan-sync-3Y3SJWIF.js");
    if (!lan.isLanSessionConfiguredForRest?.()) return true;
    const { getRoomSyncPhase, RoomSyncPhase } = await import("/js/chunks/lan-sync-state-CMD3CFJ3.js");
    const roomId = typeof lan.getActiveLiveSyncRoomId === "function" ? lan.getActiveLiveSyncRoomId() : "";
    if (!roomId) return true;
    return getRoomSyncPhase(roomId) !== RoomSyncPhase.live;
  } catch (_e) {
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
    btn.title = "Usa el PIN de 6 d\xEDgitos del anfitri\xF3n (\u21C4)";
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
        "Mi rotaci\xF3n y equipos LAN no est\xE1n disponibles en modo solo este equipo.",
        "info"
      );
    }
    return;
  }
  const { ensureClinicalPanelSession } = await import("/js/chunks/clinical-panel-host-NGGWLMFY.js");
  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    const mainMod = await import("/js/chunks/clinical-onboarding-main-EZAFV3IP.js");
    const msg = await mainMod.describeOnboardingSessionBlock();
    if (typeof window.showToast === "function") {
      window.showToast(msg, "error");
    }
    if (!mainMod.focusMainClinicalOnboarding()) await mainMod.showMainClinicalOnboarding();
    syncClinicalRotationEntryChrome();
    return;
  }
  if (needsClinicalOnboarding()) {
    const mainMod = await import("/js/chunks/clinical-onboarding-main-EZAFV3IP.js");
    await mainMod.showMainClinicalOnboarding();
    mainMod.focusMainClinicalOnboarding();
    return;
  }
  const { wireClinicalTeamsModalChrome } = await import("/js/chunks/teams-roster-modal-chrome-UPVO6Z3B.js");
  wireClinicalTeamsModalChrome();
  const { openClinicalTeamsPanel } = await import("/js/chunks/teams-roster-U27TSNYK.js");
  await openClinicalTeamsPanel();
}
function buildEntryStatus() {
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    return {
      primary: "Solo este equipo",
      sub: "Sin LAN ni Mi rotaci\xF3n",
      pending: false
    };
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
    return {
      primary: "Mi rotaci\xF3n",
      sub: "Completa la configuraci\xF3n inicial abajo",
      pending: true
    };
  }
  const handle = normalizeUsername(user.username || "");
  const rank = String(user.rank || "").trim();
  const sala = String(user.sala || "").trim();
  const name = String(user.clinical_name || "").trim();
  const teams = filterJoinedTeams(clinicalSessionContext.teams || [], user);
  const parts = [];
  if (handle) parts.push(`@${handle}`);
  if (rank) parts.push(rank);
  if (sala) parts.push(sala);
  const primary = parts.length ? parts.join(" \xB7 ") : "Mi rotaci\xF3n";
  let sub = name || "Equipos, entregas y perfil cl\xEDnico";
  if (teams.length === 1) sub = `Equipo: ${String(teams[0].name || "\u2014")}`;
  else if (teams.length > 1) sub = `${teams.length} equipos`;
  else if (needsTeamOnboarding()) sub = "Sin equipo \u2014 abre para buscar en tu sala o unirte";
  return { primary, sub, pending: false };
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
  syncClinicalContextBarVisibility,
  openMiRotacion,
  syncClinicalRotationEntryChrome,
  wireClinicalRotationEntryControls,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-DOEVW2NR.js.map
