import {
  buildOnboardingStageHtml,
  needsClinicalOnboarding,
  needsClinicalSyncModeChoice,
  renderOnboardingPanelInto,
  renderSyncModeChoicePanel,
  wireSyncModeOnboardingInteractions
} from "/js/chunks/chunk-DLPHN5AB.js";
import {
  ensureClinicalPanelSession
} from "/js/chunks/chunk-PM4FDK42.js";
import {
  ensureClinicalDbUnlocked,
  isSqlcipherNativeReady
} from "/js/chunks/chunk-OV6VARYG.js";
import {
  isDbMode
} from "/js/chunks/chunk-K6QXHWFW.js";
import {
  bundledWardShiftPin,
  ensureLanProfileGateDeviceReset,
  isClinicalLocalOnlyMode,
  needsClinicalLanProfileGate,
  readRpcSettings
} from "/js/chunks/chunk-2VRIL4MF.js";

// public/js/features/clinical-registration.mjs
function prefillRegistrationFromUrlParams() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const user = params.get("user") || "";
  const name = params.get("name") || "";
  const rank = params.get("rank") || "";
  const sala = params.get("sala") || "";
  if (!user && !name && !rank && !sala) return;
  const shiftPin = params.get("pin") || params.get("shiftPin") || "";
  const pairs = [
    ["clinical-reg-username", "onboard-username", user],
    ["clinical-reg-name", "onboard-clinical-name", name],
    ["clinical-reg-rank", "onboard-rank", rank],
    ["clinical-reg-sala", "onboard-sala", sala],
    ["clinical-reg-shift-pin", "onboard-shift-pin", shiftPin]
  ];
  for (const [regId, onboardId, value] of pairs) {
    if (!value) continue;
    const regEl = document.getElementById(regId);
    const onboardEl = document.getElementById(onboardId);
    if (regEl) regEl.value = value;
    if (onboardEl) onboardEl.value = value;
  }
}
function backdropEl() {
  return document.getElementById("clinical-registration-backdrop");
}
function openClinicalRegistrationModal() {
  ensureLanProfileGateDeviceReset(readRpcSettings());
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  const gatePending = needsClinicalLanProfileGate(readRpcSettings());
  const pairs = [
    ["clinical-reg-username", "onboard-username"],
    ["clinical-reg-name", "onboard-clinical-name"]
  ];
  if (gatePending) {
    for (const [regId, onboardId] of pairs) {
      const regEl = document.getElementById(regId);
      const onboardEl = document.getElementById(onboardId);
      if (regEl) regEl.value = "";
      if (onboardEl) onboardEl.value = "";
    }
  }
  const usernameInput = document.getElementById("clinical-reg-username");
  if (usernameInput) usernameInput.focus();
  const pinInput = document.getElementById("clinical-reg-shift-pin");
  if (pinInput && !String(pinInput.value || "").trim()) {
    const bundled = bundledWardShiftPin();
    if (bundled) pinInput.value = bundled;
  }
}
function closeClinicalRegistrationModal() {
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
}
var windowHandlers = {
  openClinicalRegistrationModal,
  closeClinicalRegistrationModal,
  submitClinicalRegistration(ev) {
    if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
    const form = document.getElementById("clinical-registration-form");
    if (form) form.requestSubmit();
  }
};

// public/js/features/clinical-onboarding-main.mjs
var CLINICAL_ONBOARDING_MAIN_ID = "clinical-onboarding-main";
var CLINICAL_ONBOARDING_ACTIVE_CLASS = "clinical-onboarding-active";
var teamsChangedListenerWired = false;
function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function getClinicalOnboardingMainHost() {
  return document.getElementById(CLINICAL_ONBOARDING_MAIN_ID);
}
function isMainClinicalOnboardingActive() {
  return document.documentElement.classList.contains(CLINICAL_ONBOARDING_ACTIVE_CLASS);
}
function wireTeamsChangedListenerOnce() {
  if (teamsChangedListenerWired || typeof document === "undefined") return;
  teamsChangedListenerWired = true;
  document.addEventListener("rpc-clinical-teams-changed", () => {
    void refreshMainClinicalOnboardingIfNeeded();
  });
}
function hideMainClinicalOnboarding() {
  document.documentElement.classList.remove(CLINICAL_ONBOARDING_ACTIVE_CLASS);
  const host = getClinicalOnboardingMainHost();
  if (host) host.remove();
  void import("/js/chunks/clinical-rotation-entry-NNQEPTHF.js").then((m) => m.syncClinicalRotationEntryChrome());
  void import("/js/chunks/tour-engine-ZAPQXR3W.js").then((m) => {
    if (typeof m.tryShowPostRegistrationEducationIfNeeded === "function") {
      void m.tryShowPostRegistrationEducationIfNeeded();
    }
  });
  void import("/js/chunks/learn-hub-W3NB3J2L.js").then((m) => {
    if (typeof m.syncLearnAprenderChrome === "function") m.syncLearnAprenderChrome();
  });
}
async function readClinicalDbGateKind() {
  if (typeof window === "undefined" || !isDbMode()) return "no_api";
  const api = window.rplusDb || window.electronAPI;
  if (!api || typeof api.dbStatus !== "function") return "no_api";
  try {
    const status = await api.dbStatus();
    if (status && !isSqlcipherNativeReady(status)) return "native_blocked";
    if (status && status.state === "unlocked") return "unlocked";
    if (status && status.state) return "locked";
    return "unknown";
  } catch (_e) {
    return "unknown";
  }
}
async function describeOnboardingSessionBlock() {
  if (typeof window === "undefined") {
    return "Abre la base de datos local de R+ para continuar. No necesitas red LAN ni \u21C4.";
  }
  const gate = await readClinicalDbGateKind();
  if (gate === "native_blocked") {
    return "Esta instalaci\xF3n de R+ no carg\xF3 el m\xF3dulo de base de datos (SQLCipher). Reinstala desde GitHub o usa Ajustes \u2192 Aplicaci\xF3n \u2192 Reinstalar versi\xF3n actual.";
  }
  if (gate === "unlocked") {
    return "La base local ya est\xE1 abierta, pero la sesi\xF3n cl\xEDnica no inici\xF3. Pulsa Reintentar abajo o cierra R+ por completo (incluida la bandeja) y vuelve a abrir.";
  }
  if (gate === "locked") {
    return "R+ est\xE1 preparando el almacenamiento local de este equipo. Pulsa Reintentar en unos segundos; no necesitas red LAN ni \u21C4.";
  }
  if (gate === "no_api") {
    return "R+ no detect\xF3 el acceso a la base local. Reinicia la aplicaci\xF3n.";
  }
  return "Abre la base de datos local de R+ para continuar. No necesitas red LAN ni \u21C4.";
}
async function buildOnboardingSessionBlockHtml() {
  const lead = await describeOnboardingSessionBlock();
  const gate = await readClinicalDbGateKind();
  const actions = gate === "native_blocked" ? "" : `<div class="modal-actions clinical-onboard-session-actions"><button type="button" class="btn-save" id="clinical-onboard-retry-session-btn">Reintentar</button></div>`;
  return buildOnboardingStageHtml({
    title: "Sesi\xF3n cl\xEDnica",
    leadHtml: `<p>${escapeHtml(lead)}</p>`,
    bodyHtml: actions
  });
}
function wireOnboardingSessionRecoveryOnce(host) {
  if (!host || host._rpcSessionRecoveryWired) return;
  host._rpcSessionRecoveryWired = true;
  host.addEventListener("click", (ev) => {
    const retryBtn = ev.target.closest("#clinical-onboard-retry-session-btn");
    if (retryBtn) void showMainClinicalOnboarding();
  });
}
function focusMainClinicalOnboarding() {
  const host = getClinicalOnboardingMainHost();
  if (!host) return false;
  host.scrollIntoView({ block: "nearest", behavior: "smooth" });
  return true;
}
async function showMainClinicalOnboarding() {
  wireTeamsChangedListenerOnce();
  if (!needsClinicalOnboarding()) {
    hideMainClinicalOnboarding();
    return;
  }
  const main = document.getElementById("main-area");
  if (!main) return;
  let host = getClinicalOnboardingMainHost();
  if (!host) {
    host = document.createElement("div");
    host.id = CLINICAL_ONBOARDING_MAIN_ID;
    host.className = "clinical-onboarding-main";
    host.setAttribute("role", "region");
    host.setAttribute(
      "aria-label",
      isClinicalLocalOnlyMode(readRpcSettings()) ? "Configura tu perfil local" : "Configura tu rotaci\xF3n"
    );
    main.prepend(host);
  }
  document.documentElement.classList.add(CLINICAL_ONBOARDING_ACTIVE_CLASS);
  void import("/js/chunks/learn-hub-W3NB3J2L.js").then((m) => {
    if (typeof m.syncLearnAprenderChrome === "function") m.syncLearnAprenderChrome();
  });
  if (needsClinicalSyncModeChoice()) {
    renderSyncModeChoicePanel(host);
    wireSyncModeOnboardingInteractions();
    return;
  }
  host.innerHTML = buildOnboardingStageHtml({
    title: "Preparando R+",
    leadHtml: '<p class="clinical-onboarding-status">Preparando almacenamiento local\u2026</p>',
    bodyHtml: ""
  });
  const dbReady = await ensureClinicalDbUnlocked();
  if (!dbReady.unlocked) {
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    wireOnboardingSessionRecoveryOnce(host);
    return;
  }
  try {
    const { flushPendingClinicalOpsLanSnapshot } = await import("/js/chunks/clinical-ops-lan-GGCTGMFL.js");
    const flushed = await flushPendingClinicalOpsLanSnapshot();
    if (flushed.changed) {
      document.dispatchEvent(new CustomEvent("rpc-clinical-ops-synced"));
    }
  } catch (_eOps) {
  }
  let sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    await ensureClinicalDbUnlocked();
    sessionOk = await ensureClinicalPanelSession();
  }
  if (!sessionOk) {
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    wireOnboardingSessionRecoveryOnce(host);
    return;
  }
  host.innerHTML = buildOnboardingStageHtml({
    title: "Preparando R+",
    leadHtml: '<p class="clinical-onboarding-status">Cargando\u2026</p>',
    bodyHtml: ""
  });
  try {
    await renderOnboardingPanelInto(host);
    prefillRegistrationFromUrlParams();
    const rot = await import("/js/chunks/clinical-rotation-entry-NNQEPTHF.js");
    rot.syncClinicalRotationEntryChrome();
  } catch (err) {
    host.innerHTML = `<p class="clinical-registration-error">${escapeHtml(err instanceof Error ? err.message : "Error al cargar.")}</p>`;
  }
}
async function syncChromeAfterOnboardingChange() {
  try {
    const rot = await import("/js/chunks/clinical-rotation-entry-NNQEPTHF.js");
    if (typeof rot.syncClinicalRotationEntryChrome === "function") rot.syncClinicalRotationEntryChrome();
  } catch (_e) {
  }
  try {
    const settings = await import("/js/chunks/settings-dropdown-3CM6V56H.js");
    if (typeof settings.syncTeamSyncHeaderButton === "function") {
      settings.syncTeamSyncHeaderButton();
    }
  } catch (_e) {
  }
}
async function refreshMainClinicalOnboardingIfNeeded() {
  if (needsClinicalOnboarding()) await showMainClinicalOnboarding();
  else hideMainClinicalOnboarding();
  await syncChromeAfterOnboardingChange();
}

export {
  prefillRegistrationFromUrlParams,
  windowHandlers,
  CLINICAL_ONBOARDING_MAIN_ID,
  CLINICAL_ONBOARDING_ACTIVE_CLASS,
  getClinicalOnboardingMainHost,
  isMainClinicalOnboardingActive,
  hideMainClinicalOnboarding,
  readClinicalDbGateKind,
  describeOnboardingSessionBlock,
  buildOnboardingSessionBlockHtml,
  focusMainClinicalOnboarding,
  showMainClinicalOnboarding,
  refreshMainClinicalOnboardingIfNeeded
};
//# sourceMappingURL=/js/chunks/chunk-UJIBAODH.js.map
